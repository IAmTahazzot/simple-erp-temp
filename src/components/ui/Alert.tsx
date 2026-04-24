import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertProps {
  visible: boolean;
  title: string;
  description?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

export const Alert = ({
                        visible,
                        title,
                        description,
                        buttons = [{text: 'OK'}],
                        onDismiss,
                      }: AlertProps) => {
  const scaleAnim = useRef(new Animated.Value(1.2)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(1.2);
      Animated.spring(scaleAnim, {
        toValue: 1,
        bounciness: 12,
        speed: 20,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, scaleAnim]);

  const renderButtons = () => {
    const isHorizontal = buttons.length === 2;

    return (
      <View
        style={[
          styles.buttonContainer,
          isHorizontal ? styles.buttonContainerHorizontal : styles.buttonContainerVertical,
        ]}
      >
        {buttons.map((btn, index) => {
          const isLast = index === buttons.length - 1;
          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={() => {
                btn.onPress?.();
                if (onDismiss) onDismiss();
              }}
              style={[
                styles.button,
                isHorizontal && !isLast && styles.buttonBorderRight,
                !isHorizontal && !isLast && styles.buttonBorderBottom,
                isHorizontal && styles.buttonHorizontalItem,
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  btn.style === 'cancel' && styles.buttonTextCancel,
                  btn.style === 'destructive' && styles.buttonTextDestructive,
                ]}
              >
                {btn.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.alertBox,
            {
              transform: [{scale: scaleAnim}],
            },
          ]}
        >
          <View style={styles.contentContainer}>
            <Text style={styles.title}>{title || 'Unknown alert'}</Text>
            {description ? (
              <Text style={styles.description}>{description}</Text>
            ) : null}
          </View>
          {renderButtons()}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  alertBox: {
    width: 270,
    backgroundColor: '#F8F8F8', // iOS alert background
    borderRadius: 14,
    overflow: 'hidden',
    zIndex: 1001,
  },
  contentContainer: {
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#3F3F3F50',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#000',
    textAlign: 'center',
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: 'column',
  },
  buttonContainerHorizontal: {
    flexDirection: 'row',
  },
  buttonContainerVertical: {
    flexDirection: 'column',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  buttonHorizontalItem: {
    flex: 1,
  },
  buttonBorderRight: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#3F3F3F50',
  },
  buttonBorderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#3F3F3F50',
  },
  buttonText: {
    fontSize: 17,
    color: '#007AFF', // iOS blue
    fontWeight: '400',
  },
  buttonTextCancel: {
    fontWeight: '600',
  },
  buttonTextDestructive: {
    color: '#FF3B30', // iOS red
  },
});
