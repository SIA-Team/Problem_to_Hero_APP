import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PREFIX = 'question-twitter-invites:v1:';

const normalizeText = value => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue;
};

const normalizeQuestionId = questionId => {
  const normalizedQuestionId = normalizeText(questionId);
  return normalizedQuestionId || null;
};

const normalizeTwitterHandle = value => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return '';
  }

  return normalizedValue.startsWith('@') ? normalizedValue : `@${normalizedValue}`;
};

const getStorageKey = questionId => {
  const normalizedQuestionId = normalizeQuestionId(questionId);
  return normalizedQuestionId ? `${STORAGE_KEY_PREFIX}${normalizedQuestionId}` : null;
};

export const getTwitterInviteStatusText = status => {
  switch (String(status ?? '').trim()) {
    case 'invited':
      return '已邀请';
    case 'initiated':
    default:
      return '已发起邀请';
  }
};

const normalizeInviteRecord = record => {
  const normalizedRecord = record && typeof record === 'object' ? record : {};
  const id = normalizeText(
    normalizedRecord.id ??
      normalizedRecord.twitterUserId ??
      normalizedRecord.twitterUser_id ??
      normalizedRecord.userId
  );

  if (!id) {
    return null;
  }

  const invitedAt = normalizeText(normalizedRecord.invitedAt) || new Date().toISOString();
  const updatedAt = normalizeText(normalizedRecord.updatedAt) || invitedAt;
  const status = normalizeText(normalizedRecord.status) || 'initiated';
  const name = normalizeTwitterHandle(
    normalizedRecord.name ??
      normalizedRecord.twitterUsername ??
      normalizedRecord.username ??
      normalizedRecord.handle ??
      id
  );

  return {
    id,
    name: name || `@${id}`,
    followers: normalizeText(normalizedRecord.followers),
    avatar: normalizeText(normalizedRecord.avatar),
    status,
    statusText: getTwitterInviteStatusText(status),
    inviteText: normalizeText(normalizedRecord.inviteText),
    openedVia: normalizeText(normalizedRecord.openedVia),
    invitedAt,
    updatedAt,
  };
};

export const loadQuestionTwitterInvites = async questionId => {
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
    const normalizedList = (Array.isArray(parsedValue) ? parsedValue : [])
      .map(normalizeInviteRecord)
      .filter(Boolean)
      .sort((previousItem, nextItem) => {
        const previousTime = Date.parse(previousItem.updatedAt || previousItem.invitedAt || 0);
        const nextTime = Date.parse(nextItem.updatedAt || nextItem.invitedAt || 0);
        return nextTime - previousTime;
      });

    return normalizedList;
  } catch (error) {
    console.error('Failed to load question twitter invites:', error);
    return [];
  }
};

export const saveQuestionTwitterInvite = async (questionId, twitterUser, options = {}) => {
  const storageKey = getStorageKey(questionId);

  if (!storageKey) {
    throw new Error('Question ID is required when saving twitter invite state.');
  }

  const currentList = await loadQuestionTwitterInvites(questionId);
  const existingRecord = currentList.find(item => item.id === normalizeText(twitterUser?.id));
  const timestamp = new Date().toISOString();
  const nextRecord = normalizeInviteRecord({
    ...existingRecord,
    ...twitterUser,
    ...options,
    id: normalizeText(twitterUser?.id ?? options.twitterUserId ?? existingRecord?.id),
    invitedAt: existingRecord?.invitedAt || options.invitedAt || timestamp,
    updatedAt: timestamp,
    status: options.status || existingRecord?.status || 'initiated',
  });

  if (!nextRecord) {
    throw new Error('Twitter user is required when saving twitter invite state.');
  }

  const nextList = [
    nextRecord,
    ...currentList.filter(item => item.id !== nextRecord.id),
  ];

  await AsyncStorage.setItem(storageKey, JSON.stringify(nextList));

  return nextRecord;
};
