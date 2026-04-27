import contentApiClient from './contentApiClient';
import { buildApiPath, SERVICES } from '../../config/api';

const OCCUPATION_TREE_ENDPOINT = buildApiPath(
  SERVICES.CONTENT,
  '/app/content/occupation/tree'
);
const OCCUPATION_CUSTOM_REQUESTS_ENDPOINT = buildApiPath(
  SERVICES.CONTENT,
  '/app/content/occupation/custom-requests'
);

const occupationApi = {
  getOccupationTree: () => contentApiClient.get(OCCUPATION_TREE_ENDPOINT),
  submitCustomOccupationRequest: (payload) =>
    contentApiClient.post(OCCUPATION_CUSTOM_REQUESTS_ENDPOINT, payload),
};

export default occupationApi;
