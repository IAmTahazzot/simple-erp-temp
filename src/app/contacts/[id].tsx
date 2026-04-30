import React, {useState} from 'react'
import {View, Text, ScrollView, StyleSheet, Pressable, ToastAndroid, Linking} from 'react-native'
import {useLocalSearchParams, useRouter} from 'expo-router'
import {withObservables} from '@nozbe/watermelondb/react'
import {database} from '@/database'
import Customer from '@/database/models/Customer'
import Supplier from '@/database/models/Supplier'
import {UpdateContact} from '@/features/contacts/components/UpdateContact'
import {Pencil, Phone, Mail, MapPin, User, ArrowLeft, Building2, Briefcase} from 'lucide-react-native'
import {Button} from '@/components/ui/Button';
import {AlertDialog} from '@/components/ui/AlertDialog';
import {deleteProduct} from '@/features/products/functions';
import {deleteContact} from '@/features/contacts/functions';
import {useOnline} from '@/hooks/use-online';
import {useCommonTranslation} from '@/i18n/useTypedTranslation';

// ─── Shared ───────────────────────────────────────────────────────────────────

function InfoRow({icon, value}: { icon: React.ReactNode; value?: string }) {
  if (!value) return null
  return (
    <View style={styles.infoRow}>
      {icon}
      <Text style={styles.infoText}>{value}</Text>
    </View>
  )
}

// ─── Customer Details UI ──────────────────────────────────────────────────────

