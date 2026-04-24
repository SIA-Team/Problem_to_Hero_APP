import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, LogBox } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import * as Updates from 'expo-updates';
import i18n from './src/i18n';
import superLikeCreditService from './src/services/SuperLikeCreditService';
import DeviceInfo from './src/utils/deviceInfo';
import authApi from './src/services/api/authApi';
import DebugToken from './src/utils/debugToken';
import UserCacheService from './src/services/UserCacheService';
import ToastContainer from './src/components/ToastContainer';
import AppAlertContainer from './src/components/AppAlertContainer';
import RootErrorBoundary from './src/components/RootErrorBoundary';
import { showToast } from './src/utils/toast';
import { setAppAlertRef, showAppAlert } from './src/utils/appAlert';
import { syncCacheIdentity } from './src/utils/cacheManager';
import UpdateChecker from './src/components/UpdateChecker';
import {
  getStartupRecoveryNotice,
  STARTUP_INIT_TIMEOUT_MS,
  STARTUP_STEP_TIMEOUT_MS,
  withTimeout,
} from './src/utils/startupSafety';
import {
  buildEmergencyLaunchMessage,
  getCurrentBundleFingerprint,
  getOtaLaunchInfo,
  loadRecentOtaErrors,
} from './src/utils/otaDiagnostics';
import {
  resolveInterestOnboardingUserId,
  shouldPreservePreparedInterestOnboarding,
} from './src/utils/interestOnboardingGate';
import { canHideNativeSplashScreen } from './src/utils/nativeSplashGate';
import {
  APP_BOOTSTRAP_COMPLETED_STORAGE_KEY,
  APP_LAUNCH_EXPERIENCE,
  resolveLaunchExperience,
} from './src/utils/appLaunch';
import { EmergencyProvider } from './src/contexts/EmergencyContext';

import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import PrivateConversationScreen from './src/screens/PrivateConversationScreen';
import PaidUsersListScreen from './src/screens/PaidUsersListScreen';
import FollowScreen from './src/screens/FollowScreen';
import FansScreen from './src/screens/FansScreen';
import UserFollowingScreen from './src/screens/UserFollowingScreen';
import HotListScreen from './src/screens/HotListScreen';
import IncomeRankingScreen from './src/screens/IncomeRankingScreen';
import RewardRankingScreen from './src/screens/RewardRankingScreen';
import QuestionRankingScreen from './src/screens/QuestionRankingScreen';
import HeroRankingScreen from './src/screens/HeroRankingScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import ActivityDetailScreen from './src/screens/ActivityDetailScreen';
import LoginScreen from './src/screens/LoginScreen';
import QuestionActivityListScreen from './src/screens/QuestionActivityListScreen';
import MyActivitiesScreen from './src/screens/MyActivitiesScreen';
import MyTeamsScreen from './src/screens/MyTeamsScreen';
import MyGroupsScreen from './src/screens/MyGroupsScreen';
import WisdomIndexScreen from './src/screens/WisdomIndexScreen';
import WisdomExamScreen from './src/screens/WisdomExamScreen';
import ExamHistoryScreen from './src/screens/ExamHistoryScreen';
import ExamDetailScreen from './src/screens/ExamDetailScreen';
import QuestionBankScreen from './src/screens/QuestionBankScreen';
import UploadBankScreen from './src/screens/UploadBankScreen';
import ChannelManageScreen from './src/screens/ChannelManageScreen';
import EmergencyScreen from './src/screens/EmergencyScreen';
import EmergencyListScreen from './src/screens/EmergencyListScreen';
import CreateActivityScreen from './src/screens/CreateActivityScreen';
import InviteAnswerScreen from './src/screens/InviteAnswerScreen';
import InviteTeamMemberScreen from './src/screens/InviteTeamMemberScreen';
import ReportScreen from './src/screens/ReportScreen';
import AddRewardScreen from './src/screens/AddRewardScreen';
import SuperLikePurchaseScreen from './src/screens/SuperLikePurchaseScreen';
import SuperLikeHistoryScreen from './src/screens/SuperLikeHistoryScreen';
import ContributorsScreen from './src/screens/ContributorsScreen';
import NetworkTestScreen from './src/screens/NetworkTestScreen';
import DeviceInfoScreen from './src/screens/DeviceInfoScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import ConnectionStatusScreen from './src/screens/ConnectionStatusScreen';
import UpdateDebugScreen from './src/screens/UpdateDebugScreen';
import ApiDebugScreen from './src/screens/ApiDebugScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import BlacklistScreen from './src/screens/BlacklistScreen';
import WalletDetailScreen from './src/screens/WalletDetailScreen';
import { modalTokens } from './src/components/modalTokens';
import {
  markInterestOnboardingCompleted,
  saveUserInterestPreferences,
  setInterestOnboardingPending,
  shouldShowInterestOnboarding,
} from './src/utils/interestPreferences';
import {
  loadComboChannels,
  mergeUniqueChannels,
  saveComboChannels,
} from './src/services/channelSubscriptionService';

const DEV_CONSOLE_ERROR_SILENCE_PATTERNS = [
  /API\u8c03\u7528\u5931\u8d25/i,
  /\u63a5\u53e3\u8c03\u7528\u5931\u8d25/i,
  /\u7b2c\s*\d+\s*\u6b21\u5c1d\u8bd5\u5931\u8d25/i,
  /\u7b2c\s*\d+\s*\u6b21\u5c1d\u8bd5\u8fd4\u56de\u9519\u8bef/i,
  /fingerprint auth timed out/i,
  /token login timed out/i,
  /app initialization timed out/i,
  /device fingerprint generation exceeded startup guard/i,
  /token\s*\u81ea\u52a8\u767b\u5f55\u5f02\u5e38/i,
  /\u81ea\u52a8\u91cd\u65b0\u6ce8\u518c\u5931\u8d25/i,
  /\u81ea\u52a8\u6ce8\u518c\u5931\u8d25/i,
  /\u81ea\u52a8\u6ce8\u518c\u5f02\u5e38/i,
  /failed to initialize app/i,
];

const APP_DEBUG_LOG_ENABLED = false;
const ROOT_LAYOUT_READY_WATCHDOG_MS = 1200;
const STARTUP_FONT_LOAD_TIMEOUT_MS = 2500;

const getPublishScreen = () => require('./src/screens/PublishScreen').default;
const getProfileScreen = () => require('./src/screens/ProfileScreen').default;
const getMessagesScreen = () => require('./src/screens/MessagesScreen').default;
const getQuestionDetailScreen = () => require('./src/screens/QuestionDetailScreen').default;
const getSupplementDetailScreen = () => require('./src/screens/SupplementDetailScreen').default;
const getGroupChatScreen = () => require('./src/screens/GroupChatScreen').default;
const getAnswerDetailScreen = () => require('./src/screens/AnswerDetailScreen').default;
const getQuestionTeamsScreen = () => require('./src/screens/QuestionTeamsScreen').default;
const getTeamDetailScreen = () => require('./src/screens/TeamDetailScreen').default;
const getTeamAnnouncementDetailScreen = () => require('./src/screens/TeamAnnouncementDetailScreen').default;
const getSettingsScreen = () => require('./src/screens/SettingsScreen').default;
const getPublicProfileScreen = () => require('./src/screens/PublicProfileScreen').default;
const getTopicDetailScreen = () => require('./src/screens/TopicDetailScreen').default;
const getInterestOnboardingScreen = () => require('./src/screens/InterestOnboardingScreen').default;
const SafePublishScreen = createSafeLazyScreenSafe(getPublishScreen, '发布');
const SafeProfileScreen = createSafeLazyScreenSafe(getProfileScreen, '个人中心');
const SafeMessagesScreen = createSafeLazyScreenSafe(getMessagesScreen, '消息');
const SafeQuestionDetailScreen = createSafeLazyScreenSafe(getQuestionDetailScreen, '问题详情');
const SafeSupplementDetailScreen = createSafeLazyScreenSafe(getSupplementDetailScreen, '补充详情');
const SafeGroupChatScreen = createSafeLazyScreenSafe(getGroupChatScreen, '问题群组');
const SafeAnswerDetailScreen = createSafeLazyScreenSafe(getAnswerDetailScreen, '回答详情');
const SafeQuestionTeamsScreen = createSafeLazyScreenSafe(getQuestionTeamsScreen, '问题组队');
const SafeTeamDetailScreen = createSafeLazyScreenSafe(getTeamDetailScreen, '团队详情');
const SafeTeamAnnouncementDetailScreen = createSafeLazyScreenSafe(getTeamAnnouncementDetailScreen, '公告详情');
const SafeSettingsScreen = createSafeLazyScreenSafe(getSettingsScreen, '设置');
const SafePublicProfileScreen = createSafeLazyScreenSafe(getPublicProfileScreen, '公开主页');
const SafeTopicDetailScreen = createSafeLazyScreenSafe(getTopicDetailScreen, '话题详情');
const SafeInterestOnboardingScreen = createSafeLazyScreenSafe(getInterestOnboardingScreen, '兴趣引导');

