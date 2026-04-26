import React, {useState} from 'react';
import {View, Text, TextInput, StyleSheet, Pressable, Alert, Image} from 'react-native';
import {BaseModal} from '@/components/core/BaseModal';
import {Button} from '@/components/ui/Button';
import {Input, MegaInput} from '@/components/ui/Input'
import {Colors, Themes} from '@/constants/colors';
import {useCommonTranslation} from '@/i18n/useTypedTranslation';
import * as ImagePicker from 'expo-image-picker'
import {readAsStringAsync, EncodingType} from 'expo-file-system/legacy';
import {decode} from 'base64-arraybuffer';
import {ImagePlus} from 'lucide-react-native';
import {supabase} from '@/services/supabase';
import {database} from '@/database';
import Product from '@/database/models/Product';
import {useOnline} from '@/hooks/use-online';
import { createProduct} from '@/features/products/functions';

interface NewProductModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NewProductModal({visible, onClose}: NewProductModalProps) {
  const {t} = useCommonTranslation()

  const [image, setImage] = useState<string | null>(null);
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
    setImage(null)
  }

  const handleSave = async () => {
    await createProduct(
      {
        name: product?.name || '',
        price: product?.price || 0,
        cost: product?.cost || 0,
        description: product?.description || '',
      },
      image,           // picker URI from your existing state
      inventory,       // your existing state
      stockWarning,    // your existing state
      isOnline,
    )

    reset()
    onClose();
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync()

    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Camera permission is required to pick an image.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      aspect: [7, 7],
      quality: .05,
    })

    if (!result.canceled) {
      setImage(result.assets[0].uri)
      setProduct(prev => ({...prev, imageUri: result.assets[0].uri} as any))

      console.log('size in kb', result.assets[0].fileSize ? (result.assets[0].fileSize / 1024).toFixed(2) : 'unknown')
    }
  }

  return (
    <BaseModal visible={visible}
               onClose={onClose}
               onSuccess={handleSave}
               loadingText={'Saving product...'}
               title={t('product.new')}>
      <View style={styles.container}>
        <View style={{gap: 12}}>
          
          <Text style={{fontSize: 13, fontFamily: 'InterMedium'}}>{'Media'}</Text>
          <Pressable style={styles.imageContainer} onPress={pickImage}>
            {
              image ? (
                  <Image source={{uri: image}}
                         style={{
                           height: 300, width: '100%', borderRadius: 8
                         }}/>
                )
                : (
                  <View style={{display: 'flex', gap: 4, alignItems: 'center'}}>
                    <ImagePlus size={20} strokeWidth={2} color={Themes.INFO}/>
                    <Text
                      style={{fontSize: 12, color: Themes.INFO, fontFamily: 'InterMedium'}}>{'Add product image'}</Text>
                  </View>
                )
            }
          </Pressable>

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
          
          <MegaInput label={'Low stock threshold'}
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
