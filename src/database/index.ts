import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import migrations from './migrations'
import Inventory from './models/Inventory'
import Product from './models/Product'
import User from './models/User'
import Customer from './models/Customer'
import Supplier from './models/Supplier'
import Order from './models/Order'
import OrderItem from './models/OrderItem'
import PurchaseOrder from './models/PurchaseOrder'
import PurchaseOrderItem from './models/PurchaseOrderItem'
import Payment from './models/Payment'
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
    Inventory,
    Customer,
    Supplier,
    Order,
    OrderItem,
    PurchaseOrder,
    PurchaseOrderItem,
    Payment,
  ],
})
