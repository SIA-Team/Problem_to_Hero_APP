import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert, TextInput, Modal, ActivityIndicator, Platform } from 'react-native';
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
import { useTranslation } from '../i18n/withTranslation';
import UserCacheService from '../services/UserCacheService';
import userApi from '../services/api/userApi';

export default function SettingsScreen({ navigation }) {
  const { t } = useTranslation();
  // Toast 状态
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
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
    hint: '',
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

  // 用户名编辑弹窗状态
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  // 用户资料数据
  const [userProfile, setUserProfile] = useState({
    userId: '',
    username: '', // 用户名（可修改，每半年一次）
    usernameLastModified: null, // 用户名上次修改时间
    name: '张三丰',
    bio: '热爱学习，乐于分享。专注Python、数据分析领域。',
    location: '北京',
    occupation: '数据分析师',
    gender: '男',
    birthday: '1990-01-01',
    avatar: null, // 头像 URL
    email: '',
    phone: '',
  });

  // 上传头像加载状态
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // 显示 Toast
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  // 加载用户信息（使用缓存策略）
  useEffect(() => {
    const loadUserProfile = async () => {
      // 读取本地保存的用户名修改时间
      const savedModifiedTime = await AsyncStorage.getItem('usernameLastModified');
      
      await UserCacheService.loadUserProfileWithCache(
        // 缓存加载完成回调（立即显示）
        (cachedProfile) => {
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
          });
        },
        // 最新数据加载完成回调（静默更新）
        (freshProfile) => {
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
          });
        }
      );
    };

    loadUserProfile();
  }, []);

  const handleEditProfile = (field, title, currentValue) => {
    setEditField(field);
    setEditTitle(title);
    setEditValue(currentValue);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    setUserProfile({ ...userProfile, [editField]: editValue });
    setShowEditModal(false);
    Alert.alert(t('screens.settings.alerts.saveSuccess.title'), t('screens.settings.alerts.saveSuccess.message'));
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
      hint: config.hint || '',
    });
    setShowTextModal(true);
  };

  // 保存通用编辑内容
  const handleSaveText = async (newValue) => {
    const field = textModalConfig.field;
    
    // 字段名映射：前端字段名 -> API字段名
    const fieldMapping = {
      name: 'nickName',
      bio: 'signature',
      occupation: 'profession',
      location: 'location',
    };

    const apiFieldName = fieldMapping[field];
    if (!apiFieldName) {
      Alert.alert('错误', '未知的字段类型');
      return;
    }

    // 构建API请求数据：只发送当前编辑的字段，其他字段设为null
    const requestData = {
      nickName: null,
      signature: null,
      profession: null,
    };
    
    // 设置当前编辑的字段值（空字符串也发送null）
    requestData[apiFieldName] = newValue.trim() || null;

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
          phone: updatedProfile.phonenumber || '',
        });
        
        showToast(`${textModalConfig.title}已更新`, 'success');
      }
    } catch (error) {
      // 只记录错误类型，不显示详细信息
      console.error('❌ 更新资料失败');
      showToast(error.message || '更新失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 保存用户名
   */
  const handleSaveUsername = async (newUsername) => {
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
          phone: updatedProfile.phonenumber || userProfile.phone,
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
  const handleBindSuccess = async (newValue) => {
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
   * 将图片 URI 转换为 Base64（纯 JavaScript 方案）
   * 使用 fetch + FileReader 实现，无需原生模块
   */
  const convertImageToBase64 = async (imageUri) => {
    try {
      console.log('🔄 转换图片为 Base64...');
      
      // 1. 使用 fetch 获取图片数据
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // 2. 检查图片大小（5MB 限制）
      const sizeInMB = blob.size / (1024 * 1024);
      console.log(`📊 图片大小: ${sizeInMB.toFixed(2)} MB`);
      
      if (sizeInMB > 5) {
        Alert.alert('图片过大', '请选择小于 5MB 的图片');
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
  const validateImage = async (imageUri) => {
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
          error: '图片大小超过 5MB，请选择更小的图片',
        };
      }
      
      // 3. 检查文件格式
      const fileType = blob.type.toLowerCase();
      const allowedTypes = ['image/bmp', 'image/gif', 'image/jpg', 'image/jpeg', 'image/png'];
      
      console.log(`📄 文件类型: ${fileType}`);
      
      if (!allowedTypes.includes(fileType)) {
        return {
          valid: false,
          error: '不支持的图片格式，请选择 BMP、GIF、JPG、JPEG 或 PNG 格式的图片',
        };
      }
      
      // 4. 额外检查：从文件名判断扩展名
      const fileName = imageUri.split('/').pop().toLowerCase();
      const validExtensions = ['.bmp', '.gif', '.jpg', '.jpeg', '.png'];
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExtension) {
        return {
          valid: false,
          error: '不支持的文件扩展名，请选择 .bmp、.gif、.jpg、.jpeg 或 .png 文件',
        };
      }
      
      return {
        valid: true,
        fileInfo: {
          size: blob.size,
          sizeInMB: sizeInMB.toFixed(2),
          type: fileType,
          fileName: fileName,
        },
      };
    } catch (error) {
      // 只记录错误类型，不显示详细信息
      console.error('❌ 验证图片失败');
      return {
        valid: false,
        error: '无法读取图片信息，请重试',
      };
    }
  };

  /**
   * 上传图片到服务器
   */
  const uploadImageToServer = async (imageUri) => {
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
        let newAvatarUrl = typeof response.data === 'string' 
          ? response.data 
          : (response.data.avatar || response.data.avatarUrl || response.data.url);
        
        console.log('🖼️ 新头像 URL（原始）:', newAvatarUrl);
        
        // 测试图片 URL 是否可以访问
        const testImageUrl = async (url) => {
          try {
            console.log('\n🔍 测试图片 URL 是否可访问...');
            const testResponse = await fetch(url, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`,
              },
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
          newAvatarUrl = newAvatarUrl.includes('?') 
            ? `${newAvatarUrl}&t=${timestamp}` 
            : `${newAvatarUrl}?t=${timestamp}`;
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
            serverAvatar = serverAvatar.includes('?') 
              ? `${serverAvatar}&t=${timestamp}` 
              : `${serverAvatar}?t=${timestamp}`;
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
            avatar: serverAvatar || newAvatarUrl,  // 优先使用服务器返回的头像（带时间戳）
            email: freshProfile.email || '',
            phone: freshProfile.phonenumber || '',
          });
        } else {
          // 如果刷新失败，至少更新头像
          console.log('⚠️ 刷新失败，仅更新头像');
          setUserProfile(prev => ({
            ...prev,
            avatar: newAvatarUrl,
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

  return (
    <SafeAreaView style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.settings.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 账号信息 */}
        <View style={styles.accountSection}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={handleChangeAvatar}
            disabled={uploadingAvatar}
          >
            <Avatar 
              uri={userProfile.avatar || null} 
              name={userProfile.name} 
              size={70} 
            />
            <View style={styles.avatarBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={14} color="#fff" />
              )}
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
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => openTextModal('name', '修改昵称', userProfile.name, {
                minLength: 2,
                maxLength: 20,
                hint: '2-20个字符，可包含中英文、数字',
              })}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="person-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.profile.nickname')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>{userProfile.name}</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                console.log('📝 打开用户名编辑弹窗:');
                console.log('   当前用户名:', userProfile.username);
                console.log('   上次修改时间:', userProfile.usernameLastModified);
                setShowUsernameModal(true);
              }}
            >
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

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => openTextModal('bio', '修改个人简介', userProfile.bio, {
                minLength: 0,
                maxLength: 100,
                multiline: true,
                hint: '介绍一下自己吧',
              })}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="document-text-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.profile.bio')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={[styles.menuValue, { maxWidth: 180 }]} numberOfLines={1}>{userProfile.bio}</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => setShowGenderModal(true)}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="male-female-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.profile.gender')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>{userProfile.gender}</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => setShowDateModal(true)}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="calendar-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.profile.birthday')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>{userProfile.birthday}</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => openTextModal('location', '修改所在地', userProfile.location, {
                minLength: 0,
                maxLength: 30,
                hint: '填写您的所在城市',
              })}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="location-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.profile.location')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>{userProfile.location}</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => openTextModal('occupation', '修改职业', userProfile.occupation, {
                minLength: 0,
                maxLength: 30,
                hint: '填写您的职业或专业领域',
              })}
            >
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
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="key-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.account.changePassword')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleBindPhone}
            >
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
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={handleBindEmail}
            >
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
                  <Text style={styles.menuLabel}>{t('screens.settings.notifications.push')}</Text>
                  <Text style={styles.switchDesc}>{t('screens.settings.notifications.pushDesc')}</Text>
                </View>
              </View>
              <Switch 
                value={pushEnabled} 
                onValueChange={setPushEnabled}
                trackColor={{ false: '#d1d5db', true: '#fca5a5' }}
                thumbColor={pushEnabled ? '#ef4444' : '#f3f4f6'}
              />
            </View>

            <View style={styles.switchItem}>
              <View style={styles.menuLeft}>
                <Ionicons name="heart-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.notifications.like')}</Text>
              </View>
              <Switch 
                value={likeNotify} 
                onValueChange={setLikeNotify}
                trackColor={{ false: '#d1d5db', true: '#fca5a5' }}
                thumbColor={likeNotify ? '#ef4444' : '#f3f4f6'}
              />
            </View>

            <View style={styles.switchItem}>
              <View style={styles.menuLeft}>
                <Ionicons name="chatbubble-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.notifications.comment')}</Text>
              </View>
              <Switch 
                value={commentNotify} 
                onValueChange={setCommentNotify}
                trackColor={{ false: '#d1d5db', true: '#fca5a5' }}
                thumbColor={commentNotify ? '#ef4444' : '#f3f4f6'}
              />
            </View>

            <View style={styles.switchItem}>
              <View style={styles.menuLeft}>
                <Ionicons name="person-add-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.notifications.follow')}</Text>
              </View>
              <Switch 
                value={followNotify} 
                onValueChange={setFollowNotify}
                trackColor={{ false: '#d1d5db', true: '#fca5a5' }}
                thumbColor={followNotify ? '#ef4444' : '#f3f4f6'}
              />
            </View>

            <View style={[styles.switchItem, styles.menuItemLast]}>
              <View style={styles.menuLeft}>
                <Ionicons name="megaphone-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.notifications.system')}</Text>
              </View>
              <Switch 
                value={systemNotify} 
                onValueChange={setSystemNotify}
                trackColor={{ false: '#d1d5db', true: '#fca5a5' }}
                thumbColor={systemNotify ? '#ef4444' : '#f3f4f6'}
              />
            </View>
          </View>
        </View>

        {/* 隐私设置 */}
        <View style={styles.sectionGroup}>
          <Text style={styles.groupTitle}>{t('screens.settings.privacy.groupTitle')}</Text>
          <View style={styles.section}>
            <View style={styles.switchItem}>
              <View style={styles.menuLeft}>
                <Ionicons name="eye-outline" size={22} color="#6b7280" />
                <View style={styles.switchInfo}>
                  <Text style={styles.menuLabel}>{t('screens.settings.privacy.showOnline')}</Text>
                  <Text style={styles.switchDesc}>{t('screens.settings.privacy.showOnlineDesc')}</Text>
                </View>
              </View>
              <Switch 
                value={showOnline} 
                onValueChange={setShowOnline}
                trackColor={{ false: '#d1d5db', true: '#fca5a5' }}
                thumbColor={showOnline ? '#ef4444' : '#f3f4f6'}
              />
            </View>

            <View style={styles.switchItem}>
              <View style={styles.menuLeft}>
                <Ionicons name="mail-open-outline" size={22} color="#6b7280" />
                <View style={styles.switchInfo}>
                  <Text style={styles.menuLabel}>{t('screens.settings.privacy.allowMessage')}</Text>
                  <Text style={styles.switchDesc}>{t('screens.settings.privacy.allowMessageDesc')}</Text>
                </View>
              </View>
              <Switch 
                value={allowMessage} 
                onValueChange={setAllowMessage}
                trackColor={{ false: '#d1d5db', true: '#fca5a5' }}
                thumbColor={allowMessage ? '#ef4444' : '#f3f4f6'}
              />
            </View>

            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => Alert.alert(t('screens.settings.alerts.blacklist.title'), t('screens.settings.alerts.blacklist.message'))}
            >
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
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert(t('screens.settings.alerts.clearCache.title'), t('screens.settings.alerts.clearCache.message'), [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.confirm'), onPress: () => Alert.alert(t('common.ok'), t('screens.settings.alerts.clearCache.success')) }
              ])}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="trash-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.general.clearCache')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>128.5 MB</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => Alert.alert(t('screens.settings.alerts.language.title'), t('screens.settings.alerts.language.message'))}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="language-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.general.language')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>{t('screens.settings.general.languageChinese')}</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 钱包与超级赞 */}
        <View style={styles.sectionGroup}>
          <Text style={styles.groupTitle}>{t('screens.settings.wallet.groupTitle')}</Text>
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('SuperLikePurchase')}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="star" size={22} color="#f59e0b" />
                <Text style={styles.menuLabel}>{t('screens.settings.wallet.purchaseSuperLike')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => navigation.navigate('SuperLikeHistory')}
            >
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
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert(t('screens.settings.alerts.faq.title'), t('screens.settings.alerts.faq.message'))}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="help-circle-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.help.faq')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert(t('screens.settings.alerts.customerService.title'), t('screens.settings.alerts.customerService.message'))}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="chatbubbles-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.help.customerService')}</Text>
              </View>
              <View style={styles.menuRight}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>{t('screens.settings.help.online')}</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => Alert.alert(t('screens.settings.alerts.feedback.title'), t('screens.settings.alerts.feedback.message'))}
            >
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
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert(t('screens.settings.alerts.checkUpdate.title'), t('screens.settings.alerts.checkUpdate.message'))}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="refresh-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.about.checkUpdate')}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>v1.0.0</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert(t('screens.settings.alerts.userAgreement.title'), t('screens.settings.alerts.userAgreement.message'))}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="document-text-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.about.userAgreement')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert(t('screens.settings.alerts.privacyPolicy.title'), t('screens.settings.alerts.privacyPolicy.message'))}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="shield-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.about.privacyPolicy')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('ConnectionStatus')}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="wifi-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>连接状态</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('DeviceInfo')}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="phone-portrait-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>设备信息</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => Alert.alert(t('screens.settings.alerts.aboutUs.title'), t('screens.settings.alerts.aboutUs.message'))}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="information-circle-outline" size={22} color="#6b7280" />
                <Text style={styles.menuLabel}>{t('screens.settings.about.aboutUs')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 退出登录 */}
        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={() => Alert.alert(
            t('screens.settings.alerts.logout.title'),
            t('screens.settings.alerts.logout.message'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('screens.settings.alerts.logout.button'), style: 'destructive', onPress: () => navigation.navigate('Login') }
            ]
          )}
        >
          <Text style={styles.logoutText}>{t('screens.settings.logout')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
              <TextInput
                style={[styles.editInput, editField === 'bio' && styles.editInputMultiline]}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={`${t('screens.settings.editModal.placeholder')}${editTitle}`}
                placeholderTextColor="#9ca3af"
                multiline={editField === 'bio'}
                textAlignVertical={editField === 'bio' ? 'top' : 'center'}
                autoFocus
              />
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
      <EditTextModal
        visible={showTextModal}
        onClose={() => setShowTextModal(false)}
        title={textModalConfig.title}
        currentValue={textModalConfig.currentValue}
        onSave={handleSaveText}
        minLength={textModalConfig.minLength}
        maxLength={textModalConfig.maxLength}
        multiline={textModalConfig.multiline}
        hint={textModalConfig.hint}
        loading={isLoading}
      />

      {/* 头像操作弹窗 */}
      <AvatarActionSheet
        visible={showAvatarSheet}
        onClose={() => setShowAvatarSheet(false)}
        onImageSelected={uploadImageToServer}
        title="更换头像"
      />

      {/* 绑定联系方式弹窗 */}
      <BindContactModal
        visible={showBindModal}
        onClose={() => setShowBindModal(false)}
        type={bindType}
        currentValue={bindType === 'phone' ? userProfile.phone : userProfile.email}
        onSubmit={handleBindSuccess}
      />

      {/* 性别选择弹窗 */}
      <GenderPickerModal
        visible={showGenderModal}
        onClose={() => setShowGenderModal(false)}
        currentGender={userProfile.gender}
        onSelect={(gender) => setUserProfile({ ...userProfile, gender })}
      />

      {/* 生日选择弹窗 */}
      <DatePickerModal
        visible={showDateModal}
        onClose={() => setShowDateModal(false)}
        currentDate={userProfile.birthday}
        onSelect={(birthday) => setUserProfile({ ...userProfile, birthday })}
      />

      {/* 用户名编辑弹窗 */}
      <EditUsernameModal
        visible={showUsernameModal}
        onClose={() => setShowUsernameModal(false)}
        onSave={handleSaveUsername}
        currentUsername={userProfile.username}
        lastModifiedDate={userProfile.usernameLastModified}
        isLoading={isLoading}
      />

      {/* Toast 提示 */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
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
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937' },
  content: { flex: 1 },
  
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
  accountText: { flex: 1 },
  accountName: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  accountId: { fontSize: 13, color: '#9ca3af' },
  
  // 分组标题
  sectionGroup: { marginBottom: 12 },
  groupTitle: { 
    fontSize: 13, 
    color: '#9ca3af', 
    paddingHorizontal: 16, 
    paddingTop: 8,
    paddingBottom: 8,
    fontWeight: '500'
  },
  
  // 设置区块
  section: { backgroundColor: '#fff' },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuLabel: { fontSize: 15, color: '#1f2937', marginLeft: 12 },
  menuRight: { flexDirection: 'row', alignItems: 'center' },
  menuValue: { fontSize: 14, color: '#9ca3af', marginRight: 8 },
  
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
  switchInfo: { marginLeft: 12, flex: 1 },
  switchDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  
  // 社交图标
  socialIcons: { flexDirection: 'row', alignItems: 'center' },
  
  // 在线状态
  onlineDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    backgroundColor: '#22c55e',
    marginRight: 4
  },
  onlineText: { fontSize: 12, color: '#22c55e', marginRight: 8 },
  
  // 退出登录按钮
  logoutBtn: { 
    backgroundColor: '#fff', 
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  logoutText: { fontSize: 15, color: '#ef4444', fontWeight: '500' },

  // 编辑弹窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  editModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  editModalCancel: {
    fontSize: 15,
    color: '#6b7280'
  },
  editModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937'
  },
  editModalSave: {
    fontSize: 15,
    color: '#ef4444',
    fontWeight: '600'
  },
  editModalContent: {
    padding: 16
  },
  editInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937'
  },
  editInputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  editHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8
  }
});
