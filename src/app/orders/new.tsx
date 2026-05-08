// app/orders/new.tsx
import React, { useState, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, TextInput, FlatList,
  StyleSheet, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { withObservables } from '@nozbe/watermelondb/react'
import { Q } from '@nozbe/watermelondb'
import { database } from '@/database'
import Customer from '@/database/models/Customer'
import Product from '@/database/models/Product'
import { X, Check, Plus, Minus, Search as SearchIcon, UserPlus, ShoppingBag, CreditCard } from 'lucide-react-native'
import { createOrder } from '@/features/orders/functions'
import { useOnline } from '@/hooks/use-online'
import { useAuthStore } from '@/store/authStore'
import {formatMoney} from '@/utils/micro-functions';

// ─── Fuzzy search ─────────────────────────────────────────────────────────────
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

// ─── Cart type ────────────────────────────────────────────────────────────────
type CartItem = {
  productId: string
  productName: string
  name: string
  quantity: number
  unitPrice: number
  costPrice: number
  availableQty: number
  isLowStock: boolean
}

// ─── Product picker row ───────────────────────────────────────────────────────
const ProductPickerRow = withObservables(['product'], ({ product }: { product: Product }) => ({
  product: product.observe(),
  inventories: product.inventories.observe(),
}))(({ product, inventories, onPress }: any) => {
  const qty = inventories[0]?.quantity ?? 0
  const threshold = inventories[0]?.lowStockThreshold ?? 0
  const isLow = qty <= threshold
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.pickerRow, pressed && { backgroundColor: '#f5f5f5' }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={s.pickerName}>{product.name}</Text>
        <Text style={[s.pickerSub, { color: isLow ? '#dc2626' : '#16a34a', fontFamily: 'InterMedium' }]}>
          {qty} in stock
        </Text>
      </View>
      <Text style={s.pickerSub}>৳{product.price.toFixed(2)}</Text>
    </Pressable>
  )
})

// ─── Customer picker modal ────────────────────────────────────────────────────
function CustomerPickerModal({ visible, onClose, customers, onSelect }: {
  visible: boolean
  onClose: () => void
  customers: Customer[]
  onSelect: (c: Customer) => void
}) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    if (!query.trim()) return customers
    return customers
      .map((c) => ({ c, score: fuzzyScore(c.name, query.trim()) }))
      .filter(({ score }) => score >= 30)
      .sort((a, b) => b.score - a.score)
      .map(({ c }) => c)
  }, [customers, query])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={s.pickerHeader}>
          <Pressable onPress={onClose}><X size={22} color="#111" /></Pressable>
          <View style={s.pickerSearch}>
            <SearchIcon size={16} color="#8c8c8c" />
            <TextInput
              autoFocus
              placeholder="Search customers..."
              placeholderTextColor="#9f9f9f"
              value={query}
              onChangeText={setQuery}
              style={{ flex: 1, fontFamily: 'InterRegular', fontSize: 15, color: '#111' }}
            />
          </View>
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { onSelect(item); onClose(); setQuery('') }}
              style={({ pressed }) => [s.pickerRow, pressed && { backgroundColor: '#f5f5f5' }]}>
              <Text style={s.pickerName}>{item.name}</Text>
              {item.phone ? <Text style={s.pickerSub}>{item.phone}</Text> : null}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={s.empty}>No results found</Text>}
        />
      </View>
    </Modal>
  )
}

// ─── Product picker modal ─────────────────────────────────────────────────────
function ProductPickerModal({ visible, onClose, products, onSelect }: {
  visible: boolean
  onClose: () => void
  products: Product[]
  onSelect: (p: Product) => void
}) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    if (!query.trim()) return products
    return products
      .map((p) => ({ p, score: fuzzyScore(p.name, query.trim()) }))
      .filter(({ score }) => score >= 30)
      .sort((a, b) => b.score - a.score)
      .map(({ p }) => p)
  }, [products, query])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={s.pickerHeader}>
          <Pressable onPress={onClose}><X size={22} color="#111" /></Pressable>
          <View style={s.pickerSearch}>
            <SearchIcon size={16} color="#8c8c8c" />
            <TextInput
              autoFocus
              placeholder="Search products..."
              placeholderTextColor="#9f9f9f"
              value={query}
              onChangeText={setQuery}
              style={{ flex: 1, fontFamily: 'InterRegular', fontSize: 15, color: '#111' }}
            />
          </View>
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductPickerRow
              product={item}
              onPress={() => { onSelect(item); onClose(); setQuery('') }}
            />
          )}
          ListEmptyComponent={<Text style={s.empty}>No results found</Text>}
        />
      </View>
    </Modal>
  )
}

