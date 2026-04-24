import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export default class ProductImages extends Model {
  static table = 'product_images'
  
  static associations = {
    products: { type: 'belongs_to', key: 'product_id' }
  } as const

  @field('product_id') productId!: string
  @field('image_url') imageUrl!: string
  @field('is_primary') isPrimary!: boolean

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
  @field('last_modified') lastModified?: number
  @field('server_deleted_at') serverDeletedAt?: number
}

