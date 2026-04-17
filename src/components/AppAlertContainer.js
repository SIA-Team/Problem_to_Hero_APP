import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { modalTokens } from './modalTokens';

const defaultButtons = [{ text: '我知道了' }];

function normalizeButtons(buttons) {
  const normalizedButtons =
    Array.isArray(buttons) && buttons.length > 0 ? buttons : defaultButtons;

  return normalizedButtons.map((button, index) => {
    if (!button || typeof button !== 'object') {
      return {
        text: index === 0 && normalizedButtons.length === 1 ? '我知道了' : '确定',
      };
    }

    const nextText =
      typeof button.text === 'string' && button.text.trim()
        ? button.text.trim()
        : normalizedButtons.length === 1
          ? '我知道了'
          : '确定';

    if (normalizedButtons.length === 1 && /^ok$/i.test(nextText)) {
      return {
        ...button,
        text: '我知道了',
      };
    }

    return {
      ...button,
      text: nextText,
    };
  });
}

function normalizeAlertConfig(title, message, buttons, options) {
  return {
    title: title || '提示',
    message: typeof message === 'string' ? message : '',
    buttons: normalizeButtons(buttons),
    options: options || {},
  };
}

const AppAlertContainer = forwardRef((_, ref) => {
  const queueRef = useRef([]);
  const currentAlertRef = useRef(null);
  const [currentAlert, setCurrentAlert] = useState(null);

  useEffect(() => {
    currentAlertRef.current = currentAlert;
  }, [currentAlert]);

  const showNext = useCallback(() => {
    const nextAlert = queueRef.current.shift() || null;
    currentAlertRef.current = nextAlert;
    setCurrentAlert(nextAlert);
  }, []);

  const closeCurrent = useCallback(() => {
    currentAlertRef.current = null;
    setCurrentAlert(null);
    requestAnimationFrame(showNext);
  }, [showNext]);

  const showAlert = useCallback((title, message, buttons, options) => {
    const nextAlert = normalizeAlertConfig(title, message, buttons, options);
    if (currentAlertRef.current) {
      queueRef.current.push(nextAlert);
      return;
    }
    currentAlertRef.current = nextAlert;
    setCurrentAlert(nextAlert);
  }, []);

  useImperativeHandle(ref, () => ({
    showAlert,
  }), [showAlert]);

  const handleButtonPress = (button) => {
    closeCurrent();
    if (typeof button?.onPress === 'function') {
      try {
        button.onPress();
      } catch (error) {
        console.error('AppAlert button onPress error:', error);
      }
    }
  };

  const cancelable = currentAlert?.options?.cancelable !== false;
  const verticalButtons = (currentAlert?.buttons?.length || 0) > 2;

  return (
    <Modal
      transparent
      visible={!!currentAlert}
      animationType="fade"
      onRequestClose={() => {
        if (cancelable) {
          closeCurrent();
        }
      }}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (cancelable) {
              closeCurrent();
            }
          }}
        />
        <View style={styles.card}>
          <Text style={styles.title}>{currentAlert?.title || '提示'}</Text>
          {!!currentAlert?.message && <Text style={styles.message}>{currentAlert.message}</Text>}

          <View style={[styles.buttons, verticalButtons && styles.buttonsVertical]}>
            {(currentAlert?.buttons || defaultButtons).map((button, index) => {
              const isCancel = button?.style === 'cancel';
              const isDestructive = button?.style === 'destructive';

              return (
                <TouchableOpacity
                  key={`${button?.text || 'button'}-${index}`}
                  style={[
                    styles.button,
                    verticalButtons && styles.buttonVertical,
                    isCancel && styles.buttonCancel,
                    isDestructive && styles.buttonDestructive,
                  ]}
                  onPress={() => handleButtonPress(button)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel && styles.buttonTextCancel,
                      isDestructive && styles.buttonTextDestructive,
                    ]}
                  >
                    {button?.text || '我知道了'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: modalTokens.backdrop,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: modalTokens.radius,
    backgroundColor: modalTokens.surface,
    borderWidth: 1,
    borderColor: modalTokens.border,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: modalTokens.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: modalTokens.textSecondary,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  buttonsVertical: {
    flexDirection: 'column',
  },
  button: {
    minWidth: 84,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
  },
  buttonVertical: {
    width: '100%',
  },
  buttonCancel: {
    backgroundColor: '#f3f4f6',
  },
  buttonDestructive: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextCancel: {
    color: '#374151',
  },
  buttonTextDestructive: {
    color: '#ffffff',
  },
});

export default AppAlertContainer;
