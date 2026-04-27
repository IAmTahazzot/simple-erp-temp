// app/orders/index.tsx
import React, {useCallback, useMemo, useState} from 'react'
import {View, Text, FlatList, TextInput, Pressable, ActivityIndicator, StyleSheet} from 'react-native'
import {database} from '@/database'
import Order from '@/database/models/Order'
import {withObservables} from '@nozbe/watermelondb/react'
import {Q} from '@nozbe/watermelondb'
import {Search as SearchIcon} from 'lucide-react-native'
import {useRouter} from 'expo-router'

function fuzzyScore(name: string, query: string): number {
    if (!query) return 100
    const n = name.toLowerCase(), q = query.toLowerCase()
    if (n === q) return 100
    if (n.startsWith(q)) return 90
    if (n.includes(q)) return 80
    let qi = 0
    for (let i = 0; i < n.length && qi < q.length; i++) if (n[i] === q[qi]) qi++
    return qi === q.length ? 50 : 0
}

const STATUS_COLORS: Record<string, {bg: string; text: string}> = {
    pending:   {bg: '#fef3c7', text: '#92400e'},
    partial:   {bg: '#dbeafe', text: '#1e40af'},
    paid:      {bg: '#d1fae5', text: '#065f46'},
    cancelled: {bg: '#fee2e2', text: '#991b1b'},
}

// Each order item needs customer name — we enhance with withObservables
const OrderItemRow = withObservables(['order'], ({order}: {order: Order}) => ({
    order: order.observe(),
    customer: order.customer.observe(),
}))(({order, customer, onPress}: any) => {
    const colors = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending
    return (
      <Pressable
        onPress={onPress}
        style={({pressed}) => [s.row, pressed && {backgroundColor: '#f9fafb'}]}>
          <View style={{flex: 1}}>
              <Text style={s.rowName}>{customer?.name ?? '—'}</Text>
              <Text style={s.rowDate}>{new Date(order.orderDate).toLocaleDateString()}</Text>
          </View>
          <View style={{alignItems: 'flex-end', gap: 6}}>
              <Text style={s.rowAmount}>৳{order.totalAmount.toFixed(2)}</Text>
              <View style={[s.badge, {backgroundColor: colors.bg}]}>
                  <Text style={[s.badgeText, {color: colors.text}]}>{order.status}</Text>
              </View>
          </View>
      </Pressable>
    )
})

function Orders({orders}: {orders: Order[]}) {
    const router = useRouter()
    const [query, setQuery] = useState('')

    // We search by order id as proxy — customer name search requires denormalized data
    // so we filter by status keyword or date string for simplicity
    const filtered = useMemo(() => {
        if (!query.trim()) return orders
        const q = query.trim().toLowerCase()
        return orders.filter((o) =>
          o.status.includes(q) ||
          new Date(o.orderDate).toLocaleDateString().includes(q) ||
          o.totalAmount.toString().includes(q)
        )
    }, [orders, query])

    const renderItem = useCallback(({item}: {item: Order}) => (
      <OrderItemRow
        order={item}
        onPress={() => router.push({pathname: '/orders/[id]', params: {id: item.id}})}
      />
    ), [])

    return (
      <View style={{flex: 1}}>
          <View style={s.searchBar}>
              <SearchIcon size={20} color={'#8c8c8c'}/>
              <TextInput
                placeholder={'Search by status, date, amount...'}
                placeholderTextColor={'#9f9f9f'}
                value={query}
                onChangeText={setQuery}
                style={{fontFamily: 'InterRegular', fontSize: 15, color: '#333', flex: 1}}
              />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            windowSize={5}
            maxToRenderPerBatch={10}
            initialNumToRender={15}
            removeClippedSubviews={true}
            ListEmptyComponent={
                <Text style={s.empty}>No orders found</Text>
            }
          />
      </View>
    )
}

function OrdersLoader({orders}: {orders?: Order[]}) {
    if (!orders) return <ActivityIndicator style={{flex: 1}} size={'large'}/>
    return <Orders orders={orders}/>
}

export default withObservables([], () => ({
    orders: database.collections
      .get<Order>('orders')
      .query(Q.where('server_deleted_at', Q.eq(null)), Q.sortBy('created_at', 'desc'))
      .observe(),
}))(OrdersLoader)

const s = StyleSheet.create({
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#efefef', borderRadius: 12, paddingHorizontal: 12, margin: 12,
    },
    row: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    rowName: {fontSize: 15, fontFamily: 'InterBold', color: '#111'},
    rowDate: {fontSize: 13, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 2},
    rowAmount: {fontSize: 15, fontFamily: 'InterBold', color: '#111'},
    badge: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20},
    badgeText: {fontSize: 12, fontFamily: 'InterMedium', textTransform: 'capitalize'},
    empty: {textAlign: 'center', marginTop: 40, color: '#9f9f9f', fontFamily: 'InterRegular'},
})
