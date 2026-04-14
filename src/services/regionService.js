import regionApi from './api/regionApi';
import { normalizeEntityId } from '../utils/jsonLongId';

const ROOT_PARENT_ID = '0';

const childrenCache = new Map();
const inFlightRequests = new Map();

const getCacheKey = (parentId) => normalizeEntityId(parentId) ?? ROOT_PARENT_ID;

const getFriendlyRegionErrorMessage = (message) => {
  const normalizedMessage = (message || '').toString().trim();

  if (!normalizedMessage) {
    return '区域数据加载失败，请稍后重试';
  }

  if (
    normalizedMessage.includes('SQLSyntaxErrorException') ||
    normalizedMessage.includes('bad SQL grammar') ||
    normalizedMessage.includes("doesn't exist")
  ) {
    return '区域数据服务暂不可用，请联系后端检查区域表配置';
  }

  return normalizedMessage;
};

const normalizeRegionNode = (item) => {
  const regionId = normalizeEntityId(item?.regionId);
  const parentId = normalizeEntityId(item?.parentId) ?? ROOT_PARENT_ID;
  const regionName = (item?.regionName || '').toString().trim();

  if (!regionId || !regionName) {
    return null;
  }

  return {
    id: regionId,
    regionId,
    parentId,
    name: regionName,
    regionName,
    regionCode: (item?.regionCode || '').toString(),
    regionLevel:
      typeof item?.regionLevel === 'number' ? item.regionLevel : Number(item?.regionLevel ?? 0),
    children: Array.isArray(item?.children) ? item.children : [],
  };
};

const normalizeRegionList = (list) =>
  (Array.isArray(list) ? list : [])
    .map((item) => normalizeRegionNode(item))
    .filter(Boolean);

const seedChildrenCacheFromNodes = (nodes) => {
  nodes.forEach((node) => {
    if (!Array.isArray(node.children) || node.children.length === 0) {
      return;
    }

    const normalizedChildren = normalizeRegionList(node.children);
    if (normalizedChildren.length > 0) {
      childrenCache.set(node.id, normalizedChildren);
      seedChildrenCacheFromNodes(normalizedChildren);
    }
  });
};

export const getRegionChildren = async (parentId = ROOT_PARENT_ID, options = {}) => {
  const cacheKey = getCacheKey(parentId);
  const { forceRefresh = false } = options;

  if (!forceRefresh && childrenCache.has(cacheKey)) {
    return childrenCache.get(cacheKey);
  }

  if (!forceRefresh && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const requestPromise = (async () => {
    const response = await regionApi.getRegionChildren(cacheKey);

    if (!response || response.code !== 200) {
      throw new Error(getFriendlyRegionErrorMessage(response?.msg));
    }

    const normalizedChildren = normalizeRegionList(response.data);
    childrenCache.set(cacheKey, normalizedChildren);
    seedChildrenCacheFromNodes(normalizedChildren);
    return normalizedChildren;
  })();

  inFlightRequests.set(cacheKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
};

export const resetRegionCache = () => {
  childrenCache.clear();
  inFlightRequests.clear();
};

const regionService = {
  getRegionChildren,
  resetRegionCache,
};

export default regionService;
