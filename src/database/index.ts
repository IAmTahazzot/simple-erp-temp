import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import migrations from './migrations'
import InventoryItem from './models/InventoryItem'
import Product from './models/Product'
import User from './models/User'
import schema from './schema'

const adapter = new SQLiteAdapter({
  dbName: 'erp',
  schema,
  migrations,
  onSetUpError: (error) => {
    console.error('Error setting up the database:', error)
  }
})

export const database = new Database({
  adapter,
  modelClasses: [
    User,
    Product,
    InventoryItem,
  ],
})
