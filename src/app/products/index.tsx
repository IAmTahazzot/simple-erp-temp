import {Pressable, View, Text, FlatList, Image} from "react-native";
import {database} from '@/database';
import Product from '@/database/models/Product';
import {withObservables} from '@nozbe/watermelondb/react';
import {Q} from '@nozbe/watermelondb';
import {useRouter} from 'expo-router'
import React, {useCallback, useState} from 'react'
import {UpdateProduct} from '@/components/features/Products/UpdateProduct';
import ProductImages from '@/database/models/Images';
import Inventory from '@/database/models/Inventory';
import {Image as ImageIcon} from 'lucide-react-native'

const ProductItem = ({item, images, inventory, onPress}: {
  item: Product,
  images: ProductImages[],
  inventory: Inventory[],
  onPress: () => void
}) => {
  const stock = inventory[0]?.quantity ?? 0
  const isLowStock = stock < (inventory[0]?.lowStockThreshold || 1)
  
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
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
        <View>
          {images[0]?.imageUrl ? (
            <Image source={{uri: images[0].imageUrl}}
                   style={{width: 50, height: 50, borderRadius: 4}}/>
          ) : (
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 4,
              backgroundColor: '#efefef',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ImageIcon size={24} color="#a0a0a0"/>
            </View>
          )}
        </View>
        <View style={{gap: 3}}>
          <Text style={{fontSize: 16, fontFamily: 'InterBold'}}>{item.name}</Text>
          <Text style={{
            color: isLowStock ? '#d9534f' : '#5cb85c',
            fontFamily: 'InterMedium'
          }}>
            {stock} Available
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

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

const EnhancedProductItem = withObservables(['item'], ({item}: { item: Product }) => ({
  item: item.observe(),
  images: item.images.observe(),
  inventory: item.inventories.observe(),
}))(ProductItem)

export default withObservables([], () => ({
  products: database.collections
    .get<Product>('products')
    .query(
      Q.where('server_deleted_at', Q.eq(null)),
      Q.sortBy('created_at', 'desc')
    ).observe(),
}))(Products);



