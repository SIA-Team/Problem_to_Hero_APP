const listeners = new Set();
let blockedUserIds = new Set();

const normalizeUserId = (value) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue || null;
};

const notifyListeners = () => {
  const snapshot = new Set(blockedUserIds);
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.error('Blacklist listener failed:', error);
    }
  });
};

const buildBlockedUserIdSet = (values) => {
  const nextSet = new Set();

  values.forEach((value) => {
    const normalizedValue = normalizeUserId(value);
    if (normalizedValue) {
      nextSet.add(normalizedValue);
    }
  });

  return nextSet;
};

export const getBlockedUserIds = () => new Set(blockedUserIds);

export const subscribeBlockedUsers = (listener) => {
  if (typeof listener !== 'function') {
    return () => {};
  }

  listeners.add(listener);
  listener(new Set(blockedUserIds));

  return () => {
    listeners.delete(listener);
  };
};

export const syncBlockedUsers = (items = []) => {
  const nextSet = buildBlockedUserIdSet(
    Array.isArray(items)
      ? items.map((item) => item?.blockedUserId ?? item?.blockedUid ?? item?.userId ?? null)
      : []
  );

  blockedUserIds = nextSet;
  notifyListeners();
  return new Set(blockedUserIds);
};

export const addBlockedUser = (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId || blockedUserIds.has(normalizedUserId)) {
    return new Set(blockedUserIds);
  }

  blockedUserIds = new Set(blockedUserIds).add(normalizedUserId);
  notifyListeners();
  return new Set(blockedUserIds);
};

export const removeBlockedUser = (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId || !blockedUserIds.has(normalizedUserId)) {
    return new Set(blockedUserIds);
  }

  const nextSet = new Set(blockedUserIds);
  nextSet.delete(normalizedUserId);
  blockedUserIds = nextSet;
  notifyListeners();
  return new Set(blockedUserIds);
};
