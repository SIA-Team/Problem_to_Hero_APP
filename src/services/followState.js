const followStateMap = new Map();

const normalizeUserId = value => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue || null;
};

export const getFollowState = userId => {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    return null;
  }

  return followStateMap.has(normalizedUserId) ? followStateMap.get(normalizedUserId) : null;
};

export const setFollowState = (userId, isFollowing) => {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId || typeof isFollowing !== 'boolean') {
    return null;
  }

  followStateMap.set(normalizedUserId, isFollowing);
  return isFollowing;
};

export const clearFollowState = userId => {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    return false;
  }

  return followStateMap.delete(normalizedUserId);
};
