import {database} from '@/database'
import Product from '@/database/models/Product'
import Inventory from '@/database/models/Inventory'
import {supabase} from '@/services/supabase'
import {sync} from '@/database/sync';

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

  // 3. If online → push all to Supabase
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