const appDebugLog = (...args) => {
  if (__DEV__ && APP_DEBUG_LOG_ENABLED) {
    console.log(...args);
  }
};

const stringifyDevConsoleArg = (value) => {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Error) {
    return `${value.name}: ${value.message || ''}`;
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (value === null) {
    return 'null';
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
};

const shouldSilenceDevConsoleError = (args = []) => {
  const normalizedMessage = args.map(stringifyDevConsoleArg).join(' ');

  if (!normalizedMessage) {
    return false;
  }

  return DEV_CONSOLE_ERROR_SILENCE_PATTERNS.some((pattern) => pattern.test(normalizedMessage));
};

if (__DEV__ && !global.__QA_NATIVE_APP_DEV_ERROR_FILTER_INSTALLED__) {
  global.__QA_NATIVE_APP_DEV_ERROR_FILTER_INSTALLED__ = true;

  LogBox.ignoreLogs([
    '\u7b2c 1 \u6b21\u5c1d\u8bd5\u5931\u8d25',
    '\u6b21\u5c1d\u8bd5\u5931\u8d25',
    '\u6b21\u5c1d\u8bd5\u8fd4\u56de\u9519\u8bef',
    'fingerprint auth timed out',
    'token login timed out',
    'App initialization timed out',
    'Device fingerprint generation exceeded startup guard',
    'Token \u81ea\u52a8\u767b\u5f55\u5f02\u5e38',
    '\u81ea\u52a8\u91cd\u65b0\u6ce8\u518c\u5931\u8d25',
    '\u81ea\u52a8\u6ce8\u518c\u5931\u8d25',
    '\u81ea\u52a8\u6ce8\u518c\u5f02\u5e38',
    'Failed to initialize app',
  ]);

  const originalConsoleError = console.error.bind(console);
  const originalConsoleLog = console.log.bind(console);

  console.error = (...args) => {
    if (shouldSilenceDevConsoleError(args)) {
      originalConsoleLog('[DevSilencedError]', ...args);
      return;
    }

    originalConsoleError(...args);
  };
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const SERVER_SELECTION_STORAGE_KEY = '@app_server_selection';
const MANUAL_LOGOUT_STORAGE_KEY = '@manual_logout';
const INITIAL_CREDENTIALS_NOTICE_STORAGE_KEY = '@initial_credentials_notice';
const INITIAL_CREDENTIALS_DEFAULT_PASSWORD = '12345678';
const STARTUP_AUTH_REQUEST_TIMEOUT_MS = 4000;
const APP_LINKING = {
  prefixes: ['problemvshero://'],
  config: {
    screens: {
      Main: '',
      Search: 'search',
      QuestionDetail: {
        path: 'question/:id',
        parse: {
          id: Number,
          commentId: Number,
          rootCommentId: Number,
        },
      },
      AnswerDetail: {
        path: 'answer/:id',
        parse: {
          id: Number,
          answerId: Number,
          questionId: Number,
          commentId: Number,
          rootCommentId: Number,
        },
      },
      SupplementDetail: {
        path: 'supplement/:id',
        parse: {
          id: Number,
          parentQuestionId: Number,
          commentId: Number,
          rootCommentId: Number,
        },
      },
    },
  },
};

void SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('Native splash screen auto-hide was already configured:', error);
});

const extractInterestChannels = (payload) => {
  const level2 = Array.isArray(payload?.level2) ? payload.level2 : [];

  return level2
    .map((item) => (typeof item?.name === 'string' ? item.name.trim() : ''))
    .filter(Boolean);
};

function StartupLoadingScreen({ title, message, notice = '', accent = '正在启动' }) {
  return (
    <View style={startupStyles.screen}>
      <View style={startupStyles.glowPrimary} />
      <View style={startupStyles.glowSecondary} />
      <View style={startupStyles.card}>
        <View style={startupStyles.badge}>
          <Ionicons name="sparkles" size={22} color="#ef4444" />
        </View>
        <Text style={startupStyles.accent}>{accent}</Text>
        <Text style={startupStyles.title}>{title}</Text>
        <Text style={startupStyles.message}>{message}</Text>
        <View style={startupStyles.progressRow}>
          <View style={[startupStyles.progressDot, startupStyles.progressDotActive]} />
          <View style={[startupStyles.progressDot, startupStyles.progressDotActiveSoft]} />
          <View style={startupStyles.progressDot} />
        </View>
        {notice ? <Text style={startupStyles.notice}>{notice}</Text> : null}
      </View>
    </View>
  );
}

function LaunchLoadingScreen({ title, message, notice = '' }) {
  return (
    <View style={startupStyles.screen}>
      <View style={launchLoadingStyles.card}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={launchLoadingStyles.title}>{title}</Text>
        <Text style={launchLoadingStyles.message}>{message}</Text>
        {notice ? <Text style={launchLoadingStyles.notice}>{notice}</Text> : null}
      </View>
    </View>
  );
}

function ScreenLoadFallback({ title = '页面加载失败', message = '当前页面暂时无法打开，请返回后重试。' }) {
  return (
    <View style={startupStyles.screen}>
      <View style={launchLoadingStyles.card}>
        <Ionicons name="alert-circle-outline" size={36} color="#ef4444" />
        <Text style={launchLoadingStyles.title}>{title}</Text>
        <Text style={launchLoadingStyles.message}>{message}</Text>
      </View>
    </View>
  );
}

function createSafeLazyScreen(resolveScreen, screenLabel) {
  const SafeLazyScreen = function SafeLazyScreen(props) {
    let ScreenComponent = null;

    try {
      ScreenComponent = resolveScreen();
    } catch (error) {
      console.error(`Failed to load ${screenLabel}:`, error);
    }

    if (!ScreenComponent) {
      return (
        <ScreenLoadFallback
          title={`${screenLabel}加载失败`}
          message="页面资源恢复异常，请返回上一页后重试。"
        />
      );
    }

    try {
      return <ScreenComponent {...props} />;
    } catch (error) {
      console.error(`Failed to render ${screenLabel}:`, error);
      return (
        <ScreenLoadFallback
          title={`${screenLabel}暂时不可用`}
          message="页面渲染遇到异常，请稍后再次进入。"
        />
      );
    }
  };

  SafeLazyScreen.displayName = `SafeLazyScreen(${screenLabel})`;
  return SafeLazyScreen;
}

function ScreenLoadFallbackSafe({
  title = 'Page unavailable',
  message = 'This screen could not be opened. Please go back and try again.',
}) {
  return (
    <View style={startupStyles.screen}>
      <View style={launchLoadingStyles.card}>
        <Ionicons name="alert-circle-outline" size={36} color="#ef4444" />
        <Text style={launchLoadingStyles.title}>{title}</Text>
        <Text style={launchLoadingStyles.message}>{message}</Text>
      </View>
    </View>
  );
}

class ScreenRenderBoundarySafe extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`Screen render failed: ${this.props.screenLabel}`, error, errorInfo);
  }

  render() {
    const { error } = this.state;
    const { children, screenLabel } = this.props;

    if (error) {
      return (
        <ScreenLoadFallbackSafe
          title={`${screenLabel} unavailable`}
          message="A rendering problem occurred on this screen. Please go back and try again."
        />
      );
    }

    return children;
  }
}

function createSafeLazyScreenSafe(resolveScreen, screenLabel) {
  const SafeLazyScreen = function SafeLazyScreen(props) {
    let ScreenComponent = null;

    try {
      ScreenComponent = resolveScreen();
    } catch (error) {
      console.error(`Failed to load ${screenLabel}:`, error);
    }

    if (!ScreenComponent) {
      return (
        <ScreenLoadFallbackSafe
          title={`${screenLabel} failed to load`}
          message="The screen module could not be restored. Please return and try again."
        />
      );
    }

    return (
      <ScreenRenderBoundarySafe screenLabel={screenLabel}>
        <ScreenComponent {...props} />
      </ScreenRenderBoundarySafe>
    );
  };

  SafeLazyScreen.displayName = `SafeLazyScreen(${screenLabel})`;
  return SafeLazyScreen;
}

