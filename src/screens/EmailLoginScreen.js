import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import KeyboardDismissView from '../components/KeyboardDismissView';
import { authApi } from '../services/api';
import { showToast } from '../utils/toast';
import { showAppAlert } from '../utils/appAlert';
import * as Updates from 'expo-updates';
import { SIMULATE_PRODUCTION } from '../config/debugMode';
import { isDevPreviewFeatureEnabled } from '../utils/devPreviewGate';

import { scaleFont } from '../utils/responsive';
import { appLogo } from '../constants/appAssets';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen({ navigation, onLogin }) {
  const isDebugLoginShortcutEnabled = isDevPreviewFeatureEnabled({
    isDev: __DEV__,
    simulateProduction: SIMULATE_PRODUCTION,
    platformOS: Platform.OS,
    updatesChannel: Updates.channel,
  });
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [emailFocused, setEmailFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSendCode = () => {
    // 鍙栨秷閭楠岃瘉
    // if (!email || !validateEmail(email)) {
    //   showToast('Please enter a valid email address', 'warning');
    //   return;
    // }
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    showToast('Verification code sent to your email', 'success');
  };

  const handleSubmit = async () => {
    // 涓存椂娴嬭瘯锛氱洿鎺ヨ缃竴涓祴璇?token锛堝紑鍙戠幆澧冿級
    if (isDebugLoginShortcutEnabled) {
      try {
        // 璁剧疆娴嬭瘯 token - 璇锋浛鎹负浣犵殑鐪熷疄 token
        const testToken = 'test_token_please_replace_with_real_token';
        await AsyncStorage.setItem('authToken', testToken);
        console.log('鉁?Test token set:', testToken);
        
        showAppAlert('登录成功', '已设置测试 token，可以测试修改密码功能。', [
          {
            text: '确定',
            onPress: () => {
              if (onLogin) {
                onLogin();
              }
            },
          },
        ]);
        return;
      } catch (error) {
        console.error('Failed to set test token:', error);
      }
    }
    
    // 浠ヤ笅鏄湡瀹炵殑鐧诲綍閫昏緫锛堝綋鍚庣 API 鍑嗗濂藉悗浣跨敤锛?
    /*
    // 鍩烘湰楠岃瘉
    if (!email || !email.trim()) {
      showAppAlert('鎻愮ず', '璇疯緭鍏ラ偖绠辨垨鎵嬫満鍙?);
      return;
    }
    
    if (!password || !password.trim()) {
      showAppAlert('鎻愮ず', '璇疯緭鍏ュ瘑鐮?);
      return;
    }

    setLoading(true);

    try {
      // 璋冪敤鐧诲綍 API
      const response = await authApi.login({
        phone: email, // 浣跨敤 phone 瀛楁锛堟牴鎹悗绔?API 瀹氫箟锛?
        password: password,
      });

      setLoading(false);

      // 妫€鏌ュ搷搴?
      if (response.code === 200 || response.token) {
        // 鐧诲綍鎴愬姛锛宼oken 宸插湪 authApi.login 涓繚瀛?
        showAppAlert('鐧诲綍鎴愬姛', '娆㈣繋鍥炴潵锛?, [
          {
            text: '纭畾',
            onPress: () => {
              if (onLogin) {
                onLogin();
              }
            },
          },
        ]);
      } else {
        showAppAlert('鐧诲綍澶辫触', response.msg || '鐧诲綍澶辫触锛岃妫€鏌ヨ处鍙峰瘑鐮?);
      }
    } catch (error) {
      setLoading(false);
      
      let errorMessage = '鐧诲綍澶辫触锛岃绋嶅悗閲嶈瘯';
      
      if (error.data && error.data.msg) {
        errorMessage = error.data.msg;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showAppAlert('鐧诲綍澶辫触', errorMessage);
      console.error('Login error:', error);
    }
    */
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardDismissView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Text style={styles.appName}>Problem vs Hero</Text>
            <Text style={styles.slogan}>Turn problems into heroic solutions</Text>
          </View>

          {/* 鍒囨崲鏍囩 */}
          <View style={styles.tabBar}>
            <TouchableOpacity style={[styles.tab, isLogin && styles.tabActive]} onPress={() => setIsLogin(true)}>
              <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, !isLogin && styles.tabActive]} onPress={() => setIsLogin(false)}>
              <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* 琛ㄥ崟 */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[
                styles.inputWrapper,
                emailFocused && styles.inputWrapperFocused
              ]}>
                <Ionicons name="mail-outline" size={20} color="#9ca3af" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>瀵嗙爜</Text>
              <View style={[
                styles.inputWrapper,
                passwordFocused && styles.inputWrapperFocused
              ]}>
                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                <TextInput
                  style={styles.input}
                  placeholder="请输入密码"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {!isLogin && (
              <TouchableOpacity style={styles.termsRow} onPress={() => setAgreeTerms(!agreeTerms)}>
                <Ionicons name={agreeTerms ? "checkbox" : "square-outline"} size={20} color={agreeTerms ? "#ef4444" : "#9ca3af"} />
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitText}>{isLogin ? '鐧诲綍' : '娉ㄥ唽'}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 绗笁鏂圭櫥褰?*/}
          <View style={styles.thirdPartySection}>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.divider} />
            </View>
            <View style={styles.socialBtns}>
              <TouchableOpacity style={styles.socialBtn}>
                <FontAwesome5 name="google" size={24} color="#EA4335" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <FontAwesome5 name="facebook" size={24} color="#1877F2" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <FontAwesome5 name="apple" size={24} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </KeyboardDismissView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT < 700 ? 20 : 40,
    marginBottom: SCREEN_HEIGHT < 700 ? 20 : 40,
  },
  logoCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoImage: { width: 76, height: 76 },
  appName: { fontSize: scaleFont(28), fontWeight: 'bold', color: '#1f2937', letterSpacing: -0.5, marginBottom: 8 },
  slogan: { fontSize: scaleFont(14), color: '#9ca3af' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#f3f4f6', marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -2 },
  tabActive: { borderBottomColor: '#ff4d4f' },
  tabText: { fontSize: scaleFont(16), color: '#9ca3af' },
  tabTextActive: { color: '#ff4d4f', fontWeight: '600' },
  formContainer: { backgroundColor: '#ffffff', marginBottom: 32 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: scaleFont(14), fontWeight: '500', color: '#374151', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fcfcfc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 52,
  },
  inputWrapperFocused: {
    borderColor: '#ff4d4f',
    backgroundColor: '#fff',
    shadowColor: 'rgba(255, 77, 79, 0.1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  input: { flex: 1, marginLeft: 12, fontSize: scaleFont(15), color: '#1f2937', paddingVertical: 14, outlineStyle: 'none' },
  codeBtn: { paddingHorizontal: 14, paddingVertical: 14, marginLeft: 8 },
  codeBtnDisabled: { opacity: 0.5 },
  codeBtnText: { fontSize: scaleFont(13), color: '#ff4d4f', fontWeight: '500' },
  codeBtnTextDisabled: { color: '#9ca3af' },
  termsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  termsText: { flex: 1, marginLeft: 8, fontSize: scaleFont(14), color: '#6b7280', lineHeight: scaleFont(20) },
  termsLink: { color: '#ef4444' },
  submitBtn: { backgroundColor: '#ef4444', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#fca5a5', opacity: 0.6 },
  submitText: { fontSize: scaleFont(16), color: '#fff', fontWeight: '600' },
  thirdPartySection: { marginTop: 'auto' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  divider: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 16, fontSize: scaleFont(14), color: '#9ca3af' },
  socialBtns: { flexDirection: 'row', justifyContent: 'center', gap: 32 },
  socialBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f3f4f6',
    padding: 10,
  },
});

