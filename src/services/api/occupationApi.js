import contentApiClient from './contentApiClient';
import { buildApiPath, SERVICES } from '../../config/api';

const OCCUPATION_TREE_ENDPOINT = buildApiPath(
  SERVICES.CONTENT,
  '/app/content/occupation/tree'
);

const occupationApi = {
  getOccupationTree: () => contentApiClient.get(OCCUPATION_TREE_ENDPOINT),
};

export default occupationApi;
