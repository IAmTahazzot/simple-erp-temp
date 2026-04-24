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
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors';
import { ChevronLeft } from 'lucide-react-native'
import {StatusBar} from 'expo-status-bar';

interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  animationType?: 'slide' | 'fade' | 'none';
}

export function BaseModal({ 
  visible, 
  onClose, 
  title, 
  children, 
  animationType = 'slide' 
}: BaseModalProps) {
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
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
              {/* Modal Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={10}>
                  <ChevronLeft size={24} color={Colors.light.primary} strokeWidth={2}/>
                </TouchableOpacity>
                <Text style={styles.title}>{title}</Text>
                <View></View>
              </View>

              {/* Modal Content */}
              <ScrollView style={styles.content}>
                {children}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
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
    justifyContent: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e3e3e3',
  },
  closeButton: {
    padding: 8,
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
  content: {
    flex: 1,
  },
});
