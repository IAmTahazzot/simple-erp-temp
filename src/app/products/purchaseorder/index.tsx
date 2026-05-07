// app/products/purchaseorder/index.tsx
import React, {useMemo, useState} from 'react'
import {
  View, Text, FlatList, TextInput, Pressable,
  ActivityIndicator, StyleSheet
} from 'react-native'
import {database} from '@/database'
import PurchaseOrder, {PurchaseOrderStatus} from '@/database/models/PurchaseOrder'
import Supplier from '@/database/models/Supplier'
import {withObservables} from '@nozbe/watermelondb/react'
import {Q} from '@nozbe/watermelondb'
import {Search as SearchIcon, ChevronRight, TrendingUp, TrendingDown} from 'lucide-react-native'
import {useRouter} from 'expo-router'

type SupplierWithOrders = {
  supplier: Supplier
  orders: PurchaseOrder[]
  totalPayable: number
  totalReceivable: number
  orderCount: number
  latestOrderDate: number
}

function SupplierRow({item, onPress}: {item: SupplierWithOrders; onPress: () => void}) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [s.row, pressed && {backgroundColor: '#f9fafb'}]}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{item.supplier.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{flex: 1, marginLeft: 12}}>
        <Text style={s.rowName}>{item.supplier.name}</Text>
        <Text style={s.rowSub}>{item.orderCount} order{item.orderCount !== 1 ? 's' : ''}</Text>
      </View>
      <View style={{alignItems: 'flex-end', gap: 4}}>
        {item.totalPayable > 0 && (
          <Text style={s.payableText}>Payable {item.totalPayable.toFixed(2)}</Text>
        )}
        {item.totalReceivable > 0 && (
          <Text style={s.receivableText}>Receivable {item.totalReceivable.toFixed(2)}</Text>
        )}
      </View>
      <ChevronRight size={18} color="#9ca3af" style={{marginLeft: 8}} />
    </Pressable>
  )
}

function PurchaseOrdersIndex({orders, suppliers}: {orders: PurchaseOrder[]; suppliers: Supplier[]}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'payable' | 'receivable'>('all')

  const supplierGroups = useMemo<SupplierWithOrders[]>(() => {
    const supplierMap = new Map<string, Supplier>()
    suppliers.forEach(s => supplierMap.set(s.id, s))

    const grouped = new Map<string, {orders: PurchaseOrder[]; totalPayable: number; totalReceivable: number; latestOrderDate: number}>()

    for (const order of orders) {
      const due = order.dueAmount ?? 0

      if (order.status === PurchaseOrderStatus.CANCELED && due === 0) continue

      const existing = grouped.get(order.supplierId) ?? {orders: [], totalPayable: 0, totalReceivable: 0, latestOrderDate: 0}
      existing.orders.push(order)

      if (due > 0) {
        existing.totalPayable += due // Account Payable (We need to pay them)
      } else if (due < 0) {
        existing.totalReceivable += Math.abs(due) // Account Receivable (They owe us)
      }

      existing.latestOrderDate = Math.max(existing.latestOrderDate, order.orderDate?.getTime() ?? 0)
      grouped.set(order.supplierId, existing)
    }

    const result: SupplierWithOrders[] = []
    grouped.forEach((data, supplierId) => {
      const supplier = supplierMap.get(supplierId)
      if (!supplier) return

      result.push({
        supplier,
        orders: data.orders,
        totalPayable: data.totalPayable,
        totalReceivable: data.totalReceivable,
        orderCount: data.orders.length,
        latestOrderDate: data.latestOrderDate,
      })
    })

    return result
  }, [orders, suppliers])

  const filtered = useMemo(() => {
    let list = supplierGroups

    if (filter === 'payable') {
      list = list.filter(g => g.totalPayable > 0)
    } else if (filter === 'receivable') {
      list = list.filter(g => g.totalReceivable > 0)
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(g => g.supplier.name.toLowerCase().includes(q))
    }

    return list.sort((a, b) => b.latestOrderDate - a.latestOrderDate)
  }, [supplierGroups, query, filter])

  const globalPayable = useMemo(() => supplierGroups.reduce((sum, g) => sum + g.totalPayable, 0), [supplierGroups])
  const globalReceivable = useMemo(() => supplierGroups.reduce((sum, g) => sum + g.totalReceivable, 0), [supplierGroups])

  return (
    <View style={{flex: 1, backgroundColor: '#f9fafb'}}>
      {(globalPayable > 0 || globalReceivable > 0) && (
        <View style={s.summaryBar}>
          {filter !== 'receivable' && globalPayable > 0 && (
            <View style={s.summaryBlock}>
              <View style={s.summaryHeader}>
                <TrendingUp size={16} color="#d71717" />
                <Text style={s.summaryText}>Total Payable</Text>
              </View>
              <Text style={s.summaryAmountPayable}>{globalPayable.toFixed(2)}</Text>
            </View>
          )}

          {filter === 'all' && globalPayable > 0 && globalReceivable > 0 && (
            <View style={s.summaryDivider} />
          )}

          {filter !== 'payable' && globalReceivable > 0 && (
            <View style={s.summaryBlock}>
              <View style={s.summaryHeader}>
                <TrendingDown size={16} color="#059669" />
                <Text style={s.summaryText}>Total Receivable</Text>
              </View>
              <Text style={s.summaryAmountReceivable}>{globalReceivable.toFixed(2)}</Text>
            </View>
          )}
        </View>
      )}

      <View style={s.tabsContainer}>
         <Pressable onPress={() => setFilter('all')} style={[s.tab, filter === 'all' && s.activeTab]}>
            <Text style={[s.tabText, filter === 'all' && s.activeTabText]}>All</Text>
         </Pressable>
         <Pressable onPress={() => setFilter('payable')} style={[s.tab, filter === 'payable' && s.activeTab]}>
            <Text style={[s.tabText, filter === 'payable' && s.activeTabText]}>Payable only</Text>
         </Pressable>
         <Pressable onPress={() => setFilter('receivable')} style={[s.tab, filter === 'receivable' && s.activeTab]}>
            <Text style={[s.tabText, filter === 'receivable' && s.activeTabText]}>Receivable only</Text>
         </Pressable>
      </View>

      <View style={s.searchBar}>
        <SearchIcon size={20} color="#8c8c8c" />
        <TextInput
          placeholder="Search suppliers..."
          placeholderTextColor="#9f9f9f"
          value={query}
          onChangeText={setQuery}
          style={{fontFamily: 'InterRegular', fontSize: 15, color: '#333', flex: 1}}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.supplier.id}
        renderItem={({item}) => (
          <SupplierRow
            item={item}
            onPress={() =>
              router.push({
                pathname: '/products/purchaseorder/supplierOrders/[supplierId]',
                params: {supplierId: item.supplier.id},
              })
            }
          />
        )}
        ListEmptyComponent={
          <Text style={s.empty}>No suppliers with orders found</Text>
        }
      />
    </View>
  )
}

