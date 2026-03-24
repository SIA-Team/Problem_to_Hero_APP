const normalizeUserId = value => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const stringValue = String(value).trim();
  return stringValue ? stringValue : null;
};

export const resolvePublicUserId = (target, options = {}) => {
  const explicitUserId = normalizeUserId(options.userId);
  if (explicitUserId) {
    return explicitUserId;
  }

  if (target === undefined || target === null) {
    return null;
  }

  if (typeof target === 'string' || typeof target === 'number' || typeof target === 'bigint') {
    return normalizeUserId(target);
  }

  if (typeof target !== 'object') {
    return null;
  }

  const user =
    target.user && typeof target.user === 'object'
      ? target.user
      : target.authorInfo && typeof target.authorInfo === 'object'
        ? target.authorInfo
        : null;

  return (
    normalizeUserId(target.publicUserId) ||
    normalizeUserId(target.profileUserId) ||
    normalizeUserId(target.userId) ||
    normalizeUserId(target.user_id) ||
    normalizeUserId(target.authorId) ||
    normalizeUserId(target.author_id) ||
    normalizeUserId(target.creatorId) ||
    normalizeUserId(target.creator_id) ||
    normalizeUserId(target.createBy) ||
    normalizeUserId(target.create_by) ||
    normalizeUserId(target.uid) ||
    normalizeUserId(user?.userId) ||
    normalizeUserId(user?.user_id) ||
    normalizeUserId(user?.id) ||
    null
  );
};

export const isAnonymousUserTarget = target => {
  if (!target || typeof target !== 'object') {
    return false;
  }

  return Number(target.isAnonymous ?? target.anonymous ?? 0) === 1;
};

export const navigateToPublicProfile = (navigation, target, options = {}) => {
  if (!navigation || typeof navigation.navigate !== 'function') {
    return false;
  }

  if (options.allowAnonymous === false && isAnonymousUserTarget(target)) {
    return false;
  }

  const userId = resolvePublicUserId(target, options);
  if (!userId) {
    return false;
  }

  navigation.navigate('PublicProfile', { userId });
  return true;
};
