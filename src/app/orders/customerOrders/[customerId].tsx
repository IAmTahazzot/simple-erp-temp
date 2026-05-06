// app/orders/customerOrders/[customerId]/[customerId].tsx
import React, { useMemo } from 'react'
import {
  View, Text, FlatList, Pressable,
  ActivityIndicator, StyleSheet,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { withObservables } from '@nozbe/watermelondb/react'
import { Q } from '@nozbe/watermelondb'
import { database } from '@/database'
import Order, { OrderStatus, PaymentStatus } from '@/database/models/Order'
import Customer from '@/database/models/Customer'
import { ArrowLeft, ChevronRight } from 'lucide-react-native'

// ─── Status badge colors ──────────────────────────────────────────────────────
const PAYMENT_COLORS: Record<string, { bg: string; text: string }> = {
  unpaid: { bg: '#fef3c7', text: '#92400e' },
  partially_paid: { bg: '#dbeafe', text: '#1e40af' },
  paid: { bg: '#d1fae5', text: '#065f46' },
  refunded: { bg: '#fee2e2', text: '#991b1b' },
  partially_refunded: { bg: '#fce7f3', text: '#9d174d' },
}

// ─── Order row ────────────────────────────────────────────────────────────────
function OrderRow({ order, onPress }: { order: Order; onPress: () => void }) {
  const isCanceled = order.status === OrderStatus.CANCELED
  const colors = isCanceled 
    ? { bg: '#f3f4f6', text: '#4b5563' } // Gray for canceled
    : (PAYMENT_COLORS[order.paymentStatus] ?? PAYMENT_COLORS.unpaid)
  const due = order.dueAmount ?? 0

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && { backgroundColor: '#f9fafb' }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowDate}>
          {new Date(order.orderDate).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
          })}
        </Text>
        {due > 0 && (
          <Text style={s.rowDue}>Due ৳{due.toFixed(2)}</Text>
        )}
        {due < 0 && (
          <Text style={[s.rowDue, { color: '#065f46' }]}>Customer owed ৳{Math.abs(due).toFixed(2)}</Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={s.rowAmount}>৳{order.totalAmount.toFixed(2)}</Text>
        <View style={[s.badge, { backgroundColor: colors.bg }]}>
          <Text style={[s.badgeText, { color: colors.text }]}>
            {isCanceled ? 'canceled' : order.paymentStatus.replace('_', ' ')}
          </Text>
        </View>
      </View>
      <ChevronRight size={16} color="#9ca3af" style={{ marginLeft: 8 }} />
    </Pressable>
  )
}

// ─── Customer Orders Screen ───────────────────────────────────────────────────
function CustomerOrdersScreen({ customer, orders }: { customer: Customer; orders: Order[] }) {
  const router = useRouter()

  const { totalDue, totalProfit, activeOrders } = useMemo(() => {
    let totalDue = 0
    let totalProfit = 0
    let activeOrders = 0
    for (const o of orders) {
      totalDue += o.dueAmount ?? 0
      totalProfit += o.profitAmount ?? 0
      if (o.status === OrderStatus.ACTIVE) activeOrders++
    }
    return { totalDue, totalProfit, activeOrders }
  }, [orders])

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={22} color="#111" />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>{customer.name}</Text>
          <Text style={s.headerSub}>{orders.length} order{orders.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      <View style={s.summaryRow}>
        <View style={[s.summaryCard, { backgroundColor: totalDue > 0 ? '#fee2e2' : '#d1fae5' }]}>
          <Text style={[s.summaryLabel, { color: totalDue > 0 ? '#a60000' : '#000'}]}>Total Due</Text>
          <Text style={[s.summaryValue, { color: totalDue > 0 ? '#991b1b' : '#065f46' }]}>
            ৳{Math.abs(totalDue).toFixed(2)}
          </Text>
        </View>
        <View style={[s.summaryCard, { backgroundColor: '#a6ffca' }]}>
          <Text style={[s.summaryLabel, { color: '#006e23'}]}>Total Profit</Text>
          <Text style={[s.summaryValue, { color: totalProfit >= 0 ? '#065f46' : '#991b1b' }]}>
            ৳{totalProfit.toFixed(2)}
          </Text>
        </View>
        <View style={[s.summaryCard, { backgroundColor: '#d3e8ff' }]}>
          <Text style={[s.summaryLabel, { color: '#0858b2'}]}>Active</Text>
          <Text style={[s.summaryValue, { color: '#1e40af' }]}>{activeOrders}</Text>
        </View>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderRow
            order={item}
            onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={<Text style={s.empty}>No orders found</Text>}
      />
    </View>
  )
}

function CustomerOrdersLoader({ customer, orders }: { customer?: Customer; orders?: Order[] }) {
  if (!customer || !orders) return <ActivityIndicator style={{ flex: 1 }} size="large" />
  return <CustomerOrdersScreen customer={customer} orders={orders} />
}

export default function CustomerOrdersPage() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>()

  const Enhanced = withObservables(['customerId'], ({ customerId }: { customerId: string }) => ({
    customer: database.get<Customer>('customers').findAndObserve(customerId),
    orders: database.get<Order>('orders')
      .query(
        Q.where('customer_id', customerId),
        Q.where('server_deleted_at', Q.eq(null)),
        Q.sortBy('created_at', 'desc'),
      )
      .observe(),
  }))(CustomerOrdersLoader)

  return <Enhanced customerId={customerId} />
}

const s = StyleSheet.create({
  header: {
    paddingTop: 12, paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 17, fontFamily: 'InterBold', color: '#111' },
  headerSub: { fontSize: 13, fontFamily: 'InterRegular', color: '#6b7280', marginTop: 2 },
  summaryRow: {
    flexDirection: 'row', gap: 8, padding: 12,
  },
  summaryCard: {
    flex: 1, borderRadius: 10, padding: 12,
  },
  summaryLabel: { fontSize: 12, fontFamily: 'InterMedium', color: '#6b7280', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontFamily: 'InterBold' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  rowDate: { fontSize: 14, fontFamily: 'InterMedium', color: '#111' },
  rowDue: { fontSize: 12, fontFamily: 'InterMedium', color: '#dc2626', marginTop: 3 },
  rowAmount: { fontSize: 15, fontFamily: 'InterBold', color: '#111' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: 'InterMedium', textTransform: 'capitalize' },
  empty: { textAlign: 'center', marginTop: 40, color: '#9f9f9f', fontFamily: 'InterRegular' },
})
