// src/app/products/purchaseorder/[id].tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Edit2, XCircle, RotateCcw, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import { withObservables } from '@nozbe/watermelondb/react';
import { switchMap } from 'rxjs/operators';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/database';
import PurchaseOrder, { PurchaseOrderStatus, PurchasePaymentStatus } from '@/database/models/PurchaseOrder';
import Supplier from '@/database/models/Supplier';
import PurchaseOrderItem from '@/database/models/PurchaseOrderItem';
import TransactionModel from '@/database/models/Transaction';
import {
  addPurchasePayment,
  cancelPurchaseOrder,
  refundPurchaseOrder,
  editPurchaseOrder,
  issuePurchaseRefundPayment,
  RefundLine,
} from '@/features/purchase/functions';
import { useOnline } from '@/hooks/use-online';

// -----------------------------------------------------------------------------
// UI Helpers & Config
// -----------------------------------------------------------------------------
const PAYMENT_STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  unpaid: { bg: '#fef3c7', text: '#92400e', label: 'Unpaid' },
  partially_paid: { bg: '#dbeafe', text: '#1e40af', label: 'Partially Paid' },
  paid: { bg: '#d1fae5', text: '#065f46', label: 'Paid' },
  refunded: { bg: '#fee2e2', text: '#991b1b', label: 'Refunded' },
  partially_refunded: { bg: '#fce7f3', text: '#9d174d', label: 'Partially Refunded' },
};

// -----------------------------------------------------------------------------
// Modals
// -----------------------------------------------------------------------------
function PayModal({ visible, due, onClose, onPay }: { visible: boolean; due: number; onClose: () => void; onPay: (amount: number) => Promise<unknown> }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { alert('Enter a valid amount'); return; }
    if (val > due) { alert(`Amount exceeds payable ৳${due.toFixed(2)}`); return; }
    setLoading(true);
    await onPay(val);
    setLoading(false);
    setAmount('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Record Payment</Text>
            <Text style={s.modalSub}>Account Payable: ৳{due.toFixed(2)}</Text>
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
              <Pressable onPress={onClose} style={s.cancelBtn} disabled={loading}>
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
  );
}

function PaybackModal({ visible, owed, onClose, onConfirm }: { visible: boolean; owed: number; onClose: () => void; onConfirm: (returnAmt: number, retainedProfit: number) => Promise<unknown> }) {
  const [returnAmt, setReturnAmt] = useState(owed.toFixed(2));
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    const val = parseFloat(returnAmt);
    if (isNaN(val) || val < 0) { alert('Enter a valid positive amount'); return; }
    if (val > owed) { alert(`Cannot return more than owed ৳${owed.toFixed(2)}`); return; }
    setLoading(true);
    const retained = owed - val;
    await onConfirm(val, retained);
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Issue Refund Payment</Text>
            <Text style={s.modalSub}>Supplier overpaid by: ৳{owed.toFixed(2)}</Text>
            <TextInput
              style={s.modalInput}
              value={returnAmt}
              onChangeText={setReturnAmt}
              placeholder="Enter amount"
              placeholderTextColor="#aaa"
              inputMode="numeric"
              autoFocus
            />
            <Pressable onPress={() => setReturnAmt(owed.toFixed(2))} style={s.quickLink}>
              <Text style={s.quickLinkText}>Return full ৳{owed.toFixed(2)}</Text>
            </Pressable>
            <View style={s.modalActions}>
              <Pressable onPress={onClose} style={s.cancelBtn} disabled={loading}>
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
  );
}

function CancelModal({ visible, onClose, onConfirm }: { visible: boolean; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    onClose();
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalSheet, { gap: 12 }]}>
          <Text style={s.modalTitle}>Cancel PurchaseOrder?</Text>
          <Text style={{ fontFamily: 'InterRegular', fontSize: 14, color: '#6b7280', lineHeight: 20 }}>
            This will restore all items to inventory. The order total and payable will be set to zero. This action cannot be undone.
          </Text>
          <View style={s.modalActions}>
            <Pressable onPress={onClose} style={s.cancelBtn}>
              <Text style={s.cancelBtnText}>Keep PurchaseOrder</Text>
            </Pressable>
            <Pressable onPress={handle} style={[s.confirmBtn, { backgroundColor: '#dc2626' }]} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmBtnText}>Cancel PurchaseOrder</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Refund modal (item based)
