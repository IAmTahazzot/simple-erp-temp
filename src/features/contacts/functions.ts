import {database} from '@/database'
import Customer from '@/database/models/Customer'
import Supplier from '@/database/models/Supplier'
import {supabase} from '@/services/supabase'
import {sync} from '@/database/sync'
import {Alert, ToastAndroid} from 'react-native'

const duplicateDetection = async (name: string, type: 'customer' | 'supplier') => {
  const table = type === 'customer' ? 'customers' : 'suppliers'
  const existing = await database.get<Supplier | Customer>(table).query().fetch()

  const exist = existing.some((item) => item.name.toLowerCase() === name.toLowerCase())
  
  if (exist) {
    Alert.alert('Duplicate ' + type, `${name} already exists as a ${type}. Please choose a different name.`)
    throw new Error('Duplicate ' + type + ' name')
  }
}

// ─── Create Customer ──────────────────────────────────────────────────────────
export const createCustomer = async (
  data: { name: string; email?: string; phone?: string; address?: string },
  isOnline: boolean
) => {
 
  await duplicateDetection(data.name, 'customer')
  
  const customer = await database.write(async () => {
    return database.get<Customer>('customers').create((c) => {
      c.name = data.name
      c.email = data.email
      c.phone = data.phone
      c.address = data.address
    })
  })

  if (isOnline) {
    const now = Date.now()
    supabase.from('customers').upsert({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      created_at: now,
      updated_at: now,
    }).then(({error}) => {
      if (error) {
        console.warn('Customer push failed:', error)
      } else {

        ToastAndroid.show('Customer created online', ToastAndroid.SHORT)
      }
    })
    await sync().catch((e) => console.warn('Sync failed after customer create:', e))
  }


  return customer
}

// ─── Create Supplier ──────────────────────────────────────────────────────────

export const createSupplier = async (
  data: { name: string; contactName?: string; email?: string; phone?: string; address?: string },
  isOnline: boolean
) => {
  await duplicateDetection(data.name, 'supplier')
  const supplier = await database.write(async () => {
    return database.get<Supplier>('suppliers').create((s) => {
      s.name = data.name
      s.contactName = data.contactName
      s.email = data.email
      s.phone = data.phone
      s.address = data.address
    })
  })

  if (isOnline) {
    const now = Date.now()
    supabase.from('suppliers').upsert({
      id: supplier.id,
      name: supplier.name,
      contact_name: supplier.contactName,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      created_at: now,
      updated_at: now,
    }).then(({error}) => {
      if (error) {
        console.warn('Supplier push failed:', error)
      } else {
        ToastAndroid.show('Supplier created online', ToastAndroid.SHORT)
      }
    })
    
    await sync().catch((e) => console.warn('Sync failed after supplier create:', e))

  }

  return supplier
}


export const updateCustomer = async (
  prev: Customer,
  data: { name: string; email?: string; phone?: string; address?: string },
  isOnline: boolean
) => {
  await database.write(async () => {
    await prev.update((c) => {
      c.name = data.name
      c.email = data.email
      c.phone = data.phone
      c.address = data.address
    })
  })

  if (isOnline) {
    const now = Date.now()
    supabase.from('customers')
      .update({name: data.name, email: data.email, phone: data.phone, address: data.address, updated_at: now})
      .eq('id', prev.id)
      .then(({error}) => {
        if (error) {
          console.warn('Customer update failed:', error)
        } else {
          ToastAndroid.show('Customer updated online', ToastAndroid.SHORT)
        }
      })
    
    await sync().catch((e) => console.warn('Sync failed after customer update:', e))
  }
}

export const updateSupplier = async (
  prev: Supplier,
  data: { name: string; contactName?: string; email?: string; phone?: string; address?: string },
  isOnline: boolean
) => {
  await database.write(async () => {
    await prev.update((s) => {
      s.name = data.name
      s.contactName = data.contactName
      s.email = data.email
      s.phone = data.phone
      s.address = data.address
    })
  })

  if (isOnline) {
    const now = Date.now()
    supabase.from('suppliers')
      .update({
        name: data.name, contact_name: data.contactName,
        email: data.email, phone: data.phone, address: data.address, updated_at: now,
      })
      .eq('id', prev.id)
      .then(({error}) => {
        if (error) {
          console.warn('Supplier update failed:', error)
        } else {
          ToastAndroid.show('Supplier updated online', ToastAndroid.SHORT)
        }
      })
    
    await sync().catch((e) => console.warn('Sync failed after supplier update:', e))
  }

}


export const deleteContact = async (
  contact: Customer | Supplier,
  contactType: 'customer' | 'supplier',
  isOnline: boolean
) => {
  const now = Date.now()
  const table = contactType === 'customer' ? 'customers' : 'suppliers'

  await database.write(async () => {
    await contact.update((c) => {
      c.serverDeletedAt = now
    })
  })

  if (isOnline) {
    supabase.from(table)
      .update({server_deleted_at: now, updated_at: now})
      .eq('id', contact.id)
      .then(({error}) => {
        if (error) console.warn(`${table} delete failed:`, error)
      })
  }

}
