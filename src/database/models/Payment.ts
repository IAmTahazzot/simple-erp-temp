import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators'

export default class Payment extends Model {
  static table = 'payments'
  static associations = {
    orders: { type: 'belongs_to', key: 'order_id' },
    purchase_orders: { type: 'belongs_to', key: 'purchase_order_id' }
  } as const

  @field('order_id') orderId?: string
  @field('purchase_order_id') purchaseOrderId?: string
  @date('payment_date') paymentDate!: Date
  @field('amount') amount!: number

  @relation('orders', 'order_id') order: any
  @relation('purchase_orders', 'purchase_order_id') purchaseOrder: any

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
  @field('last_modified') lastModified?: number
  @field('server_deleted_at') serverDeletedAt?: number
}

