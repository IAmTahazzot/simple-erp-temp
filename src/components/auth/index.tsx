import { Colors } from '@/constants/colors';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Login from './Login';
import Register from './Register';

export default function AuthScreen() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <View style={styles.container}>
      <View style={styles.card}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.dark.background,
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