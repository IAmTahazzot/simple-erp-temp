import React from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

interface AppTextProps extends TextProps {
    children: React.ReactNode;
    style?: TextStyle;
}

export const AppText: React.FC<AppTextProps> = ({ children, style, ...props }) => {
    return (
        <Text style={[styles.defaultFont, style]} {...props}>
            {children}
        </Text>
    )
}



const styles = StyleSheet.create({
    defaultFont: {
        fontFamily: 'Inter_400Regular',
    }
})