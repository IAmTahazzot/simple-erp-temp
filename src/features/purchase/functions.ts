// app/features/purchase/functions.ts
import { database } from '@/database'
import PurchaseOrder, { PurchaseOrderStatus, PurchasePaymentStatus } from '@/database/models/PurchaseOrder'
import PurchaseOrderItem from '@/database/models/PurchaseOrderItem'
import Product from '@/database/models/Product'
import Inventory from '@/database/models/Inventory'
import TransactionModel from '@/database/models/Transaction'
import { supabase } from '@/services/supabase'
import { ToastAndroid, Platform } from 'react-native'
import { Q } from '@nozbe/watermelondb'

export type PurchaseOrderLine = {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

// ─── Toast helper ────────────────────────────────────────────────────────────
function toastSupabaseError(action: string) {
  const msg = `Supabase sync failed: ${action}`
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT)
  }
}

// ─── Payment status helper ───────────────────────────────────────────────────
function computePaymentStatus(totalAmount: number, paidAmount: number): PurchasePaymentStatus {
  if (paidAmount <= 0) return PurchasePaymentStatus.UNPAID
  if (paidAmount >= totalAmount) return PurchasePaymentStatus.PAID
  return PurchasePaymentStatus.PARTIALLY_PAID
}

// ─── Compute due amount ──────────────────────────────────────────────────────
// due = totalAmount - paidAmount (can be negative if overpaid after refund)
function computeDue(totalAmount: number, paidAmount: number): number {
  return totalAmount - paidAmount
}

// ─── WAC Recalculation (MUST be called inside an existing database.write block) ─
// Rebuilds products.cost from the full purchase_order_items history — never incremental.
// EXCLUDES items belonging to CANCELED orders so they don't skew the average.
// Signed quantities: positive = purchase rows, negative = refund rows.
// Refund rows naturally reduce both totalQty and totalValue, keeping WAC accurate.
async function recalculateProductWAC(productId: string): Promise<void> {
  // Fetch all non-deleted purchase order items for this product
  const items = await database.get<PurchaseOrderItem>('purchase_order_items')
    .query(
      Q.where('product_id', productId),
      Q.where('server_deleted_at', Q.eq(null)),
    )
    .fetch()

  if (items.length === 0) {
    // No items at all — reset cost to 0
    const product = await database.get<Product>('products').find(productId)
    await product.update((p) => { p.cost = 0 })
    return
  }

  // Fetch the parent orders in one batch to filter out canceled ones
  const orderIds = [...new Set(items.map(i => i.purchaseOrderId))]
  const orders = await database.get<PurchaseOrder>('purchase_orders')
    .query(
      Q.where('id', Q.oneOf(orderIds)),
      Q.where('server_deleted_at', Q.eq(null)),
    )
    .fetch()

  const activeOrderIds = new Set(
    orders
      .filter(o => o.status !== PurchaseOrderStatus.CANCELED)
      .map(o => o.id)
  )

  let totalQty = 0
  let totalValue = 0
  for (const item of items) {
    // Skip items from canceled orders
    if (!activeOrderIds.has(item.purchaseOrderId)) continue
    totalQty += item.quantity
    totalValue += item.quantity * item.unitPrice
  }

  // Round to 4 decimal places to prevent float drift
  const newCost = totalQty > 0
    ? Math.round((totalValue / totalQty) * 10000) / 10000
    : 0

  const product = await database.get<Product>('products').find(productId)
  await product.update((p) => { p.cost = newCost })
}

