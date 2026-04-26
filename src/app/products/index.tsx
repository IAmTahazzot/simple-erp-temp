import {Pressable, View, Text, FlatList} from "react-native";
import {database} from '@/database';
import Product from '@/database/models/Product';
import {withObservables} from '@nozbe/watermelondb/react';
import {Q} from '@nozbe/watermelondb';
import {useRouter} from 'expo-router'
import React, {memo, useCallback, useState} from 'react'
import {UpdateProduct} from '@/components/features/Products/UpdateProduct';

const ProductItem = ({item, onPress}: { item: Product, onPress: () => void }) => {
  return (
    <Pressable style={({pressed}) => {
      return [
        [{borderBottomColor: '#e7e7e7', borderBottomWidth: 1, padding: 12}],
        [pressed && {
          backgroundColor: '#f0f0f0',
        }]
      ]
    }}
               onPress={onPress}>
      <Text style={{fontSize: 16, fontWeight: 'bold'}}>{item.name}</Text>
      <Text style={{color: 'orange', fontFamily: 'InterBold', fontSize: 12}}>ID: {item.id}</Text>
      <Text>SKU: {item.sku}</Text>
      <Text>Price: ${item.price}</Text>
    </Pressable>
  )
}

const EnhancedProductItem = withObservables(['item'], ({ item }: { item: Product }) => ({
  item: item.observe(),
}))(ProductItem);

function Products({products}: { products: Product[] }) {
  const router = useRouter()
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product>(products[0]);
  
  const handleCloseUpdateModal = () => {
    setIsUpdateModalVisible(false);
  }
  
  const renderItem = useCallback(({item}: { item: Product }) => (
    <EnhancedProductItem 
      item={item} 
      onPress={() => {
        setActiveProduct(item)
        setIsUpdateModalVisible(true)
      }}
    />
  ), []);

  return (
    <View style={{flex: 1}}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        windowSize={5}           // Determines how many invisible screens of items to keep in memory (default 21, reducing saves RAM)
        maxToRenderPerBatch={10} // Limits items rendered per frame to keep JS thread unblocked 
        initialNumToRender={15}  // How many items to render explicitly on the first pass
        removeClippedSubviews={true} // Unmounts off-screen items completely, essential for huge lists
      />

      <UpdateProduct visible={isUpdateModalVisible}
                     prevProduct={activeProduct}
                     onClose={handleCloseUpdateModal}/>
    </View>
  )
}

export default withObservables([], () => ({
  products: database.collections.get<Product>('products').query(Q.sortBy('created_at', 'desc')).observe(),
}))(Products);