type RefundState = {
  productId: string;
  productName: string;
  originalQty: number;
  originalPrice: number;
  returnQty: number;
  refundUnitPrice: string;
};

function RefundModal({ visible, onClose, items, onConfirm }: { visible: boolean; onClose: () => void; items: PurchaseOrderItem[]; onConfirm: (lines: RefundLine[]) => Promise<void> }) {
  // Aggregate positive items (available to refund)
  const aggregated = useMemo(() => {
    const map = new Map<string, { productId: string; productName: string; qty: number; price: number; item: PurchaseOrderItem }>();
    items.forEach(i => {
      const key = i.productId;
      const existing = map.get(key);
      if (existing) {
        existing.qty += i.quantity;
        if (i.quantity > 0) existing.price = i.unitPrice; // use latest purchase price
      } else {
        map.set(key, { productId: i.productId, productName: i.productId, qty: i.quantity, price: i.unitPrice, item: i });
      }
    });
    // Keep only net positive qty
    const result = Array.from(map.values()).filter(v => v.qty > 0);
    return result;
  }, [items]);

  const [refundStates, setRefundStates] = useState<Record<string, RefundState>>({});
  const getState = (productId: string, maxQty: number, price: number): RefundState =>
    refundStates[productId] ?? { productId, productName: productId, originalQty: maxQty, originalPrice: price, returnQty: 0, refundUnitPrice: price.toFixed(2) };

  const updateState = (productId: string, partial: Partial<RefundState>) => {
    setRefundStates(prev => ({
      ...prev,
      [productId]: { ...getState(productId, 0, 0), ...prev[productId], ...partial },
    }));
  };

  const handleFull = () => {
    const newStates: Record<string, RefundState> = {};
    aggregated.forEach(a => {
      newStates[a.productId] = {
        productId: a.productId,
        productName: a.productName,
        originalQty: a.qty,
        originalPrice: a.price,
        returnQty: a.qty,
        refundUnitPrice: a.price.toFixed(2),
      };
    });
    setRefundStates(newStates);
  };

  const totalRefund = useMemo(() => {
    let sum = 0;
    aggregated.forEach(a => {
      const st = refundStates[a.productId];
      if (st) sum += st.returnQty * (parseFloat(st.refundUnitPrice) || 0);
    });
    return sum;
  }, [aggregated, refundStates]);

  const handleConfirm = async () => {
    const lines: RefundLine[] = aggregated.map(a => {
      const st = refundStates[a.productId];
      return {
        productId: a.productId,
        productName: a.productName,
        returnQty: st?.returnQty ?? 0,
        refundUnitPrice: parseFloat(st?.refundUnitPrice ?? '0') || 0,
      };
    }).filter(l => l.returnQty > 0);
    if (lines.length === 0) return;
    await onConfirm(lines);
    onClose();
  };

  const disableConfirm = totalRefund <= 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <Text style={s.modalTitle}>Refund PurchaseOrder</Text>
          <Pressable onPress={handleFull} style={s.fullRefundBtn}>
            <Text style={s.fullRefundBtnText}>Full Refund</Text>
          </Pressable>
          <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
            {aggregated.map(a => {
              const st = getState(a.productId, a.qty, a.price);
              return (
                <View key={a.productId} style={s.refundItemRow}>
                  <Text style={s.refundItemName}>{a.productName}</Text>
                  <Text style={s.refundItemSub}>Original: {a.qty} × ৳{a.price.toFixed(2)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable onPress={() => updateState(a.productId, { returnQty: Math.max(0, (st.returnQty ?? 0) - 1) })} style={s.qtyBtn}>
                      <Text style={{ fontSize: 16 }}>−</Text>
                    </Pressable>
                    <Text style={{ fontFamily: 'InterBold', minWidth: 22, textAlign: 'center' }}>{st.returnQty}</Text>
                    <Pressable onPress={() => updateState(a.productId, { returnQty: Math.min(a.qty, (st.returnQty ?? 0) + 1) })} style={s.qtyBtn}>
                      <Text style={{ fontSize: 16 }}>+</Text>
                    </Pressable>
                    <TextInput
                      style={s.refundPriceInput}
                      value={st.refundUnitPrice}
                      onChangeText={v => updateState(a.productId, { refundUnitPrice: v })}
                      inputMode="decimal"
                      placeholder="0.00"
                      placeholderTextColor="#aaa"
                    />
                    <Text style={{ minWidth: 60, textAlign: 'right' }}>৳{((st.returnQty ?? 0) * (parseFloat(st.refundUnitPrice) || 0)).toFixed(2)}</Text>
                  </View>
                </View>
              );
            })}
            <View style={s.summaryRow}>
              <Text style={s.summaryKey}>Total Refund</Text>
              <Text style={[s.summaryVal, { color: '#dc2626' }]}>৳{totalRefund.toFixed(2)}</Text>
            </View>
          </ScrollView>
          <View style={s.modalActions}>
            <Pressable onPress={onClose} style={s.cancelBtn}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleConfirm} style={s.confirmBtn} disabled={disableConfirm}>
              <Text style={s.confirmBtnText}>Confirm Refund</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EditModal({ visible, onClose, order, items, onConfirm }: { visible: boolean; onClose: () => void; order: PurchaseOrder; items: PurchaseOrderItem[]; onConfirm: (params: { items: { id: string; quantity: number; unitPrice: number }[]; discountType: 'flat' | 'percent' | null; discountValue: number; totalAmount: number }) => Promise<void> }) {
  const positiveItems = useMemo(() => items.filter(i => i.quantity > 0), [items]);
  const [editItems, setEditItems] = useState(positiveItems.map(i => ({ id: i.id, productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice.toFixed(2) })));
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>((order.discountType as 'flat' | 'percent') ?? 'flat');
  const [discountValue, setDiscountValue] = useState(order.discountValue?.toString() ?? '0');
  const [loading, setLoading] = useState(false);

  const subtotal = editItems.reduce((sum, i) => sum + i.quantity * (parseFloat(i.unitPrice) || 0), 0);
  const dv = parseFloat(discountValue) || 0;
  const discountAmount = discountType === 'percent' ? subtotal * (dv / 100) : Math.min(dv, subtotal);
  const total = Math.max(0, subtotal - discountAmount);

  const updateItem = (id: string, partial: Partial<{ quantity: number; unitPrice: string }>) => {
    setEditItems(prev => prev.map(it => (it.id === id ? { ...it, ...partial } : it)));
  };

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm({
      items: editItems.map(i => ({ id: i.id, quantity: i.quantity, unitPrice: parseFloat(i.unitPrice) || 0 })),
      discountType,
      discountValue: dv,
      totalAmount: total,
    });
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Edit PurchaseOrder</Text>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
              {editItems.map(item => (
                <View key={item.id} style={s.editItemRow}>
                  <Text style={s.itemName}>{item.productId}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable style={s.qtyBtn} onPress={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}>
                      <Text style={{ fontSize: 16 }}>−</Text>
                    </Pressable>
                    <Text style={{ fontFamily: 'InterBold', minWidth: 22, textAlign: 'center' }}>{item.quantity}</Text>
                    <Pressable style={s.qtyBtn} onPress={() => updateItem(item.id, { quantity: item.quantity + 1 })}>
                      <Text style={{ fontSize: 16 }}>+</Text>
                    </Pressable>
                    <TextInput
                      style={s.refundPriceInput}
                      value={item.unitPrice}
                      onChangeText={v => updateItem(item.id, { unitPrice: v })}
                      inputMode="decimal"
                      placeholder="0.00"
                      placeholderTextColor="#aaa"
                    />
                  </View>
                </View>
              ))}
              <View style={s.card}>
                <Text style={s.cardTitle}>Discount</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <Pressable onPress={() => setDiscountType('flat')} style={[s.discountTab, discountType === 'flat' && s.discountTabActive]}>
                    <Text style={[s.discountTabText, discountType === 'flat' && { color: '#fff' }]}>৳ Flat</Text>
                  </Pressable>
                  <Pressable onPress={() => setDiscountType('percent')} style={[s.discountTab, discountType === 'percent' && s.discountTabActive]}>
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
                  <Text style={s.summaryKey}>Subtotal</Text>
                  <Text style={s.summaryVal}>৳{subtotal.toFixed(2)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={s.summaryKey}>Discount</Text>
                  <Text style={s.summaryVal}>-৳{discountAmount.toFixed(2)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8, marginTop: 4 }}>
                  <Text style={s.summaryKey}>Total</Text>
                  <Text style={s.summaryVal}>৳{total.toFixed(2)}</Text>
                </View>
              </View>
            </ScrollView>
            <View style={s.modalActions}>
              <Pressable onPress={onClose} style={s.cancelBtn} disabled={loading}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleConfirm} style={s.confirmBtn} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmBtnText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// PurchaseOrderDetailItem
// -----------------------------------------------------------------------------
const PurchaseOrderDetailItem = withObservables(['item'], ({ item }: { item: PurchaseOrderItem }) => ({
  item: item.observe(),
  product: item.product.observe(),
}))(({ item, product }: any) => {
  if (item.quantity <= 0) return null;
  const total = item.quantity * item.unitPrice;
  return (
    <View style={s.itemRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.itemName}>{product?.name ?? item.productId}</Text>
        <Text style={s.itemSub}>{item.quantity} × ৳{item.unitPrice.toFixed(2)}</Text>
      </View>
      <Text style={s.itemTotal}>৳{total.toFixed(2)}</Text>
    </View>
  );
});

// -----------------------------------------------------------------------------
// Main Detail Screen
// -----------------------------------------------------------------------------
function PurchaseOrderDetail({ order, supplier, items, transactions }: { order: PurchaseOrder; supplier: Supplier; items: PurchaseOrderItem[]; transactions: TransactionModel[] }) {
  const router = useRouter();
  const { isOnline } = useOnline();

  const [payVisible, setPayVisible] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [refundVisible, setRefundVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [paybackVisible, setPaybackVisible] = useState(false);

  const paidAmount = transactions.reduce((sum, t) => sum + (t.type === 'payment' ? Number(t.amount) : 0), 0);
  const refundedAmount = transactions.reduce((sum, t) => sum + (t.type === 'refund' ? Number(t.amount) : 0), 0);
  const netPaid = paidAmount - refundedAmount;
  const totalAmt = Number(order.totalAmount) || 0;
  const payable = order.dueAmount ?? (totalAmt - netPaid);
  const statusConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus] ?? PAYMENT_STATUS_CONFIG.unpaid;
  const hasTx = transactions.length > 0;
  const isCanceled = order.status === PurchaseOrderStatus.CANCELED;

  const handlePay = async (amt: number) => await addPurchasePayment(order, amt, isOnline);
  const handleCancel = async () => {
    await cancelPurchaseOrder(order, isOnline);
    router.back();
  };
  const handleRefund = async (lines: RefundLine[]) => await refundPurchaseOrder(order, lines, isOnline);
  const handleEdit = async (params: { items: { id: string; quantity: number; unitPrice: number }[]; discountType: 'flat' | 'percent' | null; discountValue: number; totalAmount: number }) => {
    await editPurchaseOrder(order, params, isOnline);
  };
  const handlePayback = async (returnAmt: number, retained: number) => await issuePurchaseRefundPayment(order, returnAmt, retained, isOnline);
  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={22} color="#111" />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>PurchaseOrder Details</Text>
          <Text style={s.headerSub}>#{order.id.slice(0, 8)}</Text>
        </View>
        {!isCanceled && !hasTx && (
          <Pressable onPress={() => setEditVisible(true)} style={{ padding: 4 }}>
            <Edit2 size={20} color="#111" />
          </Pressable>
        )}
        {(isCanceled || hasTx) && <View style={{ width: 30 }} />}
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Supplier Card */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{supplier?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.supplierName}>{supplier?.name ?? '—'}</Text>
              <Text style={s.orderDate}>{new Date(order.orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Text style={[s.statusText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
            </View>
          </View>
          {isCanceled && (
            <View style={s.canceledBanner}>
              <XCircle size={14} color="#991b1b" />
              <Text style={s.canceledBannerText}>This order was canceled</Text>
            </View>
          )}
        </View>
        {/* Items */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Items</Text>
          {items.map(item => (
            <PurchaseOrderDetailItem key={item.id} item={item} />
          ))}
        </View>
        {/* Payment Summary */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Payment Summary</Text>
          {!!(order.discountType && order.discountValue && order.discountValue > 0) && (
            <View style={s.summaryRow}>
              <Text style={s.summaryKey}>Discount ({order.discountType === 'percent' ? `${order.discountValue}%` : 'Flat'})</Text>
              <Text style={[s.summaryVal, { color: '#065f46' }]}>-৳{order.discountValue?.toFixed(2)}</Text>
            </View>
          )}
          <View style={s.summaryRow}>
            <Text style={s.summaryKey}>Total</Text>
            <Text style={s.summaryVal}>৳{totalAmt.toFixed(2)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryKey}>Paid</Text>
            <Text style={[s.summaryVal, { color: '#065f46' }]}>৳{paidAmount.toFixed(2)}</Text>
          </View>
          {refundedAmount > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryKey}>Refunded</Text>
              <Text style={[s.summaryVal, { color: '#dc2626' }]}>-৳{refundedAmount.toFixed(2)}</Text>
            </View>
          )}
          <View style={[s.summaryRow, { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8, marginTop: 4 }]}>
            <Text style={{ fontFamily: 'InterBold', fontSize: 15, color: '#111' }}>{payable > 0 ? 'Account Payable' : payable < 0 ? 'Account Receivable' : 'Due'}</Text>
            <Text style={{ fontFamily: 'InterBold', fontSize: 15, color: payable > 0 ? '#dc2626' : payable < 0 ? '#065f46' : '#111' }}>
              {payable > 0 ? `৳${payable.toFixed(2)}` : payable < 0 ? `৳${Math.abs(payable).toFixed(2)}` : '৳0.00'}
            </Text>
          </View>
          
        </View>
        
        {/* Action Buttons */}
        <View style={s.actionRow}>
          {payable > 0 && !isCanceled && (
            <Pressable style={s.payBtn} onPress={() => setPayVisible(true)}>
              <Text style={s.payBtnText}>Pay ৳{payable.toFixed(2)}</Text>
            </Pressable>
          )}
          {payable < 0 && !isCanceled && (
            <Pressable style={[s.payBtn, { backgroundColor: '#065f46' }]} onPress={() => setPaybackVisible(true)}>
              <Text style={s.payBtnText}>Receive ৳{Math.abs(payable).toFixed(2)}</Text>
            </Pressable>
          )}
          {!isCanceled && (
            <Pressable style={s.cancelBtn} onPress={() => setCancelVisible(true)}>
              <Text style={s.cancelBtnText}>Cancel Order</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
      {/* Modals */}
      <PayModal visible={payVisible} due={payable} onClose={() => setPayVisible(false)} onPay={handlePay} />
      <PaybackModal visible={paybackVisible} owed={Math.abs(payable)} onClose={() => setPaybackVisible(false)} onConfirm={handlePayback} />
      <CancelModal visible={cancelVisible} onClose={() => setCancelVisible(false)} onConfirm={handleCancel} />
      <RefundModal visible={refundVisible} onClose={() => setRefundVisible(false)} items={items} onConfirm={handleRefund} />
      <EditModal visible={editVisible} onClose={() => setEditVisible(false)} order={order} items={items} onConfirm={handleEdit} />
    </View>
  );
}

// -----------------------------------------------------------------------------
// Observables & Export
// -----------------------------------------------------------------------------
const Enhanced = withObservables(['id'], ({ id }: { id: string }) => {
  const order$ = database.get<PurchaseOrder>('purchase_orders').findAndObserve(id);
  return {
    order: order$,
    // Derive supplier reactively from the order observable so it updates if supplierId changes
    supplier: order$.pipe(switchMap((order: PurchaseOrder) => order.supplier.observe())),
    items: database.get<PurchaseOrderItem>('purchase_order_items').query(Q.where('purchase_order_id', id), Q.where('server_deleted_at', Q.eq(null))).observe(),
    transactions: database.get<TransactionModel>('transactions').query(Q.where('purchase_order_id', id), Q.where('server_deleted_at', Q.eq(null))).observe(),
  };
})(function Loader({ order, supplier, items, transactions }: any) {
  if (!order || !supplier) return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  return <PurchaseOrderDetail order={order} supplier={supplier} items={items} transactions={transactions} />;
});

export default function PurchaseOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Enhanced id={id} />;
}

const s = StyleSheet.create({
  header: { paddingTop: 12, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontSize: 17, fontFamily: 'InterBold', color: '#111' },
  headerSub: { fontSize: 13, fontFamily: 'InterRegular', color: '#6b7280', marginTop: 2 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: 'InterBold', fontSize: 17 },
  supplierName: { fontSize: 16, fontFamily: 'InterBold', color: '#111' },
  orderDate: { fontSize: 13, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 12, fontFamily: 'InterMedium' },
  canceledBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginTop: 12 },
  canceledBannerText: { fontFamily: 'InterMedium', fontSize: 13, color: '#991b1b' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, margin: 12 },
  cardTitle: { fontSize: 14, fontFamily: 'InterMedium', color: '#6b7280', marginBottom: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  itemName: { fontSize: 14, fontFamily: 'InterMedium', color: '#111' },
  itemSub: { fontSize: 12, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 2 },
  itemTotal: { fontSize: 14, fontFamily: 'InterBold', color: '#111' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryKey: { fontSize: 14, fontFamily: 'InterRegular', color: '#374151' },
  summaryVal: { fontSize: 14, fontFamily: 'InterMedium', color: '#111' },
  payBtn: { flex: 1, backgroundColor: '#111827', borderRadius: 10, padding: 12, alignItems: 'center' },
  payBtnText: { color: '#fff', fontFamily: 'InterBold', fontSize: 15 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontFamily: 'InterMedium', color: '#374151' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', margin: 12, gap: 10 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: '#00000055', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontFamily: 'InterBold', color: '#111', marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#6b7280', fontFamily: 'InterRegular', marginBottom: 20 },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 20, fontFamily: 'InterBold', color: '#111', marginBottom: 12 },
  quickLink: { alignSelf: 'flex-start', marginBottom: 20 },
  quickLinkText: { fontSize: 14, color: '#1e40af', fontFamily: 'InterMedium' },
  modalActions: { flexDirection: 'row', gap: 12 },
  confirmBtn: { flex: 1, backgroundColor: '#111827', borderRadius: 10, padding: 12, alignItems: 'center' },
  confirmBtnText: { fontSize: 15, fontFamily: 'InterBold', color: '#fff' },
  // Refund modal specific
  refundItemRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  refundItemName: { fontSize: 14, fontFamily: 'InterMedium', color: '#111' },
  refundItemSub: { fontSize: 12, color: '#9ca3af', fontFamily: 'InterRegular', marginTop: 2 },
  refundPriceInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, fontFamily: 'InterMedium', color: '#111' },
  fullRefundBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 12 },
  fullRefundBtnText: { fontSize: 13, fontFamily: 'InterBold', color: '#dc2626' },
  // Edit modal specific
  editItemRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  discountTab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  discountTabActive: { backgroundColor: '#111827', borderColor: '#111827' },
  discountTabText: { fontSize: 13, fontFamily: 'InterMedium', color: '#374151' },
  discountInput: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', minWidth: 60, fontSize: 14, fontFamily: 'InterMedium', color: '#111', paddingVertical: 2, textAlign: 'center' },
});