// ─── New Order Screen ─────────────────────────────────────────────────────────
function NewOrderScreen({ customers, products }: { customers: Customer[]; products: Product[] }) {
  const router = useRouter()
  const { isOnline } = useOnline()
  const { user, isLoading } = useAuthStore()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat')
  const [discountValue, setDiscountValue] = useState(0)
  const [discountInput, setDiscountInput] = useState('')
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const discountAmount = discountType === 'percent'
    ? subtotal * (discountValue / 100)
    : Math.min(discountValue, subtotal)
  const total = Math.max(0, subtotal - discountAmount)

  const addProduct = useCallback((product: Product) => {
    product.inventories.fetch().then((invs) => {
      const qty = invs[0]?.quantity ?? 0
      const threshold = invs[0]?.lowStockThreshold ?? 0
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === product.id)
        if (existing) {
          return prev.map((i) =>
            i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        }
        return [...prev, {
          productId: product.id,
          name: product.name,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          costPrice: product.cost,
          availableQty: qty,
          isLowStock: qty <= threshold,
        }]
      })
    })
  }, [])

  const changeQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => i.productId === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0)
    )
  }

  const handleSave = async (payImmediately: boolean) => {
    if (!customer) { Alert.alert('Select a customer first'); return }
    if (cart.length === 0) { Alert.alert('Add at least one product'); return }
    if (!user?.id) { Alert.alert('Not logged in'); return }
    setSaving(true)
    try {
      const order = await createOrder({
        customerId: customer.id,
        lines: cart,
        discountType,
        discountValue,
        totalAmount: total,
        isOnline,
        userId: user.id,
        payImmediately,
      })
      router.replace({ pathname: '/orders/[id]', params: { id: order.id } })
    } catch (e) {
      Alert.alert('Failed to create order')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>

        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.headerBtn}>
            <X size={20} color="#111" />
          </Pressable>
          <Text style={s.headerTitle}>New Order</Text>
          <Pressable onPress={() => handleSave(false)} style={s.headerBtn} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" />
              : <Check size={20} color="#111" />}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 150 }}>

          {/* Customer */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Customer</Text>
            {customer ? (
              <Pressable style={s.selectedRow} onPress={() => setShowCustomerPicker(true)}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={s.selectedName}>{customer.name}</Text>
              </Pressable>
            ) : (
              <Pressable style={s.addRow} onPress={() => setShowCustomerPicker(true)}>
                <UserPlus size={18} color="#111" />
                <Text style={s.addRowText}>Add customer</Text>
              </Pressable>
            )}
          </View>

          <View style={s.divider} />

          {/* Products / Cart */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Products</Text>

            {cart.map((item) => (
              <View key={item.productId} style={s.cartRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cartName}>{item.name}</Text>
                  <Text style={s.cartPrice}>৳{item.unitPrice.toFixed(2)} each</Text>
                  <Text style={[s.cartPrice, { color: item.isLowStock ? '#dc2626' : '#16a34a' }]}>
                    {item.availableQty} available
                  </Text>
                </View>
                <View style={s.qtyRow}>
                  <Pressable hitSlop={10} onPress={() => changeQty(item.productId, -1)} style={s.qtyBtn}>
                    <Minus size={20} color="#111" />
                  </Pressable>
                  <Text style={s.qtyText}>{item.quantity}</Text>
                  <Pressable hitSlop={10} onPress={() => changeQty(item.productId, 1)} style={s.qtyBtn}>
                    <Plus size={20} color="#111" />
                  </Pressable>
                </View>
                <Text style={s.cartTotal}>{formatMoney((item.unitPrice * item.quantity).toFixed(2))}</Text>
              </View>
            ))}

            <Pressable style={s.addProductBtn} onPress={() => setShowProductPicker(true)}>
              <ShoppingBag size={16} color="#fff" />
              <Text style={s.addProductBtnText}>Add products</Text>
            </Pressable>
          </View>

          <View style={s.divider} />

          {/* Payment summary */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Payment</Text>

            <View style={s.payLine}>
              <Text style={s.payKey}>Subtotal</Text>
              <Text style={s.payVal}>{formatMoney(subtotal.toFixed(2))}</Text>
            </View>

            <View style={s.payLine}>
              <View style={{ flex: 1 }}>
                <Text style={s.payKey}>Discount</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <Pressable
                    onPress={() => setDiscountType('flat')}
                    style={[s.discountTab, discountType === 'flat' && s.discountTabActive]}>
                    <Text style={[s.discountTabText, discountType === 'flat' && { color: '#fff' }]}>৳ Flat</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setDiscountType('percent')}
                    style={[s.discountTab, discountType === 'percent' && s.discountTabActive]}>
                    <Text style={[s.discountTabText, discountType === 'percent' && { color: '#fff' }]}>% Off</Text>
                  </Pressable>
                  <TextInput
                    style={s.discountInput}
                    value={discountInput}
                    placeholder="0"
                    placeholderTextColor="#aaa"
                    inputMode="numeric"
                    onChangeText={(v) => {
                      setDiscountInput(v)
                      setDiscountValue(parseFloat(v) || 0)
                    }}
                  />
                </View>
              </View>
              <Text style={s.payVal}>(-) {formatMoney(discountAmount.toFixed(2))}</Text>
            </View>

            <View style={[s.payLine, { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12, marginTop: 4 }]}>
              <Text style={[s.payKey, { fontFamily: 'InterBold', fontSize: 16 }]}>Total</Text>
              <Text style={[s.payVal, { fontFamily: 'InterBold', fontSize: 16 }]}>{formatMoney(total.toFixed(2))}</Text>
            </View>
          </View>

        </ScrollView>

        {/* Bottom actions */}
        <View style={s.bottomBar}>
          <Pressable
            style={[s.bottomBtn, s.bottomBtnOutline]}
            onPress={() => handleSave(false)}
            disabled={saving}>
            <Check size={16} color="#111" />
            <Text style={[s.bottomBtnText, { color: '#111' }]}>Save Order</Text>
          </Pressable>
          <Pressable
            style={[s.bottomBtn, s.bottomBtnFill]}
            onPress={() => handleSave(true)}
            disabled={saving}>
            <CreditCard size={16} color="#fff" />
            <Text style={[s.bottomBtnText, { color: '#fff' }]}>Pay Immediately</Text>
          </Pressable>
        </View>

        <CustomerPickerModal
          visible={showCustomerPicker}
          onClose={() => setShowCustomerPicker(false)}
          customers={customers}
          onSelect={setCustomer}
        />

        <ProductPickerModal
          visible={showProductPicker}
          onClose={() => setShowProductPicker(false)}
          products={products}
          onSelect={addProduct}
        />

      </View>
    </KeyboardAvoidingView>
  )
}

