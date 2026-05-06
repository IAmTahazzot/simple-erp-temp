// app/orders/[id].tsx
import React, { useState, useMemo } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { withObservables } from '@nozbe/watermelondb/react'
import { Q } from '@nozbe/watermelondb'
import { database } from '@/database'
import Order, { OrderStatus, PaymentStatus } from '@/database/models/Order'
import OrderItem from '@/database/models/OrderItem'
import TransactionModel from '@/database/models/Transaction'
import {
  ArrowLeft, CheckCircle, Clock, AlertCircle, XCircle,
  RotateCcw, Edit2, RefreshCw,
} from 'lucide-react-native'
import { addPayment, cancelOrder, refundOrder, editOrder, RefundLine, issueRefundPayment } from '@/features/orders/functions'
import { useOnline } from '@/hooks/use-online'

// ─── Status config ────────────────────────────────────────────────────────────
const PAYMENT_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  unpaid: { color: '#92400e', label: 'Unpaid' },
  partially_paid: { color: '#1e40af', label: 'Partially Paid' },
  paid: { color: '#065f46', label: 'Paid' },
  refunded: { color: '#991b1b', label: 'Refunded' },
  partially_refunded: { color: '#9d174d', label: 'Partially Refunded' },
}

// ─── Pay Modal ────────────────────────────────────────────────────────────────
function PayModal({ visible, due, onClose, onPay }: {
  visible: boolean; due: number; onClose: () => void
  onPay: (amount: number) => Promise<void>
}) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePay = async () => {
    const val = parseFloat(amount)
    if (!val || val <= 0) { Alert.alert('Enter a valid amount'); return }
    if (val > due) { Alert.alert(`Amount exceeds due ৳${due.toFixed(2)}`); return }
    setLoading(true)
    await onPay(val)
    setLoading(false)
    setAmount('')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Record Payment</Text>
            <Text style={s.modalSub}>Due: ৳{due.toFixed(2)}</Text>
            <TextInput
              style={s.modalInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter amount"
              placeholderTextColor="#aaa"
              inputMode="numeric"
              autoFocus
            />
            <Pressable onPress={() => setAmount(due.toFixed(2))} style={s.quickLink}>
              <Text style={s.quickLinkText}>Pay full ৳{due.toFixed(2)}</Text>
            </Pressable>
            <View style={s.modalActions}>
              <Pressable onPress={onClose} style={s.cancelBtn}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handlePay} style={s.confirmBtn} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmBtnText}>Record</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Payback Modal ────────────────────────────────────────────────────────────
function PaybackModal({ visible, owed, onClose, onConfirm }: {
  visible: boolean; owed: number; onClose: () => void
  onConfirm: (amountToReturn: number, retainedProfit: number) => Promise<void>
}) {
  const [returnAmt, setReturnAmt] = useState(owed.toFixed(2))
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    const val = parseFloat(returnAmt)
    if (isNaN(val) || val < 0) { Alert.alert('Enter a valid positive amount'); return }
    if (val > owed) { Alert.alert(`Cannot return more than what is owed (৳${owed.toFixed(2)})`); return }
    
    setLoading(true)
    const retainedProfit = owed - val
    await onConfirm(val, retainedProfit)
    setLoading(false)
    onClose()
  }

  const amtParsed = parseFloat(returnAmt) || 0
  const retained = Math.max(0, owed - amtParsed)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Issue Refund Payment</Text>
            <Text style={s.modalSub}>Customer overpaid by: ৳{owed.toFixed(2)}</Text>
            
            <Text style={{ fontSize: 13, color: '#374151', marginBottom: 6, fontFamily: 'InterMedium' }}>Amount to give back to customer</Text>
            <TextInput
              style={s.modalInput}
              value={returnAmt}
              onChangeText={setReturnAmt}
              placeholder="Enter amount"
              placeholderTextColor="#aaa"
              inputMode="numeric"
              autoFocus
            />
            
            {retained > 0 && (
              <View style={{ backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ fontSize: 13, color: '#065f46', fontFamily: 'InterMedium' }}>
                  ৳{retained.toFixed(2)} will be kept as a restocking fee / profit.
                </Text>
              </View>
            )}

            <Pressable onPress={() => setReturnAmt(owed.toFixed(2))} style={s.quickLink}>
              <Text style={s.quickLinkText}>Pay full ৳{owed.toFixed(2)}</Text>
            </Pressable>

            <View style={s.modalActions}>
              <Pressable onPress={onClose} style={s.cancelBtn}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleConfirm} style={s.confirmBtn} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmBtnText}>Confirm Return</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Cancel Confirm Modal ─────────────────────────────────────────────────────
