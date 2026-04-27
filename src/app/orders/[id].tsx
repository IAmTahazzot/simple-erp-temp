// app/orders/[id].tsx
import React, {useState} from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView
} from 'react-native'
import {useLocalSearchParams, useRouter} from 'expo-router'
import {withObservables} from '@nozbe/watermelondb/react'
import {database} from '@/database'
import Order from '@/database/models/Order'
import OrderItem from '@/database/models/OrderItem'
import TransactionModel from '@/database/models/Transaction'
import {ArrowLeft, CheckCircle, Clock, AlertCircle} from 'lucide-react-native'
import {addPayment} from '@/features/orders/functions'
import {useOnline} from '@/hooks/use-online'

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  paid: {color: '#065f46', icon: <CheckCircle size={16} color="#065f46"/>, label: 'Paid'},
  partial: {color: '#1e40af', icon: <Clock size={16} color="#1e40af"/>, label: 'Partially paid'},
  pending: {color: '#92400e', icon: <AlertCircle size={16} color="#92400e"/>, label: 'Unpaid'},
  cancelled: {color: '#991b1b', icon: <AlertCircle size={16} color="#991b1b"/>, label: 'Cancelled'},
}

// ─── Pay Modal ────────────────────────────────────────────────────────────────
function PayModal({visible, due, onClose, onPay}: {
  visible: boolean
  due: number
  onClose: () => void
  onPay: (amount: number) => Promise<void>
}) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)


  const handlePay = async () => {
    const val = parseFloat(amount)
    if (!val || val <= 0) {
      Alert.alert('Enter a valid amount');
      return
    }
    if (val > due) {
      Alert.alert(`Amount exceeds due amount ৳${due.toFixed(2)}`);
      return
    }
    setLoading(true)
    await onPay(val)
    setLoading(false)
    setAmount('')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType={'slide'} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{flex: 1}} behavior={'padding'}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Record Payment</Text>
            <Text style={s.modalSub}>Due: ৳{due.toFixed(2)}</Text>

            <TextInput
              style={s.modalInput}
              value={amount}
              onChangeText={setAmount}
              placeholder={'Enter amount'}
              placeholderTextColor="#aaa"
              inputMode={'numeric'}
              autoFocus
            />

            <Pressable
              onPress={() => setAmount(due.toFixed(2))}
              style={s.payFullBtn}>
              <Text style={s.payFullBtnText}>Pay full ৳{due.toFixed(2)}</Text>
            </Pressable>

            <View style={s.modalActions}>
              <Pressable onPress={onClose} style={s.cancelBtn}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handlePay} style={s.confirmBtn} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" size={'small'}/>
                  : <Text style={s.confirmBtnText}>Record</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Order Detail ─────────────────────────────────────────────────────────────
