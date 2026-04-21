import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export default class User extends Model {
  static table = 'users'

  @field('name') name!: string
  @field('email') email!: string
  @field('password_hash') password_hash!: string

  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}