// ─── Create Purchase Order ───────────────────────────────────────────────────
export const createPurchaseOrder = async (params: {
  supplierId: string
  lines: PurchaseOrderLine[]
  discountType: 'flat' | 'percent' | null
  discountValue: number
  totalAmount: number
  isOnline: boolean
  userId: string
  payImmediately?: boolean
}) => {
  const { supplierId, lines, discountType, discountValue, totalAmount, isOnline, userId, payImmediately = false } = params
  const now = Date.now()

  const paymentStatus = payImmediately ? PurchasePaymentStatus.PAID : PurchasePaymentStatus.UNPAID
  const orderStatus = payImmediately ? PurchaseOrderStatus.COMPLETED : PurchaseOrderStatus.ACTIVE
  const dueAmount = payImmediately ? 0 : totalAmount

  const { order, orderItems, transaction } = await database.write(async () => {
    // 1. Create order
    const order = await database.get<PurchaseOrder>('purchase_orders').create((o) => {
      o.supplierId = supplierId
      o.userId = userId
      o.orderDate = new Date()
      o.status = orderStatus
      o.paymentStatus = paymentStatus
      o.totalAmount = totalAmount
      o.dueAmount = dueAmount
      o.discountType = discountType ?? undefined
      o.discountValue = discountValue
    })

    // 2. Create order items
    const orderItems = await Promise.all(lines.map((line) =>
      database.get<PurchaseOrderItem>('purchase_order_items').create((i) => {
        i.purchaseOrderId = order.id
        i.productId = line.productId
        i.quantity = line.quantity
        i.unitPrice = line.unitPrice
      })
    ))

    // 3. Add inventory (Supplier order received -> more inventory)
    for (const line of lines) {
      const invRecords = await database.get<Inventory>('inventory').query().fetch()
      const inv = invRecords.find(i => i.productId === line.productId)
      if (inv) {
        await inv.update((r) => {
          r.quantity = r.quantity + line.quantity
        })
      }
    }

    // 4. Recalculate Weighted Average Cost for each affected product
    // Done AFTER items are written so the query sees the new rows
    const uniqueProductIds = [...new Set(lines.map(l => l.productId))]
    for (const productId of uniqueProductIds) {
      await recalculateProductWAC(productId)
    }

    // 5. If pay immediately, create a transaction
    let transaction: TransactionModel | null = null
    if (payImmediately) {
      transaction = await database.get<TransactionModel>('transactions').create((t) => {
        t.purchaseOrderId = order.id
        t.type = 'payment'
        t.amount = totalAmount
        t.paymentDate = new Date()
      })
    }

    return { order, orderItems, transaction }
  })

  // ─── Supabase sync (best-effort) ─────────────────────────────────────────
  if (isOnline) {
    try {
      await supabase.from('purchase_orders').insert({
        id: order.id,
        supplier_id: supplierId,
        user_id: userId,
        order_date: now,
        status: orderStatus,
        payment_status: paymentStatus,
        total_amount: totalAmount,
        due_amount: dueAmount,
        discount_type: discountType,
        discount_value: discountValue,
        created_at: now,
        updated_at: now,
      })
    } catch { toastSupabaseError('create purchase order') }

    try {
      await Promise.all(orderItems.map((item) =>
        supabase.from('purchase_order_items').insert({
          id: item.id,
          purchase_order_id: order.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          created_at: now,
          updated_at: now,
        })
      ))
    } catch { toastSupabaseError('create purchase order items') }

    if (transaction) {
      try {
        await supabase.from('transactions').insert({
          id: transaction.id,
          order_id: null,
          purchase_order_id: order.id,
          type: 'payment',
          amount: totalAmount,
          payment_date: now,
          created_at: now,
          updated_at: now,
        })
      } catch { toastSupabaseError('create transaction') }
    }
  }

  return order
}

// ─── Add Payment ─────────────────────────────────────────────────────────────
export const addPurchasePayment = async (
  order: PurchaseOrder,
  amount: number,
  isOnline: boolean
) => {
  const now = Date.now()

  const existingTx = await order.transactions.fetch()
  const paidAmount = existingTx.reduce((sum, t) => sum + (t.type === 'payment' ? Number(t.amount) : -Number(t.amount)), 0)
  const newPaidAmount = paidAmount + amount
  const newPaymentStatus = computePaymentStatus(order.totalAmount, newPaidAmount)
  const newDue = computeDue(order.totalAmount, newPaidAmount)
  const newOrderStatus = newPaymentStatus === PurchasePaymentStatus.PAID ? PurchaseOrderStatus.COMPLETED : PurchaseOrderStatus.ACTIVE

  const tx = await database.write(async () => {
    const tx = await database.get<TransactionModel>('transactions').create((t) => {
      t.purchaseOrderId = order.id
      t.type = 'payment'
      t.amount = amount
      t.paymentDate = new Date()
    })

    await order.update((o) => {
      o.paymentStatus = newPaymentStatus
      o.status = newOrderStatus
      o.dueAmount = newDue
    })

    return tx
  })

  if (isOnline) {
    try {
      await supabase.from('transactions').insert({
        id: tx.id, order_id: null, purchase_order_id: order.id, type: 'payment',
        amount, payment_date: now, created_at: now, updated_at: now,
      })
    } catch { toastSupabaseError('add payment') }

    try {
      await supabase.from('purchase_orders')
        .update({ payment_status: newPaymentStatus, status: newOrderStatus, due_amount: newDue, updated_at: now })
        .eq('id', order.id)
    } catch { toastSupabaseError('update order after payment') }
  }

  return tx
}

