import { database } from '@/database'
import Product from '@/database/models/Product'
import { supabase } from '@/services/supabase'

const createProduct = async (data: { name: string; price: number }, isOnline: boolean) => {
  // 1. Always write locally
  const product = await database.write(async () => {
    return database.get<Product>('products').create((p) => {
      p.name = data.name
      p.price = data.price
      
    })
  })

  // 2. If online, push to Supabase now (don't await — don't block UI)
  if (isOnline) {
    supabase.from('products').upsert({
      id: product.id,
      name: product.name,
      price: product.price,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.warn('Direct push failed, sync will catch it:', error)
    })
  }

  return product
}
