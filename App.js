import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ScrollView, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
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
import { setToastRef, showToast } from './src/utils/toast';
import { setAppAlertRef } from './src/utils/appAlert';
import { syncCacheIdentity } from './src/utils/cacheManager';
// import UpdateChecker from './src/components/UpdateChecker'; // 临时注释：构建APK时不需要热更新功能

import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import PublishScreen from './src/screens/PublishScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import QuestionDetailScreen from './src/screens/QuestionDetailScreen';
import FollowScreen from './src/screens/FollowScreen';
import HotListScreen from './src/screens/HotListScreen';
import IncomeRankingScreen from './src/screens/IncomeRankingScreen';
import RewardRankingScreen from './src/screens/RewardRankingScreen';
import QuestionRankingScreen from './src/screens/QuestionRankingScreen';
import GroupChatScreen from './src/screens/GroupChatScreen';
import AnswerDetailScreen from './src/screens/AnswerDetailScreen';
import SupplementDetailScreen from './src/screens/SupplementDetailScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import ActivityDetailScreen from './src/screens/ActivityDetailScreen';
import LoginScreen from './src/screens/LoginScreen';
import QuestionActivityListScreen from './src/screens/QuestionActivityListScreen';
import MyTeamsScreen from './src/screens/MyTeamsScreen';
import TeamDetailScreen from './src/screens/TeamDetailScreen';
import QuestionTeamsScreen from './src/screens/QuestionTeamsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import WisdomIndexScreen from './src/screens/WisdomIndexScreen';
import WisdomExamScreen from './src/screens/WisdomExamScreen';
import ExamHistoryScreen from './src/screens/ExamHistoryScreen';
import ExamDetailScreen from './src/screens/ExamDetailScreen';
import QuestionBankScreen from './src/screens/QuestionBankScreen';
import UploadBankScreen from './src/screens/UploadBankScreen';
import ChannelManageScreen from './src/screens/ChannelManageScreen';
import EmergencyScreen from './src/screens/EmergencyScreen';
import CreateActivityScreen from './src/screens/CreateActivityScreen';
import InviteAnswerScreen from './src/screens/InviteAnswerScreen';
import InviteTeamMemberScreen from './src/screens/InviteTeamMemberScreen';
import ReportScreen from './src/screens/ReportScreen';
import AddRewardScreen from './src/screens/AddRewardScreen';
import SuperLikePurchaseScreen from './src/screens/SuperLikePurchaseScreen';
import SuperLikeHistoryScreen from './src/screens/SuperLikeHistoryScreen';
import ContributorsScreen from './src/screens/ContributorsScreen';
import PublicProfileScreen from './src/screens/PublicProfileScreen';
import NetworkTestScreen from './src/screens/NetworkTestScreen';
import DeviceInfoScreen from './src/screens/DeviceInfoScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import ConnectionStatusScreen from './src/screens/ConnectionStatusScreen';
import UpdateDebugScreen from './src/screens/UpdateDebugScreen';
import ApiDebugScreen from './src/screens/ApiDebugScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import BlacklistScreen from './src/screens/BlacklistScreen';
import { modalTokens } from './src/components/modalTokens';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const SERVER_SELECTION_STORAGE_KEY = '@app_server_selection';

