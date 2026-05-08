import React, {useState, useEffect} from 'react';
import {View, Text, TextInput, StyleSheet, ToastAndroid} from 'react-native';
import {BaseModal} from '@/components/core/BaseModal';
import {MegaInput} from '@/components/ui/Input';
import {Colors, Themes} from '@/constants/colors';
import {useCommonTranslation} from '@/i18n/useTypedTranslation';
import Product from '@/database/models/Product';
import {updateProduct, deleteProduct} from '@/features/products/functions';
import NetInfo from '@react-native-community/netinfo';
import {Button} from '@/components/ui/Button';
import {AlertDialog} from '@/components/ui/AlertDialog';
import {useOnline} from '@/hooks/use-online';

interface UpdateProductProps {
  visible: boolean;
  onClose: () => void;
  prevProduct: Product | null;
}

export function UpdateProduct({visible, onClose, prevProduct}: UpdateProductProps) {
  const {t} = useCommonTranslation();

  const [inventory, setInventory] = useState<number>(0);
  const [stockWarning, setStockWarning] = useState<number>(0);
  const [shouldDelete, setShouldDelete] = useState(false);
  const {isOnline} = useOnline()

  const [product, setProduct] = useState({
    name: '',
    price: '0',
    cost: '0',
    description: '',
  });

  // Fetch existing image + inventory when modal opens
  useEffect(() => {
    if (!visible || !prevProduct) return;

    setProduct({
      name: prevProduct.name,
      price: prevProduct.price.toString(),
      cost: prevProduct.cost.toString(),
      description: prevProduct.description || '',
    });

    prevProduct.inventories.fetch().then((invs) => {
      setInventory(invs[0]?.quantity ?? 0);
      setStockWarning(invs[0]?.lowStockThreshold ?? 0);
    });
  }, [visible, prevProduct]);

  const price = parseFloat(product.price) || 0;
  const cost = parseFloat(product.cost) || 0;

  const profit = Number((price - cost).toFixed(2));
  const isValidCalculation = !isNaN(profit) && price > 0 && cost >= 0;

  const handleUpdate = async () => {
    if (!prevProduct) return;

    const {isConnected} = await NetInfo.fetch();

    await updateProduct(
      prevProduct,
      {
        ...product,
        price: parseFloat(product.price) || 0,
        cost: parseFloat(product.cost) || 0,
      },
      inventory,
      stockWarning,
      !!isConnected,
    );

    onClose();
  };

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      onSuccess={handleUpdate}
      loadingText={t('product.update')}
      title={t('product.update')}>
      <View style={styles.container}>
        <View style={{gap: 12}}>
          <TextInput
            style={styles.productNameInput}
            value={product.name}
            placeholderTextColor={Colors.light.placeholder}
            placeholder={t('product.name')}
            onChangeText={(text) => setProduct((prev) => ({...prev, name: text}))}
          />

          <MegaInput
            label={t('product.price')}
            theme={'WATER'}
            value={product.price}
            onChangeText={(text) => setProduct((prev) => ({...prev, price: text}))}
            inputMode={'decimal'}
            style={{fontSize: 32}}
          />

          <MegaInput
            label={t('product.cost')}
            theme={'WATER'}
            value={product.cost}
            onChangeText={(text) => setProduct((prev) => ({...prev, cost: text}))}
            inputMode={'numeric'}
            style={{fontSize: 32}}
            editable={false}
          />

          <Text style={{fontFamily: 'HindSiliguribold', color: profit > 0 ? Themes.VOID : Themes.DANGER}}>
            {isValidCalculation && (
              profit > 0
                ? t('product.profitText', {profit})
                : t('product.lossText', {loss: Math.abs(profit)})
            )}
          </Text>

          <MegaInput
            label={t('product.inventory')}
            theme={'WATER'}
            value={inventory.toString()}
            onChangeText={(text) => setInventory(parseInt(text) || 0)}
            inputMode={'numeric'}
            style={{fontSize: 32}}
          />


          <MegaInput label={t('product.stock_warning')}
                     value={stockWarning.toString()}
                     onChangeText={text => setStockWarning(parseInt(text) || 0)}
                     theme={'WATER'}
                     inputMode={'numeric'}
                     style={{
                       fontSize: 32,
                     }}/>

          <MegaInput
            label={t('product.description')}
            theme={'WATER'}
            value={product.description}
            onChangeText={(text) => setProduct((prev) => ({...prev, description: text}))}
            autoGrow={true}
          />

          <Button title={t("delete")}
                  variant={'destructive'}
                  style={{width: '100%'}}
                  onPress={() => {
                    setShouldDelete(true)
                  }}
          />

          <AlertDialog visible={shouldDelete} title={'Confirm Deletion'} buttons={[
            {
              text: 'Cancel',
              style: 'default',
              onPress() {
                setShouldDelete(false);
              }
            },
            {
              text: 'Delete',
              style: 'destructive',
              onPress() {
                if (!prevProduct) return;
                deleteProduct(prevProduct, isOnline).then(r => {
                  ToastAndroid.show('Product has been deleted', ToastAndroid.SHORT)
                }).catch(err => {
                  ToastAndroid.show('Unable to delete', ToastAndroid.SHORT)
                })
                setShouldDelete(false);
                onClose();
              }
            }
          ]}/>
        </View>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  productNameInput: {
    fontSize: 20,
    fontFamily: 'HindSiliguri',
    color: Colors.light.text,
    paddingHorizontal: 2,
    marginBottom: 5,
  },
  imageContainer: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cecece',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
});
