import notificationApi from '../services/api/notificationApi';
import { buildShareParams, buildShareUrl } from './shareService';

const isSuccessResponse = (response) => response && (response.code === 200 || response.code === 0);

const truncateText = (value, maxLength = 80) => {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
};

const firstNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

const resolveShareTypeLabel = (shareType) => {
  switch (shareType) {
    case 'shareanswer':
    case 'answer':
      return 'answer';
    case 'sharesupplement':
    case 'supplement':
      return 'supplement';
    case 'sharecomment':
    case 'comment':
      return 'comment';
    case 'sharequestion':
    case 'question':
    default:
      return 'question';
  }
};

const normalizeShareDescriptor = (shareData = {}) => {
  const safeShareData = shareData && typeof shareData === 'object' ? shareData : {};
  const normalizedParams = buildShareParams(safeShareData);
  const fallbackTitle = `Shared a ${resolveShareTypeLabel(normalizedParams.type)}`;
  const title = truncateText(safeShareData.title, 60);
  const content = truncateText(safeShareData.content, 90);
  const summary = content || title || fallbackTitle;

  return {
    shareType: normalizedParams.type,
    shareUrl: buildShareUrl(safeShareData),
    title: title || fallbackTitle,
    summary,
    image: safeShareData.image || safeShareData.coverImage || safeShareData.images?.[0] || '',
    params: normalizedParams,
  };
};

const normalizeKeyword = (value = '') => `${value}`.trim().toLowerCase();

const scoreUserMatch = (user, keyword) => {
  if (!keyword) {
    return 1;
  }

  const username = normalizeKeyword(user.username);
  const nickname = normalizeKeyword(user.nickname);
  const userId = normalizeKeyword(user.userId || user.id);
  let score = 0;

  if (nickname.startsWith(keyword)) {
    score += 120;
  } else if (nickname.includes(keyword)) {
    score += 70;
  }

  if (username.startsWith(keyword)) {
    score += 100;
  } else if (username.includes(keyword)) {
    score += 60;
  }

  if (userId === keyword) {
    score += 80;
  } else if (userId.includes(keyword)) {
    score += 30;
  }

  return score;
};

const extractListFromPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows;
  }

  if (Array.isArray(payload.list)) {
    return payload.list;
  }

  if (Array.isArray(payload.records)) {
    return payload.records;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return extractListFromPayload(payload.data || payload.result || payload.page);
};

export const buildPrivateShareText = (shareData = {}) => {
  const descriptor = normalizeShareDescriptor(shareData);
  return `I shared a ${resolveShareTypeLabel(descriptor.shareType)} on Kaiwen: ${descriptor.title}\n${descriptor.shareUrl}`;
};

export const buildPrivateSharePayload = (shareData = {}) => {
  const descriptor = normalizeShareDescriptor(shareData);

  return {
    kind: 'content_share',
    shareType: descriptor.shareType,
    title: descriptor.title,
    summary: descriptor.summary,
    image: descriptor.image,
    url: descriptor.shareUrl,
    params: descriptor.params,
  };
};

export const normalizeFriendUser = (user = {}, fallbackIndex = 0) => {
  const id =
    user?.userId ??
    user?.id ??
    user?.uid ??
    user?.peerUserId ??
    `friend-${fallbackIndex}`;

  const nickname = firstNonEmptyString(
    user?.nickName,
    user?.nickname,
    user?.displayName,
    user?.name,
    user?.userName,
    user?.username,
    user?.peerNickName
  ) || `User ${id}`;

  const username = firstNonEmptyString(
    user?.username,
    user?.userName,
    user?.accountName,
    user?.peerUserName,
    user?.peerNickName,
    user?.nickName,
    user?.nickname
  ) || nickname;

  return {
    id: String(id),
    userId: String(id),
    username,
    nickname,
    avatar:
      user?.avatar ||
      user?.userAvatar ||
      user?.peerAvatar ||
      user?.authorAvatar ||
      user?.profilePicture ||
      '',
  };
};

export const mergeFriendUsers = (users = []) => {
  const merged = [];
  const seenIds = new Set();

  users.forEach((user, index) => {
    const normalizedUser = normalizeFriendUser(user, index);
    const dedupeKey = String(normalizedUser.userId || normalizedUser.id);

    if (seenIds.has(dedupeKey)) {
      return;
    }

    seenIds.add(dedupeKey);
    merged.push(normalizedUser);
  });

  return merged;
};

