import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import ShareToFriendsModal from './ShareToFriendsModal';
import EditTextModal from './EditTextModal';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import { showToast } from '../utils/toast';
import { buildProblemToHeroInviteText, buildShareUrl, openTwitterShare } from '../utils/shareService';

import { scaleFont } from '../utils/responsive';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    id: 'friends',
    name: 'Site Users',
    icon: 'people-outline',
    color: '#111827',
  },
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
  const [pendingPlatform, setPendingPlatform] = React.useState(null);
  const [showFriendsModal, setShowFriendsModal] = React.useState(false);
  const [showTwitterEditor, setShowTwitterEditor] = React.useState(false);
  const [twitterDraftText, setTwitterDraftText] = React.useState('');
  const [currentInviteUsername, setCurrentInviteUsername] = React.useState('');

  React.useEffect(() => {
    if (!visible) {
      setShowTwitterEditor(false);
      setTwitterDraftText('');
    }
  }, [visible]);

  React.useEffect(() => {
    let isMounted = true;

    const loadCurrentInviteUsername = async () => {
      try {
        const [userInfoRaw, currentUsername] = await Promise.all([
          AsyncStorage.getItem('userInfo'),
          AsyncStorage.getItem('currentUsername'),
        ]);

        const candidates = [
          shareData?.inviterUsername,
          shareData?.username,
          shareData?.userName,
        ];

        if (userInfoRaw) {
          try {
            const userInfo = JSON.parse(userInfoRaw);
            candidates.push(
              userInfo?.username,
              userInfo?.nickName,
              userInfo?.nickname,
              userInfo?.userName,
              userInfo?.name
            );
          } catch (parseError) {
            console.error('Failed to parse current user info for share twitter copy:', parseError);
          }
        }

        candidates.push(currentUsername, 'ProblemVsHero');

        const normalizedName = candidates
          .map(item => String(item ?? '').trim())
          .find(Boolean);

        if (isMounted && normalizedName) {
          setCurrentInviteUsername(normalizedName);
        }
      } catch (storageError) {
        console.error('Failed to load current user name for share twitter copy:', storageError);
        if (isMounted) {
          setCurrentInviteUsername('ProblemVsHero');
        }
      }
    };

    loadCurrentInviteUsername();

    return () => {
      isMounted = false;
    };
  }, [shareData?.inviterUsername, shareData?.userName, shareData?.username, visible]);

  const buildUnifiedShareText = React.useCallback(() => {
    const inviteText = buildProblemToHeroInviteText({
      twitterHandle: shareData?.twitterHandle || shareData?.twitterUsername,
      inviterUsername: currentInviteUsername,
      title: shareData?.title,
    });

    return String(inviteText ?? '').trim();
  }, [
    currentInviteUsername,
    shareData?.title,
    shareData?.twitterHandle,
    shareData?.twitterUsername,
  ]);

  const openTwitterEditor = () => {
    setTwitterDraftText(buildUnifiedShareText());
    setShowTwitterEditor(true);
  };

  const handleTwitterShare = async (customShareText) => {
    setPendingPlatform('twitter');

    try {
      const result = await openTwitterShare({
        ...shareData,
        shareText: customShareText,
      });

      if (result?.openedVia === 'browser') {
        showToast('Twitter app not installed, opened web share', 'info');
      }

      if (onShare) {
        onShare('twitter', {
          ...shareData,
          shareText: customShareText,
          url: result.shareUrl,
        });
      }

      setShowTwitterEditor(false);
      handleClose();
    } catch (error) {
      console.error('Failed to share via twitter:', error);
      showToast('Unable to open Twitter', 'error');
    } finally {
      setPendingPlatform(null);
    }
  };

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
    if (pendingPlatform) {
      return;
    }

    setPendingPlatform(platform);

    try {
      if (platform === 'friends') {
        handleClose();
        setShowFriendsModal(true);
        return;
      }

      if (platform === 'link') {
        const shareUrl = buildShareUrl(shareData);
        const shareText = buildUnifiedShareText();
        const shareMessage = shareText ? `${shareText}\n${shareUrl}` : shareUrl;
        const result = await copyLinkSafely(shareMessage);

        if (result === 'copied') {
          showToast('Text and link copied', 'success');
        } else if (result === 'shared') {
          showToast('Clipboard unavailable, opened share sheet', 'info');
        } else {
          showToast('Clipboard unavailable in current build', 'warning');
        }

        if (onShare) {
          onShare(platform, { ...shareData, shareText, url: shareUrl });
        }
        handleClose();
        return;
      }

      if (platform === 'twitter') {
        openTwitterEditor();
        return;
      }

      if (onShare) {
        onShare(platform, shareData);
      }
      handleClose();
    } catch (error) {
      console.error(`Failed to share via ${platform}:`, error);
      showToast(platform === 'twitter' ? 'Unable to open Twitter' : 'Share failed', 'error');
    } finally {
      setPendingPlatform(null);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
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
                      {shareOptions.map(option => (
                        <TouchableOpacity
                          key={option.id}
                          style={styles.optionItem}
                          onPress={() => handleShare(option.id)}
                          activeOpacity={0.7}
                          disabled={pendingPlatform !== null}
                        >
                          <View
                            style={[
                              styles.optionIcon,
                              { backgroundColor: option.color + '15' },
                              pendingPlatform === option.id && styles.optionIconPending,
                            ]}
                          >
                            <Ionicons name={option.icon} size={28} color={option.color} />
                          </View>
                          <Text style={styles.optionText}>{option.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      <ShareToFriendsModal
        visible={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        shareData={shareData}
        onShare={onShare}
      />
      <EditTextModal
        visible={showTwitterEditor}
        onClose={() => setShowTwitterEditor(false)}
        title="编辑推特邀请文案"
        currentValue={twitterDraftText}
        onSave={handleTwitterShare}
        placeholder="请输入要分享到推特的文案，可手动添加 @用户名"
        maxLength={220}
        multiline
        hint="链接会自动追加到文案后面"
        loading={pendingPlatform === 'twitter'}
      />
    </>
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
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    minHeight: 200,
    maxHeight: SCREEN_HEIGHT * 0.72,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    position: 'absolute',
    right: 24,
    top: 18,
  },
  section: {
    paddingTop: 20,
    paddingBottom: 30,
  },
  optionsGrid: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 6,
  },
  optionItem: {
    width: 112,
    alignItems: 'center',
    marginRight: -6,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  optionIconPending: {
    opacity: 0.6,
  },
  optionText: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
    color: '#6B7280',
    textAlign: 'center',
  },
  bottomHandleWrapper: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 0,
  },
  bottomHandle: {
    width: 136,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#3F3F46',
    opacity: 0.35,
  },
});
