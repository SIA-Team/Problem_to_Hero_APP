import categoryApi from './api/categoryApi';

const PAGE_SIZE = 100;
const DEFAULT_CATEGORY_COLOR = '#6b7280';

const CATEGORY_COLOR_MAP = {
  '国家': '#3b82f6',
  '行业': '#22c55e',
  '个人': '#8b5cf6',
  '企业': '#64748b',
  '政策法规': '#3b82f6',
  '社会民生': '#06b6d4',
  '经济发展': '#f59e0b',
  '教育医疗': '#8b5cf6',
  '环境保护': '#10b981',
  '基础设施': '#64748b',
  '签证政策': '#f97316',
  '移民指南': '#0ea5e9',
  '留学申请': '#8b5cf6',
  '旅游攻略': '#ec4899',
  '互联网': '#06b6d4',
  '金融': '#f59e0b',
  '医疗健康': '#10b981',
  '教育培训': '#8b5cf6',
  '房地产': '#ef4444',
  '制造业': '#64748b',
  '零售消费': '#f97316',
  '职业发展': '#3b82f6',
  '情感生活': '#ec4899',
  '健康养生': '#10b981',
  '理财投资': '#f59e0b',
  '学习成长': '#8b5cf6',
  '家庭关系': '#f97316',
  '政治': '#ef4444',
  '经济': '#f59e0b',
  '文化': '#ec4899',
  '科技': '#06b6d4',
  '教育': '#8b5cf6',
  '医疗': '#10b981',
  '环境': '#84cc16',
  '社会': '#6366f1',
  '法律': '#f97316',
  '军事': '#64748b',
  '外交': '#0ea5e9',
};

let level1Cache = null;
let level1Promise = null;
const level2Cache = new Map();
const level2PromiseMap = new Map();

const normalizeCategoryId = (value) => {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) && normalizedValue > 0 ? normalizedValue : null;
};

export const getCategoryColor = (name) => {
  const normalizedName = (name || '').toString().trim();
  return CATEGORY_COLOR_MAP[normalizedName] || DEFAULT_CATEGORY_COLOR;
};

const normalizeCategoryItem = (item, extra = {}) => {
  const normalizedId = normalizeCategoryId(item?.id);
  if (!normalizedId || !item?.name) {
    return null;
  }

  const normalizedParentId =
    normalizeCategoryId(extra.parentId ?? item?.parentId) || 0;
  const parentName =
    (extra.parentName || item?.parentName || '').toString().trim();
  const icon = item?.originalIcon || item?.icon || '';

  return {
    ...item,
    id: normalizedId,
    name: item.name,
    parentId: normalizedParentId,
    parentName,
    originalIcon: icon,
    icon,
    color: item?.color || getCategoryColor(item?.name),
  };
};

const loadAllCategoryPages = async (parentId) => {
  const firstPageResponse = await categoryApi.getCategoryList({
    pageNum: 1,
    pageSize: PAGE_SIZE,
    parentId,
  });

  if (!firstPageResponse || firstPageResponse.code !== 200 || !firstPageResponse.data) {
    throw new Error(firstPageResponse?.msg || '获取分类数据失败');
  }

  const firstRows = Array.isArray(firstPageResponse.data.rows)
    ? firstPageResponse.data.rows
    : [];
  const total = Number(firstPageResponse.data.total || firstRows.length || 0);
  const pageSize = Number(firstPageResponse.data.pageSize || PAGE_SIZE || 0) || PAGE_SIZE;

  if (firstRows.length >= total || total <= pageSize) {
    return firstRows;
  }

  const totalPages = Math.ceil(total / pageSize);
  const remainRequests = [];

  for (let page = 2; page <= totalPages; page += 1) {
    remainRequests.push(
      categoryApi.getCategoryList({
        pageNum: page,
        pageSize,
        parentId,
      })
    );
  }

  const remainResponses = await Promise.all(remainRequests);
  const remainRows = remainResponses.flatMap((response) => {
    if (response?.code !== 200 || !Array.isArray(response?.data?.rows)) {
      return [];
    }

    return response.data.rows;
  });

  return [...firstRows, ...remainRows];
};

export const getLevel1Categories = async (options = {}) => {
  const { forceRefresh = false } = options;

  if (!forceRefresh && Array.isArray(level1Cache)) {
    return level1Cache;
  }

  if (!forceRefresh && level1Promise) {
    return level1Promise;
  }

  level1Promise = (async () => {
    const rows = await loadAllCategoryPages(0);
    const normalizedRows = rows
      .map((item) => normalizeCategoryItem(item, { parentId: 0, parentName: '' }))
      .filter(Boolean);

    level1Cache = normalizedRows;
    return normalizedRows;
  })();

  try {
    return await level1Promise;
  } finally {
    level1Promise = null;
  }
};

export const getLevel2Categories = async (parentId, options = {}) => {
  const normalizedParentId = normalizeCategoryId(parentId);
  if (!normalizedParentId) {
    return [];
  }

  const { forceRefresh = false, parentName = '' } = options;

  if (!forceRefresh && level2Cache.has(normalizedParentId)) {
    return level2Cache.get(normalizedParentId);
  }

  if (!forceRefresh && level2PromiseMap.has(normalizedParentId)) {
    return level2PromiseMap.get(normalizedParentId);
  }

  const requestPromise = (async () => {
    const rows = await loadAllCategoryPages(normalizedParentId);
    let resolvedParentName = parentName;

    if (!resolvedParentName) {
      const level1Categories = await getLevel1Categories();
      resolvedParentName =
        level1Categories.find((item) => item.id === normalizedParentId)?.name || '';
    }

    const normalizedRows = rows
      .map((item) =>
        normalizeCategoryItem(item, {
          parentId: normalizedParentId,
          parentName: resolvedParentName,
        })
      )
      .filter(Boolean);

    level2Cache.set(normalizedParentId, normalizedRows);
    return normalizedRows;
  })();

  level2PromiseMap.set(normalizedParentId, requestPromise);

  try {
    return await requestPromise;
  } finally {
    level2PromiseMap.delete(normalizedParentId);
  }
};

export const resetQuestionCategoryCache = () => {
  level1Cache = null;
  level1Promise = null;
  level2Cache.clear();
  level2PromiseMap.clear();
};

const questionCategoryService = {
  getCategoryColor,
  getLevel1Categories,
  getLevel2Categories,
  resetQuestionCategoryCache,
};

export default questionCategoryService;
