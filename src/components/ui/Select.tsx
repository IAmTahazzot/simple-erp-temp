/**
 * Select.tsx
 * A beautiful shadcn/ui-inspired Select component for React Native.
 * Zero third-party dependencies — only core React Native primitives.
 *
 * Usage:
 *   <Select
 *     placeholder="Select a fruit…"
 *     value={value}
 *     onValueChange={setValue}
 *     groups={[
 *       {
 *         label: 'Fruits',
 *         items: [
 *           { label: 'Apple',  value: 'apple' },
 *           { label: 'Banana', value: 'banana' },
 *           { label: 'Cherry', value: 'cherry', disabled: true },
 *         ],
 *       },
 *     ]}
 *   />
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  type LayoutRectangle,
  type ViewStyle,
} from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SelectItem {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectGroup {
  label?: string;
  items: SelectItem[];
}

export interface SelectProps {
  /** Groups of items. Use a single group with no label for a flat list. */
  groups: SelectGroup[];
  /** Currently selected value */
  value?: string | null;
  /** Callback fired when the user picks a value */
  onValueChange?: (value: string) => void;
  /** Placeholder shown when nothing is selected */
  placeholder?: string;
  /** Disable the entire select */
  disabled?: boolean;
  /** Additional styles for the trigger button */
  triggerStyle?: ViewStyle;
  /** Color scheme. Defaults to 'light'. */
  colorScheme?: 'light' | 'dark';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DROPDOWN_MAX_HEIGHT = 300;
const DROPDOWN_MARGIN = 6;
const ITEM_HEIGHT = 36;

// ─── Theme ───────────────────────────────────────────────────────────────────

