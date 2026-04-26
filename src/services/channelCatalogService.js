import channelApi from './api/channelApi';

export const CHANNEL_GROUP_TYPES = ['country', 'industry', 'enterprise', 'personal'];

const EMPTY_CHANNEL_GROUPS = {
  country: [],
  industry: [],
  enterprise: [],
  personal: [],
};

const GROUP_KEYWORDS = {
  country: ['country', 'national', 'nation', '国家', '国家问题', '政策'],
  industry: ['industry', 'business-sector', '行业', '行业问题', '产业'],
  enterprise: ['enterprise', 'company', 'corporate', '企业', '企业问题', '公司'],
  personal: ['personal', 'individual', 'life', '个人', '个人问题', '生活'],
};

const GROUP_ARRAY_KEYS = [
  'groups',
  'channelGroups',
  'catalogs',
  'channelCatalogs',
  'list',
  'rows',
  'records',
  'items',
];

const GROUP_CHILDREN_KEYS = [
  'channels',
  'channelList',
  'subChannels',
  'children',
  'items',
  'rows',
  'list',
  'records',
  'catalogList',
  'subCategories',
];

const normalizeText = value => String(value ?? '').trim();

const pickFirstText = (...values) => {
  for (const value of values) {
    const normalizedValue = normalizeText(value);
    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return '';
};

const asArray = value => (Array.isArray(value) ? value : []);

const normalizeGroupType = candidate => {
  const normalizedCandidate = normalizeText(candidate).toLowerCase();
  if (!normalizedCandidate) {
    return '';
  }

  if (CHANNEL_GROUP_TYPES.includes(normalizedCandidate)) {
    return normalizedCandidate;
  }

  for (const [groupType, keywords] of Object.entries(GROUP_KEYWORDS)) {
    if (keywords.some(keyword => normalizedCandidate.includes(keyword.toLowerCase()))) {
      return groupType;
    }
  }

  return '';
};

const inferGroupType = (source, keyHint = '') => {
  const candidates = [
    source?.groupType,
    source?.type,
    source?.categoryType,
    source?.catalogType,
    source?.groupCode,
    source?.code,
    source?.parentCode,
    source?.parentType,
    source?.parentName,
    source?.groupName,
    source?.name,
    keyHint,
  ];

  for (const candidate of candidates) {
    const normalizedType = normalizeGroupType(candidate);
    if (normalizedType) {
      return normalizedType;
    }
  }

  return '';
};

const normalizeChannelId = (item, fallbackName) => {
  const rawId =
    item?.channelId ??
    item?.id ??
    item?.categoryId ??
    item?.catalogId ??
    item?.value ??
    fallbackName;

  return normalizeText(rawId);
};

const normalizeCatalogChannelTargetType = item => {
  const explicitType = pickFirstText(
    item?.targetType,
    item?.subscribeTargetType,
    item?.subscribedTargetType,
    item?.bindType
  );

  if (explicitType) {
    return explicitType;
  }

  if (pickFirstText(item?.channelCode, item?.code)) {
    return 'DEFAULT';
  }

  if (pickFirstText(item?.categoryId, item?.catalogId, item?.id, item?.channelId)) {
    return 'CATEGORY';
  }

  return '';
};

const normalizeCatalogChannelTargetKey = (item, fallbackId, fallbackName) =>
  pickFirstText(
    item?.targetKey,
    item?.subscribeTargetKey,
    item?.subscribedTargetKey,
    item?.channelCode,
    item?.channelKey,
    item?.categoryId,
    item?.catalogId,
    item?.channelId,
    item?.id,
    fallbackId,
    fallbackName
  );

const normalizeChannelItem = (item, groupContext = {}) => {
  if (typeof item === 'string') {
    const name = normalizeText(item);
    if (!name) {
      return null;
    }

    return {
      id: name,
      name,
      parentId: normalizeText(groupContext.parentId),
      parentName: normalizeText(groupContext.parentName),
      groupType: groupContext.groupType || '',
      targetType: '',
      targetKey: name,
      raw: item,
    };
  }

  if (!item || typeof item !== 'object') {
    return null;
  }

  const name = pickFirstText(
    item.channelName,
    item.name,
    item.categoryName,
    item.catalogName,
    item.title,
    item.label
  );

  if (!name) {
    return null;
  }

  const normalizedId = normalizeChannelId(item, name);

  return {
    id: normalizedId,
    name,
    parentId: normalizeText(item.parentId ?? groupContext.parentId),
    parentName: pickFirstText(item.parentName, groupContext.parentName),
    groupType:
      inferGroupType(item) ||
      groupContext.groupType ||
      normalizeGroupType(item.parentName),
    targetType: normalizeCatalogChannelTargetType(item),
    targetKey: normalizeCatalogChannelTargetKey(item, normalizedId, name),
    raw: item,
  };
};

const extractGroupChildren = group => {
  for (const key of GROUP_CHILDREN_KEYS) {
    if (Array.isArray(group?.[key])) {
      return group[key];
    }
  }

  return [];
};

const dedupeChannels = channels => {
  const seen = new Set();

  return channels.filter(channel => {
    const dedupeKey = `${normalizeText(channel?.id)}::${normalizeText(channel?.name)}`;
    if (!channel?.name || seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
};

const normalizeGroupedChannels = (groups, keyHint = '') => {
  return groups
    .map(group => {
      const groupType = inferGroupType(group, keyHint);
      const groupName = pickFirstText(group?.parentName, group?.groupName, group?.name, keyHint);
      const parentId = normalizeText(group?.parentId ?? group?.id);
      const channels = dedupeChannels(
        extractGroupChildren(group)
          .map(channel =>
            normalizeChannelItem(channel, {
              parentId,
              parentName: groupName,
              groupType,
            })
          )
          .filter(Boolean)
      );

      if (!channels.length) {
        return null;
      }

      return {
        type: groupType,
        name: groupName,
        channels,
      };
    })
    .filter(Boolean);
};

const normalizeFlatChannels = items => {
  const groupedMap = new Map();

  items.forEach(item => {
    const normalizedItem = normalizeChannelItem(item);
    if (!normalizedItem) {
      return;
    }

    const groupType =
      normalizedItem.groupType ||
      inferGroupType(item) ||
      normalizeGroupType(normalizedItem.parentName);
    const groupName =
      normalizedItem.parentName ||
      pickFirstText(item?.groupName, item?.parentCategoryName, item?.typeName, groupType);
    const groupKey = `${groupType || 'unknown'}::${groupName || 'default'}`;
    const existingGroup = groupedMap.get(groupKey) || {
      type: groupType,
      name: groupName,
      channels: [],
    };

    existingGroup.channels.push({
      ...normalizedItem,
      groupType,
      parentName: groupName,
    });
    groupedMap.set(groupKey, existingGroup);
  });

  return Array.from(groupedMap.values()).map(group => ({
    ...group,
    channels: dedupeChannels(group.channels),
  }));
};

const extractRawGroups = payload => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  for (const key of GROUP_ARRAY_KEYS) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  return [];
};

const normalizeObjectOfArrays = payload => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [];
  }

  return Object.entries(payload)
    .filter(([, value]) => Array.isArray(value))
    .map(([key, value]) => ({
      groupName: key,
      groupType: normalizeGroupType(key),
      channels: value,
    }));
};

const mergeGroupsByType = groups => {
  const typedGroups = {
    country: [],
    industry: [],
    enterprise: [],
    personal: [],
  };
  const groupedSectionMap = new Map();

  groups.forEach(group => {
    const sectionType = group.type || normalizeGroupType(group.name);
    const sectionName = group.name || sectionType;
    const sectionKey = `${sectionType || 'unknown'}::${sectionName}`;
    const mergedChannels = dedupeChannels(group.channels || []);

    if (CHANNEL_GROUP_TYPES.includes(sectionType)) {
      typedGroups[sectionType] = dedupeChannels([
        ...typedGroups[sectionType],
        ...mergedChannels,
      ]);
    }

    const existingSection = groupedSectionMap.get(sectionKey) || {
      type: sectionType,
      name: sectionName,
      channels: [],
    };

    existingSection.channels = dedupeChannels([
      ...existingSection.channels,
      ...mergedChannels,
    ]);
    groupedSectionMap.set(sectionKey, existingSection);
  });

  const knownSections = CHANNEL_GROUP_TYPES
    .map(type => ({
      type,
      name: '',
      channels: typedGroups[type],
    }))
    .filter(section => section.channels.length > 0);

  const extraSections = Array.from(groupedSectionMap.values()).filter(section => {
    if (!section.channels.length) {
      return false;
    }

    return !CHANNEL_GROUP_TYPES.includes(section.type);
  });

  return {
    groupsByType: typedGroups,
    sections: [...knownSections, ...extraSections],
  };
};

export const normalizeChannelCatalogResponse = response => {
  const payload = response?.data ?? response;
  const rawGroups = extractRawGroups(payload);

  let normalizedGroups = [];

  if (rawGroups.length > 0) {
    const hasNestedGroups = rawGroups.some(group => extractGroupChildren(group).length > 0);
    normalizedGroups = hasNestedGroups
      ? normalizeGroupedChannels(rawGroups)
      : normalizeFlatChannels(rawGroups);
  } else {
    const arrayGroups = normalizeObjectOfArrays(payload);
    normalizedGroups = normalizeGroupedChannels(arrayGroups);
  }

  const { groupsByType, sections } = mergeGroupsByType(normalizedGroups);

  return {
    groupsByType,
    sections,
    raw: payload,
  };
};

export const hasChannelCatalogData = catalog =>
  CHANNEL_GROUP_TYPES.some(type => asArray(catalog?.groupsByType?.[type]).length > 0) ||
  asArray(catalog?.sections).some(section => asArray(section?.channels).length > 0);

export const fetchChannelCatalog = async () => {
  const response = await channelApi.getChannelCatalog();

  if (!response || response.code !== 200) {
    throw new Error(response?.msg || '获取频道目录失败');
  }

  return normalizeChannelCatalogResponse(response);
};

export const emptyChannelGroups = EMPTY_CHANNEL_GROUPS;

export default {
  fetchChannelCatalog,
  hasChannelCatalogData,
  normalizeChannelCatalogResponse,
  emptyChannelGroups,
};
