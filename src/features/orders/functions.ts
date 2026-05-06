// app/features/orders/functions.ts
import { database } from '@/database'
import Order, { OrderStatus, PaymentStatus } from '@/database/models/Order'
import OrderItem from '@/database/models/OrderItem'
import Inventory from '@/database/models/Inventory'
import TransactionModel from '@/database/models/Transaction'
import { supabase } from '@/services/supabase'
import { ToastAndroid, Platform } from 'react-native'

export type OrderLine = {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  costPrice?: number // for profit calc
}

// ─── Toast helper ─────────────────────────────────────────────────────────────
function toastSupabaseError(action: string) {
  const msg = `Supabase sync failed: ${action}`
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT)
  }
}

// ─── Payment status helper ─────────────────────────────────────────────────────
function computePaymentStatus(totalAmount: number, paidAmount: number): PaymentStatus {
  if (paidAmount <= 0) return PaymentStatus.UNPAID
  if (paidAmount >= totalAmount) return PaymentStatus.PAID
  return PaymentStatus.PARTIALLY_PAID
}

// ─── Compute due amount ───────────────────────────────────────────────────────
// due = totalAmount - paidAmount (can be negative if overpaid after refund)
function computeDue(totalAmount: number, paidAmount: number): number {
  return totalAmount - paidAmount
}

// ─── Compute profit ───────────────────────────────────────────────────────────
// profit = totalAmount - totalCost (sum of cost * qty for each item)
async function computeProfit(orderId: string, totalAmount: number): Promise<number> {
  const items = await database.get<OrderItem>('order_items').query().fetch()
  const orderItems = items.filter(i => i.orderId === orderId)

  let totalCost = 0
  for (const item of orderItems) {
    try {
      const product = await database.get<any>('products').find(item.productId)
      totalCost += (product?.cost ?? 0) * item.quantity
    } catch {
      // product not found, skip
    }
  }
  return totalAmount - totalCost
}

