import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PREFIX = 'question-local-invites:v1:';

const normalizeText = value => String(value ?? '').trim();

export const LOCAL_INVITE_STATUSES = Object.freeze({
  INVITED: 'invited',
  SERVICE_UNAVAILABLE: 'service_unavailable',
});

const normalizeQuestionId = questionId => {
  const normalizedQuestionId = normalizeText(questionId);
  return normalizedQuestionId || null;
};

const getStorageKey = questionId => {
  const normalizedQuestionId = normalizeQuestionId(questionId);
  return normalizedQuestionId ? `${STORAGE_KEY_PREFIX}${normalizedQuestionId}` : null;
};

export const getLocalInviteStatusText = status => {
  switch (String(status ?? '').trim()) {
    case LOCAL_INVITE_STATUSES.SERVICE_UNAVAILABLE:
      return '待重试';
    case LOCAL_INVITE_STATUSES.INVITED:
    default:
      return '已邀请';
  }
};

export const isCompletedLocalInviteStatus = status =>
  normalizeText(status) === LOCAL_INVITE_STATUSES.INVITED;

const normalizeInviteRecord = record => {
  const normalizedRecord = record && typeof record === 'object' ? record : {};
  const id = normalizeText(
    normalizedRecord.id ??
      normalizedRecord.userId ??
      normalizedRecord.uid ??
      normalizedRecord.targetUserId
  );

  if (!id) {
    return null;
  }

  const invitedAt = normalizeText(normalizedRecord.invitedAt) || new Date().toISOString();
  const updatedAt = normalizeText(normalizedRecord.updatedAt) || invitedAt;
  const status = normalizeText(normalizedRecord.status) || LOCAL_INVITE_STATUSES.INVITED;

  return {
    id,
    userId: id,
    username: normalizeText(normalizedRecord.username),
    nickName: normalizeText(normalizedRecord.nickName ?? normalizedRecord.nickname ?? normalizedRecord.displayName),
    avatar: normalizeText(normalizedRecord.avatar),
    profession: normalizeText(normalizedRecord.profession),
    signature: normalizeText(normalizedRecord.signature),
    location: normalizeText(normalizedRecord.location),
    answerCount: Number(normalizedRecord.answerCount || 0) || 0,
    followed: Boolean(normalizedRecord.followed),
    status,
    statusText: getLocalInviteStatusText(status),
    inviteText: normalizeText(normalizedRecord.inviteText),
    invitedAt,
    updatedAt,
  };
};

export const loadQuestionLocalInvites = async questionId => {
  const storageKey = getStorageKey(questionId);

  if (!storageKey) {
    return [];
  }

  try {
    const rawValue = await AsyncStorage.getItem(storageKey);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    return (Array.isArray(parsedValue) ? parsedValue : [])
      .map(normalizeInviteRecord)
      .filter(Boolean)
      .sort((previousItem, nextItem) => {
        const previousTime = Date.parse(previousItem.updatedAt || previousItem.invitedAt || 0);
        const nextTime = Date.parse(nextItem.updatedAt || nextItem.invitedAt || 0);
        return nextTime - previousTime;
      });
  } catch (error) {
    console.error('Failed to load question local invites:', error);
    return [];
  }
};

export const saveQuestionLocalInvite = async (questionId, user, options = {}) => {
  const storageKey = getStorageKey(questionId);

  if (!storageKey) {
    throw new Error('Question ID is required when saving local invite state.');
  }

  const currentList = await loadQuestionLocalInvites(questionId);
  const userId = normalizeText(user?.userId ?? user?.id ?? options.userId);
  const existingRecord = currentList.find(item => item.id === userId);
  const timestamp = new Date().toISOString();
  const nextRecord = normalizeInviteRecord({
    ...existingRecord,
    ...user,
    ...options,
    id: userId || existingRecord?.id,
    invitedAt: existingRecord?.invitedAt || options.invitedAt || timestamp,
    updatedAt: timestamp,
    status: options.status || existingRecord?.status || LOCAL_INVITE_STATUSES.INVITED,
  });

  if (!nextRecord) {
    throw new Error('Invite user is required when saving local invite state.');
  }

  const nextList = [
    nextRecord,
    ...currentList.filter(item => item.id !== nextRecord.id),
  ];

  await AsyncStorage.setItem(storageKey, JSON.stringify(nextList));
  return nextRecord;
};
