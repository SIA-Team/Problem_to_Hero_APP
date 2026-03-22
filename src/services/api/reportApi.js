import contentApiClient from './contentApiClient';
import { API_ENDPOINTS } from '../../config/api';

const reportApi = {
  submitReport: (data) => contentApiClient.post(API_ENDPOINTS.REPORT.SUBMIT, data),
};

export default reportApi;
