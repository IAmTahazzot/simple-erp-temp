import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  type LayoutRectangle,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────
export type NavLink = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type DropdownNavigationProps = {
  /** Each inner array is a group; groups are separated by a hairline. */
  links: NavLink[][];
  onChange?: (link: NavLink) => void; // Optional callback when a link is selected
};

// ─── Component ────────────────────────────────────────────────────────────────

export const DropdownNavigation = ({ links, onChange }: DropdownNavigationProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [triggerLayout, setTriggerLayout] = useState<LayoutRectangle | null>(null);
  const triggerRef = useRef<View>(null);

  // Animations
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(-12)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const chevronRotate = useRef(new Animated.Value(0)).current;

  // Find the active link label for the trigger
  const allLinks = links.flat();
  const activeLink = allLinks
    .filter(l => pathname === l.href || pathname.startsWith(l.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const triggerLabel = activeLink?.label ?? 'Menu';
  
  // ── Open ──
  const openMenu = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setTriggerLayout({ x, y, width, height });
      setOpen(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 260,
          mass: 0.8,
        }),
        Animated.timing(chevronRotate, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  }, [overlayOpacity, cardOpacity, cardTranslateY, chevronRotate]);

  // ── Close ──
  const closeMenu = useCallback(() => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(cardTranslateY, { toValue: -12, duration: 160, useNativeDriver: true }),
      Animated.timing(chevronRotate, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setOpen(false));
  }, [overlayOpacity, cardOpacity, cardTranslateY, chevronRotate]);

  // ── Navigate ──
  const handlePress = useCallback(
    (href: string) => {
      closeMenu();
      const link = allLinks.find(l => l.href === href);  // 👈 find the full link object
      if (link) onChange?.(link);                         // 👈 fire with full NavLink
      // Give close animation a head-start before navigating
      setTimeout(() => router.push(href as any), 80);
    },
    [closeMenu, router, allLinks, onChange],
  );

  const chevronDeg = chevronRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Card top = just below the trigger
  const cardTop = triggerLayout ? triggerLayout.y + triggerLayout.height + 8 : 80;
  
  return (
    <>
      {/* ── Trigger ── */}
      <TouchableOpacity
        ref={triggerRef}
        onPress={open ? closeMenu : openMenu}
        activeOpacity={0.7}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel="Open navigation menu"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.triggerLabel}>{triggerLabel}</Text>
        <Animated.View style={{ transform: [{ rotate: chevronDeg }] }}>
          <ChevronDown size={18} color="#ffffff" strokeWidth={2.2} />
        </Animated.View>
      </TouchableOpacity>

      {/* ── Dropdown Modal ── */}
      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeMenu}
      >
        {/* Dimmed overlay */}
        <TouchableWithoutFeedback onPress={closeMenu}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>

        {/* Menu card */}
        <Animated.View
          style={[
            styles.card,
            {
              top: cardTop,
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
        >
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {links.map((group, groupIndex) => (
              <React.Fragment key={groupIndex}>
                {/* Separator between groups */}
                {groupIndex > 0 && <View style={styles.separator} />}

                {group.map((link) => {
                  const isActive =
                    pathname === link.href || pathname.startsWith(link.href + '/');

                  return (
                    <NavItem
                      key={link.href}
                      link={link}
                      isActive={isActive}
                      onPress={() => handlePress(link.href)}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </ScrollView>
        </Animated.View>
      </Modal>
    </>
  );
};

// ─── Nav Item ─────────────────────────────────────────────────────────────────

type NavItemProps = {
  link: NavLink;
  isActive: boolean;
  onPress: () => void;
};

function NavItem({ link, isActive, onPress }: NavItemProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="menuitem"
      accessibilityState={{ selected: isActive }}
      style={[
        styles.item,
        isActive && styles.itemActive,
        pressed && !isActive && styles.itemPressed,
      ]}
    >
      {/* Icon */}
      <View style={styles.itemIcon}>{link.icon}</View>

      {/* Label */}
      <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>
        {link.label}
      </Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_LEFT = 16;
const CARD_RIGHT = 16;

const styles = StyleSheet.create({
  // ── Trigger
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  triggerLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },

  // ── Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  // ── Card
  card: {
    position: 'absolute',
    left: CARD_LEFT,
    right: CARD_RIGHT,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 8,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },

  // ── Separator
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginVertical: 6,
    marginHorizontal: 16,
  },

  // ── Item
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 10,
    marginHorizontal: 6,
    gap: 14,
  },
  itemActive: {
    backgroundColor: '#f3f4f6',
  },
  itemPressed: {
    backgroundColor: '#f9fafb',
  },
  itemIcon: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: '#111827',
    letterSpacing: -0.1,
  },
  itemLabelActive: {
    fontWeight: '700',
  },
});