function CustomerDetails({contact}: { contact: Customer }) {
  const router = useRouter()
  const [editVisible, setEditVisible] = useState(false)
  const [shouldDelete, setShouldDelete] = useState(false);
  const {isOnline} = useOnline()
  const {t} = useCommonTranslation()

  return (
    <View style={{flex: 1, backgroundColor: '#fff'}}>
      {/* Header */}
      <View style={styles.customerHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#fff"/>
        </Pressable>
        <Pressable onPress={() => setEditVisible(true)} style={styles.editBtn}>
          <Pencil size={16} color="#fff"/>
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 40}}>
        {/* Avatar + name */}
        <View style={styles.customerHero}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>
              {contact.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.customerName}>{contact.name}</Text>
          <Text style={styles.customerLabel}>Customer</Text>
          <Button size={'icon'} rightIcon={<Phone size={25} color={'white'}/>} style={{
            backgroundColor: '#00a66c2',
            alignSelf: 'center',
            marginTop: 10,
          }}
                  onPress={() => {
                    Linking.openURL(`tel:${contact.phone}`)
                  }}
          />
        </View>

        {/* Contact info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Info</Text>
          <InfoRow icon={<Phone size={16} color="#6b7280"/>} value={contact.phone}/>
          <InfoRow icon={<Mail size={16} color="#6b7280"/>} value={contact.email}/>
          <InfoRow icon={<MapPin size={16} color="#6b7280"/>} value={contact.address}/>
          {!contact.phone && !contact.email && !contact.address && (
            <Text style={styles.emptyNote}>No contact details added yet.</Text>
          )}
          <Button title={t('delete')}
                  variant={'destructive'}
                  style={{marginTop: 20, marginLeft: 'auto'}}
                  onPress={() => {
                    setShouldDelete(true)
                  }}
          />

          <AlertDialog visible={shouldDelete} title={'Delete ' + contact.name} buttons={[
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
                deleteContact(contact, 'customer', isOnline).then(r => {
                  ToastAndroid.show('Customer has been deleted', ToastAndroid.SHORT)
                  router.push({
                    pathname: '/contacts'
                  })
                }).catch(err => {
                  ToastAndroid.show('Unable to delete', ToastAndroid.SHORT)
                })
                setShouldDelete(false);
              }
            }
          ]}/>
        </View>
      </ScrollView>

      <UpdateContact
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        contactType={'customer'}
        contact={contact}
      />
    </View>
  )
}

// ─── Supplier Details UI ──────────────────────────────────────────────────────

function SupplierDetails({contact}: { contact: Supplier }) {
  const router = useRouter()
  const [editVisible, setEditVisible] = useState(false)
  const [shouldDelete, setShouldDelete] = useState(false);
  const {isOnline} = useOnline()
  const {t} = useCommonTranslation()

  return (
    <View style={{flex: 1, backgroundColor: '#f9fafb'}}>
      {/* Header bar */}
      <View style={styles.supplierHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111"/>
        </Pressable>
        <Text style={styles.supplierHeaderTitle}>Supplier</Text>
        <Pressable onPress={() => setEditVisible(true)} style={styles.supplierEditBtn}>
          <Pencil size={15} color="#111"/>
          <Text style={styles.supplierEditBtnText}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 40}}>
        {/* Business card style hero */}
        <View style={styles.supplierHero}>
          <View style={styles.supplierIconWrap}>
            <Building2 size={32} color="#374151"/>
          </View>
          <Text style={styles.supplierName}>{contact.name}</Text>
          {contact.contactName && (
            <Text style={styles.supplierContact}>via {contact.contactName}</Text>
          )}
          <Button size={'icon'} rightIcon={<Phone size={25} color={'#000'} />} style={{
            backgroundColor: '#fff',
            alignSelf: 'center',
            marginTop: 10,
          }}
                  onPress={() => {
                    Linking.openURL(`tel:${contact.phone}`)
                  }}
          />
        </View>

        {/* Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Business Contact</Text>
          {contact.contactName && (
            <InfoRow icon={<Briefcase size={16} color="#6b7280"/>} value={contact.contactName}/>
          )}
          <InfoRow icon={<Phone size={16} color="#6b7280"/>} value={contact.phone}/>
          <InfoRow icon={<Mail size={16} color="#6b7280"/>} value={contact.email}/>
          <InfoRow icon={<MapPin size={16} color="#6b7280"/>} value={contact.address}/>
          {!contact.contactName && !contact.phone && !contact.email && !contact.address && (
            <Text style={styles.emptyNote}>No details added yet.</Text>
          )}

          <Button title={t("delete")}
                  variant={'destructive'}
                  style={{marginTop: 20, marginLeft: 'auto'}}
                  onPress={() => {
                    setShouldDelete(true)
                  }}
          />

          <AlertDialog visible={shouldDelete} title={'Delete ' + contact.name} buttons={[
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
                deleteContact(contact, 'supplier', isOnline).then(r => {
                  ToastAndroid.show('Supplier has been deleted', ToastAndroid.SHORT)
                  router.push({
                    pathname: '/contacts/suppliers'
                  })
                }).catch(err => {
                  ToastAndroid.show('Unable to delete', ToastAndroid.SHORT)
                })
                setShouldDelete(false);
              }
            }
          ]}/>
        </View>
      </ScrollView>

      <UpdateContact
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        contactType={'supplier'}
        contact={contact}
      />
    </View>
  )
}

// ─── withObservables wrappers ─────────────────────────────────────────────────

const EnhancedCustomerDetails = withObservables(['id'], ({id}: { id: string }) => ({
  contact: database.get<Customer>('customers').findAndObserve(id),
}))(CustomerDetails)

const EnhancedSupplierDetails = withObservables(['id'], ({id}: { id: string }) => ({
  contact: database.get<Supplier>('suppliers').findAndObserve(id),
}))(SupplierDetails)

// ─── Screen entry point ───────────────────────────────────────────────────────

export default function ContactDetailsScreen() {
  const {id, type} = useLocalSearchParams<{ id: string; type: 'customer' | 'supplier' }>()
  if (type === 'supplier') return <EnhancedSupplierDetails id={id}/>
  return <EnhancedCustomerDetails id={id}/>
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Shared
  backBtn: {padding: 4},
  infoRow: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8},
  infoText: {fontSize: 15, color: '#374151', fontFamily: 'InterRegular', flex: 1},
  card: {
    margin: 16, backgroundColor: '#fff',
    borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: 'InterMedium',
    color: '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  emptyNote: {color: '#9ca3af', fontFamily: 'InterRegular', fontSize: 14},

  // Customer
  customerHeader: {
    backgroundColor: '#111827', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  editBtnText: {color: '#fff', fontSize: 13, fontFamily: 'InterMedium'},
  customerHero: {backgroundColor: '#111827', alignItems: 'center', paddingBottom: 32, paddingTop: 8},
  customerAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  customerAvatarText: {fontSize: 30, color: '#fff', fontFamily: 'InterBold'},
  customerName: {fontSize: 22, color: '#fff', fontFamily: 'InterBold'},
  customerLabel: {fontSize: 13, color: '#9ca3af', fontFamily: 'InterRegular', marginTop: 4},

  // Supplier
  supplierHeader: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  supplierHeaderTitle: {fontSize: 16, fontFamily: 'InterBold', color: '#111'},
  supplierEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  supplierEditBtnText: {color: '#111', fontSize: 13, fontFamily: 'InterMedium'},
  supplierHero: {
    margin: 16, backgroundColor: '#fff', borderRadius: 12, padding: 24,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  supplierIconWrap: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  supplierName: {fontSize: 20, fontFamily: 'InterBold', color: '#111827'},
  supplierContact: {fontSize: 14, color: '#6b7280', fontFamily: 'InterRegular', marginTop: 4},
})
