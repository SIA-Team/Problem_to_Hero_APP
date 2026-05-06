import contentApiClient from './contentApiClient';
import { API_ENDPOINTS } from '../../config/api';

const HOME_TOPIC_SORT_TYPES = new Set(['recommend', 'hot', 'latest']);

const normalizeSortType = (value) => {
  const sortType = String(value || '').trim();
  return HOME_TOPIC_SORT_TYPES.has(sortType) ? sortType : 'recommend';
};

const normalizePageNum = (value) => {
  const pageNum = Number(value);
  return Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1;
};

const normalizePageSize = (value) => {
  const pageSize = Number(value);
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    return 10;
  }

  return Math.min(pageSize, 50);
};

const topicApi = {
  getHomeTopicList: (params = {}) => {
    const requestParams = {
      sortType: normalizeSortType(params.sortType),
      pageNum: normalizePageNum(params.pageNum),
      pageSize: normalizePageSize(params.pageSize),
    };

    return contentApiClient.get(API_ENDPOINTS.TOPIC.HOME_LIST, {
      params: requestParams,
    });
  },
};

export default topicApi;
