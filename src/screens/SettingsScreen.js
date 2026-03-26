import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, TextInput, Modal, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Avatar from '../components/Avatar';
import EditTextModal from '../components/EditTextModal';
import EditUsernameModal from '../components/EditUsernameModal';
import AvatarActionSheet from '../components/AvatarActionSheet';
import BindContactModal from '../components/BindContactModal';
import GenderPickerModal from '../components/GenderPickerModal';
import DatePickerModal from '../components/DatePickerModal';
import Toast from '../components/Toast';
import ServerSwitcher from '../components/ServerSwitcher';
import LogoutConfirmModal from '../components/LogoutConfirmModal';
import OccupationPickerModal from '../components/OccupationPickerModal';
import { modalTokens } from '../components/modalTokens';
import { useTranslation } from '../i18n/withTranslation';
import UserCacheService from '../services/UserCacheService';
import userApi from '../services/api/userApi';
import authApi from '../services/api/authApi';
import { showAppAlert } from '../utils/appAlert';
import { getRegionData } from '../data/regionData';
export default function SettingsScreen({
  navigation
}) {
  const {
    t,
    i18n
  } = useTranslation();
  // Toast 状态
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success'
  });
  // 通知设置状态
  const [pushEnabled, setPushEnabled] = useState(true);
  const [likeNotify, setLikeNotify] = useState(true);
  const [commentNotify, setCommentNotify] = useState(true);
  const [followNotify, setFollowNotify] = useState(true);
  const [systemNotify, setSystemNotify] = useState(true);

  // 隐私设置状态
  const [showOnline, setShowOnline] = useState(true);
  const [allowMessage, setAllowMessage] = useState(true);

  // 编辑资料弹窗状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editTitle, setEditTitle] = useState('');

  // 通用编辑弹窗状态
  const [showTextModal, setShowTextModal] = useState(false);
  const [textModalConfig, setTextModalConfig] = useState({
    title: '',
    field: '',
    currentValue: '',
    minLength: 0,
    maxLength: 100,
    multiline: false,
    hint: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // 头像操作弹窗状态
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);

  // 绑定联系方式弹窗状态
  const [showBindModal, setShowBindModal] = useState(false);
  const [bindType, setBindType] = useState('phone'); // 'phone' | 'email'

  // 性别选择弹窗状态
  const [showGenderModal, setShowGenderModal] = useState(false);

  // 生日选择弹窗状态
  const [showDateModal, setShowDateModal] = useState(false);
  const [showOccupationModal, setShowOccupationModal] = useState(false);

  // 用户名编辑弹窗状态
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  // 服务器切换器状态
  const [showServerSwitcher, setShowServerSwitcher] = useState(false);

  // 退出登录弹窗状态
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const currentLanguageLabel = i18n?.locale === 'en' ? 'English' : '简体中文';

  const handleLanguageSelect = async locale => {
    await i18n.setLanguage(locale);
    showAppAlert(
      t('screens.settings.alerts.saveSuccess.title'),
      locale === 'en' ? 'Language switched to English.' : '语言已切换为简体中文。'
    );
  };

  const handleLanguagePress = () => {
    showAppAlert(
      t('screens.settings.alerts.language.title'),
      i18n?.locale === 'en' ? `Current language: ${currentLanguageLabel}` : `当前语言：${currentLanguageLabel}`,
      [
        { text: i18n?.locale === 'en' ? 'Cancel' : '取消', style: 'cancel' },
        { text: '简体中文', onPress: () => handleLanguageSelect('zh') },
        { text: 'English', onPress: () => handleLanguageSelect('en') }
      ]
    );
  };

  // 缓存大小状态
  const [cacheSize, setCacheSize] = useState('计算中...');

  // 区域选择相关状态
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [regionStep, setRegionStep] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState({ country: '', city: '', state: '', district: '' });
  const regionData = useMemo(() => getRegionData(), []);

  // 用户资料数据
  const [userProfile, setUserProfile] = useState({
    userId: '',
    username: '',
    // 用户名（可修改，每半年一次）
    usernameLastModified: null,
    // 用户名上次修改时间
    name: '张三丰',
    bio: '热爱学习，乐于分享。专注Python、数据分析领域。',
    location: '北京',
    occupation: '数据分析师',
    gender: '男',
    birthday: '1990-01-01',
    avatar: null,
    // 头像 URL
    email: '',
    phone: '',
    passwordChanged: false // 是否修改过密码（默认 false，表示未修改，会显示默认密码）
  });

  // 上传头像加载状态
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // 显示 Toast
  const showToast = (message, type = 'success') => {
    setToast({
      visible: true,
      message,
      type
    });
  };

  // 加载用户信息（使用缓存策略）
  useEffect(() => {
    const loadUserProfile = async () => {
      // 读取本地保存的用户名修改时间
      const savedModifiedTime = await AsyncStorage.getItem('usernameLastModified');
      // 读取密码修改标记
      const passwordChangedFlag = await AsyncStorage.getItem('passwordChanged');
      const hasChangedPassword = passwordChangedFlag === 'true';
      await UserCacheService.loadUserProfileWithCache(
      // 缓存加载完成回调（立即显示）
      cachedProfile => {
        console.log('SettingsScreen: 从缓存加载用户信息', cachedProfile);
        setUserProfile({
          userId: cachedProfile.userId || '',
          username: cachedProfile.username || '',
          usernameLastModified: cachedProfile.usernameLastModified || savedModifiedTime || null,
          name: cachedProfile.nickName || '用户',
          bio: cachedProfile.signature || '',
          location: cachedProfile.location || '',
          occupation: cachedProfile.profession || '',
          gender: cachedProfile.sex === '0' ? '男' : cachedProfile.sex === '1' ? '女' : '保密',
          birthday: cachedProfile.birthday || '',
          avatar: cachedProfile.avatar || null,
          email: cachedProfile.email || '',
          phone: cachedProfile.phonenumber || '',
          passwordChanged: cachedProfile.passwordChanged === true || hasChangedPassword
        });
      },
      // 最新数据加载完成回调（静默更新）
      freshProfile => {
        console.log('SettingsScreen: 从服务器更新用户信息', freshProfile);
        setUserProfile({
          userId: freshProfile.userId || '',
          username: freshProfile.username || '',
          usernameLastModified: freshProfile.usernameLastModified || savedModifiedTime || null,
          name: freshProfile.nickName || '用户',
          bio: freshProfile.signature || '',
          location: freshProfile.location || '',
          occupation: freshProfile.profession || '',
          gender: freshProfile.sex === '0' ? '男' : freshProfile.sex === '1' ? '女' : '保密',
          birthday: freshProfile.birthday || '',
          avatar: freshProfile.avatar || null,
          email: freshProfile.email || '',
          phone: freshProfile.phonenumber || '',
          passwordChanged: freshProfile.passwordChanged === true || hasChangedPassword
        });
      });
    };
    loadUserProfile();
    
    // 计算缓存大小
    calculateCacheSize();
  }, []);

  // 加载消息通知设置
  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        console.log('📡 开始加载消息通知设置...');
        const response = await userApi.getNotificationSettings();
        
        if (response && response.code === 200 && response.data) {
          const data = response.data;
          console.log('✅ 消息通知设置加载成功:', data);
          
          // 更新状态（将 0/1 转换为 boolean）
          setPushEnabled(data.pushEnabled === 1);
          setLikeNotify(data.notifyLikes === 1);
          setCommentNotify(data.notifyComments === 1);
          setFollowNotify(data.notifyFollowers === 1);
          setSystemNotify(data.notifySystem === 1);
        } else {
          console.log('⚠️ 消息通知设置返回数据异常:', response);
        }
      } catch (error) {
        console.error('❌ 加载消息通知设置失败:', error);
        // 失败时保持默认值，不显示错误提示
      }
    };
    
    loadNotificationSettings();
  }, []);

  /**
   * 更新消息通知设置
   * @param {string} field - 字段名
   * @param {boolean} value - 新值
   */
  const updateNotificationSetting = async (field, value) => {
    try {
      console.log(`📡 更新消息通知设置: ${field} = ${value}`);
      
      // 构建请求参数（只发送当前修改的字段）
      const settings = {};
      
      // 根据字段名映射到 API 参数，并将 boolean 转换为 int (0/1)
      switch (field) {
        case 'pushEnabled':
          settings.pushEnabled = value ? 1 : 0;
          break;
        case 'likeNotify':
          settings.notifyLikes = value ? 1 : 0;
          break;
        case 'commentNotify':
          settings.notifyComments = value ? 1 : 0;
          break;
        case 'followNotify':
          settings.notifyFollowers = value ? 1 : 0;
          break;
        case 'systemNotify':
          settings.notifySystem = value ? 1 : 0;
          break;
        default:
          console.error('❌ 未知的通知设置字段:', field);
          return;
      }
      
      const response = await userApi.updateNotificationSettings(settings);
      
      if (response && response.code === 200) {
        console.log('✅ 消息通知设置更新成功');
        // 更新成功后，更新本地状态
        switch (field) {
          case 'pushEnabled':
            setPushEnabled(value);
            break;
          case 'likeNotify':
            setLikeNotify(value);
            break;
          case 'commentNotify':
            setCommentNotify(value);
            break;
          case 'followNotify':
            setFollowNotify(value);
            break;
          case 'systemNotify':
            setSystemNotify(value);
            break;
        }
      } else {
        console.error('❌ 更新消息通知设置失败:', response);
        showToast('更新失败，请重试', 'error');
      }
    } catch (error) {
      console.error('❌ 更新消息通知设置异常:', error);
      showToast('更新失败，请重试', 'error');
    }
  };
  const handleEditProfile = (field, title, currentValue) => {
    setEditField(field);
    setEditTitle(title);
    setEditValue(currentValue);
    setShowEditModal(true);
  };
  const handleSaveEdit = () => {
    setUserProfile({
      ...userProfile,
      [editField]: editValue
    });
    setShowEditModal(false);
    showAppAlert(t('screens.settings.alerts.saveSuccess.title'), t('screens.settings.alerts.saveSuccess.message'));
  };

  // 打开通用编辑弹窗
  const openTextModal = (field, title, currentValue, config = {}) => {
    setTextModalConfig({
      title,
      field,
      currentValue,
      minLength: config.minLength || 0,
      maxLength: config.maxLength || 100,
      multiline: config.multiline || false,
      hint: config.hint || ''
    });
    setShowTextModal(true);
  };

  // 区域选择相关函数
  const getRegionOptions = () => {
    if (regionStep === 0) return regionData?.countries || [];
    if (regionStep === 1) return regionData.cities[selectedRegion.country] || [];
    if (regionStep === 2) return regionData.states[selectedRegion.city] || [];
    if (regionStep === 3) return regionData.districts[selectedRegion.state] || [];
    return [];
  };

  const selectRegion = (value) => {
    if (regionStep === 0) { 
      setSelectedRegion({ ...selectedRegion, country: value, city: '', state: '', district: '' }); 
      // 自动跳转到下一层
      if (regionData.cities[value] && regionData.cities[value].length > 0) {
        setRegionStep(1);
      }
    }
    else if (regionStep === 1) { 
      setSelectedRegion({ ...selectedRegion, city: value, state: '', district: '' }); 
      // 自动跳转到下一层
      if (regionData.states[value] && regionData.states[value].length > 0) {
        setRegionStep(2);
      }
    }
    else if (regionStep === 2) { 
      setSelectedRegion({ ...selectedRegion, state: value, district: '' }); 
      // 自动跳转到下一层
      if (regionData.districts[value] && regionData.districts[value].length > 0) {
        setRegionStep(3);
      }
    }
    else { 
      setSelectedRegion({ ...selectedRegion, district: value }); 
    }
  };

  const openRegionModal = () => {
    // 解析当前所在地，初始化选择状态
    const currentLocation = userProfile.location || '';
    // 这里简单处理，如果需要更精确的解析可以添加逻辑
    setSelectedRegion({ country: '', city: '', state: '', district: '' });
    setRegionStep(0);
    setShowRegionModal(true);
  };

  /**
   * 获取所在地的显示文本（只显示最后一级）
   */
  const getLocationDisplay = (location) => {
    if (!location) return '';
    
    // 按空格分割
    const parts = location.split(' ').filter(Boolean);
    
    // 如果有多级，只返回最后一级
    if (parts.length >= 2) {
      return parts[parts.length - 1];
    }
    
    // 如果只有一级，返回原值
    return location;
  };

  const confirmRegionSelection = async () => {
    // 构建所在地字符串
    const parts = [selectedRegion.country, selectedRegion.city, selectedRegion.state, selectedRegion.district].filter(Boolean);
    const locationString = parts.join(' ');
    
    console.log('=== 选择所在地结果 ===');
    console.log('selectedRegion:', selectedRegion);
    console.log('parts:', parts);
    console.log('最终 locationString:', locationString);
    console.log('=====================');
    
    if (!locationString) {
      showToast('请选择所在地', 'error');
      return;
    }

    // 关闭弹窗
    setShowRegionModal(false);
    setRegionStep(0);

    // 直接调用保存接口，传递 field 参数
    await handleSaveTextDirect('location', locationString);
  };

  // 直接保存文本（用于区域选择等不使用 textModalConfig 的场景）
  const handleOccupationSelect = async newOccupation => {
    setShowOccupationModal(false);
    if (!newOccupation || newOccupation === userProfile.occupation) {
      return;
    }

    setIsLoading(true);
    try {
      const updatedProfile = await UserCacheService.updateUserProfile({
        nickName: null,
        signature: null,
        profession: newOccupation.trim() || null,
        location: null
      });

      if (updatedProfile) {
        setUserProfile({
          userId: updatedProfile.userId || '',
          username: updatedProfile.username || '',
          usernameLastModified: updatedProfile.usernameLastModified || null,
          name: updatedProfile.nickName || '用户',
          bio: updatedProfile.signature || '',
          location: updatedProfile.location || '',
          occupation: updatedProfile.profession || '',
          gender: updatedProfile.sex === '0' ? '男' : updatedProfile.sex === '1' ? '女' : '保密',
          birthday: updatedProfile.birthday || '',
          avatar: updatedProfile.avatar || null,
          email: updatedProfile.email || '',
          phone: updatedProfile.phonenumber || ''
        });
        showToast('职业已更新', 'success');
      }
    } catch (error) {
      console.error('❌ 更新职业失败:', error);
      showToast(error.message || '更新失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTextDirect = async (field, newValue) => {
    console.log('=== handleSaveTextDirect Debug ===');
    console.log('field:', field);
    console.log('newValue:', newValue);

    // 字段名映射：前端字段名 -> API字段名
    const fieldMapping = {
      name: 'nickName',
      bio: 'signature',
      occupation: 'profession',
      location: 'location'
    };
    const apiFieldName = fieldMapping[field];
    
    console.log('apiFieldName:', apiFieldName);
    console.log('===========================');
    
    if (!apiFieldName) {
      console.error('❌ 未找到字段映射，field:', field);
      showAppAlert('错误', '未知的字段类型');
      return;
    }

    // 构建API请求数据：只发送当前编辑的字段，其他字段设为null
    const requestData = {
      nickName: null,
      signature: null,
      profession: null,
      location: null
    };

    // 设置当前编辑的字段值（空字符串也发送null）
    requestData[apiFieldName] = newValue.trim() || null;
    
    console.log('=== 发送给后端的数据 ===');
    console.log('requestData:', requestData);
    console.log('========================');
    
    setIsLoading(true);
    try {
      // 使用缓存服务更新（自动更新缓存和服务器）
      const updatedProfile = await UserCacheService.updateUserProfile(requestData);
      if (updatedProfile) {
        // 更新本地状态
        setUserProfile({
          userId: updatedProfile.userId || '',
          username: updatedProfile.username || '',
          usernameLastModified: updatedProfile.usernameLastModified || null,
          name: updatedProfile.nickName || '用户',
          bio: updatedProfile.signature || '',
          location: updatedProfile.location || '',
          occupation: updatedProfile.profession || '',
          gender: updatedProfile.sex === '0' ? '男' : updatedProfile.sex === '1' ? '女' : '保密',
          birthday: updatedProfile.birthday || '',
          avatar: updatedProfile.avatar || null,
          email: updatedProfile.email || '',
          phone: updatedProfile.phonenumber || ''
        });
        showToast('所在地已更新', 'success');
      }
    } catch (error) {
      // 只记录错误类型，不显示详细信息
      console.error('❌ 更新资料失败:', error);
      showToast(error.message || '更新失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存通用编辑内容
  const handleSaveText = async newValue => {
    const field = textModalConfig.field;
    
    console.log('=== handleSaveText Debug ===');
    console.log('textModalConfig:', textModalConfig);
    console.log('field:', field);
    console.log('newValue:', newValue);

    // 字段名映射：前端字段名 -> API字段名
    const fieldMapping = {
      name: 'nickName',
      bio: 'signature',
      occupation: 'profession',
      location: 'location'
    };
    const apiFieldName = fieldMapping[field];
    
    console.log('apiFieldName:', apiFieldName);
    console.log('===========================');
    
    if (!apiFieldName) {
      console.error('❌ 未找到字段映射，field:', field);
      showAppAlert('错误', '未知的字段类型');
      return;
    }

    // 构建API请求数据：只发送当前编辑的字段，其他字段设为null
    const requestData = {
      nickName: null,
      signature: null,
      profession: null,
      location: null
    };

    // 设置当前编辑的字段值（空字符串也发送null）
    requestData[apiFieldName] = newValue.trim() || null;
    
    console.log('=== 发送给后端的数据 ===');
    console.log('requestData:', requestData);
    console.log('========================');
    
    setIsLoading(true);
    try {
      // 使用缓存服务更新（自动更新缓存和服务器）
      const updatedProfile = await UserCacheService.updateUserProfile(requestData);
      if (updatedProfile) {
        // 更新本地状态
        setUserProfile({
          userId: updatedProfile.userId || '',
          username: updatedProfile.username || '',
          usernameLastModified: updatedProfile.usernameLastModified || null,
          name: updatedProfile.nickName || '用户',
          bio: updatedProfile.signature || '',
          location: updatedProfile.location || '',
          occupation: updatedProfile.profession || '',
          gender: updatedProfile.sex === '0' ? '男' : updatedProfile.sex === '1' ? '女' : '保密',
          birthday: updatedProfile.birthday || '',
          avatar: updatedProfile.avatar || null,
          email: updatedProfile.email || '',
          phone: updatedProfile.phonenumber || ''
        });
        showToast(`${textModalConfig.title || '信息'}已更新`, 'success');
      }
    } catch (error) {
      // 只记录错误类型，不显示详细信息
      console.error('❌ 更新资料失败:', error);
      showToast(error.message || '更新失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 保存用户名
   */
  const handleSaveUsername = async newUsername => {
    setIsLoading(true);
    try {
      // 调用专用 API 更新用户名
      const updatedProfile = await UserCacheService.updateUsername(newUsername);
      if (updatedProfile) {
        // 记录修改时间（如果后端没有返回，使用当前时间）
        const modifiedTime = updatedProfile.usernameLastModified || new Date().toISOString();

        // 保存修改时间到本地存储
        await AsyncStorage.setItem('usernameLastModified', modifiedTime);

        // 保存当前用户名到独立的键（方便其他地方读取）
        const finalUsername = updatedProfile.username || newUsername;
        await AsyncStorage.setItem('currentUsername', finalUsername);
        console.log('✅ 已保存当前用户名:', finalUsername);

        // 更新本地状态
        setUserProfile({
          userId: updatedProfile.userId || '',
          username: finalUsername,
          usernameLastModified: modifiedTime,
          name: updatedProfile.nickName || userProfile.name,
          bio: updatedProfile.signature || userProfile.bio,
          location: updatedProfile.location || userProfile.location,
          occupation: updatedProfile.profession || userProfile.occupation,
          gender: updatedProfile.sex === '0' ? '男' : updatedProfile.sex === '1' ? '女' : '保密',
          birthday: updatedProfile.birthday || userProfile.birthday,
          avatar: updatedProfile.avatar || userProfile.avatar,
          email: updatedProfile.email || userProfile.email,
          phone: updatedProfile.phonenumber || userProfile.phone
        });

        // 成功后关闭弹窗
        setShowUsernameModal(false);
        showToast('用户名已更新', 'success');
      }
    } catch (error) {
      // 只记录错误类型，不显示详细信息
      console.error('❌ 更新用户名失败');

      // 失败时也关闭弹窗（Toast 会显示错误提示）
      setShowUsernameModal(false);

      // 显示友好的错误提示
      showToast(error.message || '更新失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  const handleChangeAvatar = () => {
    setShowAvatarSheet(true);
  };

  /**
   * 打开绑定手机号弹窗
   */
  const handleBindPhone = () => {
    setBindType('phone');
    setShowBindModal(true);
  };

  /**
   * 打开绑定邮箱弹窗
   */
  const handleBindEmail = () => {
    setBindType('email');
    setShowBindModal(true);
  };

  /**
   * 绑定成功回调
   */
  const handleBindSuccess = async newValue => {
    console.log(`绑定成功: ${bindType} = ${newValue}`);

    // 刷新用户信息
    try {
      await UserCacheService.forceRefresh();
      showToast(`${bindType === 'phone' ? '手机号' : '邮箱'}已成功绑定`, 'success');
    } catch (error) {
      // 只记录错误类型，不显示详细信息
      console.error('❌ 刷新用户信息失败');
    }
  };

  /**
   * 清除缓存
   */
  const handleClearCache = async () => {
    try {
      setIsLoading(true);
      
      // 清除用户缓存
      await UserCacheService.clearCache();
      
      // 可以在这里添加清除其他缓存的逻辑
      // 例如：图片缓存、问题列表缓存等
      
      // 清除后重新计算缓存大小
      await calculateCacheSize();
      
      showToast('缓存已清除', 'success');
    } catch (error) {
      console.error('❌ 清除缓存失败:', error);
      showToast('清除缓存失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 计算缓存大小
   */
  const calculateCacheSize = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          // 计算字符串的字节大小（UTF-8编码）
          totalSize += new Blob([value]).size;
        }
      }
      
      // 转换为合适的单位
      if (totalSize < 1024) {
        setCacheSize(`${totalSize} B`);
      } else if (totalSize < 1024 * 1024) {
        setCacheSize(`${(totalSize / 1024).toFixed(1)} KB`);
      } else {
        setCacheSize(`${(totalSize / 1024 / 1024).toFixed(1)} MB`);
      }
    } catch (error) {
      console.error('❌ 计算缓存大小失败:', error);
      setCacheSize('未知');
    }
  };

  /**
   * 处理退出登录确认
   */
  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      // 调用退出登录 API
      await authApi.logout();

      // 清除本地存储
      await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userInfo', 'userProfileCache', 'usernameLastModified']);

      // 清除用户缓存
      await UserCacheService.clearCache();

      // 跳转到登录页面
      navigation.reset({
        index: 0,
        routes: [{
          name: 'Login'
        }]
      });
    } catch (error) {
      console.error('退出登录失败:', error);
      // 即使失败也跳转到登录页面
      navigation.reset({
        index: 0,
        routes: [{
          name: 'Login'
        }]
      });
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  /**
   * 将图片 URI 转换为 Base64（纯 JavaScript 方案）
   * 使用 fetch + FileReader 实现，无需原生模块
   */
  const convertImageToBase64 = async imageUri => {
    try {
      console.log('🔄 转换图片为 Base64...');

      // 1. 使用 fetch 获取图片数据
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // 2. 检查图片大小（5MB 限制）
      const sizeInMB = blob.size / (1024 * 1024);
      console.log(`📊 图片大小: ${sizeInMB.toFixed(2)} MB`);
      if (sizeInMB > 5) {
        showAppAlert('图片过大', '请选择小于 5MB 的图片');
        return null;
      }

      // 3. 使用 FileReader 转换为 Base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // reader.result 已经包含 data:image/...;base64, 前缀
          resolve(reader.result);
        };
        reader.onerror = () => {
          reject(new Error('读取图片失败'));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('转换图片为 Base64 失败:', error);
      throw new Error('图片处理失败');
    }
  };

  /**
   * 验证图片文件
   * @param {string} imageUri - 图片 URI
   * @returns {Promise<{valid: boolean, error?: string, fileInfo?: object}>}
   */
  const validateImage = async imageUri => {
    try {
      // 1. 获取文件信息
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // 2. 检查文件大小（最大 5MB）
      const sizeInMB = blob.size / (1024 * 1024);
      console.log(`📊 图片大小: ${sizeInMB.toFixed(2)} MB`);
      if (sizeInMB > 5) {
        return {
          valid: false,
          error: '图片大小超过 5MB，请选择更小的图片'
        };
      }

      // 3. 检查文件格式
      const fileType = blob.type.toLowerCase();
      const allowedTypes = ['image/bmp', 'image/gif', 'image/jpg', 'image/jpeg', 'image/png'];
      console.log(`📄 文件类型: ${fileType}`);
      if (!allowedTypes.includes(fileType)) {
        return {
          valid: false,
          error: '不支持的图片格式，请选择 BMP、GIF、JPG、JPEG 或 PNG 格式的图片'
        };
      }

      // 4. 额外检查：从文件名判断扩展名
      const fileName = imageUri.split('/').pop().toLowerCase();
      const validExtensions = ['.bmp', '.gif', '.jpg', '.jpeg', '.png'];
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
      if (!hasValidExtension) {
        return {
          valid: false,
          error: '不支持的文件扩展名，请选择 .bmp、.gif、.jpg、.jpeg 或 .png 文件'
        };
      }
      return {
        valid: true,
        fileInfo: {
          size: blob.size,
          sizeInMB: sizeInMB.toFixed(2),
          type: fileType,
          fileName: fileName
        }
      };
    } catch (error) {
      // 只记录错误类型，不显示详细信息
      console.error('❌ 验证图片失败');
      return {
        valid: false,
        error: '无法读取图片信息，请重试'
      };
    }
  };

  /**
   * 上传图片到服务器
   */
  const uploadImageToServer = async imageUri => {
    try {
      setUploadingAvatar(true);
      console.log('🔄 开始上传头像...');
      console.log('📍 图片 URI:', imageUri);

      // 验证图片
      const validation = await validateImage(imageUri);
      if (!validation.valid) {
        showToast(validation.error, 'error');
        return;
      }
      console.log('✅ 图片验证通过:');
      console.log('   文件名:', validation.fileInfo.fileName);
      console.log('   大小:', validation.fileInfo.sizeInMB, 'MB');
      console.log('   类型:', validation.fileInfo.type);

      // 直接调用上传 API（传递 imageUri）
      const response = await userApi.uploadAvatar(imageUri);
      console.log('📥 上传响应:', JSON.stringify(response, null, 2));
      if (response.code === 200 && response.data) {
        console.log('✅ 头像上传成功');

        // 服务器返回的 data 直接就是头像 URL 字符串
        let newAvatarUrl = typeof response.data === 'string' ? response.data : response.data.avatar || response.data.avatarUrl || response.data.url;
        console.log('🖼️ 新头像 URL（原始）:', newAvatarUrl);

        // 测试图片 URL 是否可以访问
        const testImageUrl = async url => {
          try {
            console.log('\n🔍 测试图片 URL 是否可访问...');
            const testResponse = await fetch(url, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`
              }
            });
            console.log('📥 图片 URL 测试结果:');
            console.log('   状态码:', testResponse.status);
            console.log('   Content-Type:', testResponse.headers.get('Content-Type'));
            console.log('   Content-Length:', testResponse.headers.get('Content-Length'));
            if (testResponse.status !== 200) {
              const errorText = await testResponse.text();
              console.log('❌ 服务器返回错误:');
              console.log(errorText.substring(0, 500));
            }
          } catch (error) {
            console.error('❌ 测试图片 URL 失败:', error.message);
          }
        };
        await testImageUrl(newAvatarUrl);

        // 添加时间戳参数强制刷新图片缓存
        if (newAvatarUrl) {
          const timestamp = new Date().getTime();
          newAvatarUrl = newAvatarUrl.includes('?') ? `${newAvatarUrl}&t=${timestamp}` : `${newAvatarUrl}?t=${timestamp}`;
        }
        console.log('🖼️ 新头像 URL（带时间戳）:', newAvatarUrl);

        // 1. 先刷新用户信息缓存（从服务器获取最新数据）
        const freshProfile = await UserCacheService.forceRefresh();

        // 2. 使用服务器返回的最新数据更新本地状态
        if (freshProfile) {
          console.log('✅ 用户信息已刷新，更新本地状态');

          // 给服务器返回的头像也添加时间戳
          let serverAvatar = freshProfile.avatar;
          if (serverAvatar) {
            const timestamp = new Date().getTime();
            serverAvatar = serverAvatar.includes('?') ? `${serverAvatar}&t=${timestamp}` : `${serverAvatar}?t=${timestamp}`;
          }
          setUserProfile({
            userId: freshProfile.userId || '',
            username: freshProfile.username || '',
            usernameLastModified: freshProfile.usernameLastModified || userProfile.usernameLastModified,
            name: freshProfile.nickName || '用户',
            bio: freshProfile.signature || '',
            location: freshProfile.location || '',
            occupation: freshProfile.profession || '',
            gender: freshProfile.sex === '0' ? '男' : freshProfile.sex === '1' ? '女' : '保密',
            birthday: freshProfile.birthday || '',
            avatar: serverAvatar || newAvatarUrl,
            // 优先使用服务器返回的头像（带时间戳）
            email: freshProfile.email || '',
            phone: freshProfile.phonenumber || ''
          });
        } else {
          // 如果刷新失败，至少更新头像
          console.log('⚠️ 刷新失败，仅更新头像');
          setUserProfile(prev => ({
            ...prev,
            avatar: newAvatarUrl
          }));
        }
        showToast('头像更新成功', 'success');
      } else {
        console.error('❌ 上传失败 - 响应码:', response.code);
        console.error('❌ 错误信息:', response.msg);
        throw new Error(response.msg || '上传失败');
      }
    } catch (error) {
      // 只记录错误类型，不显示详细信息
      console.error('❌ 上传头像失败');

      // 更详细的错误提示
      let errorMessage = '网络错误，请稍后重试';
      if (error.response) {
        // 服务器返回了错误响应
        errorMessage = `服务器错误: ${error.response.data?.msg || '请稍后重试'}`;
      } else if (error.request) {
        // 请求已发送但没有收到响应
        errorMessage = '无法连接到服务器，请检查网络';
      } else if (error.message) {
        // 其他错误
        errorMessage = error.message;
      }
      showToast(errorMessage, 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };
  return <SafeAreaView style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.settings.title')}</Text>
        <View style={{
        width: 40
      }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 账号信息 */}
        <View style={styles.accountSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleChangeAvatar} disabled={uploadingAvatar}>
            <Avatar uri={userProfile.avatar || null} name={userProfile.name} size={70} />
            <View style={styles.avatarBadge}>
              {uploadingAvatar ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={14} color="#fff" />}
            </View>
          </TouchableOpacity>
          <View style={styles.accountText}>
            <Text style={styles.accountName}>{userProfile.name}</Text>
            <Text style={styles.accountId}>{t('screens.settings.profile.userId')}: {userProfile.userId || '加载中...'}</Text>
          </View>
        </View>

        {/* 编辑资料 */}
        <View style={styles.sectionGroup}>
          <Text style={styles.groupTitle}>{t('screens.settings.profile.groupTitle')}</Text>
          <View style={styles.section}>
            <TouchableOpacity style={styles.menuItem} onPress={() => openTextModal('name', '修改昵称', userProfile.name, {
            minLength: 2,
            maxLength: 20,
            hint: '2-20个字符，可包含中英文、数字'
          })}>
              <View style={styles.menuLeft}>
                <Ionicons name="person-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.profile.nickname')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>{userProfile.name}</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => {
            console.log('📝 打开用户名编辑弹窗:');
            console.log('   当前用户名:', userProfile.username);
            console.log('   上次修改时间:', userProfile.usernameLastModified);
            setShowUsernameModal(true);
          }}>
              <View style={styles.menuLeft}>
                <Ionicons name="at-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>用户名</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>
                  {userProfile.username || '未设置'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => openTextModal('bio', '修改个人简介', userProfile.bio, {
            minLength: 0,
            maxLength: 100,
            multiline: true,
            hint: '介绍一下自己吧'
          })}>
              <View style={styles.menuLeft}>
                <Ionicons name="document-text-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.profile.bio')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={[styles.menuValue, {
                maxWidth: 180
              }]} numberOfLines={1}>{userProfile.bio}</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => setShowGenderModal(true)}>
              <View style={styles.menuLeft}>
                <Ionicons name="male-female-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.profile.gender')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>{userProfile.gender}</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => setShowDateModal(true)}>
              <View style={styles.menuLeft}>
                <Ionicons name="calendar-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.profile.birthday')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>{userProfile.birthday}</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={openRegionModal}>
              <View style={styles.menuLeft}>
                <Ionicons name="location-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.profile.location')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>{getLocationDisplay(userProfile.location)}</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => setShowOccupationModal(true)}>
              <View style={styles.menuLeft}>
                <Ionicons name="briefcase-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.profile.occupation')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>{userProfile.occupation}</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 账号与安全 */}
        <View style={styles.sectionGroup}>
          <Text style={styles.groupTitle}>{t('screens.settings.account.groupTitle')}</Text>
          <View style={styles.section}>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ChangePassword')}>
              <View style={styles.menuLeft}>
                <Ionicons name="key-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.account.changePassword')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            {/* 绑定手机功能已隐藏 */}
            {/* <TouchableOpacity style={styles.menuItem} onPress={handleBindPhone}>
              <View style={styles.menuLeft}>
                <Ionicons name="phone-portrait-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.account.bindPhone')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>
                  {userProfile.phone ? userProfile.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '未绑定'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity> */}

            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={handleBindEmail}>
              <View style={styles.menuLeft}>
                <Ionicons name="mail-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.account.bindEmail')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>
                  {userProfile.email || t('screens.settings.account.notBound')}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 消息通知 */}
        <View style={styles.sectionGroup}>
          <Text style={styles.groupTitle}>{t('screens.settings.notifications.groupTitle')}</Text>
          <View style={styles.section}>
            <View style={styles.switchItem}>
              <View style={styles.menuLeft}>
                <Ionicons name="notifications-outline" size={22} color="#6b7280" />
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>{t('screens.settings.notifications.push')}</Text>
                  <Text style={styles.switchDesc}>{t('screens.settings.notifications.pushDesc')}</Text>
                </View>
              </View>
              <Switch value={pushEnabled} onValueChange={(value) => updateNotificationSetting('pushEnabled', value)} trackColor={{
              false: '#d1d5db',
              true: '#fca5a5'
            }} thumbColor={pushEnabled ? '#ef4444' : '#f3f4f6'} />
            </View>

            <View style={styles.switchItem}>
              <View style={styles.menuLeft}>
                <Ionicons name="heart-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.notifications.like')}</Text>
              </View>
              <Switch value={likeNotify} onValueChange={(value) => updateNotificationSetting('likeNotify', value)} trackColor={{
              false: '#d1d5db',
              true: '#fca5a5'
            }} thumbColor={likeNotify ? '#ef4444' : '#f3f4f6'} />
            </View>

            <View style={styles.switchItem}>
              <View style={styles.menuLeft}>
                <Ionicons name="chatbubble-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.notifications.comment')}</Text>
              </View>
              <Switch value={commentNotify} onValueChange={(value) => updateNotificationSetting('commentNotify', value)} trackColor={{
              false: '#d1d5db',
              true: '#fca5a5'
            }} thumbColor={commentNotify ? '#ef4444' : '#f3f4f6'} />
            </View>

            <View style={styles.switchItem}>
              <View style={styles.menuLeft}>
                <Ionicons name="person-add-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.notifications.follow')}</Text>
              </View>
              <Switch value={followNotify} onValueChange={(value) => updateNotificationSetting('followNotify', value)} trackColor={{
              false: '#d1d5db',
              true: '#fca5a5'
            }} thumbColor={followNotify ? '#ef4444' : '#f3f4f6'} />
            </View>

            <View style={[styles.switchItem, styles.menuItemLast]}>
              <View style={styles.menuLeft}>
                <Ionicons name="megaphone-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.notifications.system')}</Text>
              </View>
              <Switch value={systemNotify} onValueChange={(value) => updateNotificationSetting('systemNotify', value)} trackColor={{
              false: '#d1d5db',
              true: '#fca5a5'
            }} thumbColor={systemNotify ? '#ef4444' : '#f3f4f6'} />
            </View>
          </View>
        </View>

        {/* 隐私设置 */}
        <View style={styles.sectionGroup}>
          <Text style={styles.groupTitle}>{t('screens.settings.privacy.groupTitle')}</Text>
          <View style={styles.section}>
            {/* <View style={styles.switchItem}>
              <View style={styles.menuLeft}>
                <Ionicons name="eye-outline" size={22} color="#6b7280" />
                <View style={styles.switchInfo}>
                  <Text style={styles.menuLabel}>{t('screens.settings.privacy.showOnline')}</Text>
                  <Text style={styles.switchDesc}>{t('screens.settings.privacy.showOnlineDesc')}</Text>
                </View>
              </View>
              <Switch value={showOnline} onValueChange={setShowOnline} trackColor={{
              false: '#d1d5db',
              true: '#fca5a5'
            }} thumbColor={showOnline ? '#ef4444' : '#f3f4f6'} />
            </View> */}

            <View style={styles.switchItem}>
              <View style={styles.menuLeft}>
                <Ionicons name="mail-open-outline" size={22} color="#6b7280" />
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>{t('screens.settings.privacy.allowMessage')}</Text>
                  <Text style={styles.switchDesc}>{t('screens.settings.privacy.allowMessageDesc')}</Text>
                </View>
              </View>
              <Switch value={allowMessage} onValueChange={setAllowMessage} trackColor={{
              false: '#d1d5db',
              true: '#fca5a5'
            }} thumbColor={allowMessage ? '#ef4444' : '#f3f4f6'} />
            </View>

            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => navigation.navigate('Blacklist')}>
              <View style={styles.menuLeft}>
                <Ionicons name="ban-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.privacy.blacklist')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 通用设置 */}
        <View style={styles.sectionGroup}>
          <Text style={styles.groupTitle}>{t('screens.settings.general.groupTitle')}</Text>
          <View style={styles.section}>
            {/* 服务器切换 */}
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowServerSwitcher(true)}>
                <View style={styles.menuLeft}>
                  <Ionicons name="server-outline" size={22} color="#ef4444" />
                  <Text style={[styles.menuLabel, {
                color: '#ef4444'
              }]}>切换服务器</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </TouchableOpacity>

            {/* API 调试 */}
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ApiDebug')}>
                <View style={styles.menuLeft}>
                  <Ionicons name="bug-outline" size={22} color="#3b82f6" />
                  <Text style={[styles.menuLabel, {
                color: '#3b82f6'
              }]}>API 调试</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => showAppAlert(
              t('screens.settings.alerts.clearCache.title'), 
              t('screens.settings.alerts.clearCache.message'), 
              [
                {
                  text: t('common.cancel'),
                  style: 'cancel'
                }, 
                {
                  text: t('common.confirm'),
                  onPress: handleClearCache
                }
              ]
            )}>
              <View style={styles.menuLeft}>
                <Ionicons name="trash-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.general.clearCache')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>{cacheSize}</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={handleLanguagePress}>
              <View style={styles.menuLeft}>
                <Ionicons name="language-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.general.language')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>{currentLanguageLabel}</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 钱包与超级赞 */}
        <View style={styles.sectionGroup}>
          <Text style={styles.groupTitle}>{t('screens.settings.wallet.groupTitle')}</Text>
          <View style={styles.section}>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('SuperLikePurchase')}>
              <View style={styles.menuLeft}>
                <Ionicons name="star" size={22} color="#f59e0b" />
                <Text style={styles.menuLabel}>{t('screens.settings.wallet.purchaseSuperLike')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => navigation.navigate('SuperLikeHistory')}>
              <View style={styles.menuLeft}>
                <Ionicons name="time-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.wallet.superLikeHistory')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 帮助与反馈 */}
        <View style={styles.sectionGroup}>
          <Text style={styles.groupTitle}>{t('screens.settings.help.groupTitle')}</Text>
          <View style={styles.section}>
            {/* <TouchableOpacity style={styles.menuItem} onPress={() => showAppAlert(t('screens.settings.alerts.faq.title'), t('screens.settings.alerts.faq.message'))}>
              <View style={styles.menuLeft}>
                <Ionicons name="help-circle-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.help.faq')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity> */}

            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => navigation.navigate('Feedback')}>
              <View style={styles.menuLeft}>
                <Ionicons name="create-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.help.feedback')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 关于我们 */}
        <View style={styles.sectionGroup}>
          <Text style={styles.groupTitle}>{t('screens.settings.about.groupTitle')}</Text>
          <View style={styles.section}>
            <TouchableOpacity style={styles.menuItem} onPress={() => showAppAlert(t('screens.settings.alerts.checkUpdate.title'), t('screens.settings.alerts.checkUpdate.message'))}>
              <View style={styles.menuLeft}>
                <Ionicons name="refresh-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.about.checkUpdate')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>v1.0.0</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => showAppAlert(t('screens.settings.alerts.userAgreement.title'), t('screens.settings.alerts.userAgreement.message'))}>
              <View style={styles.menuLeft}>
                <Ionicons name="document-text-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.about.userAgreement')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => showAppAlert(t('screens.settings.alerts.privacyPolicy.title'), t('screens.settings.alerts.privacyPolicy.message'))}>
              <View style={styles.menuLeft}>
                <Ionicons name="shield-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.about.privacyPolicy')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ConnectionStatus')}>
              <View style={styles.menuLeft}>
                <Ionicons name="wifi-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>连接状态</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('UpdateDebug')}>
              <View style={styles.menuLeft}>
                <Ionicons name="cloud-download-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>热更新调试</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => showAppAlert(t('screens.settings.alerts.aboutUs.title'), t('screens.settings.alerts.aboutUs.message'))}>
              <View style={styles.menuLeft}>
                <Ionicons name="information-circle-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.about.aboutUs')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 退出登录 */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setShowLogoutModal(true)}>
          <Text style={styles.logoutText}>{t('screens.settings.logout')}</Text>
        </TouchableOpacity>

        <View style={{
        height: 40
      }} />
      </ScrollView>

      {/* 编辑资料弹窗 */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <View style={styles.editModalHeader}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.editModalCancel}>{t('screens.settings.editModal.cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.editModalTitle}>{editTitle}</Text>
              <TouchableOpacity onPress={handleSaveEdit}>
                <Text style={styles.editModalSave}>{t('screens.settings.editModal.save')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.editModalContent}>
              <TextInput style={[styles.editInput, editField === 'bio' && styles.editInputMultiline]} value={editValue} onChangeText={setEditValue} placeholder={`${t('screens.settings.editModal.placeholder')}${editTitle}`} placeholderTextColor="#9ca3af" multiline={editField === 'bio'} textAlignVertical={editField === 'bio' ? 'top' : 'center'} autoFocus />
              <Text style={styles.editHint}>
                {editField === 'name' && t('screens.settings.editModal.hints.nickname')}
                {editField === 'bio' && t('screens.settings.editModal.hints.bio')}
                {editField === 'location' && t('screens.settings.editModal.hints.location')}
                {editField === 'occupation' && t('screens.settings.editModal.hints.occupation')}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* 通用文本编辑弹窗 */}
      <EditTextModal visible={showTextModal} onClose={() => setShowTextModal(false)} title={textModalConfig.title} currentValue={textModalConfig.currentValue} onSave={handleSaveText} minLength={textModalConfig.minLength} maxLength={textModalConfig.maxLength} multiline={textModalConfig.multiline} hint={textModalConfig.hint} loading={isLoading} />

      <OccupationPickerModal visible={showOccupationModal} currentValue={userProfile.occupation} onClose={() => setShowOccupationModal(false)} onConfirm={handleOccupationSelect} />

      {/* 头像操作弹窗 */}
      <AvatarActionSheet visible={showAvatarSheet} onClose={() => setShowAvatarSheet(false)} onImageSelected={uploadImageToServer} title="更换头像" />

      {/* 绑定联系方式弹窗 */}
      <BindContactModal visible={showBindModal} onClose={() => setShowBindModal(false)} type={bindType} currentValue={bindType === 'phone' ? userProfile.phone : userProfile.email} onSubmit={handleBindSuccess} />

      {/* 性别选择弹窗 */}
      <GenderPickerModal visible={showGenderModal} onClose={() => setShowGenderModal(false)} currentGender={userProfile.gender} onSelect={gender => setUserProfile({
      ...userProfile,
      gender
    })} />

      {/* 生日选择弹窗 */}
      <DatePickerModal visible={showDateModal} onClose={() => setShowDateModal(false)} currentDate={userProfile.birthday} onSelect={birthday => setUserProfile({
      ...userProfile,
      birthday
    })} />

      {/* 用户名编辑弹窗 */}
      <EditUsernameModal visible={showUsernameModal} onClose={() => setShowUsernameModal(false)} onSave={handleSaveUsername} currentUsername={userProfile.username} lastModifiedDate={userProfile.usernameLastModified} isLoading={isLoading} />

      {/* Toast 提示 */}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({
      ...toast,
      visible: false
    })} />

      {/* 退出登录确认弹窗 */}
      <LogoutConfirmModal visible={showLogoutModal} onClose={() => setShowLogoutModal(false)} onConfirm={handleConfirmLogout} username={userProfile.username || userProfile.name} isLoading={isLoggingOut} showDefaultPassword={!userProfile.passwordChanged} />

      {/* 区域选择弹窗 */}
      <Modal visible={showRegionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1} 
            onPress={() => { setShowRegionModal(false); setRegionStep(0); }}
          />
          <View style={styles.regionModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setShowRegionModal(false); setRegionStep(0); }}>
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('home.selectRegion')}</Text>
              <TouchableOpacity onPress={confirmRegionSelection}>
                <Text style={styles.confirmText}>{t('home.confirm')}</Text>
              </TouchableOpacity>
            </View>
            
            {/* 面包屑导航 */}
            <View style={styles.breadcrumbContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbScrollContent}>
                <TouchableOpacity 
                  style={styles.breadcrumbItem}
                  onPress={() => setRegionStep(0)}
                >
                  <Text style={[styles.breadcrumbText, regionStep === 0 && styles.breadcrumbTextActive]}>
                    {selectedRegion.country || t('home.country')}
                  </Text>
                </TouchableOpacity>
                
                {selectedRegion.country && (
                  <>
                    <View style={styles.breadcrumbSeparatorWrapper}>
                      <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                    </View>
                    <TouchableOpacity 
                      style={styles.breadcrumbItem}
                      onPress={() => setRegionStep(1)}
                    >
                      <Text style={[styles.breadcrumbText, regionStep === 1 && styles.breadcrumbTextActive]}>
                        {selectedRegion.city}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {selectedRegion.city && selectedRegion.state && (
                  <>
                    <View style={styles.breadcrumbSeparatorWrapper}>
                      <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                    </View>
                    <TouchableOpacity 
                      style={styles.breadcrumbItem}
                      onPress={() => setRegionStep(2)}
                    >
                      <Text style={[styles.breadcrumbText, regionStep === 2 && styles.breadcrumbTextActive]}>
                        {selectedRegion.state}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {selectedRegion.state && selectedRegion.district && (
                  <>
                    <View style={styles.breadcrumbSeparatorWrapper}>
                      <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                    </View>
                    <TouchableOpacity 
                      style={styles.breadcrumbItem}
                      onPress={() => setRegionStep(3)}
                    >
                      <Text style={[styles.breadcrumbText, regionStep === 3 && styles.breadcrumbTextActive]}>
                        {selectedRegion.district}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
            
            <ScrollView style={styles.regionList}>
              {getRegionOptions().map((option, idx) => (
                <TouchableOpacity key={idx} style={styles.regionOption} onPress={() => selectRegion(option)}>
                  <Text style={styles.regionOptionText}>{option}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  backBtn: {
    padding: 4
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937'
  },
  content: {
    flex: 1
  },
  // 账号信息区域
  accountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  accountText: {
    flex: 1
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4
  },
  accountId: {
    fontSize: 13,
    color: '#9ca3af'
  },
  // 分组标题
  sectionGroup: {
    marginBottom: 12
  },
  groupTitle: {
    fontSize: 13,
    color: '#9ca3af',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    fontWeight: '500'
  },
  // 设置区块
  section: {
    backgroundColor: '#fff'
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  menuItemLast: {
    borderBottomWidth: 0
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  menuLabel: {
    fontSize: 15,
    color: '#1f2937',
    marginLeft: 12
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  menuValue: {
    fontSize: 14,
    color: '#9ca3af',
    marginRight: 8
  },
  // 开关项
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  switchInfo: {
    marginLeft: 12,
    flex: 1
  },
  switchLabel: {
    fontSize: 15,
    color: '#1f2937'
  },
  switchDesc: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2
  },
  // 社交图标
  socialIcons: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  // 在线状态
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginRight: 4
  },
  onlineText: {
    fontSize: 12,
    color: '#22c55e',
    marginRight: 8
  },
  // 退出登录按钮
  logoutBtn: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  logoutText: {
    fontSize: 15,
    color: '#ef4444',
    fontWeight: '500'
  },
  // 编辑弹窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'flex-end'
  },
  editModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    paddingBottom: 40
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  editModalCancel: {
    fontSize: 15,
    color: modalTokens.textSecondary
  },
  editModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: modalTokens.textPrimary
  },
  editModalSave: {
    fontSize: 15,
    color: modalTokens.danger,
    fontWeight: '700'
  },
  editModalContent: {
    padding: 16
  },
  editInput: {
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: modalTokens.textPrimary
  },
  editInputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  editHint: {
    fontSize: 12,
    color: modalTokens.textMuted,
    marginTop: 8
  },
  // 区域选择弹窗样式（从 HomeScreen 复制）
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalBackdrop: {
    flex: 1
  },
  regionModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    height: '80%',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: 30
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937'
  },
  confirmText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600'
  },
  breadcrumbContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  breadcrumbScrollContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  breadcrumbItem: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  breadcrumbText: {
    fontSize: 14,
    color: '#9ca3af'
  },
  breadcrumbTextActive: {
    color: '#ef4444',
    fontWeight: '600'
  },
  breadcrumbSeparatorWrapper: {
    paddingHorizontal: 4
  },
  regionList: {
    flex: 1,
    minHeight: 200
  },
  regionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  regionOptionText: {
    fontSize: 15,
    color: '#1f2937'
  }
});
