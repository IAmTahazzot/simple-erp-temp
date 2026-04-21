import {database} from "@/database";
import User from "@/database/models/User";
import {useAuthStore} from "@/store/authStore";
import React, {useState} from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useAuthStore((state) => state.login);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      const newUser = await database.write(async () => {
        return database.collections
          .get<User>("users")
          .create((user: any) => {
            user.name = name;
            user.email = email;
            user.password_hash = password;
          })
      });

      await login(
        {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
        "local-auth-token", // In an offline-only mode temporarily, you generate this token
      );

      Alert.alert('Success', 'Account created successfully!');
    } catch (e: any) {
      Alert.alert("Registration Failed", e.message || "Could not create user");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an account</Text>
      <Text style={styles.subtitle}>
        Enter your details below to create your account
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="John Doe"
          placeholderTextColor="#666"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      </View>

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

      <Pressable style={({pressed}) => {
        return [
          [styles.button],
          pressed && {
            outlineOffset: 3,
            outlineWidth: 1,
            outlineColor: '#FFF',
          }
        ]
      }} onPress={handleRegister}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  title: {
    fontFamily: "InterSemiBold",
    fontSize: 24,
    color: "#FFF",
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: "InterRegular",
    fontSize: 14,
    color: "#A0A0A0",
    marginBottom: 24,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: "InterMedium",
    fontSize: 14,
    color: "#FFF",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "#151515",
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#FFF",
    fontFamily: "InterRegular",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#FFF",
    borderRadius: 6,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    fontFamily: "InterMedium",
    fontSize: 15,
    color: "#000",
  },
});
