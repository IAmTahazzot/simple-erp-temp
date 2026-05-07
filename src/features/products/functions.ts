import {database} from '@/database'
import Product from '@/database/models/Product'
import Inventory from '@/database/models/Inventory'
import {supabase} from '@/services/supabase'
import {sync} from '@/database/sync';
import { UNKNOWN_SUPPLIER_NAME } from '@/hooks/use-unknown-supplier'
import { PurchaseOrderStatus, PurchasePaymentStatus } from '@/database/models/PurchaseOrder'
import PurchaseOrder from '@/database/models/PurchaseOrder'
import PurchaseOrderItem from '@/database/models/PurchaseOrderItem'

// ─── Create Product ───────────────────────────────────────────────────────────
export const createProduct = async (
  data: { name: string; price: number; cost: number; description: string },
  quantity: number,
  lowStockThreshold: number,
  isOnline: boolean
) => {

  // 2. Write everything to WatermelonDB
  const {product} = await database.write(async () => {
    const product = await database.get<Product>('products').create((p) => {
      p.name = data.name
      p.price = data.price
      p.cost = data.cost
      p.description = data.description
    })

    await database.get<Inventory>('inventory').create((inv) => {
      inv.productId = product.id
      inv.quantity = quantity
      inv.lowStockThreshold = lowStockThreshold
    })

    return {product}
  })

  // 3. As it's a new product, we need to tract cost via an "unknown supplier" entry in the purchase order table. This allows us to properly track product cost and profit even if the user starts selling before recording a purchase.
  await addUnknownSupplierToOpeningStock(product.id, data.cost, quantity)
  
  // 4. If online → push all to Supabase
  if (isOnline) {
    // Fix 2: send numbers not ISO strings for created_at / updated_at
    const now = Date.now() // number, matches bigint in Supabase

    await supabase.from('products').upsert({
      id: product.id,
      name: product.name,
      price: product.price, cost: product.cost,
      description: product.description,
      created_at: now, updated_at: now,   // ← number not string
    })

    await sync().then(() => {
      console.log('Initial sync complete after product creation')
    }).catch((e) => {
      console.warn('Initial sync failed after product creation:', e)
    })
  }

  return product
}

// ─── Add Unknown Supplier to Opening Stock to track proper product cost  ──────────────────────────
export const addUnknownSupplierToOpeningStock = async (productId: string, cost: number, quantity: number) => {
  return await database.write(async () => {
    const supplier = await database.get('suppliers').create((s) => {
      s.name = UNKNOWN_SUPPLIER_NAME // Use the constant for the supplier name
    })

    const totalAmount = cost * quantity
    const orderStatus = PurchaseOrderStatus.COMPLETED // Mark as received since it's opening stock
    const paymentStatus = PurchasePaymentStatus.PAID   // Mark as paid to reflect that cost is accounted for

    const order = await database.get<PurchaseOrder>('purchase_orders').create((o) => {
      o.supplierId = supplier.id
      o.orderDate = new Date()
      o.status = orderStatus
      o.paymentStatus = paymentStatus
      o.totalAmount = totalAmount
      o.dueAmount = 0
      o.discountType = undefined
      o.discountValue = 0
    })

    // 2. Create order items
    await database.get<PurchaseOrderItem>('purchase_order_items').create((i) => {
      i.purchaseOrderId = order.id
      i.productId = productId
      i.quantity = quantity
      i.unitPrice = cost
    })
  })
}


// ─── Update Product ───────────────────────────────────────────────────────────
export const updateProduct = async (
  prevProduct: Product,
  data: { name: string; price: number; cost: number; description: string },
  quantity: number,
  stockWarning: number,
  isOnline: boolean
) => {
  // 2. Write to WatermelonDB
  await database.write(async () => {
    await prevProduct.update((p) => {
      p.name = data.name
      p.price = data.price
      p.cost = data.cost
      p.description = data.description
    })

    const inventories = await prevProduct.inventories.fetch()
    if (inventories[0]) {
      await inventories[0].update((inv) => {
        inv.quantity = quantity
        inv.lowStockThreshold = stockWarning
      })
    }
  })

  // 3. If online → push to Supabase
  if (isOnline) {
    const now = Date.now()

    supabase.from('products').update({
      name: data.name,
      price: data.price,
      cost: data.cost,
      description: data.description,
      updated_at: now,
    })
      .eq('id', prevProduct.id)
      .then(({error}) => {
        if (error) console.warn('Product update failed:', error)
      })

    await sync().then(() => {
      console.log('Initial sync complete after product update')
    }).catch((e) => {
      console.warn('Initial sync failed after product update:', e)
    })
  }
}

// ─── Delete Product ───────────────────────────────────────────────────────────
export const deleteProduct = async (product: Product, isOnline: boolean) => {
  const now = Date.now()

  // 1. Soft delete in WatermelonDB
  await database.write(async () => {
    await product.update((p) => {
      p.serverDeletedAt = now
    })
  })

  // 2. If online → mark deleted in Supabase
  if (isOnline) {
    supabase
      .from('products')
      .update({server_deleted_at: now, updated_at: now})
      .eq('id', product.id)
      .then(({error}) => {
        if (error) console.warn('Product delete failed:', error)
      })

    await sync().catch((e) => console.warn('Sync failed after delete:', e))
  }

}
