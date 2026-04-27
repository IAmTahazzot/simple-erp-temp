import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';

interface ButtonProps {
  title?: string;
  onPress?: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number };
}

export const Button = ({
  title,
  onPress,
  variant = 'default',
  size = 'default',
  loading = false,
  disabled = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
  hitSlop = 10
}: ButtonProps) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'destructive': return { backgroundColor: '#ef4444' }; // red-500
      case 'outline': return { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#e5e7eb' };
      case 'secondary': return { backgroundColor: '#f3f4f6' }; // gray-100
      case 'ghost': return { backgroundColor: 'transparent' };
      case 'link': return { backgroundColor: 'transparent', paddingHorizontal: 0 };
      default: return { backgroundColor: '#09090b' }; // zinc-950
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'sm': return { height: 36, paddingHorizontal: 12 };
      case 'lg': return { height: 44, paddingHorizontal: 32 };
      case 'icon': return { height: 40, width: 40, justifyContent: 'center', padding: 0 };
      default: return { height: 40, paddingHorizontal: 16 };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'outline':
      case 'ghost':
        return { color: '#09090b' };
      case 'secondary':
        return { color: '#111827' };
      case 'link':
        return { color: '#09090b', textDecorationLine: 'underline' };
      default:
        return { color: '#fafafa' };
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={hitSlop}
      style={[
        styles.base,
        getVariantStyle(),
        getSizeStyle(),
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextStyle().color as string} style={styles.iconMargin} />
      ) : leftIcon ? (
        <React.Fragment>{leftIcon}</React.Fragment>
      ) : null}
      
      {title && size !== 'icon' && (
        <Text style={[styles.text, getTextStyle(), textStyle]}>{title}</Text>
      )}

      {!loading && rightIcon && <React.Fragment>{rightIcon}</React.Fragment>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'InterMedium',
  },
  iconMargin: {
    marginRight: 8,
  },
});