export const filterFriendUsers = (users = [], keyword = '') => {
  const normalizedKeyword = normalizeKeyword(keyword);
  const normalizedUsers = mergeFriendUsers(users);

  if (!normalizedKeyword) {
    return normalizedUsers;
  }

  return normalizedUsers
    .map((user) => ({
      user,
      score: scoreUserMatch(user, normalizedKeyword),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.user.nickname.localeCompare(right.user.nickname);
    })
    .map((item) => item.user);
};

export const normalizeFollowingResponse = (response) => {
  const list = extractListFromPayload(response?.data);
  return mergeFriendUsers(list);
};

const candidateRecipientKeys = [
  'peerUserId',
  'receiverUserId',
  'receiveUserId',
  'toUserId',
  'targetUserId',
];

const conversationIdCandidateKeys = [
  'conversationId',
  'conversationID',
  'conversation_id',
  'convId',
];

const normalizeConversationId = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  const normalizedValue = `${value}`.trim();
  return normalizedValue;
};

const normalizeRecipientUserId = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return `${value}`.trim();
};

const extractConversationIdFromValue = (value, depth = 0) => {
  if (depth > 5 || value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nestedConversationId = extractConversationIdFromValue(item, depth + 1);
      if (nestedConversationId) {
        return nestedConversationId;
      }
    }
    return '';
  }

  if (typeof value !== 'object') {
    return '';
  }

  for (const key of conversationIdCandidateKeys) {
    const nestedConversationId = normalizeConversationId(value[key]);
    if (nestedConversationId) {
      return nestedConversationId;
    }
  }

  const nestedCandidateKeys = ['data', 'result', 'record', 'message', 'payload'];
  for (const key of nestedCandidateKeys) {
    const nestedConversationId = extractConversationIdFromValue(value[key], depth + 1);
    if (nestedConversationId) {
      return nestedConversationId;
    }
  }

  return '';
};

export const extractConversationIdFromPrivateMessageResponse = (response) =>
  extractConversationIdFromValue(response);

const buildRequestCandidates = ({ recipientUserId, conversationId, content, payload, mode = 'share' }) => {
  const serializedPayload = payload ? JSON.stringify(payload) : undefined;
  const normalizedRecipientUserId = normalizeRecipientUserId(recipientUserId);
  const normalizedConversationId = normalizeConversationId(conversationId);

  if (normalizedConversationId) {
    const basePayload = {
      conversationId: normalizedConversationId,
      content,
    };

    const richPayload =
      mode === 'share'
        ? {
            ...basePayload,
            messageType: 'SHARE',
            bizType: 'CONTENT_SHARE',
            payload: serializedPayload,
          }
        : {
            ...basePayload,
            messageType: 'TEXT',
          };

    return [richPayload, basePayload];
  }

  return candidateRecipientKeys.flatMap((recipientKey) => {
    const basePayload = {
      [recipientKey]: normalizedRecipientUserId,
      content,
    };

    const richPayload =
      mode === 'share'
        ? {
            ...basePayload,
            messageType: 'SHARE',
            bizType: 'CONTENT_SHARE',
            payload: serializedPayload,
          }
        : {
            ...basePayload,
            messageType: 'TEXT',
          };

    return [richPayload, basePayload];
  });
};

const sendWithCandidates = async (candidates) => {
  let lastError;

  for (const requestBody of candidates) {
    try {
      const response = await notificationApi.sendPrivateMessage(requestBody);
      if (isSuccessResponse(response)) {
        return response;
      }

      lastError = new Error(response?.msg || response?.message || 'Failed to send private message');
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Failed to send private message');
};

export const sendPrivateShareMessage = async ({ recipientUserId, shareData }) => {
  const content = buildPrivateShareText(shareData);
  const payload = buildPrivateSharePayload(shareData);
  const candidates = buildRequestCandidates({
    recipientUserId,
    content,
    payload,
    mode: 'share',
  });

  const response = await sendWithCandidates(candidates);
  const conversationId = extractConversationIdFromPrivateMessageResponse(response);
  return { response, content, payload, conversationId };
};

export const sendPlainPrivateMessage = async ({ recipientUserId, conversationId, content }) => {
  const normalizedContent = `${content || ''}`.trim();
  const normalizedRecipientUserId = normalizeRecipientUserId(recipientUserId);
  const normalizedConversationId = normalizeConversationId(conversationId);
  if (!normalizedContent) {
    throw new Error('Message content cannot be empty');
  }
  if (!normalizedRecipientUserId && !normalizedConversationId) {
    throw new Error('Recipient user id is required');
  }

  const requestBody = {
    content: normalizedContent,
  };

  if (normalizedConversationId) {
    requestBody.conversationId = normalizedConversationId;
  } else {
    requestBody.peerUserId = normalizedRecipientUserId;
  }

  const response = await notificationApi.sendPrivateMessage(requestBody);
  if (!isSuccessResponse(response)) {
    throw new Error(response?.msg || response?.message || 'Failed to send private message');
  }
  const resolvedConversationId = extractConversationIdFromPrivateMessageResponse(response);
  return { response, content: normalizedContent, conversationId: resolvedConversationId };
};
