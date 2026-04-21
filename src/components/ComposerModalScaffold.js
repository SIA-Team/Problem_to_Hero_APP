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
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import KeyboardDismissView from './KeyboardDismissView';
import { modalTokens } from './modalTokens';
import {
  resolveComposerFooterPadding,
  resolveComposerKeyboardMetrics,
  resolveComposerTopInset,
} from '../utils/composerLayout';
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
  footerHidden = false,
  containerStyle = null,
  overlayContent = null,
  floatingOverlay = null,
}) {
  const insets = useSafeAreaInsets();
  const [keyboardOffset, setKeyboardOffset] = React.useState(0);
  const [floatingOverlayOffset, setFloatingOverlayOffset] = React.useState(0);
  const initialTopInset = initialWindowMetrics?.insets?.top ?? 0;
  const topSafeInset = resolveComposerTopInset({
    platform: Platform.OS,
    topInset: insets.top,
    initialTopInset,
    statusBarHeight: StatusBar.currentHeight || 0,
  });

  React.useEffect(() => {
    if (!visible) {
      setKeyboardOffset(0);
      setFloatingOverlayOffset(0);
      return undefined;
    }

    const syncKeyboardOffset = event => {
      const windowHeight = Dimensions.get('window').height;
      const keyboardHeight = event?.endCoordinates?.height || 0;
      const keyboardScreenY = event?.endCoordinates?.screenY ?? windowHeight;
      const keyboardMetrics = resolveComposerKeyboardMetrics({
        platform: Platform.OS,
        windowHeight,
        keyboardHeight,
        keyboardScreenY,
        footerBottomInset,
        androidFooterClearance: Math.max(footerBottomInset, 12),
      });

      setKeyboardOffset(keyboardMetrics.footerOffset);
      setFloatingOverlayOffset(keyboardMetrics.overlayOffset);
    };
    const resetKeyboardOffset = () => {
      setKeyboardOffset(0);
      setFloatingOverlayOffset(0);
    };

    const subscriptions = [];
    const showEvents =
      Platform.OS === 'ios'
        ? [
            'keyboardWillShow',
            'keyboardDidShow',
            'keyboardWillChangeFrame',
            'keyboardDidChangeFrame',
          ]
        : ['keyboardDidShow'];
    const hideEvents =
      Platform.OS === 'ios' ? ['keyboardWillHide', 'keyboardDidHide'] : ['keyboardDidHide'];

    showEvents.forEach(eventName => {
      subscriptions.push(Keyboard.addListener(eventName, syncKeyboardOffset));
    });
    hideEvents.forEach(eventName => {
      subscriptions.push(Keyboard.addListener(eventName, resetKeyboardOffset));
    });

    return () => {
      subscriptions.forEach(subscription => subscription.remove());
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
  const effectiveFooterPaddingBottom = resolveComposerFooterPadding({
    footerPaddingBottom,
    footerBottomInset,
    keyboardOffset,
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={[styles.container, containerStyle]}>
        <KeyboardDismissView>
          <View
            style={[
              styles.header,
              {
                paddingTop: topSafeInset + 8,
              },
            ]}
          >
            {renderHeaderLeft()}
            <View style={styles.headerCenter}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>
            {renderHeaderRight()}
          </View>

          {headerNotice}

          <View style={styles.body}>
            <View style={styles.content}>{children}</View>

            {shouldRenderFooter ? (
              <View
                pointerEvents={footerHidden ? 'none' : 'auto'}
                style={[
                  styles.footer,
                  footerHidden && styles.footerHidden,
                  {
                    paddingBottom: effectiveFooterPaddingBottom,
                    transform: [{ translateY: -keyboardOffset }],
                  },
                ]}
              >
                <View style={styles.footerLeft}>{footerLeft}</View>
                {resolvedFooterRight ? (
                  <View style={styles.footerRight}>{resolvedFooterRight}</View>
                ) : null}
              </View>
            ) : null}
          </View>
        </KeyboardDismissView>

        {overlayContent ? (
          <View pointerEvents="box-none" style={styles.overlayContentHost}>
            {overlayContent}
          </View>
        ) : null}

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
      </View>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
    backgroundColor: modalTokens.surface,
  },
  body: {
    flex: 1,
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
  footerHidden: {
    opacity: 0,
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
  overlayContentHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
  },
});
