// app/features/purchase_orders/functions.ts
import {database} from '@/database'
import PurchaseOrder from '@/database/models/PurchaseOrder'
import PurchaseOrderItem from '@/database/models/PurchaseOrderItem'
import TransactionModel from '@/database/models/Transaction'
import {supabase} from '@/services/supabase'
import {sync} from '@/database/sync'

export type PurchaseOrderLine = {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

function computeStatus(total: number, paid: number): string {
  if (paid <= 0) return 'pending'
  if (paid >= total) return 'paid'
  return 'partial'
}

// ─── Create Purchase Order ────────────────────────────────────────────────────

export const createPurchaseOrder = async (
  supplierId: string,
  userId: string,
  lines: PurchaseOrderLine[],
  discountType: 'flat' | 'percent' | null,
  discountValue: number,
  totalAmount: number,
  isOnline: boolean
) => {
  const now = Date.now()

  const {order, orderItems} = await database.write(async () => {
    const order = await database.get<PurchaseOrder>('purchase_orders').create((o) => {
      o.supplierId   = supplierId
      o.userId       = userId
      o.orderDate    = new Date()
      o.status       = 'pending'
      o.totalAmount  = totalAmount
      o.discountType = discountType ?? undefined
      o.discountValue = discountValue
    })

    const orderItems = await Promise.all(lines.map((line) =>
      database.get<PurchaseOrderItem>('purchase_order_items').create((i) => {
        i.purchaseOrderId = order.id
        i.productId       = line.productId
        i.quantity        = line.quantity
        i.unitPrice       = line.unitPrice
      })
    ))

    return {order, orderItems}
  })

  if (isOnline) {
    await supabase.from('purchase_orders').upsert({
      id: order.id, supplier_id: supplierId, user_id: userId,
      order_date: now, status: 'pending', total_amount: totalAmount,
      discount_type: discountType, discount_value: discountValue,
      created_at: now, updated_at: now,
    })

    await Promise.all(orderItems.map((item) =>
      supabase.from('purchase_order_items').upsert({
        id: item.id, purchase_order_id: order.id, product_id: item.productId,
        quantity: item.quantity, unit_price: item.unitPrice,
        created_at: now, updated_at: now,
      })
    ))

    await sync().catch((e) => console.warn('Sync failed after purchase order create:', e))
  }

  return order
}

// ─── Add Payment ──────────────────────────────────────────────────────────────

export const addPurchasePayment = async (
  order: PurchaseOrder,
  amount: number,
  isOnline: boolean
) => {
  const now = Date.now()

  const existingTx = await order.transactions.fetch()
  const alreadyPaid = existingTx.reduce((sum: number, t: TransactionModel) =>
    sum + (t.type === 'payment' ? t.amount : -t.amount), 0)
  const newStatus = computeStatus(order.totalAmount, alreadyPaid + amount)

  const tx = await database.write(async () => {
    const tx = await database.get<TransactionModel>('transactions').create((t) => {
      t.purchaseOrderId = order.id
      t.type            = 'payment'
      t.amount          = amount
      t.paymentDate     = new Date()
    })

    await order.update((o) => { o.status = newStatus })

    return tx
  })

  if (isOnline) {
    supabase.from('transactions').upsert({
      id: tx.id, order_id: null, purchase_order_id: order.id,
      type: 'payment', amount, payment_date: now,
      created_at: now, updated_at: now,
    }).then(({error}) => { if (error) console.warn('Transaction push failed:', error) })

    supabase.from('purchase_orders')
      .update({status: newStatus, updated_at: now})
      .eq('id', order.id)
      .then(({error}) => { if (error) console.warn('PO status update failed:', error) })

    await sync().catch((e) => console.warn('Sync failed after purchase payment:', e))
  }

  return tx
}