const getCurrentBundleFingerprint = () => {
  const runtimeVersion =
    Updates.runtimeVersion ||
    Constants.expoConfig?.runtimeVersion ||
    'unknown-runtime';
  const updateId =
    Updates.updateId ||
    (Updates.isEmbeddedLaunch ? 'embedded' : 'no-update-id');

  return `${runtimeVersion}:${updateId}`;
};

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
    <Modal visible={visible} animationType="slide">
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

        <ScrollView style={modalStyles.emergencyFormArea} keyboardShouldPersistTaps="handled">
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
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
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
  emergencyFormArea: { flex: 1, padding: 16 },
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
      screenOptions={({ route }) => ({
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
      <Tab.Screen name={TAB_NAMES.PUBLISH} component={PublishScreen} />
      <Tab.Screen name={TAB_NAMES.EMERGENCY} component={EmergencyScreen} />
      <Tab.Screen name={TAB_NAMES.PROFILE}>
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  console.log('📱 App component rendering...');
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  
  console.log('📱 App state:', { isLoggedIn, isInitializing, fontsLoaded });
  
  // 使用回调 ref 确保 Toast 引用在组件挂载时立即设置
  const toastRef = React.useCallback((ref) => {
    if (ref) {
      setToastRef(ref);
    }
  }, []);

  const appAlertRef = React.useCallback((ref) => {
    if (ref) {
      setAppAlertRef(ref);
    }
  }, []);

  // 预加载字体
  useEffect(() => {
    console.log('🔤 开始加载字体...');
    async function loadFonts() {
      try {
        console.log('🔤 正在加载字体...');
        await Font.loadAsync({
          ...Ionicons.font,
          // 预加载 Font Awesome 5 字体
          'FontAwesome5_Solid': require('react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf'),
          'FontAwesome5_Regular': require('react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf'),
          'FontAwesome5_Brands': require('react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf'),
        });
        console.log('✅ 字体加载完成');
        setFontsLoaded(true);
      } catch (error) {
        console.error('❌ 字体加载失败:', error);
        // 即使加载失败也继续，避免卡住
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  // 初始化服务和检查登录状态
  useEffect(() => {
    // 自动注册重试函数（开发和生产环境都使用）
    const autoRegisterWithRetry = async (fingerprint, maxRetries = 3) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          console.log(`🔄 尝试自动注册 (${i + 1}/${maxRetries})...`);
          const response = await authApi.registerByFingerprint(fingerprint);
          
          if (response.code === 200 && response.data) {
            console.log('✅ 自动注册成功！');
            return { success: true, data: response.data };
          } else {
            console.error(`⚠️ 第 ${i + 1} 次尝试返回错误:`, response.msg);
          }
        } catch (error) {
          console.error(`❌ 第 ${i + 1} 次尝试失败:`, error.message);
          
          if (i < maxRetries - 1) {
            // 指数退避：1s, 2s, 4s
            const delay = Math.pow(2, i) * 1000;
            console.log(`⏳ 等待 ${delay}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      return { success: false };
    };

    const initializeApp = async () => {
      try {
        console.log('🚀 应用启动中...');
        console.log('⚙️  环境:', __DEV__ ? '开发环境' : '生产环境');
        console.log('');
        
        // 初始化超级赞积分系统（异步，不阻塞）
        const selectedServer =
          (await AsyncStorage.getItem(SERVER_SELECTION_STORAGE_KEY)) || 'server2';
        const cacheIdentity = `${selectedServer}|${getCurrentBundleFingerprint()}`;
        const cacheIdentityResult = await syncCacheIdentity(cacheIdentity);

        if (cacheIdentityResult.changed) {
          console.log('🧹 检测到服务器或 bundle 指纹变化，已自动清理业务缓存');
          console.log('   上次身份:', cacheIdentityResult.previousIdentity || '无');
          console.log('   当前身份:', cacheIdentityResult.currentIdentity);
        }

        superLikeCreditService.initialize().catch(error => {
          console.error('⚠️ Service initialization failed:', error);
        });
        
        // 检查是否有保存的 token（自动登录）
        const savedToken = await AsyncStorage.getItem('authToken');
        
        if (savedToken) {
          console.log('✅ 检测到已保存的 token，尝试 token 自动登录');
          console.log('   Token (前20字符):', savedToken.substring(0, 20) + '...');
          
          try {
            // 尝试使用 token 自动登录
            const tokenLoginResponse = await authApi.tokenLogin();
            
            if (tokenLoginResponse.code === 200) {
              console.log('✅ Token 自动登录成功');
              
              // 立即设置登录状态，让用户进入应用
              setIsLoggedIn(true);
              setIsInitializing(false);
              
              // 后台加载用户信息（不阻塞UI）
              console.log('\n👤 后台加载用户信息...');
              UserCacheService.loadUserProfileWithCache(
                (cachedProfile) => {
                  console.log('⚡ 从缓存加载用户信息:', cachedProfile?.nickName || 'Unknown');
                },
                (freshProfile) => {
                  console.log('🔄 用户信息已更新:', freshProfile?.nickName || 'Unknown');
                }
              ).catch(error => {
                console.error('⚠️ User profile loading failed:', error);
              });
              
              return; // 成功登录，退出初始化流程
            } else {
              console.log('⚠️ Token 自动登录失败:', tokenLoginResponse.msg);
              console.log('   Token 可能已过期，尝试设备指纹重新注册...');
              
              // Token 过期，清除旧数据
              await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userInfo']);
            }
          } catch (tokenLoginError) {
            console.error('❌ Token 自动登录异常:', tokenLoginError.message);
            console.log('   尝试设备指纹重新注册...');
            
            // Token 登录失败，清除旧数据
            await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userInfo']);
          }
          
          // Token 登录失败，尝试使用设备指纹重新注册
          const savedFingerprint = await AsyncStorage.getItem('deviceFingerprint');
          
          if (savedFingerprint) {
            console.log('🔄 使用已保存的设备指纹重新注册...');
            const result = await autoRegisterWithRetry(savedFingerprint);
            
            if (result.success) {
              console.log('✅ 自动重新注册成功！');
              setIsLoggedIn(true);
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
          console.log('📱 未检测到 token，检查设备指纹...');
          
          // 检查是否有保存的设备指纹
          const savedFingerprint = await AsyncStorage.getItem('deviceFingerprint');
          
          if (savedFingerprint) {
            console.log('⚠️ 检测到设备指纹但无 token，可能是用户退出登录');
            console.log('   显示登录页面');
            setIsInitializing(false);
            // 用户已经注册过但退出了，显示登录页面
          } else {
            console.log('🆕 首次使用，开始设备指纹自动注册...');
            console.log('═══════════════════════════════════════════════════════════════');
            
            try {
              // 生成设备指纹字符串
              console.log('📱 步骤 1: 生成设备指纹');
              const fingerprint = await DeviceInfo.generateFingerprintString();
              console.log('   ✅ 设备指纹生成成功:', fingerprint);
              
              // 使用重试机制调用自动注册接口
              console.log('\n📡 步骤 2: 调用自动注册接口（带重试）');
              const result = await autoRegisterWithRetry(fingerprint);
              
              console.log('\n📊 步骤 3: 处理注册结果');
              
              if (result.success && result.data) {
                console.log('\n✅ 自动注册成功！');
                console.log('═══════════════════════════════════════════════════════════════');
                console.log('👤 用户信息:');
                console.log('   用户名:', result.data.userBaseInfo?.username);
                console.log('   用户ID:', result.data.userBaseInfo?.userId);
                console.log('   默认密码: 12345678');
                console.log('═══════════════════════════════════════════════════════════════');
                
                // 自动登录进入应用
                setIsLoggedIn(true);
                setIsInitializing(false);
                
                // 显示欢迎提示
                setTimeout(() => {
                  showToast(`欢迎使用！您的用户名是 ${result.data.userBaseInfo?.username}，默认密码是 12345678`, 'success');
                }, 1000);
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
        console.log('🚪 检测到 Token 被清除，自动退出登录');
        setIsLoggedIn(false);
      }
    }, 1000); // 每秒检查一次

    return () => clearInterval(checkTokenInterval);
  }, [isLoggedIn]);

  // 显示加载界面直到字体和初始化完成
  if (!fontsLoaded || isInitializing) {
    console.log('🔄 App loading state:', { fontsLoaded, isInitializing });
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={{ marginTop: 16, fontSize: 14, color: '#6b7280' }}>
          {!fontsLoaded ? '加载中...' : '正在初始化...'}
        </Text>
      </View>
    );
  }

  console.log('✅ App ready, isLoggedIn:', isLoggedIn);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
            <Stack.Screen name="NetworkTest" component={NetworkTestScreen} />
          </Stack.Navigator>
          <AppAlertContainer ref={appAlertRef} />
          <ToastContainer ref={toastRef} />
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {/* <UpdateChecker /> */} {/* 临时注释：构建APK时不需要热更新功能 */}
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main">
              {() => <MainTabs onLogout={handleLogout} />}
            </Stack.Screen>
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="QuestionDetail" component={QuestionDetailScreen} />
          <Stack.Screen name="SupplementDetail" component={SupplementDetailScreen} />
          <Stack.Screen name="QuestionActivityList" component={QuestionActivityListScreen} />
          <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} />
        <Stack.Screen name="Follow" component={FollowScreen} />
        <Stack.Screen name="HotList" component={HotListScreen} />
        <Stack.Screen name="IncomeRanking" component={IncomeRankingScreen} />
        <Stack.Screen name="RewardRanking" component={RewardRankingScreen} />
        <Stack.Screen name="QuestionRanking" component={QuestionRankingScreen} />
        <Stack.Screen name="Messages" component={MessagesScreen} />
        <Stack.Screen name="GroupChat" component={GroupChatScreen} />
        <Stack.Screen name="AnswerDetail" component={AnswerDetailScreen} />
        <Stack.Screen name="MyTeams" component={MyTeamsScreen} />
        <Stack.Screen name="QuestionTeams" component={QuestionTeamsScreen} />
        <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
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
        <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
        <Stack.Screen name="DeviceInfo" component={DeviceInfoScreen} />
        <Stack.Screen name="NetworkTest" component={NetworkTestScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="ConnectionStatus" component={ConnectionStatusScreen} />
        <Stack.Screen name="UpdateDebug" component={UpdateDebugScreen} />
        <Stack.Screen name="ApiDebug" component={ApiDebugScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />
        <Stack.Screen name="Blacklist" component={BlacklistScreen} />
        </Stack.Navigator>
          <AppAlertContainer ref={appAlertRef} />
          <ToastContainer ref={toastRef} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
