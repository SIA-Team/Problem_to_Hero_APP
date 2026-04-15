import { normalizeFollowingResponse } from './privateShareService';

const normalizeText = value => String(value ?? '').trim();

export const normalizeLocalInviteUser = (user = {}) => {
  const userId = normalizeText(user.userId ?? user.id ?? user.uid);

  if (!userId) {
    return null;
  }

  return {
    id: userId,
    userId,
    username: normalizeText(user.username ?? user.userName),
    nickName: normalizeText(user.nickName ?? user.nickname ?? user.displayName ?? user.name),
    avatar: normalizeText(user.avatar),
    profession: normalizeText(user.profession),
    signature: normalizeText(user.signature),
    location: normalizeText(user.location),
    answerCount: Number(user.answerCount || 0) || 0,
    followed: typeof user.followed === 'boolean' ? user.followed : null,
    verified: Number(user.verified || 0) || 0,
  };
};

export const normalizeLocalInviteUsers = (users = []) =>
  (Array.isArray(users) ? users : [])
    .map(normalizeLocalInviteUser)
    .filter(Boolean);

export const normalizePublicUserSearchResponse = response =>
  normalizeLocalInviteUsers(response?.data?.data ?? response?.data ?? []);

export const normalizeFollowingInviteUsers = response => {
  const followingUsers = normalizeFollowingResponse(response);

  return followingUsers
    .map(user => normalizeLocalInviteUser({
      userId: user.userId,
      username: user.username,
      nickName: user.nickname,
      avatar: user.avatar,
      followed: true,
    }))
    .filter(Boolean);
};

export const mergeLocalInviteUsers = (users = []) => {
  const mergedUsers = [];
  const seenUserIds = new Set();

  (Array.isArray(users) ? users : []).forEach(user => {
    const normalizedUser = normalizeLocalInviteUser(user);

    if (!normalizedUser?.id || seenUserIds.has(normalizedUser.id)) {
      return;
    }

    seenUserIds.add(normalizedUser.id);
    mergedUsers.push(normalizedUser);
  });

  return mergedUsers;
};

export const buildLocalInviteUserDescription = user => {
  const profession = normalizeText(user?.profession);
  const answerCount = Number(user?.answerCount || 0) || 0;
  const signature = normalizeText(user?.signature);
  const location = normalizeText(user?.location);

  if (profession && answerCount > 0) {
    return `${profession} · 回答过 ${answerCount} 个问题`;
  }

  if (profession) {
    return profession;
  }

  if (answerCount > 0) {
    return `回答过 ${answerCount} 个问题`;
  }

  if (signature && location) {
    return `${signature} 路 ${location}`;
  }

  if (signature) {
    return signature;
  }

  if (location) {
    return location;
  }

  if (user?.username) {
    return `@${String(user.username).replace(/^@/, '')}`;
  }

  return 'Problem vs Hero 用户';
};

export const buildLocalInviteDisplayName = user => {
  const nickName = normalizeText(user?.nickName);
  const username = normalizeText(user?.username);

  return nickName || (username ? `@${username.replace(/^@/, '')}` : '用户');
};

