import { Model, Query, Relation } from '@nozbe/watermelondb'
import { field, date, readonly, relation, children } from '@nozbe/watermelondb/decorators'
import Transaction from './Transaction'
import OrderItem from './OrderItem'
import Customer from './Customer'

export enum OrderStatus {
  ACTIVE = 'active',        // created and valid
  CANCELED = 'canceled',    // user/system canceled
  COMPLETED = 'completed',  // fulfilled (optional depending on system)
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  REFUNDED = 'refunded',              // fully refunded
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export default class Order extends Model {
  static table = 'orders'
  static associations = {
    order_items: { type: 'has_many', foreignKey: 'order_id' },
    customers: { type: 'belongs_to', key: 'customer_id' },
    users: { type: 'belongs_to', key: 'user_id' },
    transactions: { type: 'has_many', foreignKey: 'order_id' },
  } as const

  @field('customer_id') customerId!: string
  @field('user_id') userId!: string
  @date('order_date') orderDate!: Date
  @field('status') status!: OrderStatus
  @field('payment_status') paymentStatus!: PaymentStatus
  @field('due_amount') dueAmount?: number
  @field('profit_amount') profitAmount?: number
  @field('total_amount') totalAmount!: number
  @field('discount_type') discountType?: string
  @field('discount_value') discountValue?: number

  @relation('users', 'user_id') user: any
  @relation('customers', 'customer_id') customer!: Relation<Customer>
  @children('order_items')  orderItems!: Query<OrderItem>
  @children('transactions') transactions!: Query<Transaction>

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
  @field('last_modified') lastModified?: number
  @field('server_deleted_at') serverDeletedAt?: number
}

