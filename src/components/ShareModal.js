import React from 'react';
import {
  Modal,
  View,
  Text,
  Share,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalTokens } from './modalTokens';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import { showToast } from '../utils/toast';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

let clipboardModule;
let clipboardResolved = false;

const getClipboardModule = () => {
  if (clipboardResolved) {
    return clipboardModule;
  }

  clipboardResolved = true;

  try {
    const requiredModule = require('@react-native-clipboard/clipboard');
    clipboardModule = requiredModule?.default || requiredModule;
  } catch (error) {
    console.warn('Clipboard module is not available in the current native build.', error);
    clipboardModule = null;
  }

  return clipboardModule;
};

const copyLinkSafely = async (text) => {
  const Clipboard = getClipboardModule();

  if (Clipboard?.setString) {
    Clipboard.setString(text);
    return 'copied';
  }

  try {
    await Share.share({ message: text });
    return 'shared';
  } catch (error) {
    console.error('Failed to share link without clipboard module.', error);
    return 'failed';
  }
};

// 分享选项配置 - 只保留 Twitter 和 Copy Link
const shareOptions = [
  {
    id: 'twitter',
    name: 'Twitter',
    icon: 'logo-twitter',
    color: '#1DA1F2',
  },
  {
    id: 'link',
    name: 'Copy Link',
    icon: 'link-outline',
    color: '#6B7280',
  },
];

export default function ShareModal({ visible, onClose, shareData = {}, onShare }) {
  const bottomSafeInset = useBottomSafeInset(20);
  const [slideAnim] = React.useState(new Animated.Value(SCREEN_HEIGHT));
  const [backdropOpacity] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleShare = async (platform) => {
    if (platform === 'link') {
      const shareUrl = shareData?.url || 'Question ID: ' + shareData?.id;
      const result = await copyLinkSafely(shareUrl);

      if (result === 'copied') {
        showToast('Link copied', 'success');
      } else if (result === 'shared') {
        showToast('Clipboard unavailable, opened share sheet', 'info');
      } else {
        showToast('Clipboard unavailable in current build', 'warning');
      }

      handleClose();
      return;
    }

    handleClose();
    if (onShare) {
      onShare(platform, shareData);
    }
  };

  const moreOptions = [
    {
      id: 'report',
      name: 'Report',
      icon: 'flag-outline',
      color: '#EF4444',
    },
    {
      id: 'notInterested',
      name: 'Not Interested',
      icon: 'eye-off-outline',
      color: '#6B7280',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[
          styles.overlay,
          { opacity: backdropOpacity }
        ]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                {
                  transform: [{ translateY: slideAnim }],
                  paddingBottom: bottomSafeInset,
                },
              ]}
            >
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Share to</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.section}>
                  <View style={styles.optionsGrid}>
                    {shareOptions.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        style={styles.optionItem}
                        onPress={() => handleShare(option.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.optionIcon, { backgroundColor: option.color + '15' }]}>
                          <Ionicons name={option.icon} size={28} color={option.color} />
                        </View>
                        <Text style={styles.optionText}>{option.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.section}>
                  {moreOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={styles.moreOption}
                      onPress={() => handleShare(option.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.moreOptionLeft}>
                        <Ionicons name={option.icon} size={22} color={option.color} />
                        <Text style={[styles.moreOptionText, { color: option.color }]}>
                          {option.name}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay.backgroundColor,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  section: {
    paddingVertical: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  optionItem: {
    width: SCREEN_WIDTH / 4,
    alignItems: 'center',
    marginBottom: 20,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  optionText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  divider: {
    height: 8,
    backgroundColor: '#F9FAFB',
  },
  moreOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  moreOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreOptionText: {
    fontSize: 15,
    marginLeft: 12,
  },
});
