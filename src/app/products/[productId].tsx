import {Text, View} from 'react-native';
import {Link, useLocalSearchParams} from 'expo-router'

export default function ProductId() {
  const {productId} = useLocalSearchParams()

  return (
    <View>
      <Text style={{padding: 10, fontSize: 20}}>Product Id: {productId}</Text>
      <Link href="/products">
        <Text style={{
          color: '#0077ff',
          textDecorationStyle: 'dotted',
          textDecorationLine: 'underline',
          textDecorationColor: '#0077ff'
        }}>Go back to products</Text>
      </Link>
    </View>
  )
}