// ─── Cancel Order ─────────────────────────────────────────────────────────────
export const cancelPurchaseOrder = async (order: PurchaseOrder, isOnline: boolean) => {
  const now = Date.now()

  // Fetch order items to revert inventory
  const items = await order.items.fetch()
  // Collect unique product IDs for WAC recalc after cancellation
  const uniqueProductIds = [...new Set(items.map(i => i.productId))]

  await database.write(async () => {
    // Revert inventory for each item (original purchase added inventory, so we MUST deduct)
    for (const item of items) {
      if (item.quantity > 0) {
        const invRecords = await database.get<Inventory>('inventory').query().fetch()
        const inv = invRecords.find(i => i.productId === item.productId)
        if (inv) {
          await inv.update((r) => {
            r.quantity = Math.max(0, r.quantity - item.quantity)
          })
        }
      }
    }

    await order.update((o) => {
      o.status = PurchaseOrderStatus.CANCELED
      o.paymentStatus = PurchasePaymentStatus.UNPAID
      o.totalAmount = 0
      o.dueAmount = 0
    })

    // Recalculate WAC — canceled order items must no longer influence cost
    // recalculateProductWAC reads order.status which is now CANCELED, so these
    // items will be excluded from the WAC calculation automatically.
    for (const productId of uniqueProductIds) {
      await recalculateProductWAC(productId)
    }
  })

  if (isOnline) {
    try {
      await supabase.from('purchase_orders')
        .update({
          status: PurchaseOrderStatus.CANCELED,
          payment_status: PurchasePaymentStatus.UNPAID,
          total_amount: 0,
          due_amount: 0,
          updated_at: now,
        })
        .eq('id', order.id)
    } catch { toastSupabaseError('cancel purchase order') }
  }
}

// ─── Refund Order ─────────────────────────────────────────────────────────────
export type RefundLine = {
  productId: string
  productName: string
  returnQty: number
  refundUnitPrice: number
}

