import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Switch, Alert, Modal, Platform, ActivityIndicator, Image, FlatList, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CategoryIcon from '../components/CategoryIcon';
import IdentitySelector from '../components/IdentitySelector';
import ImagePickerSheet from '../components/ImagePickerSheet';
import KeyboardDismissView from '../components/KeyboardDismissView';
import categoryApi from '../services/api/categoryApi';
import questionApi from '../services/api/questionApi';
import uploadApi from '../services/api/uploadApi';
import expertApi from '../services/api/expertApi';
import { showToast } from '../utils/toast';
import { modalTokens } from '../components/modalTokens';
import { useTranslation } from '../i18n/useTranslation';
import { getRegionData } from '../data/regionData';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import { scaleFont, scaleWidth } from '../utils/responsive';
const questionTypes = [{
  id: 0,
  nameKey: 'publish.questionTypes.public',
  descKey: 'publish.questionTypes.publicDesc',
  icon: 'gift',
  color: '#22c55e'
}, {
  id: 1,
  nameKey: 'publish.questionTypes.reward',
  descKey: 'publish.questionTypes.rewardDesc',
  icon: 'cash',
  color: '#f97316'
}, {
  id: 2,
  nameKey: 'publish.questionTypes.targeted',
  descKey: 'publish.questionTypes.targetedDesc',
  icon: 'locate',
  color: '#3b82f6'
}];
const rewardAmounts = [10, 20, 50, 100];
const CUSTOM_LEVEL2_PREFIX = 'custom-level2-';

const normalizeCustomCategoryName = (value) => {
  return (value || '').toString().trim();
};

const createCustomLevel2Category = (level1, customName) => {
  const normalizedName = normalizeCustomCategoryName(customName);
  const parentId = Number(level1?.id);
  return {
    id: `${CUSTOM_LEVEL2_PREFIX}${parentId || 0}:${normalizedName}`,
    name: normalizedName,
    icon: 'create-outline',
    color: level1?.color || '#ef4444',
    parentId: parentId || 0,
    parentName: level1?.name || '',
    isCustom: true,
  };
};

const isCustomLevel2Category = (category) => {
  return Boolean(category?.isCustom) || String(category?.id || '').startsWith(CUSTOM_LEVEL2_PREFIX);
};

const resolveEffectiveCategoryId = (level1, level2) => {
  if (!level2) return null;

  if (isCustomLevel2Category(level2)) {
    const level1Id = Number(level1?.id);
    return Number.isFinite(level1Id) && level1Id > 0 ? level1Id : null;
  }

  const level2Id = Number(level2.id);
  return Number.isFinite(level2Id) && level2Id > 0 ? level2Id : null;
};

const buildCustomCategoryPayload = (level1, level2) => {
  if (!isCustomLevel2Category(level2)) {
    return {};
  }

  const normalizedCategoryName = normalizeCustomCategoryName(level2?.name);
  return {
    customCategoryName: normalizedCategoryName || undefined,
    customCategoryParentId: Number(level1?.id) || Number(level2?.parentId) || undefined,
    customCategoryParentName: level1?.name || level2?.parentName || undefined,
    customCategoryLevel: 2,
    customCategoryPending: 1,
  };
};

