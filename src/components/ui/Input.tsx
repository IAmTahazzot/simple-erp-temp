import {useRef, useState} from 'react';
import {StyleSheet, TextInput, Text, Pressable, KeyboardAvoidingView, TextInputProps} from 'react-native';
import {Colors, type ThemeType, Themes} from '@/constants/colors';

type InputProps = TextInputProps & {
  theme?: ThemeType;
  autoGrow?: boolean;
}

export const Input = ({placeholder, theme = 'DARK', value, size, autoGrow, onChangeText, style, ...rest}: InputProps & {
  size?: 'small' | 'medium' | 'large'
}) => {
  const [isFocused, setIsFocused] = useState(false);
  let inputSizeStyle = {};
  let inputFocusedSizeStyle = {};

  switch (size) {
    case 'large':
      inputSizeStyle = {fontSize: 18, paddingVertical: 12, paddingHorizontal: 16};
      inputFocusedSizeStyle = {paddingVertical: 11, paddingHorizontal: 15};
      break;
    case 'medium':
      inputSizeStyle = {fontSize: 16, paddingVertical: 10, paddingHorizontal: 14};
      inputFocusedSizeStyle = {paddingVertical: 9, paddingHorizontal: 13};
      break;
    case 'small':
      inputSizeStyle = {fontSize: 12, paddingVertical: 8, paddingHorizontal: 12};
      inputFocusedSizeStyle = {paddingVertical: 7, paddingHorizontal: 11};
      break;
    default:
      inputSizeStyle = {fontSize: 14, paddingVertical: 10, paddingHorizontal: 14};
      inputFocusedSizeStyle = {paddingVertical: 9, paddingHorizontal: 13};
  }

  return (
    <KeyboardAvoidingView>
      <TextInput textContentType={'none'}
                 placeholder={placeholder || 'Enter your text here'}
                 keyboardType={'default'}
                 value={value}
                 multiline={autoGrow}
                 placeholderTextColor={Colors.light.placeholder}
                 {...rest}
                 style={
                   [
                     styles.input,
                     inputSizeStyle,
                     isFocused && [styles.inputFocused, inputFocusedSizeStyle, theme && {borderColor: Themes[theme]}],
                     style
                   ]}
                 onChangeText={onChangeText}
                 onFocus={() => setIsFocused(true)}
                 onBlur={() => setIsFocused(false)}/>
    </KeyboardAvoidingView>
  )
}

export const MegaInput = ({label, theme = 'DARK', autoGrow, style, ...inputProps}: {
  label: string,
  theme?: ThemeType,
  autoGrow?: boolean,
  
} & Omit<InputProps, 'theme' | 'autoGrow'>) => {
  const [isFocused, setIsFocused] = useState(false);
  const themeColor = Themes[theme] || Themes.DARK;
  const inputRef = useRef<TextInput>(null)
  const disabledStyle = inputProps.editable === false ? {backgroundColor: '#f0f0f0', borderColor: 'transparent'} : {}
  
  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      style={[
        styles.megaInput,
        isFocused && {borderColor: themeColor, borderWidth: 2, paddingHorizontal: 13, paddingTop: 7, paddingBottom: 3},
        disabledStyle,
      ]}
    >
      <Text style={[styles.megaInputLabel, isFocused && {color: themeColor}]}>{label}</Text>
      <TextInput
        {...inputProps}
        ref={inputRef}
        placeholderTextColor={'#797979'}
        multiline={autoGrow}
        style={[styles.megaInputText, autoGrow && { minHeight: 24 }, style ]}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    color: Colors.light.text,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: Colors.light.border,
    fontFamily: 'InterRegular',
  },
  inputFocused: {
    borderColor: Themes.WATER,
    borderWidth: 2,
  },
  megaInput: {
    display: 'flex',
    flexDirection: 'column',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    backgroundColor: '#fff',
    minHeight: 56,
    justifyContent: 'center',
  },
  megaInputLabel: {
    fontSize: 12,
    color: '#636363',
    fontFamily: 'InterMedium',
  },
  megaInputText: {
    fontSize: 18,
    color: Colors.light.text,
    paddingHorizontal: 0, // Reset default padding
    paddingVertical: 4,
    margin: 0,
    minHeight: 24,
  },
})
