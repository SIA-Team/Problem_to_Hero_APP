import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateCacheEntries } from '../utils/cacheManager';

const listeners = new Set();
const interactionStateByQuestionId = new Map();
const QUESTION_INTERACTION_SNAPSHOTS_STORAGE_KEY = '@question_interaction_snapshots_v1';
let hydrationPromise = null;
let hasHydratedSnapshots = false;

const normalizeQuestionId = questionId => {
  const normalizedQuestionId = String(questionId ?? '').trim();
  return normalizedQuestionId || null;
};

const toCount = value => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const toBoolean = value => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value > 0;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (!normalizedValue) {
      return false;
    }

    if (['1', 'true', 'yes', 'y', 'on', 'liked', 'collected', 'disliked', 'favorited'].includes(normalizedValue)) {
      return true;
    }

    if (['0', 'false', 'no', 'n', 'off', 'unliked', 'uncollected', 'undisliked'].includes(normalizedValue)) {
      return false;
    }
  }

  return Boolean(value);
};

const ensureHydratedQuestionInteractionSnapshots = async () => {
  if (hasHydratedSnapshots) {
    return;
  }

  if (!hydrationPromise) {
    hydrationPromise = (async () => {
      try {
        const rawValue = await AsyncStorage.getItem(QUESTION_INTERACTION_SNAPSHOTS_STORAGE_KEY);
        if (!rawValue) {
          hasHydratedSnapshots = true;
          return;
        }

        const parsedValue = JSON.parse(rawValue);
        if (!parsedValue || typeof parsedValue !== 'object') {
          hasHydratedSnapshots = true;
          return;
        }

        Object.values(parsedValue).forEach((value) => {
          const snapshot = buildQuestionInteractionSnapshot(value);
          if (snapshot && !interactionStateByQuestionId.has(snapshot.id)) {
            interactionStateByQuestionId.set(snapshot.id, snapshot);
          }
        });
      } catch (error) {
        console.error('hydrate question interaction snapshots failed:', error);
      } finally {
        hasHydratedSnapshots = true;
      }
    })().finally(() => {
      hydrationPromise = null;
    });
  }

  await hydrationPromise;
};

const persistQuestionInteractionState = async () => {
  await ensureHydratedQuestionInteractionSnapshots();

  try {
    await AsyncStorage.setItem(
      QUESTION_INTERACTION_SNAPSHOTS_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(interactionStateByQuestionId.entries()))
    );
  } catch (error) {
    console.error('persist question interaction snapshots failed:', error);
  }
};

export const buildQuestionInteractionSnapshot = (question = {}, overrides = {}) => {
  const questionId = overrides.id ?? overrides.questionId ?? question.id ?? question.questionId;
  const normalizedQuestionId = normalizeQuestionId(questionId);

  if (!normalizedQuestionId) {
    return null;
  }

  return {
    id: normalizedQuestionId,
    liked: toBoolean(overrides.liked ?? question.liked ?? question.isLiked ?? question.likeStatus),
    disliked: toBoolean(overrides.disliked ?? question.disliked ?? question.isDisliked ?? question.dislikeStatus),
    collected: toBoolean(
      overrides.collected ??
      overrides.bookmarked ??
      question.collected ??
      question.isCollected ??
      question.bookmarked ??
      question.isBookmarked ??
      question.favorited ??
      question.isFavorited
    ),
    likeCount: toCount(overrides.likeCount ?? question.likeCount ?? question.likes ?? question.likeNum ?? question.likesCount ?? question.thumbsUpCount),
    dislikeCount: toCount(overrides.dislikeCount ?? question.dislikeCount ?? question.dislikes ?? question.dislikeNum ?? question.dislikesCount ?? question.thumbsDownCount),
    collectCount: toCount(
      overrides.collectCount ??
      overrides.bookmarkCount ??
      question.collectCount ??
      question.bookmarkCount ??
      question.bookmarks ??
      question.collectNum ??
      question.favoriteCount ??
      question.favoritesCount
    ),
  };
};

export const applyQuestionInteractionSnapshot = (question = {}, snapshot) => {
  if (!question || typeof question !== 'object' || !snapshot) {
    return question;
  }

  const resolvedLikeCount = toCount(snapshot.likeCount);
  const resolvedDislikeCount = toCount(snapshot.dislikeCount);
  const resolvedCollectCount = toCount(snapshot.collectCount);

  return {
    ...question,
    liked: snapshot.liked,
    isLiked: snapshot.liked,
    disliked: snapshot.disliked,
    isDisliked: snapshot.disliked,
    collected: snapshot.collected,
    isCollected: snapshot.collected,
    bookmarked: snapshot.collected,
    isBookmarked: snapshot.collected,
    likeCount: resolvedLikeCount,
    likes: resolvedLikeCount,
    dislikeCount: resolvedDislikeCount,
    dislikes: resolvedDislikeCount,
    collectCount: resolvedCollectCount,
    bookmarkCount: resolvedCollectCount,
    bookmarks: resolvedCollectCount,
    __likeCountResolved: true,
    __dislikeCountResolved: true,
    __collectCountResolved: true,
  };
};

const persistQuestionInteractionSnapshot = async (snapshot) => {
  if (!snapshot?.id) {
    return;
  }

  await persistQuestionInteractionState();
  await updateCacheEntries('questions', (questionList) => {
    if (!Array.isArray(questionList)) {
      return questionList;
    }

    let didChange = false;
    const nextQuestionList = questionList.map((question) => {
      const normalizedQuestionId = normalizeQuestionId(question?.id ?? question?.questionId);
      if (normalizedQuestionId !== snapshot.id) {
        return question;
      }

      didChange = true;
      return applyQuestionInteractionSnapshot(question, snapshot);
    });

    return didChange ? nextQuestionList : questionList;
  });
};

export const publishQuestionInteractionSync = snapshotOrQuestion => {
  const snapshot = buildQuestionInteractionSnapshot(snapshotOrQuestion);

  if (!snapshot) {
    return null;
  }

  interactionStateByQuestionId.set(snapshot.id, snapshot);
  void persistQuestionInteractionSnapshot(snapshot);
  listeners.forEach(listener => {
    try {
      listener(snapshot);
    } catch (error) {
      console.warn('question interaction sync listener failed:', error);
    }
  });

  return snapshot;
};

export const getQuestionInteractionSnapshot = questionId => {
  const normalizedQuestionId = normalizeQuestionId(questionId);
  return normalizedQuestionId ? interactionStateByQuestionId.get(normalizedQuestionId) ?? null : null;
};

export const getQuestionInteractionSnapshotAsync = async questionId => {
  await ensureHydratedQuestionInteractionSnapshots();
  return getQuestionInteractionSnapshot(questionId);
};

export const applyPersistedQuestionInteractionSnapshots = async (questions = []) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return questions;
  }

  await ensureHydratedQuestionInteractionSnapshots();

  return questions.map((question) => {
    const snapshot = getQuestionInteractionSnapshot(question?.id ?? question?.questionId);
    return snapshot ? applyQuestionInteractionSnapshot(question, snapshot) : question;
  });
};

export const subscribeQuestionInteractionSync = listener => {
  if (typeof listener !== 'function') {
    return () => {};
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
