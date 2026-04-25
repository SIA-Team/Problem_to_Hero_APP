/**
 * API 服务统一导出
 */
import authApi from './authApi';
import userApi from './userApi';
import questionApi from './questionApi';
import answerApi from './answerApi';
import activityApi from './activityApi';
import teamApi from './teamApi';
import uploadApi from './uploadApi';
import reportApi from './reportApi';
import emergencyApi from './emergencyApi';
import regionApi from './regionApi';
import walletApi from './walletApi';

export {
  authApi,
  userApi,
  questionApi,
  answerApi,
  activityApi,
  teamApi,
  uploadApi,
  reportApi,
  emergencyApi,
  regionApi,
  walletApi,
};

// 默认导出所有 API
export default {
  auth: authApi,
  user: userApi,
  question: questionApi,
  answer: answerApi,
  activity: activityApi,
  team: teamApi,
  upload: uploadApi,
  report: reportApi,
  emergency: emergencyApi,
  region: regionApi,
  wallet: walletApi,
};
