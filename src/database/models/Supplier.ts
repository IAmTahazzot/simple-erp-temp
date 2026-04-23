import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export default class Supplier extends Model {
  static table = 'suppliers'

  @field('name') name!: string
  @field('contact_name') contactName?: string
  @field('email') email?: string
  @field('phone') phone?: string
  @field('address') address?: string

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
  @field('last_modified') lastModified?: number
  @field('server_deleted_at') serverDeletedAt?: number
}

