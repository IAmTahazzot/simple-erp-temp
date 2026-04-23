import {Model, Relation} from '@nozbe/watermelondb'
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators'
import Order from './Order'
import Product from './Product'

export default class OrderItem extends Model {
  static table = 'order_items'
  static associations = {
    orders: { type: 'belongs_to', key: 'order_id' },
    products: { type: 'belongs_to', key: 'product_id' }
  } as const

  @field('order_id') orderId!: string
  @field('product_id') productId!: string
  @field('quantity') quantity!: number
  @field('unit_price') unitPrice!: number

  @relation('orders', 'order_id') order: Relation<Order>
  @relation('products', 'product_id') product: Relation<Product>

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
  @field('last_modified') lastModified?: number
  @field('server_deleted_at') serverDeletedAt?: number
}

