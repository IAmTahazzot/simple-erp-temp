import {View, Text, FlatList, TextInput, Pressable, ActivityIndicator} from 'react-native'
import {database} from '@/database'
import Supplier from '@/database/models/Supplier'
import {withObservables} from '@nozbe/watermelondb/react'
import {Q} from '@nozbe/watermelondb'
import React, {useCallback, useMemo, useState} from 'react'
import {Search as SearchIcon, Building2} from 'lucide-react-native'
import {useRouter} from 'expo-router'

function fuzzyScore(name: string, query: string): number {
  if (!query) return 100
  const n = name.toLowerCase(), q = query.toLowerCase()
  if (n === q) return 100
  if (n.startsWith(q)) return 90
  if (n.includes(q)) return 80
  let qi = 0
  for (let i = 0; i < n.length && qi < q.length; i++) if (n[i] === q[qi]) qi++
  return qi === q.length ? 50 : 0
}

const SupplierItem = ({item, onPress}: { item: Supplier; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    style={({pressed}) => [{
      borderBottomColor: '#e7e7e7', borderBottomWidth: 1, padding: 12,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    }, pressed && {backgroundColor: '#f0f0f0'}]}>
    <View style={{
      width: 40, height: 40, borderRadius: 10,
      backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
    }}>
      <Building2 size={20} color="#374151"/>
    </View>
    <View style={{gap: 2}}>
      <Text style={{fontSize: 16, fontFamily: 'InterBold'}}>{item.name}</Text>
      {item.contactName && <Text style={{color: '#6b7280', fontFamily: 'InterRegular'}}>{item.contactName}</Text>}
      {item.phone && <Text style={{color: '#9ca3af', fontFamily: 'InterRegular', fontSize: 13}}>{item.phone}</Text>}
    </View>
  </Pressable>
)

function Suppliers({suppliers}: { suppliers: Supplier[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return suppliers
    return suppliers
      .map((s) => ({s, score: fuzzyScore(s.name, query.trim())}))
      .filter(({score}) => score >= 30)
      .sort((a, b) => b.score - a.score)
      .map(({s}) => s)
  }, [suppliers, query])

  const renderItem = useCallback(({item}: { item: Supplier }) => (
    <SupplierItem
      item={item}
      onPress={() => router.push({pathname: '/contacts/[id]', params: {id: item.id, type: 'supplier'}})}
    />
  ), [])

  return (
    <View style={{flex: 1}}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#efefef', borderRadius: 12, paddingHorizontal: 12, margin: 12,
      }}>
        <SearchIcon size={20} color={'#8c8c8c'}/>
        <TextInput
          placeholder={'Search suppliers'}
          placeholderTextColor={'#9f9f9f'}
          value={query}
          onChangeText={setQuery}
          style={{fontFamily: 'InterRegular', fontSize: 16, color: '#333', flex: 1}}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        windowSize={5}
        maxToRenderPerBatch={10}
        initialNumToRender={15}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <Text style={{textAlign: 'center', marginTop: 40, color: '#9f9f9f', fontFamily: 'InterRegular'}}>
            No suppliers found
          </Text>
        }
      />
    </View>
  )
}

function SuppliersLoader({suppliers}: { suppliers?: Supplier[] }) {
  if (!suppliers) return <ActivityIndicator style={{flex: 1}} size={'large'}/>
  return <Suppliers suppliers={suppliers}/>
}

export default withObservables([], () => ({
  suppliers: database.collections
    .get<Supplier>('suppliers')
    .query(Q.where('server_deleted_at', Q.eq(null)), Q.sortBy('created_at', 'desc'))
    .observe(),
}))(SuppliersLoader)
