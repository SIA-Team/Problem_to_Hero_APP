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

const normalizeStatusText = value => normalizeText(value).toLowerCase();

const AVAILABLE_STATUS_TEXTS = new Set([
  '1',
  'true',
  'enable',
  'enabled',
  'active',
  'available',
  'online',
  'open',
  'normal',
  'valid',
  'published',
  '启用',
  '正常',
  '有效',
]);

const UNAVAILABLE_STATUS_TEXTS = new Set([
  '0',
  'false',
  'disable',
  'disabled',
  'inactive',
  'offline',
  'closed',
  'stop',
  'stopped',
  'deleted',
  'removed',
  'invalid',
  'forbidden',
  '禁用',
  '停用',
  '已停用',
  '关闭',
  '已关闭',
  '下线',
  '删除',
  '已删除',
  '无效',
]);

const logChannelDebug = (label, payload) => {
  if (!__DEV__) {
    return;
  }

  console.log(`[ChannelCatalogDebug] ${label}:`, payload);
};

const getChannelDebugName = item =>
  pickFirstText(
    item?.channelName,
    item?.name,
    item?.categoryName,
    item?.catalogName,
    item?.title,
    item?.label
  );

const buildChannelIdentityKey = channel => {
  const targetType = normalizeText(channel?.targetType);
  const targetKey = normalizeText(channel?.targetKey);

  if (!targetType || !targetKey) {
    return '';
  }

  return `${targetType}::${targetKey}`;
};

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

const isExplicitlyUnavailable = item => {
  if (!item || typeof item !== 'object') {
    return false;
  }

  const negativeFlags = [
    item.disabled,
    item.isDisabled,
    item.disable,
    item.deleted,
    item.isDeleted,
    item.removed,
    item.isRemoved,
    item.offline,
    item.isOffline,
    item.stopped,
    item.isStopped,
    item.forbidden,
    item.isForbidden,
  ];

  if (negativeFlags.some(flag => flag === true || flag === 1 || normalizeStatusText(flag) === 'true')) {
    return true;
  }

  const positiveFlags = [
    item.enabled,
    item.isEnabled,
    item.available,
    item.isAvailable,
    item.active,
    item.isActive,
  ];

  if (positiveFlags.some(flag => flag === false || flag === 0 || normalizeStatusText(flag) === 'false')) {
    return true;
  }

  const statusCandidates = [
    item.status,
    item.state,
    item.channelStatus,
    item.catalogStatus,
    item.categoryStatus,
    item.publishStatus,
    item.enableStatus,
    item.availableStatus,
    item.statusDesc,
    item.statusName,
    item.stateDesc,
    item.stateName,
  ];

  for (const candidate of statusCandidates) {
    const normalized = normalizeStatusText(candidate);
    if (!normalized) {
      continue;
    }

    if (UNAVAILABLE_STATUS_TEXTS.has(normalized)) {
      return true;
    }

    if (AVAILABLE_STATUS_TEXTS.has(normalized)) {
      return false;
    }
  }

  return false;
};

const buildNormalizedChannelSnapshot = (item, groupContext = {}) => {
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
      isUnavailable: false,
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
    isUnavailable: isExplicitlyUnavailable(item),
    raw: item,
  };
};

const normalizeChannelItem = (item, groupContext = {}) => {
  const normalizedSnapshot = buildNormalizedChannelSnapshot(item, groupContext);

  if (!normalizedSnapshot) {
    return null;
  }

  if (normalizedSnapshot.isUnavailable) {
    logChannelDebug('filtered unavailable channel', {
      name: normalizedSnapshot.name,
      id: normalizedSnapshot.id,
      parentName: normalizedSnapshot.parentName,
      status: normalizedSnapshot.raw?.status,
      state: normalizedSnapshot.raw?.state,
      channelStatus: normalizedSnapshot.raw?.channelStatus,
      catalogStatus: normalizedSnapshot.raw?.catalogStatus,
      categoryStatus: normalizedSnapshot.raw?.categoryStatus,
      enabled: normalizedSnapshot.raw?.enabled,
      isEnabled: normalizedSnapshot.raw?.isEnabled,
      disabled: normalizedSnapshot.raw?.disabled,
      isDisabled: normalizedSnapshot.raw?.isDisabled,
    });
    return null;
  }

  return normalizedSnapshot;
};

const extractGroupChildren = group => {
  for (const key of GROUP_CHILDREN_KEYS) {
    if (Array.isArray(group?.[key])) {
      return group[key];
    }
  }

  return [];
};

