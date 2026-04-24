import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OptimizedTabList from './OptimizedTabList';
import questionApi from '../services/api/questionApi';
import { formatAmount } from '../utils/rewardAmount';

/**
 * 首页 Tab 内容组件
 * 使用优化的列表组件
 */
const HomeTabContent = ({
  tabKey,
  tabType,
  isActive,
  navigation
}) => {
  /**
   * 获取问题列表数据
   */
  const fetchQuestions = useCallback(async ({
    page,
    pageSize,
    signal
  }) => {
    try {
      // 根据不同的 Tab 类型调用不同的接口
      let response;
      switch (tabType) {
        case 'recommend':
          // 推荐列表
          response = await questionApi.getRecommendList({
            pageNum: page,
            pageSize
          });
          break;
        case 'hot':
          // 热榜列表
          response = await questionApi.getHotList({
            pageNum: page,
            pageSize
          });
          break;
        case 'follow':
          // 关注列表
          response = await questionApi.getFollowList({
            pageNum: page,
            pageSize
          });
          break;
        default:
          // 默认获取推荐列表
          response = await questionApi.getRecommendList({
            pageNum: page,
            pageSize
          });
      }
      if (response.code === 200 && response.data) {
        return response.data.rows || response.data;
      }

      // 如果接口返回空数据，返回空数组而不是报错
      return [];
    } catch (error) {
      console.error('获取问题列表失败:', error);

      // 返回空数组而不是抛出错误，避免红屏
      // 在实际项目中，这里可以返回模拟数据用于开发
      return [];
    }
  }, [tabType]);

  /**
   * 渲染问题卡片
   */
  const renderQuestionItem = useCallback(({
    item,
    onPress
  }) => {
    return <TouchableOpacity style={styles.questionCard} onPress={() => onPress?.(item)} activeOpacity={0.7}>
        {/* 问题类型标签 */}
        {Boolean(item.type) && <View style={styles.typeTag}>
            {item.type === 'reward' && <>
                <Ionicons name="cash" size={14} color="#f97316" />
                <Text style={styles.typeText}>{formatAmount(item.reward)}</Text>
              </>}
            {item.type === 'paid' && <>
                <Ionicons name="lock-closed" size={14} color="#8b5cf6" />
              </>}
          </View>}
        
        {/* 问题标题 */}
        <Text style={styles.questionTitle} numberOfLines={3}>
          {item.title}
        </Text>
        
        {/* 问题图片 */}
        {Boolean(item.image) && <Image source={{
        uri: item.image
      }} style={styles.questionImage} />}
        
        {/* 底部信息 */}
        <View style={styles.questionFooter}>
          <View style={styles.authorInfo}>
            <Image source={{
            uri: item.avatar || 'https://via.placeholder.com/40'
          }} style={styles.avatar} />
            <Text style={styles.authorName}>{item.author}</Text>
            <Text style={styles.time}> · {item.time}</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="thumbs-up-outline" size={16} color="#6b7280" />
              <Text style={styles.statText}>{item.likes}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={16} color="#6b7280" />
              <Text style={styles.statText}>{item.answers}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>;
  }, []);

  /**
   * 处理问题点击
   */
  const handleQuestionPress = useCallback(item => {
    navigation?.navigate('QuestionDetail', {
      questionId: item.id
    });
  }, [navigation]);
  return <OptimizedTabList tabKey={tabKey} fetchFunction={fetchQuestions} isActive={isActive} renderItem={renderQuestionItem} onItemPress={handleQuestionPress} pageSize={20} cacheTimeout={5 * 60 * 1000} />;
};
const styles = StyleSheet.create({
  questionCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8
  },
  typeText: {
    fontSize: 12,
    color: '#f97316',
    fontWeight: '600',
    marginLeft: 4
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 24,
    marginBottom: 12
  },
  questionImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f3f4f6'
  },
  questionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#e5e7eb'
  },
  authorName: {
    fontSize: 13,
    color: '#6b7280'
  },
  time: {
    fontSize: 13,
    color: '#9ca3af'
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16
  },
  statText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 4
  }
});
export default HomeTabContent;
