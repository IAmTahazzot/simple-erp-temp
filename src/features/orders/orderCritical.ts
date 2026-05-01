import {database} from '@/database'
import Order from '@/database/models/Order'
import OrderItem from '@/database/models/OrderItem'
import TransactionModel from '@/database/models/Transaction'
import {supabase} from '@/services/supabase'
import {sync} from '@/database/sync'


// ─── Get Critical Orders ─────────────────────────────────────────────────────
/**
 * 
 * Requested functions:
 * 1. A function to delete/trash an order if it's pending and has no transactions.
 *    - This function should check the order's status and transactions before canceling.
 *    - It should be saved as OrderStatus.CANCELED
 *    - Inventory should be updated accordingly, giving all the products back to stock.
 *    - DO NOT USE THIS FUNCTION FOR ORDERS THAT HAVE BEEN PAID OR PARTIALLY PAID, AS IT MAY CAUSE INCONSISTENCIES IN THE INVENTORY AND FINANCIAL RECORDS, IT IS ONLY FOR ORDERS THAT ARE PENDING AND HAVE NO TRANSACTIONS.
 * 
 */
