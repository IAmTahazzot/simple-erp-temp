import {Pressable, View, Text, FlatList, TextInput, ActivityIndicator} from "react-native";
import {database} from '@/database';
import Product from '@/database/models/Product';
import {withObservables} from '@nozbe/watermelondb/react';
import {Q} from '@nozbe/watermelondb';
import React, {useCallback, useMemo, useState} from 'react'
import {UpdateProduct} from '@/features/products/components/UpdateProduct';
import Inventory from '@/database/models/Inventory';
import {Search as SearchIcon} from 'lucide-react-native'

// ─── Fuzzy score ─────────────────────────────────────────────────────────────
// Returns 0 (no match) to 100 (exact). Results below MIN_SCORE are hidden.
const MIN_SCORE = 30
function fuzzyScore(name: string, query: string): number {
  if (!query) return 100
  const n = name.toLowerCase()
  const q = query.toLowerCase()

  if (n === q) return 100
  if (n.startsWith(q)) return 90
  if (n.includes(q)) return 80

  // All query chars must appear in order inside name
  let qi = 0
  for (let i = 0; i < n.length && qi < q.length; i++) {
    if (n[i] === q[qi]) qi++
  }

  return qi === q.length ? 50 : 0  // matched all chars in order → 50, otherwise hide
}

// ─── ProductItem ──────────────────────────────────────────────────────────────
const ProductItem = ({item,  inventory, onPress, filterMode}: {
  item: Product,
  inventory: Inventory[],
  onPress: () => void,
  filterMode: 'all' | 'low' | 'none',
}) => {
  const stock = inventory[0]?.quantity ?? 0
  const isLowStock = stock < (inventory[0]?.lowStockThreshold || 1)

  if (filterMode === 'low' && !isLowStock) return null
  if (filterMode === 'low' && stock < 1) return null
  if (filterMode === 'none' && stock !== 0) return null
  
  return (
    <Pressable
      style={({pressed}) => [
        {borderBottomColor: '#e7e7e7', borderBottomWidth: 1, padding: 12},
        pressed && {backgroundColor: '#f0f0f0'},
      ]}
      onPress={onPress}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between'}}>
        <View style={{gap: 3}}>
          <Text style={{fontSize: 16, fontFamily: 'InterBold'}}>{item.name}</Text>
          <Text style={{color: isLowStock ? '#d9534f' : '#5cb85c', fontFamily: 'InterMedium'}}>
            {stock} Available
          </Text>
        </View>
        
        <View>
          <Text style={{fontSize: 20, fontFamily: 'InterMedium', color: '#333333'}}>
            ৳{item.price.toFixed(2)}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

const EnhancedProductItem = withObservables(['item'], ({item}: { item: Product }) => ({
  item: item.observe(),
  inventory: item.inventories.observe(),
}))(ProductItem)

// ─── Products ─────────────────────────────────────────────────────────────────
function Products({products}: { products: Product[] }) {
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product>(products[0]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'none'>('all')

  const filtered = useMemo(() => {
    let list = products
    if (query.trim()) {
      list = list
        .map((p) => ({p, score: fuzzyScore(p.name, query.trim())}))
        .filter(({score}) => score >= MIN_SCORE)
        .sort((a, b) => b.score - a.score)
        .map(({p}) => p)
    }
    return list
  }, [products, query])

  const renderItem = useCallback(({item}: { item: Product }) => (
    <EnhancedProductItem
      item={item}
      filterMode={filter}
      onPress={() => {
        setActiveProduct(item)
        setIsUpdateModalVisible(true)
      }}
    />
  ), [filter]);

  return (
    <View style={{flex: 1}}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#efefef', borderRadius: 12,
        paddingHorizontal: 12, margin: 12,
      }}>
        <SearchIcon size={20} color={'#8c8c8c'}/>
        <TextInput
          placeholder={'Filter products'}
          placeholderTextColor={'#9f9f9f'}
          value={query}
          onChangeText={setQuery}
          style={{fontFamily: 'InterRegular', fontSize: 16, color: '#333333', flex: 1}}
        />
      </View>

      <View style={{flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 8}}>
        {(['all', 'low', 'none'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={{
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
              backgroundColor: filter === f ? '#111827' : '#f0f0f0',
            }}>
            <Text style={{
              fontFamily: 'InterMedium', fontSize: 13,
              color: filter === f ? '#fff' : '#374151',
            }}>
              {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'No Stock'}
            </Text>
          </Pressable>
        ))}
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
            No products found
          </Text>
        }
      />

      <UpdateProduct
        visible={isUpdateModalVisible}
        prevProduct={activeProduct}
        onClose={() => setIsUpdateModalVisible(false)}
      />
    </View>
  )
}

// ─── Loading wrapper ──────────────────────────────────────────────────────────
function ProductsLoader({products}: { products?: Product[] }) {
  if (!products) return <ActivityIndicator style={{flex: 1}} size={'large'}/>
  return <Products products={products}/>
}

export default withObservables([], () => ({
  products: database.collections
    .get<Product>('products')
    .query(
      Q.where('server_deleted_at', Q.eq(null)),
      Q.sortBy('created_at', 'desc')
    ).observe(),
}))(ProductsLoader);