function CancelModal({ visible, onClose, onConfirm }: {
  visible: boolean; onClose: () => void; onConfirm: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const handle = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
    onClose()
  }
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalSheet, { gap: 12 }]}>
          <Text style={s.modalTitle}>Cancel Order?</Text>
          <Text style={{ fontFamily: 'InterRegular', fontSize: 14, color: '#6b7280', lineHeight: 20 }}>
            This will restore all items to inventory. The order total and due will be set to zero. This action cannot be undone.
          </Text>
          <View style={s.modalActions}>
            <Pressable onPress={onClose} style={s.cancelBtn}>
              <Text style={s.cancelBtnText}>Keep Order</Text>
            </Pressable>
            <Pressable onPress={handle} style={[s.confirmBtn, { backgroundColor: '#dc2626' }]} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmBtnText}>Cancel Order</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Refund Modal ─────────────────────────────────────────────────────────────
type RefundState = {
  productId: string
  productName: string
  originalQty: number      // total qty (sum of positive qty items for this product)
  originalPrice: number
  returnQty: number
  refundUnitPrice: string  // string for input
}

const EnhancedRefundItemProduct = withObservables(['item'], ({ item }: { item: OrderItem }) => ({
  item: item.observe(),
  product: item.product.observe(),
}))(({ item, product, refundState, onChange }: any) => {
  if (!refundState) return null
  const lineTotal = refundState.returnQty * (parseFloat(refundState.refundUnitPrice) || 0)
  return (
    <View style={s.refundItemRow}>
      <View style={{ marginBottom: 6 }}>
        <Text style={s.refundItemName}>{product?.name ?? item.productId}</Text>
        <Text style={s.refundItemSub}>
          Original: {refundState.originalQty} × ৳{refundState.originalPrice.toFixed(2)}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {/* Return qty counter */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            style={s.qtyBtn}
            onPress={() => onChange({ returnQty: Math.max(0, refundState.returnQty - 1) })}>
            <Text style={{ fontSize: 16, color: '#111' }}>−</Text>
          </Pressable>
          <Text style={{ fontFamily: 'InterBold', fontSize: 15, minWidth: 22, textAlign: 'center' }}>
            {refundState.returnQty}
          </Text>
          <Pressable
            style={s.qtyBtn}
            onPress={() => onChange({ returnQty: Math.min(refundState.originalQty, refundState.returnQty + 1) })}>
            <Text style={{ fontSize: 16, color: '#111' }}>+</Text>
          </Pressable>
        </View>
        {/* Refund unit price input */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'InterRegular', marginBottom: 2 }}>
            Unit refund price
          </Text>
          <TextInput
            style={s.refundPriceInput}
            value={refundState.refundUnitPrice}
            onChangeText={(v) => onChange({ refundUnitPrice: v })}
            inputMode="decimal"
            placeholder="0.00"
            placeholderTextColor="#aaa"
          />
        </View>
        {/* Line total */}
        <Text style={{ fontFamily: 'InterBold', fontSize: 13, color: '#111', minWidth: 60, textAlign: 'right' }}>
          ৳{lineTotal.toFixed(2)}
        </Text>
      </View>
    </View>
  )
})

