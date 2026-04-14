import apiClient from './apiClient';
import { API_ENDPOINTS } from '../../config/api';
import { normalizeEntityId } from '../../utils/jsonLongId';

const regionApi = {
  getRegionChildren: (parentId = '0') =>
    apiClient.get(API_ENDPOINTS.REGION.CHILDREN, {
      params: {
        parentId: normalizeEntityId(parentId) ?? '0',
      },
    }),
};

export default regionApi;
