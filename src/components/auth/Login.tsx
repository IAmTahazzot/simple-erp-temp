import { useAuthStore } from '@/store/authStore';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    // Placeholder logic for now
    if (email && password) {
      await login({ id: '1', name: 'Demo User', email }, 'fake-jwt-token');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Text style={styles.subtitle}>Enter your email below to login to your account</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="m@example.com"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#666"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <Pressable style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  title: {
    fontFamily: 'InterSemiBold',
    fontSize: 24,
    color: '#FFF',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'InterRegular',
    fontSize: 14,
    color: '#A0A0A0',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'InterMedium',
    fontSize: 14,
    color: '#FFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFF',
    fontFamily: 'InterRegular',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#FFF',
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    fontFamily: 'InterMedium',
    fontSize: 15,
    color: '#000',
  },
});