function OrderDetail({order, customer, items, transactions}: {
  order: Order
  customer: any
  items: OrderItem[]
  transactions: TransactionModel[]
}) {
  const router = useRouter()
  const {isOnline} = useOnline()
  const [payVisible, setPayVisible] = useState(false)

  const totalPaid = transactions
    .filter((t) => t.type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0)
  const due = Math.max(0, order.totalAmount - totalPaid)
  const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending

  const handlePay = async (amount: number) => {
    await addPayment(order, amount, amount > 0 ? 'payment' : 'refund', isOnline)
  }

  return (
    <View style={{flex: 1, backgroundColor: '#f9fafb'}}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={{padding: 4}}>
          <ArrowLeft size={22} color="#111"/>
        </Pressable>
        <Text style={s.headerTitle}>Order</Text>
        <View style={{width: 30}}/>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 100}}>

        {/* Customer + status card */}
        <View style={s.card}>
          <View style={s.cardRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{customer?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={s.customerName}>{customer?.name ?? '—'}</Text>
              <Text style={s.orderDate}>{new Date(order.orderDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</Text>
            </View>
            <View style={[s.statusBadge, {backgroundColor: status.color + '22'}]}>
              {status.icon}
              <Text style={[s.statusText, {color: status.color}]}>{status.label}</Text>
            </View>
          </View>
        </View>

        {/* Items */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Items</Text>
          {items.map((item) => (
            <View key={item.id} style={s.itemRow}>
              <View style={{flex: 1}}>
                <Text style={s.itemName}>{item.productId}</Text>
                <Text style={s.itemSub}>Qty {item.quantity} × ৳{item.unitPrice.toFixed(2)}</Text>
              </View>
              <Text style={s.itemTotal}>৳{(item.quantity * item.unitPrice).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Payment summary */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Payment</Text>
          <View style={s.summaryRow}>
            <Text style={s.summaryKey}>Order total</Text>
            <Text style={s.summaryVal}>৳{order.totalAmount.toFixed(2)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryKey}>Paid</Text>
            <Text style={[s.summaryVal, {color: '#065f46'}]}>৳{totalPaid.toFixed(2)}</Text>
          </View>
          <View style={[s.summaryRow, {borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10, marginTop: 4}]}>
            <Text style={[s.summaryKey, {fontFamily: 'InterBold'}]}>Due</Text>
            <Text style={[s.summaryVal, {fontFamily: 'InterBold', color: due > 0 ? '#92400e' : '#065f46'}]}>
              ৳{due.toFixed(2)}
            </Text>
          </View>

          {due > 0 && (
            <Pressable style={s.payBtn} onPress={() => setPayVisible(true)}>
              <Text style={s.payBtnText}>Record payment</Text>
            </Pressable>
          )}
        </View>

        {/* Transaction history */}
        {transactions.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Payment History</Text>
            {[...transactions]
              .sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime())
              .map((tx) => (
                <View key={tx.id} style={s.txRow}>
                  <View>
                    <Text style={s.txType}>{tx.type === 'payment' ? 'Payment' : 'Refund'}</Text>
                    <Text style={s.txDate}>{new Date(tx.paymentDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}</Text>
                  </View>
                  <Text style={[s.txAmount, {color: tx.type === 'payment' ? '#065f46' : '#991b1b'}]}>
                    {tx.type === 'payment' ? '+' : '-'}৳{tx.amount.toFixed(2)}
                  </Text>
                </View>
              ))}
          </View>
        )}

      </ScrollView>

      <PayModal
        visible={payVisible}
        due={due}
        onClose={() => setPayVisible(false)}
        onPay={handlePay}
      />
    </View>
  )
}

// ─── Enhanced with observables ────────────────────────────────────────────────
const EnhancedOrderDetail = withObservables(['order'], ({order}: { order: Order }) => ({
  order: order.observe(),
  customer: order.customer.observe(),
  items: order.orderItems.observe(),
  transactions: order.transactions.observe(),
}))(OrderDetail)

export default function OrderDetailScreen() {
  const {id} = useLocalSearchParams<{ id: string }>()
  const order = database.get<Order>('orders').findAndObserve(id)

  // Wrap in withObservables at screen level
  const Screen = withObservables(['id'], ({id}: { id: string }) => ({
    order: database.get<Order>('orders').findAndObserve(id),
  }))(({order}: { order: Order }) => <EnhancedOrderDetail order={order}/>)

  return <Screen id={id}/>
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    paddingTop: 12, paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerTitle: {fontSize: 16, fontFamily: 'InterBold', color: '#111'},
  card: {
    margin: 12, marginBottom: 0, backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: 'InterMedium',
    color: '#9ca3af',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  cardRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {color: '#fff', fontFamily: 'InterBold', fontSize: 18},
  customerName: {fontSize: 16, fontFamily: 'InterBold', color: '#111'},
  orderDate: {fontSize: 13, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 2},
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20
  },
  statusText: {fontSize: 12, fontFamily: 'InterMedium'},

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5'
  },
  itemName: {fontSize: 14, fontFamily: 'InterMedium', color: '#111'},
  itemSub: {fontSize: 12, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 2},
  itemTotal: {fontSize: 14, fontFamily: 'InterBold', color: '#111'},

  summaryRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6},
  summaryKey: {fontSize: 14, fontFamily: 'InterRegular', color: '#374151'},
  summaryVal: {fontSize: 14, fontFamily: 'InterMedium', color: '#111'},

  payBtn: {backgroundColor: '#111827', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12},
  payBtnText: {color: '#fff', fontFamily: 'InterBold', fontSize: 15},

  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5'
  },
  txType: {fontSize: 14, fontFamily: 'InterMedium', color: '#111'},
  txDate: {fontSize: 12, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 2},
  txAmount: {fontSize: 15, fontFamily: 'InterBold'},

  // Pay modal
  modalOverlay: {flex: 1, backgroundColor: '#00000055', justifyContent: 'flex-end'},
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {fontSize: 18, fontFamily: 'InterBold', color: '#111', marginBottom: 4},
  modalSub: {fontSize: 14, color: '#6b7280', fontFamily: 'InterRegular', marginBottom: 20},
  modalInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 24, fontFamily: 'InterBold', color: '#111', marginBottom: 12,
  },
  payFullBtn: {alignSelf: 'flex-start', marginBottom: 20},
  payFullBtnText: {fontSize: 14, color: '#1e40af', fontFamily: 'InterMedium'},
  modalActions: {flexDirection: 'row', gap: 12},
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  cancelBtnText: {fontSize: 15, fontFamily: 'InterMedium', color: '#374151'},
  confirmBtn: {flex: 1, backgroundColor: '#111827', borderRadius: 10, paddingVertical: 12, alignItems: 'center'},
  confirmBtnText: {fontSize: 15, fontFamily: 'InterBold', color: '#fff'},
})
