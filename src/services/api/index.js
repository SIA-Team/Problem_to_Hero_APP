/**
 * API 服务统一导出
 */
import authApi from './authApi';
import userApi from './userApi';
import questionApi from './questionApi';
import answerApi from './answerApi';
import uploadApi from './uploadApi';
import reportApi from './reportApi';
import emergencyApi from './emergencyApi';

export {
  authApi,
  userApi,
  questionApi,
  answerApi,
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
  upload: uploadApi,
  report: reportApi,
  emergency: emergencyApi,
};
