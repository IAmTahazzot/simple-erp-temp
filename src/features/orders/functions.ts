// app/features/orders/functions.ts
import {database} from '@/database'
import Order from '@/database/models/Order'
import OrderItem from '@/database/models/OrderItem'
import TransactionModel from '@/database/models/Transaction'
import {supabase} from '@/services/supabase'
import {sync} from '@/database/sync'

export type OrderLine = {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

function computeStatus(totalAmount: number, amountPaid: number): string {
  if (amountPaid <= 0) return 'pending'
  if (amountPaid >= totalAmount) return 'paid'
  return 'partial'
}

// ─── Create Order ─────────────────────────────────────────────────────────────

export const createOrder = async (
  customerId: string,
  lines: OrderLine[],
  discountType: 'flat' | 'percent' | null,
  discountValue: number,
  totalAmount: number,
  isOnline: boolean,
  userId: string
) => {
  const now = Date.now() // for Supabase timestamps

  const {order, orderItems} = await database.write(async () => {
    const order = await database.get<Order>('orders').create((o) => {
      o.customerId = customerId
      o.userId = userId           // set from your auth context
      o.orderDate = new Date()
      o.status = 'pending'
      o.totalAmount = totalAmount
      o.discountType = discountType ?? undefined
      o.discountValue = discountValue
    })

    const orderItems = await Promise.all(lines.map((line) =>
      database.get<OrderItem>('order_items').create((i) => {
        i.orderId = order.id
        i.productId = line.productId
        i.quantity = line.quantity
        i.unitPrice = line.unitPrice
      })
    ))

    return {order, orderItems}
  })

  if (isOnline) {
    await supabase.from('orders').insert({
      id: order.id, customer_id: customerId, user_id: order.userId,
      order_date: now, status: 'pending', total_amount: totalAmount,
      discount_type: discountType, discount_value: discountValue,
      created_at: now, updated_at: now,
    })

    await Promise.all(orderItems.map((item) =>
      supabase.from('order_items').upsert({
        id: item.id, order_id: order.id, product_id: item.productId,
        quantity: item.quantity, unit_price: item.unitPrice,
        created_at: now, updated_at: now,
      })
    ))

    await sync().catch((e) => console.warn('Sync failed after order create:', e))
  }

  return order
}

// ─── Add Payment ──────────────────────────────────────────────────────────────

export const addPayment = async (
  order: Order,
  amount: number,
  paymentType: 'payment' | 'refund',
  isOnline: boolean
) => {
  const now = Date.now() // for Supabase timestamps
  
  // Get total paid so far
  const existingTx = await order.transactions.fetch()
  const alreadyPaid = existingTx.reduce((sum: number, t: TransactionModel) => sum + (t.type === 'payment' ? t.amount : -t.amount), 0)
  
  // Compute new total and status
  const newTotalPaid = alreadyPaid + ( paymentType === 'payment' ? amount : -amount )
  const newStatus = computeStatus(order.totalAmount, newTotalPaid)

  const tx = await database.write(async () => {
    const tx = await database.get<TransactionModel>('transactions').create((t) => {
      t.orderId = order.id
      t.type = paymentType
      t.amount = amount
      t.paymentDate = new Date()
    })

    await order.update((o) => {
      o.status = newStatus
    })

    return tx
  })

  if (isOnline) {
    supabase.from('transactions').upsert({
      id: tx.id, order_id: order.id, purchase_order_id: null,
      type: paymentType, amount, payment_date: now,
      created_at: now, updated_at: now,
    }).then(({error}) => {
      if (error) console.warn('Transaction push failed:', error)
    })

    supabase.from('orders')
      .update({status: newStatus, updated_at: now})
      .eq('id', order.id)
      .then(({error}) => {
        if (error) console.warn('Order status update failed:', error)
      })

    await sync().catch((e) => console.warn('Sync failed after payment:', e))
  }

  return tx
}