function RefundModal({ visible, onClose, items, onConfirm }: {
  visible: boolean
  onClose: () => void
  items: OrderItem[]
  onConfirm: (lines: RefundLine[]) => Promise<void>
}) {
  // Aggregate items by productId (only positive qty = original items)
  const positiveItems = useMemo(() => items.filter(i => i.quantity > 0), [items])

  // Build product-level aggregated map
  const aggregated = useMemo(() => {
    const map = new Map<string, { productId: string; productName: string; qty: number; maxRefundQty: number; price: number; item: OrderItem }>()
    for (const item of items) {
      const existing = map.get(item.productId)
      if (existing) {
        existing.qty += item.quantity
        if (item.quantity > 0) {
          existing.price = item.unitPrice // use original buy price
        } else {
          // It's a refund item, so it already reduced `qty` via addition of a negative number.
          // maxRefundQty will just be the net `qty` after looking at all items.
        }
      } else {
        map.set(item.productId, {
          productId: item.productId,
          productName: item.productId,
          qty: item.quantity,
          maxRefundQty: 0, // calculate after
          price: item.unitPrice,
          item,
        })
      }
    }

    const available = Array.from(map.values()).map(agg => {
      agg.maxRefundQty = agg.qty // Because we summed positive and negative, net is the max left to refund.
      return agg
    }).filter(agg => agg.maxRefundQty > 0) // only include items that have available qty left to refund

    return available
  }, [items])

  const [refundStates, setRefundStates] = useState<Record<string, RefundState>>(() => {
    const init: Record<string, RefundState> = {}
    return init
  })

  // Initialize states when items change
  const getRefundState = (productId: string, originalQty: number, originalPrice: number): RefundState => {
    return refundStates[productId] ?? {
      productId,
      productName: productId,
      originalQty, // This is actually the "net available to refund" now
      originalPrice,
      returnQty: 0,
      refundUnitPrice: originalPrice.toFixed(2),
    }
  }

  const updateRefundState = (productId: string, originalQty: number, originalPrice: number, partial: Partial<RefundState>) => {
    setRefundStates(prev => ({
      ...prev,
      [productId]: { ...getRefundState(productId, originalQty, originalPrice), ...prev[productId], ...partial },
    }))
  }

  const handleFullRefund = () => {
    const next: Record<string, RefundState> = {}
    for (const agg of aggregated) {
      next[agg.productId] = {
        productId: agg.productId,
        productName: agg.productName,
        originalQty: agg.maxRefundQty,
        originalPrice: agg.price,
        returnQty: agg.maxRefundQty,
        refundUnitPrice: agg.price.toFixed(2),
      }
    }
    setRefundStates(next)
  }

  const totalRefund = useMemo(() => {
    let sum = 0
    for (const agg of aggregated) {
      const rs = refundStates[agg.productId]
      if (rs) sum += rs.returnQty * (parseFloat(rs.refundUnitPrice) || 0)
    }
    return sum
  }, [refundStates, aggregated])

  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    const lines: RefundLine[] = aggregated
      .map(agg => {
        const rs = refundStates[agg.productId]
        return {
          productId: agg.productId,
          productName: agg.productName,
          returnQty: rs?.returnQty ?? 0,
          refundUnitPrice: parseFloat(rs?.refundUnitPrice ?? '0') || 0,
        }
      })
      .filter(l => l.returnQty > 0)

    if (lines.length === 0) return
    setLoading(true)
    await onConfirm(lines)
    setLoading(false)
    onClose()
  }

  const disableConfirm = totalRefund <= 0 || loading || aggregated.length === 0

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        {/* Header */}
        <View style={[s.header, { paddingTop: Platform.OS === 'ios' ? 52 : 16 }]}>
          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <ArrowLeft size={22} color="#111" />
          </Pressable>
          <Text style={s.headerTitle}>Refund Order</Text>
          <Pressable onPress={handleFullRefund} style={s.fullRefundBtn}>
            <Text style={s.fullRefundBtnText}>Full Refund</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          <Text style={s.refundNote}>
            Select items and quantities to refund. New items with negative qty will be created.
          </Text>

          <View style={s.card}>
            {aggregated.map((agg) => {
              const rs = getRefundState(agg.productId, agg.maxRefundQty, agg.price)
              return (
                <EnhancedRefundItemProduct
                  key={agg.productId}
                  item={agg.item}
                  refundState={rs}
                  onChange={(partial: Partial<RefundState>) => updateRefundState(agg.productId, agg.maxRefundQty, agg.price, partial)}                />
              )
            })}
          </View>

          <View style={[s.card, { marginTop: 12 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'InterBold', fontSize: 16, color: '#111' }}>Total Refund</Text>
              <Text style={{ fontFamily: 'InterBold', fontSize: 16, color: '#dc2626' }}>
                ৳{totalRefund.toFixed(2)}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom confirm */}
        <View style={s.bottomBar}>
          <Pressable style={[s.bottomBtn, s.bottomBtnFill, disableConfirm ? { backgroundColor: '#fca5a5' } : { backgroundColor: '#dc2626' }]} onPress={handleConfirm} disabled={disableConfirm}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={[s.bottomBtnText, { color: '#fff' }]}>Confirm Refund ৳{totalRefund.toFixed(2)}</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ visible, onClose, order, items, onConfirm }: {
  visible: boolean; onClose: () => void
  order: Order; items: OrderItem[]
  onConfirm: (params: {
    editedItems: { id: string; quantity: number; unitPrice: number }[]
    discountType: 'flat' | 'percent' | null
    discountValue: number
    totalAmount: number
  }) => Promise<void>
}) {
  type EditItem = { id: string; productId: string; quantity: number; unitPrice: string }

  const positiveItems = useMemo(() => items.filter(i => i.quantity > 0), [items])

  const [editItems, setEditItems] = useState<EditItem[]>(() =>
    positiveItems.map(i => ({
      id: i.id,
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice.toFixed(2),
    }))
  )

  // Re-init when items change
  React.useEffect(() => {
    if (visible) {
      setEditItems(positiveItems.map(i => ({
        id: i.id,
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice.toFixed(2),
      })))
      setDiscountType(order.discountType as 'flat' | 'percent' ?? 'flat')
      setDiscountValue(order.discountValue?.toString() ?? '0')
    }
  }, [visible])

  const [discountType, setDiscountType] = useState<'flat' | 'percent'>(
    order.discountType as 'flat' | 'percent' ?? 'flat'
  )
  const [discountValue, setDiscountValue] = useState(order.discountValue?.toString() ?? '0')
  const [loading, setLoading] = useState(false)

  const updateItem = (id: string, partial: Partial<EditItem>) => {
    setEditItems(prev => prev.map(i => i.id === id ? { ...i, ...partial } : i))
  }

  const subtotal = editItems.reduce((sum, i) => sum + i.quantity * (parseFloat(i.unitPrice) || 0), 0)
  const dv = parseFloat(discountValue) || 0
  const discountAmount = discountType === 'percent' ? subtotal * (dv / 100) : Math.min(dv, subtotal)
  const total = Math.max(0, subtotal - discountAmount)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm({
      editedItems: editItems.map(i => ({
        id: i.id,
        quantity: i.quantity,
        unitPrice: parseFloat(i.unitPrice) || 0,
      })),
      discountType: discountType,
      discountValue: dv,
      totalAmount: total,
    })
    setLoading(false)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
          <View style={[s.header, { paddingTop: Platform.OS === 'ios' ? 52 : 16 }]}>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <ArrowLeft size={22} color="#111" />
            </Pressable>
            <Text style={s.headerTitle}>Edit Order</Text>
            <View style={{ width: 30 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
            <View style={s.card}>
              <Text style={s.cardTitle}>Items</Text>
              {editItems.map(item => (
                <EnhancedEditItemRow
                  key={item.id}
                  itemId={item.id}
                  quantity={item.quantity}
                  unitPrice={item.unitPrice}
                  // @ts-ignore
                  onQtyChange={(delta) => updateItem(item.id, { quantity: Math.max(1, item.quantity + delta) })}
                  // @ts-ignore
                  onPriceChange={(v) => updateItem(item.id, { unitPrice: v })}
                />
              ))}
            </View>

            <View style={[s.card, { marginTop: 12 }]}>
              <Text style={s.cardTitle}>Discount</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
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
                  value={discountValue}
                  onChangeText={setDiscountValue}
                  inputMode="decimal"
                  placeholder="0"
                  placeholderTextColor="#aaa"
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontFamily: 'InterRegular', fontSize: 14, color: '#374151' }}>Subtotal</Text>
                <Text style={{ fontFamily: 'InterMedium', fontSize: 14, color: '#111' }}>৳{subtotal.toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontFamily: 'InterRegular', fontSize: 14, color: '#374151' }}>Discount</Text>
                <Text style={{ fontFamily: 'InterMedium', fontSize: 14, color: '#111' }}>-৳{discountAmount.toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8, marginTop: 4 }}>
                <Text style={{ fontFamily: 'InterBold', fontSize: 15, color: '#111' }}>Total</Text>
                <Text style={{ fontFamily: 'InterBold', fontSize: 15, color: '#111' }}>৳{total.toFixed(2)}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={s.bottomBar}>
            <Pressable style={[s.bottomBtn, s.bottomBtnFill]} onPress={handleConfirm} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[s.bottomBtnText, { color: '#fff' }]}>Save Changes</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// Observes product name for edit row
