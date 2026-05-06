// app/orders/[customerId].tsx
import React, { useMemo, useState } from 'react'
import {
  View, Text, FlatList, TextInput, Pressable,
  ActivityIndicator, StyleSheet,
} from 'react-native'
import { database } from '@/database'
import Order from '@/database/models/Order'
import Customer from '@/database/models/Customer'
import { withObservables } from '@nozbe/watermelondb/react'
import { Q } from '@nozbe/watermelondb'
import { Search as SearchIcon, ChevronRight } from 'lucide-react-native'
import { useRouter } from 'expo-router'

// ─── Types ────────────────────────────────────────────────────────────────────
type CustomerWithOrders = {
  customer: Customer
  orders: Order[]
  totalDue: number
  orderCount: number
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
        {/*{item.totalDue > 0 && (*/}
        {/*  <Text style={s.dueText}>Due ৳{item.totalDue.toFixed(2)}</Text>*/}
        {/*)}*/}
      </View>
      <ChevronRight size={18} color="#9ca3af" style={{ marginLeft: 8 }} />
    </Pressable>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
function OrdersIndex({ orders, customers }: { orders: Order[]; customers: Customer[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  // Group orders by customer
  const customerGroups = useMemo<CustomerWithOrders[]>(() => {
    const customerMap = new Map<string, Customer>()
    customers.forEach(c => customerMap.set(c.id, c))

    const grouped = new Map<string, { orders: Order[]; totalDue: number }>()

    for (const order of orders) {
      const existing = grouped.get(order.customerId) ?? { orders: [], totalDue: 0 }
      existing.orders.push(order)
      existing.totalDue += Math.max(0, order.dueAmount ?? 0)
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
        orderCount: data.orders.length,
      })
    })

    // Sort by most due first, then alphabetically
    return result.sort((a, b) => b.totalDue - a.totalDue || a.customer.name.localeCompare(b.customer.name))
  }, [orders, customers])

  // Filter by customer name
  const filtered = useMemo(() => {
    if (!query.trim()) return customerGroups
    const q = query.trim().toLowerCase()
    return customerGroups.filter(g =>
      g.customer.name.toLowerCase().includes(q)
    )
  }, [customerGroups, query])

  const totalDueAll = useMemo(() => customerGroups.reduce((sum, g) => sum + g.totalDue, 0), [customerGroups])

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Summary bar */}
      {totalDueAll > 0 && (
        <View style={s.summaryBar}>
          <Text style={s.summaryText}>Total Due Across All Orders</Text>
          <Text style={s.summaryAmount}>৳{totalDueAll.toFixed(2)}</Text>
        </View>
      )}

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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12 
  },
  summaryText: { fontSize: 13, fontFamily: 'InterRegular', color: '#2f2f2f' },
  summaryAmount: { fontSize: 20, fontFamily: 'InterBold', color: '#d71717', borderWidth: 1, padding: 2, borderColor: '#ff5a5a' , borderRadius: 6},
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
  empty: { textAlign: 'center', marginTop: 40, color: '#9f9f9f', fontFamily: 'InterRegular' },
})