const themes = {
  light: {
    bg: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    placeholder: '#94a3b8',
    muted: '#64748b',
    accent: '#f1f5f9',
    accentText: '#0f172a',
    indicator: '#0f172a',
    overlay: 'rgba(0,0,0,0.08)',
    shadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 4,
    },
    separator: '#f1f5f9',
    disabledText: '#cbd5e1',
    focusBorder: '#94a3b8',
  },
  dark: {
    bg: '#020817',
    border: '#1e293b',
    text: '#f8fafc',
    placeholder: '#475569',
    muted: '#94a3b8',
    accent: '#1e293b',
    accentText: '#f8fafc',
    indicator: '#f8fafc',
    overlay: 'rgba(0,0,0,0.5)',
    shadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    separator: '#1e293b',
    disabledText: '#334155',
    focusBorder: '#475569',
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function Select({
                         groups,
                         value,
                         onValueChange,
                         placeholder = 'Select an option…',
                         disabled = false,
                         triggerStyle,
                         colorScheme = 'light',
                       }: SelectProps) {
  const theme = themes[colorScheme];
  const [open, setOpen] = useState(false);
  const [triggerLayout, setTriggerLayout] = useState<LayoutRectangle | null>(null);
  const triggerRef = useRef<View>(null);

  // Animations
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;
  const chevronRotate = useRef(new Animated.Value(0)).current;

  const selectedLabel = value
    ? groups.flatMap(g => g.items).find(i => i.value === value)?.label
    : undefined;

  const openDropdown = useCallback(() => {
    if (disabled) return;
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setTriggerLayout({ x, y, width, height });
      setOpen(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(chevronRotate, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }, [disabled, opacity, translateY, chevronRotate]);

  const closeDropdown = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -8, duration: 120, useNativeDriver: true }),
      Animated.timing(chevronRotate, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setOpen(false));
  }, [opacity, translateY, chevronRotate]);

  const handleSelect = useCallback(
    (item: SelectItem) => {
      if (item.disabled) return;
      onValueChange?.(item.value);
      closeDropdown();
    },
    [onValueChange, closeDropdown],
  );

  // Compute dropdown position.
  // statusBarTranslucent={true} means the Modal's coordinate space starts
  // from the very top of the screen — same origin as measureInWindow — so no
  // manual status-bar offset is needed here.
  const dropdownStyle = (() => {
    if (!triggerLayout) return {};
    const triggerBottom = triggerLayout.y + triggerLayout.height;
    const spaceBelow = SCREEN_HEIGHT - triggerBottom;
    const openBelow = spaceBelow >= Math.min(DROPDOWN_MAX_HEIGHT, 120);

    return {
      position: 'absolute' as const,
      left: triggerLayout.x,
      width: triggerLayout.width,
      maxHeight: DROPDOWN_MAX_HEIGHT,
      ...(openBelow
        ? { top: triggerBottom + DROPDOWN_MARGIN }
        : { bottom: SCREEN_HEIGHT - triggerLayout.y + DROPDOWN_MARGIN }),
    };
  })();

  const chevronRotateDeg = chevronRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Build flat renderable list
  type Row =
    | { type: 'label'; id: string; text: string }
    | { type: 'item'; id: string; item: SelectItem }
    | { type: 'separator'; id: string };

  const rows: Row[] = [];
  groups.forEach((group, gi) => {
    if (gi > 0) rows.push({ type: 'separator', id: `sep-${gi}` });
    if (group.label) rows.push({ type: 'label', id: `lbl-${gi}`, text: group.label });
    group.items.forEach((item, ii) =>
      rows.push({ type: 'item', id: `item-${gi}-${ii}`, item }),
    );
  });

  return (
    <>
      {/* ── Trigger ── */}
      <TouchableOpacity
        ref={triggerRef}
        activeOpacity={0.8}
        onPress={open ? closeDropdown : openDropdown}
        disabled={disabled}
        style={[
          styles.trigger,
          {
            borderColor: open ? theme.focusBorder : theme.border,
            backgroundColor: theme.bg,
            opacity: disabled ? 0.5 : 1,
          },
          triggerStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={selectedLabel ?? placeholder}
        accessibilityState={{ expanded: open, disabled }}
      >
        <Text
          style={[
            styles.triggerText,
            { color: selectedLabel ? theme.text : theme.placeholder },
          ]}
          numberOfLines={1}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <Animated.View style={{ transform: [{ rotate: chevronRotateDeg }] }}>
          <ChevronDown color={theme.muted} size={16} />
        </Animated.View>
      </TouchableOpacity>

      {/* ── Dropdown Modal ── */}
      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeDropdown}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={closeDropdown}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} />
        </TouchableWithoutFeedback>

        {/* Dropdown panel */}
        <Animated.View
          style={[
            styles.dropdown,
            {
              ...theme.shadow,
              backgroundColor: theme.bg,
              borderColor: theme.border,
              opacity,
              transform: [{ translateY }],
            },
            dropdownStyle,
          ]}
        >
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {rows.map(row => {
              if (row.type === 'separator') {
                return (
                  <View
                    key={row.id}
                    style={[styles.separator, { backgroundColor: theme.separator }]}
                  />
                );
              }

              if (row.type === 'label') {
                return (
                  <Text key={row.id} style={[styles.groupLabel, { color: theme.muted }]}>
                    {row.text}
                  </Text>
                );
              }

              // item
              const { item } = row;
              const isSelected = item.value === value;

              return (
                <SelectOption
                  key={row.id}
                  item={item}
                  isSelected={isSelected}
                  theme={theme}
                  onPress={() => handleSelect(item)}
                />
              );
            })}
          </ScrollView>
        </Animated.View>
      </Modal>
    </>
  );
}

// ─── Option Row ───────────────────────────────────────────────────────────────

interface OptionProps {
  item: SelectItem;
  isSelected: boolean;
  theme: (typeof themes)['light'];
  onPress: () => void;
}

function SelectOption({ item, isSelected, theme, onPress }: OptionProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={item.disabled}
      accessibilityRole="menuitem"
      accessibilityState={{ selected: isSelected, disabled: item.disabled }}
      style={[
        styles.option,
        pressed && !item.disabled && { backgroundColor: theme.accent },
        isSelected && { backgroundColor: theme.accent },
      ]}
    >
      {/* Check placeholder keeps layout consistent */}
      <View style={styles.checkSlot}>
        {isSelected && <Check color={theme.indicator} size={14} strokeWidth={2.5} />}
      </View>
      <Text
        style={[
          styles.optionText,
          {
            color: item.disabled ? theme.disabledText : theme.text,
            fontWeight: isSelected ? '500' : '400',
          },
        ]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  trigger: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginRight: 8,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 20,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  separator: {
    height: 1,
    marginVertical: 4,
    marginHorizontal: 0,
  },
  option: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  checkSlot: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
