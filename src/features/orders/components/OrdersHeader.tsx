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
import {NewProductModal} from '../../products/components/NewProduct';
import {NewContact} from '@/features/contacts/components/NewContact';

const ICON_SIZE = 22;
const ICON_COLOR = '#111827';

export function OrdersHeader() {
  const [isContactModelVisible, setIsContactModelVisible] = useState(false);
  const router = useRouter()
  
  return (
    <View style={styles.header}>
      {/*<DropdownNavigation links={NAV_LINKS} onChange={handleOnLinkChange}/>*/}
      {/* ...rest of your header (back button, actions, etc.) */}
      <Text style={{
        fontSize: 20,
        fontFamily: 'InterBold',
        color: '#ffffff',
        letterSpacing: -0.1,
      }}>
        Orders
      </Text>

      <Button size={'icon'}
              rightIcon={<CirclePlus size={18} color={'#fff'} strokeWidth={2}/>}
              onPress={() => {
                // let's open new modal for new product        creation
                // setIsContactModelVisible(true);
                router.push('/orders/new')
              }}
              variant={'ghost'}/>

      {/*<NewContact visible={isContactModelVisible}*/}
      {/*            onClose={() => {*/}
      {/*              setIsContactModelVisible(false);*/}
      {/*            }}/>*/}
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
