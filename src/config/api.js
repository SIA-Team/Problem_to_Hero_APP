import ENV from './env';

// API 配置
export const API_CONFIG = {
  BASE_URL: ENV.apiUrl,
  TIMEOUT: 60000, // 60秒超时（生产环境网络可能较慢）
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// 注册请求配置（简化请求头，避免触发 CORS 预检）
export const REGISTER_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
  },
};

// API 端点
export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    LOGIN: '/app/user/auth/login',
    TOKEN_LOGIN: '/app/user/auth/token-login',  // Token 自动登录
    REGISTER: '/app/user/auth/register',
    LOGOUT: '/app/user/auth/logout',
    REFRESH_TOKEN: '/auth/refresh',
    VERIFY_CODE: '/auth/verify-code',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/app/user/auth/password',
  },
  
  // 用户相关
  USER: {
    PROFILE: '/app/user/profile',
    PROFILE_ME: '/app/user/profile/me',  // 获取当前用户详细信息
    UPDATE_PROFILE: '/app/user/profile',
    UPDATE_USERNAME: '/app/user/profile/username',  // 修改用户名
    AVATAR: '/app/user/profile/avatar',  // 上传头像
    FOLLOW: '/user/follow',
    UNFOLLOW: '/user/unfollow',
    FOLLOWERS: '/user/followers',
    FOLLOWING: '/user/following',
  },
  
  // 问题相关
  QUESTION: {
    LIST: '/questions',
    DETAIL: '/questions/:id',
    CREATE: '/questions',
    UPDATE: '/questions/:id',
    DELETE: '/questions/:id',
    HOT: '/questions/hot',
    RANKING: '/questions/ranking',
    SEARCH: '/questions/search',
  },
  
  // 回答相关
  ANSWER: {
    LIST: '/answers',
    DETAIL: '/answers/:id',
    CREATE: '/answers',
    UPDATE: '/answers/:id',
    DELETE: '/answers/:id',
    ADOPT: '/answers/:id/adopt',
    LIKE: '/answers/:id/like',
  },
  
  // 活动相关
  ACTIVITY: {
    LIST: '/activities',
    DETAIL: '/activities/:id',
    CREATE: '/activities',
    JOIN: '/activities/:id/join',
    PARTICIPANTS: '/activities/:id/participants',
  },
  
  // 团队相关
  TEAM: {
    LIST: '/teams',
    DETAIL: '/teams/:id',
    CREATE: '/teams',
    UPDATE: '/teams/:id',
    MEMBERS: '/teams/:id/members',
    INVITE: '/teams/:id/invite',
  },
  
  // 消息相关
  MESSAGE: {
    LIST: '/messages',
    SEND: '/messages',
    CONVERSATION: '/messages/conversation/:userId',
    UNREAD_COUNT: '/messages/unread-count',
  },
  
  // 紧急求助相关
  EMERGENCY: {
    LIST: '/emergency',
    CREATE: '/emergency',
    DETAIL: '/emergency/:id',
    RESPOND: '/emergency/:id/respond',
  },
  
  // Twitter 相关
  TWITTER: {
    SEARCH_USERS: '/api/twitter/search/users',      // 搜索 Twitter 用户
    INVITE_USER: '/api/twitter/invite',              // 邀请 Twitter 用户
    INVITED_USERS: '/api/twitter/invited',           // 获取已邀请的用户列表
  },
  
  // 上传相关
  UPLOAD: {
    IMAGE: '/upload/image',
    FILE: '/upload/file',
  },
};

// 替换 URL 参数的辅助函数
export const replaceUrlParams = (url, params) => {
  let replacedUrl = url;
  Object.keys(params).forEach(key => {
    replacedUrl = replacedUrl.replace(`:${key}`, params[key]);
  });
  return replacedUrl;
};
