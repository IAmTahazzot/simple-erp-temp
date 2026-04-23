import { Model, Relation } from '@nozbe/watermelondb'
import { date, field, readonly, relation } from '@nozbe/watermelondb/decorators'
import Product from './Product'

export default class Inventory extends Model {
  static table = 'inventory'
  static associations = {
    products: { type: 'belongs_to', key: 'product_id' }
  } as const

  @field('product_id') productId!: string
  @field('quantity') quantity!: number

  @relation('products', 'product_id') product!: Relation<Product>

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
  @field('last_modified') lastModified?: number
  @field('server_deleted_at') serverDeletedAt?: number
}