// ─── Create Order ─────────────────────────────────────────────────────────────
export const createOrder = async (params: {
  customerId: string
  lines: OrderLine[]
  discountType: 'flat' | 'percent' | null
  discountValue: number
  totalAmount: number
  isOnline: boolean
  userId: string
  payImmediately?: boolean
}) => {
  const { customerId, lines, discountType, discountValue, totalAmount, isOnline, userId, payImmediately = false } = params
  const now = Date.now()

  // Compute profit from cost prices passed in lines
  const totalCost = lines.reduce((sum, l) => sum + (l.costPrice ?? 0) * l.quantity, 0)
  const profitAmount = totalAmount - totalCost

  const paymentStatus = payImmediately ? PaymentStatus.PAID : PaymentStatus.UNPAID
  const orderStatus = payImmediately ? OrderStatus.COMPLETED : OrderStatus.ACTIVE
  const dueAmount = payImmediately ? 0 : totalAmount

  const { order, orderItems, transaction } = await database.write(async () => {
    // 1. Create order
    const order = await database.get<Order>('orders').create((o) => {
      o.customerId = customerId
      o.userId = userId
      o.orderDate = new Date()
      o.status = orderStatus
      o.paymentStatus = paymentStatus
      o.totalAmount = totalAmount
      o.dueAmount = dueAmount
      o.profitAmount = profitAmount
      o.discountType = discountType ?? undefined
      o.discountValue = discountValue
    })

    // 2. Create order items
    const orderItems = await Promise.all(lines.map((line) =>
      database.get<OrderItem>('order_items').create((i) => {
        i.orderId = order.id
        i.productId = line.productId
        i.quantity = line.quantity
        i.unitPrice = line.unitPrice
      })
    ))

    // 3. Deduct inventory
    for (const line of lines) {
      const invRecords = await database.get<Inventory>('inventory')
        .query().fetch()
      const inv = invRecords.find(i => i.productId === line.productId)
      if (inv) {
        await inv.update((r) => {
          r.quantity = Math.max(0, r.quantity - line.quantity)
        })
      }
    }

    // 4. If pay immediately, create a transaction
    let transaction: TransactionModel | null = null
    if (payImmediately) {
      transaction = await database.get<TransactionModel>('transactions').create((t) => {
        t.orderId = order.id
        t.type = 'payment'
        t.amount = totalAmount
        t.paymentDate = new Date()
      })
    }

    return { order, orderItems, transaction }
  })

  // ─── Supabase sync (best-effort) ──────────────────────────────────────────
  if (isOnline) {
    try {
      await supabase.from('orders').insert({
        id: order.id,
        customer_id: customerId,
        user_id: userId,
        order_date: now,
        status: orderStatus,
        payment_status: paymentStatus,
        total_amount: totalAmount,
        due_amount: dueAmount,
        profit_amount: profitAmount,
        discount_type: discountType,
        discount_value: discountValue,
        created_at: now,
        updated_at: now,
      })
    } catch { toastSupabaseError('create order') }

    try {
      await Promise.all(orderItems.map((item) =>
        supabase.from('order_items').insert({
          id: item.id,
          order_id: order.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          created_at: now,
          updated_at: now,
        })
      ))
    } catch { toastSupabaseError('create order items') }

    if (transaction) {
      try {
        await supabase.from('transactions').insert({
          id: transaction.id,
          order_id: order.id,
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

// ─── Add Payment ──────────────────────────────────────────────────────────────
export const addPayment = async (
  order: Order,
  amount: number,
  isOnline: boolean
) => {
  const now = Date.now()

  const existingTx = await order.transactions.fetch()
  const paidAmount = existingTx.reduce((sum, t) => sum + (t.type === 'payment' ? Number(t.amount) : -Number(t.amount)), 0)
  const newPaidAmount = paidAmount + amount
  const newPaymentStatus = computePaymentStatus(order.totalAmount, newPaidAmount)
  const newDue = computeDue(order.totalAmount, newPaidAmount)
  const newOrderStatus = newPaymentStatus === PaymentStatus.PAID ? OrderStatus.COMPLETED : OrderStatus.ACTIVE

  const tx = await database.write(async () => {
    const tx = await database.get<TransactionModel>('transactions').create((t) => {
      t.orderId = order.id
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
        id: tx.id, order_id: order.id, type: 'payment',
        amount, payment_date: now, created_at: now, updated_at: now,
      })
    } catch { toastSupabaseError('add payment') }

    try {
      await supabase.from('orders')
        .update({ payment_status: newPaymentStatus, status: newOrderStatus, due_amount: newDue, updated_at: now })
        .eq('id', order.id)
    } catch { toastSupabaseError('update order after payment') }
  }

  return tx
}

// ─── Cancel Order ─────────────────────────────────────────────────────────────
// Only allowed when there are zero transactions
export const cancelOrder = async (order: Order, isOnline: boolean) => {
  const now = Date.now()

  // Fetch order items to restore inventory
  const items = await order.orderItems.fetch()

  await database.write(async () => {
    // Restore inventory for each item (only positive qty items = original items)
    for (const item of items) {
      if (item.quantity > 0) {
        const invRecords = await database.get<Inventory>('inventory').query().fetch()
        const inv = invRecords.find(i => i.productId === item.productId)
        if (inv) {
          await inv.update((r) => {
            r.quantity = r.quantity + item.quantity
          })
        }
      }
    }

    await order.update((o) => {
      o.status = OrderStatus.CANCELED
      o.paymentStatus = PaymentStatus.UNPAID
      o.totalAmount = 0
      o.dueAmount = 0
    })
  })

  if (isOnline) {
    try {
      await supabase.from('orders')
        .update({
          status: OrderStatus.CANCELED,
          payment_status: PaymentStatus.UNPAID,
          total_amount: 0,
          due_amount: 0,
          updated_at: now,
        })
        .eq('id', order.id)
    } catch { toastSupabaseError('cancel order') }
  }
}

// ─── Refund Order ─────────────────────────────────────────────────────────────
export type RefundLine = {
  productId: string
  productName: string
  returnQty: number
  refundUnitPrice: number
}

export const refundOrder = async (
  order: Order,
  refundLines: RefundLine[],
  isOnline: boolean
) => {
  const now = Date.now()

  // Only refund lines with qty > 0
  const validLines = refundLines.filter(l => l.returnQty > 0)
  if (validLines.length === 0) return

  const refundTotal = validLines.reduce((sum, l) => sum + l.returnQty * l.refundUnitPrice, 0)

  // Fetch existing transactions to compute paid amount
  const existingTx = await order.transactions.fetch()
  const paidAmount = existingTx.reduce((sum, t) => sum + (t.type === 'payment' ? Number(t.amount) : -Number(t.amount)), 0)

  const newTotalAmount = Math.max(0, order.totalAmount - refundTotal)
  const newDue = newTotalAmount - paidAmount // can be negative (customer owed money)

  // Recompute profit: need to get costs from products
  let newProfitAmount = order.profitAmount ?? 0
  // Subtract refunded items' profit contribution: refund reduces revenue
  for (const line of validLines) {
    try {
      const product = await database.get<any>('products').find(line.productId)
      const costPerUnit = product?.cost ?? 0
      const profitContribution = (line.refundUnitPrice - costPerUnit) * line.returnQty
      newProfitAmount -= profitContribution
    } catch { /* skip */ }
  }

  // Determine new payment status
  let newPaymentStatus: PaymentStatus
  if (paidAmount <= 0) {
    newPaymentStatus = PaymentStatus.UNPAID
  } else if (paidAmount >= newTotalAmount) {
    newPaymentStatus = refundTotal >= order.totalAmount ? PaymentStatus.REFUNDED : PaymentStatus.PAID
  } else {
    newPaymentStatus = PaymentStatus.PARTIALLY_PAID
  }

  // If new total = 0, it's fully refunded
  if (newTotalAmount === 0) {
    newPaymentStatus = PaymentStatus.REFUNDED
  }

  const newOrderStatus = newTotalAmount === 0 ? OrderStatus.CANCELED : order.status

  const newOrderItems: OrderItem[] = []

  await database.write(async () => {
    // Create negative order items to represent refund
    for (const line of validLines) {
      const item = await database.get<OrderItem>('order_items').create((i) => {
        i.orderId = order.id
        i.productId = line.productId
        i.quantity = -line.returnQty  // negative qty
        i.unitPrice = line.refundUnitPrice
      })
      newOrderItems.push(item)

      // Add back to inventory
      const invRecords = await database.get<Inventory>('inventory').query().fetch()
      const inv = invRecords.find(i => i.productId === line.productId)
      if (inv) {
        await inv.update((r) => {
          r.quantity = r.quantity + line.returnQty
        })
      }
    }

    // Update order
    await order.update((o) => {
      o.totalAmount = newTotalAmount
      o.dueAmount = newDue
      o.profitAmount = newProfitAmount
      o.paymentStatus = newPaymentStatus
      o.status = newOrderStatus
    })
  })

  if (isOnline) {
    try {
      await Promise.all(newOrderItems.map(item =>
        supabase.from('order_items').insert({
          id: item.id,
          order_id: order.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          created_at: now,
          updated_at: now,
        })
      ))
    } catch { toastSupabaseError('refund order items') }

    try {
      await supabase.from('orders').update({
        total_amount: newTotalAmount,
        due_amount: newDue,
        profit_amount: newProfitAmount,
        payment_status: newPaymentStatus,
        status: newOrderStatus,
        updated_at: now,
      }).eq('id', order.id)
    } catch { toastSupabaseError('update order after refund') }
  }
}

// ─── Issue Refund Payment (Hand back cash to customer) ────────────────────────
export const issueRefundPayment = async (
  order: Order,
  amountToReturn: number,
  retainedProfit: number,
  isOnline: boolean
) => {
  const now = Date.now()

  // Fetch existing transactions
  const existingTx = await order.transactions.fetch()
  const currentPaid = existingTx.reduce((sum, t) => sum + (t.type === 'payment' ? Number(t.amount) : 0), 0)
  const currentRefunded = existingTx.reduce((sum, t) => sum + (t.type === 'refund' ? Number(t.amount) : 0), 0)
  const netPaid = currentPaid - currentRefunded

  const newTotalAmount = order.totalAmount + retainedProfit
  const newProfit = (order.profitAmount ?? 0) + retainedProfit

  const newNetPaid = netPaid - amountToReturn
  const newDue = newTotalAmount - newNetPaid

  // Evaluate new statuses
  let newPaymentStatus: PaymentStatus = order.paymentStatus
  if (newNetPaid <= 0 && newTotalAmount > 0) newPaymentStatus = PaymentStatus.UNPAID
  else if (newNetPaid >= newTotalAmount && newTotalAmount > 0) newPaymentStatus = PaymentStatus.PAID
  else if (newNetPaid > 0 && newNetPaid < newTotalAmount) newPaymentStatus = PaymentStatus.PARTIALLY_PAID
  else if (newTotalAmount === 0 && newNetPaid === 0) newPaymentStatus = PaymentStatus.REFUNDED

  const newOrderStatus = newPaymentStatus === PaymentStatus.PAID ? OrderStatus.COMPLETED : (newTotalAmount === 0 ? OrderStatus.CANCELED : OrderStatus.ACTIVE)

  const tx = await database.write(async () => {
    let refundTx: TransactionModel | null = null
    
    if (amountToReturn > 0) {
      refundTx = await database.get<TransactionModel>('transactions').create((t) => {
        t.orderId = order.id
        t.type = 'refund'
        t.amount = amountToReturn
        t.paymentDate = new Date()
      })
    }

    await order.update((o) => {
      o.totalAmount = newTotalAmount
      o.dueAmount = newDue
      o.profitAmount = newProfit
      o.paymentStatus = newPaymentStatus
      o.status = newOrderStatus
    })

    return refundTx
  })

  // Sync back to supabase
  if (isOnline) {
    if (tx) {
      try {
        await supabase.from('transactions').insert({
          id: tx.id,
          order_id: order.id,
          type: 'refund',
          amount: amountToReturn,
          payment_date: now,
          created_at: now,
          updated_at: now,
        })
      } catch { toastSupabaseError('add refund payment') }
    }

    try {
      await supabase.from('orders')
        .update({
          total_amount: newTotalAmount,
          due_amount: newDue,
          profit_amount: newProfit,
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
export type EditOrderParams = {
  items: { id: string; quantity: number; unitPrice: number }[]
  discountType: 'flat' | 'percent' | null
  discountValue: number
  totalAmount: number
}

export const editOrder = async (order: Order, params: EditOrderParams, isOnline: boolean) => {
  const now = Date.now()
  const { items, discountType, discountValue, totalAmount } = params

  // Fetch existing transactions to recompute due
  const existingTx = await order.transactions.fetch()
  const paidAmount = existingTx.reduce((sum, t) => sum + (t.type === 'payment' ? Number(t.amount) : -Number(t.amount)), 0)
  const newDue = totalAmount - paidAmount
  const newPaymentStatus = computePaymentStatus(totalAmount, paidAmount)
  const newOrderStatus = newPaymentStatus === PaymentStatus.PAID ? OrderStatus.COMPLETED : OrderStatus.ACTIVE

  // Fetch current order items and products BEFORE the write (can't do nested finds inside write)
  type ItemMeta = {
    orderItem: OrderItem
    product: any
    oldQty: number
    newQty: number
    productId: string
  }
  const itemMetas: ItemMeta[] = []
  let totalCost = 0

  for (const item of items) {
    const orderItem = await database.get<OrderItem>('order_items').find(item.id)
    let product: any = null
    try {
      product = await database.get<any>('products').find(orderItem.productId)
      totalCost += (product?.cost ?? 0) * item.quantity
    } catch { /* product deleted, skip cost */ }

    itemMetas.push({
      orderItem,
      product,
      oldQty: orderItem.quantity,
      newQty: item.quantity,
      productId: orderItem.productId,
    })
  }

  const newProfit = totalAmount - totalCost

  await database.write(async () => {
    for (const meta of itemMetas) {
      // Update order item qty and price
      await meta.orderItem.update((i) => {
        i.quantity = meta.newQty
        i.unitPrice = items.find(it => it.id === meta.orderItem.id)!.unitPrice
      })

      // Adjust inventory by delta: positive delta = qty increased = deduct inventory
      const delta = meta.newQty - meta.oldQty
      if (delta !== 0) {
        const invRecords = await database.get<Inventory>('inventory').query().fetch()
        const inv = invRecords.find(i => i.productId === meta.productId)
        if (inv) {
          await inv.update((r) => {
            // delta > 0 means more items ordered → deduct from stock
            // delta < 0 means fewer items ordered → return to stock
            r.quantity = Math.max(0, r.quantity - delta)
          })
        }
      }
    }

    await order.update((o) => {
      o.totalAmount = totalAmount
      o.dueAmount = newDue
      o.profitAmount = newProfit
      o.discountType = discountType ?? undefined
      o.discountValue = discountValue
      o.paymentStatus = newPaymentStatus
      o.status = newOrderStatus
    })
  })

  if (isOnline) {
    try {
      await Promise.all(items.map(item =>
        supabase.from('order_items').update({
          quantity: item.quantity,
          unit_price: item.unitPrice,
          updated_at: now,
        }).eq('id', item.id)
      ))
    } catch { toastSupabaseError('edit order items') }

    try {
      await supabase.from('orders').update({
        total_amount: totalAmount,
        due_amount: newDue,
        profit_amount: newProfit,
        discount_type: discountType,
        discount_value: discountValue,
        payment_status: newPaymentStatus,
        status: newOrderStatus,
        updated_at: now,
      }).eq('id', order.id)
    } catch { toastSupabaseError('edit order') }
  }
}
