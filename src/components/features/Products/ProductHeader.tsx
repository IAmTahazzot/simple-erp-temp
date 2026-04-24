// src/components/features/Products/ProductHeader.tsx

import {
  Package, Layers, Archive,
  ClipboardList, ArrowLeftRight, Gift, ScanBarcode,
  CirclePlus
} from 'lucide-react-native';
import {DropdownNavigation, NavLink} from '@/components/ui/DropdownNavigation';
import {Text, View, StyleSheet} from 'react-native';
import {Button} from '@/components/ui/Button';
import {useRouter} from 'expo-router';
import {useState} from 'react';
import {NewProductModal} from '@/components/features/Products/NewProduct';

const ICON_SIZE = 22;
const ICON_COLOR = '#111827';

const NAV_LINKS: NavLink[][] = [
  [
    {
      label: 'Products',
      href: '/products',
      icon: <Package size={ICON_SIZE} color={ICON_COLOR} strokeWidth={1.6}/>
    },
    {
      label: 'Inventory',
      href: '/products/inventory',
      icon: <Archive size={ICON_SIZE} color={ICON_COLOR} strokeWidth={1.6}/>
    },
    {
      label: 'Purchase orders',
      href: '/products/purchaseOrder',
      icon: <ClipboardList size={ICON_SIZE} color={ICON_COLOR} strokeWidth={1.6}/>
    },
  ]
];

export function ProductHeader() {
  const [isProductModelVisible, setIsProductModelVisible] = useState(false);
  const [activeLink, setActiveLink] = useState<NavLink>(NAV_LINKS[0][0]);

  const handleOnLinkChange = (link: NavLink) => {
    setActiveLink(link);
  }

  return (
    <View style={styles.header}>
      <DropdownNavigation links={NAV_LINKS} onChange={handleOnLinkChange}/>
      {/* ...rest of your header (back button, actions, etc.) */}

      {['/products', '/products/purchaseOrder'].includes(activeLink.href) &&
        <Button size={'icon'}
                rightIcon={<CirclePlus size={18} color={'#fff'} strokeWidth={2}/>}
                onPress={() => {
                  // let's open new modal for new product        creation
                  setIsProductModelVisible(true);
                }}
                variant={'ghost'}/>}

      <NewProductModal visible={isProductModelVisible}
                       onClose={() => {
                         setIsProductModelVisible(false);
                       }}/>
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
    justifyContent: 'space-between'
  },
});
