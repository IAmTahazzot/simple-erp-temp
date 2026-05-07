import React, {useState} from 'react';
import {View, Text, TextInput, StyleSheet, Pressable, Alert, Image} from 'react-native';
import {BaseModal} from '@/components/core/BaseModal';
import {MegaInput} from '@/components/ui/Input'
import {Colors, Themes} from '@/constants/colors';
import {useCommonTranslation} from '@/i18n/useTypedTranslation';
import {ImagePlus} from 'lucide-react-native';
import {useOnline} from '@/hooks/use-online';
import { createProduct} from '@/features/products/functions';

interface NewProductModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NewProductModal({visible, onClose}: NewProductModalProps) {
  const {t} = useCommonTranslation()

  const [inventory, setInventory] = useState<number>(0);
  const [stockWarning, setStockWarning] = useState<number>(0);
  const {isOnline} = useOnline()
  
  const [product, setProduct] = useState<{
    name: string;
    price: number;
    cost: number;
    description: string;
    imageUri?: string | null;
  }>()

  const profit = product ? Number((product.price - product.cost).toFixed(2)) : 0.00;
  const isValidCalculation = product && !isNaN(profit) && product.price > 0 && product.cost >= 0;

  const reset = () => {
    setProduct({
      name: '',
      price: 0,
      cost: 0,
      description: '',
      imageUri: null,
    })
  }

  const handleSave = async () => {
    await createProduct(
      {
        name: product?.name || '',
        price: product?.price || 0,
        cost: product?.cost || 0,
        description: product?.description || '',
      },
      inventory,       // your existing state
      stockWarning,    // your existing state
      isOnline,
    )
    

    reset()
    onClose();
  };

  return (
    <BaseModal visible={visible}
               onClose={onClose}
               onSuccess={handleSave}
               loadingText={'Saving product...'}
               title={t('product.new')}>
      <View style={styles.container}>
        <View style={{gap: 12}}>

          <TextInput style={styles.productNameInput}
                     placeholderTextColor={Colors.light.placeholder}
                     placeholder={t('product.name')}
                     onChangeText={text => setProduct(prev => ({...prev, name: text} as any))}
          />

          <MegaInput label={t('product.price')}
                     theme={'WATER'}
                     onChangeText={text => setProduct(prev => ({...prev, price: parseFloat(text) || 0} as any))}
                     inputMode={'numeric'}
                     style={{
                       fontSize: 32,
                     }}/>

          <MegaInput label={t('product.cost')}
                     onChangeText={text => setProduct(prev => ({...prev, cost: parseFloat(text) || 0} as any))}
                     theme={'WATER'}
                     inputMode={'numeric'}
                     style={{
                       fontSize: 32,
                     }}/>

          <Text style={{
            fontFamily: 'HindSiliguribold',
            color: profit > 0 ? Themes.VOID : Themes.DANGER
          }}>
            {isValidCalculation && (
              (profit > 0) ? t('product.profitText', {profit}) : t('product.lossText', {loss: Math.abs(profit)})
            )}
          </Text>

          <MegaInput label={t('product.inventory')}
                     onChangeText={text => setInventory(parseInt(text) || 0)}
                     theme={'WATER'}
                     inputMode={'numeric'}
                     style={{
                       fontSize: 32,
                     }}/>
          
          <MegaInput label={t("product.stock_warning")}
                     onChangeText={text => setStockWarning(parseInt(text) || 0)}
                     theme={'WATER'}
                     inputMode={'numeric'}
                     style={{
                       fontSize: 32,
                     }}/>

          <MegaInput label={t('product.description')}
                     onChangeText={text => setProduct(prev => ({...prev, description: text} as any))}
                     autoGrow={true}
                     theme={'WATER'}/>
        </View>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontFamily: 'HindSiliguri',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 20,
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
});
