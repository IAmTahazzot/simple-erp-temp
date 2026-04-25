import {
  Text,
  View,
  Modal,
  ActivityIndicator
} from 'react-native';
import {Themes} from '@/constants/colors';

type LoadingSpinnerProps = {
  visible: boolean
  text?: string
}

export const LoadingSpinner = ({visible, text = "Processing..."}: LoadingSpinnerProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent={true}>
      <View style={{
        flex: 1,
        backgroundColor: 'rgb(255 255 255 / 0.73)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6
      }}>
       
       <ActivityIndicator color={Themes.WATER} /> 
        <Text style={{
          fontSize: 14
        }}>{text}</Text>
      </View>
    </Modal>
  )
}
