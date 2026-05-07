import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Edit2, XCircle, RotateCcw } from 'lucide-react-native';
import { withObservables } from '@nozbe/watermelondb/react';
import { switchMap } from 'rxjs/operators';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/database';
import PurchaseOrder, { PurchaseOrderStatus, PurchasePaymentStatus } from '@/database/models/PurchaseOrder';
import Product from '@/database/models/Product';
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
  unpaid:            { bg: '#fef3c7', text: '#92400e', label: 'Unpaid' },
  partially_paid:    { bg: '#dbeafe', text: '#1e40af', label: 'Partially Paid' },
  paid:              { bg: '#d1fae5', text: '#065f46', label: 'Paid' },
  refunded:          { bg: '#fee2e2', text: '#991b1b', label: 'Refunded' },
  partially_refunded:{ bg: '#fce7f3', text: '#9d174d', label: 'Partially Refunded' },
};

function formatDateTime(date: Date | number | string): string {
  const d = date instanceof Date ? date : new Date(Number(date));
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// -----------------------------------------------------------------------------
// Hook: resolve product names for a list of productIds
// -----------------------------------------------------------------------------
function useProductNames(productIds: string[]): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = [...new Set(productIds)].sort().join(',');

  useEffect(() => {
    if (!key) return;
    const unique = key.split(',').filter(Boolean);
    database.get<Product>('products')
      .query(Q.where('id', Q.oneOf(unique)))
      .fetch()
      .then((products) => {
        const map: Record<string, string> = {};
        products.forEach(p => { map[p.id] = p.name; });
        setNames(map);
      });
  }, [key]);

  return names;
}

// -----------------------------------------------------------------------------
// Aggregate helpers
// -----------------------------------------------------------------------------
/**
 * Per-product aggregation of all purchase_order_items rows.
 * boughtQty   = Σ positive rows
 * refundedQty = Σ |negative rows|  (already refunded)
 * maxQty      = boughtQty - refundedQty  (remaining refundable)
 * latestPrice = unit price of most-recent positive row
 */
function aggregateRefundable(items: PurchaseOrderItem[]) {
  type Bucket = {
    productId: string;
    boughtQty: number;
    refundedQty: number;
    latestPrice: number;
    latestTimestamp: number;
  };
  const map = new Map<string, Bucket>();

  for (const item of items) {
    const b = map.get(item.productId) ?? {
      productId: item.productId,
      boughtQty: 0,
      refundedQty: 0,
      latestPrice: 0,
      latestTimestamp: 0,
    };
    if (item.quantity > 0) {
      b.boughtQty += item.quantity;
      const ts = item.createdAt instanceof Date ? item.createdAt.getTime() : Number(item.createdAt);
      if (ts >= b.latestTimestamp) { b.latestPrice = item.unitPrice; b.latestTimestamp = ts; }
    } else if (item.quantity < 0) {
      b.refundedQty += Math.abs(item.quantity);
    }
    map.set(item.productId, b);
  }

  return Array.from(map.values())
    .map(b => ({ ...b, maxQty: b.boughtQty - b.refundedQty }))
    .filter(b => b.maxQty > 0);
}

