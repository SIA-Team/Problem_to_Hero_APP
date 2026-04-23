import userApi from '../services/api/userApi';

const FOLLOWING_COUNT_PAGE_SIZE = 100;
const FOLLOWING_COUNT_MAX_PAGES = 50;

const toNonNegativeNumber = value => {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : null;
};

const getFollowPayloadCandidates = payload => {
  const nestedData = payload?.data;

  return [
    payload,
    nestedData,
    payload?.page,
    payload?.pagination,
    payload?.result,
    nestedData?.page,
    nestedData?.pagination,
    nestedData?.result,
  ].filter(Boolean);
};

export const extractMyFollowingUsers = payload => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = getFollowPayloadCandidates(payload);

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    for (const key of ['rows', 'list', 'records', 'items', 'content']) {
      if (Array.isArray(candidate[key])) {
        return candidate[key];
      }
    }
  }

  return [];
};

export const extractMyFollowingTotal = payload => {
  const candidates = getFollowPayloadCandidates(payload);

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    for (const key of ['total', 'count', 'totalCount', 'recordsTotal']) {
      const normalized = toNonNegativeNumber(candidate[key]);
      if (normalized !== null) {
        return normalized;
      }
    }
  }

  return null;
};

export const fetchMyFollowingTotalCount = async () => {
  let pageNum = 1;
  let countedUsers = 0;
  const seenIds = new Set();

  while (pageNum <= FOLLOWING_COUNT_MAX_PAGES) {
    const response = await userApi.getMyFollowing({
      pageNum,
      pageSize: FOLLOWING_COUNT_PAGE_SIZE,
    });

    if (!response || (response.code !== 200 && response.code !== 0)) {
      throw new Error(response?.msg || '获取关注数量失败');
    }

    const total = extractMyFollowingTotal(response?.data);
    if (total !== null) {
      return total;
    }

    const users = extractMyFollowingUsers(response?.data);

    users.forEach((user, index) => {
      const dedupeKey = String(user?.userId ?? user?.followUserId ?? user?.targetUserId ?? user?.id ?? `${pageNum}-${index}`);
      if (seenIds.has(dedupeKey)) {
        return;
      }

      seenIds.add(dedupeKey);
      countedUsers += 1;
    });

    if (users.length < FOLLOWING_COUNT_PAGE_SIZE) {
      break;
    }

    pageNum += 1;
  }

  return countedUsers;
};
