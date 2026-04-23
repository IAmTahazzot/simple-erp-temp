import {Pressable, View, Text, FlatList} from "react-native";
import {database} from '@/database';
import Product from '@/database/models/Product';
import {withObservables} from '@nozbe/watermelondb/react';
import {Q} from '@nozbe/watermelondb';
import {faker} from '@faker-js/faker/locale/en';
import {useRouter} from 'expo-router'
import React, {memo, useCallback} from 'react'

// eslint-disable-next-line react/display-name
const ProductItem = memo(({item, onPress}: { item: Product, onPress: () => void }) => {
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
})

function Products({products}: { products: Product[] }) {
  const router = useRouter()

  const createDemoProduct = async () => {
    try {
      const product = await database.write(async () => {
        return await database.collections.get<Product>('products').create(product => {
          product.name = faker.commerce.productName();
          product.sku = 'DEMO-' + faker.random.alphaNumeric(8).toUpperCase()
          product.description = faker.commerce.productDescription();
          product.price = parseFloat(faker.commerce.price());
        })
      })

      console.log('Product has been created: ', product)
    } catch (err) {
      console.log("Error creating product:", err)
    }
  }

  const renderItem = useCallback(({item}: { item: Product }) => (
    <ProductItem 
      item={item} 
      onPress={() => router.navigate({
        pathname: '/products/[productId]',
        params: {productId: item.id}
      })} 
    />
  ), [router]);

  return (
    <View style={{flex: 1}}>
      <Pressable style={{backgroundColor: 'black', margin: 10, borderRadius: 12, padding: 20,}}
                 onPress={createDemoProduct}>
        <Text style={{color: 'white'}}>Generate a demo product</Text>
      </Pressable>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        windowSize={5}           // Determines how many invisible screens of items to keep in memory (default 21, reducing saves RAM)
        maxToRenderPerBatch={10} // Limits items rendered per frame to keep JS thread unblocked 
        initialNumToRender={15}  // How many items to render explicitly on the first pass
        removeClippedSubviews={true} // Unmounts off-screen items completely, essential for huge lists
      />
    </View>
  )
}

export default withObservables([], () => ({
  products: database.collections.get<Product>('products').query(Q.sortBy('created_at', 'desc')).observe(),
}))(Products);
