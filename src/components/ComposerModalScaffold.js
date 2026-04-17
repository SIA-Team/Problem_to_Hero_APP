import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
  Keyboard,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import KeyboardDismissView from './KeyboardDismissView';
import ModalSafeAreaView from './ModalSafeAreaView';
import { modalTokens } from './modalTokens';
import { scaleFont } from '../utils/responsive';

export default function ComposerModalScaffold({
  visible,
  onClose,
  title,
  children,
  onSubmit,
  submitText = '发布',
  submitDisabled = false,
  submitPlacement = 'header',
  closePlacement = 'left',
  headerNotice = null,
  footerLeft = null,
  footerRight = null,
  footerPaddingBottom = 0,
  footerBottomInset = 0,
  containerStyle = null,
  floatingOverlay = null,
}) {
  const [keyboardOffset, setKeyboardOffset] = React.useState(0);
  const [floatingOverlayOffset, setFloatingOverlayOffset] = React.useState(0);

  React.useEffect(() => {
    if (!visible) {
      setKeyboardOffset(0);
      setFloatingOverlayOffset(0);
      return undefined;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const frameChangeEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : null;
    const resolveKeyboardOverlap = event => {
      const windowHeight = Dimensions.get('window').height;
      const keyboardHeight = event?.endCoordinates?.height || 0;
      const keyboardScreenY = event?.endCoordinates?.screenY ?? windowHeight;
      const overlapFromScreenY = Math.max(windowHeight - keyboardScreenY, 0);
      const effectiveKeyboardHeight = Math.max(keyboardHeight, overlapFromScreenY);
      const androidKeyboardClearance = Math.max(footerBottomInset, 12);

      return Platform.OS === 'ios'
        ? Math.max(effectiveKeyboardHeight - footerBottomInset, 0)
        : Math.max(effectiveKeyboardHeight + androidKeyboardClearance, 0);
    };
    const resolveFloatingOverlayOffset = event => {
      const windowHeight = Dimensions.get('window').height;
      const keyboardHeight = event?.endCoordinates?.height || 0;
      const keyboardScreenY = event?.endCoordinates?.screenY ?? windowHeight;
      const overlapFromScreenY = Math.max(windowHeight - keyboardScreenY, 0);
      const effectiveKeyboardHeight = Math.max(keyboardHeight, overlapFromScreenY);

      return Platform.OS === 'ios'
        ? Math.max(effectiveKeyboardHeight - footerBottomInset, 0)
        : Math.max(effectiveKeyboardHeight, 0);
    };
    const syncKeyboardOffset = event => {
      setKeyboardOffset(resolveKeyboardOverlap(event));
      setFloatingOverlayOffset(resolveFloatingOverlayOffset(event));
    };
    const resetKeyboardOffset = () => {
      setKeyboardOffset(0);
      setFloatingOverlayOffset(0);
    };

    const showSubscription = Keyboard.addListener(showEvent, syncKeyboardOffset);
    const hideSubscription = Keyboard.addListener(hideEvent, resetKeyboardOffset);
    const frameChangeSubscription = frameChangeEvent
      ? Keyboard.addListener(frameChangeEvent, syncKeyboardOffset)
      : null;

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      frameChangeSubscription?.remove();
    };
  }, [footerBottomInset, visible]);

  const renderSubmitButton = extraStyle => (
    <TouchableOpacity
      onPress={onSubmit}
      style={[
        styles.submitButton,
        extraStyle,
        submitDisabled && styles.submitButtonDisabled,
      ]}
      disabled={submitDisabled}
    >
      <Text
        style={[
          styles.submitButtonText,
          submitDisabled && styles.submitButtonTextDisabled,
        ]}
      >
        {submitText}
      </Text>
    </TouchableOpacity>
  );

  const renderHeaderLeft = () => {
    if (closePlacement === 'left') {
      return (
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={26} color={modalTokens.textPrimary} />
        </TouchableOpacity>
      );
    }

    return <View style={styles.headerLeftPlaceholder} />;
  };

  const renderHeaderRight = () => {
    if (submitPlacement === 'header') {
      return renderSubmitButton();
    }

    if (closePlacement === 'right') {
      return (
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={26} color={modalTokens.textPrimary} />
        </TouchableOpacity>
      );
    }

    return <View style={styles.headerRightPlaceholder} />;
  };

  const resolvedFooterRight =
    submitPlacement === 'footer' ? renderSubmitButton(styles.footerSubmitButton) : footerRight;
  const shouldRenderFooter =
    submitPlacement === 'footer' || Boolean(footerLeft) || Boolean(resolvedFooterRight);
  const restingFooterPaddingBottom = footerPaddingBottom;
  const raisedFooterPaddingBottom = Math.max(footerPaddingBottom - footerBottomInset, 0);
  const effectiveFooterPaddingBottom =
    keyboardOffset > 0 ? raisedFooterPaddingBottom : restingFooterPaddingBottom;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <ModalSafeAreaView style={[styles.container, containerStyle]} edges={['top']}>
        <KeyboardDismissView>
          <View style={styles.header}>
            {renderHeaderLeft()}
            <View style={styles.headerCenter}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>
            {renderHeaderRight()}
          </View>

          {headerNotice}

          <View style={styles.content}>{children}</View>

          {shouldRenderFooter ? (
            <View
              style={[
                styles.footer,
                {
                  paddingBottom: effectiveFooterPaddingBottom,
                  marginBottom: keyboardOffset,
                },
              ]}
            >
              <View style={styles.footerLeft}>{footerLeft}</View>
              {resolvedFooterRight ? (
                <View style={styles.footerRight}>{resolvedFooterRight}</View>
              ) : null}
            </View>
          ) : null}
        </KeyboardDismissView>

        {floatingOverlay ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.floatingOverlayHost,
              {
                bottom: floatingOverlayOffset > 0 ? floatingOverlayOffset : 0,
              },
            ]}
          >
            {floatingOverlay}
          </View>
        ) : null}
      </ModalSafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: modalTokens.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
    backgroundColor: modalTokens.surface,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerLeftPlaceholder: {
    width: 40,
  },
  headerRightPlaceholder: {
    width: 72,
  },
  closeButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  content: {
    flex: 1,
  },
  submitButton: {
    minWidth: 72,
    paddingHorizontal: modalTokens.actionPaddingX,
    paddingVertical: 10,
    borderRadius: modalTokens.actionRadius,
    backgroundColor: modalTokens.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSubmitButton: {
    minWidth: 88,
    borderRadius: modalTokens.pillRadius,
  },
  submitButtonDisabled: {
    backgroundColor: modalTokens.dangerSoft,
  },
  submitButtonText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#ffffff',
  },
  submitButtonTextDisabled: {
    opacity: 0.85,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border,
    backgroundColor: modalTokens.surface,
  },
  footerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerRight: {
    marginLeft: 16,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  floatingOverlayHost: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
  },
});