export const refundPurchaseOrder = async (
  order: PurchaseOrder,
  refundLines: RefundLine[],
  isOnline: boolean
) => {
  const now = Date.now()

  const validLines = refundLines.filter(l => l.returnQty > 0)
  if (validLines.length === 0) return

  const refundTotal = validLines.reduce((sum, l) => sum + l.returnQty * l.refundUnitPrice, 0)

  const existingTx = await order.transactions.fetch()
  const paidAmount = existingTx.reduce((sum, t) => sum + (t.type === 'payment' ? Number(t.amount) : -Number(t.amount)), 0)

  const newTotalAmount = Math.max(0, order.totalAmount - refundTotal)
  const newDue = newTotalAmount - paidAmount // can be negative (we are owed money by supplier)

  let newPaymentStatus: PurchasePaymentStatus
  if (paidAmount <= 0) {
    newPaymentStatus = PurchasePaymentStatus.UNPAID
  } else if (paidAmount >= newTotalAmount) {
    newPaymentStatus = refundTotal >= order.totalAmount ? PurchasePaymentStatus.REFUNDED : PurchasePaymentStatus.PAID
  } else {
    newPaymentStatus = PurchasePaymentStatus.PARTIALLY_PAID
  }

  if (newTotalAmount === 0) {
    newPaymentStatus = PurchasePaymentStatus.REFUNDED
  }

  const newOrderStatus = newTotalAmount === 0 ? PurchaseOrderStatus.CANCELED : order.status

  const newOrderItems: PurchaseOrderItem[] = []

  await database.write(async () => {
    // Create negative order items to represent refund
    for (const line of validLines) {
      const item = await database.get<PurchaseOrderItem>('purchase_order_items').create((i) => {
        i.purchaseOrderId = order.id
        i.productId = line.productId
        i.quantity = -line.returnQty  // negative qty
        i.unitPrice = line.refundUnitPrice
      })
      newOrderItems.push(item)

      // Deduct from inventory (Returning goods to supplier)
      const invRecords = await database.get<Inventory>('inventory').query().fetch()
      const inv = invRecords.find(i => i.productId === line.productId)
      if (inv) {
        await inv.update((r) => {
          r.quantity = Math.max(0, r.quantity - line.returnQty)
        })
      }
    }

    // Update order
    await order.update((o) => {
      o.totalAmount = newTotalAmount
      o.dueAmount = newDue
      o.paymentStatus = newPaymentStatus
      o.status = newOrderStatus
    })

    // Recalculate WAC — refund rows (negative qty) are now included in history,
    // so WAC naturally adjusts downward for returned goods
    const uniqueProductIds = [...new Set(validLines.map(l => l.productId))]
    for (const productId of uniqueProductIds) {
      await recalculateProductWAC(productId)
    }
  })

  if (isOnline) {
    try {
      await Promise.all(newOrderItems.map(item =>
        supabase.from('purchase_order_items').insert({
          id: item.id,
          purchase_order_id: order.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          created_at: now,
          updated_at: now,
        })
      ))
    } catch { toastSupabaseError('refund purchase order items') }

    try {
      await supabase.from('purchase_orders').update({
        total_amount: newTotalAmount,
        due_amount: newDue,
        payment_status: newPaymentStatus,
        status: newOrderStatus,
        updated_at: now,
      }).eq('id', order.id)
    } catch { toastSupabaseError('update purchase order after refund') }
  }
}

// ─── Issue Refund Payment (Receive cash back from supplier) ──────────────────
export const issuePurchaseRefundPayment = async (
  order: PurchaseOrder,
  amountToReturn: number,
  retainedProfit: number, // mostly unused for purchase orders as there isn't profit, but keeping interface
  isOnline: boolean
) => {
  const now = Date.now()

  const existingTx = await order.transactions.fetch()
  const currentPaid = existingTx.reduce((sum, t) => sum + (t.type === 'payment' ? Number(t.amount) : 0), 0)
  const currentRefunded = existingTx.reduce((sum, t) => sum + (t.type === 'refund' ? Number(t.amount) : 0), 0)
  const netPaid = currentPaid - currentRefunded

  const newTotalAmount = order.totalAmount + retainedProfit

  const newNetPaid = netPaid - amountToReturn
  const newDue = newTotalAmount - newNetPaid

  let newPaymentStatus: PurchasePaymentStatus = order.paymentStatus as PurchasePaymentStatus
  if (newNetPaid <= 0 && newTotalAmount > 0) newPaymentStatus = PurchasePaymentStatus.UNPAID
  else if (newNetPaid >= newTotalAmount && newTotalAmount > 0) newPaymentStatus = PurchasePaymentStatus.PAID
  else if (newNetPaid > 0 && newNetPaid < newTotalAmount) newPaymentStatus = PurchasePaymentStatus.PARTIALLY_PAID
  else if (newTotalAmount === 0 && newNetPaid === 0) newPaymentStatus = PurchasePaymentStatus.REFUNDED

  const newOrderStatus = newPaymentStatus === PurchasePaymentStatus.PAID ? PurchaseOrderStatus.COMPLETED : (newTotalAmount === 0 ? PurchaseOrderStatus.CANCELED : PurchaseOrderStatus.ACTIVE)

  const tx = await database.write(async () => {
    let refundTx: TransactionModel | null = null

    if (amountToReturn > 0) {
      refundTx = await database.get<TransactionModel>('transactions').create((t) => {
        t.purchaseOrderId = order.id
        t.type = 'refund'
        t.amount = amountToReturn
        t.paymentDate = new Date()
      })
    }

    await order.update((o) => {
      o.totalAmount = newTotalAmount
      o.dueAmount = newDue
      o.paymentStatus = newPaymentStatus
      o.status = newOrderStatus
    })

    return refundTx
  })

  if (isOnline) {
    if (tx) {
      try {
        await supabase.from('transactions').insert({
          id: tx.id,
          order_id: null,
          purchase_order_id: order.id,
          type: 'refund',
          amount: amountToReturn,
          payment_date: now,
          created_at: now,
          updated_at: now,
        })
      } catch { toastSupabaseError('add refund payment') }
    }

    try {
      await supabase.from('purchase_orders')
        .update({
          total_amount: newTotalAmount,
          due_amount: newDue,
          payment_status: newPaymentStatus,
          status: newOrderStatus,
          updated_at: now,
        })
        .eq('id', order.id)
    } catch { toastSupabaseError('update order after refund payment') }
  }

  return tx
}

