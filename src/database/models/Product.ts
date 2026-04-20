import { Model } from '@nozbe/watermelondb'
import { children, date, field, readonly } from '@nozbe/watermelondb/decorators'

export default class Product extends Model {
  static table = 'products'

  @field('name') name!: string
  @field('sku') sku!: string
  @field('price') price!: number

  @children('inventory_items') inventoryItems!: any

  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}
