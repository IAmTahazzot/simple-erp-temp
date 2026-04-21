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
          <View style={styles.content}>
            {activeTab === 'login' ? <Login /> : <Register />}
          </View>

          <View style={styles.tabsContainer}>
            <Pressable
              style={[styles.tab, activeTab === 'login' && styles.activeTab]}
              onPress={() => setActiveTab('login')}
            >
              <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>
                Login
              </Text>
            </Pressable>
            <Text style={{color: '#FFF'}}>•</Text>
            <Pressable
              style={[styles.tab, activeTab === 'register' && styles.activeTab]}
              onPress={() => setActiveTab('register')}
            >
              <Text style={[styles.tabText, activeTab === 'register' && styles.activeTabText]}>
                Registration
              </Text>
            </Pressable>
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
    padding: 20,
  },
  card: {
    backgroundColor: Colors.dark.background, // Dark subtle shade (assuming dark theme)
    padding: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 6,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    paddingVertical: 10,
    borderRadius: 4,
  },
  activeTab: {
    // borderBottomWidth: 1,
    // borderBottomColor: '#FFF',
  },
  tabText: {
    fontFamily: 'InterMedium',
    color: '#727272',
    fontSize: 12,
  },
  activeTabText: {
    fontFamily: 'InterBold',
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#FFF',
    borderStyle: 'dashed',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 50,
  },
  content: {
    marginTop: 8,
  },
});
