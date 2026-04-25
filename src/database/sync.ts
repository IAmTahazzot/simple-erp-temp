import { synchronize } from '@nozbe/watermelondb/sync'
import { database } from '@/database'
import { supabase } from '@/services/supabase'

// Every table you want synced
const TABLES = [
  'users', 'customers', 'suppliers', 'products', 'product_images',
  'inventory', 'orders', 'order_items', 'purchase_orders',
  'purchase_order_items', 'payments',
]

export const sync = async () => {
  await synchronize({
    database,

    pullChanges: async ({ lastPulledAt }) => {
      const since = lastPulledAt
        ? new Date(lastPulledAt).toISOString()
        : new Date(0).toISOString()

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
              .update({ server_deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
              .in('id', tableChanges.deleted)
            if (error) throw error
          }
        })
      )
    },
  })
}

// WatermelonDB uses numbers for timestamps, Supabase uses ISO strings
const mapFromSupabase = (r: any) => ({
  ...r,
  created_at: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  updated_at: r.updated_at ? new Date(r.updated_at).getTime() : Date.now(),
  last_modified: r.last_modified ? new Date(r.last_modified).getTime() : Date.now(),
  server_deleted_at: r.server_deleted_at
    ? new Date(r.server_deleted_at).getTime()
    : undefined,
})

const mapToSupabase = (r: any) => ({
  ...r,
  created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_modified: new Date().toISOString(),
})
