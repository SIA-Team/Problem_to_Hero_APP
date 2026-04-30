import answerApi from './api/answerApi';

export const PUBLIC_PROFILE_ANSWERS_ENDPOINT_PENDING = 'PUBLIC_PROFILE_ANSWERS_ENDPOINT_PENDING';

const isSuccessfulBusinessResponse = response => {
  const code = Number(response?.code ?? response?.data?.code);
  return code === 0 || code === 200;
};

const getBusinessMessage = response => {
  const message =
    response?.msg ??
    response?.message ??
    response?.data?.msg ??
    response?.data?.message ??
    '';

  return typeof message === 'string' ? message.trim() : '';
};

const getFirstNonEmptyValue = (...values) =>
  values.find(value => value !== undefined && value !== null && value !== '');

const normalizeCount = (...values) => {
  for (const value of values) {
    const normalizedValue = Number(value);
    if (Number.isFinite(normalizedValue) && normalizedValue >= 0) {
      return normalizedValue;
    }
  }

  return 0;
};

export const extractProfileAnswerRows = response => {
  const rawData = response?.data;
  const payload = rawData?.data && typeof rawData?.data === 'object' ? rawData.data : rawData;

  if (Array.isArray(payload)) {
    return {
      rows: payload,
      total: payload.length,
    };
  }

  const rows = payload?.rows || payload?.list || payload?.records || payload?.items || [];
  const total = Number(payload?.total ?? payload?.count ?? payload?.totalCount ?? rows.length) || rows.length;

  return {
    rows: Array.isArray(rows) ? rows : [],
    total,
  };
};

export const normalizeProfileAnswerItem = item => {
  const id = getFirstNonEmptyValue(item?.answerId, item?.id, item?.contentId, item?.targetId);
  const questionId = getFirstNonEmptyValue(item?.questionId, item?.problemId, item?.targetQuestionId);
  const questionTitle = getFirstNonEmptyValue(
    item?.questionTitle,
    item?.title,
    item?.problemTitle,
    item?.targetTitle,
    ''
  );
  const content = getFirstNonEmptyValue(item?.content, item?.answerContent, item?.summary, item?.description, '');
  const createdAt = getFirstNonEmptyValue(
    item?.answerTime,
    item?.createTime,
    item?.createdAt,
    item?.updateTime,
    item?.updatedAt,
    item?.publishTime
  );
  const likesCount = normalizeCount(item?.likeCount, item?.likesCount, item?.likeNum, item?.likes);
  const commentsCount = normalizeCount(
    item?.commentCount,
    item?.commentsCount,
    item?.commentNum,
    item?.replyCount,
    item?.comments
  );
  const sharesCount = normalizeCount(
    item?.shareCount,
    item?.sharesCount,
    item?.shareNum,
    item?.shares,
    item?.forwardCount
  );
  const collectsCount = normalizeCount(
    item?.collectCount,
    item?.collects,
    item?.bookmarkCount,
    item?.bookmarks,
    item?.favoriteCount
  );
  const dislikesCount = normalizeCount(item?.dislikeCount, item?.dislikesCount, item?.dislikeNum, item?.dislikes);

  return {
    ...item,
    id,
    answerId: item?.answerId ?? id,
    questionId,
    questionTitle: String(questionTitle || ''),
    content: String(content || ''),
    createdAt,
    time: createdAt,
    likesCount,
    commentsCount,
    sharesCount,
    collectsCount,
    dislikesCount,
    likes: likesCount,
    comments: commentsCount,
    shares: sharesCount,
    collects: collectsCount,
    dislikes: dislikesCount,
    adopted: Boolean(item?.adopted ?? item?.isAdopted ?? item?.accepted ?? item?.isAccepted),
  };
};

export const loadOwnProfileAnswersPage = async ({ pageNum = 1, pageSize = 10 } = {}) => {
  const response = await answerApi.getMyAnswers({
    pageNum,
    pageSize,
  });

  if (!isSuccessfulBusinessResponse(response)) {
    throw new Error(getBusinessMessage(response) || 'Failed to load my answers');
  }

  const { rows = [], total = 0 } = extractProfileAnswerRows(response);

  return {
    rows: rows.map(normalizeProfileAnswerItem).filter(item => item?.id),
    total,
    response,
  };
};

export const loadProfileAnswersPage = async ({
  isOwnProfile = false,
  userId,
  pageNum = 1,
  pageSize = 10,
} = {}) => {
  if (isOwnProfile) {
    return loadOwnProfileAnswersPage({ pageNum, pageSize });
  }

  const error = new Error('Public profile answers endpoint is not available yet');
  error.code = PUBLIC_PROFILE_ANSWERS_ENDPOINT_PENDING;
  error.userId = userId;
  throw error;
};

export const isPublicProfileAnswersEndpointPendingError = error =>
  error?.code === PUBLIC_PROFILE_ANSWERS_ENDPOINT_PENDING;
