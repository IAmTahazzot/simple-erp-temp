import React, {useState} from 'react';
import {View, Text, TextInput, StyleSheet, Pressable, Alert} from 'react-native';
import {BaseModal} from '@/components/core/BaseModal';
import {Button} from '@/components/ui/Button';
import {Input, MegaInput} from '@/components/ui/Input'
import {Colors, Themes} from '@/constants/colors';
import {useCommonTranslation} from '@/i18n/useTypedTranslation';
import * as ImagePicker from 'expo-image-picker'

interface NewProductModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NewProductModal({visible, onClose}: NewProductModalProps) {
  const [productName, setProductName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const {t} = useCommonTranslation()
  const [product, setProduct] = useState<{
    name: string;
    price: number;
    cost: number;
    description: string;
  }>()

  const profit = product ? Number((product.price - product.cost).toFixed(2)) : 0.00;

  const handleSave = () => {
    // Add database save logic here
    console.log('Saved product:', product);
    onClose();
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync()

    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Camera permission is required to pick an image.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1
    })

    console.log(result)

    if (!result.canceled) {
      setImage(result.assets[0].uri)
    }
  }

  return (
    <BaseModal visible={visible} onClose={onClose} title={t('product.new')}>
      <View style={styles.container}>
        <View style={{gap: 12}}>
          <Pressable style={{
            borderWidth: 2,
            borderStyle: 'dotted',
            borderColor: 'black',
            borderRadius: 8,
            padding: 20,
            alignItems: 'center',
            justifyContent: 'center'
          }} onPress={pickImage}>

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
            {profit > 0 ? t('product.profitText', {profit}) : t('product.lossText', {loss: Math.abs(profit)})}
          </Text>

          <MegaInput label={t('product.description')}
                     onChangeText={text => setProduct(prev => ({...prev, description: text} as any))}
                     autoGrow={true}
                     theme={'WATER'}/>
        </View>
        <View style={styles.footer}>
          <Button title={t('product.save')}
                  onPress={handleSave}
                  size={'lg'}
                  style={{
                    width: '100%',
                    padding: 20,
                    height: 'auto',
                    marginTop: 50,
                  }}/>
        </View>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  }
});
