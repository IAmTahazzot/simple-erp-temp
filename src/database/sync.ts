import { synchronize } from '@nozbe/watermelondb/sync'
import { database } from '@/database'
import { supabase } from '@/services/supabase'

// Every table you want synced
const TABLES = [
  'users', 'customers', 'suppliers', 'products', 'product_images',
  'inventory', 'orders', 'order_items', 'purchase_orders',
  'purchase_order_items', 'transactions',
]

let isSyncing = false

export const sync = async () => {
  if (isSyncing) return
  isSyncing = true

  try {
    await synchronize({
      database,
      sendCreatedAsUpdated: true, // Tell WatermelonDB to treat unknown 'updated' records as 'created'

      pullChanges: async ({ lastPulledAt }) => {
        const since = lastPulledAt || 0

        const changes: Record<string, any> = {}

        // Fetch all tables in parallel
        await Promise.all(
          TABLES.map(async (table) => {
            const { data, error } = await supabase
              .from(table)
              .select('*')
              .gt('updated_at', since)

            if (error) throw error

            const records = data ?? []

            changes[table] = {
              created: [],
              updated: records
                .filter((r) => !r.server_deleted_at)
                .map((r) => mapFromSupabase(r)),
              deleted: records
                .filter((r) => r.server_deleted_at)
                .map((r) => r.id),
            }
          })
        )

        return { changes, timestamp: Date.now() }
      },

      pushChanges: async ({ changes }) => {
        await Promise.all(
          TABLES.map(async (table) => {
            const tableChanges = (changes as any)[table]
            
            if (!tableChanges) return

            const toUpsert = [
              ...(tableChanges.created ?? []),
              ...(tableChanges.updated ?? []),
            ]

            if (toUpsert.length > 0) {
              const { error } = await supabase
                .from(table)
                .upsert(toUpsert.map(mapToSupabase))
              if (error) throw error
            }

            if (tableChanges.deleted?.length > 0) {
              const { error } = await supabase
                .from(table)
                .update({ server_deleted_at: Date.now(), updated_at: Date.now() })
                .in('id', tableChanges.deleted)
              if (error) throw error
            }
          })
        )
      },
    })
  } finally {
    isSyncing = false
  }
}

// WatermelonDB uses numbers for timestamps
const mapFromSupabase = (r: any) => ({
  ...r,
  created_at: r.created_at || Date.now(),
  updated_at: r.updated_at || Date.now(),
  last_modified: r.last_modified || Date.now(),
  server_deleted_at: r.server_deleted_at || null,
})

const mapToSupabase = (r: any) => {
  const { _status, _changed, ...rest } = r
  return {
    ...rest,
    created_at: r.created_at || Date.now(),
    updated_at: Date.now(),
    last_modified: Date.now(),
  }
}
