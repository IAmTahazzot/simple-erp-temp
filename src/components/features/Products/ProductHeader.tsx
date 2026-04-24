// src/components/features/Products/ProductHeader.tsx

import {
  Package, Layers, Archive,
  ClipboardList, ArrowLeftRight, Gift, ScanBarcode,
} from 'lucide-react-native';
import { DropdownNavigation } from '@/components/ui/DropdownNavigation';
import { View, StyleSheet } from 'react-native';

const ICON_SIZE = 22;
const ICON_COLOR = '#111827';

const NAV_LINKS = [
  [
    { label: 'Products',        href: '/products',        icon: <Package        size={ICON_SIZE} color={ICON_COLOR} strokeWidth={1.6} /> },
    { label: 'Collections',     href: '/collections',     icon: <Layers         size={ICON_SIZE} color={ICON_COLOR} strokeWidth={1.6} /> },
    { label: 'Inventory',       href: '/products/inventory',       icon: <Archive        size={ICON_SIZE} color={ICON_COLOR} strokeWidth={1.6} /> },
    { label: 'Purchase orders', href: '/products/purchase-orders', icon: <ClipboardList  size={ICON_SIZE} color={ICON_COLOR} strokeWidth={1.6} /> },
    { label: 'Transfers',       href: '/products/transfers',       icon: <ArrowLeftRight size={ICON_SIZE} color={ICON_COLOR} strokeWidth={1.6} /> },
    { label: 'Gift cards',      href: '/products/gift-cards',      icon: <Gift           size={ICON_SIZE} color={ICON_COLOR} strokeWidth={1.6} /> },
  ],
  [
    { label: 'Scan inventory',  href: '/products/scan-inventory',  icon: <ScanBarcode    size={ICON_SIZE} color={ICON_COLOR} strokeWidth={1.6} /> },
  ],
];

export function ProductHeader() {
  return (
    <View style={styles.header}>
      <DropdownNavigation links={NAV_LINKS} />
      {/* ...rest of your header (back button, actions, etc.) */}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
