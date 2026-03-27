/**
 * API 服务统一导出
 */
import authApi from './authApi';
import userApi from './userApi';
import questionApi from './questionApi';
import answerApi from './answerApi';
import activityApi from './activityApi';
import uploadApi from './uploadApi';
import reportApi from './reportApi';
import emergencyApi from './emergencyApi';

export {
  authApi,
  userApi,
  questionApi,
  answerApi,
  activityApi,
  uploadApi,
  reportApi,
  emergencyApi,
};

// 默认导出所有 API
export default {
  auth: authApi,
  user: userApi,
  question: questionApi,
  answer: answerApi,
  activity: activityApi,
  upload: uploadApi,
  report: reportApi,
  emergency: emergencyApi,
};
