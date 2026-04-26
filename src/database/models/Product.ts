import { Model, Query } from '@nozbe/watermelondb'
import { children, date, field, readonly } from '@nozbe/watermelondb/decorators'
import Inventory from './Inventory'
import ProductImages from './Images'

export default class Product extends Model {
  static table = 'products'
  static associations = {
    product_images: { type: 'has_many' as const, foreignKey: 'product_id' },
    inventory:      { type: 'has_many' as const, foreignKey: 'product_id' },
    inventory_items: { type: 'has_many', foreignKey: 'product_id' },
    order_items: { type: 'has_many', foreignKey: 'product_id' },
    purchase_order_items: { type: 'has_many', foreignKey: 'product_id' }
  } as const

  @field('name') name!: string
  @field('sku') sku!: string
  @field('description') description?: string
  @field('price') price!: number
  @field('cost') cost!: number

  @children('inventory_items') inventoryItems!: any
  @children('order_items') orderItems!: any
  @children('purchase_order_items') purchaseOrderItems!: any
  @children('product_images') images!: Query<ProductImages>
  @children('inventory')      inventories!: Query<Inventory>

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
  @field('last_modified') lastModified?: number
  @field('server_deleted_at') serverDeletedAt?: number
}
