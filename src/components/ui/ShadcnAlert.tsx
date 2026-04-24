import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { Terminal, AlertCircle } from 'lucide-react-native';

interface AlertProps {
  variant?: 'default' | 'destructive';
  title: string;
  description?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const ShadcnAlert = ({
  variant = 'default',
  title,
  description,
  icon,
  style,
}: AlertProps) => {
  const isDestructive = variant === 'destructive';

  return (
    <View
      style={[
        styles.container,
        isDestructive && styles.destructiveContainer,
        style,
      ]}
    >
      <View style={styles.header}>
        {icon || (isDestructive ? <AlertCircle color="#ef4444" size={16} /> : <Terminal color="#000" size={16} />)}
        <Text
          style={[
            styles.title,
            isDestructive && styles.destructiveText,
          ]}
        >
          {title}
        </Text>
      </View>
      {description ? (
        <Text
          style={[
            styles.description,
            isDestructive && styles.destructiveText,
          ]}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb', // gray-200
    borderRadius: 8,
    padding: 16,
    width: '100%',
  },
  destructiveContainer: {
    borderColor: '#fca5a5', // red-300
    backgroundColor: '#fef2f2', // red-50
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginLeft: 8,
    fontFamily: 'InterMedium',
  },
  description: {
    fontSize: 14,
    color: '#4b5563', // gray-600
    marginLeft: 24, // align with text, account for icon
    fontFamily: 'InterRegular',
  },
  destructiveText: {
    color: '#ef4444', // red-500
  },
});

