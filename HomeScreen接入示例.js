/**
 * HomeScreen.js 接入问题列表接口示例
 * 
 * 这个文件展示了如何在 HomeScreen.js 中接入问题列表接口
 * 复制相关代码到你的 HomeScreen.js 中即可
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import questionApi from '../services/api/questionApi';
import { useTranslation } from '../i18n/useTranslation';

// ============================================
// 1. 添加状态管理
// ============================================

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  
  // 问题列表状态
  const [questionList, setQuestionList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  
  // 当前激活的 Tab
  const [activeTab, setActiveTab] = useState(t('home.recommend'));
  
  // ============================================
  // 2. 数据加载函数
  // ============================================
  
  /**
   * 加载问题列表
   * @param {number} pageNum - 页码
   * @param {boolean} isRefresh - 是否是下拉刷新
   */
  const loadQuestions = async (pageNum = 1, isRefresh = false) => {
    try {
      // 设置加载状态
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      setError(null);
      
      console.log(`🔄 加载问题列表: 页码=${pageNum}, Tab=${activeTab}`);
      
      // 根据当前 Tab 调用不同接口
      let response;
      
      switch (activeTab) {
        case t('home.recommend'):
          response = await questionApi.getRecommendList({ 
            pageNum, 
            pageSize: 20 
          });
          break;
          
        case t('home.hotList'):
          response = await questionApi.getHotList({ 
            pageNum, 
            pageSize: 20 
          });
          break;
          
        case t('home.follow'):
          response = await questionApi.getFollowList({ 
            pageNum, 
            pageSize: 20 
          });
          break;
          
        default:
          // 默认使用推荐列表
          response = await questionApi.getRecommendList({ 
            pageNum, 
            pageSize: 20 
          });
      }
      
      console.log('📥 接口响应:', response);
      
      if (response.code === 200 && response.data) {
        const newData = response.data.rows || [];
        
        console.log(`✅ 获取到 ${newData.length} 条数据`);
        
        // 数据转换：将 API 返回的字段映射到前端使用的字段
        const transformedData = newData.map(item => transformQuestionData(item));
        
        if (pageNum === 1) {
          setQuestionList(transformedData);
        } else {
          setQuestionList(prev => [...prev, ...transformedData]);
        }
        
        setPage(pageNum);
        setHasMore(newData.length === 20);
      } else {
        console.warn('⚠️ 接口返回异常:', response);
        
        // 如果是第一页且没有数据，显示空状态
        if (pageNum === 1) {
          setQuestionList([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('❌ 加载问题列表失败:', error);
      
      setError(error.message || '加载失败');
      
      // 如果是第一页加载失败，显示错误状态
      if (pageNum === 1) {
        setQuestionList([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };
  
  // ============================================
  // 3. 数据转换函数
  // ============================================
  
  /**
   * 转换问题数据：API 字段 → 前端字段
   */
  const transformQuestionData = (item) => {
    return {
      // 基础信息
      id: item.id,
      title: item.title,
      
      // 问题类型
      type: getQuestionType(item.type),
      
      // 金额（分转元）
      reward: item.bountyAmount ? item.bountyAmount / 100 : 0,
      paidAmount: item.payViewAmount ? item.payViewAmount / 100 : 0,
      
      // 统计数据
      likes: item.likeCount || 0,
      dislikes: item.dislikeCount || 0,
      answers: item.answerCount || 0,
      views: item.viewCount || 0,
      bookmarks: item.collectCount || 0,
      shares: 0, // API 未返回，默认为 0
      
      // 位置信息
      location: item.location || '',
      country: extractCountry(item.location),
      city: extractCity(item.location),
      
      // 时间
      time: formatTimeFromISO(item.createTime),
      createTime: item.createTime,
      
      // 用户信息（临时方案）
      userId: item.userId,
      author: `用户${item.userId}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${item.userId}`,
      
      // 其他信息
      status: item.status,
      solvedPercent: item.adoptRate || 0,
    };
  };
  
  /**
   * 获取问题类型
   */
  const getQuestionType = (type) => {
    switch (type) {
      case 0:
        return 'free';      // 公开问题
      case 1:
        return 'reward';    // 悬赏问题
      case 2:
        return 'targeted';  // 定向问题
      default:
        return 'free';
    }
  };
  
  /**
   * 从位置信息中提取国家
   */
  const extractCountry = (location) => {
    if (!location) return '未知';
    // 简单实现，可以根据实际情况优化
    const parts = location.split(/[省市区]/);
    return parts[0] || '中国';
  };
  
  /**
   * 从位置信息中提取城市
   */
  const extractCity = (location) => {
    if (!location) return '未知';
    // 简单实现，可以根据实际情况优化
    const match = location.match(/(.+?)[省市]/);
    return match ? match[1] : location;
  };
  
  /**
   * 格式化 ISO 时间为相对时间
   */
  const formatTimeFromISO = (isoTime) => {
    if (!isoTime) return '未知';
    
    const now = new Date();
    const time = new Date(isoTime);
    const diff = now - time;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days >= 1) {
      return `${days}天前`;
    } else if (hours >= 1) {
      return `${hours}小时前`;
    } else if (minutes >= 1) {
      return `${minutes}分钟前`;
    } else {
      return '刚刚';
    }
  };
  
  // ============================================
  // 4. 下拉刷新和上拉加载
  // ============================================
  
  /**
   * 下拉刷新
   */
  const onRefresh = async () => {
    await loadQuestions(1, true);
  };
  
  /**
   * 上拉加载更多
   */
  const onLoadMore = async () => {
    if (!loadingMore && hasMore && !loading) {
      await loadQuestions(page + 1);
    }
  };
  
  // ============================================
  // 5. 生命周期
  // ============================================
  
  /**
   * 当 Tab 切换时加载数据
   */
  useEffect(() => {
    if (activeTab) {
      loadQuestions(1);
    }
  }, [activeTab]);
  
  // ============================================
  // 6. 渲染底部组件
  // ============================================
  
  /**
   * 渲染列表底部
   */
  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color="#ef4444" />
          <Text style={styles.footerText}>加载中...</Text>
        </View>
      );
    }
    
    if (!hasMore && questionList.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>没有更多内容了</Text>
        </View>
      );
    }
    
    return null;
  };
  
  /**
   * 渲染空状态
   */
  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.emptyText}>加载中...</Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>😕 {error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => loadQuestions(1)}
          >
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>暂无数据</Text>
      </View>
    );
  };
  
  // ============================================
  // 7. 渲染列表
  // ============================================
  
  return (
    <View style={styles.container}>
      {/* 这里是你的顶部搜索栏和 Tab 栏 */}
      
      {/* 问题列表 */}
      <FlashList
        data={questionList}
        estimatedItemSize={300}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ef4444']}
            tintColor="#ef4444"
          />
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => (
          {/* 这里是你的问题卡片组件 */}
          {/* 现在 item 包含了从 API 获取并转换后的数据 */}
        )}
      />
    </View>
  );
}

// ============================================
// 8. 样式
// ============================================

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  footerLoading: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  footerEnd: {
    padding: 16,
    alignItems: 'center',
  },
  footerEndText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
};
