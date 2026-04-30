import { synchronize } from '@nozbe/watermelondb/sync'
import { database } from '@/database'
import { supabase } from '@/services/supabase'
import {ToastAndroid} from 'react-native';

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
      sendCreatedAsUpdated: true,

      pullChanges: async ({ lastPulledAt }) => {
        // ✅ bigint columns — keep as ms number, no ISO conversion
        const since = lastPulledAt ?? 0
        const { data: serverTime } = await supabase.rpc('get_server_time_ms')
        
        const changes: Record<string, any> = {}

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
                .map(mapFromSupabase),
              deleted: [],
            }
          })
        )

        return { changes, timestamp: serverTime ?? Date.now() }
      },

      pushChanges: async ({ changes }) => {
        for (const table of TABLES) {
          const tableChanges = (changes as any)[table]
          if (!tableChanges) continue

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
            const now = Date.now() // ✅ bigint column expects number
            const { error } = await supabase
              .from(table)
              .update({ server_deleted_at: now, updated_at: now })
              .in('id', tableChanges.deleted)
            if (error) throw error
          }
        }
      },
    })
  } finally {
    isSyncing = false
    ToastAndroid.show('Sync complete', ToastAndroid.SHORT)
  }
}

// ✅ Supabase returns bigint as JSON strings — parse them back to numbers
// so WatermelonDB @date/@readonly fields get actual numbers
const toMs = (val: any): number | null => {
  if (val === null || val === undefined) return null
  const n = typeof val === 'string' ? parseInt(val, 10) : Number(val)
  return isNaN(n) ? null : n
}

const mapFromSupabase = (r: any) => ({
  ...r,
  created_at: toMs(r.created_at) ?? Date.now(),
  updated_at: toMs(r.updated_at) ?? Date.now(),
  last_modified: toMs(r.last_modified) ?? Date.now(),
  server_deleted_at: toMs(r.server_deleted_at), // null if not deleted
})

// WatermelonDB → Supabase: numbers go in as numbers, bigint is fine
const mapToSupabase = (r: any) => {
  const { _status, _changed, ...rest } = r
  const now = Date.now()
  return {
    ...rest,
    created_at: toMs(r.created_at) ?? now,
    updated_at: now,
    last_modified: now,
  }
}