// ─── Edit Order ───────────────────────────────────────────────────────────────
export type EditPurchaseOrderParams = {
  items: { id: string; quantity: number; unitPrice: number }[]
  discountType: 'flat' | 'percent' | null
  discountValue: number
  totalAmount: number
}

export const editPurchaseOrder = async (order: PurchaseOrder, params: EditPurchaseOrderParams, isOnline: boolean) => {
  const now = Date.now()
  const { items, discountType, discountValue, totalAmount } = params

  const existingTx = await order.transactions.fetch()
  const paidAmount = existingTx.reduce((sum, t) => sum + (t.type === 'payment' ? Number(t.amount) : -Number(t.amount)), 0)
  const newDue = totalAmount - paidAmount
  const newPaymentStatus = computePaymentStatus(totalAmount, paidAmount)
  const newOrderStatus = newPaymentStatus === PurchasePaymentStatus.PAID ? PurchaseOrderStatus.COMPLETED : PurchaseOrderStatus.ACTIVE

  type ItemMeta = {
    orderItem: PurchaseOrderItem
    oldQty: number
    newQty: number
    productId: string
  }
  const itemMetas: ItemMeta[] = []

  for (const item of items) {
    const orderItem = await database.get<PurchaseOrderItem>('purchase_order_items').find(item.id)
    itemMetas.push({
      orderItem,
      oldQty: orderItem.quantity,
      newQty: item.quantity,
      productId: orderItem.productId,
    })
  }

  await database.write(async () => {
    for (const meta of itemMetas) {
      await meta.orderItem.update((i) => {
        i.quantity = meta.newQty
        i.unitPrice = items.find(it => it.id === meta.orderItem.id)!.unitPrice
      })

      // Adjust inventory by delta.
      // Purchase orders: delta > 0 (more received) -> ADD to inventory. delta < 0 (less received) -> DEDUCT.
      const delta = meta.newQty - meta.oldQty
      if (delta !== 0) {
        const invRecords = await database.get<Inventory>('inventory').query().fetch()
        const inv = invRecords.find(i => i.productId === meta.productId)
        if (inv) {
          await inv.update((r) => {
            r.quantity = Math.max(0, r.quantity + delta) // ADDING delta
          })
        }
      }
    }

    await order.update((o) => {
      o.totalAmount = totalAmount
      o.dueAmount = newDue
      o.discountType = discountType ?? undefined
      o.discountValue = discountValue
      o.paymentStatus = newPaymentStatus
      o.status = newOrderStatus
    })

    // Recalculate WAC from full purchase history — not incremental, so editing
    // any historical price correctly rebuilds the weighted average from scratch
    const uniqueProductIds = [...new Set(itemMetas.map(m => m.productId))]
    for (const productId of uniqueProductIds) {
      await recalculateProductWAC(productId)
    }
  })

  if (isOnline) {
    try {
      await Promise.all(items.map(item =>
        supabase.from('purchase_order_items').update({
          quantity: item.quantity,
          unit_price: item.unitPrice,
          updated_at: now,
        }).eq('id', item.id)
      ))
    } catch { toastSupabaseError('edit purchase order items') }

    try {
      await supabase.from('purchase_orders').update({
        total_amount: totalAmount,
        due_amount: newDue,
        discount_type: discountType,
        discount_value: discountValue,
        payment_status: newPaymentStatus,
        status: newOrderStatus,
        updated_at: now,
      }).eq('id', order.id)
    } catch { toastSupabaseError('edit purchase order') }
  }
}