const EnhancedEditItemRow = withObservables(['itemId'], ({ itemId }: { itemId: string }) => ({
  orderItem: database.get<OrderItem>('order_items').findAndObserve(itemId),
}))(({ orderItem, quantity, unitPrice, onQtyChange, onPriceChange }: any) => {
  const ProductName = withObservables(['orderItem'], ({ orderItem }: { orderItem: OrderItem }) => ({
    product: orderItem.product.observe(),
  }))(({ product }: any) => (
    <Text style={s.itemName}>{product?.name ?? orderItem.productId}</Text>
  ))

  return (
    <View style={s.editItemRow}>
      <ProductName orderItem={orderItem} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
        {/* Qty counter */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable style={s.qtyBtn} onPress={() => onQtyChange(-1)}>
            <Text style={{ fontSize: 16, color: '#111' }}>−</Text>
          </Pressable>
          <Text style={{ fontFamily: 'InterBold', fontSize: 15, minWidth: 22, textAlign: 'center' }}>
            {quantity}
          </Text>
          <Pressable style={s.qtyBtn} onPress={() => onQtyChange(1)}>
            <Text style={{ fontSize: 16, color: '#111' }}>+</Text>
          </Pressable>
        </View>
        {/* Unit price input */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'InterRegular', marginBottom: 2 }}>Unit price</Text>
          <TextInput
            style={s.refundPriceInput}
            value={unitPrice}
            onChangeText={onPriceChange}
            inputMode="decimal"
            placeholder="0.00"
            placeholderTextColor="#aaa"
          />
        </View>
        <Text style={{ fontFamily: 'InterBold', fontSize: 13, color: '#111', minWidth: 65, textAlign: 'right' }}>
          ৳{(quantity * (parseFloat(unitPrice) || 0)).toFixed(2)}
        </Text>
      </View>
    </View>
  )
})

