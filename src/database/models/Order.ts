import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, relation, children } from '@nozbe/watermelondb/decorators'

export default class Order extends Model {
  static table = 'orders'
  static associations = {
    order_items: { type: 'has_many', foreignKey: 'order_id' },
    payments: { type: 'has_many', foreignKey: 'order_id' }
  } as const

  @field('customer_id') customerId!: string
  @field('user_id') userId!: string
  @date('order_date') orderDate!: Date
  @field('status') status!: string
  @field('total_amount') totalAmount!: number
  @field('discount_type') discountType?: string
  @field('discount_value') discountValue?: number

  @relation('customers', 'customer_id') customer: any
  @relation('users', 'user_id') user: any
  @children('order_items') orderItems: any
  @children('payments') payments: any

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
  @field('last_modified') lastModified?: number
  @field('server_deleted_at') serverDeletedAt?: number
}

