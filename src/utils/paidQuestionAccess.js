import AsyncStorage from '@react-native-async-storage/async-storage';

const PAID_QUESTION_ACCESS_KEY = '@paid_question_access';

const normalizeQuestionId = questionId => {
  if (questionId === undefined || questionId === null || questionId === '') {
    return '';
  }

  return String(questionId);
};

const normalizeAccessMap = rawValue => {
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    return {};
  }

  return Object.entries(rawValue).reduce((accumulator, [questionId, record]) => {
    const normalizedId = normalizeQuestionId(questionId);

    if (!normalizedId || !record || typeof record !== 'object') {
      return accumulator;
    }

    accumulator[normalizedId] = {
      paidAt: record.paidAt || new Date().toISOString(),
      paidAmount: Number(record.paidAmount) || 0,
    };

    return accumulator;
  }, {});
};

export const getPaidQuestionAccessMap = async () => {
  try {
    const rawValue = await AsyncStorage.getItem(PAID_QUESTION_ACCESS_KEY);

    if (!rawValue) {
      return {};
    }

    return normalizeAccessMap(JSON.parse(rawValue));
  } catch (error) {
    console.error('Failed to load paid question access state:', error);
    return {};
  }
};

export const hasPaidQuestionAccess = async questionId => {
  const normalizedId = normalizeQuestionId(questionId);

  if (!normalizedId) {
    return false;
  }

  const accessMap = await getPaidQuestionAccessMap();
  return Boolean(accessMap[normalizedId]);
};

export const markQuestionAsPaid = async ({ questionId, paidAmount = 0 } = {}) => {
  const normalizedId = normalizeQuestionId(questionId);

  if (!normalizedId) {
    throw new Error('Question id is required to mark paid access');
  }

  const accessMap = await getPaidQuestionAccessMap();
  const nextRecord = {
    paidAt: new Date().toISOString(),
    paidAmount: Number(paidAmount) || 0,
  };
  const nextMap = {
    ...accessMap,
    [normalizedId]: nextRecord,
  };

  await AsyncStorage.setItem(PAID_QUESTION_ACCESS_KEY, JSON.stringify(nextMap));

  return nextRecord;
};

export const applyPaidQuestionAccessState = async questions => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return Array.isArray(questions) ? questions : [];
  }

  const accessMap = await getPaidQuestionAccessMap();

  return questions.map(question => {
    if (!question || typeof question !== 'object') {
      return question;
    }

    const normalizedId = normalizeQuestionId(question.id ?? question.questionId);
    const payViewAmount = Number(question.payViewAmount) || 0;
    const paidAmount = Number(question.paidAmount) || 0;
    const isPaidQuestion = question.type === 'paid' || payViewAmount > 0 || paidAmount > 0;

    if (!isPaidQuestion || !normalizedId) {
      return question;
    }

    const accessRecord = accessMap[normalizedId] || null;

    return {
      ...question,
      isPaid: Boolean(question.isPaid || accessRecord),
      paidAccessRecord: accessRecord,
    };
  });
};
