export const normalizeQuestionAdoptRate = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(Math.max(Math.round(numericValue), 0), 100);
};

export const getQuestionAdoptRate = (question) => {
  if (question && typeof question === 'object') {
    return normalizeQuestionAdoptRate(question.adoptRate ?? question.solvedPercent);
  }

  return normalizeQuestionAdoptRate(question);
};

export const getQuestionPayViewAmount = (question) => {
  if (!question || typeof question !== 'object') {
    return 0;
  }

  return Math.max(Number(question.payViewAmount ?? question.price ?? 0) || 0, 0);
};

export const isQuestionSolvedByAdoptRate = (question) => {
  return getQuestionAdoptRate(question) >= 50;
};

export const shouldRequirePaidQuestionAccess = (question) => {
  if (!question || typeof question !== 'object') {
    return false;
  }

  const payViewAmount = getQuestionPayViewAmount(question);
  return payViewAmount > 0 && isQuestionSolvedByAdoptRate(question);
};
