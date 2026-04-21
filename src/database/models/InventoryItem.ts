import { Model, Relation } from '@nozbe/watermelondb'
import { date, field, readonly, relation } from '@nozbe/watermelondb/decorators'
import Product from './Product'

export default class InventoryItem extends Model {
  static table = 'inventory_items'

  @field('quantity') quantity!: number
  @field('location') location!: string

  @relation('products', 'product_id') product!: Relation<Product>

  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}