// -----------------------------------------------------------------------------
// Modals
// -----------------------------------------------------------------------------
function PayModal({
                    visible, due, onClose, onPay,
                  }: { visible: boolean; due: number; onClose: () => void; onPay: (amount: number) => Promise<unknown> }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset on open
  useEffect(() => { if (visible) setAmount(''); }, [visible]);

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
              <Pressable onPress={onClose} style={s.secondaryBtn} disabled={loading}>
                <Text style={s.secondaryBtnText}>Cancel</Text>
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

function PaybackModal({
                        visible, owed, onClose, onConfirm,
                      }: { visible: boolean; owed: number; onClose: () => void; onConfirm: (returnAmt: number, retainedProfit: number) => Promise<unknown> }) {
  const [returnAmt, setReturnAmt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (visible) setReturnAmt(owed.toFixed(2)); }, [visible, owed]);

  const handleConfirm = async () => {
    const val = parseFloat(returnAmt);
    if (isNaN(val) || val < 0) { alert('Enter a valid positive amount'); return; }
    if (val > owed) { alert(`Cannot return more than owed ৳${owed.toFixed(2)}`); return; }
    setLoading(true);
    await onConfirm(val, owed - val);
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Receive Money from Supplier</Text>
            <Text style={s.modalSub}>Supplier owes you: ৳{owed.toFixed(2)}</Text>
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
              <Text style={s.quickLinkText}>Receive full ৳{owed.toFixed(2)}</Text>
            </Pressable>
            <View style={s.modalActions}>
              <Pressable onPress={onClose} style={s.secondaryBtn} disabled={loading}>
                <Text style={s.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleConfirm} style={[s.confirmBtn, { backgroundColor: '#065f46' }]} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmBtnText}>Confirm</Text>}
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
          <Text style={s.modalTitle}>Cancel Purchase Order?</Text>
          <Text style={{ fontFamily: 'InterRegular', fontSize: 14, color: '#6b7280', lineHeight: 20 }}>
            This will restore all items to inventory. The order total and payable will be set to zero. This action cannot be undone.
          </Text>
          <View style={s.modalActions}>
            <Pressable onPress={onClose} style={s.secondaryBtn}>
              <Text style={s.secondaryBtnText}>Keep Order</Text>
            </Pressable>
            <Pressable onPress={handle} style={[s.confirmBtn, { backgroundColor: '#dc2626' }]} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmBtnText}>Cancel Order</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// Refund Modal
// Bug fix #3: initialise all states from aggregated when modal opens so
// +/− presses always find an existing entry and never clobber the price.
// -----------------------------------------------------------------------------
type RefundState = {
  returnQty: number;
  refundUnitPrice: string; // kept as string while editing
};

function buildInitialRefundStates(
  aggregated: ReturnType<typeof aggregateRefundable>
): Record<string, RefundState> {
  const states: Record<string, RefundState> = {};
  for (const a of aggregated) {
    states[a.productId] = { returnQty: 0, refundUnitPrice: a.latestPrice.toFixed(2) };
  }
  return states;
}

