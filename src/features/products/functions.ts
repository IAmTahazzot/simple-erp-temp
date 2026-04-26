import {File, Directory, Paths} from 'expo-file-system'
import {readAsStringAsync} from 'expo-file-system/legacy'
import {decode} from 'base64-arraybuffer'
import {database} from '@/database'
import Product from '@/database/models/Product'
import ProductImages from '@/database/models/Images'
import Inventory from '@/database/models/Inventory'
import {supabase} from '@/services/supabase'
import {sync} from '@/database/sync';

// ─── Image Helpers ────────────────────────────────────────────────────────────

const BUCKET = 'simple'

// New API: Directory and File classes instead of string paths
const getImagesDir = () => new Directory(Paths.document, 'product-images')

const getLocalFile = (filename: string) =>
  new File(getImagesDir(), filename)

export const getRemoteUrl = (filename: string) =>
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/products/${filename}`

// Show local file if it exists, otherwise remote URL
export const resolveImage = (imageUrl: string): string => {
  if (imageUrl.startsWith('http')) return imageUrl
  const file = getLocalFile(imageUrl)
  return file.exists ? file.uri : getRemoteUrl(imageUrl)
}

const saveImageLocally = (pickerUri: string): string => {
  const dir = getImagesDir()
  if (!dir.exists) dir.create()

  const filename = `${Date.now()}.jpg`
  const sourceFile = new File(pickerUri)
  const destFile = new File(dir, filename)
  sourceFile.copy(destFile)   // synchronous in the new API

  return filename // only filename stored in DB
}

const uploadImageToSupabase = async (filename: string): Promise<string> => {
  const file = getLocalFile(filename)
  const base64 = await readAsStringAsync(file.uri, {encoding: 'base64'})

  const {error} = await supabase.storage
    .from(BUCKET)
    .upload(`products/${filename}`, decode(base64), {contentType: 'image/jpeg', upsert: true})

  if (error) throw error
  return getRemoteUrl(filename)
}

// ─── Create Product ───────────────────────────────────────────────────────────

export const createProduct = async (
  data: { name: string; price: number; cost: number; description: string },
  imagePickerUri: string | null,
  quantity: number,
  lowStockThreshold: number,
  isOnline: boolean
) => {
  // 1. Save image locally first (works offline, synchronous)
  const filename = imagePickerUri ? saveImageLocally(imagePickerUri) : null

  // 2. Write everything to WatermelonDB
  const {product, productImage} = await database.write(async () => {
    const product = await database.get<Product>('products').create((p) => {
      p.name = data.name
      p.price = data.price
      p.cost = data.cost
      p.description = data.description
    })

    const productImage = filename
      ? await database.get<ProductImages>('product_images').create((img) => {
        img.productId = product.id
        img.imageUrl = filename  // filename only until uploaded
        img.isPrimary = true
      })
      : null

    await database.get<Inventory>('inventory').create((inv) => {
      inv.productId = product.id
      inv.quantity = quantity
      inv.lowStockThreshold = lowStockThreshold
    })

    return {product, productImage}
  })

  // 3. If online → upload image + push all to Supabase
  if (isOnline) {
    const remoteUrl = filename
      ? await uploadImageToSupabase(filename).catch((e) => {
        console.warn('Image upload failed, sync will retry:', e)
        return null
      })
      : null

    // Update image record with remote URL
    if (productImage && remoteUrl) {
      await database.write(async () => {
        await productImage.update((img) => {
          img.imageUrl = remoteUrl
        })
      })
    }

    // Fix 2: send numbers not ISO strings for created_at / updated_at
    const now = Date.now() // number, matches bigint in Supabase

    await supabase.from('products').upsert({
      id: product.id,
      name: product.name,
      price: product.price, cost: product.cost,
      description: product.description,
      created_at: now, updated_at: now,   // ← number not string
    })

    if (productImage && remoteUrl) {
      await database.write(async () => {
        await productImage.update((img) => {
          img.imageUrl = remoteUrl
        })
      })

      supabase.from('product_images').upsert({
        id: productImage.id, product_id: product.id,
        image_url: remoteUrl, is_primary: true,
        created_at: now, updated_at: now,
      }).then(({error}) => {
        if (error) console.warn('Image push failed:', error)
      })
    }
  }

  await sync().then(() => {
    console.log('Initial sync complete after product creation')
  }).catch((e) => {
    console.warn('Initial sync failed after product creation:', e)
  })

  return product
}

// ─── Update Product ───────────────────────────────────────────────────────────

export const updateProduct = async (
  prevProduct: Product,
  data: { name: string; price: number; cost: number; description: string },
  newImagePickerUri: string | null,
  quantity: number,
  stockWarning: number,
  isOnline: boolean
) => {
  // 1. Save new image locally if picked
  const newFilename = newImagePickerUri ? saveImageLocally(newImagePickerUri) : null

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

    if (newFilename) {
      const images = await prevProduct.images.fetch()
      const primary = images.find((img) => img.isPrimary) ?? images[0]
      if (primary) {
        await primary.update((img) => {
          img.imageUrl = newFilename
        })
      } else {
        await database.get<ProductImages>('product_images').create((img) => {
          img.productId = prevProduct.id
          img.imageUrl = newFilename
          img.isPrimary = true
        })
      }
    }
  })

  // 3. If online → upload + push to Supabase
  if (isOnline) {
    const remoteUrl = newFilename
      ? await uploadImageToSupabase(newFilename).catch((e) => {
        console.warn('Image upload failed, sync will retry:', e)
        return null
      })
      : null

    if (remoteUrl) {
      await database.write(async () => {
        const images = await prevProduct.images.fetch()
        const primary = images.find((img) => img.isPrimary) ?? images[0]
        if (primary) await primary.update((img) => {
          img.imageUrl = remoteUrl
        })
      })
    }

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

    if (remoteUrl) {
      const images = await prevProduct.images.fetch()
      const primary = images.find((img) => img.isPrimary) ?? images[0]
      if (primary) {
        supabase.from('product_images').upsert({
          id: primary.id, product_id: prevProduct.id,
          image_url: remoteUrl, is_primary: true, updated_at: now,
        }).then(({error}) => {
          if (error) console.warn('Image update failed:', error)
        })
      }
    }
  }

  await sync().then(() => {
    console.log('Initial sync complete after product update')
  }).catch((e) => {
    console.warn('Initial sync failed after product update:', e)
  })
  
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
  }

  await sync().catch((e) => console.warn('Sync failed after delete:', e))
}
