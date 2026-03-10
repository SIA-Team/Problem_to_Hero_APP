import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Switch, Alert, Modal, Platform, ActivityIndicator, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CategoryIcon from '../components/CategoryIcon';
import IdentitySelector from '../components/IdentitySelector';
import CitySelector from '../components/CitySelector';
import ImagePickerSheet from '../components/ImagePickerSheet';
import categoryApi from '../services/api/categoryApi';
import questionApi from '../services/api/questionApi';
import uploadApi from '../services/api/uploadApi';
import expertApi from '../services/api/expertApi';
import { showToast } from '../utils/toast';

const questionTypes = [
  { id: 'free', name: '公开问题', desc: '公开提问', icon: 'gift', color: '#22c55e' },
  { id: 'reward', name: '悬赏问题', desc: '付费求答', icon: 'cash', color: '#f97316' },
  { id: 'targeted', name: '定向问题', desc: '指定回答', icon: 'locate', color: '#3b82f6' },
];


const rewardAmounts = [10, 20, 50, 100];

// 问题类别数据
const categoryData = {
  level1: [
    { id: 1, name: '国家', icon: 'business', color: '#3b82f6', desc: '国家政策、社会民生' },
    { id: 2, name: '行业', icon: 'briefcase', color: '#22c55e', desc: '各行业专业问题' },
    { id: 3, name: '个人', icon: 'person', color: '#8b5cf6', desc: '个人生活、成长' },
  ],
  level2: {
    1: [
      { id: 101, name: '政策法规', icon: 'document-text' },
      { id: 102, name: '社会民生', icon: 'people' },
      { id: 103, name: '经济发展', icon: 'trending-up' },
      { id: 104, name: '教育医疗', icon: 'school' },
      { id: 105, name: '环境保护', icon: 'leaf' },
      { id: 106, name: '基础设施', icon: 'construct' },
    ],
    2: [
      { id: 201, name: '互联网', icon: 'globe' },
      { id: 202, name: '金融', icon: 'card' },
      { id: 203, name: '医疗健康', icon: 'fitness' },
      { id: 204, name: '教育培训', icon: 'school' },
      { id: 205, name: '房地产', icon: 'home' },
      { id: 206, name: '制造业', icon: 'cog' },
      { id: 207, name: '餐饮服务', icon: 'restaurant' },
    ],
    3: [
      { id: 301, name: '职业发展', icon: 'rocket' },
      { id: 302, name: '情感生活', icon: 'heart' },
      { id: 303, name: '健康养生', icon: 'fitness' },
      { id: 304, name: '理财投资', icon: 'wallet' },
      { id: 305, name: '学习成长', icon: 'book' },
      { id: 306, name: '家庭关系', icon: 'home' },
    ],
  }
};

