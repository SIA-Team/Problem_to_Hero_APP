import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import QuestionListItem from '../components/QuestionListItem';
import questionApi from '../services/api/questionApi';
import { showToast } from '../utils/toast';
import { scaleFont } from '../utils/responsive';

const TOPIC_QUESTION_PAGE_SIZE = 50;

const stripTopicPrefix = value => String(value ?? '').trim().replace(/^#/, '');

const normalizeTopicName = value => stripTopicPrefix(value).toLowerCase();

const extractQuestionRows = payload => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [
    payload,
    payload?.data,
    payload?.page,
    payload?.pagination,
    payload?.result,
    payload?.data?.page,
    payload?.data?.pagination,
    payload?.data?.result,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    for (const key of ['rows', 'list', 'records', 'items', 'content', 'data']) {
      if (Array.isArray(candidate[key])) {
        return candidate[key];
      }
    }
  }

  return [];
};

const extractQuestionTopicNames = question => {
  const topicNames = [];

  if (Array.isArray(question?.topicNames)) {
    topicNames.push(...question.topicNames);
  }

  if (Array.isArray(question?.topics)) {
    topicNames.push(
      ...question.topics.map(topic => (typeof topic === 'string' ? topic : topic?.name)).filter(Boolean)
    );
  }

  if (question?.topicName) {
    topicNames.push(question.topicName);
  }

  return topicNames.filter(Boolean);
};

const getRewardAmountForCard = question => {
  const rewardAmount = Number(question?.rewardAmount ?? 0) || 0;
  if (rewardAmount > 0) {
    return rewardAmount;
  }

  const bountyAmount = Number(question?.bountyAmount ?? 0) || 0;
  if (bountyAmount > 0) {
    return bountyAmount / 100;
  }

  return 0;
};

const normalizeTopicQuestion = (question, index = 0) => {
  const id = String(question?.id ?? question?.questionId ?? `topic-question-${index}`).trim();
  if (!id) {
    return null;
  }

  const rewardAmount = getRewardAmountForCard(question);

  return {
    id,
    title: question?.title ?? question?.questionTitle ?? '',
    createdAt: question?.createdAt ?? question?.createTime ?? question?.gmtCreate ?? '',
    viewsCount: Number(question?.viewCount ?? question?.browseCount ?? question?.views ?? 0) || 0,
    commentsCount: Number(question?.commentCount ?? question?.comments ?? question?.answerCount ?? 0) || 0,
    likesCount: Number(question?.likeCount ?? question?.likes ?? 0) || 0,
    solved: Number(question?.isSolved ?? question?.solved ?? 0) === 1,
    questionType: rewardAmount > 0 || Number(question?.type ?? question?.questionType ?? 0) === 1
      ? 'reward'
      : 'free',
    reward: rewardAmount,
    raw: question,
  };
};

const isQuestionMatchedToTopic = (question, topicName) => {
  const normalizedTopicName = normalizeTopicName(topicName);

  if (!normalizedTopicName) {
    return false;
  }

  const topicMatches = extractQuestionTopicNames(question).some(
    name => normalizeTopicName(name) === normalizedTopicName
  );

  if (topicMatches) {
    return true;
  }

  const searchableText = [
    question?.title,
    question?.questionTitle,
    question?.description,
    question?.content,
  ]
    .map(value => String(value ?? '').toLowerCase())
    .join(' ');

  return searchableText.includes(normalizedTopicName);
};

export default function TopicDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeTopic = route?.params?.topic ?? {};
  const topicName = routeTopic?.name ?? route?.params?.topicName ?? '#Topic';
  const topicDisplayName = stripTopicPrefix(topicName) ? topicName : `#${stripTopicPrefix(topicName)}`;
  const loadFailedText = t('topicDetail.loadFailed');
  const relatedQuestionsText = t('topicDetail.relatedQuestions');
  const emptyTitleText = t('topicDetail.emptyTitle');
  const emptyHintText = t('topicDetail.emptyHint');
  const topicDetailTitleText = t('topicDetail.title');
  const homeFollowersText = t('home.followers');
  const homeQuestionsText = t('home.questions');

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTopicQuestions = useCallback(
    async ({ isRefresh = false } = {}) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await questionApi.getQuestions({
          pageNum: 1,
          pageSize: TOPIC_QUESTION_PAGE_SIZE,
          question: {
            status: 1,
          },
        });

        if (!response || response.code !== 200) {
          throw new Error(response?.msg || loadFailedText);
        }

        const matchedQuestions = extractQuestionRows(response?.data)
          .filter(question => isQuestionMatchedToTopic(question, topicDisplayName))
          .map((question, index) => normalizeTopicQuestion(question, index))
          .filter(Boolean);

        setQuestions(matchedQuestions);
      } catch (error) {
        setQuestions([]);
        showToast(error?.message || loadFailedText, 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadFailedText, topicDisplayName]
  );

  useEffect(() => {
    loadTopicQuestions();
  }, [loadTopicQuestions]);

  const handleQuestionPress = useCallback(
    item => {
      navigation.navigate('QuestionDetail', {
        id: item.id,
        questionId: item.id,
      });
    },
    [navigation]
  );

  const listHeaderComponent = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <View style={[styles.topicIcon, { backgroundColor: `${routeTopic?.color || '#ef4444'}20` }]}>
          <Ionicons
            name={routeTopic?.icon || 'pricetags-outline'}
            size={28}
            color={routeTopic?.color || '#ef4444'}
          />
        </View>
        <Text style={styles.topicName}>{topicDisplayName}</Text>
        {routeTopic?.description ? (
          <Text style={styles.topicDescription}>{routeTopic.description}</Text>
        ) : null}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{routeTopic?.followers || '--'}</Text>
            <Text style={styles.statLabel}>{homeFollowersText}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{routeTopic?.questions || '--'}</Text>
            <Text style={styles.statLabel}>{homeQuestionsText}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{relatedQuestionsText}</Text>
        </View>
      </View>
    ),
    [
      routeTopic?.color,
      routeTopic?.description,
      routeTopic?.followers,
      routeTopic?.icon,
      routeTopic?.questions,
      homeFollowersText,
      homeQuestionsText,
      relatedQuestionsText,
      topicDisplayName,
    ]
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={60} color="#d1d5db" />
        <Text style={styles.emptyTitle}>{emptyTitleText}</Text>
        <Text style={styles.emptyHint}>{emptyHintText}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {topicDetailTitleText}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={questions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <QuestionListItem item={item} onPress={handleQuestionPress} />}
        ListHeaderComponent={listHeaderComponent}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTopicQuestions({ isRefresh: true })}
            colors={['#ef4444']}
            tintColor="#ef4444"
          />
        }
        contentContainerStyle={questions.length === 0 ? styles.emptyContentContainer : styles.listContentContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    flex: 1,
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  headerBlock: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  topicIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  topicName: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    color: '#111827',
  },
  topicDescription: {
    marginTop: 8,
    fontSize: scaleFont(14),
    lineHeight: scaleFont(21),
    color: '#6b7280',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  statValue: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    marginTop: 4,
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  sectionHeader: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
  },
  listContentContainer: {
    paddingBottom: 16,
  },
  emptyContentContainer: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 56,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
  },
  emptyHint: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: scaleFont(13),
    lineHeight: scaleFont(20),
    color: '#9ca3af',
  },
});
