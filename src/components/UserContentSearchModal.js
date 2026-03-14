import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/useTranslation';
import QuestionListItem from './QuestionListItem';
import AnswerListItem from './AnswerListItem';
import FavoriteListItem from './FavoriteListItem';
import { modalTokens } from './modalTokens';

/**
 * 用户内容搜索模态框组件
 */
export default function UserContentSearchModal({ 
  visible, 
  onClose, 
  userId,
  onContentPress 
}) {
  const { t } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 当模态框关闭时重置状态
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [visible]);

  /**
   * 执行搜索
   */
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    try {
      setIsSearching(true);
      setHasSearched(true);
      Keyboard.dismiss();

      // TODO: 实现API调用
      // const response = await searchUserContent(userId, searchQuery);
      // setSearchResults(response.data);

      // 模拟搜索延迟
      setTimeout(() => {
        // 模拟搜索结果 - 混合类型
        const mockResults = [
          {
            id: 'search-q1',
            type: 'question',
            title: `搜索结果：${searchQuery} - 如何学习编程？`,
            questionType: 'reward',
            reward: 50,
            solved: false,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            viewsCount: 8500,
            commentsCount: 12,
            likesCount: 45,
          },
          {
            id: 'search-a1',
            type: 'answer',
            questionTitle: `关于${searchQuery}的问题`,
            content: `这是关于${searchQuery}的详细回答内容...`,
            adopted: true,
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            likesCount: 123,
            commentsCount: 15,
          },
        ];
        
        setSearchResults(mockResults);
        setIsSearching(false);
      }, 800);
    } catch (err) {
      console.error('Search failed:', err);
      setIsSearching(false);
    }
  };

  /**
   * 清空搜索
   */
  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* 搜索头部 */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onClose}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>

          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('profile.searchPlaceholder') || '搜索该用户的内容'}
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={handleClear}
              >
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={!searchQuery.trim()}
          >
            <Text style={[
              styles.searchButtonText,
              !searchQuery.trim() && styles.searchButtonTextDisabled
            ]}>
              搜索
            </Text>
          </TouchableOpacity>
        </View>

        {/* 搜索结果 */}
        <View style={styles.content}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ef4444" />
              <Text style={styles.loadingText}>搜索中...</Text>
            </View>
          ) : hasSearched ? (
            searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={({ item }) => {
                  if (item.type === 'question') {
                    return <QuestionListItem item={item} onPress={onContentPress} />;
                  } else if (item.type === 'answer') {
                    return <AnswerListItem item={item} onPress={onContentPress} />;
                  } else if (item.type === 'favorite') {
                    return <FavoriteListItem item={item} onPress={onContentPress} />;
                  }
                  return null;
                }}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.resultsList}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>未找到相关内容</Text>
                <Text style={styles.emptyHint}>试试其他关键词</Text>
              </View>
            )
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>搜索该用户的内容</Text>
              <Text style={styles.emptyHint}>输入关键词开始搜索</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: modalTokens.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48, // 状态栏高度
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
    backgroundColor: modalTokens.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: modalTokens.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: modalTokens.textPrimary,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchButtonText: {
    fontSize: 15,
    color: modalTokens.danger,
    fontWeight: '700',
  },
  searchButtonTextDisabled: {
    color: modalTokens.textMuted,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: modalTokens.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: modalTokens.textSecondary,
    fontWeight: '600',
  },
  emptyHint: {
    marginTop: 8,
    fontSize: 14,
    color: modalTokens.textMuted,
  },
  resultsList: {
    paddingBottom: 20,
  },
});