function PurchaseOrdersLoader({orders, suppliers}: {orders?: PurchaseOrder[]; suppliers?: Supplier[]}) {
  if (!orders || !suppliers) return <ActivityIndicator style={{flex: 1}} size="large" />
  return <PurchaseOrdersIndex orders={orders} suppliers={suppliers} />
}

export default withObservables([], () => ({
  orders: database.collections
    .get<PurchaseOrder>('purchase_orders')
    .query(Q.where('server_deleted_at', Q.eq(null)), Q.sortBy('created_at', 'desc'))
    .observe(),
  suppliers: database.collections
    .get<Supplier>('suppliers')
    .query(Q.where('server_deleted_at', Q.eq(null)), Q.sortBy('name', 'asc'))
    .observe(),
}))(PurchaseOrdersLoader)

const s = StyleSheet.create({
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2}
  },
  summaryBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 6
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  summaryText: {fontSize: 13, fontFamily: 'InterMedium', color: '#6b7280'},
  summaryAmountPayable: {fontSize: 20, fontFamily: 'InterBold', color: '#d71717'},
  summaryAmountReceivable: {fontSize: 20, fontFamily: 'InterBold', color: '#059669'},
  summaryDivider: {width: 1, backgroundColor: '#f0f0f0', marginHorizontal: 12},
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#efefef', borderRadius: 12,
    paddingHorizontal: 12, margin: 12,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {color: '#fff', fontFamily: 'InterBold', fontSize: 17},
  rowName: {fontSize: 15, fontFamily: 'InterBold', color: '#111'},
  rowSub: {fontSize: 13, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 2},
  payableText: {fontSize: 13, fontFamily: 'InterMedium', color: '#dc2626'},
  receivableText: {fontSize: 13, fontFamily: 'InterMedium', color: '#059669'},
  empty: {textAlign: 'center', marginTop: 40, color: '#9f9f9f', fontFamily: 'InterRegular'},
  tabsContainer: {
    flexDirection: 'row', paddingHorizontal: 12, marginTop: 12, gap: 8
  },
  tab: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: '#e5e7eb'
  },
  activeTab: {backgroundColor: '#111827'},
  tabText: {fontSize: 14, fontFamily: 'InterMedium', color: '#4b5563'},
  activeTabText: {color: '#fff'}
})