export default withObservables([], () => ({
  customers: database.collections.get<Customer>('customers')
    .query(Q.where('server_deleted_at', Q.eq(null)), Q.sortBy('name', 'asc')).observe(),
  products: database.collections.get<Product>('products')
    .query(Q.where('server_deleted_at', Q.eq(null)), Q.sortBy('name', 'asc')).observe(),
}))(NewOrderScreen)

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    paddingTop: 16, paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: 'InterBold', color: '#111' },
  section: { paddingHorizontal: 16, paddingVertical: 16 },
  sectionTitle: { fontSize: 13, fontFamily: 'InterMedium', color: '#9ca3af', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  divider: { height: 8, backgroundColor: '#f5f5f5' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addRowText: { fontSize: 15, fontFamily: 'InterMedium', color: '#111' },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: 'InterBold', fontSize: 15 },
  selectedName: { fontSize: 15, fontFamily: 'InterMedium', color: '#111' },
  cartRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  cartName: { fontSize: 15, fontFamily: 'InterMedium', color: '#111' },
  cartPrice: { fontSize: 12, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 2 },
  cartTotal: { fontSize: 15, fontFamily: 'InterBold', color: '#111', minWidth: 70, textAlign: 'right' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 15, fontFamily: 'InterBold', minWidth: 20, textAlign: 'center' },
  addProductBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, marginTop: 12, alignSelf: 'flex-start' },
  addProductBtnText: { color: '#fff', fontFamily: 'InterBold', fontSize: 14 },
  payLine: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 8 },
  payKey: { fontSize: 15, fontFamily: 'InterRegular', color: '#111' },
  payVal: { fontSize: 15, fontFamily: 'InterMedium', color: '#111' },
  discountTab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  discountTabActive: { backgroundColor: '#111827', borderColor: '#111827' },
  discountTabText: { fontSize: 13, fontFamily: 'InterMedium', color: '#374151' },
  discountInput: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', minWidth: 50, fontSize: 14, fontFamily: 'InterMedium', color: '#111', paddingVertical: 2, textAlign: 'center' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 90,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  bottomBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 10 },
  bottomBtnOutline: { borderWidth: 1, borderColor: '#e5e7eb' },
  bottomBtnFill: { backgroundColor: '#111827' },
  bottomBtnText: { fontSize: 14, fontFamily: 'InterBold' },
  pickerHeader: { paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerSearch: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  pickerRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  pickerName: { fontSize: 15, fontFamily: 'InterMedium', color: '#111' },
  pickerSub: { fontSize: 13, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40, color: '#9f9f9f', fontFamily: 'InterRegular' },
})