// Emergency Help Modal Component
function EmergencyModal({ visible, onClose, onSubmit }) {
  const t = (key) => {
    if (!i18n || typeof i18n.t !== 'function') {
      return key;
    }
    return i18n.t(key);
  };
  
  const insets = useSafeAreaInsets();
  const [emergencyForm, setEmergencyForm] = useState({ title: '', description: '', location: '', contact: '', rescuerCount: 1 });
  const freeCount = 1;
  const usedCount = 0;
  const remainingFree = freeCount - usedCount;

  const freeRescuerLimit = 5;
  const extraRescuerFee = 2;
  
  const calculateRescuerFee = (count) => {
    if (count <= freeRescuerLimit) return 0;
    return (count - freeRescuerLimit) * extraRescuerFee;
  };

  const rescuerFee = calculateRescuerFee(emergencyForm.rescuerCount || 1);

  // Use useMemo to prevent calling t() during initial render
  const quickTitles = React.useMemo(() => [
    t('emergency.quickTitle1'),
    t('emergency.quickTitle2'),
    t('emergency.quickTitle3')
  ], []);

  const handleSubmit = () => {
    if (!emergencyForm.title.trim()) {
      showToast(t('emergency.enterTitle'), 'warning');
      return;
    }
    const feeInfo = rescuerFee > 0 ? `\n${t('emergency.needPay')}：$${rescuerFee}` : '';
    showToast(`${t('emergency.published')}\n${t('emergency.rescuersNeeded')}${emergencyForm.rescuerCount}${t('emergency.rescuerUnit')}${feeInfo}\n${t('emergency.nearbyNotified')}`, 'success', 3000);
    onClose();
    setEmergencyForm({ title: '', description: '', location: '', contact: '', rescuerCount: 1 });
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        style={modalStyles.emergencyKeyboardWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={modalStyles.emergencyModal} edges={['top']}>
          <View style={modalStyles.emergencyHeader}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <View style={modalStyles.emergencyHeaderCenter}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={modalStyles.emergencyHeaderTitle}>{t('emergency.title')}</Text>
            </View>
            <TouchableOpacity 
              style={[modalStyles.emergencySubmitBtn, !emergencyForm.title.trim() && modalStyles.emergencySubmitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!emergencyForm.title.trim()}
            >
              <Text style={[modalStyles.emergencySubmitText, !emergencyForm.title.trim() && modalStyles.emergencySubmitTextDisabled]}>{t('emergency.publish')}</Text>
            </TouchableOpacity>
          </View>

          <View style={modalStyles.emergencyWarning}>
            <Ionicons name="warning" size={18} color="#f59e0b" />
            <Text style={modalStyles.emergencyWarningText}>{t('emergency.warning')}</Text>
          </View>

          <View style={modalStyles.freeCountBanner}>
            <View style={modalStyles.freeCountLeft}>
              <Ionicons name="gift" size={20} color={remainingFree > 0 ? "#22c55e" : "#9ca3af"} />
              <Text style={modalStyles.freeCountText}>{t('emergency.freeCount')}</Text>
              <Text style={[modalStyles.freeCountNumber, remainingFree <= 0 && { color: '#9ca3af' }]}>{remainingFree}/{freeCount}</Text>
            </View>
            {remainingFree <= 0 && (
              <TouchableOpacity 
                style={modalStyles.monthlyPayButton}
                onPress={() => showToast(t('emergency.monthlyUnlock'), 'info')}
              >
                <Text style={modalStyles.monthlyPayButtonText}>{t('emergency.payAmount')}</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={modalStyles.emergencyFormArea}
            contentContainerStyle={[
              modalStyles.emergencyFormContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 16 },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
          <View style={modalStyles.emergencyFormGroup}>
            <Text style={modalStyles.emergencyFormLabel}>{t('emergency.formTitle')} <Text style={{ color: '#ef4444' }}>*</Text></Text>
            <TextInput
              style={modalStyles.emergencyFormInput}
              placeholder={t('emergency.formTitlePlaceholder')}
              placeholderTextColor="#bbb"
              value={emergencyForm.title}
              onChangeText={(text) => setEmergencyForm({...emergencyForm, title: text})}
            />
            <View style={modalStyles.quickTitlesContainer}>
              <Text style={modalStyles.quickTitlesLabel}>{t('emergency.quickTitles')}</Text>
              <View style={modalStyles.quickTitlesRow}>
                {quickTitles.map((title, index) => (
                  <TouchableOpacity
                    key={index}
                    style={modalStyles.quickTitleTag}
                    onPress={() => setEmergencyForm({...emergencyForm, title: title})}
                  >
                    <Text style={modalStyles.quickTitleText}>{title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={modalStyles.emergencyFormGroup}>
            <Text style={modalStyles.emergencyFormLabel}>{t('emergency.description')}</Text>
            <TextInput
              style={[modalStyles.emergencyFormInput, modalStyles.emergencyFormTextarea]}
              placeholder={t('emergency.descriptionPlaceholder')}
              placeholderTextColor="#bbb"
              value={emergencyForm.description}
              onChangeText={(text) => setEmergencyForm({...emergencyForm, description: text})}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={modalStyles.emergencyFormGroup}>
            <Text style={modalStyles.emergencyFormLabel}>{t('emergency.location')}</Text>
            <View style={modalStyles.emergencyLocationRow}>
              <View style={modalStyles.emergencyLocationInput}>
                <Ionicons name="location" size={18} color="#ef4444" />
                <TextInput
                  style={modalStyles.emergencyLocationText}
                  placeholder={t('emergency.locationPlaceholder')}
                  placeholderTextColor="#bbb"
                  value={emergencyForm.location}
                  onChangeText={(text) => setEmergencyForm({...emergencyForm, location: text})}
                />
              </View>
              <TouchableOpacity style={modalStyles.emergencyLocationBtn}>
                <Ionicons name="navigate" size={18} color="#3b82f6" />
                <Text style={modalStyles.emergencyLocationBtnText}>{t('emergency.locate')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={modalStyles.emergencyFormGroup}>
            <Text style={modalStyles.emergencyFormLabel}>{t('emergency.contact')}</Text>
            <View style={modalStyles.emergencyContactInput}>
              <Ionicons name="call" size={18} color="#6b7280" />
              <TextInput
                style={modalStyles.emergencyContactText}
                placeholder={t('emergency.contactPlaceholder')}
                placeholderTextColor="#bbb"
                value={emergencyForm.contact}
                onChangeText={(text) => setEmergencyForm({...emergencyForm, contact: text})}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={modalStyles.emergencyFormGroup}>
            <View style={modalStyles.rescuerCountHeader}>
              <Text style={modalStyles.emergencyFormLabel}>{t('emergency.rescuerCount')}</Text>
              <View style={modalStyles.rescuerFreeTag}>
                <Ionicons name="information-circle" size={14} color="#22c55e" />
                <Text style={modalStyles.rescuerFreeText}>{t('emergency.rescuerFree')}</Text>
              </View>
            </View>
            
            <View style={modalStyles.rescuerCountInputWrapper}>
              <TextInput
                style={modalStyles.rescuerCountInput}
                placeholder={t('emergency.rescuerPlaceholder')}
                placeholderTextColor="#bbb"
                value={emergencyForm.rescuerCount === 0 ? '' : emergencyForm.rescuerCount.toString()}
                onChangeText={(text) => {
                  if (text === '') {
                    setEmergencyForm({...emergencyForm, rescuerCount: 0});
                    return;
                  }
                  const num = parseInt(text);
                  if (!isNaN(num)) {
                    const validNum = Math.max(1, Math.min(20, num));
                    setEmergencyForm({...emergencyForm, rescuerCount: validNum});
                  }
                }}
                onBlur={() => {
                  if (emergencyForm.rescuerCount === 0) {
                    setEmergencyForm({...emergencyForm, rescuerCount: 1});
                  }
                }}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={modalStyles.rescuerCountUnit}>{t('emergency.rescuerUnit')}</Text>
            </View>

            <View style={modalStyles.rescuerFeeInfo}>
              {rescuerFee === 0 ? (
                <View style={modalStyles.rescuerFeeRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                  <Text style={modalStyles.rescuerFeeTextFree}>{t('emergency.rescuerFeeTextFree')}</Text>
                </View>
              ) : (
                <View style={modalStyles.rescuerFeeCard}>
                  <View style={modalStyles.rescuerFeeRow}>
                    <View style={modalStyles.rescuerFeeLeft}>
                      <Text style={modalStyles.rescuerFeeLabel}>{t('emergency.rescuerFeeLabel')}</Text>
                      <Text style={modalStyles.rescuerFeeExtra}>{emergencyForm.rescuerCount - freeRescuerLimit}{t('emergency.rescuerUnit')} × ${extraRescuerFee}</Text>
                    </View>
                    <View style={modalStyles.rescuerFeeRight}>
                      <Text style={modalStyles.rescuerFeeTotalLabel}>{t('emergency.needPay')}</Text>
                      <Text style={modalStyles.rescuerFeeTotal}>${rescuerFee}</Text>
                    </View>
                  </View>
                  <Text style={modalStyles.rescuerFeeNote}>{t('emergency.rescuerFeeNote')}</Text>
                  <TouchableOpacity 
                    style={modalStyles.payButton}
                    onPress={() => showToast(`${t('emergency.pay')} $${rescuerFee}\n\n${t('emergency.paymentMethods')}`, 'info', 3000)}
                  >
                    <Ionicons name="card" size={18} color="#fff" />
                    <Text style={modalStyles.payButtonText}>{t('emergency.payNow')} ${rescuerFee}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={modalStyles.emergencyTips}>
            <Text style={modalStyles.emergencyTipsTitle}>{t('emergency.tips')}</Text>
            <Text style={modalStyles.emergencyTipsText}>{t('emergency.tip1')}</Text>
            <Text style={modalStyles.emergencyTipsText}>{t('emergency.tip2')}</Text>
            <Text style={modalStyles.emergencyTipsText}>{t('emergency.tip3')}</Text>
          </View>

          <View style={{ height: insets.bottom + 20 }} />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  emergencyKeyboardWrapper: { flex: 1 },
  emergencyModal: { flex: 1, backgroundColor: modalTokens.surface },
  emergencyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  emergencyHeaderCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emergencyHeaderTitle: { fontSize: 17, fontWeight: '600', color: modalTokens.textPrimary },
  emergencySubmitBtn: { backgroundColor: modalTokens.danger, paddingHorizontal: modalTokens.actionPaddingX, paddingVertical: modalTokens.actionPaddingY, borderRadius: modalTokens.actionRadius },
  emergencySubmitBtnDisabled: { backgroundColor: modalTokens.dangerSoft },
  emergencySubmitText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  emergencySubmitTextDisabled: { color: '#fff' },
  emergencyWarning: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  emergencyWarningText: { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 18 },
  freeCountBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0fdf4', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  freeCountLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  freeCountText: { fontSize: 14, color: '#374151' },
  freeCountNumber: { fontSize: 16, fontWeight: 'bold', color: '#22c55e' },
  monthlyPayButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ef4444', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 2 },
  monthlyPayButtonText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  needPayTag: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  needPayText: { fontSize: 12, color: '#92400e', fontWeight: '500' },
  emergencyFormArea: { flex: 1 },
  emergencyFormContent: { padding: 16 },
  emergencyFormGroup: { marginBottom: 16 },
  emergencyFormLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  emergencyFormInput: { backgroundColor: modalTokens.surfaceSoft, borderWidth: 1, borderColor: modalTokens.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: modalTokens.textPrimary },
  quickTitlesContainer: { marginTop: 12 },
  quickTitlesLabel: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  quickTitlesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickTitleTag: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  quickTitleText: { fontSize: 12, color: '#ef4444', fontWeight: '500' },
  emergencyFormTextarea: { minHeight: 100, textAlignVertical: 'top' },
  emergencyLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emergencyLocationInput: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: modalTokens.surfaceSoft, borderWidth: 1, borderColor: modalTokens.border, borderRadius: 8, paddingHorizontal: 12, gap: 8 },
  emergencyLocationText: { flex: 1, paddingVertical: 12, fontSize: 15, color: modalTokens.textPrimary },
  emergencyLocationBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, gap: 4 },
  emergencyLocationBtnText: { fontSize: 13, color: '#3b82f6', fontWeight: '500' },
  emergencyContactInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: modalTokens.surfaceSoft, borderWidth: 1, borderColor: modalTokens.border, borderRadius: 8, paddingHorizontal: 12, gap: 8 },
  emergencyContactText: { flex: 1, paddingVertical: 12, fontSize: 15, color: modalTokens.textPrimary },
  rescuerCountHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  rescuerFreeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  rescuerFreeText: { fontSize: 12, color: '#16a34a', fontWeight: '500' },
  rescuerCountInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: modalTokens.surfaceSoft, borderWidth: 1, borderColor: modalTokens.border, borderRadius: 8, paddingHorizontal: 12, gap: 8 },
  rescuerCountInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: modalTokens.textPrimary },
  rescuerCountUnit: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  rescuerFeeInfo: { marginTop: 12 },
  rescuerFeeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rescuerFeeTextFree: { fontSize: 14, color: '#22c55e', fontWeight: '500' },
  rescuerFeeCard: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 8, padding: 12 },
  rescuerFeeLeft: { flex: 1 },
  rescuerFeeLabel: { fontSize: 13, color: '#92400e', marginBottom: 4 },
  rescuerFeeExtra: { fontSize: 15, color: '#ea580c', fontWeight: '600' },
  rescuerFeeRight: { alignItems: 'flex-end' },
  rescuerFeeTotalLabel: { fontSize: 12, color: '#92400e', marginBottom: 2 },
  rescuerFeeTotal: { fontSize: 24, fontWeight: 'bold', color: '#ef4444' },
  rescuerFeeNote: { fontSize: 12, color: '#92400e', marginTop: 8 },
  payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginTop: 12, gap: 8, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  payButtonText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  emergencyTips: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginTop: 8 },
  emergencyTipsTitle: { fontSize: 13, fontWeight: '500', color: '#991b1b', marginBottom: 8 },
  emergencyTipsText: { fontSize: 12, color: '#b91c1c', lineHeight: 20 },
});

function MainTabs({ onLogout }) {
  const insets = useSafeAreaInsets();
  const renderProfileTab = React.useCallback(
    (props) => <SafeProfileScreen {...props} onLogout={onLogout} />,
    [onLogout]
  );
  
  // 定义固定的 tab 名称（使用英文 key）
  const TAB_NAMES = {
    HOME: 'Home',
    ACTIVITY: 'Activity',
    PUBLISH: 'Publish',
    EMERGENCY: 'Emergency',
    PROFILE: 'Profile'
  };
  
  return (
    <Tab.Navigator
      detachInactiveScreens
      screenOptions={({ route }) => ({
        lazy: true,
        freezeOnBlur: true,
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === TAB_NAMES.HOME) iconName = focused ? 'home' : 'home-outline';
          else if (route.name === TAB_NAMES.ACTIVITY) iconName = focused ? 'gift' : 'gift-outline';
          else if (route.name === TAB_NAMES.PUBLISH) iconName = focused ? 'add-circle' : 'add-circle-outline';
          else if (route.name === TAB_NAMES.EMERGENCY) iconName = focused ? 'warning' : 'warning-outline';
          else if (route.name === TAB_NAMES.PROFILE) iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarLabel: ({ focused }) => {
          let labelKey;
          if (route.name === TAB_NAMES.HOME) labelKey = 'tabs.home';
          else if (route.name === TAB_NAMES.ACTIVITY) labelKey = 'tabs.activity';
          else if (route.name === TAB_NAMES.PUBLISH) labelKey = 'tabs.publish';
          else if (route.name === TAB_NAMES.EMERGENCY) labelKey = 'tabs.emergency';
          else if (route.name === TAB_NAMES.PROFILE) labelKey = 'tabs.profile';
          
          // 直接使用 i18n.t，并添加安全检查
          const labelText = i18n && i18n.t ? i18n.t(labelKey) : labelKey;
          return <Text style={{ fontSize: 10, fontWeight: '400', color: focused ? '#f04444' : '#8a8a8a' }}>{labelText}</Text>;
        },
        tabBarActiveTintColor: '#f04444',
        tabBarInactiveTintColor: '#8a8a8a',
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: '#e8e8e8',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name={TAB_NAMES.HOME} component={HomeScreen} />
      <Tab.Screen name={TAB_NAMES.ACTIVITY} component={ActivityScreen} />
      <Tab.Screen name={TAB_NAMES.PUBLISH} component={SafePublishScreen} />
      <Tab.Screen name={TAB_NAMES.EMERGENCY} component={EmergencyScreen} />
      <Tab.Screen name={TAB_NAMES.PROFILE}>
        {renderProfileTab}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function AppContent() {
  appDebugLog('📱 App component rendering...');
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isCheckingInterestOnboarding, setIsCheckingInterestOnboarding] = useState(false);
  const [shouldShowInterestOnboardingScreen, setShouldShowInterestOnboardingScreen] = useState(false);
  const [interestOnboardingUserId, setInterestOnboardingUserId] = useState(null);
  const [otaRecoveryNotice, setOtaRecoveryNotice] = useState(null);
  const [startupRecoveryNotice, setStartupRecoveryNotice] = useState(null);
  const [launchExperience, setLaunchExperience] = useState(
    APP_LAUNCH_EXPERIENCE.RETURNING_USER
  );
  const [rootLayoutReady, setRootLayoutReady] = useState(false);
  const [startupStatus, setStartupStatus] = useState({
    title: '正在准备应用',
    message: '正在加载基础资源，请稍候...',
  });
  const nativeSplashStateRef = React.useRef('pending');
  const startupAuthInFlightRef = React.useRef(false);
  const startupTimeoutDeferCountRef = React.useRef(0);

  const updateStartupStatus = React.useCallback((title, message) => {
    setStartupStatus((prev) =>
      prev.title === title && prev.message === message ? prev : { title, message }
    );
  }, []);

  const canHideSplashScreen = canHideNativeSplashScreen({
    fontsLoaded,
    rootLayoutReady,
  });

  const hideNativeSplashScreen = React.useCallback(async () => {
    if (!canHideSplashScreen || nativeSplashStateRef.current !== 'pending') {
      return;
    }

    nativeSplashStateRef.current = 'hiding';

    try {
      await new Promise((resolve) => {
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => resolve());
          return;
        }

        setTimeout(resolve, 0);
      });
      await SplashScreen.hideAsync();
      nativeSplashStateRef.current = 'hidden';
    } catch (error) {
      nativeSplashStateRef.current = 'pending';
      console.error('Failed to hide native splash screen:', error);
    }
  }, [canHideSplashScreen]);

  const handleRootLayout = React.useCallback(() => {
    setRootLayoutReady(true);
  }, []);

  useEffect(() => {
    if (rootLayoutReady) {
      return undefined;
    }

    const timer = setTimeout(() => {
      console.warn(
        'Root layout readiness watchdog triggered; keeping native splash visible until the first real layout is rendered'
      );
    }, ROOT_LAYOUT_READY_WATCHDOG_MS);

    return () => clearTimeout(timer);
  }, [rootLayoutReady]);

  useEffect(() => {
    if (!canHideSplashScreen || nativeSplashStateRef.current === 'hidden') {
      return undefined;
    }

    const timer = setTimeout(() => {
      hideNativeSplashScreen();
    }, 60);

    return () => clearTimeout(timer);
  }, [canHideSplashScreen, hideNativeSplashScreen]);

  useEffect(() => {
    let mounted = true;

    const inspectOtaLaunch = async () => {
      if (__DEV__ || !Updates.isEnabled) {
        return;
      }

      const launchInfo = getOtaLaunchInfo();
      appDebugLog('OTA launch info:', launchInfo);

      if (!launchInfo.isEmergencyLaunch) {
        return;
      }

      const recentErrors = await loadRecentOtaErrors();
      console.error('Emergency OTA launch detected:', {
        reason: launchInfo.emergencyLaunchReason,
        recentErrors,
      });

      if (!mounted) {
        return;
      }

      setOtaRecoveryNotice(
        buildEmergencyLaunchMessage(
          launchInfo.emergencyLaunchReason,
          recentErrors
        )
      );
    };

    inspectOtaLaunch();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!otaRecoveryNotice) {
      return;
    }

    const timer = setTimeout(() => {
      showAppAlert('热更新已自动回退', otaRecoveryNotice, [{ text: '知道了' }]);
    }, 800);

    return () => clearTimeout(timer);
  }, [otaRecoveryNotice]);

  useEffect(() => {
    if (!isInitializing) {
      startupTimeoutDeferCountRef.current = 0;
      return;
    }

    let cancelled = false;
    let timer = null;

    const scheduleTimeout = (delayMs) => {
      timer = setTimeout(() => {
        if (cancelled) {
          return;
        }

        if (startupAuthInFlightRef.current && startupTimeoutDeferCountRef.current < 2) {
          startupTimeoutDeferCountRef.current += 1;
          console.warn(
            `Startup timeout deferred while auth bootstrap is still running (${startupTimeoutDeferCountRef.current})`
          );
          scheduleTimeout(STARTUP_STEP_TIMEOUT_MS);
          return;
        }

        console.error('App initialization timed out, switching to safe login mode');
        setStartupRecoveryNotice(getStartupRecoveryNotice());
        setShouldShowInterestOnboardingScreen(false);
        setIsCheckingInterestOnboarding(false);
        setInterestOnboardingUserId(null);
        setIsLoggedIn(false);
        setIsInitializing(false);
      }, delayMs);
    };

    scheduleTimeout(STARTUP_INIT_TIMEOUT_MS);

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isInitializing]);
  
  appDebugLog('📱 App state:', { isLoggedIn, isInitializing, fontsLoaded });
  
  const appAlertRef = React.useCallback((ref) => {
    if (ref) {
      setAppAlertRef(ref);
    }
  }, []);

  const resolveDeviceFingerprint = async () => {
    try {
      return await withTimeout(
        () => DeviceInfo.generateFingerprintString(),
        STARTUP_STEP_TIMEOUT_MS,
        'device fingerprint'
      );
    } catch (error) {
      console.error('Device fingerprint generation exceeded startup guard:', error);
      return DeviceInfo.generateFallbackFingerprintString();
    }
  };

  // 预加载字体
  useEffect(() => {
    appDebugLog('🔤 开始加载字体...');
    updateStartupStatus('正在准备应用', '正在加载界面资源，请稍候...');
    let isMounted = true;
    let fontWatchdogTimer = null;

    async function loadFonts() {
      try {
        appDebugLog('🔤 正在加载字体...');
        fontWatchdogTimer = setTimeout(() => {
          if (!isMounted) {
            return;
          }

          console.warn('Font loading watchdog triggered, continuing startup with system fonts');
          setFontsLoaded(true);
        }, STARTUP_FONT_LOAD_TIMEOUT_MS);

        await Font.loadAsync({
          ...Ionicons.font,
          // 预加载 Font Awesome 5 字体
          'FontAwesome5_Solid': require('react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf'),
          'FontAwesome5_Regular': require('react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf'),
          'FontAwesome5_Brands': require('react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf'),
        });
        appDebugLog('✅ 字体加载完成');
        if (isMounted) {
          setFontsLoaded(true);
        }
      } catch (error) {
        console.error('❌ 字体加载失败:', error);
        // 即使加载失败也继续，避免卡住
        if (isMounted) {
          setFontsLoaded(true);
        }
      } finally {
        if (fontWatchdogTimer) {
          clearTimeout(fontWatchdogTimer);
          fontWatchdogTimer = null;
        }
      }
    }
    loadFonts();

    return () => {
      isMounted = false;
      if (fontWatchdogTimer) {
        clearTimeout(fontWatchdogTimer);
      }
    };
  }, []);

  // 初始化服务和检查登录状态
  useEffect(() => {
    // 自动注册重试函数（开发和生产环境都使用）
    const autoRegisterWithRetry = async (
      fingerprint,
      { maxRetries = 2, timeoutMs = STARTUP_AUTH_REQUEST_TIMEOUT_MS } = {}
    ) => {
      startupAuthInFlightRef.current = true;

      for (let i = 0; i < maxRetries; i++) {
        try {
          appDebugLog(`🔄 尝试自动注册 (${i + 1}/${maxRetries})...`);
          const response = await withTimeout(
            () => authApi.registerByFingerprint(fingerprint),
            timeoutMs,
            'fingerprint auth'
          );
          
          if (response.code === 200 && response.data) {
            appDebugLog('✅ 自动注册成功！');
            startupAuthInFlightRef.current = false;
            return { success: true, data: response.data };
          } else {
            updateStartupStatus('正在创建账号', '首次启动正在为你准备默认账号...');
            console.error(`⚠️ 第 ${i + 1} 次尝试返回错误:`, response.msg);
          }
        } catch (error) {
          console.error(`❌ 第 ${i + 1} 次尝试失败:`, error.message);
          
          if (i < maxRetries - 1) {
            // 指数退避：1s, 2s, 4s
            const delay = Math.min(600 * Math.pow(2, i), 1200);
            appDebugLog(`⏳ 等待 ${delay}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      startupAuthInFlightRef.current = false;
      return { success: false };
    };

    const initializeApp = async () => {
      try {
        appDebugLog('🚀 应用启动中...');
        appDebugLog('⚙️  环境:', __DEV__ ? '开发环境' : '生产环境');
        appDebugLog('');
        updateStartupStatus('正在初始化应用', '正在校验启动环境并连接服务...');
        
        // 初始化超级赞积分系统（异步，不阻塞）
        const startupStorageValues = await AsyncStorage.multiGet([
          SERVER_SELECTION_STORAGE_KEY,
          'authToken',
          MANUAL_LOGOUT_STORAGE_KEY,
          'deviceFingerprint',
          APP_BOOTSTRAP_COMPLETED_STORAGE_KEY,
        ]);
        const startupStorageMap = Object.fromEntries(startupStorageValues);
        const selectedServer = startupStorageMap[SERVER_SELECTION_STORAGE_KEY] || 'server2';
        const cacheIdentity = `${selectedServer}|${getCurrentBundleFingerprint()}`;
        const cacheIdentityResult = await syncCacheIdentity(cacheIdentity);

        if (cacheIdentityResult.changed) {
          appDebugLog('🧹 检测到服务器或 bundle 指纹变化，已自动清理业务缓存');
          appDebugLog('   上次身份:', cacheIdentityResult.previousIdentity || '无');
          appDebugLog('   当前身份:', cacheIdentityResult.currentIdentity);
        }

        superLikeCreditService.initialize().catch(error => {
          console.error('⚠️ Service initialization failed:', error);
        });
        
        // 检查是否有保存的 token（自动登录）
        const savedToken = startupStorageMap.authToken;
        const hasManualLogoutMarker =
          startupStorageMap[MANUAL_LOGOUT_STORAGE_KEY] === 'true';
        const initialSavedFingerprint = startupStorageMap.deviceFingerprint;
        const hasCompletedBootstrap =
          startupStorageMap[APP_BOOTSTRAP_COMPLETED_STORAGE_KEY] === 'true';
        const resolvedLaunchExperience = resolveLaunchExperience({
          hasCompletedBootstrap,
          hasAuthToken: Boolean(savedToken),
          hasDeviceFingerprint: Boolean(initialSavedFingerprint),
          hasManualLogoutMarker,
        });

        setLaunchExperience(resolvedLaunchExperience);
        
        if (savedToken) {
          updateStartupStatus('正在恢复登录', '正在验证你的账号状态...');
          appDebugLog('✅ 检测到已保存的 token，尝试 token 自动登录');
          appDebugLog('   Token (前20字符):', savedToken.substring(0, 20) + '...');
          
          try {
            // 尝试使用 token 自动登录
            startupAuthInFlightRef.current = true;
            const tokenLoginResponse = await withTimeout(
              () => authApi.tokenLogin(),
              STARTUP_AUTH_REQUEST_TIMEOUT_MS,
              'token login'
            );
            startupAuthInFlightRef.current = false;
            
            if (tokenLoginResponse.code === 200) {
              appDebugLog('✅ Token 自动登录成功');
              await markBootstrapCompleted();
              
              // 立即设置登录状态，让用户进入应用
              enterAuthenticatedApp();
              setIsInitializing(false);
              
              // 后台加载用户信息（不阻塞UI）
              appDebugLog('\n👤 后台加载用户信息...');
              UserCacheService.loadUserProfileWithCache(
                (cachedProfile) => {
                  appDebugLog('⚡ 从缓存加载用户信息:', cachedProfile?.nickName || 'Unknown');
                },
                (freshProfile) => {
                  appDebugLog('🔄 用户信息已更新:', freshProfile?.nickName || 'Unknown');
                }
              ).catch(error => {
                console.error('⚠️ User profile loading failed:', error);
              });
              
              return; // 成功登录，退出初始化流程
            } else {
              appDebugLog('⚠️ Token 自动登录失败:', tokenLoginResponse.msg);
              appDebugLog('   Token 可能已过期，尝试设备指纹重新注册...');
              
              // Token 过期，清除旧数据
              await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userInfo']);
            }
          } catch (tokenLoginError) {
            startupAuthInFlightRef.current = false;
            console.error('❌ Token 自动登录异常:', tokenLoginError.message);
            appDebugLog('   尝试设备指纹重新注册...');
            
            // Token 登录失败，清除旧数据
            await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userInfo']);
          }
          
          // Token 登录失败，尝试使用设备指纹重新注册
          const savedFingerprint = initialSavedFingerprint;

          if (savedFingerprint && hasManualLogoutMarker) {
            appDebugLog('鈿狅笍 妫€娴嬪埌涓绘姩閫€鍑烘爣璁帮紝鐩存帴鏄剧ず鐧诲綍椤甸潰');
            setIsInitializing(false);
            return;
          }

          if (savedFingerprint && !hasManualLogoutMarker) {
            updateStartupStatus('正在恢复登录', '正在通过设备身份恢复账号...');
            appDebugLog('馃攧 妫€娴嬪埌璁惧鎸囩汗浣嗘棤 token锛屽皾璇曞揩閫熸仮澶嶈嚜鍔ㄧ櫥褰?..');
            const recoveredSession = await autoRegisterWithRetry(savedFingerprint, { maxRetries: 1 });

            if (recoveredSession.success) {
              appDebugLog('鉁?閫氳繃璁惧鎸囩汗鎭㈠鐧诲綍鎴愬姛');
              await AsyncStorage.removeItem(MANUAL_LOGOUT_STORAGE_KEY);
              await markBootstrapCompleted();
              enterAuthenticatedApp();
              setIsInitializing(false);
              return;
            }
          }
          
          if (savedFingerprint) {
            appDebugLog('🔄 使用已保存的设备指纹重新注册...');
            const result = await autoRegisterWithRetry(savedFingerprint, { maxRetries: 1 });
            
            if (result.success) {
              await AsyncStorage.removeItem(MANUAL_LOGOUT_STORAGE_KEY);
              appDebugLog('✅ 自动重新注册成功！');
              await markBootstrapCompleted();
              enterAuthenticatedApp();
              setIsInitializing(false);
              showToast('登录已更新', 'success');
            } else {
              console.error('❌ 自动重新注册失败');
              setIsLoggedIn(false);
              setIsInitializing(false);
              showToast('登录状态已过期，请重新登录', 'error');
            }
          } else {
            // 没有设备指纹，退出登录
            setIsLoggedIn(false);
            setIsInitializing(false);
            showToast('登录状态已过期，请重新登录', 'error');
          }
        } else {
          appDebugLog('📱 未检测到 token，检查设备指纹...');
          
          // 检查是否有保存的设备指纹
          const savedFingerprint = initialSavedFingerprint;

          if (savedFingerprint && hasManualLogoutMarker) {
            appDebugLog('鈿狅笍 妫€娴嬪埌涓绘姩閫€鍑烘爣璁帮紝鐩存帴鏄剧ず鐧诲綍椤甸潰');
            setIsInitializing(false);
            return;
          }

          if (savedFingerprint && !hasManualLogoutMarker) {
            appDebugLog('馃攧 妫€娴嬪埌璁惧鎸囩汗浣嗘棤 token锛屽皾璇曞揩閫熸仮澶嶈嚜鍔ㄧ櫥褰?..');
            const recoveredSession = await autoRegisterWithRetry(savedFingerprint, { maxRetries: 1 });

            if (recoveredSession.success) {
              appDebugLog('鉁?閫氳繃璁惧鎸囩汗鎭㈠鐧诲綍鎴愬姛');
              await markBootstrapCompleted();
              enterAuthenticatedApp();
              setIsInitializing(false);
              return;
            }
          }
          
          if (savedFingerprint) {
            appDebugLog('⚠️ 检测到设备指纹但无 token，可能是用户退出登录');
            appDebugLog('   显示登录页面');
            setIsInitializing(false);
            // 用户已经注册过但退出了，显示登录页面
          } else {
            appDebugLog('🆕 首次使用，开始设备指纹自动注册...');
            appDebugLog('═══════════════════════════════════════════════════════════════');
            
            try {
              // 生成设备指纹字符串
              appDebugLog('📱 步骤 1: 生成设备指纹');
              const fingerprint = await resolveDeviceFingerprint();
              appDebugLog('   ✅ 设备指纹生成成功:', fingerprint);
              
              // 使用重试机制调用自动注册接口
              appDebugLog('\n📡 步骤 2: 调用自动注册接口（带重试）');
              const result = await autoRegisterWithRetry(fingerprint, { maxRetries: 2 });
              
              appDebugLog('\n📊 步骤 3: 处理注册结果');
              
              if (result.success && result.data) {
                await AsyncStorage.removeItem(MANUAL_LOGOUT_STORAGE_KEY);
                appDebugLog('\n✅ 自动注册成功！');
                await markBootstrapCompleted();
                appDebugLog('═══════════════════════════════════════════════════════════════');
                appDebugLog('👤 用户信息:');
                appDebugLog('   用户名:', result.data.userBaseInfo?.username);
                appDebugLog('   用户ID:', result.data.userBaseInfo?.userId);
                appDebugLog('   默认密码:', INITIAL_CREDENTIALS_DEFAULT_PASSWORD);
                appDebugLog('═══════════════════════════════════════════════════════════════');

                const initialUsername = result.data.userBaseInfo?.username;
                if (initialUsername) {
                  await AsyncStorage.setItem(
                    INITIAL_CREDENTIALS_NOTICE_STORAGE_KEY,
                    JSON.stringify({
                      username: initialUsername,
                      password: INITIAL_CREDENTIALS_DEFAULT_PASSWORD,
                    })
                  );
                }
                
                const registeredUserId = result.data.userBaseInfo?.userId;
                if (registeredUserId) {
                  await setInterestOnboardingPending(registeredUserId);
                }

                // 自动登录进入应用
                const shouldShowStartupOnboarding =
                  primeInterestOnboardingForCurrentUser(registeredUserId);
                enterAuthenticatedApp({ skipInterestCheck: shouldShowStartupOnboarding });
                setIsInitializing(false);
              } else {
                console.error('\n❌ 自动注册失败（已重试3次）');
                console.error('═══════════════════════════════════════════════════════════════');
                
                setIsInitializing(false);
                
                // 自动注册失败，显示登录页面，用户可以手动重试
                setTimeout(() => {
                  showToast('首次启动初始化失败，请点击"使用设备登录"重试', 'error');
                }, 500);
              }
            } catch (registerError) {
              console.error('\n❌ 自动注册异常');
              console.error('═══════════════════════════════════════════════════════════════');
              console.error('错误类型:', registerError.constructor.name);
              console.error('错误消息:', registerError.message);
              console.error('错误堆栈:', registerError.stack);
              console.error('═══════════════════════════════════════════════════════════════');
              
              setIsInitializing(false);
              
              // 根据错误类型提供更详细的提示
              let errorMessage = '首次启动初始化失败';
              
              if (registerError.message.includes('Network') || registerError.message.includes('network')) {
                errorMessage = '网络连接失败，请检查网络后点击"使用设备登录"重试';
              } else if (registerError.message.includes('timeout') || registerError.message.includes('超时')) {
                errorMessage = '连接超时，请检查网络或稍后重试';
              } else if (registerError.response?.status === 500) {
                errorMessage = '服务器错误，请稍后重试';
              } else if (registerError.response?.status === 403) {
                errorMessage = '访问被拒绝，请联系管理员';
              }
              
              // 网络错误或其他异常，显示登录页面
              setTimeout(() => {
                showToast(errorMessage, 'error');
              }, 500);
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        console.error('Error stack:', error.stack);
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  // 监听 Token 变化，当 Token 被清除时自动退出登录
  useEffect(() => {
    if (!isLoggedIn) return;

    const checkTokenInterval = setInterval(async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (!token && isLoggedIn) {
        appDebugLog('🚪 检测到 Token 被清除，自动退出登录');
        setIsLoggedIn(false);
      }
    }, 5000); // 每 5 秒检查一次

    return () => clearInterval(checkTokenInterval);
  }, [isLoggedIn]);

  useEffect(() => {
    let mounted = true;

    const checkInterestOnboardingStatus = async () => {
      if (!isLoggedIn) {
        if (!mounted) return;
        setShouldShowInterestOnboardingScreen(false);
        setIsCheckingInterestOnboarding(false);
        setInterestOnboardingUserId(null);
        return;
      }

      if (
        shouldPreservePreparedInterestOnboarding({
          shouldShowInterestOnboardingScreen,
          interestOnboardingUserId,
        })
      ) {
        if (!mounted) return;
        setIsCheckingInterestOnboarding(false);
        return;
      }

      updateStartupStatus('正在准备兴趣引导', '正在检查你的兴趣设置...');
      setIsCheckingInterestOnboarding(true);

      try {
        const currentUser = await withTimeout(
          () => authApi.getCurrentUser(),
          STARTUP_STEP_TIMEOUT_MS,
          'interest onboarding user'
        );
        const currentUserId = resolveInterestOnboardingUserId({
          interestOnboardingUserId,
          currentUser,
        });

        if (!currentUserId) {
          console.warn('Skip interest onboarding because current user id is unavailable');
          if (mounted) {
            setInterestOnboardingUserId(null);
            setShouldShowInterestOnboardingScreen(false);
          }
          return;
        }

        const shouldShow = await withTimeout(
          () => shouldShowInterestOnboarding(currentUserId),
          STARTUP_STEP_TIMEOUT_MS,
          'interest onboarding status'
        );

        if (!mounted) return;

        setInterestOnboardingUserId(currentUserId);
        setShouldShowInterestOnboardingScreen(shouldShow);
      } catch (error) {
        console.error('Failed to check interest onboarding status:', error);
        if (mounted) {
          setShouldShowInterestOnboardingScreen(false);
        }
      } finally {
        if (mounted) {
          setIsCheckingInterestOnboarding(false);
        }
      }
    };

    checkInterestOnboardingStatus();

    return () => {
      mounted = false;
    };
  }, [interestOnboardingUserId, isLoggedIn, shouldShowInterestOnboardingScreen]);

  const markBootstrapCompleted = React.useCallback(async () => {
    try {
      await AsyncStorage.setItem(APP_BOOTSTRAP_COMPLETED_STORAGE_KEY, 'true');
      setLaunchExperience(APP_LAUNCH_EXPERIENCE.RETURNING_USER);
    } catch (error) {
      console.error('Failed to persist completed bootstrap state:', error);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !isCheckingInterestOnboarding) {
      return;
    }

    const timer = setTimeout(() => {
      console.error('Interest onboarding check timed out, fallback to main flow');
      setShouldShowInterestOnboardingScreen(false);
      setIsCheckingInterestOnboarding(false);
      setInterestOnboardingUserId(null);
    }, STARTUP_STEP_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isLoggedIn, isCheckingInterestOnboarding]);

  // 显示加载界面直到字体和初始化完成
  const enterAuthenticatedApp = ({ skipInterestCheck = false } = {}) => {
    setIsCheckingInterestOnboarding(!skipInterestCheck);
    setIsLoggedIn(true);
  };

  const primeInterestOnboardingForCurrentUser = (userId) => {
    if (userId === undefined || userId === null || userId === '') {
      return false;
    }

    updateStartupStatus('即将进入兴趣引导', '正在为你打开个性化设置...');
    const normalizedUserId = String(userId);
    setInterestOnboardingUserId(normalizedUserId);
    setShouldShowInterestOnboardingScreen(true);
    setIsCheckingInterestOnboarding(false);
    return true;
  };

  const initialLoadingView =
    !fontsLoaded || isInitializing ? (
      <StartupLoadingScreen
        title={!fontsLoaded ? '正在加载应用资源' : startupStatus.title}
        message={!fontsLoaded ? '正在准备界面资源，请稍候...' : startupStatus.message}
        notice={startupRecoveryNotice || ''}
        accent={!fontsLoaded ? '资源加载中' : '初始化中'}
      />
    ) : null;

  const loadingView =
    !fontsLoaded || isInitializing
      ? (
          <View style={{ flex: 1, backgroundColor: '#fff' }} onLayout={handleRootLayout}>
            {launchExperience === APP_LAUNCH_EXPERIENCE.NEW_USER ? (
              initialLoadingView
            ) : (
              <LaunchLoadingScreen
                title={!fontsLoaded ? 'Loading application resources' : startupStatus.title}
                message={!fontsLoaded ? 'Preparing the first screen...' : startupStatus.message}
                notice={startupRecoveryNotice || ''}
              />
            )}
          </View>
        )
      : null;

  if (loadingView) {
    appDebugLog('馃攧 App loading state:', { fontsLoaded, isInitializing });
    return loadingView;
  }

  const onboardingCheckingView =
    isLoggedIn && isCheckingInterestOnboarding ? (
      <StartupLoadingScreen
        title={startupStatus.title}
        message={startupStatus.message}
        accent="个性化设置中"
      />
    ) : null;

  const resolvedOnboardingCheckingView =
    isLoggedIn &&
    isCheckingInterestOnboarding &&
    launchExperience !== APP_LAUNCH_EXPERIENCE.NEW_USER ? (
      <LaunchLoadingScreen
        title={startupStatus.title}
        message={startupStatus.message}
      />
    ) : onboardingCheckingView;

  if (resolvedOnboardingCheckingView) {
    return resolvedOnboardingCheckingView;
  }

  appDebugLog('✅ App ready, isLoggedIn:', isLoggedIn);

  const updateChecker = (
    <UpdateChecker enabled={fontsLoaded && !isInitializing} />
  );

  const handleLogin = async () => {
    await markBootstrapCompleted();
    enterAuthenticatedApp();
  };

  const handleLogout = () => {
    setShouldShowInterestOnboardingScreen(false);
    setIsCheckingInterestOnboarding(false);
    setInterestOnboardingUserId(null);
    setIsLoggedIn(false);
  };

  const handleInterestOnboardingComplete = async (payload) => {
    if (!interestOnboardingUserId) {
      setShouldShowInterestOnboardingScreen(false);
      return;
    }

    try {
      await saveUserInterestPreferences(interestOnboardingUserId, payload);
      const selectedInterestChannels = extractInterestChannels(payload);

      if (selectedInterestChannels.length > 0) {
        const savedComboChannels = await loadComboChannels();
        const mergedChannels = mergeUniqueChannels(savedComboChannels, selectedInterestChannels);
        await saveComboChannels(mergedChannels);
      }

      await markInterestOnboardingCompleted(interestOnboardingUserId);
      setShouldShowInterestOnboardingScreen(false);
      showToast('Interest preferences saved.', 'success');
    } catch (error) {
      console.error('Failed to save interest onboarding result:', error);
      showToast('Failed to save interest preferences.', 'error');
    }
  };

  const handleInterestOnboardingSkip = async () => {
    if (!interestOnboardingUserId) {
      setShouldShowInterestOnboardingScreen(false);
      return;
    }

    try {
      await markInterestOnboardingCompleted(interestOnboardingUserId);
    } catch (error) {
      console.error('Failed to mark interest onboarding skipped:', error);
    }

    setShouldShowInterestOnboardingScreen(false);
  };

  if (isLoggedIn && shouldShowInterestOnboardingScreen) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }} onLayout={handleRootLayout}>
        <EmergencyProvider>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            {updateChecker}
            <SafeInterestOnboardingScreen
              userId={interestOnboardingUserId}
              onComplete={handleInterestOnboardingComplete}
              onSkip={handleInterestOnboardingSkip}
            />
            <AppAlertContainer ref={appAlertRef} />
            <ToastContainer />
          </SafeAreaProvider>
        </EmergencyProvider>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }} onLayout={handleRootLayout}>
        <EmergencyProvider>
          <SafeAreaProvider>
            {startupRecoveryNotice ? (
              <View style={{ backgroundColor: '#fff1f2', paddingHorizontal: 16, paddingVertical: 10 }}>
                <Text style={{ color: '#b91c1c', fontSize: 13, lineHeight: 18 }}>
                  {startupRecoveryNotice}
                </Text>
              </View>
            ) : null}
            {updateChecker}
            <NavigationContainer>
              <StatusBar style="dark" />
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login">
                  {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
                </Stack.Screen>
                <Stack.Screen name="NetworkTest" component={NetworkTestScreen} />
              </Stack.Navigator>
              <AppAlertContainer ref={appAlertRef} />
              <ToastContainer />
            </NavigationContainer>
          </SafeAreaProvider>
        </EmergencyProvider>
      </View>
    );
  }

  const navigationLinking = __DEV__ ? undefined : APP_LINKING;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }} onLayout={handleRootLayout}>
      <EmergencyProvider>
      <SafeAreaProvider>
        {updateChecker}
        <NavigationContainer linking={navigationLinking}>
        <StatusBar style="dark" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main">
              {() => <MainTabs onLogout={handleLogout} />}
            </Stack.Screen>
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="QuestionDetail" component={SafeQuestionDetailScreen} />
          <Stack.Screen name="PaidUsersList" component={PaidUsersListScreen} options={{ title: '付费明细' }} />
          <Stack.Screen name="SupplementDetail" component={SafeSupplementDetailScreen} />
          <Stack.Screen name="QuestionActivityList" component={QuestionActivityListScreen} />
          <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} />
        <Stack.Screen name="Follow" component={FollowScreen} />
        <Stack.Screen name="Fans" component={FansScreen} />
        <Stack.Screen name="UserFollowing" component={UserFollowingScreen} />
        <Stack.Screen name="HotList" component={HotListScreen} />
        <Stack.Screen name="IncomeRanking" component={IncomeRankingScreen} />
        <Stack.Screen name="RewardRanking" component={RewardRankingScreen} />
        <Stack.Screen name="QuestionRanking" component={QuestionRankingScreen} />
        <Stack.Screen name="HeroRanking" component={HeroRankingScreen} />
        <Stack.Screen name="Messages" component={SafeMessagesScreen} />
        <Stack.Screen name="EmergencyList" component={EmergencyListScreen} />
        <Stack.Screen name="PrivateConversation" component={PrivateConversationScreen} />
        <Stack.Screen name="GroupChat" component={SafeGroupChatScreen} />
        <Stack.Screen name="AnswerDetail" component={SafeAnswerDetailScreen} />
        <Stack.Screen name="MyActivities" component={MyActivitiesScreen} />
        <Stack.Screen name="MyTeams" component={MyTeamsScreen} />
        <Stack.Screen name="MyGroups" component={MyGroupsScreen} />
        <Stack.Screen name="QuestionTeams" component={SafeQuestionTeamsScreen} />
        <Stack.Screen name="TeamDetail" component={SafeTeamDetailScreen} />
        <Stack.Screen name="TeamAnnouncementDetail" component={SafeTeamAnnouncementDetailScreen} />
        <Stack.Screen name="Settings" component={SafeSettingsScreen} />
        <Stack.Screen name="ChannelManage" component={ChannelManageScreen} />
        <Stack.Screen name="WisdomIndex" component={WisdomIndexScreen} />
        <Stack.Screen name="WisdomExam" component={WisdomExamScreen} />
        <Stack.Screen name="ExamHistory" component={ExamHistoryScreen} />
        <Stack.Screen name="ExamDetail" component={ExamDetailScreen} />
        <Stack.Screen name="QuestionBank" component={QuestionBankScreen} />
        <Stack.Screen name="UploadBank" component={UploadBankScreen} />
        <Stack.Screen name="CreateActivity" component={CreateActivityScreen} />
        <Stack.Screen name="InviteAnswer" component={InviteAnswerScreen} />
        <Stack.Screen name="InviteTeamMember" component={InviteTeamMemberScreen} />
        <Stack.Screen name="Report" component={ReportScreen} />
        <Stack.Screen name="AddReward" component={AddRewardScreen} />
        <Stack.Screen name="SuperLikePurchase" component={SuperLikePurchaseScreen} />
        <Stack.Screen name="SuperLikeHistory" component={SuperLikeHistoryScreen} />
        <Stack.Screen name="Contributors" component={ContributorsScreen} />
        <Stack.Screen name="PublicProfile" component={SafePublicProfileScreen} />
        <Stack.Screen name="TopicDetail" component={SafeTopicDetailScreen} />
        <Stack.Screen name="DeviceInfo" component={DeviceInfoScreen} />
        <Stack.Screen name="NetworkTest" component={NetworkTestScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="ConnectionStatus" component={ConnectionStatusScreen} />
        <Stack.Screen name="UpdateDebug" component={UpdateDebugScreen} />
        <Stack.Screen name="ApiDebug" component={ApiDebugScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />
        <Stack.Screen name="Blacklist" component={BlacklistScreen} />
        <Stack.Screen name="WalletDetail" component={WalletDetailScreen} />
        </Stack.Navigator>
          <AppAlertContainer ref={appAlertRef} />
          <ToastContainer />
      </NavigationContainer>
      </SafeAreaProvider>
      </EmergencyProvider>
    </View>
  );
}

const startupStyles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff7f7',
    paddingHorizontal: 24,
  },
  glowPrimary: {
    position: 'absolute',
    top: 120,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  glowSecondary: {
    position: 'absolute',
    bottom: 120,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fee2e2',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    marginBottom: 14,
  },
  accent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
    letterSpacing: 1,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  message: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: '#6b7280',
    textAlign: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e5e7eb',
  },
  progressDotActive: {
    backgroundColor: '#ef4444',
  },
  progressDotActiveSoft: {
    backgroundColor: '#fca5a5',
  },
  notice: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff1f2',
    color: '#b91c1c',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});

const launchLoadingStyles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fee2e2',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  title: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  message: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: '#6b7280',
    textAlign: 'center',
  },
  notice: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff1f2',
    color: '#b91c1c',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default function App() {
  return (
    <RootErrorBoundary>
      <AppContent />
    </RootErrorBoundary>
  );
}


