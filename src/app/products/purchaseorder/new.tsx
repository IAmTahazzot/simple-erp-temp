// app/purchase_orders/new.tsx
import React, {useState, useMemo, useCallback} from 'react'
import {
  View, Text, ScrollView, Pressable, TextInput, FlatList,
  StyleSheet, Modal, ActivityIndicator, Alert,
  KeyboardAvoidingView
} from 'react-native'
import {useRouter} from 'expo-router'
import {withObservables} from '@nozbe/watermelondb/react'
import {Q} from '@nozbe/watermelondb'
import {database} from '@/database'
import Supplier from '@/database/models/Supplier'
import Product from '@/database/models/Product'
import {X, Check, Search as SearchIcon, ShoppingBag, Building2} from 'lucide-react-native'
import {MegaInput} from '@/components/ui/Input'
import {createPurchaseOrder, PurchaseOrderLine} from '@/features/purchase/functions'
import {useOnline} from '@/hooks/use-online'
import {useAuthStore} from '@/store/authStore'

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

// ─── Picker Modal ─────────────────────────────────────────────────────────────
function PickerModal<T extends {id: string; name: string}>({
                                                             visible, onClose, items, onSelect, placeholder, renderSub,
                                                           }: {
  visible: boolean
  onClose: () => void
  items: T[]
  onSelect: (item: T) => void
  placeholder: string
  renderSub?: (item: T) => string | undefined
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return items
    return items
      .map((i) => ({i, score: fuzzyScore(i.name, query.trim())}))
      .filter(({score}) => score >= 30)
      .sort((a, b) => b.score - a.score)
      .map(({i}) => i)
  }, [items, query])

  return (
    <Modal visible={visible} animationType={'slide'} onRequestClose={onClose}>
      <View style={{flex: 1, backgroundColor: '#fff'}}>
        <View style={s.pickerHeader}>
          <Pressable onPress={onClose}><X size={22} color="#111"/></Pressable>
          <View style={s.pickerSearch}>
            <SearchIcon size={16} color="#8c8c8c"/>
            <TextInput
              autoFocus
              placeholder={placeholder}
              placeholderTextColor="#9f9f9f"
              value={query}
              onChangeText={setQuery}
              style={{flex: 1, fontFamily: 'InterRegular', fontSize: 15, color: '#111'}}
            />
          </View>
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({item}) => (
            <Pressable
              onPress={() => { onSelect(item); onClose(); setQuery('') }}
              style={({pressed}) => [s.pickerRow, pressed && {backgroundColor: '#f5f5f5'}]}>
              <Text style={s.pickerName}>{item.name}</Text>
              {renderSub?.(item)
                ? <Text style={s.pickerSub}>{renderSub(item)}</Text>
                : null}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={s.empty}>No results found</Text>}
        />
      </View>
    </Modal>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────
type CartItem = {
  productId: string
  productName: string
  name: string
  quantity: string  // string so MegaInput can hold partial/empty input
  unitCost: string  // cost, not selling price — pre-filled from product.cost
}

function NewPurchaseOrderScreen({suppliers, products}: { suppliers: Supplier[]; products: Product[] }) {
  const router = useRouter()
  const {isOnline} = useOnline()
  const user = useAuthStore((s) => s.user)

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat')
  const [discountValue, setDiscountValue] = useState(0)
  const [showSupplierPicker, setShowSupplierPicker] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  const subtotal = cart.reduce((sum, i) => {
    const qty = parseInt(i.quantity) || 0
    const cost = parseFloat(i.unitCost) || 0
    return sum + qty * cost
  }, 0)
  const discountAmount = discountType === 'percent' ? subtotal * (discountValue / 100) : discountValue
  const total = Math.max(0, subtotal - discountAmount)

  // Use product.cost (current avg cost) floored, not selling price
  const addProduct = useCallback((product: Product) => {
    setCart((prev) => {
      if (prev.find((i) => i.productId === product.id)) return prev // already in cart
      return [...prev, {
        productId: product.id,
        productName: product.name,
        name: product.name,
        quantity: '1',
        unitCost: Math.floor(product.cost ?? 0).toString(),
      }]
    })
  }, [])

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  const updateCartItem = (productId: string, field: 'quantity' | 'unitCost', value: string) => {
    setCart((prev) => prev.map((i) => i.productId === productId ? {...i, [field]: value} : i))
  }

  const handleSave = async () => {
    if (!supplier) { Alert.alert('Select a supplier first'); return }
    if (cart.length === 0) { Alert.alert('Add at least one product'); return }
    if (!user?.id) { Alert.alert('Not logged in'); return }
    setSaving(true)
    try {
      await createPurchaseOrder({
        supplierId: supplier.id,
        lines: cart.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: Math.max(1, parseInt(i.quantity) || 1),
          unitPrice: Math.max(0, parseFloat(i.unitCost) || 0), // unitPrice field = purchase cost
        })),
        discountType,
        discountValue,
        totalAmount: total,
        isOnline,
        userId: user.id,
        payImmediately: false
      })
      router.back()
    } catch {
      Alert.alert('Failed to create purchase order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{flex: 1, backgroundColor: '#fff'}}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.headerBtn}><X size={20} color="#111"/></Pressable>
        <Text style={s.headerTitle}>New Purchase Order</Text>
        <Pressable onPress={handleSave} style={s.headerBtn} disabled={saving}>
          {saving ? <ActivityIndicator size={'small'}/> : <Check size={20} color="#111"/>}
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={'padding'}>

        <ScrollView contentContainerStyle={{paddingBottom: 40}}>

          {/* Supplier */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Supplier</Text>
            {supplier ? (
              <Pressable style={s.selectedRow} onPress={() => setShowSupplierPicker(true)}>
                <View style={s.supplierIcon}>
                  <Building2 size={18} color="#374151"/>
                </View>
                <View>
                  <Text style={s.selectedName}>{supplier.name}</Text>
                  {supplier.contactName
                    ? <Text style={s.selectedSub}>{supplier.contactName}</Text>
                    : null}
                </View>
              </Pressable>
            ) : (
              <Pressable style={s.addRow} onPress={() => setShowSupplierPicker(true)}>
                <Building2 size={18} color="#111"/>
                <Text style={s.addRowText}>Add supplier</Text>
              </Pressable>
            )}
          </View>

          <View style={s.divider}/>

          {/* Products */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Products</Text>
            {cart.map((item) => {
              const qty = parseInt(item.quantity) || 0
              const cost = parseFloat(item.unitCost) || 0
              const lineTotal = qty * cost
              return (
                <View key={item.productId} style={s.cartCard}>
                  {/* Product name row */}
                  <View style={s.cartCardHeader}>
                    <Text style={s.cartName}>{item.name}</Text>
                    <Pressable onPress={() => removeFromCart(item.productId)} hitSlop={8}>
                      <X size={16} color="#9ca3af"/>
                    </Pressable>
                  </View>
                  {/* Cost × Qty = Total */}
                  <View style={s.cartInputRow}>
                    <MegaInput
                      label="Cost per unit"
                      value={item.unitCost}
                      onChangeText={(v) => updateCartItem(item.productId, 'unitCost', v)}
                      inputMode="decimal"
                      style={s.cartMegaInput}
                    />
                    <Text style={s.cartMultiply}>×</Text>
                    <MegaInput
                      label="Quantity"
                      value={item.quantity}
                      onChangeText={(v) => updateCartItem(item.productId, 'quantity', v)}
                      inputMode="numeric"
                      style={s.cartMegaInput}
                    />
                    <Text style={s.cartTotal}>৳{lineTotal.toFixed(2)}</Text>
                  </View>
                </View>
              )
            })}

            <Pressable style={s.addProductBtn} onPress={() => setShowProductPicker(true)}>
              <ShoppingBag size={16} color="#fff"/>
              <Text style={s.addProductBtnText}>Add products</Text>
            </Pressable>
          </View>

          <View style={s.divider}/>

          {/* Payment */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Payment</Text>
            <View style={s.payLine}>
              <Text style={s.payKey}>Subtotal</Text>
              <Text style={s.payVal}>৳{subtotal.toFixed(2)}</Text>
            </View>

            <View style={s.payLine}>
              <View style={{flex: 1}}>
                <Text style={s.payKey}>Discount</Text>
                <View style={{flexDirection: 'row', gap: 8, marginTop: 6}}>
                  <Pressable
                    onPress={() => setDiscountType('flat')}
                    style={[s.discountTab, discountType === 'flat' && s.discountTabActive]}>
                    <Text style={[s.discountTabText, discountType === 'flat' && {color: '#fff'}]}>৳ Flat</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setDiscountType('percent')}
                    style={[s.discountTab, discountType === 'percent' && s.discountTabActive]}>
                    <Text style={[s.discountTabText, discountType === 'percent' && {color: '#fff'}]}>% Off</Text>
                  </Pressable>
                  <TextInput
                    style={s.discountInput}
                    value={discountValue > 0 ? discountValue.toString() : ''}
                    placeholder={'0'}
                    placeholderTextColor="#aaa"
                    inputMode={'numeric'}
                    onChangeText={(t) => setDiscountValue(parseFloat(t) || 0)}
                  />
                </View>
              </View>
              <Text style={s.payVal}>-৳{discountAmount.toFixed(2)}</Text>
            </View>

            <View style={[s.payLine, {borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12, marginTop: 4}]}>
              <Text style={[s.payKey, {fontFamily: 'InterBold', fontSize: 16}]}>Total</Text>
              <Text style={[s.payVal, {fontFamily: 'InterBold', fontSize: 16}]}>৳{total.toFixed(2)}</Text>
            </View>
          </View>

        </ScrollView>

      </KeyboardAvoidingView>
      <PickerModal
        visible={showSupplierPicker}
        onClose={() => setShowSupplierPicker(false)}
        items={suppliers}
        onSelect={setSupplier}
        placeholder={'Search suppliers...'}
        renderSub={(s) => s.contactName}
      />
      <PickerModal
        visible={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        items={products}
        onSelect={addProduct}
        placeholder={'Search products...'}
        renderSub={(p) => `৳${p.price.toFixed(2)}`}
      />
    </View>
  )
}

export default withObservables([], () => ({
  suppliers: database.collections.get<Supplier>('suppliers')
    .query(Q.where('server_deleted_at', Q.eq(null)), Q.sortBy('name', 'asc')).observe(),
  products: database.collections.get<Product>('products')
    .query(Q.where('server_deleted_at', Q.eq(null)), Q.sortBy('name', 'asc')).observe(),
}))(NewPurchaseOrderScreen)

const s = StyleSheet.create({
  header: {
    paddingTop: 12, paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerBtn: {padding: 4},
  headerTitle: {fontSize: 17, fontFamily: 'InterBold', color: '#111'},
  section: {paddingHorizontal: 16, paddingVertical: 16},
  sectionTitle: {fontSize: 16, fontFamily: 'InterBold', color: '#111', marginBottom: 12},
  divider: {height: 8, backgroundColor: '#f5f5f5'},
  addRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  addRowText: {fontSize: 15, fontFamily: 'InterMedium', color: '#111'},
  selectedRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  supplierIcon: {width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center'},
  selectedName: {fontSize: 15, fontFamily: 'InterMedium', color: '#111'},
  selectedSub: {fontSize: 13, color: '#6b7280', fontFamily: 'InterRegular'},
  cartCard: {paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5'},
  cartCardHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10},
  cartName: {fontSize: 15, fontFamily: 'InterMedium', color: '#111', flex: 1, marginRight: 8},
  cartInputRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  cartMegaInput: {flex: 1},
  cartMultiply: {fontSize: 18, fontFamily: 'InterBold', color: '#374151'},
  cartTotal: {fontSize: 15, fontFamily: 'InterBold', color: '#111', minWidth: 70, textAlign: 'right'},
  addProductBtn: {flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111827', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, marginTop: 12, alignSelf: 'flex-start'},
  addProductBtnText: {color: '#fff', fontFamily: 'InterBold', fontSize: 14},
  payLine: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 8},
  payKey: {fontSize: 15, fontFamily: 'InterRegular', color: '#111'},
  payVal: {fontSize: 15, fontFamily: 'InterMedium', color: '#111'},
  discountTab: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb'},
  discountTabActive: {backgroundColor: '#111827', borderColor: '#111827'},
  discountTabText: {fontSize: 13, fontFamily: 'InterMedium', color: '#374151'},
  discountInput: {borderBottomWidth: 1, borderBottomColor: '#e5e7eb', minWidth: 50, fontSize: 14, fontFamily: 'InterMedium', color: '#111', paddingVertical: 2, textAlign: 'center'},
  pickerHeader: {paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'},
  pickerSearch: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8},
  pickerRow: {paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5'},
  pickerName: {fontSize: 15, fontFamily: 'InterMedium', color: '#111'},
  pickerSub: {fontSize: 13, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 2},
  empty: {textAlign: 'center', marginTop: 40, color: '#9f9f9f', fontFamily: 'InterRegular'},
})
