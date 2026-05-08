// app/orders/[customerId].tsx
import React, { useMemo, useState } from 'react'
import {
  View, Text, FlatList, TextInput, Pressable,
  ActivityIndicator, StyleSheet, ScrollView
} from 'react-native'
import { database } from '@/database'
import Order, { OrderStatus } from '@/database/models/Order'
import Customer from '@/database/models/Customer'
import { withObservables } from '@nozbe/watermelondb/react'
import { Q } from '@nozbe/watermelondb'
import { Search as SearchIcon, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import {formatMoney} from '@/utils/micro-functions';

// ─── Types ────────────────────────────────────────────────────────────────────
type CustomerWithOrders = {
  customer: Customer
  orders: Order[]
  totalDue: number
  totalPayback: number
  orderCount: number
  latestOrderDate: number
}

// ─── Customer row ─────────────────────────────────────────────────────────────
function CustomerRow({ item, onPress }: { item: CustomerWithOrders; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && { backgroundColor: '#f9fafb' }]}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{item.customer.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.rowName}>{item.customer.name}</Text>
        <Text style={s.rowSub}>{item.orderCount} order{item.orderCount !== 1 ? 's' : ''}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {item.totalDue > 0 && (
          <Text style={s.dueText}>Due {formatMoney(item.totalDue.toFixed(2))}</Text>
        )}
        {item.totalPayback > 0 && (
          <Text style={s.paybackText}>Pay Back {formatMoney(item.totalPayback.toFixed(2))}</Text>
        )}
      </View>
      <ChevronRight size={18} color="#9ca3af" style={{ marginLeft: 8 }} />
    </Pressable>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
function OrdersIndex({ orders, customers }: { orders: Order[]; customers: Customer[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'due' | 'payback'>('all')

  // Group orders by customer
  const customerGroups = useMemo<CustomerWithOrders[]>(() => {
    const customerMap = new Map<string, Customer>()
    customers.forEach(c => customerMap.set(c.id, c))

    const grouped = new Map<string, { orders: Order[]; totalDue: number; totalPayback: number; latestOrderDate: number }>()

    for (const order of orders) {
      const due = order.dueAmount ?? 0

      // Only skip canceled orders IF they have a 0 balance.
      // If a canceled order still has an outstanding due/payback, we must include it.
      if (order.status === OrderStatus.CANCELED && due === 0) continue

      const existing = grouped.get(order.customerId) ?? { orders: [], totalDue: 0, totalPayback: 0, latestOrderDate: 0 }
      existing.orders.push(order)
      
      if (due > 0) {
        existing.totalDue += due
      } else if (due < 0) {
        existing.totalPayback += Math.abs(due)
      }
      
      existing.latestOrderDate = Math.max(existing.latestOrderDate, order.orderDate?.getTime() ?? 0)
      grouped.set(order.customerId, existing)
    }

    const result: CustomerWithOrders[] = []
    grouped.forEach((data, customerId) => {
      const customer = customerMap.get(customerId)
      if (!customer) return
      
      result.push({
        customer,
        orders: data.orders,
        totalDue: data.totalDue,
        totalPayback: data.totalPayback,
        orderCount: data.orders.length,
        latestOrderDate: data.latestOrderDate,
      })
    })

    return result
  }, [orders, customers])

  // Filter and sort
  const filtered = useMemo(() => {
    let list = customerGroups

    if (filter === 'due') {
      list = list.filter(g => g.totalDue > 0)
    } else if (filter === 'payback') {
      list = list.filter(g => g.totalPayback > 0)
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(g => g.customer.name.toLowerCase().includes(q))
    }

    return list.sort((a, b) => b.latestOrderDate - a.latestOrderDate)
  }, [customerGroups, query, filter])

  const globalDue = useMemo(() => customerGroups.reduce((sum, g) => sum + g.totalDue, 0), [customerGroups])
  const globalPayback = useMemo(() => customerGroups.reduce((sum, g) => sum + g.totalPayback, 0), [customerGroups])

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Summary bar */}
      {(globalDue > 0 || globalPayback > 0) && (
        <View style={s.summaryBar}>
          {filter !== 'payback' && globalDue > 0 && (
            <View style={s.summaryBlock}>
              <View style={s.summaryHeader}>
                <TrendingUp size={16} color="#d71717" />
                <Text style={s.summaryText}>Total Due</Text>
              </View>
              <Text style={s.summaryAmountDue}>{formatMoney(globalDue.toFixed(2))}</Text>
            </View>
          )}

          {filter === 'all' && globalDue > 0 && globalPayback > 0 && (
            <View style={s.summaryDivider} />
          )}

          {filter !== 'due' && globalPayback > 0 && (
            <View style={s.summaryBlock}>
              <View style={s.summaryHeader}>
                <TrendingDown size={16} color="#059669" />
                <Text style={s.summaryText}>Total Pay Back</Text>
              </View>
              <Text style={s.summaryAmountPayback}>{formatMoney(globalPayback.toFixed(2))}</Text>
            </View>
          )}
        </View>
      )}

      {/* Tabs */}
      <View style={s.tabsContainer}>
         <Pressable onPress={() => setFilter('all')} style={[s.tab, filter === 'all' && s.activeTab]}>
            <Text style={[s.tabText, filter === 'all' && s.activeTabText]}>All</Text>
         </Pressable>
         <Pressable onPress={() => setFilter('due')} style={[s.tab, filter === 'due' && s.activeTab]}>
            <Text style={[s.tabText, filter === 'due' && s.activeTabText]}>Due Only</Text>
         </Pressable>
         <Pressable onPress={() => setFilter('payback')} style={[s.tab, filter === 'payback' && s.activeTab]}>
            <Text style={[s.tabText, filter === 'payback' && s.activeTabText]}>Pay Back Only</Text>
         </Pressable>
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <SearchIcon size={20} color="#8c8c8c" />
        <TextInput
          placeholder="Search customers..."
          placeholderTextColor="#9f9f9f"
          value={query}
          onChangeText={setQuery}
          style={{ fontFamily: 'InterRegular', fontSize: 15, color: '#333', flex: 1 }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.customer.id}
        renderItem={({ item }) => (
          <CustomerRow
            item={item}
            onPress={() =>
              router.push({
                pathname: '/orders/customerOrders/[customerId]',
                params: { customerId: item.customer.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          <Text style={s.empty}>No customers with orders found</Text>
        }
      />
    </View>
  )
}

function OrdersLoader({ orders, customers }: { orders?: Order[]; customers?: Customer[] }) {
  if (!orders || !customers) return <ActivityIndicator style={{ flex: 1 }} size="large" />
  return <OrdersIndex orders={orders} customers={customers} />
}

export default withObservables([], () => ({
  orders: database.collections
    .get<Order>('orders')
    .query(Q.where('server_deleted_at', Q.eq(null)), Q.sortBy('created_at', 'desc'))
    .observe(),
  customers: database.collections
    .get<Customer>('customers')
    .query(Q.where('server_deleted_at', Q.eq(null)), Q.sortBy('name', 'asc'))
    .observe(),
}))(OrdersLoader)

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
    shadowOffset: { width: 0, height: 2 }
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
  summaryText: { fontSize: 13, fontFamily: 'InterMedium', color: '#6b7280' },
  summaryAmountDue: { fontSize: 20, fontFamily: 'InterBold', color: '#d71717' },
  summaryAmountPayback: { fontSize: 20, fontFamily: 'InterBold', color: '#059669' },
  summaryDivider: { width: 1, backgroundColor: '#f0f0f0', marginHorizontal: 12 },
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
  avatarText: { color: '#fff', fontFamily: 'InterBold', fontSize: 17 },
  rowName: { fontSize: 15, fontFamily: 'InterBold', color: '#111' },
  rowSub: { fontSize: 13, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 2 },
  dueText: { fontSize: 13, fontFamily: 'InterMedium', color: '#dc2626' },
  paybackText: { fontSize: 13, fontFamily: 'InterMedium', color: '#059669' },
  empty: { textAlign: 'center', marginTop: 40, color: '#9f9f9f', fontFamily: 'InterRegular' },
  tabsContainer: {
    flexDirection: 'row', paddingHorizontal: 12, marginTop: 12, gap: 8
  },
  tab: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: '#e5e7eb'
  },
  activeTab: { backgroundColor: '#111827' },
  tabText: { fontSize: 14, fontFamily: 'InterMedium', color: '#4b5563' },
  activeTabText: { color: '#fff' }
})