export default function PublishScreen({
  navigation,
  route
}) {
  const { t } = useTranslation();
  const bottomSafeInset = useBottomSafeInset(20);
  
  // 获取多语言区域数据
  const regionData = React.useMemo(() => getRegionData(), []);
  
  // 获取路由参数中的草稿数据
  const draftData = route?.params?.draftData;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState(0); // 直接使用数字：0=公开，1=悬赏，2=定向
  const [reward, setReward] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState([]);
  const [customTopic, setCustomTopic] = useState('');
  const [location, setLocation] = useState('北京');
  const [visibility, setVisibility] = useState(0); // 直接使用数字：0=所有人，1=仅关注我的人，2=仅自己

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [selectedLevel1, setSelectedLevel1] = useState(null);
  const [selectedLevel2, setSelectedLevel2] = useState(null);

  // 定向问题相关状态
  const [targetedUsers, setTargetedUsers] = useState([]);
  const [targetedReward, setTargetedReward] = useState('');
  const [expertSearchQuery, setExpertSearchQuery] = useState('');

  // 专家列表数据状态
  const [expertList, setExpertList] = useState([]); // 专家列表
  const [expertTotal, setExpertTotal] = useState(0); // 专家总数
  const [expertPageNum, setExpertPageNum] = useState(1); // 当前页码
  const [expertPageSize] = useState(10); // 每页条数
  const [expertLoading, setExpertLoading] = useState(false); // 加载状态
  const [expertLoadingMore, setExpertLoadingMore] = useState(false); // 加载更多状态
  const [expertHasMore, setExpertHasMore] = useState(true); // 是否还有更多数据

  // 答案设置
  const [answerPublic, setAnswerPublic] = useState(true); // 是否公开答案
  const [answerPaid, setAnswerPaid] = useState(false); // 是否付费查看
  const [answerPrice, setAnswerPrice] = useState(''); // 查看答案价格

  // 身份选择
  const [publishIdentity, setPublishIdentity] = useState('personal'); // 'personal' or 'team'
  const [selectedTeams, setSelectedTeams] = useState([]); // 选中的团队ID数组

  // 图片选择器状态
  const [showImagePicker, setShowImagePicker] = useState(false);

  // 输入框高度状态
  const [contentInputHeight, setContentInputHeight] = useState(150); // 问题描述输入框高度

  // 话题管理
  const [allTopics, setAllTopics] = useState([]); // 所有可选话题（只包含用户自定义的）
  const [customTopicNames, setCustomTopicNames] = useState([]); // 用户自定义的话题名称列表（不含#，用于发送给后端）

  // 发布状态
  const [isPublishing, setIsPublishing] = useState(false); // 是否正在发布
  const [isUploadingImages, setIsUploadingImages] = useState(false); // 是否正在上传图片

  // 分类数据状态
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState(null);
  const [level1Categories, setLevel1Categories] = useState([]); // 一级分类
  const [level2CategoriesMap, setLevel2CategoriesMap] = useState({}); // 二级分类映射 {parentId: [categories]}
  const [categoryModalView, setCategoryModalView] = useState('level1'); // 'level1' 或 'level2'
  const [tempSelectedLevel1, setTempSelectedLevel1] = useState(null); // 临时选中的一级分类（用于视图切换）
  const [loadingLevel2, setLoadingLevel2] = useState(false); // 二级分类加载状态
  const [level1SearchQuery, setLevel1SearchQuery] = useState(''); // 一级分类搜索关键词
  const [level2SearchQuery, setLevel2SearchQuery] = useState('');
  const [customLevel2Name, setCustomLevel2Name] = useState('');

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [regionStep, setRegionStep] = useState(0);
  const [selectedLocationRegion, setSelectedLocationRegion] = useState({ country: '', city: '', state: '', district: '' });

  // 加载分类数据
  useEffect(() => {
    fetchLevel1Categories();
  }, []);

  // 回显草稿数据
  useEffect(() => {
    if (draftData) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📝 回显草稿数据');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('草稿数据:', JSON.stringify(draftData, null, 2));

      // 基础信息
      if (draftData.title) {
        console.log('  设置标题:', draftData.title);
        setTitle(draftData.title);
      }
      if (draftData.description) {
        console.log('  设置描述:', draftData.description.substring(0, 50) + '...');
        setContent(draftData.description);
      }
      if (typeof draftData.type === 'number') {
        console.log('  设置问题类型:', draftData.type);
        setSelectedType(draftData.type);
      }
      if (draftData.location) {
        console.log('  设置位置:', draftData.location);
        setLocation(draftData.location);
      }
      if (typeof draftData.visibilityScope === 'number') {
        console.log('  设置可见范围:', draftData.visibilityScope);
        setVisibility(draftData.visibilityScope);
      }
      if (typeof draftData.isAnonymous === 'number') {
        console.log('  设置匿名:', draftData.isAnonymous);
        setIsAnonymous(draftData.isAnonymous === 1);
      }
      if (typeof draftData.isPublicAnswer === 'number') {
        console.log('  设置答案公开:', draftData.isPublicAnswer);
        setAnswerPublic(draftData.isPublicAnswer === 1);
      }

      // 悬赏金额（分转元）
      if (draftData.bountyAmount && draftData.bountyAmount > 0) {
        const amount = (draftData.bountyAmount / 100).toString();
        console.log('  设置悬赏金额:', amount, '元');
        if (draftData.type === 2) {
          // 定向问题
          setTargetedReward(amount);
        } else {
          setReward(amount);
        }
      }

      // 付费查看金额（分转元）
      if (draftData.payViewAmount && draftData.payViewAmount > 0) {
        const amount = (draftData.payViewAmount / 100).toString();
        console.log('  设置付费查看金额:', amount, '元');
        setAnswerPaid(true);
        setAnswerPrice(amount);
      }

      // 图片
      console.log('  检查图片数据:');
      console.log('    draftData.imageUrls:', draftData.imageUrls);
      console.log('    是否为数组:', Array.isArray(draftData.imageUrls));
      console.log('    数组长度:', draftData.imageUrls?.length);
      if (draftData.imageUrls && Array.isArray(draftData.imageUrls) && draftData.imageUrls.length > 0) {
        // 过滤掉空字符串和无效的URL
        const validImages = draftData.imageUrls.filter(url => {
          const isValid = url && typeof url === 'string' && url.trim() !== '';
          console.log(`    图片URL: "${url}" - 有效: ${isValid}`);
          return isValid;
        });
        console.log('  过滤后的有效图片数量:', validImages.length);
        if (validImages.length > 0) {
          console.log('  ✅ 设置图片:', validImages.length, '张');
          console.log('  图片URLs:', validImages);
          setImages(validImages);
        } else {
          console.log('  ⚠️ 草稿中的图片URL都是空的，清空图片数组');
          setImages([]);
        }
      } else {
        console.log('  ℹ️ 草稿中没有图片数据，清空图片数组');
        setImages([]);
      }

      // 话题
      if (draftData.topics && Array.isArray(draftData.topics) && draftData.topics.length > 0) {
        const topicNames = draftData.topics.map(t => `#${t.name}`);
        console.log('  设置话题:', topicNames);
        setSelectedTopics(topicNames);
        setAllTopics(topicNames);
        setCustomTopicNames(draftData.topics.map(t => t.name));
      }

      // 专家（定向问题）
      if (draftData.experts && Array.isArray(draftData.experts) && draftData.experts.length > 0) {
        console.log('  设置专家:', draftData.experts.length, '位');
        setTargetedUsers(draftData.experts);
      }

      // 分类（需要等分类数据加载完成后再设置）
      if (draftData.categoryId) {
        console.log('  草稿分类ID:', draftData.categoryId);
        console.log('  等待分类数据加载...');
      }
      console.log('✅ 草稿数据回显完成');
      console.log('═══════════════════════════════════════════════════════════');
    }
  }, [draftData]); // 只依赖 draftData

  // 单独处理分类回显（当分类数据加载完成后）
  useEffect(() => {
    if (!draftData || level1Categories.length === 0) {
      return;
    }

    const categoryId = Number(draftData.categoryId);
    const categoryName = normalizeCustomCategoryName(
      draftData.customCategoryName || draftData.categoryName
    );

    if (!categoryId && !categoryName) {
      return;
    }

    let found = false;
    for (const level1 of level1Categories) {
      if (!level2CategoriesMap[level1.id]) {
        continue;
      }

      const level2List = level2CategoriesMap[level1.id] || [];
      let level2 = null;

      if (categoryId) {
        level2 = level2List.find((cat) => Number(cat.id) === categoryId);
      }

      if (!level2 && categoryName) {
        level2 = level2List.find(
          (cat) => normalizeCustomCategoryName(cat.name) === categoryName
        );
      }

      if (level2) {
        setSelectedLevel1(level1);
        setSelectedLevel2(level2);
        found = true;
        break;
      }
    }

    if (found) {
      return;
    }

    const fallbackLevel1 =
      level1Categories.find((item) => Number(item.id) === categoryId) ||
      level1Categories.find(
        (item) => Number(item.id) === Number(draftData.customCategoryParentId)
      );

    const shouldRestoreCustom =
      Boolean(draftData.customCategoryPending) ||
      Boolean(draftData.customCategoryName) ||
      (!found && Boolean(categoryName) && categoryId > 0);

    if (fallbackLevel1 && categoryName && shouldRestoreCustom) {
      setSelectedLevel1(fallbackLevel1);
      setSelectedLevel2(createCustomLevel2Category(fallbackLevel1, categoryName));
      return;
    }

    level1Categories.forEach((level1) => {
      if (!level2CategoriesMap[level1.id]) {
        fetchLevel2Categories(level1.id);
      }
    });
  }, [draftData, level1Categories, level2CategoriesMap]);

  // 加载一级分类
  const fetchLevel1Categories = async () => {
    setCategoryLoading(true);
    setCategoryError(null);
    try {
      // 请求一级分类，pageSize设置为100，通常足够
      const response = await categoryApi.getCategoryList({
        pageNum: 1,
        pageSize: 100,
        parentId: 0 // 只获取一级分类
      });
      if (response && response.code === 200 && response.data && response.data.rows) {
        // 直接使用返回的数据，因为我们已经通过 parentId=0 参数过滤了
        const categories = response.data.rows.map(cat => {
          return {
            ...cat,
            originalIcon: cat.icon,
            // 保存原始 Font Awesome 图标值
            color: cat.color || getColorForCategory(cat.name)
          };
        });
        setLevel1Categories(categories);
      } else {
        console.error('❌ 接口响应格式异常:', response);
        throw new Error(response?.msg || '获取分类数据失败');
      }
    } catch (error) {
      console.error('❌ 获取一级分类失败:', error);
      setCategoryError(error.message || '获取分类数据失败');
      // 不使用备用数据，保持空数组
      setLevel1Categories([]);
    } finally {
      setCategoryLoading(false);
    }
  };

  // 加载二级分类（按需加载，支持分页）
  const fetchLevel2Categories = async parentId => {
    // 如果已经加载过，直接使用缓存
    if (level2CategoriesMap[parentId]) {
      return;
    }
    setLoadingLevel2(true);
    try {
      // 首次请求，pageSize=100，通常足够
      const response = await categoryApi.getCategoryList({
        pageNum: 1,
        pageSize: 100,
        parentId: parentId // 获取指定一级分类下的二级分类
      });
      if (response && response.code === 200 && response.data && response.data.rows) {
        // 直接使用返回的数据，因为我们已经通过 parentId 参数过滤了
        let allCategories = response.data.rows;
        const total = response.data.total;

        // 如果还有更多数据，继续加载（极少见）
        if (allCategories.length < total) {
          // 计算还需要加载多少页
          const remainingPages = Math.ceil((total - allCategories.length) / 100);

          // 并发加载剩余页
          const remainingPromises = [];
          for (let page = 2; page <= remainingPages + 1; page++) {
            remainingPromises.push(categoryApi.getCategoryList({
              pageNum: page,
              pageSize: 100,
              parentId: parentId
            }));
          }
          const remainingResponses = await Promise.all(remainingPromises);

          // 合并所有数据
          remainingResponses.forEach(res => {
            if (res && res.code === 200 && res.data && res.data.rows) {
              // 直接使用返回的数据，因为我们已经通过 parentId 参数过滤了
              allCategories = [...allCategories, ...res.data.rows];
            }
          });
        }

        // 转换数据格式并缓存
        const parentCategory = level1Categories.find((item) => Number(item.id) === Number(parentId));
        const formattedCategories = allCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          originalIcon: cat.icon,
          // ?????? Font Awesome ?????
          icon: cat.icon,
          color: cat.color || getColorForCategory(cat.name), // ??????
          parentId: Number(parentId),
          parentName: parentCategory?.name || '',
        }));
        setLevel2CategoriesMap(prev => ({
          ...prev,
          [parentId]: formattedCategories
        }));
      } else {
        throw new Error(response?.msg || '获取二级分类失败');
      }
    } catch (error) {
      console.error(`获取二级分类失败 (parentId=${parentId}):`, error);
      // 失败时保持空数组，不使用备用数据
      setLevel2CategoriesMap(prev => ({
        ...prev,
        [parentId]: []
      }));
    } finally {
      setLoadingLevel2(false);
    }
  };

  // 获取要显示的分类数据
  const getDisplayCategoryData = () => {
    return {
      level1: level1Categories,
      // 只使用接口数据，不使用备用数据
      level2: level2CategoriesMap
    };
  };

  // 过滤一级分类（根据搜索关键词）
  const getFilteredLevel1Categories = () => {
    const allCategories = getDisplayCategoryData().level1;
    if (!level1SearchQuery.trim()) {
      return allCategories; // 没有搜索关键词，返回全部
    }
    const query = level1SearchQuery.toLowerCase().trim();
    return allCategories.filter(cat => cat.name.toLowerCase().includes(query) || cat.description && cat.description.toLowerCase().includes(query) || cat.desc && cat.desc.toLowerCase().includes(query));
  };

  const getFilteredLevel2Categories = () => {
    const parentId = Number(tempSelectedLevel1?.id);
    const source = level2CategoriesMap[parentId] || [];
    const query = normalizeCustomCategoryName(level2SearchQuery).toLowerCase();

    const filtered = !query
      ? source
      : source.filter((cat) => {
          const name = normalizeCustomCategoryName(cat?.name).toLowerCase();
          return name.includes(query);
        });

    if (
      isCustomLevel2Category(selectedLevel2) &&
      Number(selectedLevel2?.parentId) === parentId &&
      normalizeCustomCategoryName(selectedLevel2?.name)
    ) {
      const customName = normalizeCustomCategoryName(selectedLevel2.name);
      const customMatched = !query || customName.toLowerCase().includes(query);
      const existed = filtered.some((item) => normalizeCustomCategoryName(item?.name) === customName);
      if (customMatched && !existed) {
        return [selectedLevel2, ...filtered];
      }
    }

    return filtered;
  };

  const selectCustomLevel2 = () => {
    const normalizedName = normalizeCustomCategoryName(customLevel2Name);

    if (!tempSelectedLevel1) {
      showToast(t('publish.selectLevel1'), 'warning');
      return;
    }

    if (!normalizedName) {
      showToast('Please enter a custom subcategory', 'warning');
      return;
    }

    const level2List = level2CategoriesMap[tempSelectedLevel1.id] || [];
    const existedCategory = level2List.find(
      (cat) => normalizeCustomCategoryName(cat.name).toLowerCase() === normalizedName.toLowerCase()
    );

    if (existedCategory) {
      selectLevel2(existedCategory);
      showToast('Subcategory already exists and is selected', 'info');
      return;
    }

    const customCategory = createCustomLevel2Category(tempSelectedLevel1, normalizedName);
    setSelectedLevel1(tempSelectedLevel1);
    setSelectedLevel2(customCategory);
    setCustomLevel2Name('');
    setLevel2SearchQuery('');
    setShowCategoryModal(false);
    setCategoryModalView('level1');
    setTempSelectedLevel1(null);
  };

  // 根据分类名称返回颜色（辅助函数，用于后端没有返回颜色时的降级方案）
  const getColorForCategory = name => {
    const colorMap = {
      // 一级分类
      '国家': '#3b82f6',
      '行业': '#22c55e',
      '个人': '#8b5cf6',
      // 国家相关
      '政策法规': '#3b82f6',
      '社会民生': '#06b6d4',
      '经济发展': '#f59e0b',
      '教育医疗': '#8b5cf6',
      '环境保护': '#10b981',
      '基础设施': '#64748b',
      // 行业相关
      '互联网': '#06b6d4',
      '金融': '#f59e0b',
      '医疗健康': '#10b981',
      '教育培训': '#8b5cf6',
      '房地产': '#ef4444',
      '制造业': '#64748b',
      '餐饮服务': '#f97316',
      // 个人相关
      '职业发展': '#3b82f6',
      '情感生活': '#ec4899',
      '健康养生': '#10b981',
      '理财投资': '#f59e0b',
      '学习成长': '#8b5cf6',
      '家庭关系': '#f97316',
      // 其他
      '政治': '#ef4444',
      '经济': '#f59e0b',
      '文化': '#ec4899',
      '科技': '#06b6d4',
      '教育': '#8b5cf6',
      '医疗': '#10b981',
      '环境': '#84cc16',
      '社会': '#6366f1',
      '法律': '#f97316',
      '军事': '#64748b',
      '外交': '#0ea5e9'
    };
    return colorMap[name] || '#6b7280';
  };
  const toggleTopic = topic => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else if (selectedTopics.length < 3) {
      setSelectedTopics([...selectedTopics, topic]);
    } else {
      showToast(t('publish.toasts.maxTopics'), 'warning');
    }
  };
  const addImage = () => {
    if (images.length >= 9) {
      showToast(t('publish.toasts.maxImages'), 'warning');
      return;
    }
    setShowImagePicker(true);
  };
  const handleImageSelected = imageUri => {
    setImages([...images, imageUri]);
  };
  const addCustomTopic = () => {
    if (!customTopic.trim()) {
      return;
    }

    // 格式化话题：确保有 # 前缀
    const formattedTopic = customTopic.trim().startsWith('#') ? customTopic.trim() : `#${customTopic.trim()}`;
    // 提取话题名称（去掉 # 前缀）
    const topicName = formattedTopic.substring(1);

    // 检查话题是否已经存在于可选列表中
    if (allTopics.includes(formattedTopic)) {
      showToast(t('publish.toasts.topicExists'), 'info');
      setCustomTopic('');
      return;
    }

    // 话题不存在，添加到列表
    setAllTopics([...allTopics, formattedTopic]); // 添加到可选话题列表（带#）
    setCustomTopicNames([...customTopicNames, topicName]); // 添加到自定义话题名称列表（不带#）

    // 自动选中新添加的话题
    if (selectedTopics.length < 3) {
      setSelectedTopics([...selectedTopics, formattedTopic]);
    } else {
      showToast(t('publish.toasts.maxTopics'), 'warning');
    }

    // 清空输入框
    setCustomTopic('');
  };
  const handleSaveDraft = async () => {
    if (!title && !content) {
      showToast(t('publish.toasts.enterContent'), 'warning');
      return;
    }
    try {
      // 构建草稿数据（与发布数据结构相同）
      const effectiveCategoryId = resolveEffectiveCategoryId(selectedLevel1, selectedLevel2);
      const normalizedCategoryName = normalizeCustomCategoryName(selectedLevel2?.name);
      const customCategoryPayload = buildCustomCategoryPayload(selectedLevel1, selectedLevel2);

      const draftData = {
        id: 0,
        // 新建草稿
        type: selectedType,
        // 直接使用数字，不需要映射
        categoryId: effectiveCategoryId || 5,
        categoryName: normalizedCategoryName || '',
        ...customCategoryPayload,
        // 使用选中的分类ID，如果没有则使用默认值5
        title: title.trim() || '',
        description: content.trim() || '',
        subQuestions: '',
        bountyAmount: 5000,
        // 默认悬赏金额
        payViewAmount: answerPaid ? Math.round(parseFloat(answerPrice || 0) * 100) : 0,
        location: location && location !== '不显示' ? location : '北京市朝阳区',
        visibilityScope: visibility,
        // 直接使用数字，不需要映射
        isAnonymous: isAnonymous ? 1 : 0,
        isPublicAnswer: answerPublic ? 1 : 0,
        teamId: publishIdentity === 'team' && selectedTeams.length > 0 ? selectedTeams[0] : 100,
        expertIds: selectedType === 2 && targetedUsers.length > 0 ? targetedUsers.map(u => u.id) : [],
        // 2 = 定向问题
        topicIds: [],
        topicNames: customTopicNames.length > 0 ? customTopicNames : [],
        imageUrls: images.length > 0 ? images : []
      };

      // 设置悬赏金额（根据问题类型）
      if (selectedType === 1 && reward) {
        // 1 = 悬赏问题
        draftData.bountyAmount = Math.round(parseFloat(reward) * 100);
      } else if (selectedType === 2 && targetedReward) {
        // 2 = 定向问题
        draftData.bountyAmount = Math.round(parseFloat(targetedReward) * 100);
      } else if (selectedType === 0 && reward) {
        // 0 = 公开问题
        draftData.bountyAmount = Math.round(parseFloat(reward) * 100);
      }
      console.log('保存草稿数据:', JSON.stringify(draftData, null, 2));
      const response = await questionApi.saveDraft(draftData);
      console.log('保存草稿响应:', response);
      if (response.code === 200) {
        showToast(t('publish.toasts.draftSaved'), 'success');
      } else {
        showToast(response.msg || t('publish.toasts.saveDraftFailed'), 'error');
      }
    } catch (error) {
      console.error('保存草稿失败:', error);
      let errorMessage = t('publish.toasts.networkError');
      if (error.response) {
        errorMessage = error.response.data?.msg || error.response.data?.message || t('publish.toasts.serverError');
      } else if (error.request) {
        errorMessage = t('publish.toasts.requestTimeout');
      } else if (error.message) {
        errorMessage = error.message;
      }
      showToast(errorMessage, 'error');
    }
  };
  const handlePublish = async () => {
    // 调试信息
    console.log('🔍 发布验证开始');
    console.log('🔍 selectedType 原始值检查:');
    console.log('  - selectedType:', selectedType);
    console.log('  - typeof selectedType:', typeof selectedType);
    console.log('  - selectedType === 0:', selectedType === 0);
    console.log('  - selectedType === 1:', selectedType === 1);
    console.log('  - selectedType === 2:', selectedType === 2);
    console.log('  - JSON.stringify(selectedType):', JSON.stringify(selectedType));
    console.log('🔍 title值:', `"${title}"`);
    console.log('🔍 title.trim():', `"${title.trim()}"`);
    console.log('🔍 title.length:', title.length);
    console.log('🔍 selectedLevel1:', selectedLevel1);
    console.log('🔍 selectedLevel2:', selectedLevel2);
    console.log('🔍 content.trim():', `"${content.trim()}"`);

    // 验证问题类型（现在直接是数字，不需要映射）
    console.log('🔍 问题类型验证:');
    console.log('  - selectedType:', selectedType);
    console.log('  - 是否为有效类型:', [0, 1, 2].includes(selectedType));
    // 1. 基础验证
    if (!title.trim()) {
      console.log('❌ 标题验证失败: 标题为空');
      showToast(t('publish.toasts.enterTitle'), 'warning');
      return;
    }
    if (title.trim().length < 5) {
      console.log('❌ 标题验证失败: 标题长度不足5个字');
      showToast(t('publish.toasts.titleTooShort'), 'warning');
      return;
    }
    if (title.trim().length > 50) {
      console.log('❌ 标题验证失败: 标题长度超过50个字');
      showToast(t('publish.toasts.titleTooLong'), 'warning');
      return;
    }
    if (!content.trim()) {
      showToast(t('publish.toasts.enterDescription'), 'warning');
      return;
    }
    if (!selectedLevel1 || !selectedLevel2) {
      console.log('❌ 分类验证失败: selectedLevel1=', selectedLevel1, 'selectedLevel2=', selectedLevel2);
      showToast(t('publish.selectCategory'), 'warning');
      return;
    }

    // 2. 验证悬赏问题金额
    if (selectedType === 1) {
      // 1 = 悬赏问题
      const amount = parseFloat(reward);
      if (isNaN(amount) || amount < 1) {
        showToast(t('publish.toasts.rewardTooLow'), 'warning');
        return;
      }
    }

    // 3. 验证定向问题
    if (selectedType === 2) {
      // 2 = 定向问题
      if (targetedUsers.length === 0) {
        showToast(t('publish.toasts.inviteAtLeastOne'), 'warning');
        return;
      }
      // 定向问题的悬赏金额可以是$0或任意金额，不需要验证最小值
    }

    // 4. 验证付费查看答案
    if (answerPaid && (!answerPrice || parseFloat(answerPrice) < 1)) {
      showToast(t('publish.toasts.setPaidPrice'), 'warning');
      return;
    }

    // 5. 验证团队身份
    if (publishIdentity === 'team' && selectedTeams.length === 0) {
      showToast(t('publish.toasts.selectTeam'), 'warning');
      return;
    }

    const effectiveCategoryId = resolveEffectiveCategoryId(selectedLevel1, selectedLevel2);
    if (!effectiveCategoryId) {
      showToast(t('publish.selectCategory'), 'warning');
      return;
    }

    const normalizedCategoryName = normalizeCustomCategoryName(selectedLevel2?.name);
    const customCategoryPayload = buildCustomCategoryPayload(selectedLevel1, selectedLevel2);

    try {
      setIsPublishing(true);

      // 6. 上传图片（如果有）
      let imageUrls = [];
      if (images.length > 0) {
        setIsUploadingImages(true);
        try {
          for (const imageUri of images) {
            const result = await uploadApi.uploadImage({
              uri: imageUri,
              name: `question_${Date.now()}_${Math.random()}.jpg`,
              type: 'image/jpeg'
            });
            if (result.code === 200 && result.data) {
              imageUrls.push(result.data);
            }
          }
        } catch (uploadError) {
          console.error('图片上传失败:', uploadError);
          showToast(t('publish.toasts.imageUploadFailed'), 'error');
          return;
        } finally {
          setIsUploadingImages(false);
        }
      }

      // 7. 构建请求数据
      // 🧪 临时测试：使用简化的数据结构来排查500错误
      const useMinimalData = false; // 设置为 true 使用简化数据，false 使用完整数据

      let requestData;
      if (useMinimalData) {
        // 简化的数据结构，只包含最基本的字段
        requestData = {
          id: 0,
          type: selectedType,
          // 直接使用数字，不需要映射
          categoryId: effectiveCategoryId,
          categoryName: normalizedCategoryName || '',
          ...customCategoryPayload,
          title: title.trim(),
          description: content.trim() || '',
          subQuestions: '[]',
          // JSON 字符串格式的空数组
          bountyAmount: selectedType === 1 && reward ? Math.round(parseFloat(reward) * 100) : 0,
          // 1 = 悬赏问题
          payViewAmount: 0,
          location: location || '',
          visibilityScope: 0,
          isAnonymous: 0,
          isPublicAnswer: 1,
          teamId: 100,
          // 使用一个默认的有效团队ID
          expertIds: [],
          topicIds: [],
          topicNames: [],
          imageUrls: []
        };
        console.log('🧪 使用简化数据结构进行测试');
        console.log('🧪 问题类型: selectedType =', selectedType);
      } else {
        // 完整的数据结构
        requestData = {
          // 基础必填字段
          id: 0,
          // 新建问题
          type: selectedType,
          // 直接使用数字，不需要映射
          categoryId: effectiveCategoryId,
          categoryName: normalizedCategoryName || '',
          ...customCategoryPayload,
          // 必填，使用选中的二级分类ID
          title: title.trim(),
          // 确保去除首尾空格
          description: content.trim() || '',
          // 子问题（JSON 字符串格式的数组）
          subQuestions: '[]',
          // 悬赏金额（单位：分，需要转换）
          bountyAmount: 0,
          // 付费查看金额（单位：分）
          payViewAmount: answerPaid ? Math.round(parseFloat(answerPrice || 0) * 100) : 0,
          // 位置信息
          location: location && location !== '不显示' ? location : '北京市朝阳区',
          // 可见范围：0=所有人，1=仅关注我的人，2=仅自己
          visibilityScope: visibility,
          // 直接使用数字，不需要映射

          // 是否匿名：0=不匿名，1=匿名
          isAnonymous: isAnonymous ? 1 : 0,
          // 是否公开答案：0=不公开，1=公开
          isPublicAnswer: answerPublic ? 1 : 0,
          // 团队ID（以团队身份发布时才添加）
          teamId: publishIdentity === 'team' && selectedTeams.length > 0 ? selectedTeams[0] : 100,
          // 专家ID列表（仅定向问题且有选择专家时才添加）
          expertIds: selectedType === 2 && targetedUsers.length > 0 ? targetedUsers.map(u => u.id) : [],
          // 2 = 定向问题

          // 话题ID列表（已有话题）
          topicIds: [],
          // 话题名称列表（用户自定义的话题）
          topicNames: customTopicNames.length > 0 ? customTopicNames : [],
          // 图片URL列表
          imageUrls: imageUrls.length > 0 ? imageUrls : []
        };
        console.log('📦 使用完整数据结构');
        console.log('📦 问题类型: selectedType =', selectedType);
      }

      // 8. 设置悬赏金额（根据问题类型）
      if (selectedType === 1 && reward) {
        // 1 = 悬赏问题
        // 悬赏问题：使用 reward 字段的金额，转换为分
        requestData.bountyAmount = Math.round(parseFloat(reward) * 100);
      } else if (selectedType === 2 && targetedReward) {
        // 2 = 定向问题
        // 定向问题：使用 targetedReward 字段的金额，转换为分
        requestData.bountyAmount = Math.round(parseFloat(targetedReward) * 100);
      } else if (selectedType === 0 && reward) {
        // 0 = 公开问题
        // 公开问题：如果设置了悬赏金额，也转换为分
        requestData.bountyAmount = Math.round(parseFloat(reward) * 100);
      } else {
        // 默认悬赏金额
        requestData.bountyAmount = 5000;
      }

      // 9. 调用发布接口
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📤 发布问题 - 完整请求数据');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(JSON.stringify(requestData, null, 2));
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📤 请求数据字段验证:');
      console.log('  ✓ title:', `"${requestData.title}" (长度: ${requestData.title.length})`);
      console.log('  ✓ categoryId:', requestData.categoryId);
      console.log('  ✓ type:', requestData.type, `(类型: ${typeof requestData.type})`);
      console.log('  ✓ description:', `"${requestData.description.substring(0, 50)}..." (长度: ${requestData.description.length})`);
      console.log('  ✓ bountyAmount:', requestData.bountyAmount, '分');
      console.log('  ✓ location:', requestData.location);
      console.log('  ✓ visibilityScope:', requestData.visibilityScope);
      console.log('  ✓ isAnonymous:', requestData.isAnonymous);
      console.log('  ✓ isPublicAnswer:', requestData.isPublicAnswer);
      console.log('  ✓ teamId:', requestData.teamId);
      console.log('  ✓ expertIds:', requestData.expertIds);
      console.log('  ✓ imageUrls:', requestData.imageUrls);
      console.log('═══════════════════════════════════════════════════════════');
      const response = await questionApi.publishQuestion(requestData);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📥 发布问题 - 服务器响应');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(JSON.stringify(response, null, 2));
      console.log('═══════════════════════════════════════════════════════════');

      // 10. 处理响应
      if (response.code === 200) {
        // 显示成功提示
        showToast(t('publish.toasts.publishSuccess'), 'success', 2000);

        // 清空表单
        setTitle('');
        setContent('');
        setSelectedType(0); // 重置为公开问题
        setReward('');
        setTargetedReward('');
        setTargetedUsers([]);
        setSelectedTopics([]);
        setCustomTopicNames([]); // 清空自定义话题名称
        setImages([]);
        setSelectedLevel1(null);
        setSelectedLevel2(null);
        setIsAnonymous(false);
        setAnswerPublic(true);
        setAnswerPaid(false);
        setAnswerPrice('');

        // 延迟返回上一页，让用户看到成功提示
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      } else {
        showToast(response.msg || t('publish.toasts.publishFailed'), 'error');
      }
    } catch (error) {
      console.error('发布问题失败:', error);

      // 处理不同类型的错误
      let errorMessage = t('publish.toasts.networkError');
      if (error.response) {
        // 服务器返回了错误响应
        console.error('服务器错误响应:', error.response.data);

        // 优先使用服务器返回的具体错误信息
        if (error.response.data?.msg) {
          errorMessage = error.response.data.msg;
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = t('publish.toasts.serverError');
        }

        // 特别处理验证错误
        if (error.response.status === 400) {
          console.error('❌ 验证错误 - 检查请求数据:');
          console.error('   请求的title:', title);
          console.error('   请求的categoryId:', selectedLevel2?.id);
          console.error('   请求的type:', selectedType);
        }
      } else if (error.request) {
        // 请求已发出但没有收到响应
        errorMessage = t('publish.toasts.requestTimeout');
      } else if (error.message) {
        // 其他错误
        errorMessage = error.message;
      }
      showToast(errorMessage, 'error');
    } finally {
      setIsPublishing(false);
      setIsUploadingImages(false);
    }
  };
  const handleLocationPress = () => {
    setShowLocationModal(true);
    setRegionStep(0);
  };
  
  const getLocationRegionOptions = () => {
    if (regionStep === 0) return regionData.countries;
    if (regionStep === 1) return regionData.cities[selectedLocationRegion.country] || [];
    if (regionStep === 2) return regionData.states[selectedLocationRegion.city] || [];
    if (regionStep === 3) return regionData.districts[selectedLocationRegion.state] || [];
    return [];
  };
  
  const selectLocationRegion = (value) => {
    if (regionStep === 0) {
      setSelectedLocationRegion({ ...selectedLocationRegion, country: value, city: '', state: '', district: '' });
      if (regionData.cities[value] && regionData.cities[value].length > 0) {
        setRegionStep(1);
      }
    } else if (regionStep === 1) {
      setSelectedLocationRegion({ ...selectedLocationRegion, city: value, state: '', district: '' });
      if (regionData.states[value] && regionData.states[value].length > 0) {
        setRegionStep(2);
      }
    } else if (regionStep === 2) {
      setSelectedLocationRegion({ ...selectedLocationRegion, state: value, district: '' });
      if (regionData.districts[value] && regionData.districts[value].length > 0) {
        setRegionStep(3);
      }
    } else {
      setSelectedLocationRegion({ ...selectedLocationRegion, district: value });
    }
  };
  
  const confirmLocationSelection = () => {
    const parts = [selectedLocationRegion.country, selectedLocationRegion.city, selectedLocationRegion.state, selectedLocationRegion.district].filter(Boolean);
    const locationText = parts.join(' ');
    setLocation(locationText);
    setShowLocationModal(false);
    setRegionStep(0);
  };
  
  const handleLocationSelect = city => {
    setLocation(city);
  };
  const handleLocationClose = () => {
    setShowLocationModal(false);
  };
  const handleVisibilityPress = () => {
    setShowVisibilityModal(true);
  };
  const getVisibilityText = value => {
    switch (value) {
      case 0:
        return t('publish.visibility.everyone');
      case 1:
        return t('publish.visibility.followers');
      case 2:
        return t('publish.visibility.onlyMe');
      default:
        return t('publish.visibility.everyone');
    }
  };
  const selectVisibility = value => {
    setVisibility(value);
    setShowVisibilityModal(false);
  };
  const toggleTargetedUser = user => {
    if (targetedUsers.find(u => u.id === user.id)) {
      setTargetedUsers(targetedUsers.filter(u => u.id !== user.id));
    } else if (targetedUsers.length < 5) {
      setTargetedUsers([...targetedUsers, user]);
    } else {
      showToast(t('publish.toasts.maxExperts'), 'warning');
    }
  };
  const removeTargetedUser = userId => {
    setTargetedUsers(targetedUsers.filter(u => u.id !== userId));
  };

  /**
   * 加载专家列表
   * @param {boolean} isLoadMore - 是否是加载更多
   */
  const loadExpertList = async (isLoadMore = false) => {
    // 如果正在加载或没有更多数据，则不重复加载
    if (expertLoading || isLoadMore && !expertHasMore) {
      return;
    }
    try {
      if (isLoadMore) {
        setExpertLoadingMore(true);
      } else {
        setExpertLoading(true);
        setExpertPageNum(1);
      }
      const pageNum = isLoadMore ? expertPageNum + 1 : 1;

      // 根据选中的分类筛选专家
      const params = {
        pageNum,
        pageSize: expertPageSize
      };

      const effectiveCategoryId = resolveEffectiveCategoryId(selectedLevel1, selectedLevel2);
      if (effectiveCategoryId) {
        params.categoryId = effectiveCategoryId;
      }
      const response = await expertApi.getExpertList(params);
      console.log('✅ 专家列表响应:', response);
      if (response.code === 200 && response.data) {
        const {
          total,
          rows
        } = response.data;
        console.log(`📊 专家数据: total=${total}, rows.length=${rows?.length || 0}`);
        if (isLoadMore) {
          setExpertList([...expertList, ...rows]);
          setExpertPageNum(pageNum);
        } else {
          setExpertList(rows);
          setExpertPageNum(1);
        }
        setExpertTotal(total);
        setExpertHasMore(rows.length === expertPageSize);
      } else {
        console.warn('⚠️ 专家列表响应异常:', response);
      }
    } catch (error) {
      console.error('❌ 加载专家列表失败:', error);
      showToast(t('publish.toasts.loadExpertsFailed') || 'Failed to load experts', 'error');
    } finally {
      setExpertLoading(false);
      setExpertLoadingMore(false);
    }
  };

  /**
   * 加载更多专家
   */
  const loadMoreExperts = () => {
    if (!expertLoadingMore && expertHasMore) {
      loadExpertList(true);
    }
  };

  // 当选择定向问题类型或分类变化时，重新加载专家列表
  useEffect(() => {
    const effectiveCategoryId = resolveEffectiveCategoryId(selectedLevel1, selectedLevel2);

    if (selectedType === 2 && effectiveCategoryId) {
      // 2 = ??????
      loadExpertList(false);
    } else if (selectedType === 2 && !effectiveCategoryId) {
      // 2 = ??????
      // ???????????????????????????????????
      setExpertList([]);
      setExpertTotal(0);
    }
  }, [selectedType, selectedLevel1, selectedLevel2]);

  // 过滤专家列表（本地搜索）
  const filteredExperts = expertList.filter(user => user.nickname.toLowerCase().includes(expertSearchQuery.toLowerCase()) || user.categories && user.categories.some(cat => cat.name.toLowerCase().includes(expertSearchQuery.toLowerCase())));
  const selectLevel1 = async cat => {
    setTempSelectedLevel1(cat);
    setCategoryModalView('level2'); // ??????????????
    setLevel2SearchQuery('');
    setCustomLevel2Name('');

    // ????????????
    await fetchLevel2Categories(cat.id);
  };
  const selectLevel2 = cat => {
    setSelectedLevel1(tempSelectedLevel1); // ?????????????
    setSelectedLevel2(cat); // ?????????
    setShowCategoryModal(false); // ??????
    setCategoryModalView('level1'); // ??????
    setTempSelectedLevel1(null); // ?????????
    setLevel1SearchQuery('');
    setLevel2SearchQuery('');
    setCustomLevel2Name('');
  };
  const backToLevel1 = () => {
    setCategoryModalView('level1');
    setTempSelectedLevel1(null);
    setLevel2SearchQuery('');
    setCustomLevel2Name('');
  };
  const handleCategoryModalClose = () => {
    setShowCategoryModal(false);
    setCategoryModalView('level1');
    setTempSelectedLevel1(null);
    setLevel1SearchQuery(''); // ???????????
    setLevel2SearchQuery('');
    setCustomLevel2Name('');
  };
  const getCategoryDisplay = () => {
    if (selectedLevel1 && selectedLevel2) {
      return `${selectedLevel1.name} > ${selectedLevel2.name}`;
    }
    return t('publish.selectCategory');
  };
  return <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardDismissView>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={{
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }} activeOpacity={0.7}>
          <Ionicons name="close" size={28} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('publish.title')}</Text>
        <TouchableOpacity onPress={handleSaveDraft} style={styles.saveDraftBtn} hitSlop={{
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }} activeOpacity={0.7}>
          <Text style={styles.saveDraft}>{t('publish.saveDraft')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, {
        paddingBottom: bottomSafeInset + 16
      }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* 问题类型选择 */}
        <View style={[styles.section, {
        marginBottom: 16
      }]}>
          <Text style={styles.sectionTitle}>{t('publish.selectQuestionType')}</Text>
          <View style={styles.typeList}>
            {questionTypes.map(type => <TouchableOpacity key={type.id} style={[styles.typeCard, selectedType === type.id && styles.typeCardActive]} onPress={() => setSelectedType(type.id)}>
                <Ionicons name={type.icon} size={24} color={selectedType === type.id ? type.color : '#9ca3af'} />
                <Text style={[styles.typeName, selectedType === type.id && {
              color: type.color
            }]}>{t(type.nameKey)}</Text>
                <Text style={styles.typeDesc}>{t(type.descKey)}</Text>
              </TouchableOpacity>)}
          </View>
        </View>

        {/* 地区选择 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>地区</Text>
          <TouchableOpacity style={styles.categorySelector} onPress={handleLocationPress}>
            <View style={styles.categorySelectorLeft}>
              <Text style={[styles.categorySelectorText, !location && {
              color: '#9ca3af'
            }]}>
                {location || '您的问题属于的地区'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* 问题类别选择 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('publish.category')} <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity
            testID="publish-category-selector"
            style={styles.categorySelector}
            onPress={() => setShowCategoryModal(true)}
          >
            <View style={styles.categorySelectorLeft}>
              {Boolean(selectedLevel1) && <View style={[styles.categoryIcon, {
              backgroundColor: selectedLevel1.color + '20'
            }]}>
                  <CategoryIcon icon={selectedLevel1.originalIcon || selectedLevel1.icon} size={18} color={selectedLevel1.color} />
                </View>}
              <Text style={[styles.categorySelectorText, !selectedLevel1 && {
              color: '#9ca3af'
            }]}>
                {getCategoryDisplay()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* 公开问题 - 悬赏金额 */}
        {selectedType === 0 &&
      // 0 = 公开问题
      <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('publish.setRewardAmount')}</Text>
            <Text style={styles.sectionDesc}>{t('publish.rewardDesc')}</Text>
            <View style={styles.quickAmounts}>
              {rewardAmounts.map(amount => <TouchableOpacity key={amount} style={[styles.amountBtn, reward === String(amount) && styles.amountBtnActive]} onPress={() => setReward(String(amount))}>
                  <Text style={[styles.amountText, reward === String(amount) && styles.amountTextActive]}>${amount}</Text>
                </TouchableOpacity>)}
            </View>
            <View style={styles.customAmount}>
              <Text style={styles.customLabel}>{t('publish.customAmount')}</Text>
              <TextInput style={styles.customInput} placeholder={t('publish.enterAmount')} keyboardType="numeric" value={reward} onChangeText={text => {
            // 只允许输入数字和小数点
            const filtered = text.replace(/[^0-9.]/g, '');
            setReward(filtered);
          }} />
              <Text style={styles.currencySymbol}>$</Text>
            </View>
          </View>}

        {/* 悬赏金额 */}
        {selectedType === 1 &&
      // 1 = 悬赏问题
      <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('publish.setRewardAmount')} <Text style={styles.required}>*</Text></Text>
            <Text style={styles.sectionDesc}>{t('publish.rewardDescRequired')}</Text>
            <View style={styles.quickAmounts}>
              {rewardAmounts.map(amount => <TouchableOpacity key={amount} style={[styles.amountBtn, reward === String(amount) && styles.amountBtnActive]} onPress={() => setReward(String(amount))}>
                  <Text style={[styles.amountText, reward === String(amount) && styles.amountTextActive]}>${amount}</Text>
                </TouchableOpacity>)}
            </View>
            <View style={styles.customAmount}>
              <Text style={styles.customLabel}>{t('publish.customAmount')}</Text>
              <TextInput style={styles.customInput} placeholder={t('publish.enterAmountMin')} keyboardType="numeric" value={reward} onChangeText={text => {
            // 只允许输入数字和小数点
            const filtered = text.replace(/[^0-9.]/g, '');
            setReward(filtered);
          }} />
              <Text style={styles.currencySymbol}>$</Text>
            </View>
          </View>}

        {/* 定向问题 - 邀请专家 */}
        {selectedType === 2 &&
      // 2 = 定向问题
      <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('publish.inviteExperts')} <Text style={styles.required}>*</Text></Text>
              <Text style={styles.sectionDesc}>{t('publish.inviteExpertsDesc')}</Text>
              
              {/* 已选择的专家 */}
              {targetedUsers.length > 0 && <View style={styles.selectedUsersContainer}>
                  {targetedUsers.map(user => <View key={user.id} style={styles.selectedUserChip}>
                      <View style={styles.selectedUserInfo}>
                        <Image source={{
                  uri: user.avatar
                }} style={styles.selectedUserAvatar} />
                        <Text style={styles.selectedUserName}>{user.nickname}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeTargetedUser(user.id)} style={{
                marginLeft: 6
              }}>
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>)}
                </View>}

              {/* 搜索框 */}
              <View style={styles.expertSearchContainer}>
                <Ionicons name="search" size={20} color="#9ca3af" />
                <TextInput style={styles.expertSearchInput} placeholder={t('publish.searchExperts')} value={expertSearchQuery} onChangeText={setExpertSearchQuery} placeholderTextColor="#9ca3af" />
                {expertSearchQuery.length > 0 && <TouchableOpacity onPress={() => setExpertSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#9ca3af" />
                  </TouchableOpacity>}
              </View>

              {/* 可选择的专家列表 */}
              <View style={styles.expertListContainer}>
                {/* 推荐标题 */}
                <View style={styles.recommendedHeader}>
                  <Ionicons name="star" size={18} color="#f59e0b" style={{
                marginRight: 6
              }} />
                  <Text style={styles.recommendedHeaderText}>{t('publish.recommendedExperts')} ({expertTotal})</Text>
                </View>

                {/* 专家列表 */}
                {expertLoading && expertList.length === 0 ? <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>{t('publish.loadingExperts')}</Text>
                  </View> : filteredExperts.length > 0 ? <FlatList data={filteredExperts} keyExtractor={item => item.id.toString()} renderItem={({
              item: user
            }) => {
              const isSelected = targetedUsers.find(u => u.id === user.id);
              return <TouchableOpacity style={[styles.expertItem, isSelected && styles.expertItemSelected]} onPress={() => toggleTargetedUser(user)}>
                          <Image source={{
                  uri: user.avatar
                }} style={styles.expertAvatarImage} />
                          <View style={styles.expertInfo}>
                            <View style={styles.expertNameRow}>
                              <Text style={styles.expertName}>{user.nickname}</Text>
                              <Ionicons name="checkmark-circle" size={16} color="#3b82f6" style={{
                      marginLeft: 4
                    }} />
                            </View>
                            {Boolean(user.categories && user.categories.length > 0) && <View style={styles.expertCategoriesRow}>
                                {user.categories.slice(0, 2).map((cat, idx) => <View key={cat.id} style={styles.expertFieldTag}>
                                    <Text style={styles.expertFieldText}>{cat.name}</Text>
                                  </View>)}
                                {user.categories.length > 2 && <Text style={styles.expertMoreCategories}>+{user.categories.length - 2}</Text>}
                              </View>}
                          </View>
                          {Boolean(isSelected) && <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />}
                        </TouchableOpacity>;
            }} onEndReached={loadMoreExperts} onEndReachedThreshold={0.5} ListFooterComponent={() => {
              if (expertLoadingMore) {
                return <View style={styles.loadingMoreContainer}>
                            <ActivityIndicator size="small" color="#3b82f6" />
                            <Text style={styles.loadingMoreText}>{t('publish.loadingMore')}</Text>
                          </View>;
              }
              if (!expertHasMore && expertList.length > 0) {
                return <View style={styles.noMoreContainer}>
                            <Text style={styles.noMoreText}>{t('publish.noMoreExperts')}</Text>
                          </View>;
              }
              return null;
            }} scrollEnabled={false} nestedScrollEnabled={true} style={styles.expertFlatList} /> : <View style={styles.noResultsContainer}>
                    <Ionicons name="search-outline" size={48} color="#d1d5db" />
                    <Text style={styles.noResultsText}>
                      {expertSearchQuery ? t('publish.noExpertsFound') : !selectedLevel2?.id ? t('publish.selectCategoryFirst') : t('publish.noCategoryExperts')}
                    </Text>
                    <Text style={styles.noResultsHint}>
                      {expertSearchQuery ? t('publish.noExpertsHint') : !selectedLevel2?.id ? t('publish.selectCategoryFirst') + '后可查看该领域的专家' : t('publish.tryCategoryHint')}
                    </Text>
                  </View>}
              </View>
            </View>

            {/* 定向问题悬赏金额 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('publish.setRewardAmount')}</Text>
              <Text style={styles.sectionDesc}>{t('publish.rewardDesc')}</Text>
              <View style={styles.quickAmounts}>
                {rewardAmounts.map(amount => <TouchableOpacity key={amount} style={[styles.amountBtn, targetedReward === String(amount) && styles.amountBtnActive]} onPress={() => setTargetedReward(String(amount))}>
                    <Text style={[styles.amountText, targetedReward === String(amount) && styles.amountTextActive]}>${amount}</Text>
                  </TouchableOpacity>)}
              </View>
              <View style={styles.customAmount}>
                <Text style={styles.customLabel}>{t('publish.customAmount')}</Text>
                <TextInput style={styles.customInput} placeholder={t('publish.enterAmount')} keyboardType="numeric" value={targetedReward} onChangeText={text => {
              // 只允许输入数字和小数点
              const filtered = text.replace(/[^0-9.]/g, '');
              setTargetedReward(filtered);
            }} />
                <Text style={styles.currencySymbol}>$</Text>
              </View>
            </View>
          </>}

        {/* 问题标题 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('publish.questionTitle')} <Text style={styles.required}>*</Text></Text>
          <TextInput
            testID="publish-title-input"
            style={styles.titleInput}
            placeholder={t('publish.titlePlaceholder')}
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />
          <Text style={styles.charCount}>{title.length}/50</Text>
        </View>

        {/* 问题描述 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('publish.questionDescription')} <Text style={styles.required}>*</Text></Text>
          <TextInput
            testID="publish-content-input"
            style={[styles.contentInput, {
          height: Math.max(150, contentInputHeight)
        }]} placeholder={t('publish.descriptionPlaceholder')} placeholderTextColor="#9ca3af" value={content} onChangeText={setContent} multiline textAlignVertical="top" maxLength={2000} onContentSizeChange={event => {
          setContentInputHeight(event.nativeEvent.contentSize.height);
        }} />
          <Text style={styles.charCount}>{content.length}/2000</Text>
        </View>

        {/* 添加图片 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('publish.addImages')}</Text>
          <View style={styles.imageGrid}>
            {images.map((img, idx) => <View key={idx} style={styles.imageItem}>
                <View style={styles.imageItemInner}>
                  <Image source={{
                uri: img
              }} style={styles.imagePreview} />
                </View>
                <TouchableOpacity style={styles.removeImage} onPress={() => setImages(images.filter((_, i) => i !== idx))}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>)}
            {images.length < 9 && <View style={styles.addImageBtn}>
                <TouchableOpacity style={styles.addImageBtnInner} onPress={addImage}>
                  <Ionicons name="add" size={24} color="#9ca3af" />
                  <Text style={styles.addImageText}>{t('publish.addImage')}</Text>
                </TouchableOpacity>
              </View>}
          </View>
        </View>

        {/* 选择话题 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('publish.selectTopics')}</Text>
          <View style={styles.topicList}>
            {allTopics.map(topic => <TouchableOpacity key={topic} style={[styles.topicTag, selectedTopics.includes(topic) && styles.topicTagActive]} onPress={() => toggleTopic(topic)}>
                <Text style={[styles.topicTagText, selectedTopics.includes(topic) && styles.topicTagTextActive]}>{topic}</Text>
              </TouchableOpacity>)}
          </View>
          <View style={styles.customTopic}>
            <TextInput style={styles.customTopicInput} placeholder={t('publish.customTopic')} value={customTopic} onChangeText={setCustomTopic} onSubmitEditing={addCustomTopic} returnKeyType="done" />
            <TouchableOpacity style={styles.addTopicBtn} onPress={addCustomTopic}>
              <Text style={styles.addTopicBtnText}>{t('publish.addTopic')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 答案设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('publish.answerSettings')}</Text>
          
          {/* 是否公开答案 */}
          <View style={styles.answerSettingItem}>
            <View style={styles.answerSettingLeft}>
              <Ionicons name="eye-outline" size={22} color="#3b82f6" />
              <View style={styles.answerSettingText}>
                <Text style={styles.answerSettingTitle}>{t('publish.publicAnswer')}</Text>
                <Text style={styles.answerSettingDesc}>{t('publish.publicAnswerDesc')}</Text>
              </View>
            </View>
            <Switch value={answerPublic} onValueChange={setAnswerPublic} trackColor={{
            false: '#e5e7eb',
            true: '#bfdbfe'
          }} thumbColor={answerPublic ? '#3b82f6' : '#fff'} />
          </View>

          {/* 付费查看答案 */}
          {Boolean(answerPublic) && <View style={styles.answerSettingItem}>
              <View style={styles.answerSettingLeft}>
                <Ionicons name="cash-outline" size={22} color="#f59e0b" />
                <View style={styles.answerSettingText}>
                  <Text style={styles.answerSettingTitle}>{t('publish.paidView')}</Text>
                  <Text style={styles.answerSettingDesc}>{t('publish.paidViewDesc')}</Text>
                </View>
              </View>
              <Switch value={answerPaid} onValueChange={setAnswerPaid} trackColor={{
            false: '#e5e7eb',
            true: '#fef3c7'
          }} thumbColor={answerPaid ? '#f59e0b' : '#fff'} />
            </View>}

          {/* 查看价格设置 */}
          {Boolean(answerPublic && answerPaid) && <View style={styles.answerPriceContainer}>
              <Text style={styles.answerPriceLabel}>{t('publish.viewPrice')}</Text>
              <View style={styles.answerPriceInput}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput style={styles.priceInput} placeholder={t('publish.setPriceDesc')} keyboardType="numeric" value={answerPrice} onChangeText={setAnswerPrice} placeholderTextColor="#9ca3af" />
              </View>
              <Text style={styles.answerPriceHint}>{t('publish.priceSuggestion')}</Text>
            </View>}

          {/* 私密答案提示 */}
          {!answerPublic && <View style={styles.privateAnswerTip}>
              <Ionicons name="lock-closed" size={16} color="#6b7280" style={{
            marginRight: 8
          }} />
              <Text style={styles.privateAnswerText}>{t('publish.privateAnswerTip')}</Text>
            </View>}
        </View>

        {/* 更多设置 */}
        <View style={styles.settingsSection}>
          <TouchableOpacity style={styles.settingItem} onPress={handleLocationPress}>
            <Ionicons name="location-outline" size={20} color="#9ca3af" />
            <Text style={styles.settingLabel}>{t('publish.addLocation')}</Text>
            <Text style={styles.settingValue}>{location}</Text>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleVisibilityPress}>
            <Ionicons name="eye-outline" size={20} color="#9ca3af" />
            <Text style={styles.settingLabel}>{t('publish.whoCanSee')}</Text>
            <Text style={styles.settingValue}>{getVisibilityText(visibility)}</Text>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
          </TouchableOpacity>
          <View style={styles.settingItem}>
            <Ionicons name="person-outline" size={20} color="#9ca3af" />
            <Text style={styles.settingLabel}>{t('publish.anonymous')}</Text>
            <Switch value={isAnonymous} onValueChange={setIsAnonymous} trackColor={{
            false: '#e5e7eb',
            true: '#fecaca'
          }} thumbColor={isAnonymous ? '#ef4444' : '#fff'} />
          </View>
        </View>

        {/* 身份选择器 */}
        <View style={styles.section}>
          <IdentitySelector selectedIdentity={publishIdentity} selectedTeams={selectedTeams} onIdentityChange={setPublishIdentity} onTeamsChange={setSelectedTeams} />
        </View>

        {/* 发布按钮 */}
        <TouchableOpacity
          testID="publish-submit-button"
          style={[styles.publishBtn, (!title || !content || !selectedLevel2 || isPublishing) && styles.publishBtnDisabled]}
          onPress={handlePublish}
          disabled={isPublishing}
        >
          {isPublishing ? <View style={{
          flexDirection: 'row',
          alignItems: 'center'
        }}>
              <ActivityIndicator size="small" color="#fff" style={{
            marginRight: 8
          }} />
              <Text style={styles.publishBtnText}>
                {isUploadingImages ? t('publish.uploadingImages') : t('publish.publishing')}
              </Text>
            </View> : <Text style={styles.publishBtnText}>发布问题</Text>}
        </TouchableOpacity>
        <View style={{
        height: 30
      }} />
      </ScrollView>

      {/* 问题类别选择弹窗 */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.categoryModal}>
            <View style={styles.modalHeader}>
              {categoryModalView === 'level2' ? <TouchableOpacity onPress={backToLevel1} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity> : <TouchableOpacity onPress={handleCategoryModalClose}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>}
              <Text style={styles.modalTitle}>
                {categoryModalView === 'level1' ? t('publish.selectLevel1') : tempSelectedLevel1?.name}
              </Text>
              <View style={{
              width: 24
            }} />
            </View>

            {categoryLoading ? <View style={styles.categoryLoadingContainer}>
                <ActivityIndicator size="large" color="#ef4444" />
                <Text style={styles.categoryLoadingText}>{t('publish.loadingCategories')}</Text>
              </View> : categoryError ? <View style={styles.categoryErrorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text style={styles.categoryErrorText}>{t('publish.loadFailed')}</Text>
                <Text style={styles.categoryErrorDesc}>{categoryError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchLevel1Categories}>
                  <Ionicons name="refresh" size={20} color="#fff" style={{
                marginRight: 6
              }} />
                  <Text style={styles.retryBtnText}>{t('publish.retry')}</Text>
                </TouchableOpacity>
              </View> : <ScrollView style={styles.categoryContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
                {categoryModalView === 'level1' ? (/* 视图1：一级分类列表 */
            <View style={styles.level1Container}>
                    <Text style={styles.levelTitle}>{t('publish.selectLevel1')}</Text>
                    
                    {/* 搜索框 */}
                    <View style={styles.level1SearchContainer}>
                      <Ionicons name="search" size={20} color="#9ca3af" />
                      <TextInput style={styles.level1SearchInput} placeholder={t('publish.searchCategories')} value={level1SearchQuery} onChangeText={setLevel1SearchQuery} placeholderTextColor="#9ca3af" />
                      {level1SearchQuery.length > 0 && <TouchableOpacity onPress={() => setLevel1SearchQuery('')}>
                          <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>}
                    </View>
                    
                    {/* 分类列表 */}
                    {getFilteredLevel1Categories().length > 0 ? getFilteredLevel1Categories().map(cat => <TouchableOpacity key={cat.id} testID={`publish-level1-item-${cat.id}`} style={styles.level1Item} onPress={() => selectLevel1(cat)} activeOpacity={0.7}>
                          <View style={[styles.level1Icon, {
                  backgroundColor: cat.color + '20'
                }]}>
                            <CategoryIcon icon={cat.originalIcon || cat.icon} size={20} color={cat.color} />
                          </View>
                          <View style={styles.level1Info}>
                            <Text style={styles.level1Name}>{cat.name}</Text>
                            <Text style={styles.level1Desc}>{cat.desc || cat.description}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                        </TouchableOpacity>) : (/* 无搜索结果 */
              <View style={styles.noSearchResultContainer}>
                        <Ionicons name="search-outline" size={48} color="#d1d5db" />
                        <Text style={styles.noSearchResultText}>{t('publish.noSearchResult')}</Text>
                        <Text style={styles.noSearchResultHint}>{t('publish.tryOtherKeywords')}</Text>
                      </View>)}
                  </View>) : (/* 视图2：二级分类列表 */
            <View style={styles.level2Container}>
                    <Text style={styles.levelTitle}>{t('publish.selectLevel2')}</Text>

                    <View style={styles.level1SearchContainer}>
                      <Ionicons name="search" size={20} color="#9ca3af" />
                      <TextInput
                        style={styles.level1SearchInput}
                        placeholder={t('publish.searchCategories')}
                        value={level2SearchQuery}
                        onChangeText={setLevel2SearchQuery}
                        placeholderTextColor="#9ca3af"
                      />
                      {level2SearchQuery.length > 0 && <TouchableOpacity onPress={() => setLevel2SearchQuery('')}>
                          <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>}
                    </View>

                    <View style={styles.customLevel2Row}>
                      <View style={styles.customLevel2InputWrap}>
                        <Ionicons name="create-outline" size={18} color="#9ca3af" />
                        <TextInput
                          style={styles.customLevel2Input}
                          placeholder="Add custom subcategory"
                          value={customLevel2Name}
                          onChangeText={setCustomLevel2Name}
                          placeholderTextColor="#9ca3af"
                          returnKeyType="done"
                          onSubmitEditing={selectCustomLevel2}
                        />
                      </View>
                      <TouchableOpacity
                        style={[styles.customLevel2AddBtn, !normalizeCustomCategoryName(customLevel2Name) && styles.customLevel2AddBtnDisabled]}
                        onPress={selectCustomLevel2}
                        disabled={!normalizeCustomCategoryName(customLevel2Name)}
                      >
                        <Text style={styles.customLevel2AddBtnText}>Add</Text>
                      </TouchableOpacity>
                    </View>

                    {loadingLevel2 ? <View style={styles.level2LoadingContainer}>
                        <ActivityIndicator size="small" color={tempSelectedLevel1?.color || '#ef4444'} />
                        <Text style={styles.level2LoadingText}>{t('publish.loading')}</Text>
                      </View> : getFilteredLevel2Categories().length > 0 ? <View style={styles.level2Grid}>
                        {getFilteredLevel2Categories().map(cat => <TouchableOpacity key={cat.id} testID={'publish-level2-item-' + cat.id} style={[styles.level2Item, String(selectedLevel2?.id) === String(cat.id) && styles.level2ItemActive]} onPress={() => selectLevel2(cat)} activeOpacity={0.7}>
                            {isCustomLevel2Category(cat) ? <Ionicons name="create-outline" size={18} color={tempSelectedLevel1?.color || '#6b7280'} style={{
                    marginRight: 6
                  }} /> : <CategoryIcon icon={cat.icon} size={18} color={tempSelectedLevel1?.color || '#6b7280'} style={{
                    marginRight: 6
                  }} />}
                            <Text style={styles.level2Name}>{cat.name}</Text>
                          </TouchableOpacity>)}
                      </View> : <View style={styles.level2Empty}>
                        <Ionicons name="search-outline" size={24} color="#d1d5db" />
                        <Text style={styles.level2EmptyText}>{t('publish.noSearchResult')}</Text>
                      </View>}
                  </View>)}
              </ScrollView>}
          </View>
        </View>
      </Modal>

      {/* 谁可以看弹窗 */}
      <Modal visible={showVisibilityModal} animationType="fade" transparent>
        <View style={[styles.modalOverlay, {
        justifyContent: 'center'
      }]}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowVisibilityModal(false)} />
          <View style={styles.visibilityModal}>
            <View style={styles.visibilityHeader}>
              <Text style={styles.visibilityTitle}>{t('publish.visibilityModalTitle')}</Text>
              <Text style={styles.visibilitySubtitle}>{t('publish.visibilityModalSubtitle')}</Text>
            </View>

            <View style={styles.visibilityOptions}>
              <TouchableOpacity style={[styles.visibilityOption, visibility === 0 && styles.visibilityOptionActive]} onPress={() => selectVisibility(0)} activeOpacity={0.7}>
                <View style={[styles.visibilityIconContainer, {
                backgroundColor: '#dbeafe'
              }]}>
                  <Ionicons name="globe-outline" size={24} color="#3b82f6" />
                </View>
                <View style={styles.visibilityTextContainer}>
                  <Text style={styles.visibilityOptionTitle}>{t('publish.visibility.everyone')}</Text>
                  <Text style={styles.visibilityOptionDesc}>{t('publish.visibility.everyoneDesc')}</Text>
                </View>
                {visibility === 0 && <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.visibilityOption, visibility === 1 && styles.visibilityOptionActive]} onPress={() => selectVisibility(1)} activeOpacity={0.7}>
                <View style={[styles.visibilityIconContainer, {
                backgroundColor: '#fef3c7'
              }]}>
                  <Ionicons name="people-outline" size={24} color="#f59e0b" />
                </View>
                <View style={styles.visibilityTextContainer}>
                  <Text style={styles.visibilityOptionTitle}>{t('publish.visibility.followers')}</Text>
                  <Text style={styles.visibilityOptionDesc}>{t('publish.visibility.followersDesc')}</Text>
                </View>
                {visibility === 1 && <Ionicons name="checkmark-circle" size={24} color="#f59e0b" />}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.visibilityOption, visibility === 2 && styles.visibilityOptionActive]} onPress={() => selectVisibility(2)} activeOpacity={0.7}>
                <View style={[styles.visibilityIconContainer, {
                backgroundColor: '#fce7f3'
              }]}>
                  <Ionicons name="lock-closed-outline" size={24} color="#ec4899" />
                </View>
                <View style={styles.visibilityTextContainer}>
                  <Text style={styles.visibilityOptionTitle}>{t('publish.visibility.onlyMe')}</Text>
                  <Text style={styles.visibilityOptionDesc}>{t('publish.visibility.onlyMeDesc')}</Text>
                </View>
                {visibility === 2 && <Ionicons name="checkmark-circle" size={24} color="#ec4899" />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.visibilityCloseBtn} onPress={() => setShowVisibilityModal(false)} activeOpacity={0.7}>
              <Text style={styles.visibilityCloseBtnText}>{t('publish.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 区域选择弹窗 */}
      <Modal visible={showLocationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowLocationModal(false);
              setRegionStep(0);
            }}
          />
          <View style={[styles.regionModal, { paddingBottom: 30 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowLocationModal(false);
                  setRegionStep(0);
                }}
              >
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>选择区域</Text>
              <TouchableOpacity onPress={confirmLocationSelection}>
                <Text style={styles.confirmText}>确认</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.breadcrumbContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbScrollContent}>
                <TouchableOpacity style={styles.breadcrumbItem} onPress={() => setRegionStep(0)}>
                  <Text style={[styles.breadcrumbText, regionStep === 0 && styles.breadcrumbTextActive]}>
                    {selectedLocationRegion.country || '国家'}
                  </Text>
                </TouchableOpacity>

                {selectedLocationRegion.country && (
                  <>
                    <View style={styles.breadcrumbSeparatorWrapper}>
                      <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                    </View>
                    <TouchableOpacity style={styles.breadcrumbItem} onPress={() => setRegionStep(1)}>
                      <Text style={[styles.breadcrumbText, regionStep === 1 && styles.breadcrumbTextActive]}>
                        {selectedLocationRegion.city || '省份'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {selectedLocationRegion.city && (
                  <>
                    <View style={styles.breadcrumbSeparatorWrapper}>
                      <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                    </View>
                    <TouchableOpacity style={styles.breadcrumbItem} onPress={() => setRegionStep(2)}>
                      <Text style={[styles.breadcrumbText, regionStep === 2 && styles.breadcrumbTextActive]}>
                        {selectedLocationRegion.state || '城市'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {selectedLocationRegion.state && (
                  <>
                    <View style={styles.breadcrumbSeparatorWrapper}>
                      <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                    </View>
                    <TouchableOpacity style={styles.breadcrumbItem} onPress={() => setRegionStep(3)}>
                      <Text style={[styles.breadcrumbText, regionStep === 3 && styles.breadcrumbTextActive]}>
                        {selectedLocationRegion.district || '区县'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>

            <ScrollView style={styles.regionList} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
              {getLocationRegionOptions().map((option, idx) => (
                <TouchableOpacity key={idx} style={styles.regionOption} onPress={() => selectLocationRegion(option)}>
                  <Text style={styles.regionOptionText}>{option}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 图片选择器 */}
        <ImagePickerSheet visible={showImagePicker} onClose={() => setShowImagePicker(false)} onImageSelected={handleImageSelected} title={t('publish.addImage')} />
      </KeyboardAvoidingView>
      </KeyboardDismissView>
    </SafeAreaView>;
  }
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6'
  },
  keyboardView: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff'
  },
  closeBtn: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveDraftBtn: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937'
  },
  saveDraft: {
    fontSize: scaleFont(14),
    color: '#ef4444'
  },
  content: {
    flex: 1,
    padding: 12
  },
  contentContainer: {
    paddingBottom: 12
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12
  },
  sectionDesc: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    marginBottom: 12
  },
  required: {
    color: '#ef4444'
  },
  typeList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb'
  },
  typeCardActive: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2'
  },
  typeName: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#374151',
    marginTop: 8
  },
  typeDesc: {
    fontSize: scaleFont(10),
    color: '#9ca3af',
    marginTop: 4
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  categorySelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  categorySelectorText: {
    fontSize: scaleFont(14),
    color: '#1f2937'
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8
  },
  amountBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 8
  },
  amountBtnActive: {
    backgroundColor: '#ef4444'
  },
  amountText: {
    fontSize: scaleFont(14),
    color: '#374151',
    fontWeight: '500'
  },
  amountTextActive: {
    color: '#fff'
  },
  customAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12
  },
  customLabel: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  customInput: {
    flex: 1,
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    fontSize: scaleFont(14)
  },
  currencySymbol: {
    marginLeft: 8,
    fontSize: scaleFont(14),
    color: '#6b7280'
  },
  titleInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: scaleFont(15),
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  charCount: {
    textAlign: 'right',
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 8
  },
  contentInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: scaleFont(15),
    color: '#1f2937',
    lineHeight: scaleFont(24),
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4
  },
  imageItem: {
    width: '33.333%',
    paddingHorizontal: 4,
    marginBottom: 8,
    position: 'relative'
  },
  imageItemInner: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden'
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  removeImage: {
    position: 'absolute',
    top: -6,
    right: -2,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  addImageBtn: {
    width: '33.333%',
    paddingHorizontal: 4,
    marginBottom: 8
  },
  addImageBtnInner: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center'
  },
  addImageText: {
    fontSize: scaleFont(10),
    color: '#9ca3af',
    marginTop: 4
  },
  topicList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  topicTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 16
  },
  topicTagActive: {
    backgroundColor: '#fef2f2'
  },
  topicTagText: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  topicTagTextActive: {
    color: '#ef4444'
  },
  customTopic: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12
  },
  customTopicInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    fontSize: scaleFont(14)
  },
  addTopicBtn: {
    marginLeft: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  addTopicBtnText: {
    fontSize: scaleFont(13),
    color: '#fff'
  },
  settingsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  settingLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: scaleFont(14),
    color: '#1f2937'
  },
  settingValue: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
    marginRight: 4
  },
  publishBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  publishBtnDisabled: {
    backgroundColor: '#fecaca'
  },
  publishBtnText: {
    fontSize: scaleFont(16),
    color: '#fff',
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999
    })
  },
  categoryModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    maxHeight: '80%',
    ...(Platform.OS === 'web' && {
      position: 'relative',
      zIndex: 10000
    })
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  modalTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: modalTokens.textPrimary
  },
  backBtn: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  categoryContent: {
    padding: 16,
    maxHeight: 500
  },
  levelTitle: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    color: modalTokens.textSecondary,
    marginBottom: 12
  },
  level1Container: {
    marginBottom: 20
  },
  level1SearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16
  },
  level1SearchInput: {
    flex: 1,
    fontSize: scaleFont(14),
    color: modalTokens.textPrimary,
    padding: 0,
    marginHorizontal: 8
  },
  level1Item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border
  },
  level1ItemActive: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  level1Icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
    marginTop: 2
  },
  level1Info: {
    flex: 1,
    paddingTop: 8
  },
  level1Name: {
    fontSize: scaleFont(15),
    fontWeight: '500',
    color: modalTokens.textPrimary,
    lineHeight: scaleFont(22)
  },
  level1Desc: {
    fontSize: scaleFont(12),
    color: modalTokens.textMuted,
    marginTop: 2,
    lineHeight: scaleFont(16)
  },
  noSearchResultContainer: {
    alignItems: 'center',
    paddingVertical: 60
  },
  noSearchResultText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: modalTokens.textSecondary,
    marginTop: 16
  },
  noSearchResultHint: {
    fontSize: scaleFont(13),
    color: modalTokens.textMuted,
    marginTop: 8
  },
  level2Container: {
    marginBottom: 20
  },
  level2LoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  level2LoadingText: {
    fontSize: scaleFont(14),
    color: modalTokens.textSecondary,
    marginLeft: 8
  },
  level2Grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5
  },
  level2Item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 20,
    marginHorizontal: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: modalTokens.border
  },
  level2ItemActive: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  level2Name: {
    fontSize: scaleFont(13),
    color: modalTokens.textPrimary
  },
  customLevel2Row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  customLevel2InputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  customLevel2Input: {
    flex: 1,
    fontSize: scaleFont(14),
    color: modalTokens.textPrimary,
    padding: 0,
    marginLeft: 8
  },
  customLevel2AddBtn: {
    marginLeft: 8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  customLevel2AddBtnDisabled: {
    backgroundColor: '#fecaca'
  },
  customLevel2AddBtnText: {
    fontSize: scaleFont(13),
    color: '#fff',
    fontWeight: '600'
  },
  level2Empty: {
    alignItems: 'center',
    paddingVertical: 30
  },
  level2EmptyText: {
    fontSize: scaleFont(14),
    color: modalTokens.textMuted,
    marginTop: 8
  },
  // 分类加载和错误状态样式
  categoryLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 60
  },
  categoryLoadingText: {
    fontSize: scaleFont(14),
    color: modalTokens.textSecondary,
    marginTop: 16
  },
  categoryErrorContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24
  },
  categoryErrorText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 16
  },
  categoryErrorDesc: {
    fontSize: scaleFont(13),
    color: modalTokens.textSecondary,
    marginTop: 8,
    textAlign: 'center'
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20
  },
  retryBtnText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '600'
  },
  // 谁可以看弹窗样式
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    ...(Platform.OS === 'web' && {
      zIndex: 9999
    })
  },
  visibilityModal: {
    backgroundColor: modalTokens.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: modalTokens.border,
    marginHorizontal: 24,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    overflow: 'hidden',
    shadowColor: modalTokens.shadow,
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    ...(Platform.OS === 'web' && {
      position: 'relative',
      zIndex: 10000,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    })
  },
  visibilityHeader: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
    alignItems: 'center'
  },
  visibilityTitle: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: modalTokens.textPrimary,
    marginBottom: 6
  },
  visibilitySubtitle: {
    fontSize: scaleFont(13),
    color: modalTokens.textMuted
  },
  visibilityOptions: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  visibilityOptionActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca'
  },
  visibilityIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0
  },
  visibilityTextContainer: {
    flex: 1,
    marginRight: 8
  },
  visibilityOptionTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: modalTokens.textPrimary,
    marginBottom: 3
  },
  visibilityOptionDesc: {
    fontSize: scaleFont(12),
    color: modalTokens.textSecondary,
    lineHeight: scaleFont(16)
  },
  visibilityCloseBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    paddingVertical: 14,
    backgroundColor: modalTokens.surfaceMuted,
    borderRadius: 12,
    alignItems: 'center'
  },
  visibilityCloseBtnText: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: modalTokens.textSecondary
  },
  // 定向问题样式
  selectedUsersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 16
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    marginBottom: 8
  },
  selectedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6
  },
  selectedUserAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
    backgroundColor: '#e5e7eb'
  },
  selectedUserName: {
    fontSize: scaleFont(13),
    color: '#1f2937',
    fontWeight: '500'
  },
  expertSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  expertSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: scaleFont(14),
    color: '#1f2937'
  },
  expertListContainer: {
    marginTop: 8
  },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8
  },
  recommendedHeaderText: {
    fontSize: scaleFont(15),
    fontWeight: '700',
    color: '#1f2937'
  },
  expertList: {
    marginBottom: 10
  },
  expertFlatList: {
    maxHeight: 400
  },
  expertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 8
  },
  expertItemSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe'
  },
  expertAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#e5e7eb'
  },
  expertAvatar: {
    marginRight: 12
  },
  expertInfo: {
    flex: 1
  },
  expertNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap'
  },
  expertName: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937'
  },
  expertTitle: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    marginBottom: 6
  },
  expertCategoriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4
  },
  expertFieldTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4
  },
  expertFieldText: {
    fontSize: scaleFont(11),
    color: '#f59e0b',
    fontWeight: '500'
  },
  expertMoreCategories: {
    fontSize: scaleFont(11),
    color: '#9ca3af',
    marginLeft: 4
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40
  },
  loadingText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    marginTop: 12
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16
  },
  loadingMoreText: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    marginLeft: 8
  },
  noMoreContainer: {
    alignItems: 'center',
    paddingVertical: 16
  },
  noMoreText: {
    fontSize: scaleFont(13),
    color: '#9ca3af'
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40
  },
  noResultsText: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12
  },
  noResultsHint: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
    marginTop: 4
  },
  // 答案设置样式
  answerSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  answerSettingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12
  },
  answerSettingText: {
    marginLeft: 12,
    flex: 1
  },
  answerSettingTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2
  },
  answerSettingDesc: {
    fontSize: scaleFont(12),
    color: '#6b7280'
  },
  answerPriceContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fef3c7'
  },
  answerPriceLabel: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8
  },
  answerPriceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#fde68a'
  },
  priceInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: scaleFont(14),
    color: '#1f2937',
    marginLeft: 4
  },
  answerPriceHint: {
    fontSize: scaleFont(11),
    color: '#92400e',
    marginTop: 6
  },
  privateAnswerTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10
  },
  privateAnswerText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    flex: 1
  },
  rewardAmountLabel: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12
  },
  // 区域选择模态框样式
  regionModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    maxHeight: '70%'
  },
  breadcrumbContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff'
  },
  breadcrumbScrollContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  breadcrumbItem: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    justifyContent: 'center'
  },
  breadcrumbText: {
    fontSize: scaleFont(15),
    color: '#6b7280',
    fontWeight: '400',
    lineHeight: scaleFont(20)
  },
  breadcrumbTextActive: {
    color: '#ef4444',
    fontWeight: '500'
  },
  breadcrumbSeparatorWrapper: {
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  regionList: {
    padding: 8
  },
  regionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  regionOptionText: {
    fontSize: scaleFont(15),
    color: modalTokens.textPrimary
  },
  confirmText: {
    fontSize: scaleFont(14),
    color: '#ef4444',
    fontWeight: '600'
  },
});
