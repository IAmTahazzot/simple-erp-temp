import React, {useState} from 'react';
import {View, TextInput, StyleSheet} from 'react-native';
import {BaseModal} from '@/components/core/BaseModal';
import {MegaInput} from '@/components/ui/Input';
import {Colors} from '@/constants/colors';
import {useCommonTranslation} from '@/i18n/useTypedTranslation';
import {Select} from '@/components/ui/Select';
import {useOnline} from '@/hooks/use-online';
import {createCustomer, createSupplier} from '@/features/contacts/functions';

interface NewContactProps {
  visible: boolean;
  onClose: () => void;
}

export function NewContact({visible, onClose}: NewContactProps) {
  const {t} = useCommonTranslation()
  const {isOnline} = useOnline()

  const [contactType, setContactType] = useState<'customer' | 'supplier'>('customer')
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('') // supplier only
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  const reset = () => {
    setName('')
    setContactName('')
    setEmail('')
    setPhone('')
    setAddress('')
  }

  const handleSave = async () => {
    if (!name.trim()) return

    if (contactType === 'customer') {
      await createCustomer({name, email, phone, address}, isOnline)
    } else {
      await createSupplier({name, contactName, email, phone, address}, isOnline)
    }

    reset()
    onClose()
  }

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      onSuccess={handleSave}
      loadingText={'Saving...'}
      title={'New Contact'}>
      <View style={styles.container}>
        <View style={{gap: 12}}>

          <Select
            groups={[{
              label: 'Contact Type',
              items: [
                {label: t('customers'), value: 'customer'},
                {label: t('suppliers'), value: 'supplier'},
              ]
            }]}
            value={contactType}
            onValueChange={(value) => setContactType(value as 'customer' | 'supplier')}
          />

          <TextInput
            style={styles.nameInput}
            value={name}
            placeholder={contactType === 'customer' ? t("customers") : t("contact.businessOrgName")}
            placeholderTextColor={Colors.light.placeholder}
            onChangeText={setName}
          />

          {/* Supplier-only: contact person name */}
          {contactType === 'supplier' && (
            <MegaInput
              label={t("suppliers")}
              theme={'WATER'}
              value={contactName}
              onChangeText={setContactName}
            />
          )}

          <MegaInput
            label={t('contact.phone')}
            theme={'WATER'}
            value={phone}
            onChangeText={setPhone}
            inputMode={'tel'}
          />

          <MegaInput
            label={t('contact.email')}
            theme={'WATER'}
            value={email}
            onChangeText={setEmail}
            inputMode={'email'}
          />

          <MegaInput
            label={t('contact.address')}
            theme={'WATER'}
            value={address}
            onChangeText={setAddress}
            autoGrow={true}
          />

        </View>
      </View>
    </BaseModal>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  nameInput: {
    fontSize: 20,
    fontFamily: 'HindSiliguri',
    color: Colors.light.text,
    paddingHorizontal: 2,
    marginBottom: 5,
  },
})
