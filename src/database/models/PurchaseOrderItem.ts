import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators'

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

  @relation('purchase_orders', 'purchase_order_id') purchaseOrder: any
  @relation('products', 'product_id') product: any

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
  @field('last_modified') lastModified?: number
  @field('server_deleted_at') serverDeletedAt?: number
}