// ─── Order item row ───────────────────────────────────────────────────────────
const OrderDetailItem = withObservables(['item'], ({ item }: { item: OrderItem }) => ({
  item: item.observe(),
  product: item.product.observe(),
}))(({ item, product }: any) => (
  <View style={[s.itemRow, item.quantity < 0 && { backgroundColor: '#fff5f5' }]}>
    <View style={{ flex: 1 }}>
      <Text style={s.itemName}>{product?.name ?? item.productId}</Text>
      <Text style={s.itemSub}>
        {item.quantity < 0 ? `Refund ${Math.abs(item.quantity)}` : `Qty ${item.quantity}`}
        {' × ৳'}{item.unitPrice.toFixed(2)}
      </Text>
    </View>
    <Text style={[s.itemTotal, item.quantity < 0 && { color: '#dc2626' }]}>
      {item.quantity < 0 ? '-' : ''}৳{Math.abs(item.quantity * item.unitPrice).toFixed(2)}
    </Text>
  </View>
))

// ─── Main Order Detail ────────────────────────────────────────────────────────
function OrderDetail({ order, customer, items, transactions }: {
  order: Order; customer: any; items: OrderItem[]; transactions: TransactionModel[]
}) {
  const router = useRouter()
  const { isOnline } = useOnline()
  const [payVisible, setPayVisible] = useState(false)
  const [cancelVisible, setCancelVisible] = useState(false)
  const [refundVisible, setRefundVisible] = useState(false)
  const [editVisible, setEditVisible] = useState(false)
  const [paybackVisible, setPaybackVisible] = useState(false)

  const paidAmount = transactions.reduce((sum, t) => sum + (t.type === 'payment' ? Number(t.amount) : 0), 0)
  const refundedAmount = transactions.reduce((sum, t) => sum + (t.type === 'refund' ? Number(t.amount) : 0), 0)
  const netPaid = paidAmount - refundedAmount
  const totalAmt = Number(order.totalAmount) || 0
  const due = totalAmt - netPaid
  const statusConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus] ?? PAYMENT_STATUS_CONFIG.unpaid
  const hasTx = transactions.length > 0
  const isCanceled = order.status === OrderStatus.CANCELED

  const handlePay = async (amount: number) => {
    await addPayment(order, amount, isOnline)
  }

  const handleCancel = async () => {
    await cancelOrder(order, isOnline)
    router.back()
  }

  const handleRefund = async (lines: RefundLine[]) => {
    await refundOrder(order, lines, isOnline)
  }

  const handleEdit = async (params: {
    editedItems: { id: string; quantity: number; unitPrice: number }[]
    discountType: 'flat' | 'percent' | null
    discountValue: number
    totalAmount: number
  }) => {
    await editOrder(order, {
      items: params.editedItems,
      discountType: params.discountType,
      discountValue: params.discountValue,
      totalAmount: params.totalAmount,
    }, isOnline)
  }

  const handlePayback = async (returnAmt: number, retainedProfit: number) => {
    await issueRefundPayment(order, returnAmt, retainedProfit, isOnline)
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={22} color="#111" />
        </Pressable>
        <Text style={s.headerTitle}>Order Details</Text>
        {!isCanceled && !hasTx && (
          <Pressable onPress={() => setEditVisible(true)} style={{ padding: 4 }}>
            <Edit2 size={20} color="#111" />
          </Pressable>
        )}
        {(isCanceled || hasTx) && <View style={{ width: 30 }} />}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Customer card */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{customer?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.customerName}>{customer?.name ?? '—'}</Text>
              <Text style={s.orderDate}>
                {new Date(order.orderDate).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: statusConfig.color + '22' }]}>
              <Text style={[s.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
          </View>

          {/* Order status badge */}
          {order.status === OrderStatus.CANCELED && (
            <View style={[s.canceledBanner]}>
              <XCircle size={14} color="#991b1b" />
              <Text style={s.canceledBannerText}>This order was canceled</Text>
            </View>
          )}
        </View>

        {/* Items */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Items</Text>
          {items.map((item) => <OrderDetailItem key={item.id} item={item} />)}
        </View>

        {/* Payment summary */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Payment Summary</Text>

          {order.discountType && (order.discountValue ?? 0) > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryKey}>
                Discount ({order.discountType === 'percent' ? `${order.discountValue}%` : 'Flat'})
              </Text>
              <Text style={[s.summaryVal, { color: '#065f46' }]}>
                -{order.discountType === 'percent'
                ? `${order.discountValue}%`
                : `৳${order.discountValue?.toFixed(2)}`}
              </Text>
            </View>
          )}

          <View style={s.summaryRow}>
            <Text style={s.summaryKey}>Total</Text>
            <Text style={s.summaryVal}>৳{totalAmt.toFixed(2)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryKey}>Paid</Text>
            <Text style={[s.summaryVal, { color: '#065f46' }]}>৳{netPaid.toFixed(2)}</Text>
          </View>
          {refundedAmount > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryKey}>Refunded</Text>
              <Text style={[s.summaryVal, { color: '#dc2626' }]}>৳{refundedAmount.toFixed(2)}</Text>
            </View>
          )}
          {order.profitAmount !== undefined && order.profitAmount !== null && (
            <View style={s.summaryRow}>
              <Text style={s.summaryKey}>Profit</Text>
              <Text style={[s.summaryVal, { color: (order.profitAmount ?? 0) >= 0 ? '#065f46' : '#dc2626' }]}>
                ৳{(order.profitAmount ?? 0).toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[s.summaryRow, { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10, marginTop: 4 }]}>
            <Text style={[s.summaryKey, { fontFamily: 'InterBold' }]}>
              {due < 0 ? 'Customer Owed' : 'Due'}
            </Text>
            <Text style={[s.summaryVal, {
              fontFamily: 'InterBold',
              color: due > 0 ? '#92400e' : due < 0 ? '#065f46' : '#111',
            }]}>
              ৳{Math.abs(due).toFixed(2)}
            </Text>
          </View>

          {due > 0 && !isCanceled && (
            <Pressable style={s.payBtn} onPress={() => setPayVisible(true)}>
              <Text style={s.payBtnText}>Record Payment</Text>
            </Pressable>
          )}

          {due < 0 && (
            <Pressable style={[s.payBtn, { backgroundColor: '#1e40af' }]} onPress={() => setPaybackVisible(true)}>
              <Text style={s.payBtnText}>Pay Back ৳{Math.abs(due).toFixed(2)}</Text>
            </Pressable>
          )}
        </View>

        {/* Transactions */}
        {transactions.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Payment History</Text>
            {[...transactions]
              .sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime())
              .map((tx) => (
                <View key={tx.id} style={s.txRow}>
                  <View>
                    <Text style={s.txType}>{tx.type === 'payment' ? 'Payment' : 'Refund'}</Text>
                    <Text style={s.txDate}>
                      {new Date(tx.paymentDate).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Text style={[s.txAmount, { color: tx.type === 'payment' ? '#065f46' : '#dc2626' }]}>
                    {tx.type === 'payment' ? '+' : '-'}৳{tx.amount.toFixed(2)}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {/* Actions */}
        {!isCanceled && (
          <View style={{ paddingHorizontal: 12, paddingTop: 12, gap: 10 }}>
            {/* Refund button - always shown for active/completed */}
            <Pressable style={s.refundActionBtn} onPress={() => setRefundVisible(true)}>
              <RotateCcw size={16} color="#dc2626" />
              <Text style={s.refundActionBtnText}>Refund</Text>
            </Pressable>

            {/* Cancel button - only if no transactions */}
            {!hasTx && (
              <Pressable style={s.cancelActionBtn} onPress={() => setCancelVisible(true)}>
                <XCircle size={16} color="#6b7280" />
                <Text style={s.cancelActionBtnText}>Cancel Order</Text>
              </Pressable>
            )}
          </View>
        )}

      </ScrollView>

      <PayModal
        visible={payVisible}
        due={due}
        onClose={() => setPayVisible(false)}
        onPay={handlePay}
      />
      <CancelModal
        visible={cancelVisible}
        onClose={() => setCancelVisible(false)}
        onConfirm={handleCancel}
      />
      <RefundModal
        visible={refundVisible}
        onClose={() => setRefundVisible(false)}
        items={items}
        onConfirm={handleRefund}
      />
      <EditModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        order={order}
        items={items}
        onConfirm={handleEdit}
      />
      <PaybackModal
        visible={paybackVisible}
        owed={Math.abs(due)}
        onClose={() => setPaybackVisible(false)}
        onConfirm={handlePayback}
      />
    </View>
  )
}

// ─── Enhanced with observables ────────────────────────────────────────────────
const EnhancedOrderDetail = withObservables(['order'], ({ order }: { order: Order }) => ({
  order: order.observe(),
  customer: order.customer.observe(),
  items: order.orderItems.extend(Q.where('server_deleted_at', Q.eq(null))).observeWithColumns(['product_id', 'quantity', 'unit_price']),
  transactions: order.transactions.extend(Q.where('server_deleted_at', Q.eq(null))).observe(),
}))(OrderDetail)

const Screen = withObservables(['id'], ({ id }: { id: string }) => ({
  order: database.get<Order>('orders').findAndObserve(id),
}))(({ order }: { order: Order }) => <EnhancedOrderDetail order={order} />)

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return <Screen id={id} />
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    paddingTop: 12, paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 16, fontFamily: 'InterBold', color: '#111' },
  card: {
    margin: 12, marginBottom: 0, backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardTitle: {
    fontSize: 12, fontFamily: 'InterMedium', color: '#9ca3af',
    marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#111827',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontFamily: 'InterBold', fontSize: 18 },
  customerName: { fontSize: 16, fontFamily: 'InterBold', color: '#111' },
  orderDate: { fontSize: 13, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  statusText: { fontSize: 12, fontFamily: 'InterMedium' },
  canceledBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginTop: 12,
  },
  canceledBannerText: { fontFamily: 'InterMedium', fontSize: 13, color: '#991b1b' },

  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
    borderRadius: 4,
  },
  itemName: { fontSize: 14, fontFamily: 'InterMedium', color: '#111' },
  itemSub: { fontSize: 12, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 2 },
  itemTotal: { fontSize: 14, fontFamily: 'InterBold', color: '#111' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryKey: { fontSize: 14, fontFamily: 'InterRegular', color: '#374151' },
  summaryVal: { fontSize: 14, fontFamily: 'InterMedium', color: '#111' },

  payBtn: {
    backgroundColor: '#111827', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginTop: 12,
  },
  payBtnText: { color: '#fff', fontFamily: 'InterBold', fontSize: 15 },

  txRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  txType: { fontSize: 14, fontFamily: 'InterMedium', color: '#111' },
  txDate: { fontSize: 12, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 2 },
  txAmount: { fontSize: 15, fontFamily: 'InterBold' },

  refundActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: '#dc2626', borderRadius: 10, paddingVertical: 12,
  },
  refundActionBtnText: { fontFamily: 'InterBold', fontSize: 14, color: '#dc2626' },
  cancelActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 12,
  },
  cancelActionBtnText: { fontFamily: 'InterMedium', fontSize: 14, color: '#6b7280' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: '#00000055', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 24,
  },
  modalTitle: { fontSize: 18, fontFamily: 'InterBold', color: '#111', marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#6b7280', fontFamily: 'InterRegular', marginBottom: 20 },
  modalInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 24, fontFamily: 'InterBold', color: '#111', marginBottom: 12,
  },
  quickLink: { alignSelf: 'flex-start', marginBottom: 20 },
  quickLinkText: { fontSize: 14, color: '#1e40af', fontFamily: 'InterMedium' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontFamily: 'InterMedium', color: '#374151' },
  confirmBtn: {
    flex: 1, backgroundColor: '#111827',
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  confirmBtnText: { fontSize: 15, fontFamily: 'InterBold', color: '#fff' },

  // Refund modal
  refundNote: {
    fontSize: 13, fontFamily: 'InterRegular', color: '#6b7280',
    marginBottom: 12, lineHeight: 18,
  },
  refundItemRow: {
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  refundItemName: { fontSize: 14, fontFamily: 'InterMedium', color: '#111' },
  refundItemSub: { fontSize: 12, color: '#9ca3af', fontFamily: 'InterRegular', marginTop: 2 },
  refundPriceInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    fontSize: 14, fontFamily: 'InterMedium', color: '#111',
  },
  fullRefundBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#fee2e2', borderRadius: 8,
  },
  fullRefundBtnText: { fontSize: 13, fontFamily: 'InterBold', color: '#dc2626' },

  // Edit modal
  editItemRow: {
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
  },
  discountTab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  discountTabActive: { backgroundColor: '#111827', borderColor: '#111827' },
  discountTabText: { fontSize: 13, fontFamily: 'InterMedium', color: '#374151' },
  discountInput: {
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    minWidth: 60, fontSize: 14, fontFamily: 'InterMedium', color: '#111',
    paddingVertical: 2, textAlign: 'center',
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  bottomBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: 10,
  },
  bottomBtnFill: { backgroundColor: '#111827' },
  bottomBtnText: { fontSize: 15, fontFamily: 'InterBold' },
})
