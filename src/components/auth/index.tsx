import { Colors } from '@/constants/colors';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Login from './Login';
import Register from './Register';

export default function AuthScreen() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const keyboardProgress = useRef(new Animated.Value(0)).current;
  const softEase = Easing.bezier(0.22, 0, 0.18, 1);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const duration = Math.max(event.duration ?? 320, 280);
      Animated.timing(keyboardProgress, {
        toValue: 1,
        duration,
        easing: softEase,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (event) => {
      const duration = Math.max(event.duration ?? 280, 240);
      Animated.timing(keyboardProgress, {
        toValue: 0,
        duration,
        easing: softEase,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardProgress]);

  const animatedCardStyle = {
    transform: [
      {
        translateY: keyboardProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -20],
        }),
      },
      {
        scale: keyboardProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.996],
        }),
      },
    ],
    opacity: keyboardProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.999],
    }),
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.card, animatedCardStyle]}>
          <View style={styles.tabsContainer}>
            <Pressable
              style={[styles.tab, activeTab === 'login' && styles.activeTab]}
              onPress={() => setActiveTab('login')}
            >
              <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>
                Sign In
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'register' && styles.activeTab]}
              onPress={() => setActiveTab('register')}
            >
              <Text style={[styles.tabText, activeTab === 'register' && styles.activeTabText]}>
                Create Account
              </Text>
            </Pressable>
          </View>

          <View style={styles.content}>
            {activeTab === 'login' ? <Login /> : <Register />}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1E1E1E', // Dark subtle shade (assuming dark theme)
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    borderRadius: 6,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 4,
  },
  activeTab: {
    backgroundColor: '#2D2D2D',
  },
  tabText: {
    fontFamily: 'InterMedium',
    color: '#888',
    fontSize: 14,
  },
  activeTabText: {
    color: '#FFF',
  },
  content: {
    marginTop: 8,
  },
});
