import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Alert, Share, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Avatar from '../components/Avatar';
import SuperLikeBalance from '../components/SuperLikeBalance';
import LogoutConfirmModal from '../components/LogoutConfirmModal';
import { modalTokens } from '../components/modalTokens';
import { useTranslation } from '../i18n/withTranslation';
import UserCacheService from '../services/UserCacheService';
import authApi from '../services/api/authApi';
import questionApi from '../services/api/questionApi';
import { showAppAlert } from '../utils/appAlert';
import ServerSwitcher from '../components/ServerSwitcher';

export default function ProfileScreen({ navigation, onLogout }) {
  const { t } = useTranslation();
  
  // 用户信息状态
  const [userProfile, setUserProfile] = useState({
    nickname: '',
    userId: '',
    username: '',
    avatar: null,
    bio: '',
    location: '',
    occupation: '',
    passwordChanged: false, // 是否修改过密码（默认 false，表示未修改，会显示默认密码）
  });
  
  // 加载用户信息
  const loadUserProfile = React.useCallback(async () => {
    // 读取密码修改标记
    const passwordChangedFlag = await AsyncStorage.getItem('passwordChanged');
    const hasChangedPassword = passwordChangedFlag === 'true';
    
    await UserCacheService.loadUserProfileWithCache(
      // 缓存加载完成回调（立即显示）
      (cachedProfile) => {
        console.log('ProfileScreen: 从缓存加载用户信息', cachedProfile);
        setUserProfile(prev => ({
          ...prev,
          nickname: cachedProfile.nickName || '',
          userId: cachedProfile.userId || '',
          username: cachedProfile.username || '',
          avatar: cachedProfile.avatar || null,
          bio: cachedProfile.signature || '',
          location: cachedProfile.location || '',
          occupation: cachedProfile.profession || '',
          passwordChanged: cachedProfile.passwordChanged === true || hasChangedPassword,
        }));
      },
      // 最新数据加载完成回调（静默更新）
      (freshProfile) => {
        console.log('ProfileScreen: 从服务器更新用户信息', freshProfile);
        setUserProfile(prev => ({
          ...prev,
          nickname: freshProfile.nickName || '',
          userId: freshProfile.userId || '',
          username: freshProfile.username || '',
          avatar: freshProfile.avatar || null,
          bio: freshProfile.signature || '',
          location: freshProfile.location || '',
          occupation: freshProfile.profession || '',
          passwordChanged: freshProfile.passwordChanged === true || hasChangedPassword,
        }));
      }
    );
  }, []);

  // 首次加载
  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // 每次页面获得焦点时重新加载（从设置页面返回时会触发）
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 ProfileScreen 获得焦点，重新加载用户信息');
      loadUserProfile();
    }, [loadUserProfile])
  );
  
  const stats = React.useMemo(() => [
    { label: t('profile.likes'), value: '3.5k', screen: 'Likes' },
    { label: t('profile.followers'), value: '1.2k', screen: 'Fans' },
    { label: t('profile.following'), value: '128', screen: 'Follow' },
    { label: t('profile.friends'), value: '56', screen: 'Friends' },
  ], [t]);

  const menuItems = React.useMemo(() => [
    { icon: 'document-text', label: t('profile.myDrafts'), value: '12', color: '#22c55e' },
    { icon: 'people', label: t('profile.myGroups'), value: '8', color: '#a855f7' },
    { icon: 'people-circle', label: t('profile.myTeams'), value: '3', color: '#f59e0b' },
    { icon: 'calendar', label: t('profile.myActivities'), value: '15', color: '#ef4444' },
    { icon: 'eye', label: t('profile.viewPublicProfile'), value: '', color: '#8b5cf6' },
    { icon: 'shield-checkmark', label: t('profile.verification'), value: '', color: '#3b82f6' },
  ], [t]);

  const myQuestions = React.useMemo(() => [
    { id: 1, title: '如何在三个月内从零基础学会Python编程？', type: 'reward', reward: 50, views: '1.2k', comments: 56, likes: 128, time: t('profile.time.hoursAgo').replace('{hours}', '2') },
    { id: 2, title: '第一次养猫需要准备什么？', type: 'free', solved: true, views: '2.5k', comments: 89, likes: 256, time: t('profile.time.yesterday') },
    { id: 3, title: '35岁程序员如何规划职业发展？', type: 'reward', reward: 100, views: '5.6k', comments: 456, likes: 1200, time: t('profile.time.daysAgo').replace('{days}', '3') },
  ], [t]);

  const myAnswers = React.useMemo(() => [
    { id: 1, questionTitle: '如何高效学习一门新技能？', content: '作为一个自学了多门技能的人，我来分享一下我的经验...', likes: 256, comments: 23, adopted: true, time: t('profile.time.hoursAgo').replace('{hours}', '1') },
    { id: 2, questionTitle: 'Python数据分析入门需要学什么？', content: '首先需要掌握Python基础语法，然后学习NumPy和Pandas...', likes: 189, comments: 15, adopted: false, time: t('profile.time.hoursAgo').replace('{hours}', '3') },
    { id: 3, questionTitle: '35岁转行做程序员还来得及吗？', content: '完全来得及！我就是35岁转行的，现在已经工作2年了...', likes: 512, comments: 45, adopted: true, time: t('profile.time.yesterday') },
    { id: 4, questionTitle: '如何克服拖延症？', content: '拖延症的根本原因是对任务的恐惧，可以尝试番茄工作法...', likes: 98, comments: 8, adopted: false, time: t('profile.time.daysAgo').replace('{days}', '2') },
  ], [t]);

  const contentTabs = React.useMemo(() => [
    t('profile.contentTabs.questions'),
    t('profile.contentTabs.answers'),
    t('profile.contentTabs.favorites'),
    t('profile.contentTabs.history')
  ], [t]);

  // 收藏数据
  const favoritesData = React.useMemo(() => ({
    questions: [
      { id: 1, title: '如何高效学习一门新技能？', author: '学习达人', time: t('profile.savedAt') + '2' + t('profile.time.daysAgo').replace('{days}', '') },
      { id: 2, title: 'Python数据分析入门指南', author: '数据分析师', time: t('profile.savedAt') + '3' + t('profile.time.daysAgo').replace('{days}', '') },
    ],
    answers: [
      { id: 1, title: '关于职场新人如何快速成长的回答', author: '职场导师', time: t('profile.savedAt') + '1周前' },
      { id: 2, title: '关于如何克服拖延症的回答', author: '心理咨询师', time: t('profile.savedAt') + '2周前' },
    ],
    comments: [
      { id: 1, title: '"这个方法真的很有用！"', author: '小明', time: t('profile.savedAt') + '3' + t('profile.time.daysAgo').replace('{days}', '') },
      { id: 2, title: '"感谢分享，学到了很多"', author: '小红', time: t('profile.savedAt') + '5' + t('profile.time.daysAgo').replace('{days}', '') },
    ],
  }), [t]);

  // 浏览历史数据
  const historyList = React.useMemo(() => [
    { id: 1, title: 'AI大模型会取代程序员吗？', author: 'AI研究员', time: t('profile.time.hoursAgo').replace('{hours}', '1') },
    { id: 2, title: '2026年最值得学习的编程语言', author: '技术博主', time: t('profile.time.hoursAgo').replace('{hours}', '3') },
    { id: 3, title: '如何克服社交恐惧症？', author: '心理咨询师', time: t('profile.time.yesterday') },
  ], [t]);

  // 获取草稿列表
  const loadDraftsList = async (isLoadMore = false) => {
    if (draftsLoading) return;
    
    try {
      setDraftsLoading(true);
      
      const pageNum = isLoadMore ? draftsPageNum + 1 : 1;
      const response = await questionApi.getDraftsList({
        pageNum,
        pageSize: 10,
      });
      
      if (response.code === 200 || response.code === 0) {
        const { rows = [], total = 0 } = response.data || {};
        
        if (isLoadMore) {
          setDraftsList(prev => [...prev, ...rows]);
          setDraftsPageNum(pageNum);
        } else {
          setDraftsList(rows);
          setDraftsPageNum(1);
        }
        
        // 检查是否还有更多数据
        const currentTotal = isLoadMore ? draftsList.length + rows.length : rows.length;
        setDraftsHasMore(currentTotal < total);
      }
    } catch (error) {
      console.error('获取草稿列表失败:', error);
    } finally {
      setDraftsLoading(false);
    }
  };



  const [activeTab, setActiveTab] = useState('');
  
  // 退出登录确认弹窗状态
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Initialize activeTab with translated value
  React.useEffect(() => {
    if (!activeTab) {
      setActiveTab(t('profile.contentTabs.questions'));
    }
  }, [t, activeTab]);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  
  // 草稿数据状态
  const [draftsList, setDraftsList] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsPageNum, setDraftsPageNum] = useState(1);
  const [draftsHasMore, setDraftsHasMore] = useState(true);
  
  const [favoritesTab, setFavoritesTab] = useState('questions');
  
  // 认证状态: 'none' | 'personal' | 'enterprise' | 'government'
  const [verificationType, setVerificationType] = useState('none'); // 示例：未认证（显示"去认证"按钮）
  
  // 认证弹窗状态
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationStep, setVerificationStep] = useState(0); // 0: 选择类型, 1: 填写信息, 2: 确认信息
  const [selectedVerificationType, setSelectedVerificationType] = useState(''); // 'personal' | 'enterprise' | 'government'
  const [verificationData, setVerificationData] = useState({
    personal: {
      name: '',
      idType: 'idCard',
      idNumber: '',
      idFront: null,
      idBack: null,
      idHold: null,
      qualifications: [], // 专业资质证书列表
    },
    enterprise: {
      name: '',
      creditCode: '',
      registrationNumber: '',
      taxNumber: '',
      address: '',
      license: null,
      legalName: '',
      legalIdNumber: '',
      contactPerson: '', // 企业联系人（必填）
      contactPhone: '', // 联系电话
      contactEmail: '', // 联系邮箱
    },
    government: {
      name: '',
      creditCode: '',
      type: '',
      department: '',
      address: '',
      certificate: null,
      authorization: null,
      authorizerName: '',
      authorizerPosition: '',
      authorizerIdNumber: '',
      authorizerIdFront: null, // 授权人身份证正面
      authorizerIdBack: null,  // 授权人身份证反面
      contactPhone: '', // 联系电话
      contactEmail: '', // 联系邮箱
    },
  });

  // 获取认证图标和文字信息
  const getVerificationInfo = () => {
    switch (verificationType) {
      case 'personal':
        return { color: '#f59e0b', icon: 'checkmark', text: t('profile.personalVerification'), verified: true }; // 黄色V标 - 个人认证
      case 'enterprise':
        return { color: '#3b82f6', icon: 'checkmark', text: t('profile.enterpriseVerification'), verified: true }; // 蓝色V标 - 企业认证
      case 'government':
        return { color: '#ef4444', icon: 'checkmark', text: t('profile.governmentVerification'), verified: true }; // 红色V标 - 政府认证
      case 'none':
      default:
        return { color: '#9ca3af', icon: 'close', text: t('profile.notVerified'), verified: false }; // 未认证 - 灰色X标
    }
  };

  const verificationInfo = getVerificationInfo();

  // 处理认证标识点击
  const handleVerificationPress = () => {
    if (!verificationInfo.verified) {
      // 未认证，打开认证弹窗
      setShowVerificationModal(true);
      setVerificationStep(0);
    } else {
      // 已认证，显示认证详情
      showAppAlert(t('profile.verificationInfo'), `${t('profile.verified')}${verificationInfo.text}\n${t('profile.verificationTime')}2025-12-15\n${t('profile.verificationOrg')}`);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: t('profile.shareProfile') + t('profile.shareUrl'), title: t('profile.share') });
    } catch (error) {
      showAppAlert(t('profile.shareFailed'), error.message);
    }
  };

  const handleStatPress = (stat) => {
    switch (stat.label) {
      case t('profile.followers'):
        navigation.navigate('Fans');
        break;
      case t('profile.following'):
        navigation.navigate('Follow');
        break;
      case t('profile.likes'):
        showAppAlert(t('profile.likesStats').replace('{count}', '3.5k'));
        break;
      case t('profile.friends'):
        showAppAlert(t('profile.myFriends'), t('profile.youHaveFriends').replace('{count}', '56'));
        break;
      default:
        break;
    }
  };

  const handleMenuPress = (item) => {
    switch (item.label) {
      case t('profile.browsingHistory'):
        setShowHistoryModal(true);
        break;
      case t('profile.myDrafts'):
        setShowDraftsModal(true);
        loadDraftsList(); // 加载草稿数据
        break;
      case t('profile.myGroups'):
        navigation.navigate('MyGroups');
        break;
      case t('profile.myTeams'):
        navigation.navigate('MyTeams');
        break;
      case t('profile.myActivities'):
        // 使用jumpTo跳转到活动Tab
        navigation.navigate('活动', { fromProfile: true });
        break;
      case t('profile.viewPublicProfile'):
        // 导航到公开主页（使用当前用户ID）
        navigation.navigate('PublicProfile', { userId: 'current-user-123' });
        break;
      case t('profile.verification'):
        // 打开认证弹窗
        setShowVerificationModal(true);
        setVerificationStep(0);
        break;
      default:
        break;
    }
  };

  const handleQuestionPress = (question) => {
    navigation.navigate('QuestionDetail', { id: question.id });
  };

  const handleWalletAction = (action) => {
    switch (action) {
      case 'recharge':
        showAppAlert(t('profile.recharge'), t('profile.selectAmount'), [
          { text: '$10', onPress: () => showAppAlert(t('profile.rechargeSuccess'), t('profile.rechargeSuccess') + ' $10') },
          { text: '$50', onPress: () => showAppAlert(t('profile.rechargeSuccess'), t('profile.rechargeSuccess') + ' $50') },
          { text: '$100', onPress: () => showAppAlert(t('profile.rechargeSuccess'), t('profile.rechargeSuccess') + ' $100') },
          { text: t('common.cancel'), style: 'cancel' }
        ]);
        break;
      case 'withdraw':
        showAppAlert(t('profile.withdraw'), t('profile.withdrawableAmount') + '：$256.50', [
          { text: t('profile.withdrawAll'), onPress: () => showAppAlert(t('profile.withdrawSuccess'), t('profile.withdrawSuccess') + '，' + t('profile.withdrawEstimate')) },
          { text: t('common.cancel'), style: 'cancel' }
        ]);
        break;
      case 'expense':
        showAppAlert(t('profile.expenseDetails'), t('profile.monthlyExpense') + '$150.00\n\n- Python学习问题：$50\n- 职业规划问题：$100');
        break;
      case 'income':
        showAppAlert(t('profile.incomeDetails'), t('profile.monthlyIncome') + '$320.00\n\n- 被采纳回答 x 8：$280\n- 优质回答奖励：$40');
        break;
      case 'pending':
        showAppAlert(t('profile.pendingAdoption'), t('profile.pendingAnswers').replace('{count}', '12'));
        break;
      default:
        break;
    }
  };

  const handleFavoritePress = (item) => {
    setShowFavoritesModal(false);
    navigation.navigate('QuestionDetail', { id: item.id });
  };

  const handleHistoryPress = (item) => {
    setShowHistoryModal(false);
    navigation.navigate('QuestionDetail', { id: item.id });
  };

  const handleDraftPress = async (item) => {
    try {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📝 点击草稿，ID:', item.id);
      console.log('═══════════════════════════════════════════════════════════');
      
      // 显示加载提示
      setShowDraftsModal(false);
      
      // 调用接口获取草稿完整数据
      const response = await questionApi.getDraftDetail(item.id);
      
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📋 草稿详情接口响应');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('完整响应:', JSON.stringify(response, null, 2));
      console.log('═══════════════════════════════════════════════════════════');
      
      if (response && response.code === 200 && response.data) {
        const draftData = response.data;
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📦 草稿数据详情');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('ID:', draftData.id);
        console.log('标题:', draftData.title);
        console.log('描述:', draftData.description);
        console.log('类型:', draftData.type);
        console.log('分类ID:', draftData.categoryId);
        console.log('分类名称:', draftData.categoryName);
        console.log('图片URLs:', draftData.imageUrls);
        console.log('图片URLs类型:', typeof draftData.imageUrls);
        console.log('图片URLs是否为数组:', Array.isArray(draftData.imageUrls));
        console.log('图片URLs长度:', draftData.imageUrls?.length);
        if (Array.isArray(draftData.imageUrls)) {
          draftData.imageUrls.forEach((url, index) => {
            console.log(`  图片${index + 1}: "${url}" (类型: ${typeof url}, 长度: ${url?.length})`);
          });
        }
        console.log('话题:', draftData.topics);
        console.log('专家:', draftData.experts);
        console.log('═══════════════════════════════════════════════════════════');
        
        // 跳转到发布页面，传递完整的草稿数据
        navigation.navigate('Publish', { draftData });
      } else {
        console.error('❌ 获取草稿失败:', response);
        showAppAlert('获取草稿失败', response?.msg || '无法加载草稿数据');
      }
    } catch (error) {
      console.error('❌ 获取草稿详情失败:', error);
      showAppAlert('获取草稿失败', '网络错误，请稍后重试');
    }
  };

  const handleDeleteDraft = (item) => {
    showAppAlert(t('profile.deleteDraft'), t('profile.deleteDraftConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => showAppAlert(t('profile.draftDeleted'), t('profile.draftDeleted')) }
    ]);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      // 调用退出登录 API
      const response = await authApi.logout();
      
      if (response.code === 200) {
        console.log('✅ 退出登录成功');
        // 调用父组件的 onLogout 回调
        if (onLogout) {
          onLogout();
        }
      } else {
        console.error('❌ 退出登录失败:', response.msg);
        showAppAlert('退出失败', response.msg || '退出登录失败，请重试');
      }
    } catch (error) {
      console.error('❌ 退出登录异常:', error);
      showAppAlert('退出失败', '网络错误，请检查连接后重试');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const getFavoritesData = () => {
    switch (favoritesTab) {
      case 'questions': return favoritesData.questions;
      case 'answers': return favoritesData.answers;
      case 'comments': return favoritesData.comments;
      default: return [];
    }
  };

  // 认证弹窗处理函数
  const handleSelectVerificationType = (type) => {
    setSelectedVerificationType(type);
    setVerificationStep(1);
  };

  const handleVerificationBack = () => {
    if (verificationStep === 0) {
      setShowVerificationModal(false);
    } else {
      setVerificationStep(verificationStep - 1);
    }
  };



  const handleVerificationSubmit = () => {
    // 验证数据
    const data = verificationData[selectedVerificationType];
    if (selectedVerificationType === 'personal') {
      if (!data.idNumber) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.idNumberRequired'));
        return;
      }
      if (!data.qualifications || data.qualifications.length === 0) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.qualificationsRequired'));
        return;
      }
      // 检查是否所有资质都填写了名称
      const unnamedQualification = data.qualifications.find(q => !q.name || q.name.trim() === '');
      if (unnamedQualification) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.qualificationNameRequired'));
        return;
      }
    } else if (selectedVerificationType === 'enterprise') {
      if (!data.name || !data.taxNumber || !data.address) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.enterpriseInfoRequired'));
        return;
      }
      if (!data.license) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.licenseRequired'));
        return;
      }
      if (!data.contactPerson || data.contactPerson.trim() === '') {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.contactPersonRequired'));
        return;
      }
      // 验证联系方式：邮箱或电话至少填写一个
      if ((!data.contactPhone || data.contactPhone.trim() === '') && 
          (!data.contactEmail || data.contactEmail.trim() === '')) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.contactMethodRequired'));
        return;
      }
      // 验证电话格式（如果填写了）
      if (data.contactPhone && data.contactPhone.trim() !== '') {
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(data.contactPhone.trim())) {
          showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.phoneFormatError'));
          return;
        }
      }
      // 验证邮箱格式（如果填写了）
      if (data.contactEmail && data.contactEmail.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.contactEmail.trim())) {
          showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.emailFormatError'));
          return;
        }
      }
    } else if (selectedVerificationType === 'government') {
      if (!data.name || !data.department || !data.authorizerName || !data.authorizerPosition) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.governmentInfoRequired'));
        return;
      }
      if (!data.authorizerIdFront || !data.authorizerIdBack) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.authorizerIdRequired'));
        return;
      }
      // 验证联系方式：邮箱或电话至少填写一个
      if ((!data.contactPhone || data.contactPhone.trim() === '') && 
          (!data.contactEmail || data.contactEmail.trim() === '')) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.contactMethodRequired'));
        return;
      }
      // 验证电话格式（如果填写了）
      if (data.contactPhone && data.contactPhone.trim() !== '') {
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(data.contactPhone.trim())) {
          showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.phoneFormatError'));
          return;
        }
      }
      // 验证邮箱格式（如果填写了）
      if (data.contactEmail && data.contactEmail.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.contactEmail.trim())) {
          showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.emailFormatError'));
          return;
        }
      }
    }
    
    // 提交认证申请
    showAppAlert(
      t('profile.verificationModal.submitSuccess'),
      t('profile.verificationModal.submitSuccessMessage'),
      [
        {
          text: t('common.ok'),
          onPress: () => {
            setShowVerificationModal(false);
            setVerificationStep(0);
            setSelectedVerificationType('');
          }
        }
      ]
    );
  };

  const handleImageUpload = (field) => {
    // 模拟图片上传
    showAppAlert(t('profile.verificationModal.selectImage'), t('profile.verificationModal.selectImageSource'), [
      { text: t('profile.verificationModal.album'), onPress: () => {
        const mockImageUrl = `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000)}?w=800&h=600&fit=crop`;
        setVerificationData({
          ...verificationData,
          [selectedVerificationType]: {
            ...verificationData[selectedVerificationType],
            [field]: mockImageUrl
          }
        });
      }},
      { text: t('profile.verificationModal.camera'), onPress: () => {
        const mockImageUrl = `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000)}?w=800&h=600&fit=crop`;
        setVerificationData({
          ...verificationData,
          [selectedVerificationType]: {
            ...verificationData[selectedVerificationType],
            [field]: mockImageUrl
          }
        });
      }},
      { text: t('common.cancel'), style: 'cancel' }
    ]);
  };

  // 添加资质证书
  const addQualification = async () => {
    showAppAlert(t('profile.verificationModal.selectImage'), t('profile.verificationModal.selectImageSource'), [
      { 
        text: t('profile.verificationModal.album'), 
        onPress: async () => {
          try {
            // 请求相册权限
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              showAppAlert(t('common.confirm'), '需要相册访问权限才能上传图片');
              return;
            }

            // 打开相册
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [3, 2],
              quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
              const newQualification = {
                id: Date.now(),
                name: '',
                image: result.assets[0].uri
              };
              setVerificationData({
                ...verificationData,
                personal: {
                  ...verificationData.personal,
                  qualifications: [...verificationData.personal.qualifications, newQualification]
                }
              });
            }
          } catch (error) {
            showAppAlert(t('common.confirm'), '上传图片失败：' + error.message);
          }
        }
      },
      { 
        text: t('profile.verificationModal.camera'), 
        onPress: async () => {
          try {
            // 请求相机权限
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              showAppAlert(t('common.confirm'), '需要相机访问权限才能拍照');
              return;
            }

            // 打开相机
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [3, 2],
              quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
              const newQualification = {
                id: Date.now(),
                name: '',
                image: result.assets[0].uri
              };
              setVerificationData({
                ...verificationData,
                personal: {
                  ...verificationData.personal,
                  qualifications: [...verificationData.personal.qualifications, newQualification]
                }
              });
            }
          } catch (error) {
            showAppAlert(t('common.confirm'), '拍照失败：' + error.message);
          }
        }
      },
      { text: t('common.cancel'), style: 'cancel' }
    ]);
  };

  // 删除资质证书
  const removeQualification = (id) => {
    showAppAlert(t('profile.verificationModal.deleteQualification'), t('profile.verificationModal.deleteQualificationConfirm'), [
      {
        text: t('common.cancel'),
        style: 'cancel'
      },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          setVerificationData({
            ...verificationData,
            personal: {
              ...verificationData.personal,
              qualifications: verificationData.personal.qualifications.filter(q => q.id !== id)
            }
          });
        }
      }
    ]);
  };

  // 更新资质证书名称
  const updateQualificationName = (id, name) => {
    setVerificationData({
      ...verificationData,
      personal: {
        ...verificationData.personal,
        qualifications: verificationData.personal.qualifications.map(q =>
          q.id === id ? { ...q, name } : q
        )
      }
    });
  };

  const updateVerificationField = (field, value) => {
    setVerificationData({
      ...verificationData,
      [selectedVerificationType]: {
        ...verificationData[selectedVerificationType],
        [field]: value
      }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 顶部背景 */}
        <View style={styles.headerBg}>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={handleShare}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-redo-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ marginLeft: 16 }} 
              onPress={() => navigation.navigate('Settings')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 用户信息卡片 */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar uri={userProfile.avatar} name={userProfile.nickname} size={64} />
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{userProfile.nickname}</Text>
                
                {/* 认证标识 */}
                {verificationInfo.verified ? (
                  // 已认证：显示图标 + 认证类型
                  <TouchableOpacity 
                    style={styles.verificationContainer}
                    onPress={handleVerificationPress}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.verificationIcon, { backgroundColor: verificationInfo.color }]}>
                      <Ionicons name={verificationInfo.icon} size={12} color="#fff" />
                    </View>
                    <Text style={[styles.verificationText, { color: verificationInfo.color }]}>
                      {verificationInfo.text}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  // 未认证：显示"去认证"按钮
                  <TouchableOpacity 
                    style={styles.verifyButton}
                    onPress={handleVerificationPress}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.verifyButtonText}>{t('profile.goVerify')}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.userId}>ID: {userProfile.userId}</Text>
            </View>
          </View>
          {userProfile.bio ? (
            <Text style={styles.userBio}>{userProfile.bio}</Text>
          ) : null}
          <View style={styles.userMeta}>
            {userProfile.location ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="#9ca3af" />
                <Text style={styles.metaText}>{userProfile.location}</Text>
              </View>
            ) : null}
            {userProfile.occupation ? (
              <View style={styles.metaItem}>
                <Ionicons name="briefcase-outline" size={14} color="#9ca3af" />
                <Text style={styles.metaText}>{userProfile.occupation}</Text>
              </View>
            ) : null}
          </View>
          
          {/* 影响力和智慧指数 */}
          <View style={styles.indexRow}>
            <View style={styles.indexItem}>
              <View style={styles.indexIconWrapper}>
                <Ionicons name="flame" size={18} color="#ef4444" />
              </View>
              <View style={styles.indexInfo}>
                <Text style={styles.indexLabel}>{t('profile.influence')}</Text>
                <Text style={styles.indexValue}>8,567</Text>
              </View>
            </View>
            <View style={styles.indexDivider} />
            <TouchableOpacity 
              style={styles.indexItem}
              onPress={() => navigation.navigate('WisdomIndex')}
            >
              <View style={styles.indexIconWrapper}>
                <Ionicons name="bulb" size={18} color="#f59e0b" />
              </View>
              <View style={styles.indexInfo}>
                <Text style={styles.indexLabel}>{t('profile.wisdomIndex')}</Text>
                <Text style={styles.indexValue}>92.5</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsRow}>
            {stats.map((stat, idx) => (
              <TouchableOpacity key={idx} style={styles.statItem} onPress={() => handleStatPress(stat)}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 钱包卡片 */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View style={styles.walletIcon}><Ionicons name="wallet" size={20} color="#f59e0b" /></View>
            <View style={styles.walletInfo}>
              <Text style={styles.walletLabel}>{t('profile.myWallet')}</Text>
              <Text style={styles.walletBalance}>$256.50</Text>
            </View>
            <View style={styles.walletActions}>
              <TouchableOpacity style={styles.rechargeBtn} onPress={() => handleWalletAction('recharge')}><Text style={styles.rechargeBtnText}>{t('profile.recharge')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.withdrawBtn} onPress={() => handleWalletAction('withdraw')}><Text style={styles.withdrawBtnText}>{t('profile.withdraw')}</Text></TouchableOpacity>
            </View>
          </View>
          <View style={styles.walletStats}>
            <TouchableOpacity style={styles.walletStatItem} onPress={() => handleWalletAction('income')}>
              <Text style={[styles.walletStatValue, { color: '#22c55e' }]}>$320.00</Text>
              <Text style={styles.walletStatLabel}>{t('profile.answerIncome')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.walletStatItem} onPress={() => handleWalletAction('expense')}>
              <Text style={styles.walletStatValue}>$150.00</Text>
              <Text style={styles.walletStatLabel}>{t('profile.rewardExpense')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.walletStatItem} onPress={() => handleWalletAction('pending')}>
              <Text style={styles.walletStatValue}>12</Text>
              <Text style={styles.walletStatLabel}>{t('profile.pendingAdoption')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 超级赞余额卡片 */}
        <View style={styles.superLikeCard}>
          <View style={styles.superLikeHeader}>
            <View style={styles.superLikeTitle}>
              <Ionicons name="star" size={20} color="#f59e0b" />
              <Text style={styles.superLikeTitleText}>{t('profile.superLike')}</Text>
            </View>
            <SuperLikeBalance 
              size="medium" 
              showLabel={false}
              onPress={() => navigation.navigate('SuperLikePurchase')}
            />
          </View>
          <View style={styles.superLikeActions}>
            <TouchableOpacity 
              style={styles.superLikeBtn}
              onPress={() => navigation.navigate('SuperLikePurchase')}
            >
              <Ionicons name="add-circle" size={18} color="#f59e0b" />
              <Text style={styles.superLikeBtnText}>{t('profile.purchase')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.superLikeBtn, styles.superLikeBtnSecondary]}
              onPress={() => navigation.navigate('SuperLikeHistory')}
            >
              <Ionicons name="time-outline" size={18} color="#6b7280" />
              <Text style={[styles.superLikeBtnText, styles.superLikeBtnTextSecondary]}>{t('profile.history')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 功能菜单 */}
        <View style={styles.menuSection}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.menuItem} onPress={() => handleMenuPress(item)}>
              <Ionicons name={item.icon} size={20} color={item.color} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <View style={styles.menuRight}>
                {item.value && <Text style={styles.menuValue}>{item.value}</Text>}
                <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 开发工具 - 服务器切换 */}
        {__DEV__ && <ServerSwitcher />}

        {/* 我的内容 */}
        <View style={styles.contentSection}>
          <View style={styles.contentTabs}>
            {contentTabs.map(tab => (
              <TouchableOpacity key={tab} style={styles.contentTabItem} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.contentTabText, activeTab === tab && styles.contentTabTextActive]}>{tab}</Text>
                {activeTab === tab && <View style={styles.contentTabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>
          
          {/* 提问列表 */}
          <View style={{ display: activeTab === t('profile.contentTabs.questions') ? 'flex' : 'none' }}>
            {myQuestions.map(q => (
              <TouchableOpacity key={q.id} style={styles.questionItem} onPress={() => handleQuestionPress(q)}>
                <View style={styles.questionHeader}>
                  <Text style={styles.questionTime}>{q.time}</Text>
                </View>
                <Text style={styles.questionTitle}>
                  {q.type === 'reward' && (
                    <View style={styles.rewardTagInline}>
                      <Text style={styles.rewardTagInlineText}>${q.reward}</Text>
                    </View>
                  )}
                  {q.solved && (
                    <View style={styles.solvedTagInline}>
                      <Text style={styles.solvedTagInlineText}>{t('profile.solved')}</Text>
                    </View>
                  )}
                  {' '}{q.title}
                </Text>
                <View style={styles.questionStats}>
                  <View style={styles.questionStatItem}>
                    <Ionicons name="eye-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>{q.views}</Text>
                  </View>
                  <View style={styles.questionStatItem}>
                    <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>{q.comments}</Text>
                  </View>
                  <View style={styles.questionStatItem}>
                    <Ionicons name="thumbs-up-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>{q.likes}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* 回答列表 */}
          <View style={{ display: activeTab === t('profile.contentTabs.answers') ? 'flex' : 'none' }}>
            {myAnswers.map(a => (
              <TouchableOpacity key={a.id} style={styles.answerItem} onPress={() => navigation.navigate('AnswerDetail', { answer: a, defaultTab: 'supplements' })}>
                <View style={styles.answerHeader}>
                  <Text style={styles.answerTime}>{a.time}</Text>
                </View>
                <Text style={styles.answerQuestion} numberOfLines={1}>
                  {a.adopted && (
                    <View style={styles.adoptedTagInline}>
                      <Text style={styles.adoptedTagInlineText}>{t('profile.adopted')}</Text>
                    </View>
                  )}
                  {' '}{a.questionTitle}
                </Text>
                <Text style={styles.answerContent} numberOfLines={2}>{a.content}</Text>
                <View style={styles.answerStats}>
                  <View style={styles.questionStatItem}>
                    <Ionicons name="thumbs-up-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>{a.likes}</Text>
                  </View>
                  <View style={styles.questionStatItem}>
                    <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>{a.comments}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* 收藏列表 */}
          <View style={{ display: activeTab === t('profile.contentTabs.favorites') ? 'flex' : 'none' }}>
            {/* 收藏分类标签 */}
            <View style={styles.favoriteTabsInline}>
              <TouchableOpacity 
                style={[styles.favoriteTabInline, favoritesTab === 'questions' && styles.favoriteTabInlineActive]} 
                onPress={() => setFavoritesTab('questions')}
              >
                <Text style={[styles.favoriteTabInlineText, favoritesTab === 'questions' && styles.favoriteTabInlineTextActive]}>
                  {t('profile.favoriteCategories.questions')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.favoriteTabInline, favoritesTab === 'answers' && styles.favoriteTabInlineActive]} 
                onPress={() => setFavoritesTab('answers')}
              >
                <Text style={[styles.favoriteTabInlineText, favoritesTab === 'answers' && styles.favoriteTabInlineTextActive]}>
                  {t('profile.favoriteCategories.answers')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.favoriteTabInline, favoritesTab === 'comments' && styles.favoriteTabInlineActive]} 
                onPress={() => setFavoritesTab('comments')}
              >
                <Text style={[styles.favoriteTabInlineText, favoritesTab === 'comments' && styles.favoriteTabInlineTextActive]}>
                  {t('profile.favoriteCategories.comments')}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* 收藏内容列表 */}
            {getFavoritesData().map(item => (
              <TouchableOpacity key={item.id} style={styles.favoriteItem} onPress={() => handleFavoritePress(item)}>
                <View style={styles.favoriteItemContent}>
                  <Text style={styles.favoriteItemTitle}>{item.title}</Text>
                  <View style={styles.favoriteItemMeta}>
                    <Text style={styles.favoriteItemAuthor}>{item.author}</Text>
                    <Text style={styles.favoriteItemTime}>{item.time}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
              </TouchableOpacity>
            ))}
          </View>

          {/* 浏览历史列表 */}
          <View style={{ display: activeTab === t('profile.contentTabs.history') ? 'flex' : 'none' }}>
            {historyList.map(item => (
              <TouchableOpacity key={item.id} style={styles.historyItem} onPress={() => handleHistoryPress(item)}>
                <View style={styles.historyItemContent}>
                  <Text style={styles.historyItemTitle}>{item.title}</Text>
                  <View style={styles.historyItemMeta}>
                    <Text style={styles.historyItemAuthor}>{item.author}</Text>
                    <Text style={styles.historyItemTime}>{t('profile.viewedAt')} {item.time}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => showAppAlert(t('profile.viewAll'), `${t('profile.viewAll')}${activeTab}`)}><Text style={styles.viewAllText}>{t('profile.viewAll')}</Text><Ionicons name="chevron-forward" size={16} color="#ef4444" /></TouchableOpacity>
        </View>

        {/* 退出登录 */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* 我的收藏弹窗 */}
      <Modal visible={showFavoritesModal} animationType="slide">
        <SafeAreaView style={styles.listModal}>
          <View style={styles.listModalHeader}>
            <TouchableOpacity onPress={() => setShowFavoritesModal(false)}>
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.listModalTitle}>{t('profile.myFavorites')}</Text>
            <View style={{ width: 24 }} />
          </View>
          {/* 收藏分类标签 */}
          <View style={styles.favoriteTabs}>
            <TouchableOpacity style={[styles.favoriteTab, favoritesTab === 'questions' && styles.favoriteTabActive]} onPress={() => setFavoritesTab('questions')}>
              <Text style={[styles.favoriteTabText, favoritesTab === 'questions' && styles.favoriteTabTextActive]}>{t('profile.favoriteQuestions')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.favoriteTab, favoritesTab === 'answers' && styles.favoriteTabActive]} onPress={() => setFavoritesTab('answers')}>
              <Text style={[styles.favoriteTabText, favoritesTab === 'answers' && styles.favoriteTabTextActive]}>{t('profile.favoriteAnswers')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.favoriteTab, favoritesTab === 'comments' && styles.favoriteTabActive]} onPress={() => setFavoritesTab('comments')}>
              <Text style={[styles.favoriteTabText, favoritesTab === 'comments' && styles.favoriteTabTextActive]}>{t('profile.favoriteComments')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.listModalContent}>
            {getFavoritesData().map(item => (
              <TouchableOpacity key={item.id} style={styles.listItem} onPress={() => handleFavoritePress(item)}>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{item.title}</Text>
                  <View style={styles.listItemMeta}>
                    <Text style={styles.listItemAuthor}>{item.author}</Text>
                    <Text style={styles.listItemTime}>{item.time}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 浏览历史弹窗 */}
      <Modal visible={showHistoryModal} animationType="slide">
        <SafeAreaView style={styles.listModal}>
          <View style={styles.listModalHeader}>
            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.listModalTitle}>{t('profile.browsingHistory')}</Text>
            <TouchableOpacity onPress={() => showAppAlert(t('profile.clearHistory'), t('profile.clearHistoryConfirm'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('profile.clear'), style: 'destructive' }])}>
              <Text style={styles.clearText}>{t('profile.clear')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.listModalContent}>
            {historyList.map(item => (
              <TouchableOpacity key={item.id} style={styles.listItem} onPress={() => handleHistoryPress(item)}>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{item.title}</Text>
                  <View style={styles.listItemMeta}>
                    <Text style={styles.listItemAuthor}>{item.author}</Text>
                    <Text style={styles.listItemTime}>{item.time}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 我的草稿弹窗 */}
      <Modal visible={showDraftsModal} animationType="slide">
        <SafeAreaView style={styles.listModal}>
          <View style={styles.listModalHeader}>
            <TouchableOpacity onPress={() => setShowDraftsModal(false)}>
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.listModalTitle}>{t('profile.myDrafts')}</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.listModalContent}>
            {draftsLoading && draftsList.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ef4444" />
                <Text style={styles.loadingText}>加载中...</Text>
              </View>
            ) : draftsList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>暂无草稿</Text>
                <Text style={styles.emptyHint}>您还没有保存任何草稿</Text>
              </View>
            ) : (
              draftsList.map(item => (
                <View key={item.id} style={styles.draftItem}>
                  <TouchableOpacity style={styles.draftContent} onPress={() => handleDraftPress(item)}>
                    <View style={styles.draftTypeTag}>
                      <Text style={styles.draftTypeText}>
                        {item.type === 0 ? '公开问题' : item.type === 1 ? '悬赏问题' : '定向问题'}
                      </Text>
                    </View>
                    <View style={styles.draftInfo}>
                      <Text style={styles.draftTitle} numberOfLines={1}>
                        {item.title && item.title !== '未命名草稿' 
                          ? item.title 
                          : (item.description ? item.description.substring(0, 20) + '...' : '无标题')
                        }
                      </Text>
                      <Text style={styles.draftTime}>
                        {item.createTime ? new Date(item.createTime).toLocaleString() : '未知时间'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.draftDeleteBtn} onPress={() => handleDeleteDraft(item)}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 认证弹窗 */}
      <Modal visible={showVerificationModal} animationType="slide">
        <SafeAreaView style={styles.verificationModal}>
          {/* 头部 */}
          <View style={styles.verificationHeader}>
            <TouchableOpacity onPress={handleVerificationBack}>
              <Ionicons name={verificationStep === 0 ? "close" : "arrow-back"} size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.verificationTitle}>
              {verificationStep === 0 ? t('profile.verificationModal.title') : 
               verificationStep === 1 ? `${selectedVerificationType === 'personal' ? t('profile.personalVerification') : selectedVerificationType === 'enterprise' ? t('profile.enterpriseVerification') : t('profile.governmentVerification')}` :
               t('common.confirm')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* 进度条 - 移除，不再需要 */}

          <ScrollView style={styles.verificationContent} showsVerticalScrollIndicator={false}>
            {/* 步骤0: 选择认证类型 */}
            {verificationStep === 0 && (
              <View style={styles.typeSelectionContainer}>
                <Text style={styles.typeSelectionTitle}>{t('profile.verificationModal.selectType')}</Text>
                
                <TouchableOpacity 
                  style={styles.typeCard}
                  onPress={() => handleSelectVerificationType('personal')}
                >
                  <View style={styles.typeCardLeft}>
                    <View style={[styles.typeIcon, { backgroundColor: '#fef3c7' }]}>
                      <Ionicons name="person" size={24} color="#f59e0b" />
                    </View>
                    <View style={styles.typeInfo}>
                      <Text style={styles.typeTitle}>{t('profile.verificationModal.personal.title')}</Text>
                      <Text style={styles.typeDesc}>{t('profile.verificationModal.personal.desc')}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.typeCard}
                  onPress={() => handleSelectVerificationType('enterprise')}
                >
                  <View style={styles.typeCardLeft}>
                    <View style={[styles.typeIcon, { backgroundColor: '#dbeafe' }]}>
                      <Ionicons name="business" size={24} color="#3b82f6" />
                    </View>
                    <View style={styles.typeInfo}>
                      <Text style={styles.typeTitle}>{t('profile.verificationModal.enterprise.title')}</Text>
                      <Text style={styles.typeDesc}>{t('profile.verificationModal.enterprise.desc')}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.typeCard}
                  onPress={() => handleSelectVerificationType('government')}
                >
                  <View style={styles.typeCardLeft}>
                    <View style={[styles.typeIcon, { backgroundColor: '#fee2e2' }]}>
                      <Ionicons name="shield-checkmark" size={24} color="#ef4444" />
                    </View>
                    <View style={styles.typeInfo}>
                      <Text style={styles.typeTitle}>{t('profile.verificationModal.government.title')}</Text>
                      <Text style={styles.typeDesc}>{t('profile.verificationModal.government.desc')}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>
              </View>
            )}

            {/* 步骤1: 填写信息 - 个人认证 */}
            {verificationStep === 1 && selectedVerificationType === 'personal' && (
              <View style={styles.formContainer}>
                {/* 证件类型 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>证件类型 <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity style={styles.fieldInput}>
                    <Text style={styles.fieldInputText}>身份证</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </View>

                {/* 证件号码 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>证件号码 <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="请输入证件号码"
                    placeholderTextColor="#9ca3af"
                    value={verificationData.personal.idNumber}
                    onChangeText={(text) => updateVerificationField('idNumber', text)}
                  />
                </View>

                {/* 上传证件照片 */}
                <View style={styles.uploadSection}>
                  <Text style={styles.uploadSectionTitle}>上传证件照片</Text>
                  
                  <View style={styles.uploadGrid}>
                    {/* 证件正面 */}
                    <View style={styles.uploadItemWrapper}>
                      <Text style={styles.uploadLabel}>证件正面 <Text style={styles.required}>*</Text></Text>
                      <TouchableOpacity 
                        style={styles.uploadBox}
                        onPress={() => handleImageUpload('idFront')}
                      >
                        {verificationData.personal.idFront ? (
                          <Image source={{ uri: verificationData.personal.idFront }} style={styles.uploadedImage} />
                        ) : (
                          <View style={styles.uploadPlaceholder}>
                            <Ionicons name="camera-outline" size={40} color="#d1d5db" />
                            <Text style={styles.uploadPlaceholderText}>点击上传</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* 证件反面 */}
                    <View style={styles.uploadItemWrapper}>
                      <Text style={styles.uploadLabel}>证件反面 <Text style={styles.required}>*</Text></Text>
                      <TouchableOpacity 
                        style={styles.uploadBox}
                        onPress={() => handleImageUpload('idBack')}
                      >
                        {verificationData.personal.idBack ? (
                          <Image source={{ uri: verificationData.personal.idBack }} style={styles.uploadedImage} />
                        ) : (
                          <View style={styles.uploadPlaceholder}>
                            <Ionicons name="camera-outline" size={40} color="#d1d5db" />
                            <Text style={styles.uploadPlaceholderText}>点击上传</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.uploadTip}>
                    <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                    <Text style={styles.uploadTipText}>请确保证件信息清晰可见，照片完整无遮挡</Text>
                  </View>
                </View>

                {/* 专业资质认证（必填） */}
                <View style={styles.uploadSection}>
                  <View style={styles.qualificationHeader}>
                    <Text style={styles.uploadSectionTitle}>专业资质认证 <Text style={styles.required}>*</Text></Text>
                  </View>
                  <Text style={styles.qualificationDesc}>请上传您的专业资质证书（如：律师证、医师证、教师证等）</Text>
                  
                  {/* 已上传的资质列表 */}
                  {verificationData.personal.qualifications.map((qual, index) => (
                    <View key={qual.id} style={styles.qualificationItem}>
                      <View style={styles.qualificationContent}>
                        <Image source={{ uri: qual.image }} style={styles.qualificationImage} />
                        <View style={styles.qualificationInfo}>
                          <TextInput
                            style={styles.qualificationNameInput}
                            placeholder="请输入资质名称（如：律师执业证）"
                            placeholderTextColor="#9ca3af"
                            value={qual.name}
                            onChangeText={(text) => updateQualificationName(qual.id, text)}
                          />
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={styles.qualificationDelete}
                        onPress={() => removeQualification(qual.id)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* 添加资质按钮 */}
                  <TouchableOpacity 
                    style={styles.addQualificationBtn}
                    onPress={addQualification}
                  >
                    <Ionicons name="add-circle-outline" size={24} color="#3b82f6" />
                    <Text style={styles.addQualificationText}>添加资质证书</Text>
                  </TouchableOpacity>

                  <View style={styles.uploadTip}>
                    <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                    <Text style={styles.uploadTipText}>支持上传律师证、医师证、教师证等专业资质证书</Text>
                  </View>
                </View>

              </View>
            )}

            {/* 步骤1: 填写信息 - 企业认证 */}
            {verificationStep === 1 && selectedVerificationType === 'enterprise' && (
              <View style={styles.formContainer}>
                {/* 企业名称 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>企业名称 <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="请输入企业全称"
                    placeholderTextColor="#9ca3af"
                    value={verificationData.enterprise.name}
                    onChangeText={(text) => updateVerificationField('name', text)}
                  />
                </View>

                {/* 注册号 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>注册号</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="请输入企业注册号"
                    placeholderTextColor="#9ca3af"
                    value={verificationData.enterprise.registrationNumber}
                    onChangeText={(text) => updateVerificationField('registrationNumber', text)}
                  />
                </View>

                {/* 税号 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>税号 <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="请输入纳税人识别号"
                    placeholderTextColor="#9ca3af"
                    value={verificationData.enterprise.taxNumber}
                    onChangeText={(text) => updateVerificationField('taxNumber', text)}
                  />
                </View>

                {/* 企业地址 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>企业地址 <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="请输入企业注册地址"
                    placeholderTextColor="#9ca3af"
                    value={verificationData.enterprise.address}
                    onChangeText={(text) => updateVerificationField('address', text)}
                  />
                </View>

                {/* 企业联系人 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>企业联系人 <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="请输入联系人姓名"
                    placeholderTextColor="#9ca3af"
                    value={verificationData.enterprise.contactPerson}
                    onChangeText={(text) => updateVerificationField('contactPerson', text)}
                  />
                </View>

                {/* 联系方式说明 */}
                <View style={styles.contactMethodSection}>
                  <Text style={styles.contactMethodTitle}>联系方式 <Text style={styles.required}>*</Text></Text>
                  <Text style={styles.contactMethodDesc}>请至少填写一种联系方式</Text>
                </View>

                {/* 联系电话 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>联系电话</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="请输入手机号码"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    maxLength={11}
                    value={verificationData.enterprise.contactPhone}
                    onChangeText={(text) => updateVerificationField('contactPhone', text)}
                  />
                </View>

                {/* 联系邮箱 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>联系邮箱</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="请输入邮箱地址"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={verificationData.enterprise.contactEmail}
                    onChangeText={(text) => updateVerificationField('contactEmail', text)}
                  />
                </View>

                {/* 上传注册文件 */}
                <View style={styles.uploadSection}>
                  <Text style={styles.uploadSectionTitle}>上传注册文件</Text>
                  
                  <View style={styles.uploadSingleWrapper}>
                    <Text style={styles.uploadLabel}>注册文件 <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity 
                      style={styles.uploadBoxLarge}
                      onPress={() => handleImageUpload('license')}
                    >
                      {verificationData.enterprise.license ? (
                        <Image source={{ uri: verificationData.enterprise.license }} style={styles.uploadedImage} />
                      ) : (
                        <View style={styles.uploadPlaceholder}>
                          <Ionicons name="camera-outline" size={40} color="#d1d5db" />
                          <Text style={styles.uploadPlaceholderText}>点击上传</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.uploadTip}>
                    <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                    <Text style={styles.uploadTipText}>请上传清晰的注册文件照片（如营业执照、组织机构代码证等），确保信息完整可见</Text>
                  </View>
                </View>
              </View>
            )}

            {/* 步骤1: 填写信息 - 政府认证 */}
            {verificationStep === 1 && selectedVerificationType === 'government' && (
              <View style={styles.formContainer}>
                {/* 机构名称 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>机构名称 <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="请输入政府机构全称"
                    placeholderTextColor="#9ca3af"
                    value={verificationData.government.name}
                    onChangeText={(text) => updateVerificationField('name', text)}
                  />
                </View>

                {/* 机构ID */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>机构ID</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="请输入机构ID"
                    placeholderTextColor="#9ca3af"
                    value={verificationData.government.creditCode}
                    onChangeText={(text) => updateVerificationField('creditCode', text)}
                  />
                </View>

                {/* 部门名称 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>部门名称 <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="请输入所属部门名称"
                    placeholderTextColor="#9ca3af"
                    value={verificationData.government.department}
                    onChangeText={(text) => updateVerificationField('department', text)}
                  />
                </View>

                {/* 授权人 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>授权人 <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="请输入授权人姓名"
                    placeholderTextColor="#9ca3af"
                    value={verificationData.government.authorizerName}
                    onChangeText={(text) => updateVerificationField('authorizerName', text)}
                  />
                </View>

                {/* 上传授权人身份证 */}
                <View style={styles.uploadSection}>
                  <Text style={styles.uploadSectionTitle}>上传授权人身份证 <Text style={styles.required}>*</Text></Text>
                  
                  <View style={styles.uploadGrid}>
                    {/* 身份证正面 */}
                    <View style={styles.uploadItemWrapper}>
                      <Text style={styles.uploadLabel}>身份证正面 <Text style={styles.required}>*</Text></Text>
                      <TouchableOpacity 
                        style={styles.uploadBox}
                        onPress={() => handleImageUpload('authorizerIdFront')}
                      >
                        {verificationData.government.authorizerIdFront ? (
                          <Image source={{ uri: verificationData.government.authorizerIdFront }} style={styles.uploadedImage} />
                        ) : (
                          <View style={styles.uploadPlaceholder}>
                            <Ionicons name="camera-outline" size={40} color="#d1d5db" />
                            <Text style={styles.uploadPlaceholderText}>点击上传</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* 身份证反面 */}
                    <View style={styles.uploadItemWrapper}>
                      <Text style={styles.uploadLabel}>身份证反面 <Text style={styles.required}>*</Text></Text>
                      <TouchableOpacity 
                        style={styles.uploadBox}
                        onPress={() => handleImageUpload('authorizerIdBack')}
                      >
                        {verificationData.government.authorizerIdBack ? (
                          <Image source={{ uri: verificationData.government.authorizerIdBack }} style={styles.uploadedImage} />
                        ) : (
                          <View style={styles.uploadPlaceholder}>
                            <Ionicons name="camera-outline" size={40} color="#d1d5db" />
                            <Text style={styles.uploadPlaceholderText}>点击上传</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.uploadTip}>
                    <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                    <Text style={styles.uploadTipText}>请上传授权人身份证正反面，确保信息清晰可见</Text>
                  </View>
                </View>

                {/* 职位 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>职位 <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="请输入授权人职位"
                    placeholderTextColor="#9ca3af"
                    value={verificationData.government.authorizerPosition}
                    onChangeText={(text) => updateVerificationField('authorizerPosition', text)}
                  />
                </View>

                {/* 联系方式说明 */}
                <View style={styles.contactMethodSection}>
                  <Text style={styles.contactMethodTitle}>联系方式 <Text style={styles.required}>*</Text></Text>
                  <Text style={styles.contactMethodDesc}>请至少填写一种联系方式</Text>
                </View>

                {/* 联系电话 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>联系电话</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="请输入手机号码"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    maxLength={11}
                    value={verificationData.government.contactPhone}
                    onChangeText={(text) => updateVerificationField('contactPhone', text)}
                  />
                </View>

                {/* 联系邮箱 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>联系邮箱</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="请输入邮箱地址"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={verificationData.government.contactEmail}
                    onChangeText={(text) => updateVerificationField('contactEmail', text)}
                  />
                </View>

                {/* 上传官方文件 */}
                <View style={styles.uploadSection}>
                  <Text style={styles.uploadSectionTitle}>上传官方文件</Text>
                  
                  <View style={styles.uploadSingleWrapper}>
                    <Text style={styles.uploadLabel}>官方文件 <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity 
                      style={styles.uploadBoxLarge}
                      onPress={() => handleImageUpload('certificate')}
                    >
                      {verificationData.government.certificate ? (
                        <Image source={{ uri: verificationData.government.certificate }} style={styles.uploadedImage} />
                      ) : (
                        <View style={styles.uploadPlaceholder}>
                          <Ionicons name="camera-outline" size={40} color="#d1d5db" />
                          <Text style={styles.uploadPlaceholderText}>点击上传</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.uploadTip}>
                    <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                    <Text style={styles.uploadTipText}>请上传加盖公章的官方文件，如：组织机构代码证、事业单位法人证书等</Text>
                  </View>
                </View>
              </View>
            )}



            <View style={{ height: 40 }} />
          </ScrollView>

          {/* 底部按钮 */}
          {verificationStep > 0 && (
            <View style={styles.verificationFooter}>
              <TouchableOpacity 
                style={styles.verificationSubmitBtn}
                onPress={handleVerificationSubmit}
              >
                <Text style={styles.verificationSubmitText}>{t('profile.verificationModal.submit')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* 退出登录确认弹窗 */}
      <LogoutConfirmModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        username={userProfile.username || userProfile.nickname}
        isLoading={isLoggingOut}
        showDefaultPassword={!userProfile.passwordChanged}
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  headerBg: { height: 120, backgroundColor: '#ef4444', paddingTop: 20 },
  headerActions: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16 },
  profileCard: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: -60, borderRadius: 16, padding: 16 },
  profileHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', marginTop: -40 },
  profileInfo: { flex: 1, marginLeft: 12, marginTop: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  verificationIcon: { 
    width: 16, 
    height: 16, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  verificationText: {
    fontSize: 11,
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 4,
  },
  verifyButtonText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '500',
  },

  userId: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  userBio: { fontSize: 13, color: '#4b5563', marginTop: 12, lineHeight: 18 },
  userMeta: { flexDirection: 'row', gap: 16, marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#9ca3af' },
  indexRow: { flexDirection: 'row', marginTop: 16, backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, gap: 16 },
  indexItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  indexIconWrapper: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  indexInfo: { flex: 1 },
  indexLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  indexValue: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  indexDivider: { width: 1, height: '100%', backgroundColor: '#e5e7eb' },
  statsRow: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  walletCard: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12, borderRadius: 16, padding: 16 },
  walletHeader: { flexDirection: 'row', alignItems: 'center' },
  walletIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center' },
  walletInfo: { flex: 1, marginLeft: 12 },
  walletLabel: { fontSize: 12, color: '#9ca3af' },
  walletBalance: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  walletActions: { flexDirection: 'row', gap: 8 },
  rechargeBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  rechargeBtnText: { fontSize: 12, color: '#fff', fontWeight: '500' },
  withdrawBtn: { borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  withdrawBtnText: { fontSize: 12, color: '#6b7280' },
  walletStats: { flexDirection: 'row', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  walletStatItem: { flex: 1, alignItems: 'center' },
  walletStatValue: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  walletStatLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  superLikeCard: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12, borderRadius: 16, padding: 16 },
  superLikeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  superLikeTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  superLikeTitleText: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  superLikeActions: { flexDirection: 'row', gap: 12 },
  superLikeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fef3c7', paddingVertical: 10, borderRadius: 8, gap: 6 },
  superLikeBtnSecondary: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' },
  superLikeBtnText: { fontSize: 14, fontWeight: '500', color: '#f59e0b' },
  superLikeBtnTextSecondary: { color: '#6b7280' },
  menuSection: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12, borderRadius: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  menuLabel: { flex: 1, marginLeft: 12, fontSize: 14, color: '#1f2937' },
  menuRight: { flexDirection: 'row', alignItems: 'center' },
  menuValue: { fontSize: 13, color: '#9ca3af', marginRight: 4 },
  contentSection: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12, borderRadius: 16 },
  contentTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  contentTabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  contentTabText: { fontSize: 14, color: '#6b7280' },
  contentTabTextActive: { color: '#ef4444', fontWeight: '600' },
  contentTabIndicator: { position: 'absolute', bottom: 0, width: 40, height: 2, backgroundColor: '#ef4444', borderRadius: 1 },
  questionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  questionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  questionTime: { fontSize: 11, color: '#9ca3af', marginLeft: 'auto' },
  rewardTagInline: { backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  rewardTagInlineText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  solvedTagInline: { backgroundColor: '#22c55e', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 4 },
  solvedTagInlineText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  questionTitle: { fontSize: 14, color: '#1f2937', lineHeight: 20 },
  questionStats: { flexDirection: 'row', gap: 12, marginTop: 8 },
  questionStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  questionStatText: { fontSize: 12, color: '#9ca3af' },
  viewAllBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  viewAllText: { fontSize: 13, color: '#ef4444' },
  answerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  answerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  adoptedTagInline: { backgroundColor: '#22c55e', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  adoptedTagInlineText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  answerTime: { fontSize: 11, color: '#9ca3af', marginLeft: 'auto' },
  answerQuestion: { fontSize: 14, fontWeight: '500', color: '#1f2937', marginBottom: 4 },
  answerContent: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  answerStats: { flexDirection: 'row', gap: 12, marginTop: 8 },
  logoutBtn: { marginHorizontal: 12, marginTop: 12, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  logoutText: { fontSize: 15, color: '#ef4444', fontWeight: '500' },
  listModal: { flex: 1, backgroundColor: modalTokens.surface },
  listModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  listModalTitle: { fontSize: 17, fontWeight: '600', color: modalTokens.textPrimary },
  clearText: { fontSize: 14, color: '#ef4444' },
  listModalContent: { flex: 1 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  listItemContent: { flex: 1 },
  listItemTitle: { fontSize: 15, color: '#1f2937', lineHeight: 22 },
  listItemMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 },
  listItemAuthor: { fontSize: 12, color: '#6b7280' },
  listItemTime: { fontSize: 12, color: '#9ca3af' },
  favoriteTabs: { flexDirection: 'row', backgroundColor: modalTokens.surface, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  favoriteTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  favoriteTabActive: { borderBottomColor: '#ef4444' },
  favoriteTabText: { fontSize: 14, color: '#6b7280' },
  favoriteTabTextActive: { color: '#ef4444', fontWeight: '600' },
  draftItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  draftContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  draftTypeTag: { backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  draftTypeText: { fontSize: 11, color: '#ef4444', fontWeight: '500' },
  draftInfo: { flex: 1, marginLeft: 12 },
  draftTitle: { fontSize: 14, color: '#1f2937', marginBottom: 4 },
  draftTime: { fontSize: 12, color: '#9ca3af' },
  draftDeleteBtn: { padding: 8 },
  // 内嵌收藏标签样式
  favoriteTabsInline: { flexDirection: 'row', backgroundColor: modalTokens.surfaceSoft, borderRadius: 8, padding: 4, margin: 12 },
  favoriteTabInline: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  favoriteTabInlineActive: { backgroundColor: modalTokens.surface, shadowColor: modalTokens.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  favoriteTabInlineText: { fontSize: 13, color: '#6b7280' },
  favoriteTabInlineTextActive: { color: '#ef4444', fontWeight: '600' },
  favoriteItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  favoriteItemContent: { flex: 1 },
  favoriteItemTitle: { fontSize: 14, color: '#1f2937', lineHeight: 20, marginBottom: 6 },
  favoriteItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  favoriteItemAuthor: { fontSize: 12, color: '#9ca3af' },
  favoriteItemTime: { fontSize: 12, color: '#9ca3af' },
  // 浏览历史样式
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  historyItemContent: { flex: 1 },
  historyItemTitle: { fontSize: 14, color: '#1f2937', lineHeight: 20, marginBottom: 6 },
  historyItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyItemAuthor: { fontSize: 12, color: '#9ca3af' },
  historyItemTime: { fontSize: 12, color: '#9ca3af' },
  favoriteItemAuthor: { fontSize: 12, color: '#6b7280' },
  favoriteItemTime: { fontSize: 12, color: '#9ca3af' },
  
  // 认证弹窗样式
  verificationModal: { flex: 1, backgroundColor: modalTokens.surfaceSoft },
  verificationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: modalTokens.surface, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  verificationTitle: { fontSize: 18, fontWeight: 'bold', color: modalTokens.textPrimary },
  progressContainer: { backgroundColor: modalTokens.surface, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  progressBar: { height: 4, backgroundColor: modalTokens.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 2 },
  progressText: { fontSize: 12, color: modalTokens.textSecondary, marginTop: 8 },
  verificationContent: { flex: 1, backgroundColor: modalTokens.surface },
  
  // 类型选择
  typeSelectionContainer: { padding: 16 },
  typeSelectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 20, textAlign: 'center' },
  typeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  typeCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  typeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  typeInfo: { flex: 1 },
  typeTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  typeDesc: { fontSize: 13, color: '#6b7280' },
  
  // 表单样式
  formContainer: { flex: 1, backgroundColor: '#fff' },
  
  // 字段容器（每个输入项）
  fieldContainer: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12 },
  fieldLabel: { fontSize: 14, color: '#333', marginBottom: 10, fontWeight: '500' },
  fieldInput: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#fff', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 48,
  },
  fieldInputText: { fontSize: 15, color: '#1f2937' },
  
  // 联系方式区域
  contactMethodSection: { 
    backgroundColor: '#fff', 
    paddingHorizontal: 16, 
    paddingTop: 16, 
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  contactMethodTitle: { fontSize: 14, color: '#333', fontWeight: '600', marginBottom: 4 },
  contactMethodDesc: { fontSize: 12, color: '#6b7280', lineHeight: 18 },
  
  // 上传区域
  uploadSection: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  uploadSectionTitle: { fontSize: 15, color: '#333', fontWeight: '600', marginBottom: 16 },
  uploadGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  uploadItemWrapper: { flex: 1 },
  uploadSingleWrapper: { marginBottom: 12 },
  uploadLabel: { fontSize: 13, color: '#666', marginBottom: 8, fontWeight: '500' },
  uploadBox: { 
    aspectRatio: 1.4,
    backgroundColor: '#fff', 
    borderRadius: 8, 
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  uploadBoxLarge: { 
    aspectRatio: 1.5,
    backgroundColor: '#fff', 
    borderRadius: 8, 
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  uploadPlaceholder: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  uploadPlaceholderText: { fontSize: 13, color: '#9ca3af', marginTop: 8 },
  uploadedImage: { width: '100%', height: '100%' },
  uploadTip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  uploadTipText: { flex: 1, fontSize: 12, color: '#6b7280', lineHeight: 18 },
  
  // 专业资质认证
  qualificationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  optionalTag: { fontSize: 12, color: '#10b981', backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  qualificationDesc: { fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 18 },
  qualificationItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f9fafb', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  qualificationContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  qualificationImage: { width: 80, height: 60, borderRadius: 6, backgroundColor: '#e5e7eb' },
  qualificationInfo: { flex: 1 },
  qualificationNameInput: { 
    fontSize: 14, 
    color: '#1f2937', 
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  qualificationDelete: { padding: 8 },
  addQualificationBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
  },
  addQualificationText: { fontSize: 14, color: '#3b82f6', fontWeight: '500' },
  
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  required: { color: '#ef4444' },
  
  // 确认信息
  confirmContainer: { padding: 16 },
  confirmSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  confirmTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  confirmItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  confirmLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  confirmValue: { fontSize: 15, color: '#1f2937', fontWeight: '500' },
  uploadedImagesRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  uploadedImageThumb: { backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  uploadedImageLabel: { fontSize: 12, color: '#3b82f6', fontWeight: '500' },
  warningSection: { backgroundColor: '#fef3c7', borderRadius: 12, padding: 16, marginBottom: 16 },
  warningTitle: { fontSize: 14, fontWeight: '600', color: '#92400e', marginBottom: 8 },
  warningText: { fontSize: 13, color: '#78350f', marginBottom: 4 },
  agreementRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  agreementText: { fontSize: 13, color: '#374151' },
  
  // 底部按钮
  verificationFooter: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 0 },
  verificationSubmitBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  verificationSubmitText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  
  // 加载和空状态样式
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 14, color: '#6b7280', marginTop: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#6b7280', marginTop: 12, fontWeight: '500' },
  emptyHint: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
});