export default function PublishScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState('free');
  const [reward, setReward] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState([]);
  const [customTopic, setCustomTopic] = useState('');
  const [location, setLocation] = useState('北京');
  const [visibility, setVisibility] = useState('所有人');
  
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
  
  // 位置选择状态
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // 加载分类数据
  useEffect(() => {
    fetchLevel1Categories();
  }, []);
  
  // 加载一级分类
  const fetchLevel1Categories = async () => {
    setCategoryLoading(true);
    setCategoryError(null);
    
    try {
      // 请求一级分类，pageSize设置为100，通常足够
      const response = await categoryApi.getCategoryList({
        pageNum: 1,
        pageSize: 100,
        parentId: 0, // 只获取一级分类
      });
      
      if (__DEV__) {
        console.log('一级分类数据:', response);
      }
      
      if (response && response.code === 200 && response.data && response.data.rows) {
        // 直接使用返回的数据，因为我们已经通过 parentId=0 参数过滤了
        const categories = response.data.rows.map(cat => {
          return {
            ...cat,
            originalIcon: cat.icon, // 保存原始 Font Awesome 图标值
            color: cat.color || getColorForCategory(cat.name),
          };
        });
        
        if (__DEV__) {
          console.log(`✅ 一级分类加载成功，共${categories.length}个`);
          console.log('一级分类数据示例:', JSON.stringify(categories[0], null, 2));
        }
        
        // 检查是否还有更多一级分类（极少见）
        if (response.data.total > categories.length) {
          console.warn(`⚠️ 一级分类超过100个，总共${response.data.total}个，当前只显示前${categories.length}个`);
        }
        
        setLevel1Categories(categories);
      } else {
        throw new Error(response?.msg || '获取分类数据失败');
      }
    } catch (error) {
      console.error('获取一级分类失败:', error);
      setCategoryError(error.message || '获取分类数据失败');
      // 失败时使用本地备用数据
      setLevel1Categories(categoryData.level1);
    } finally {
      setCategoryLoading(false);
    }
  };
  
  // 加载二级分类（按需加载，支持分页）
  const fetchLevel2Categories = async (parentId) => {
    // 如果已经加载过，直接使用缓存
    if (level2CategoriesMap[parentId]) {
      if (__DEV__) {
        console.log(`✅ 二级分类已缓存，直接使用: parentId=${parentId}`);
      }
      return;
    }
    
    setLoadingLevel2(true);
    
    try {
      // 首次请求，pageSize=100，通常足够
      const response = await categoryApi.getCategoryList({
        pageNum: 1,
        pageSize: 100,
        parentId: parentId, // 获取指定一级分类下的二级分类
      });
      
      if (__DEV__) {
        console.log(`二级分类数据 (parentId=${parentId}):`, response);
      }
      
      if (response && response.code === 200 && response.data && response.data.rows) {
        // 直接使用返回的数据，因为我们已经通过 parentId 参数过滤了
        let allCategories = response.data.rows;
        const total = response.data.total;
        
        if (__DEV__) {
          console.log(`✅ 二级分类加载成功 (parentId=${parentId})，共${allCategories.length}个`);
        }
        
        // 如果还有更多数据，继续加载（极少见）
        if (allCategories.length < total) {
          if (__DEV__) {
            console.log(`⚠️ 二级分类较多 (parentId=${parentId})，总共${total}个，继续加载...`);
          }
          
          // 计算还需要加载多少页
          const remainingPages = Math.ceil((total - allCategories.length) / 100);
          
          // 并发加载剩余页
          const remainingPromises = [];
          for (let page = 2; page <= remainingPages + 1; page++) {
            remainingPromises.push(
              categoryApi.getCategoryList({
                pageNum: page,
                pageSize: 100,
                parentId: parentId,
              })
            );
          }
          
          const remainingResponses = await Promise.all(remainingPromises);
          
          // 合并所有数据
          remainingResponses.forEach(res => {
            if (res && res.code === 200 && res.data && res.data.rows) {
              // 直接使用返回的数据，因为我们已经通过 parentId 参数过滤了
              allCategories = [...allCategories, ...res.data.rows];
            }
          });
          
          if (__DEV__) {
            console.log(`✅ 二级分类全部加载完成 (parentId=${parentId})，共${allCategories.length}个`);
          }
        }
        
        // 转换数据格式并缓存
        const formattedCategories = allCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          originalIcon: cat.icon, // 保存原始 Font Awesome 图标值
          icon: cat.icon,
          color: cat.color || getColorForCategory(cat.name), // 添加颜色
        }));
        
        setLevel2CategoriesMap(prev => ({
          ...prev,
          [parentId]: formattedCategories,
        }));
      } else {
        throw new Error(response?.msg || '获取二级分类失败');
      }
    } catch (error) {
      console.error(`获取二级分类失败 (parentId=${parentId}):`, error);
      // 失败时使用本地备用数据
      setLevel2CategoriesMap(prev => ({
        ...prev,
        [parentId]: categoryData.level2[parentId] || [],
      }));
    } finally {
      setLoadingLevel2(false);
    }
  };
  
  // 获取要显示的分类数据
  const getDisplayCategoryData = () => {
    return {
      level1: level1Categories.length > 0 ? level1Categories : categoryData.level1,
      level2: level2CategoriesMap,
    };
  };
  
  // 过滤一级分类（根据搜索关键词）
  const getFilteredLevel1Categories = () => {
    const allCategories = getDisplayCategoryData().level1;
    
    if (!level1SearchQuery.trim()) {
      return allCategories; // 没有搜索关键词，返回全部
    }
    
    const query = level1SearchQuery.toLowerCase().trim();
    return allCategories.filter(cat => 
      cat.name.toLowerCase().includes(query) ||
      (cat.description && cat.description.toLowerCase().includes(query)) ||
      (cat.desc && cat.desc.toLowerCase().includes(query))
    );
  };
  
  // 转换本地数据格式（用于备用）
  const transformLocalCategoryData = () => {
    const level1 = categoryData.level1.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      description: cat.desc,
    }));
    
    return { level1, level2: categoryData.level2 };
  };
  
  // 根据分类名称返回颜色（辅助函数，用于后端没有返回颜色时的降级方案）
  const getColorForCategory = (name) => {
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
      '外交': '#0ea5e9',
    };
    return colorMap[name] || '#6b7280';
  };

  const toggleTopic = (topic) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else if (selectedTopics.length < 3) {
      setSelectedTopics([...selectedTopics, topic]);
    } else {
      showToast('最多选择3个话题', 'warning');
    }
  };

  const addImage = () => {
    if (images.length >= 9) {
      showToast('最多只能添加9张图片', 'warning');
      return;
    }
    setShowImagePicker(true);
  };

  const handleImageSelected = (imageUri) => {
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
      showToast('该话题已存在', 'info');
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
      showToast('最多选择3个话题', 'warning');
    }
    
    // 清空输入框
    setCustomTopic('');
  };

  const handleSaveDraft = () => {
    if (!title && !content) {
      showToast('请先输入内容', 'warning');
      return;
    }
    showToast('草稿已保存', 'success');
  };

  const handlePublish = async () => {
    // 1. 基础验证
    if (!title.trim()) {
      showToast('请输入问题标题', 'warning');
      return;
    }
    if (title.length < 5) {
      showToast('标题至少5个字', 'warning');
      return;
    }
    if (title.length > 50) {
      showToast('标题最多50个字', 'warning');
      return;
    }
    if (!content.trim()) {
      showToast('请输入问题描述', 'warning');
      return;
    }
    if (!selectedLevel1 || !selectedLevel2) {
      showToast('请选择问题类别', 'warning');
      return;
    }

    // 2. 验证悬赏问题金额
    if (selectedType === 'reward') {
      const amount = parseFloat(reward);
      if (isNaN(amount) || amount < 1) {
        showToast('悬赏问题金额不能小于$1', 'warning');
        return;
      }
    }
    
    // 3. 验证定向问题
    if (selectedType === 'targeted') {
      if (targetedUsers.length === 0) {
        showToast('请至少邀请一位专家', 'warning');
        return;
      }
      const amount = parseFloat(targetedReward);
      if (isNaN(amount) || amount < 0) {
        showToast('定向问题奖赏金额不能小于$0', 'warning');
        return;
      }
    }
    
    // 4. 验证付费查看答案
    if (answerPaid && (!answerPrice || parseFloat(answerPrice) < 1)) {
      showToast('请设置查看答案的价格（最低$1）', 'warning');
      return;
    }
    
    // 5. 验证团队身份
    if (publishIdentity === 'team' && selectedTeams.length === 0) {
      showToast('请选择要代表的团队', 'warning');
      return;
    }

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
          showToast('图片上传失败，请重试', 'error');
          return;
        } finally {
          setIsUploadingImages(false);
        }
      }

      // 7. 构建请求数据
      const requestData = {
        // 问题类型：0=公开问题，1=悬赏问题，2=定向问题
        type: selectedType === 'free' ? 0 : selectedType === 'reward' ? 1 : 2,
        
        // 基础信息
        categoryId: selectedLevel2.id,
        title: title.trim(),
        description: content.trim(),
        
        // 子问题（JSON数组字符串格式）
        subQuestions: JSON.stringify([]), // 暂时为空数组，后续可扩展为 [{"order":1,"content":"子问题1"}]
        
        // 是否保存为草稿
        asDraft: false,
        
        // 悬赏金额（单位：分，需要转换）
        bountyAmount: 0,
        
        // 付费查看金额（单位：分）
        payViewAmount: answerPaid ? Math.round(parseFloat(answerPrice) * 100) : 0,
        
        // 可见范围：0=所有人，1=仅关注我的人，2=仅自己
        visibilityScope: visibility === '所有人' ? 0 : visibility === '仅关注我的人' ? 1 : 2,
        
        // 是否匿名：0=不匿名，1=匿名
        isAnonymous: isAnonymous ? 1 : 0,
        
        // 是否公开答案：0=不公开，1=公开
        isPublicAnswer: answerPublic ? 1 : 0,
      };
      
      // 位置信息（只有非空时才添加）
      if (location && location !== '不显示') {
        requestData.location = location;
      }
      
      // 团队ID（以团队身份发布时才添加）
      if (publishIdentity === 'team' && selectedTeams.length > 0) {
        requestData.teamId = selectedTeams[0];
      }
      
      // 专家ID列表（仅定向问题且有选择专家时才添加）
      if (selectedType === 'targeted' && targetedUsers.length > 0) {
        requestData.expertIds = targetedUsers.map(u => u.id);
      }
      
      // 话题处理（只发送用户自定义的话题）
      if (customTopicNames.length > 0) {
        // 只发送用户自定义的话题名称（不含#）
        requestData.topicNames = customTopicNames;
      }
      
      // TODO: 如果后端支持已有话题ID，需要添加 topicIds 字段
      // 预设话题（#职场、#教育等）应该通过 topicIds 发送
      // if (selectedTopics.length > 0) {
      //   const presetTopics = ['#职场', '#教育', '#科技', '#生活', '#健康', '#情感', '#理财', '#美食'];
      //   requestData.topicIds = selectedTopics
      //     .filter(topic => presetTopics.includes(topic))
      //     .map(topic => getTopicIdByName(topic)); // 需要实现 getTopicIdByName 函数
      // }
      
      // 图片URL列表（只有上传了图片时才添加）
      if (imageUrls.length > 0) {
        requestData.imageUrls = imageUrls;
      }

      // 8. 设置悬赏金额（根据问题类型）
      if (selectedType === 'reward') {
        // 悬赏问题：使用 reward 字段的金额，转换为分
        requestData.bountyAmount = Math.round(parseFloat(reward) * 100);
      } else if (selectedType === 'targeted') {
        // 定向问题：使用 targetedReward 字段的金额，转换为分
        requestData.bountyAmount = Math.round(parseFloat(targetedReward) * 100);
      } else if (selectedType === 'free' && reward) {
        // 公开问题：如果设置了悬赏金额，也转换为分
        requestData.bountyAmount = Math.round(parseFloat(reward) * 100);
      }

      // 9. 调用发布接口
      console.log('发布问题请求数据:', JSON.stringify(requestData, null, 2));
      
      const response = await questionApi.createQuestion(requestData);
      
      console.log('发布问题响应:', response);

      // 10. 处理响应
      if (response.code === 200) {
        // 显示成功提示
        showToast('问题发布成功', 'success', 2000);
        
        // 清空表单
        setTitle('');
        setContent('');
        setSelectedType('free');
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
        showToast(response.msg || '发布失败，请稍后重试', 'error');
      }
    } catch (error) {
      console.error('发布问题失败:', error);
      
      // 处理不同类型的错误
      let errorMessage = '网络错误，请检查网络连接后重试';
      
      if (error.response) {
        // 服务器返回了错误响应
        errorMessage = error.response.data?.msg || error.response.data?.message || '服务器错误，请稍后重试';
      } else if (error.request) {
        // 请求已发出但没有收到响应
        errorMessage = '网络请求超时，请检查网络连接';
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
  };
  
  const handleLocationSelect = (city) => {
    setLocation(city);
  };
  
  const handleLocationClose = () => {
    setShowLocationModal(false);
  };

  const handleVisibilityPress = () => {
    setShowVisibilityModal(true);
  };

  const selectVisibility = (value) => {
    setVisibility(value);
    setShowVisibilityModal(false);
  };

  const toggleTargetedUser = (user) => {
    if (targetedUsers.find(u => u.id === user.id)) {
      setTargetedUsers(targetedUsers.filter(u => u.id !== user.id));
    } else if (targetedUsers.length < 5) {
      setTargetedUsers([...targetedUsers, user]);
    } else {
      showToast('最多邀请5位专家', 'warning');
    }
  };

  const removeTargetedUser = (userId) => {
    setTargetedUsers(targetedUsers.filter(u => u.id !== userId));
  };

  /**
   * 加载专家列表
   * @param {boolean} isLoadMore - 是否是加载更多
   */
  const loadExpertList = async (isLoadMore = false) => {
    // 如果正在加载或没有更多数据，则不重复加载
    if (expertLoading || (isLoadMore && !expertHasMore)) {
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
        pageSize: expertPageSize,
      };
      
      // 如果选择了二级分类，则按分类筛选
      if (selectedLevel2?.id) {
        params.categoryId = selectedLevel2.id;
      }

      const response = await expertApi.getExpertList(params);

      console.log('✅ 专家列表响应:', response);

      if (response.code === 200 && response.data) {
        const { total, rows } = response.data;
        
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
      showToast('加载专家列表失败', 'error');
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
    // 只有在选择了定向问题类型且选择了分类时才加载专家列表
    if (selectedType === 'targeted' && selectedLevel2?.id) {
      loadExpertList(false);
    } else if (selectedType === 'targeted' && !selectedLevel2?.id) {
      // 如果选择了定向问题但没有选择分类，清空专家列表
      setExpertList([]);
      setExpertTotal(0);
    }
  }, [selectedType, selectedLevel2]);

  // 过滤专家列表（本地搜索）
  const filteredExperts = expertList.filter(user => 
    user.nickname.toLowerCase().includes(expertSearchQuery.toLowerCase()) ||
    (user.categories && user.categories.some(cat => 
      cat.name.toLowerCase().includes(expertSearchQuery.toLowerCase())
    ))
  );

  const selectLevel1 = async (cat) => {
    setTempSelectedLevel1(cat);
    setCategoryModalView('level2'); // 切换到二级分类视图
    
    // 按需加载二级分类
    await fetchLevel2Categories(cat.id);
  };

  const selectLevel2 = (cat) => {
    setSelectedLevel1(tempSelectedLevel1); // 确认选择一级分类
    setSelectedLevel2(cat); // 选择二级分类
    setShowCategoryModal(false); // 关闭弹窗
    setCategoryModalView('level1'); // 重置视图
    setTempSelectedLevel1(null); // 清空临时选择
  };
  
  const backToLevel1 = () => {
    setCategoryModalView('level1');
    setTempSelectedLevel1(null);
  };
  
  const handleCategoryModalClose = () => {
    setShowCategoryModal(false);
    setCategoryModalView('level1');
    setTempSelectedLevel1(null);
    setLevel1SearchQuery(''); // 清空搜索关键词
  };

  const getCategoryDisplay = () => {
    if (selectedLevel1 && selectedLevel2) {
      return `${selectedLevel1.name} > ${selectedLevel2.name}`;
    }
    return '请选择问题类别';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>发布问题</Text>
        <TouchableOpacity 
          onPress={handleSaveDraft}
          style={styles.saveDraftBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Text style={styles.saveDraft}>存草稿</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 问题类型选择 */}
        <View style={[styles.section, { marginBottom: 16 }]}>
          <Text style={styles.sectionTitle}>选择问题类型</Text>
          <View style={styles.typeList}>
            {questionTypes.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[styles.typeCard, selectedType === type.id && styles.typeCardActive]}
                onPress={() => setSelectedType(type.id)}
              >
                <Ionicons name={type.icon} size={24} color={selectedType === type.id ? type.color : '#9ca3af'} />
                <Text style={[styles.typeName, selectedType === type.id && { color: type.color }]}>{type.name}</Text>
                <Text style={styles.typeDesc}>{type.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 问题类别选择 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>问题类别 <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.categorySelector} onPress={() => setShowCategoryModal(true)}>
            <View style={styles.categorySelectorLeft}>
              {selectedLevel1 && (
                <View style={[styles.categoryIcon, { backgroundColor: selectedLevel1.color + '20' }]}>
                  <CategoryIcon icon={selectedLevel1.originalIcon || selectedLevel1.icon} size={18} color={selectedLevel1.color} />
                </View>
              )}
              <Text style={[styles.categorySelectorText, !selectedLevel1 && { color: '#9ca3af' }]}>
                {getCategoryDisplay()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* 公开问题 - 悬赏金额 */}
        {selectedType === 'free' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>设置悬赏金额</Text>
            <Text style={styles.sectionDesc}>可以设置为 $0（不设悬赏）或任意金额</Text>
            <View style={styles.quickAmounts}>
              {rewardAmounts.map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={[styles.amountBtn, reward === String(amount) && styles.amountBtnActive]}
                  onPress={() => setReward(String(amount))}
                >
                  <Text style={[styles.amountText, reward === String(amount) && styles.amountTextActive]}>${amount}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.customAmount}>
              <Text style={styles.customLabel}>自定义金额：</Text>
              <TextInput 
                style={styles.customInput} 
                placeholder="输入金额（可以是$0）" 
                keyboardType="numeric" 
                value={reward} 
                onChangeText={(text) => {
                  // 只允许输入数字和小数点
                  const filtered = text.replace(/[^0-9.]/g, '');
                  setReward(filtered);
                }}
              />
              <Text style={styles.currencySymbol}>$</Text>
            </View>
          </View>
        )}

        {/* 悬赏金额 */}
        {selectedType === 'reward' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>设置悬赏金额 <Text style={styles.required}>*</Text></Text>
            <Text style={styles.sectionDesc}>悬赏金额不能小于 $1</Text>
            <View style={styles.quickAmounts}>
              {rewardAmounts.map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={[styles.amountBtn, reward === String(amount) && styles.amountBtnActive]}
                  onPress={() => setReward(String(amount))}
                >
                  <Text style={[styles.amountText, reward === String(amount) && styles.amountTextActive]}>${amount}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.customAmount}>
              <Text style={styles.customLabel}>自定义金额：</Text>
              <TextInput 
                style={styles.customInput} 
                placeholder="输入金额（最低$1）" 
                keyboardType="numeric" 
                value={reward} 
                onChangeText={(text) => {
                  // 只允许输入数字和小数点
                  const filtered = text.replace(/[^0-9.]/g, '');
                  setReward(filtered);
                }}
              />
              <Text style={styles.currencySymbol}>$</Text>
            </View>
          </View>
        )}

        {/* 定向问题 - 邀请专家 */}
        {selectedType === 'targeted' && (expertLoading || expertList.length > 0 || targetedUsers.length > 0) && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>邀请回答专家 <Text style={styles.required}>*</Text></Text>
              <Text style={styles.sectionDesc}>最多邀请5位专家回答</Text>
              
              {/* 已选择的专家 */}
              {targetedUsers.length > 0 && (
                <View style={styles.selectedUsersContainer}>
                  {targetedUsers.map(user => (
                    <View key={user.id} style={styles.selectedUserChip}>
                      <View style={styles.selectedUserInfo}>
                        <Image 
                          source={{ uri: user.avatar }} 
                          style={styles.selectedUserAvatar}
                        />
                        <Text style={styles.selectedUserName}>{user.nickname}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeTargetedUser(user.id)} style={{ marginLeft: 6 }}>
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* 搜索框 */}
              <View style={styles.expertSearchContainer}>
                <Ionicons name="search" size={20} color="#9ca3af" />
                <TextInput
                  style={styles.expertSearchInput}
                  placeholder="搜索专家姓名、领域或职称..."
                  value={expertSearchQuery}
                  onChangeText={setExpertSearchQuery}
                  placeholderTextColor="#9ca3af"
                />
                {expertSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setExpertSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>

              {/* 可选择的专家列表 */}
              <View style={styles.expertListContainer}>
                {/* 推荐标题 */}
                <View style={styles.recommendedHeader}>
                  <Ionicons name="star" size={18} color="#f59e0b" style={{ marginRight: 6 }} />
                  <Text style={styles.recommendedHeaderText}>推荐专家 ({expertTotal})</Text>
                </View>

                {/* 专家列表 */}
                {expertLoading && expertList.length === 0 ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>加载专家列表...</Text>
                  </View>
                ) : filteredExperts.length > 0 ? (
                  <FlatList
                    data={filteredExperts}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item: user }) => {
                      const isSelected = targetedUsers.find(u => u.id === user.id);
                      return (
                        <TouchableOpacity
                          style={[styles.expertItem, isSelected && styles.expertItemSelected]}
                          onPress={() => toggleTargetedUser(user)}
                        >
                          <Image 
                            source={{ uri: user.avatar }} 
                            style={styles.expertAvatarImage}
                          />
                          <View style={styles.expertInfo}>
                            <View style={styles.expertNameRow}>
                              <Text style={styles.expertName}>{user.nickname}</Text>
                              <Ionicons name="checkmark-circle" size={16} color="#3b82f6" style={{ marginLeft: 4 }} />
                            </View>
                            {user.categories && user.categories.length > 0 && (
                              <View style={styles.expertCategoriesRow}>
                                {user.categories.slice(0, 2).map((cat, idx) => (
                                  <View key={cat.id} style={styles.expertFieldTag}>
                                    <Text style={styles.expertFieldText}>{cat.name}</Text>
                                  </View>
                                ))}
                                {user.categories.length > 2 && (
                                  <Text style={styles.expertMoreCategories}>+{user.categories.length - 2}</Text>
                                )}
                              </View>
                            )}
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                          )}
                        </TouchableOpacity>
                      );
                    }}
                    onEndReached={loadMoreExperts}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={() => {
                      if (expertLoadingMore) {
                        return (
                          <View style={styles.loadingMoreContainer}>
                            <ActivityIndicator size="small" color="#3b82f6" />
                            <Text style={styles.loadingMoreText}>加载更多...</Text>
                          </View>
                        );
                      }
                      if (!expertHasMore && expertList.length > 0) {
                        return (
                          <View style={styles.noMoreContainer}>
                            <Text style={styles.noMoreText}>没有更多专家了</Text>
                          </View>
                        );
                      }
                      return null;
                    }}
                    scrollEnabled={false}
                    nestedScrollEnabled={true}
                    style={styles.expertFlatList}
                  />
                ) : (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name="search-outline" size={48} color="#d1d5db" />
                    <Text style={styles.noResultsText}>
                      {expertSearchQuery 
                        ? '未找到匹配的专家' 
                        : !selectedLevel2?.id 
                          ? '请先选择问题类别' 
                          : '该类别暂无专家'}
                    </Text>
                    <Text style={styles.noResultsHint}>
                      {expertSearchQuery 
                        ? '试试其他关键词' 
                        : !selectedLevel2?.id 
                          ? '选择类别后可查看该领域的专家' 
                          : '可以尝试选择其他类别'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* 定向问题奖赏 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>设置奖赏金额 <Text style={styles.required}>*</Text></Text>
              <Text style={styles.sectionDesc}>可以设置为 $0（不设悬赏）或任意金额</Text>
              <View style={styles.quickAmounts}>
                {rewardAmounts.map(amount => (
                  <TouchableOpacity
                    key={amount}
                    style={[styles.amountBtn, targetedReward === String(amount) && styles.amountBtnActive]}
                    onPress={() => setTargetedReward(String(amount))}
                  >
                    <Text style={[styles.amountText, targetedReward === String(amount) && styles.amountTextActive]}>${amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customAmount}>
                <Text style={styles.customLabel}>自定义金额：</Text>
                <TextInput 
                  style={styles.customInput} 
                  placeholder="输入金额（最低$0）" 
                  keyboardType="numeric" 
                  value={targetedReward} 
                  onChangeText={(text) => {
                    // 只允许输入数字和小数点
                    const filtered = text.replace(/[^0-9.]/g, '');
                    setTargetedReward(filtered);
                  }}
                />
                <Text style={styles.currencySymbol}>$</Text>
              </View>
            </View>
          </>
        )}

        {/* 问题标题 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>问题标题 <Text style={styles.required}>*</Text></Text>
          <TextInput 
            style={styles.titleInput} 
            placeholder="请输入问题标题（5-50字）" 
            placeholderTextColor="#9ca3af"
            value={title} 
            onChangeText={setTitle} 
            maxLength={50} 
          />
          <Text style={styles.charCount}>{title.length}/50</Text>
        </View>

        {/* 问题描述 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>问题描述 <Text style={styles.required}>*</Text></Text>
          <TextInput 
            style={[styles.contentInput, { height: Math.max(150, contentInputHeight) }]} 
            placeholder="详细描述你的问题，让回答者更好地理解..." 
            placeholderTextColor="#9ca3af"
            value={content} 
            onChangeText={setContent} 
            multiline 
            textAlignVertical="top" 
            maxLength={2000}
            onContentSizeChange={(event) => {
              setContentInputHeight(event.nativeEvent.contentSize.height);
            }}
          />
          <Text style={styles.charCount}>{content.length}/2000</Text>
        </View>

        {/* 添加图片 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>添加图片（最多9张）</Text>
          <View style={styles.imageGrid}>
            {images.map((img, idx) => (
              <View key={idx} style={styles.imageItem}>
                <View style={styles.imageItemInner}>
                  <Image source={{ uri: img }} style={styles.imagePreview} />
                </View>
                <TouchableOpacity style={styles.removeImage} onPress={() => setImages(images.filter((_, i) => i !== idx))}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 9 && (
              <View style={styles.addImageBtn}>
                <TouchableOpacity style={styles.addImageBtnInner} onPress={addImage}>
                  <Ionicons name="add" size={24} color="#9ca3af" />
                  <Text style={styles.addImageText}>添加图片</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* 选择话题 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>选择话题</Text>
          <View style={styles.topicList}>
            {allTopics.map(topic => (
              <TouchableOpacity
                key={topic}
                style={[styles.topicTag, selectedTopics.includes(topic) && styles.topicTagActive]}
                onPress={() => toggleTopic(topic)}
              >
                <Text style={[styles.topicTagText, selectedTopics.includes(topic) && styles.topicTagTextActive]}>{topic}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.customTopic}>
            <TextInput 
              style={styles.customTopicInput} 
              placeholder="自定义话题" 
              value={customTopic} 
              onChangeText={setCustomTopic}
              onSubmitEditing={addCustomTopic}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addTopicBtn} onPress={addCustomTopic}>
              <Text style={styles.addTopicBtnText}>添加</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 答案设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>答案设置</Text>
          
          {/* 是否公开答案 */}
          <View style={styles.answerSettingItem}>
            <View style={styles.answerSettingLeft}>
              <Ionicons name="eye-outline" size={22} color="#3b82f6" />
              <View style={styles.answerSettingText}>
                <Text style={styles.answerSettingTitle}>公开答案</Text>
                <Text style={styles.answerSettingDesc}>所有人都可以看到问题的答案</Text>
              </View>
            </View>
            <Switch 
              value={answerPublic} 
              onValueChange={setAnswerPublic} 
              trackColor={{ false: '#e5e7eb', true: '#bfdbfe' }} 
              thumbColor={answerPublic ? '#3b82f6' : '#fff'} 
            />
          </View>

          {/* 付费查看答案 */}
          {answerPublic && (
            <View style={styles.answerSettingItem}>
              <View style={styles.answerSettingLeft}>
                <Ionicons name="cash-outline" size={22} color="#f59e0b" />
                <View style={styles.answerSettingText}>
                  <Text style={styles.answerSettingTitle}>付费查看</Text>
                  <Text style={styles.answerSettingDesc}>用户需要付费才能查看答案</Text>
                </View>
              </View>
              <Switch 
                value={answerPaid} 
                onValueChange={setAnswerPaid} 
                trackColor={{ false: '#e5e7eb', true: '#fef3c7' }} 
                thumbColor={answerPaid ? '#f59e0b' : '#fff'} 
              />
            </View>
          )}

          {/* 查看价格设置 */}
          {answerPublic && answerPaid && (
            <View style={styles.answerPriceContainer}>
              <Text style={styles.answerPriceLabel}>查看价格</Text>
              <View style={styles.answerPriceInput}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput 
                  style={styles.priceInput} 
                  placeholder="设置查看答案的价格" 
                  keyboardType="numeric" 
                  value={answerPrice} 
                  onChangeText={setAnswerPrice}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <Text style={styles.answerPriceHint}>建议价格：$1 - $10</Text>
            </View>
          )}

          {/* 私密答案提示 */}
          {!answerPublic && (
            <View style={styles.privateAnswerTip}>
              <Ionicons name="lock-closed" size={16} color="#6b7280" style={{ marginRight: 8 }} />
              <Text style={styles.privateAnswerText}>答案将仅对你可见，其他用户无法查看</Text>
            </View>
          )}
        </View>

        {/* 更多设置 */}
        <View style={styles.settingsSection}>
          <TouchableOpacity style={styles.settingItem} onPress={handleLocationPress}>
            <Ionicons name="location-outline" size={20} color="#9ca3af" />
            <Text style={styles.settingLabel}>添加位置</Text>
            <Text style={styles.settingValue}>{location}</Text>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleVisibilityPress}>
            <Ionicons name="eye-outline" size={20} color="#9ca3af" />
            <Text style={styles.settingLabel}>谁可以看</Text>
            <Text style={styles.settingValue}>{visibility}</Text>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
          </TouchableOpacity>
          <View style={styles.settingItem}>
            <Ionicons name="person-outline" size={20} color="#9ca3af" />
            <Text style={styles.settingLabel}>匿名提问</Text>
            <Switch value={isAnonymous} onValueChange={setIsAnonymous} trackColor={{ false: '#e5e7eb', true: '#fecaca' }} thumbColor={isAnonymous ? '#ef4444' : '#fff'} />
          </View>
        </View>

        {/* 身份选择器 */}
        <View style={styles.section}>
          <IdentitySelector
            selectedIdentity={publishIdentity}
            selectedTeams={selectedTeams}
            onIdentityChange={setPublishIdentity}
            onTeamsChange={setSelectedTeams}
          />
        </View>

        {/* 发布按钮 */}
        <TouchableOpacity 
          style={[
            styles.publishBtn, 
            (!title || !content || !selectedLevel2 || isPublishing) && styles.publishBtnDisabled
          ]} 
          onPress={handlePublish}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.publishBtnText}>
                {isUploadingImages ? '上传图片中...' : '发布中...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.publishBtnText}>发布问题</Text>
          )}
        </TouchableOpacity>
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* 问题类别选择弹窗 */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.categoryModal}>
            <View style={styles.modalHeader}>
              {categoryModalView === 'level2' ? (
                <TouchableOpacity onPress={backToLevel1} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleCategoryModalClose}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              )}
              <Text style={styles.modalTitle}>
                {categoryModalView === 'level1' ? '选择问题类别' : tempSelectedLevel1?.name}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {categoryLoading ? (
              <View style={styles.categoryLoadingContainer}>
                <ActivityIndicator size="large" color="#ef4444" />
                <Text style={styles.categoryLoadingText}>加载分类数据中...</Text>
              </View>
            ) : categoryError ? (
              <View style={styles.categoryErrorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text style={styles.categoryErrorText}>加载失败</Text>
                <Text style={styles.categoryErrorDesc}>{categoryError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchLevel1Categories}>
                  <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.retryBtnText}>重试</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.categoryContent} showsVerticalScrollIndicator={false}>
                {categoryModalView === 'level1' ? (
                  /* 视图1：一级分类列表 */
                  <View style={styles.level1Container}>
                    <Text style={styles.levelTitle}>请选择一级分类</Text>
                    
                    {/* 搜索框 */}
                    <View style={styles.level1SearchContainer}>
                      <Ionicons name="search" size={20} color="#9ca3af" />
                      <TextInput
                        style={styles.level1SearchInput}
                        placeholder="搜索分类名称..."
                        value={level1SearchQuery}
                        onChangeText={setLevel1SearchQuery}
                        placeholderTextColor="#9ca3af"
                      />
                      {level1SearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setLevel1SearchQuery('')}>
                          <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {/* 分类列表 */}
                    {getFilteredLevel1Categories().length > 0 ? (
                      getFilteredLevel1Categories().map(cat => (
                        <TouchableOpacity
                          key={cat.id}
                          style={styles.level1Item}
                          onPress={() => selectLevel1(cat)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.level1Icon, { backgroundColor: cat.color + '20' }]}>
                            <CategoryIcon icon={cat.originalIcon || cat.icon} size={20} color={cat.color} />
                          </View>
                          <View style={styles.level1Info}>
                            <Text style={styles.level1Name}>{cat.name}</Text>
                            <Text style={styles.level1Desc}>{cat.desc || cat.description}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                      ))
                    ) : (
                      /* 无搜索结果 */
                      <View style={styles.noSearchResultContainer}>
                        <Ionicons name="search-outline" size={48} color="#d1d5db" />
                        <Text style={styles.noSearchResultText}>未找到匹配的分类</Text>
                        <Text style={styles.noSearchResultHint}>试试其他关键词</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  /* 视图2：二级分类列表 */
                  <View style={styles.level2Container}>
                    <Text style={styles.levelTitle}>请选择二级分类</Text>
                    {loadingLevel2 ? (
                      <View style={styles.level2LoadingContainer}>
                        <ActivityIndicator size="small" color={tempSelectedLevel1?.color || '#ef4444'} />
                        <Text style={styles.level2LoadingText}>加载中...</Text>
                      </View>
                    ) : (
                      <View style={styles.level2Grid}>
                        {(level2CategoriesMap[tempSelectedLevel1?.id] || categoryData.level2[tempSelectedLevel1?.id] || []).map(cat => (
                          <TouchableOpacity
                            key={cat.id}
                            style={styles.level2Item}
                            onPress={() => selectLevel2(cat)}
                            activeOpacity={0.7}
                          >
                            <CategoryIcon icon={cat.icon} size={18} color={tempSelectedLevel1?.color || '#6b7280'} style={{ marginRight: 6 }} />
                            <Text style={styles.level2Name}>{cat.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 谁可以看弹窗 */}
      <Modal visible={showVisibilityModal} animationType="fade" transparent>
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowVisibilityModal(false)}
          />
          <View style={styles.visibilityModal}>
            <View style={styles.visibilityHeader}>
              <Text style={styles.visibilityTitle}>谁可以看</Text>
              <Text style={styles.visibilitySubtitle}>选择问题的可见范围</Text>
            </View>

            <View style={styles.visibilityOptions}>
              <TouchableOpacity
                style={[styles.visibilityOption, visibility === '所有人' && styles.visibilityOptionActive]}
                onPress={() => selectVisibility('所有人')}
                activeOpacity={0.7}
              >
                <View style={[styles.visibilityIconContainer, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="globe-outline" size={24} color="#3b82f6" />
                </View>
                <View style={styles.visibilityTextContainer}>
                  <Text style={styles.visibilityOptionTitle}>所有人</Text>
                  <Text style={styles.visibilityOptionDesc}>所有用户都可以看到这个问题</Text>
                </View>
                {visibility === '所有人' && (
                  <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.visibilityOption, visibility === '仅关注我的人' && styles.visibilityOptionActive]}
                onPress={() => selectVisibility('仅关注我的人')}
                activeOpacity={0.7}
              >
                <View style={[styles.visibilityIconContainer, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="people-outline" size={24} color="#f59e0b" />
                </View>
                <View style={styles.visibilityTextContainer}>
                  <Text style={styles.visibilityOptionTitle}>仅关注我的人</Text>
                  <Text style={styles.visibilityOptionDesc}>只有关注你的用户可以看到</Text>
                </View>
                {visibility === '仅关注我的人' && (
                  <Ionicons name="checkmark-circle" size={24} color="#f59e0b" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.visibilityOption, visibility === '仅自己' && styles.visibilityOptionActive]}
                onPress={() => selectVisibility('仅自己')}
                activeOpacity={0.7}
              >
                <View style={[styles.visibilityIconContainer, { backgroundColor: '#fce7f3' }]}>
                  <Ionicons name="lock-closed-outline" size={24} color="#ec4899" />
                </View>
                <View style={styles.visibilityTextContainer}>
                  <Text style={styles.visibilityOptionTitle}>仅自己</Text>
                  <Text style={styles.visibilityOptionDesc}>只有你自己可以看到这个问题</Text>
                </View>
                {visibility === '仅自己' && (
                  <Ionicons name="checkmark-circle" size={24} color="#ec4899" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.visibilityCloseBtn}
              onPress={() => setShowVisibilityModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.visibilityCloseBtnText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 城市选择弹窗 */}
      <CitySelector
        visible={showLocationModal}
        currentCity={location}
        onSelect={handleLocationSelect}
        onClose={handleLocationClose}
      />

      {/* 图片选择器 */}
      <ImagePickerSheet
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImageSelected={handleImageSelected}
        title="添加图片"
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  closeBtn: { padding: 4, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  saveDraftBtn: { padding: 4, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  saveDraft: { fontSize: 14, color: '#ef4444' },
  content: { flex: 1, padding: 12 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  sectionDesc: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  required: { color: '#ef4444' },
  typeList: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  typeCard: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#e5e7eb' },
  typeCardActive: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  typeName: { fontSize: 12, fontWeight: '500', color: '#374151', marginTop: 8 },
  typeDesc: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  categorySelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  categorySelectorLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  categoryIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  categorySelectorText: { fontSize: 14, color: '#1f2937' },
  quickAmounts: { flexDirection: 'row', gap: 8 },
  amountBtn: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#f3f4f6', borderRadius: 8 },
  amountBtnActive: { backgroundColor: '#ef4444' },
  amountText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  amountTextActive: { color: '#fff' },
  customAmount: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  customLabel: { fontSize: 13, color: '#6b7280' },
  customInput: { flex: 1, marginLeft: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, fontSize: 14 },
  currencySymbol: { marginLeft: 8, fontSize: 14, color: '#6b7280' },
  titleInput: { backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1f2937', borderWidth: 1, borderColor: '#e5e7eb' },
  charCount: { textAlign: 'right', fontSize: 12, color: '#9ca3af', marginTop: 8 },
  contentInput: { 
    backgroundColor: '#f9fafb', 
    borderRadius: 10, 
    paddingHorizontal: 14, 
    paddingVertical: 14, 
    fontSize: 15, 
    color: '#1f2937',
    lineHeight: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  imageItem: { 
    width: '33.333%',
    paddingHorizontal: 4,
    marginBottom: 8,
    position: 'relative',
  },
  imageItemInner: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8, 
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImage: { 
    position: 'absolute', 
    top: -6, 
    right: -2, 
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addImageBtn: { 
    width: '33.333%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  addImageBtnInner: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8, 
    borderWidth: 2, 
    borderStyle: 'dashed', 
    borderColor: '#d1d5db', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  addImageText: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  topicList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicTag: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f3f4f6', borderRadius: 16 },
  topicTagActive: { backgroundColor: '#fef2f2' },
  topicTagText: { fontSize: 13, color: '#6b7280' },
  topicTagTextActive: { color: '#ef4444' },
  customTopic: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  customTopicInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, fontSize: 14 },
  addTopicBtn: { marginLeft: 8, backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addTopicBtnText: { fontSize: 13, color: '#fff' },
  settingsSection: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  settingItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  settingLabel: { flex: 1, marginLeft: 12, fontSize: 14, color: '#1f2937' },
  settingValue: { fontSize: 13, color: '#9ca3af', marginRight: 4 },
  publishBtn: { backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  publishBtnDisabled: { backgroundColor: '#fecaca' },
  publishBtnText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    }),
  },
  categoryModal: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    maxHeight: '80%',
    ...(Platform.OS === 'web' && {
      position: 'relative',
      zIndex: 10000,
    }),
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  backBtn: { padding: 4, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  categoryContent: { padding: 16, maxHeight: 500 },
  levelTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 12 },
  level1Container: { marginBottom: 20 },
  level1SearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  level1SearchInput: { flex: 1, fontSize: 14, color: '#1f2937', padding: 0, marginHorizontal: 8 },
  level1Item: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: '#f9fafb' },
  level1ItemActive: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  level1Icon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0, marginTop: 2 },
  level1Info: { flex: 1, paddingTop: 8 },
  level1Name: { fontSize: 15, fontWeight: '500', color: '#1f2937', lineHeight: 22 },
  level1Desc: { fontSize: 12, color: '#9ca3af', marginTop: 2, lineHeight: 16 },
  noSearchResultContainer: { alignItems: 'center', paddingVertical: 60 },
  noSearchResultText: { fontSize: 16, fontWeight: '600', color: '#6b7280', marginTop: 16 },
  noSearchResultHint: { fontSize: 13, color: '#9ca3af', marginTop: 8 },
  level2Container: { marginBottom: 20 },
  level2LoadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  level2LoadingText: { fontSize: 14, color: '#6b7280', marginLeft: 8 },
  level2Grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  level2Item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f9fafb', borderRadius: 20, marginHorizontal: 5, marginBottom: 10 },
  level2ItemActive: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  level2Name: { fontSize: 13, color: '#374151' },
  level2Empty: { alignItems: 'center', paddingVertical: 30 },
  level2EmptyText: { fontSize: 14, color: '#9ca3af', marginTop: 8 },
  
  // 分类加载和错误状态样式
  categoryLoadingContainer: { alignItems: 'center', paddingVertical: 60 },
  categoryLoadingText: { fontSize: 14, color: '#6b7280', marginTop: 16 },
  categoryErrorContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  categoryErrorText: { fontSize: 16, fontWeight: '600', color: '#ef4444', marginTop: 16 },
  categoryErrorDesc: { fontSize: 13, color: '#6b7280', marginTop: 8, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 20 },
  retryBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  
  // 谁可以看弹窗样式
  modalBackdrop: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0,
    ...(Platform.OS === 'web' && {
      zIndex: 9999,
    }),
  },
  visibilityModal: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    marginHorizontal: 24, 
    width: '90%',
    maxWidth: 400, 
    alignSelf: 'center', 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    ...(Platform.OS === 'web' && {
      position: 'relative',
      zIndex: 10000,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }),
  },
  visibilityHeader: { 
    paddingTop: 24,
    paddingHorizontal: 20, 
    paddingBottom: 16,
    borderBottomWidth: 1, 
    borderBottomColor: '#f3f4f6', 
    alignItems: 'center' 
  },
  visibilityTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 6 },
  visibilitySubtitle: { fontSize: 13, color: '#9ca3af' },
  visibilityOptions: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  visibilityOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14, 
    borderRadius: 12, 
    marginBottom: 10, 
    backgroundColor: '#f9fafb', 
    borderWidth: 2, 
    borderColor: 'transparent' 
  },
  visibilityOptionActive: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  visibilityIconContainer: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
    flexShrink: 0,
  },
  visibilityTextContainer: { flex: 1, marginRight: 8 },
  visibilityOptionTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 3 },
  visibilityOptionDesc: { fontSize: 12, color: '#6b7280', lineHeight: 16 },
  visibilityCloseBtn: { 
    marginHorizontal: 16, 
    marginTop: 8,
    marginBottom: 20, 
    paddingVertical: 14, 
    backgroundColor: '#f3f4f6', 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  visibilityCloseBtnText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  
  // 定向问题样式
  selectedUsersContainer: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 16 },
  selectedUserChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginHorizontal: 4, marginBottom: 8 },
  selectedUserInfo: { flexDirection: 'row', alignItems: 'center', marginRight: 6 },
  selectedUserAvatar: { 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    marginRight: 6,
    backgroundColor: '#e5e7eb',
  },
  selectedUserName: { fontSize: 13, color: '#1f2937', fontWeight: '500' },
  expertSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  expertSearchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1f2937' },
  expertListContainer: { marginTop: 8 },
  recommendedHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, marginBottom: 8 },
  recommendedHeaderText: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  expertList: { marginBottom: 10 },
  expertFlatList: { maxHeight: 400 },
  expertItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    backgroundColor: '#f9fafb', 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: 'transparent',
    marginBottom: 8,
  },
  expertItemSelected: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  expertAvatarImage: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    marginRight: 12,
    backgroundColor: '#e5e7eb',
  },
  expertAvatar: { marginRight: 12 },
  expertInfo: { flex: 1 },
  expertNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  expertName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  expertTitle: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  expertCategoriesRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flexWrap: 'wrap',
    marginTop: 4,
  },
  expertFieldTag: { 
    backgroundColor: '#fef3c7', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  expertFieldText: { fontSize: 11, color: '#f59e0b', fontWeight: '500' },
  expertMoreCategories: { fontSize: 11, color: '#9ca3af', marginLeft: 4 },
  loadingContainer: { 
    alignItems: 'center', 
    paddingVertical: 40,
  },
  loadingText: { 
    fontSize: 14, 
    color: '#6b7280', 
    marginTop: 12,
  },
  loadingMoreContainer: { 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingMoreText: { 
    fontSize: 13, 
    color: '#6b7280', 
    marginLeft: 8,
  },
  noMoreContainer: { 
    alignItems: 'center', 
    paddingVertical: 16,
  },
  noMoreText: { 
    fontSize: 13, 
    color: '#9ca3af',
  },
  noResultsContainer: { alignItems: 'center', paddingVertical: 40 },
  noResultsText: { fontSize: 15, fontWeight: '600', color: '#6b7280', marginTop: 12 },
  noResultsHint: { fontSize: 13, color: '#9ca3af', marginTop: 4 },
  
  // 答案设置样式
  answerSettingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  answerSettingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  answerSettingText: { marginLeft: 12, flex: 1 },
  answerSettingTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 2 },
  answerSettingDesc: { fontSize: 12, color: '#6b7280' },
  answerPriceContainer: { marginTop: 12, padding: 12, backgroundColor: '#fffbeb', borderRadius: 10, borderWidth: 1, borderColor: '#fef3c7' },
  answerPriceLabel: { fontSize: 13, fontWeight: '600', color: '#92400e', marginBottom: 8 },
  answerPriceInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#fde68a' },
  priceInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#1f2937', marginLeft: 4 },
  answerPriceHint: { fontSize: 11, color: '#92400e', marginTop: 6 },
  privateAnswerTip: { flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 12, backgroundColor: '#f9fafb', borderRadius: 10 },
  privateAnswerText: { fontSize: 12, color: '#6b7280', flex: 1 },
  
  rewardAmountLabel: { fontSize: 13, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
});
