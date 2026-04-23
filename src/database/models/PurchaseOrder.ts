import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, relation, children } from '@nozbe/watermelondb/decorators'

export default class PurchaseOrder extends Model {
  static table = 'purchase_orders'
  static associations = {
    purchase_order_items: { type: 'has_many', foreignKey: 'purchase_order_id' },
    payments: { type: 'has_many', foreignKey: 'purchase_order_id' }
  } as const

  @field('supplier_id') supplierId!: string
  @field('user_id') userId!: string
  @date('order_date') orderDate!: Date
  @field('status') status!: string
  @field('total_amount') totalAmount!: number
  @field('discount_type') discountType?: string
  @field('discount_value') discountValue?: number

  @relation('suppliers', 'supplier_id') supplier: any
  @relation('users', 'user_id') user: any
  @children('purchase_order_items') items: any
  @children('payments') payments: any

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
  @field('last_modified') lastModified?: number
  @field('server_deleted_at') serverDeletedAt?: number
}

