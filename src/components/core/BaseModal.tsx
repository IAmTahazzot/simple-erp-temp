import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform, ScrollView
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'
import {Colors} from '@/constants/colors';
import {ChevronLeft, Check} from 'lucide-react-native'
import {StatusBar} from 'expo-status-bar';
import {LoadingSpinner} from '@/components/ui/LoadingSpinner';

interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => Promise<void>;
  title: string;
  children: React.ReactNode;
  loadingText?: string;
  animationType?: 'slide' | 'fade' | 'none';
}

export function BaseModal({
                            visible,
                            onClose,
                            onSuccess,
                            title,
                            children,
  loadingText,
                            animationType = 'slide'
                          }: BaseModalProps) {

  const [isLoading, setIsLoading] = React.useState(false);

  return (
    <Modal
      visible={visible}
      animationType={animationType}
      presentationStyle="pageSheet" // "pageSheet" looks native on iOS, "fullScreen" on Android
      onRequestClose={onClose} // Handles Android hardware back button
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={'padding'}
          style={styles.container}
        >
          <View style={{flex: 1}}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              {/* Modal Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={10}>
                  <ChevronLeft size={24} color={Colors.light.primary} strokeWidth={2}/>
                </TouchableOpacity>
                <Text style={styles.title}>{title}</Text>
                {
                  onSuccess && (
                    <TouchableOpacity onPress={async () => {
                      setIsLoading(true);
                      await onSuccess().then(() => {
                        setIsLoading(false);
                      }).catch(() => {
                        setIsLoading(false);
                      });
                    }} style={styles.closeButton} hitSlop={10}>
                      <Check size={24} color={Colors.light.primary} strokeWidth={2}/>
                    </TouchableOpacity>
                  )
                }
              </View>
            </TouchableWithoutFeedback>
            
            {/* Modal Content */}
            <ScrollView style={styles.content}>
              {children}
            </ScrollView>

            <LoadingSpinner visible={isLoading} text={loadingText} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff', // Typically the background color of the modal
  },
  container: {
    flex: 1,
    paddingVertical: 10
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e3e3e3',
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#eee',
    borderRadius: 50,
  },
  closeText: {
    color: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'InterSemiBold',
  },
  placeholder: {
    width: 32, // Matches close button roughly to keep title centered
  },
  content: {},
});