function RefundModal({
                       visible, onClose, items, onConfirm,
                     }: { visible: boolean; onClose: () => void; items: PurchaseOrderItem[]; onConfirm: (lines: RefundLine[]) => Promise<void> }) {
  const aggregated = useMemo(() => aggregateRefundable(items), [items]);
  const productNames = useProductNames(aggregated.map(a => a.productId));

  // FIX #3: initialise all state upfront on every open so +/- never falls back to price=0
  const [refundStates, setRefundStates] = useState<Record<string, RefundState>>(() =>
    buildInitialRefundStates(aggregated)
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setRefundStates(buildInitialRefundStates(aggregated));
      setLoading(false);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Safe updater — always works from the current committed state
  const updateState = useCallback((productId: string, partial: Partial<RefundState>) => {
    setRefundStates(prev => ({
      ...prev,
      [productId]: { ...prev[productId], ...partial },
    }));
  }, []);

  const handleFullRefund = () => {
    setRefundStates(prev => {
      const next = { ...prev };
      for (const a of aggregated) {
        next[a.productId] = { ...prev[a.productId], returnQty: a.maxQty };
      }
      return next;
    });
  };

  const totalRefund = useMemo(() =>
      aggregated.reduce((sum, a) => {
        const st = refundStates[a.productId];
        return sum + (st ? st.returnQty * (parseFloat(st.refundUnitPrice) || 0) : 0);
      }, 0),
    [aggregated, refundStates]);

  const handleConfirm = async () => {
    const lines: RefundLine[] = aggregated
      .map(a => {
        const st = refundStates[a.productId];
        return {
          productId: a.productId,
          productName: productNames[a.productId] ?? a.productId,
          returnQty: st?.returnQty ?? 0,
          refundUnitPrice: parseFloat(st?.refundUnitPrice ?? '0') || 0,
        };
      })
      .filter(l => l.returnQty > 0);
    if (lines.length === 0) return;
    setLoading(true);
    await onConfirm(lines);
    // modal closes itself after onConfirm — parent calls onClose
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalSheet, { maxHeight: '92%' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={s.modalTitle}>Refund Order</Text>
            <Pressable onPress={handleFullRefund} style={s.fullRefundBtn}>
              <Text style={s.fullRefundBtnText}>Full Refund</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            {aggregated.map(a => {
              const st = refundStates[a.productId] ?? { returnQty: 0, refundUnitPrice: a.latestPrice.toFixed(2) };
              const lineTotal = st.returnQty * (parseFloat(st.refundUnitPrice) || 0);
              const productName = productNames[a.productId] ?? a.productId;

              return (
                <View key={a.productId} style={s.refundItemRow}>
                  <Text style={s.refundItemName}>{productName}</Text>
                  <Text style={s.refundItemSub}>
                    Purchased: {a.boughtQty}{a.refundedQty > 0 ? `  ·  Already refunded: ${a.refundedQty}  ·  Remaining: ${a.maxQty}` : ''}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    {/* Qty stepper */}
                    <Pressable
                      onPress={() => updateState(a.productId, { returnQty: Math.max(0, st.returnQty - 1) })}
                      style={s.qtyBtn}
                    >
                      <Text style={{ fontSize: 16 }}>−</Text>
                    </Pressable>
                    <TextInput
                      style={[s.smallInput, { minWidth: 36, textAlign: 'center' }]}
                      value={String(st.returnQty)}
                      onChangeText={v => {
                        const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
                        updateState(a.productId, { returnQty: isNaN(n) ? 0 : Math.min(a.maxQty, Math.max(0, n)) });
                      }}
                      inputMode="numeric"
                    />
                    <Pressable
                      onPress={() => updateState(a.productId, { returnQty: Math.min(a.maxQty, st.returnQty + 1) })}
                      style={s.qtyBtn}
                    >
                      <Text style={{ fontSize: 16 }}>+</Text>
                    </Pressable>

                    <Text style={{ color: '#9ca3af', fontSize: 13 }}>×</Text>

                    {/* Unit price — edits don't touch returnQty at all */}
                    <TextInput
                      style={[s.smallInput, { minWidth: 70 }]}
                      value={st.refundUnitPrice}
                      onChangeText={v => updateState(a.productId, { refundUnitPrice: v })}
                      inputMode="decimal"
                      placeholder="0.00"
                      placeholderTextColor="#aaa"
                    />

                    <Text style={{ flex: 1, textAlign: 'right', fontFamily: 'InterMedium', fontSize: 14, color: '#dc2626' }}>
                      ৳{lineTotal.toFixed(2)}
                    </Text>
                  </View>
                </View>
              );
            })}

            <View style={[s.summaryRow, { borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 8, paddingTop: 10 }]}>
              <Text style={{ fontFamily: 'InterBold', fontSize: 15, color: '#111' }}>Total Refund</Text>
              <Text style={{ fontFamily: 'InterBold', fontSize: 15, color: '#dc2626' }}>৳{totalRefund.toFixed(2)}</Text>
            </View>
          </ScrollView>

          <View style={[s.modalActions, { marginTop: 16 }]}>
            <Pressable onPress={onClose} style={s.secondaryBtn} disabled={loading}>
              <Text style={s.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={[s.confirmBtn, { backgroundColor: '#dc2626', opacity: totalRefund <= 0 ? 0.4 : 1 }]}
              disabled={totalRefund <= 0 || loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.confirmBtnText}>Confirm Refund</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// Edit modal
// -----------------------------------------------------------------------------
function EditModal({
                     visible, onClose, order, items, onConfirm,
                   }: {
  visible: boolean;
  onClose: () => void;
  order: PurchaseOrder;
  items: PurchaseOrderItem[];
  onConfirm: (params: {
    items: { id: string; quantity: number; unitPrice: number }[];
    discountType: 'flat' | 'percent' | null;
    discountValue: number;
    totalAmount: number;
  }) => Promise<void>;
}) {
  const positiveItems = useMemo(() => items.filter(i => i.quantity > 0), [items]);
  const [editItems, setEditItems] = useState(
    positiveItems.map(i => ({ id: i.id, productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice.toFixed(2) }))
  );
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>((order.discountType as 'flat' | 'percent') ?? 'flat');
  const [discountValue, setDiscountValue] = useState(order.discountValue?.toString() ?? '0');
  const [loading, setLoading] = useState(false);

  const productNames = useProductNames(editItems.map(i => i.productId));

  const subtotal = editItems.reduce((sum, i) => sum + i.quantity * (parseFloat(i.unitPrice) || 0), 0);
  const dv = parseFloat(discountValue) || 0;
  const discountAmount = discountType === 'percent' ? subtotal * (dv / 100) : Math.min(dv, subtotal);
  const total = Math.max(0, subtotal - discountAmount);

  const updateItem = (id: string, partial: Partial<{ quantity: number; unitPrice: string }>) =>
    setEditItems(prev => prev.map(it => it.id === id ? { ...it, ...partial } : it));

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
            <Text style={s.modalTitle}>Edit Purchase Order</Text>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
              {editItems.map(item => (
                <View key={item.id} style={s.editItemRow}>
                  <Text style={s.itemName}>{productNames[item.productId] ?? item.productId}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <Pressable style={s.qtyBtn} onPress={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}>
                      <Text style={{ fontSize: 16 }}>−</Text>
                    </Pressable>
                    <Text style={{ fontFamily: 'InterBold', minWidth: 22, textAlign: 'center' }}>{item.quantity}</Text>
                    <Pressable style={s.qtyBtn} onPress={() => updateItem(item.id, { quantity: item.quantity + 1 })}>
                      <Text style={{ fontSize: 16 }}>+</Text>
                    </Pressable>
                    <TextInput
                      style={s.smallInput}
                      value={item.unitPrice}
                      onChangeText={v => updateItem(item.id, { unitPrice: v })}
                      inputMode="decimal"
                      placeholder="0.00"
                      placeholderTextColor="#aaa"
                    />
                  </View>
                </View>
              ))}
              <View style={[s.card, { margin: 0, marginTop: 12 }]}>
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
                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Subtotal</Text>
                  <Text style={s.summaryVal}>৳{subtotal.toFixed(2)}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Discount</Text>
                  <Text style={s.summaryVal}>-৳{discountAmount.toFixed(2)}</Text>
                </View>
                <View style={[s.summaryRow, { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8, marginTop: 4 }]}>
                  <Text style={{ fontFamily: 'InterBold', fontSize: 15, color: '#111' }}>Total</Text>
                  <Text style={{ fontFamily: 'InterBold', fontSize: 15, color: '#111' }}>৳{total.toFixed(2)}</Text>
                </View>
              </View>
            </ScrollView>
            <View style={s.modalActions}>
              <Pressable onPress={onClose} style={s.secondaryBtn} disabled={loading}>
                <Text style={s.secondaryBtnText}>Cancel</Text>
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
// Bug fix #1: show ALL items including negative-qty refund rows
// -----------------------------------------------------------------------------
const PurchaseOrderDetailItem = withObservables(['item'], ({ item }: { item: PurchaseOrderItem }) => ({
  item: item.observe(),
  product: item.product.observe(),
}))(({ item, product }: any) => {
  const isRefund = item.quantity < 0;
  const absQty = Math.abs(item.quantity);
  const total = absQty * item.unitPrice;

  return (
    <View style={[s.itemRow, isRefund && { backgroundColor: '#fff5f5' }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isRefund && (
            <View style={{ backgroundColor: '#fee2e2', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 10, fontFamily: 'InterBold', color: '#dc2626' }}>REFUND</Text>
            </View>
          )}
          <Text style={[s.itemName, isRefund && { color: '#dc2626' }]}>
            {product?.name ?? item.productId}
          </Text>
        </View>
        <Text style={[s.itemSub, isRefund && { color: '#f87171' }]}>
          {isRefund ? '−' : ''}{absQty} × ৳{item.unitPrice.toFixed(2)}
        </Text>
      </View>
      <Text style={[s.itemTotal, isRefund && { color: '#dc2626' }]}>
        {isRefund ? '−' : ''}৳{total.toFixed(2)}
      </Text>
    </View>
  );
});

// -----------------------------------------------------------------------------
// TransactionRow — shows one transaction in the activity list
// -----------------------------------------------------------------------------
function TransactionRow({ tx }: { tx: TransactionModel }) {
  const isRefund = tx.type === 'refund';
  const label = isRefund ? 'Refund received' : 'Payment made';
  const dateStr = formatDateTime(tx.paymentDate ?? tx.createdAt);

  return (
    <View style={[s.txRow, isRefund ? s.txRowRefund : s.txRowPayment]}>
      <View style={[s.txDot, { backgroundColor: isRefund ? '#dc2626' : '#16a34a' }]} />
      <View style={{ flex: 1 }}>
        <Text style={[s.txLabel, { color: isRefund ? '#dc2626' : '#16a34a' }]}>{label}</Text>
        <Text style={s.txDate}>{dateStr}</Text>
      </View>
      <Text style={[s.txAmount, { color: isRefund ? '#dc2626' : '#16a34a' }]}>
        {isRefund ? '+' : '−'}৳{Number(tx.amount).toFixed(2)}
      </Text>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Main Detail Screen
// -----------------------------------------------------------------------------
function PurchaseOrderDetail({
                               order, supplier, items, transactions,
                             }: { order: PurchaseOrder; supplier: Supplier; items: PurchaseOrderItem[]; transactions: TransactionModel[] }) {
  const router = useRouter();
  const { isOnline } = useOnline();

  const [payVisible, setPayVisible] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [refundVisible, setRefundVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [paybackVisible, setPaybackVisible] = useState(false);

  const paidAmount = transactions.reduce((sum, t) => sum + (t.type === 'payment' ? Number(t.amount) : 0), 0);
  const refundedAmount = transactions.reduce((sum, t) => sum + (t.type === 'refund' ? Number(t.amount) : 0), 0);
  const totalAmt = Number(order.totalAmount) || 0;
  const payable = Number(order.dueAmount) ?? (totalAmt - (paidAmount - refundedAmount));
  const statusConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus] ?? PAYMENT_STATUS_CONFIG.unpaid;

  // Hide edit icon once ANY transaction exists
  const hasTx = transactions.length > 0;
  const isCanceled = order.status === PurchaseOrderStatus.CANCELED;
  const hasRefundableItems = useMemo(() => aggregateRefundable(items).length > 0, [items]);

  // Sort transactions newest-first for the activity feed
  const sortedTx = useMemo(() =>
      [...transactions].sort((a, b) => {
        const ta = a.paymentDate instanceof Date ? a.paymentDate.getTime() : Number(a.paymentDate ?? a.createdAt);
        const tb = b.paymentDate instanceof Date ? b.paymentDate.getTime() : Number(b.paymentDate ?? b.createdAt);
        return tb - ta;
      }),
    [transactions]);

  const handlePay = async (amt: number) => { await addPurchasePayment(order, amt, isOnline); };
  const handleCancel = async () => { await cancelPurchaseOrder(order, isOnline); router.back(); };
  const handleRefund = async (lines: RefundLine[]) => { await refundPurchaseOrder(order, lines, isOnline); };
  const handleEdit = async (params: {
    items: { id: string; quantity: number; unitPrice: number }[];
    discountType: 'flat' | 'percent' | null;
    discountValue: number;
    totalAmount: number;
  }) => { await editPurchaseOrder(order, params, isOnline); };
  const handlePayback = async (returnAmt: number, retained: number) =>
    await issuePurchaseRefundPayment(order, returnAmt, retained, isOnline);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={22} color="#111" />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Purchase Order Details</Text>
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
              <Text style={s.orderDate}>
                {new Date(order.orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
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

        {/* Items — shows both purchase rows (positive) and refund rows (negative) */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Items</Text>
          {items.length === 0
            ? <Text style={s.emptyText}>No items</Text>
            : items.map(item => <PurchaseOrderDetailItem key={item.id} item={item} />)
          }
        </View>

        {/* Payment Summary */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Payment Summary</Text>
          {!!(order.discountType && order.discountValue && order.discountValue > 0) && (
            <View style={s.summaryRow}>
              <Text style={s.summaryKey}>
                Discount ({order.discountType === 'percent' ? `${order.discountValue}%` : 'Flat'})
              </Text>
              <Text style={[s.summaryVal, { color: '#065f46' }]}>-৳{order.discountValue?.toFixed(2)}</Text>
            </View>
          )}
          <View style={s.summaryRow}>
            <Text style={s.summaryKey}>Order Total</Text>
            <Text style={s.summaryVal}>৳{totalAmt.toFixed(2)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryKey}>Paid</Text>
            <Text style={[s.summaryVal, { color: '#16a34a' }]}>৳{paidAmount.toFixed(2)}</Text>
          </View>
          {refundedAmount > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryKey}>Cash refunded</Text>
              <Text style={[s.summaryVal, { color: '#dc2626' }]}>+৳{refundedAmount.toFixed(2)}</Text>
            </View>
          )}
          <View style={[s.summaryRow, { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8, marginTop: 4 }]}>
            <Text style={{ fontFamily: 'InterBold', fontSize: 15, color: '#111' }}>
              {payable > 0 ? 'Account Payable' : payable < 0 ? 'Account Receivable' : 'Settled'}
            </Text>
            <Text style={{ fontFamily: 'InterBold', fontSize: 15, color: payable > 0 ? '#dc2626' : payable < 0 ? '#16a34a' : '#111' }}>
              {payable !== 0 ? `৳${Math.abs(payable).toFixed(2)}` : '৳0.00'}
            </Text>
          </View>
        </View>

        {/* Transaction Activity — Bug fix #2 */}
        {sortedTx.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Transaction History</Text>
            {sortedTx.map(tx => <TransactionRow key={tx.id} tx={tx} />)}
          </View>
        )}

        {/* Action Buttons */}
        <View style={s.actionRow}>
          {payable > 0 && !isCanceled && (
            <Pressable style={s.payBtn} onPress={() => setPayVisible(true)}>
              <Text style={s.payBtnText}>৳{payable.toFixed(2)}</Text>
              <Text style={s.payBtnText}>Pay</Text>
            </Pressable>
          )}
          {payable < 0 && !isCanceled && (
            <Pressable style={[s.payBtn, { backgroundColor: '#16a34a' }]} onPress={() => setPaybackVisible(true)}>
              <Text style={s.payBtnText}>৳{Math.abs(payable).toFixed(2)}</Text>
              <Text style={s.payBtnText}>Receive</Text>
            </Pressable>
          )}
          {!isCanceled && hasRefundableItems && (
            <Pressable style={s.refundActionBtn} onPress={() => setRefundVisible(true)}>
              <RotateCcw size={14} color="#92400e" />
              <Text style={s.refundActionBtnText}>Refund Items</Text>
            </Pressable>
          )}
          {!isCanceled && (
            <Pressable style={s.secondaryBtn} onPress={() => setCancelVisible(true)}>
              <Text style={s.secondaryBtnText}>Cancel Order</Text>
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
// Observables & Export — Bug fix #4:
// withObservables queries are reactive; any DB write (payment, refund) instantly
// pushes new rows into items/transactions, which flow into PurchaseOrderDetail
// as updated props without any manual refresh needed.
// -----------------------------------------------------------------------------
const Enhanced = withObservables(['id'], ({ id }: { id: string }) => {
  const order$ = database.get<PurchaseOrder>('purchase_orders').findAndObserve(id);
  return {
    order: order$,
    supplier: order$.pipe(switchMap((order: PurchaseOrder) => order.supplier.observe())),
    // All items including negative-qty refund rows — sorted purchase-first then refunds
    items: database.get<PurchaseOrderItem>('purchase_order_items')
      .query(
        Q.where('purchase_order_id', id),
        Q.where('server_deleted_at', Q.eq(null)),
        Q.sortBy('created_at', Q.asc),
      )
      .observe(),
    transactions: database.get<TransactionModel>('transactions')
      .query(
        Q.where('purchase_order_id', id),
        Q.where('server_deleted_at', Q.eq(null)),
      )
      .observe(),
  };
})(function Loader({ order, supplier, items, transactions }: any) {
  if (!order || !supplier) return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  return <PurchaseOrderDetail order={order} supplier={supplier} items={items} transactions={transactions} />;
});

export default function PurchaseOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Enhanced id={id} />;
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const s = StyleSheet.create({
  // Layout
  header: { paddingTop: 12, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontSize: 17, fontFamily: 'InterBold', color: '#111' },
  headerSub: { fontSize: 13, fontFamily: 'InterRegular', color: '#6b7280', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, margin: 12 },
  cardTitle: { fontSize: 13, fontFamily: 'InterMedium', color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyText: { fontSize: 13, color: '#9ca3af', fontFamily: 'InterRegular', paddingVertical: 8 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', margin: 12, gap: 10 },

  // Supplier card
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: 'InterBold', fontSize: 17 },
  supplierName: { fontSize: 16, fontFamily: 'InterBold', color: '#111' },
  orderDate: { fontSize: 13, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 12, fontFamily: 'InterMedium' },
  canceledBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginTop: 12 },
  canceledBannerText: { fontFamily: 'InterMedium', fontSize: 13, color: '#991b1b' },

  // Item rows
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', borderRadius: 6 },
  itemName: { fontSize: 14, fontFamily: 'InterMedium', color: '#111' },
  itemSub: { fontSize: 12, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 2 },
  itemTotal: { fontSize: 14, fontFamily: 'InterBold', color: '#111' },

  // Transaction history — Bug fix #2
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 10 },
  txRowPayment: { },
  txRowRefund: { },
  txDot: { width: 8, height: 8, borderRadius: 4 },
  txLabel: { fontSize: 14, fontFamily: 'InterMedium' },
  txDate: { fontSize: 12, color: '#9ca3af', fontFamily: 'InterRegular', marginTop: 1 },
  txAmount: { fontSize: 14, fontFamily: 'InterBold' },

  // Summary
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  summaryKey: { fontSize: 14, fontFamily: 'InterRegular', color: '#374151' },
  summaryVal: { fontSize: 14, fontFamily: 'InterMedium', color: '#111' },

  // Buttons
  payBtn: { flex: 1, justifyContent: 'center', backgroundColor: '#111827', borderRadius: 10, padding: 12, alignItems: 'center', minWidth: 120 },
  payBtnText: { color: '#fff', fontFamily: 'InterBold', fontSize: 15, textAlign: 'center' },
  secondaryBtn: { flex: 1, justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, alignItems: 'center', minWidth: 100 },
  secondaryBtnText: { fontSize: 15, fontFamily: 'InterMedium', color: '#374151', textAlign: 'center' },
  refundActionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fef3c7', borderRadius: 10, padding: 12, minWidth: 110 },
  refundActionBtnText: { fontSize: 15, fontFamily: 'InterBold', color: '#92400e', textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#00000055', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontFamily: 'InterBold', color: '#111', marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#6b7280', fontFamily: 'InterRegular', marginBottom: 20 },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 20, fontFamily: 'InterBold', color: '#111', marginBottom: 12 },
  quickLink: { alignSelf: 'flex-start', marginBottom: 20 },
  quickLinkText: { fontSize: 14, color: '#1e40af', fontFamily: 'InterMedium' },
  modalActions: { flexDirection: 'row', gap: 12 },
  confirmBtn: { flex: 1, backgroundColor: '#111827', borderRadius: 10, padding: 12, alignItems: 'center' },
  confirmBtnText: { fontSize: 15, fontFamily: 'InterBold', color: '#fff', textAlign: 'center' },

  // Refund modal
  refundItemRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  refundItemName: { fontSize: 14, fontFamily: 'InterMedium', color: '#111' },
  refundItemSub: { fontSize: 12, color: '#9ca3af', fontFamily: 'InterRegular', marginTop: 2 },
  fullRefundBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  fullRefundBtnText: { fontSize: 13, fontFamily: 'InterBold', color: '#dc2626' },
  smallInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, fontSize: 14, fontFamily: 'InterMedium', color: '#111' },

  // Edit modal
  editItemRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  discountTab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  discountTabActive: { backgroundColor: '#111827', borderColor: '#111827' },
  discountTabText: { fontSize: 13, fontFamily: 'InterMedium', color: '#374151' },
  discountInput: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', minWidth: 60, fontSize: 14, fontFamily: 'InterMedium', color: '#111', paddingVertical: 2, textAlign: 'center' },
});
