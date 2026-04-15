const QUESTION_DETAIL_CACHE_TTL = 5 * 60 * 1000;

const questionDetailCache = new Map();
const questionDetailListCache = new Map();

const normalizeQuestionId = questionId => {
  const normalizedQuestionId = String(questionId ?? '').trim();
  return normalizedQuestionId || null;
};

const isExpired = timestamp => {
  if (!timestamp) {
    return true;
  }

  return Date.now() - timestamp > QUESTION_DETAIL_CACHE_TTL;
};

const cloneCacheData = data => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    return data;
  }
};

export const getQuestionDetailCache = questionId => {
  const normalizedQuestionId = normalizeQuestionId(questionId);

  if (!normalizedQuestionId) {
    return null;
  }

  const cachedEntry = questionDetailCache.get(normalizedQuestionId);
  if (!cachedEntry) {
    return null;
  }

  if (isExpired(cachedEntry.timestamp)) {
    questionDetailCache.delete(normalizedQuestionId);
    return null;
  }

  return cloneCacheData(cachedEntry.data);
};

export const setQuestionDetailCache = (questionId, data) => {
  const normalizedQuestionId = normalizeQuestionId(questionId);

  if (!normalizedQuestionId || !data || typeof data !== 'object') {
    return null;
  }

  questionDetailCache.set(normalizedQuestionId, {
    data: cloneCacheData(data),
    timestamp: Date.now(),
  });

  return data;
};

export const getQuestionDetailListCaches = questionId => {
  const normalizedQuestionId = normalizeQuestionId(questionId);

  if (!normalizedQuestionId) {
    return null;
  }

  const cachedEntry = questionDetailListCache.get(normalizedQuestionId);
  if (!cachedEntry) {
    return null;
  }

  if (isExpired(cachedEntry.timestamp)) {
    questionDetailListCache.delete(normalizedQuestionId);
    return null;
  }

  return cloneCacheData(cachedEntry.data);
};

export const setQuestionDetailListCaches = (questionId, data) => {
  const normalizedQuestionId = normalizeQuestionId(questionId);

  if (!normalizedQuestionId || !data || typeof data !== 'object') {
    return null;
  }

  questionDetailListCache.set(normalizedQuestionId, {
    data: cloneCacheData(data),
    timestamp: Date.now(),
  });

  return data;
};

export const clearQuestionDetailCache = questionId => {
  const normalizedQuestionId = normalizeQuestionId(questionId);

  if (!normalizedQuestionId) {
    return false;
  }

  questionDetailListCache.delete(normalizedQuestionId);
  return questionDetailCache.delete(normalizedQuestionId);
};
