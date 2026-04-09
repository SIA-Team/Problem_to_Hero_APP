import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import KeyboardDismissView from '../components/KeyboardDismissView';
import { showAppAlert } from '../utils/appAlert';
import { scaleFont } from '../utils/responsive';
const searchHistory = ['Python学习', '养猫攻略', '职业规划', '数据分析'];
const hotSearches = [{
  rank: 1,
  text: '2024年最值得学习的编程语言',
  hot: true
}, {
  rank: 2,
  text: '如何高效学习新技能',
  rising: true
}, {
  rank: 3,
  text: '远程办公的利与弊'
}, {
  rank: 4,
  text: '健康饮食指南'
}, {
  rank: 5,
  text: '理财入门知识'
}, {
  rank: 6,
  text: '如何提高睡眠质量'
}];
const hotTopics = [{
  name: '#职场',
  color: '#ef4444',
  bg: '#fef2f2'
}, {
  name: '#科技',
  color: '#3b82f6',
  bg: '#eff6ff'
}, {
  name: '#健康',
  color: '#22c55e',
  bg: '#f0fdf4'
}, {
  name: '#教育',
  color: '#a855f7',
  bg: '#faf5ff'
}, {
  name: '#美食',
  color: '#f97316',
  bg: '#fff7ed'
}, {
  name: '#情感',
  color: '#ec4899',
  bg: '#fdf2f8'
}];
export default function SearchScreen({
  navigation
}) {
  const {
    t
  } = useTranslation();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [history, setHistory] = useState(searchHistory);
  const [hotList, setHotList] = useState(hotSearches);
  const handleSearch = () => {
    if (query.trim()) {
      if (!history.includes(query)) {
        setHistory([query, ...history.slice(0, 9)]);
      }
      navigation.navigate('QuestionDetail', {
        id: 1
      });
    }
  };
  const clearHistory = () => {
    showAppAlert(t('screens.search.alerts.clearHistoryTitle'), t('screens.search.alerts.clearHistoryMessage'), [{
      text: t('common.cancel'),
      style: 'cancel'
    }, {
      text: t('common.confirm'),
      onPress: () => setHistory([])
    }]);
  };
  const refreshHotList = () => {
    const shuffled = [...hotSearches].sort(() => Math.random() - 0.5);
    setHotList(shuffled);
  };
  const getRankStyle = rank => {
    if (rank === 1) return {
      backgroundColor: '#ef4444'
    };
    if (rank === 2) return {
      backgroundColor: '#f97316'
    };
    if (rank === 3) return {
      backgroundColor: '#eab308'
    };
    return {
      backgroundColor: '#d1d5db'
    };
  };
  return <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardDismissView>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput style={styles.searchInput} placeholder={t('screens.search.searchPlaceholder')} value={query} onChangeText={text => {
          setQuery(text);
          setIsSearching(text.length > 0);
        }} autoFocus />
          {query.length > 0 && <TouchableOpacity onPress={() => {
          setQuery('');
          setIsSearching(false);
        }}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>{t('screens.search.searchButton')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* 搜索历史 */}
        {history.length > 0 && <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('screens.search.history.title')}</Text>
              <TouchableOpacity onPress={clearHistory}><Ionicons name="trash-outline" size={18} color="#9ca3af" /></TouchableOpacity>
            </View>
            <View style={styles.tagList}>
              {history.map((item, index) => <TouchableOpacity key={index} style={styles.historyTag} onPress={() => {
            setQuery(item);
            setIsSearching(true);
          }}>
                  <Text style={styles.historyTagText}>{item}</Text>
                </TouchableOpacity>)}
            </View>
          </View>}

        {/* 热门搜索 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('screens.search.hotSearches.title')}</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={refreshHotList}>
              <Ionicons name="refresh" size={14} color="#9ca3af" />
              <Text style={styles.refreshText}>{t('screens.search.hotSearches.refresh')}</Text>
            </TouchableOpacity>
          </View>
          {hotList.map(item => <TouchableOpacity key={item.rank} style={styles.hotItem} onPress={() => {
          setQuery(item.text);
          navigation.navigate('QuestionDetail', {
            id: item.rank
          });
        }}>
              <View style={[styles.rankBadge, getRankStyle(item.rank)]}>
                <Text style={styles.rankText}>{item.rank}</Text>
              </View>
              <Text style={styles.hotText}>{item.text}</Text>
              {Boolean(item.hot) && <Text style={styles.hotTag}>🔥 {t('screens.search.hotSearches.hotTag')}</Text>}
              {Boolean(item.rising) && <Text style={styles.risingTag}>↑ {t('screens.search.hotSearches.risingTag')}</Text>}
            </TouchableOpacity>)}
        </View>

        {/* 热门话题 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('screens.search.hotTopics.title')}</Text>
            <TouchableOpacity onPress={() => showAppAlert(t('screens.search.alerts.viewMoreTitle'), t('screens.search.alerts.viewMoreMessage'))}><Text style={styles.moreText}>{t('screens.search.hotTopics.viewMore')}</Text></TouchableOpacity>
          </View>
          <View style={styles.tagList}>
            {hotTopics.map((topic, index) => <TouchableOpacity key={index} style={[styles.topicTag, {
            backgroundColor: topic.bg
          }]} onPress={() => {
            setQuery(topic.name);
            navigation.navigate('QuestionDetail', {
              id: index + 1
            });
          }}>
                <Text style={[styles.topicTagText, {
              color: topic.color
            }]}>{topic.name}</Text>
              </TouchableOpacity>)}
          </View>
        </View>
      </ScrollView>
      </KeyboardDismissView>
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff'
  },
  backBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: scaleFont(14)
  },
  searchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchBtnText: {
    color: '#ef4444',
    fontSize: scaleFont(14),
    fontWeight: '500'
  },
  content: {
    flex: 1
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937'
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  historyTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  historyTagText: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  refreshText: {
    marginLeft: 4,
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  hotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10
  },
  rankBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
  rankText: {
    color: '#fff',
    fontSize: scaleFont(11),
    fontWeight: 'bold'
  },
  hotText: {
    flex: 1,
    marginLeft: 12,
    fontSize: scaleFont(14),
    color: '#1f2937'
  },
  hotTag: {
    fontSize: scaleFont(11),
    color: '#ef4444'
  },
  risingTag: {
    fontSize: scaleFont(11),
    color: '#f97316'
  },
  moreText: {
    fontSize: scaleFont(12),
    color: '#ef4444'
  },
  topicTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  topicTagText: {
    fontSize: scaleFont(13)
  }
});
