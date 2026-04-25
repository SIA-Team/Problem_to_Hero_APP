import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import KeyboardDismissView from '../components/KeyboardDismissView';
import authApi from '../services/api/authApi';
import DeviceInfo from '../utils/deviceInfo';
import { showToast } from '../utils/toast';
import { showAppAlert } from '../utils/appAlert';
import { SERVERS, getCurrentServer, switchServerAndReload, getCustomServerUrl } from '../utils/serverSwitcher';
import { useTranslation } from '../i18n/withTranslation';

import { scaleFont } from '../utils/responsive';
import { appLogo } from '../constants/appAssets';

/**
 * 鐢ㄦ埛鍚嶅瘑鐮佺櫥褰曢〉闈?
 * 鏍囪瘑锛歀oginScreen.js - 鐢ㄦ埛鍚嶅瘑鐮佺櫥褰曪紙褰撳墠浣跨敤锛?
 * 瀵规瘮锛欵mailLoginScreen.js - 閭楠岃瘉鐮佺櫥褰曪紙鏆傛椂闅愯棌锛屽悗缁凯浠ｄ娇鐢級
 */
export default function LoginScreen({ navigation, onLogin }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [errors, setErrors] = useState({ username: '', password: '' });
  
  // 鏈嶅姟鍣ㄥ垏鎹㈢浉鍏崇姸鎬?
  const [currentServer, setCurrentServer] = useState('server2');
  const [switching, setSwitching] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  // 缁勪欢鍔犺浇鏃跺皾璇曟仮澶嶄笂娆＄櫥褰曠殑鐢ㄦ埛鍚?
  useEffect(() => {
    const loadSavedUsername = async () => {
      try {
        const savedUsername = await AsyncStorage.getItem('lastLoginUsername');
        if (savedUsername) {
          setUsername(savedUsername);
          console.log('鉁?鎭㈠涓婃鐧诲綍鐢ㄦ埛鍚?', savedUsername);
        }
      } catch (error) {
        console.error('鉂?鍔犺浇淇濆瓨鐨勭敤鎴峰悕澶辫触:', error);
      }
    };
    
    loadSavedUsername();
  }, []);
  
  // 鍔犺浇鏈嶅姟鍣ㄩ厤缃?
  useEffect(() => {
    const loadServerConfig = async () => {
      const server = await getCurrentServer();
      setCurrentServer(server);
      
      const url = await getCustomServerUrl();
      setCustomUrl(url);
    };
    
    loadServerConfig();
  }, []);

  const validateUsername = (value) => {
    if (!value.trim()) {
      return t('screens.login.validation.usernameRequired');
    }
    if (value.length < 3) {
      return t('screens.login.validation.usernameMin');
    }
    return '';
  };

  const validatePassword = (value) => {
    if (!value) {
      return t('screens.login.validation.passwordRequired');
    }
    if (value.length < 6) {
      return t('screens.login.validation.passwordMin');
    }
    return '';
  };

  const handleLogin = async () => {
    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);

    if (usernameError || passwordError) {
      setErrors({
        username: usernameError,
        password: passwordError,
      });
      return;
    }

    setLoading(true);
    setErrors({ username: '', password: '' });

    try {
      console.log('\nStarting login...');
      console.log('Username:', username);

      const response = await authApi.login({
        username: username.trim(),
        password,
      });

      console.log('Login response:', JSON.stringify(response, null, 2));

      if (response.code === 200 && response.data) {
        console.log('Login succeeded');
        console.log('Token:', response.data.token);

        try {
          await AsyncStorage.setItem('lastLoginUsername', username.trim());
          console.log('Saved last login username');
        } catch (storageError) {
          console.error('Failed to save last login username:', storageError);
        }

        showToast(t('screens.login.toasts.loginSuccess'), 'success');

        if (onLogin) {
          onLogin();
        }
      } else {
        console.error('Login failed:', response.msg);
        showToast(response.msg || t('screens.login.toasts.invalidCredentials'), 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showToast(error.message || t('screens.login.toasts.networkError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // 娓呴櫎鐢ㄦ埛鍚嶉敊璇?
  const handleUsernameChange = (value) => {
    setUsername(value);
    if (errors.username) {
      setErrors({ ...errors, username: '' });
    }
  };

  // 娓呴櫎瀵嗙爜閿欒
  const handlePasswordChange = (value) => {
    setPassword(value);
    if (errors.password) {
      setErrors({ ...errors, password: '' });
    }
  };

  const handleDeviceLogin = async () => {
    setDeviceLoading(true);

    const getDeviceLoginErrorMessage = (error) => {
      const message = error?.message || '';

      if (/unsupported protocol/i.test(message)) {
        return 'Server URL is invalid. Please check that it starts with http:// or https://.';
      }

      return null;
    };

    const loginWithRetry = async (fingerprint, maxRetries = 3) => {
      let lastError = null;

      for (let i = 0; i < maxRetries; i++) {
        try {
          console.log(`Trying device login (${i + 1}/${maxRetries})...`);
          const response = await authApi.registerByFingerprint(fingerprint);
          
          if (response.code === 200 && response.data) {
            console.log('Device login succeeded');
            return { success: true, data: response.data };
          } else {
            console.error(`Device login attempt ${i + 1} failed:`, response.msg);
          }
        } catch (error) {
          lastError = error;
          console.error(`Device login attempt ${i + 1} errored:`, error.message);

          if (getDeviceLoginErrorMessage(error)) {
            break;
          }

          if (i < maxRetries - 1) {
            const delay = Math.pow(2, i) * 1000;
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      return { success: false, error: lastError };
    };

    try {
      console.log('\nStarting device login');
      console.log('Environment:', __DEV__ ? 'development' : 'production');

      console.log('Step 1: generate fingerprint');
      const fingerprint = await DeviceInfo.generateFingerprintString();
      console.log('Fingerprint generated:', fingerprint);

      console.log('Step 2: call fingerprint login API');
      const result = await loginWithRetry(fingerprint);
      
      console.log('Step 3: handle response');
      
      if (result.success && result.data) {
        console.log('Device login succeeded');
        console.log('Username:', result.data.userBaseInfo?.username);
        console.log('User ID:', result.data.userBaseInfo?.userId);

        showToast(
          t('screens.login.toasts.deviceLoginSuccess').replace(
            '{username}',
            result.data.userBaseInfo?.username || ''
          ),
          'success'
        );

        if (onLogin) {
          onLogin();
        }
      } else {
        console.error('Device login failed after retries');
        showToast(
          getDeviceLoginErrorMessage(result.error) || t('screens.login.toasts.deviceLoginFailed'),
          'error'
        );
      }
    } catch (error) {
      console.error('Device login error:', error);
      showToast(error.message || t('screens.login.toasts.networkError'), 'error');
    } finally {
      setDeviceLoading(false);
    }
  };
  
  const handleSwitchServer = serverKey => {
    if (switching) return;
    
    let server;
    if (serverKey === 'server1') {
      server = SERVERS.SERVER1;
    } else if (serverKey === 'server2') {
      server = SERVERS.SERVER2;
    } else if (serverKey === 'custom') {
      if (!customUrl.trim()) {
        showAppAlert(t('common.ok'), t('screens.login.server.enterCustomServer'));
        return;
      }
      server = {
        ...SERVERS.CUSTOM,
        url: customUrl
      };
    }
    
    showAppAlert(
      t('screens.login.server.title'),
      t('screens.login.server.confirmMessage')
        .replace('{name}', server.name)
        .replace('{url}', server.url),
      [
        {
          text: t('common.cancel'),
          style: 'cancel'
        },
        {
          text: t('common.confirm'),
          onPress: async () => {
            setSwitching(true);
            const success = await switchServerAndReload(
              serverKey,
              serverKey === 'custom' ? customUrl : ''
            );
            setSwitching(false);
            
            if (success) {
              setCurrentServer(serverKey);
              showAppAlert(
                t('screens.login.server.successTitle'),
                t('screens.login.server.successMessage'),
                [{ text: t('common.ok') }]
              );
            } else {
              showAppAlert(t('screens.login.server.failureTitle'), t('screens.login.server.failureMessage'));
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardDismissView>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
          {/* Logo 鍖哄煙 */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Text style={styles.appName}>Problem vs Hero</Text>
            <Text style={styles.appSlogan}>Turn problems into heroic solutions</Text>
          </View>

          {/* 鐧诲綍琛ㄥ崟 */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>{t('screens.login.title')}</Text>

            {/* 鐢ㄦ埛鍚嶈緭鍏?*/}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('screens.login.usernameLabel')}</Text>
              <View style={[
                styles.inputWrapper,
                errors.username && styles.inputWrapperError
              ]}>
                <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('screens.login.usernamePlaceholder')}
                  placeholderTextColor="#9ca3af"
                  value={username}
                  onChangeText={handleUsernameChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                {username.length > 0 && (
                  <TouchableOpacity onPress={() => setUsername('')}>
                    <Ionicons name="close-circle" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
              {errors.username ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color="#ef4444" />
                  <Text style={styles.errorText}>{errors.username}</Text>
                </View>
              ) : null}
            </View>

            {/* 瀵嗙爜杈撳叆 */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('screens.login.passwordLabel')}</Text>
              <View style={[
                styles.inputWrapper,
                errors.password && styles.inputWrapperError
              ]}>
                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('screens.login.passwordPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons 
                    name={showPassword ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color="#9ca3af" 
                  />
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color="#ef4444" />
                  <Text style={styles.errorText}>{errors.password}</Text>
                </View>
              ) : null}
            </View>

            {/* 鐧诲綍鎸夐挳 */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                  <Text style={styles.loginButtonText}>{t('screens.login.submit')}</Text>
              )}
            </TouchableOpacity>

            {/* 鍒嗛殧绾?*/}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>{t('screens.login.dividerOr')}</Text>
              <View style={styles.divider} />
            </View>

            {/* 璁惧鐧诲綍鎸夐挳 */}
            <TouchableOpacity
              style={[styles.deviceLoginButton, deviceLoading && styles.deviceLoginButtonDisabled]}
              onPress={handleDeviceLogin}
              disabled={deviceLoading}
              activeOpacity={0.8}
            >
              {deviceLoading ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <>
                  <Ionicons name="phone-portrait-outline" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                  <Text style={styles.deviceLoginButtonText}>{t('screens.login.deviceLogin')}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* 鎻愮ず鏂囨湰 */}
            <Text style={styles.hintText}>
              {t('screens.login.firstUseHint')}
            </Text>

            {/* 缃戠粶璇婃柇鎸夐挳 */}
            <TouchableOpacity
              style={styles.diagnosticButton}
              onPress={() => navigation.navigate('NetworkTest')}
              activeOpacity={0.7}
            >
              <Ionicons name="pulse-outline" size={16} color="#3b82f6" />
              <Text style={styles.diagnosticButtonText}>{t('screens.login.networkDiagnosis')}</Text>
            </TouchableOpacity>
          </View>

          {/* 鏈嶅姟鍣ㄥ垏鎹㈡ā鍧?*/}
          <View style={styles.serverSwitcherContainer}>
            <View style={styles.serverSwitcherHeader}>
              <Ionicons name="server-outline" size={18} color="#6b7280" />
              <Text style={styles.serverSwitcherTitle}>{t('screens.login.server.settingsTitle')}</Text>
            </View>
            
            <View style={styles.serverList}>
              {/* Server 1 */}
              <TouchableOpacity
                style={[
                  styles.serverItem,
                  currentServer === 'server1' && styles.serverItemActive
                ]}
                onPress={() => handleSwitchServer('server1')}
                disabled={switching || currentServer === 'server1'}
                activeOpacity={0.7}
              >
                <View style={styles.serverInfo}>
                  <View style={styles.serverHeader}>
                    <Text style={[
                      styles.serverName,
                      currentServer === 'server1' && styles.serverNameActive
                    ]}>
                      {SERVERS.SERVER1.name}
                    </Text>
                    {currentServer === 'server1' && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>{t('screens.login.server.current')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.serverUrl}>{SERVERS.SERVER1.url}</Text>
                </View>
                {currentServer === 'server1' && (
                  <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                )}
              </TouchableOpacity>

              {/* Server 2 */}
              <TouchableOpacity
                style={[
                  styles.serverItem,
                  currentServer === 'server2' && styles.serverItemActive
                ]}
                onPress={() => handleSwitchServer('server2')}
                disabled={switching || currentServer === 'server2'}
                activeOpacity={0.7}
              >
                <View style={styles.serverInfo}>
                  <View style={styles.serverHeader}>
                    <Text style={[
                      styles.serverName,
                      currentServer === 'server2' && styles.serverNameActive
                    ]}>
                      {SERVERS.SERVER2.name}
                    </Text>
                    {currentServer === 'server2' && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>{t('screens.login.server.current')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.serverUrl}>{SERVERS.SERVER2.url}</Text>
                </View>
                {currentServer === 'server2' && (
                  <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                )}
              </TouchableOpacity>

              {/* Custom Server */}
              <View>
                <View style={styles.customServerContainer}>
                  <TextInput
                    style={styles.customInput}
                    placeholder={t('screens.login.server.customPlaceholder')}
                    placeholderTextColor="#9ca3af"
                    value={customUrl}
                    onChangeText={setCustomUrl}
                    editable={!switching}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.serverItem,
                    currentServer === 'custom' && styles.serverItemActive
                  ]}
                  onPress={() => handleSwitchServer('custom')}
                  disabled={switching || currentServer === 'custom'}
                  activeOpacity={0.7}
                >
                  <View style={styles.serverInfo}>
                    <View style={styles.serverHeader}>
                      <Text style={[
                        styles.serverName,
                        currentServer === 'custom' && styles.serverNameActive
                      ]}>
                        {SERVERS.CUSTOM.name}
                      </Text>
                      {currentServer === 'custom' && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>{t('screens.login.server.current')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.serverUrl}>
                      {currentServer === 'custom' && customUrl ? customUrl : t('screens.login.server.unset')}
                    </Text>
                  </View>
                  {currentServer === 'custom' && (
                    <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {Boolean(switching) && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.loadingText}>{t('screens.login.server.switching')}</Text>
              </View>
            )}
            
            <Text style={styles.serverSwitcherHint}>
              {t('screens.login.server.switchHint')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </KeyboardDismissView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 76,
    height: 76,
  },
  appName: {
    fontSize: scaleFont(28),
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  appSlogan: {
    fontSize: scaleFont(14),
    color: '#6b7280',
  },
  formContainer: {
    marginBottom: 32,
  },
  formTitle: {
    fontSize: scaleFont(24),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    height: 52,
  },
  inputWrapperError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: scaleFont(16),
    color: '#1f2937',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  errorText: {
    fontSize: scaleFont(13),
    color: '#ef4444',
  },
  loginButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#fca5a5',
  },
  loginButtonText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#fff',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: scaleFont(14),
    color: '#9ca3af',
  },
  deviceLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    height: 52,
  },
  deviceLoginButtonDisabled: {
    borderColor: '#fca5a5',
    opacity: 0.6,
  },
  deviceLoginButtonText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#ef4444',
  },
  hintText: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: scaleFont(20),
  },
  diagnosticButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    gap: 6,
  },
  diagnosticButtonText: {
    fontSize: scaleFont(14),
    color: '#3b82f6',
    fontWeight: '500',
  },
  // 鏈嶅姟鍣ㄥ垏鎹㈡ā鍧楁牱寮?
  serverSwitcherContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  serverSwitcherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serverSwitcherTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  serverList: {
    gap: 12,
  },
  serverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serverItemActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
  },
  serverInfo: {
    flex: 1,
  },
  serverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  serverName: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#374151',
  },
  serverNameActive: {
    color: '#22c55e',
  },
  activeBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  activeBadgeText: {
    fontSize: scaleFont(11),
    color: '#fff',
    fontWeight: '600',
  },
  serverUrl: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  loadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
  },
  loadingText: {
    fontSize: scaleFont(13),
    color: '#3b82f6',
    marginLeft: 8,
  },
  serverSwitcherHint: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 12,
    textAlign: 'center',
  },
  customServerContainer: {
    marginBottom: 8,
  },
  customInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: scaleFont(13),
    color: '#374151',
    fontFamily: 'monospace',
  },
});

