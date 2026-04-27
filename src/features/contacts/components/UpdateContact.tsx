import React, {useState, useEffect} from 'react'
import {View, TextInput, StyleSheet} from 'react-native'
import {BaseModal} from '@/components/core/BaseModal'
import {MegaInput} from '@/components/ui/Input'
import {Colors} from '@/constants/colors'
import Customer from '@/database/models/Customer'
import Supplier from '@/database/models/Supplier'
import {updateCustomer, updateSupplier} from '@/features/contacts/functions'
import {useOnline} from '@/hooks/use-online'
import {useCommonTranslation} from '@/i18n/useTypedTranslation';

interface UpdateContactProps {
  visible: boolean
  onClose: () => void
  contactType: 'customer' | 'supplier'
  contact: Customer | Supplier | null
}

export function UpdateContact({visible, onClose, contactType, contact}: UpdateContactProps) {
  const {isOnline} = useOnline()
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const {t} = useCommonTranslation()

  useEffect(() => {
    if (!visible || !contact) return
    setName(contact.name)
    setEmail(contact.email ?? '')
    setPhone(contact.phone ?? '')
    setAddress(contact.address ?? '')
    if (contactType === 'supplier') {
      setContactName((contact as Supplier).contactName ?? '')
    }
  }, [visible, contact])

  const handleSave = async () => {
    if (!contact || !name.trim()) return
    if (contactType === 'customer') {
      await updateCustomer(contact as Customer, {name, email, phone, address}, isOnline)
    } else {
      await updateSupplier(contact as Supplier, {name, contactName, email, phone, address}, isOnline)
    }
    onClose()
  }

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      onSuccess={handleSave}
      loadingText={'Saving...'}
      title={contactType === 'customer' ? 'Update Customer' : 'Update Supplier'}>
      <View style={styles.container}>
        <View style={{gap: 12}}>

          <TextInput
            style={styles.nameInput}
            value={name}
            placeholder={contactType === 'customer' ? t('contact.name') : t('contact.businessOrgName')}
            placeholderTextColor={Colors.light.placeholder}
            onChangeText={setName}
          />

          {contactType === 'supplier' && (
            <MegaInput
              label={'Contact Person'}
              theme={'WATER'}
              value={contactName}
              onChangeText={setContactName}
            />
          )}

          <MegaInput label={t('contact.phone')} theme={'WATER'} value={phone} onChangeText={setPhone} inputMode={'tel'}/>
          <MegaInput label={t('contact.email')} theme={'WATER'} value={email} onChangeText={setEmail} inputMode={'email'}/>
          <MegaInput label={t('contact.address')} theme={'WATER'} value={address} onChangeText={setAddress} autoGrow={true}/>

        </View>
      </View>
    </BaseModal>
  )
}

const styles = StyleSheet.create({
  container: {padding: 16},
  nameInput: {
    fontSize: 20,
    fontFamily: 'HindSiliguri',
    color: Colors.light.text,
    paddingHorizontal: 2,
    marginBottom: 5,
  },
})
