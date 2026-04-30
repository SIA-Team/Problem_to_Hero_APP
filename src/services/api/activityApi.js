import apiClient from './apiClient';
import { API_ENDPOINTS, replaceUrlParams } from '../../config/api';

const buildActivityCenterListParams = params => {
  const requestParams = {};

  const tabValue = typeof params?.tab === 'string' ? params.tab.trim() : '';
  requestParams.tab = tabValue || 'all';

  if (params?.type !== undefined && params?.type !== null && params.type !== '') {
    requestParams.type = Number(params.type);
  }

  if (params?.status !== undefined && params?.status !== null && params.status !== '') {
    requestParams.status = Number(params.status);
  }

  if (typeof params?.keyword === 'string' && params.keyword.trim()) {
    requestParams.keyword = params.keyword.trim();
  }

  return requestParams;
};

const buildMyActivitiesParams = params => {
  const requestParams = {};

  if (params?.type !== undefined && params?.type !== null && params.type !== '') {
    const normalizedType = Number(params.type);

    if (normalizedType === 1 || normalizedType === 2) {
      requestParams.type = normalizedType;
    }
  }

  return requestParams;
};

const normalizeOptionalString = value => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const normalizeOptionalNumber = value => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? normalizedValue : undefined;
};

const normalizeRequiredActivityId = id => {
  const normalizedId = Number(id);

  if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
    const invalidActivityError = new Error('活动ID无效');
    invalidActivityError.code = 'INVALID_ACTIVITY_ID';
    throw invalidActivityError;
  }

  return normalizedId;
};

const buildCreateActivityPayload = payload => {
  const images = Array.isArray(payload?.images)
    ? payload.images
        .filter(image => typeof image === 'string')
        .map(image => image.trim())
        .filter(Boolean)
    : [];

  const title = normalizeOptionalString(payload?.title);
  const description = normalizeOptionalString(payload?.description);
  const activeStartTime = normalizeOptionalString(payload?.activeStartTime);
  const activeEndTime = normalizeOptionalString(payload?.activeEndTime);
  const coverImage = normalizeOptionalString(payload?.coverImage) || images[0] || undefined;
  const location = normalizeOptionalString(payload?.location);
  const reward = normalizeOptionalString(payload?.reward);
  const rules = normalizeOptionalString(payload?.rules);
  const activeData = normalizeOptionalString(payload?.activeData);
  const tags = Array.isArray(payload?.tags)
    ? payload.tags
        .filter(tag => typeof tag === 'string')
        .map(tag => tag.trim())
        .filter(Boolean)
    : [];

  return {
    title,
    description,
    coverImage,
    images,
    activeStartTime,
    activeEndTime,
    provinceId: normalizeOptionalNumber(payload?.provinceId),
    cityId: normalizeOptionalNumber(payload?.cityId),
    districtId: normalizeOptionalNumber(payload?.districtId),
    location: location || undefined,
    activeType: normalizeOptionalNumber(payload?.activeType),
    maxParticipants: normalizeOptionalNumber(payload?.maxParticipants),
    reward: reward || undefined,
    rules: rules || undefined,
    tags,
    activeData: activeData || undefined,
    sponsorType: normalizeOptionalNumber(payload?.sponsorType),
    teamId: normalizeOptionalNumber(payload?.teamId),
    questionId: normalizeOptionalNumber(payload?.questionId),
  };
};

const activityApi = {
  getActivityCenterList: (params = {}) =>
    apiClient.get(API_ENDPOINTS.ACTIVITY.CENTER_LIST, {
      params: buildActivityCenterListParams(params),
    }),
  getActivityList: (params = {}) =>
    apiClient.get(API_ENDPOINTS.ACTIVITY.CENTER_LIST, {
      params: buildActivityCenterListParams(params),
    }),
  getMyActivities: (params = {}) =>
    apiClient.get(API_ENDPOINTS.ACTIVITY.MY_ACTIVITIES, {
      params: buildMyActivitiesParams(params),
    }),
  getActivityDetail: (id) => {
    const normalizedId = normalizeRequiredActivityId(id);
    const url = replaceUrlParams(API_ENDPOINTS.ACTIVITY.DETAIL, {
      id: String(normalizedId),
    });

    return apiClient.get(url);
  },
  getMyActivityTeams: () =>
    apiClient.get(API_ENDPOINTS.ACTIVITY.MY_TEAMS),
  createActivity: (payload = {}) =>
    apiClient.post(API_ENDPOINTS.ACTIVITY.CREATE, buildCreateActivityPayload(payload)),
  joinActivity: (id) => {
    const normalizedId = normalizeRequiredActivityId(id);
    const url = replaceUrlParams(API_ENDPOINTS.ACTIVITY.JOIN, {
      id: String(normalizedId),
    });

    return apiClient.post(url, {
      id: normalizedId,
    });
  },
  cancelActivity: (id) => {
    const normalizedId = normalizeRequiredActivityId(id);
    const url = replaceUrlParams(API_ENDPOINTS.ACTIVITY.CANCEL, {
      id: String(normalizedId),
    });

    return apiClient.delete(url, {
      data: {
        id: normalizedId,
      },
    });
  },
};

export default activityApi;
