import { Model, Query, Relation } from '@nozbe/watermelondb'
import { field, date, readonly, relation, children } from '@nozbe/watermelondb/decorators'
import Transaction from './Transaction'
import PurchaseOrderItem from './PurchaseOrderItem'
import Supplier from './Supplier'

export default class PurchaseOrder extends Model {
  static table = 'purchase_orders'
  static associations = {
    purchase_order_items: { type: 'has_many', foreignKey: 'purchase_order_id' },
    payments: { type: 'has_many', foreignKey: 'purchase_order_id' },
    suppliers: { type: 'belongs_to', key: 'supplier_id' },
    users: { type: 'belongs_to', key: 'user_id' },
    transactions: { type: 'has_many', foreignKey: 'purchase_order_id' },
  } as const

  @field('supplier_id') supplierId!: string
  @field('user_id') userId!: string
  @date('order_date') orderDate!: Date
  @field('status') status!: string
  @field('total_amount') totalAmount!: number
  @field('discount_type') discountType?: string
  @field('discount_value') discountValue?: number

  @relation('users', 'user_id') user: any
  @relation('suppliers', 'supplier_id') supplier!: Relation<Supplier> 
  @children('purchase_order_items') items!: Query<PurchaseOrderItem>
  @children('transactions') transactions!: Query<Transaction>

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
  @field('last_modified') lastModified?: number
  @field('server_deleted_at') serverDeletedAt?: number
}