const buildCatalogDebugSummary = payload => {
  const rawGroups = extractRawGroups(payload);
  const summary = {
    country: [],
    industry: [],
    enterprise: [],
    personal: [],
    unknown: [],
  };

  rawGroups.forEach(group => {
    const children = extractGroupChildren(group);
    const rows = children.length > 0 ? children : [group];
    const groupHint = pickFirstText(group?.parentName, group?.groupName, group?.name);

    rows.forEach(item => {
      const name = getChannelDebugName(item);
      if (!name) {
        return;
      }

      const groupType = inferGroupType(item, groupHint) || 'unknown';
      const bucket = summary[groupType] || summary.unknown;

      bucket.push({
        name,
        parentName: pickFirstText(item?.parentName, groupHint),
        status: item?.status,
        state: item?.state,
        channelStatus: item?.channelStatus,
        catalogStatus: item?.catalogStatus,
        categoryStatus: item?.categoryStatus,
        enabled: item?.enabled,
        isEnabled: item?.isEnabled,
        disabled: item?.disabled,
        isDisabled: item?.isDisabled,
      });
    });
  });

  return summary;
};

const extractCatalogStatusEntries = payload => {
  const rawGroups = extractRawGroups(payload);
  const groupsToInspect =
    rawGroups.length > 0 ? rawGroups : normalizeObjectOfArrays(payload);
  const entries = [];

  groupsToInspect.forEach(group => {
    const children = extractGroupChildren(group);
    const rows = children.length > 0 ? children : asArray(group?.channels).length > 0 ? group.channels : [group];
    const groupType = inferGroupType(group, group?.groupName);
    const groupName = pickFirstText(group?.parentName, group?.groupName, group?.name);
    const parentId = normalizeText(group?.parentId ?? group?.id);

    rows.forEach(item => {
      const normalizedSnapshot = buildNormalizedChannelSnapshot(item, {
        parentId,
        parentName: groupName,
        groupType,
      });

      if (!normalizedSnapshot) {
        return;
      }

      entries.push(normalizedSnapshot);
    });
  });

  return entries;
};

const buildCatalogChannelStateMaps = payload => {
  const channelStateByIdentity = {};
  const channelStateByName = {};

  extractCatalogStatusEntries(payload).forEach(channel => {
    const stateRecord = {
      name: channel.name,
      targetType: channel.targetType,
      targetKey: channel.targetKey,
      parentName: channel.parentName,
      groupType: channel.groupType,
      isUnavailable: Boolean(channel.isUnavailable),
    };
    const identityKey = buildChannelIdentityKey(channel);
    const nameKey = normalizeText(channel.name);

    if (identityKey && !channelStateByIdentity[identityKey]) {
      channelStateByIdentity[identityKey] = stateRecord;
    }

    if (nameKey && !channelStateByName[nameKey]) {
      channelStateByName[nameKey] = stateRecord;
    }
  });

  return {
    channelStateByIdentity,
    channelStateByName,
  };
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
  const { channelStateByIdentity, channelStateByName } = buildCatalogChannelStateMaps(payload);

  return {
    groupsByType,
    sections,
    channelStateByIdentity,
    channelStateByName,
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

  if (__DEV__) {
    const payload = response?.data ?? response;
    const rawGroups = extractRawGroups(payload);
    const matchedTravelItems = rawGroups.flatMap(group => {
      const children = extractGroupChildren(group);
      const rows = children.length > 0 ? children : [group];

      return rows.filter(item => {
        const name = pickFirstText(
          item?.channelName,
          item?.name,
          item?.categoryName,
          item?.catalogName,
          item?.title,
          item?.label
        );

        return name.includes('旅游攻略');
      });
    });

    logChannelDebug('raw group count', rawGroups.length);
    logChannelDebug('matched travel items', JSON.stringify(matchedTravelItems, null, 2));
    logChannelDebug('raw summary', JSON.stringify(buildCatalogDebugSummary(payload), null, 2));
  }

  const normalizedCatalog = normalizeChannelCatalogResponse(response);

  if (__DEV__) {
    const normalizedSummary = CHANNEL_GROUP_TYPES.reduce((summary, type) => {
      summary[type] = asArray(normalizedCatalog?.groupsByType?.[type]).map(channel => ({
        name: channel?.name ?? '',
        targetType: channel?.targetType ?? '',
        targetKey: channel?.targetKey ?? '',
      }));
      return summary;
    }, {});

    logChannelDebug('normalized summary', JSON.stringify(normalizedSummary, null, 2));
  }

  return normalizedCatalog;
};

export const emptyChannelGroups = EMPTY_CHANNEL_GROUPS;

export default {
  fetchChannelCatalog,
  hasChannelCatalogData,
  normalizeChannelCatalogResponse,
  emptyChannelGroups,
};
