import { Model, Relation } from '@nozbe/watermelondb'
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators'
import PurchaseOrder from './PurchaseOrder'
import Product from './Product'

export default class PurchaseOrderItem extends Model {
  static table = 'purchase_order_items'
  static associations = {
    purchase_orders: { type: 'belongs_to', key: 'purchase_order_id' },
    products: { type: 'belongs_to', key: 'product_id' }
  } as const

  @field('purchase_order_id') purchaseOrderId!: string
  @field('product_id') productId!: string
  @field('quantity') quantity!: number
  @field('unit_price') unitPrice!: number

  @relation('purchase_orders', 'purchase_order_id') purchaseOrder: Relation<PurchaseOrder>
  @relation('products', 'product_id') product: Relation<Product>

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
  @field('last_modified') lastModified?: number
  @field('server_deleted_at') serverDeletedAt?: number
}

