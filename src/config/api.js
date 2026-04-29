import ENV, { getApiServerUrl } from './env';

// 微服务配置
export const SERVICES = {
  CONTENT: 'qa-hero-content',  // 内容服务
  USER: 'qa-hero-app-user',    // 用户服务
  WALLET: 'qa-hero-wallet',    // 钱包服务
  ACTIVITY: 'qa-hero-activity', // 活动服务
  // 可以继续添加其他服务
};

// 构建带服务前缀的 API 路径
export const buildApiPath = (serviceName, path) => {
  return `/${serviceName}${path}`;
};

// API 配置
export const API_CONFIG = {
  BASE_URL: ENV.apiUrl,  // 默认基础URL
  TIMEOUT: 10000, // 10秒超时（优化：从60秒降低到10秒，提升响应速度）
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// 获取指定接口的完整URL
export const getFullApiUrl = (endpoint) => {
  const baseUrl = getApiServerUrl(endpoint);
  return baseUrl + endpoint;
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
    LOGIN: buildApiPath(SERVICES.USER, '/app/user/auth/login'),
    TOKEN_LOGIN: buildApiPath(SERVICES.USER, '/app/user/auth/token-login'),  // Token 自动登录
    REGISTER: buildApiPath(SERVICES.USER, '/app/user/auth/register'),
    LOGOUT: buildApiPath(SERVICES.USER, '/app/user/auth/logout'),
    REFRESH_TOKEN: buildApiPath(SERVICES.USER, '/auth/refresh'),
    VERIFY_CODE: '/auth/verify-code',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: buildApiPath(SERVICES.USER, '/app/user/auth/password'),
  },
  
  // 用户相关
  USER: {
    PROFILE: buildApiPath(SERVICES.USER, '/app/user/profile'),
    PROFILE_ME: buildApiPath(SERVICES.USER, '/app/user/profile/me'),  // 获取当前用户详细信息
    PUBLIC_PROFILE: buildApiPath(SERVICES.USER, '/app/user/profile/public/:userId'),
    PUBLIC_SEARCH: buildApiPath(SERVICES.USER, '/app/user/profile/public/search'),
    SUBMIT_FEEDBACK: buildApiPath(SERVICES.USER, '/app/user/submitFeedback'),
    QUERY_BLACKLIST: buildApiPath(SERVICES.USER, '/app/user/settings/queryBlacklist'),
    ADD_BLACKLIST: buildApiPath(SERVICES.USER, '/app/user/settings/addBlacklist'),
    REMOVE_BLACKLIST: buildApiPath(SERVICES.USER, '/app/user/settings/removeBlacklist/:blockedUserId'),
    UPDATE_PROFILE: buildApiPath(SERVICES.USER, '/app/user/profile'),
    UPDATE_USERNAME: buildApiPath(SERVICES.USER, '/app/user/profile/username'),  // 修改用户名
    AVATAR: buildApiPath(SERVICES.USER, '/app/user/profile/avatar'),  // 上传头像
    FOLLOW: buildApiPath(SERVICES.USER, '/app/user/follow/follow'),
    UNFOLLOW: buildApiPath(SERVICES.USER, '/app/user/follow/unfollow'),
    FOLLOW_STATUS: buildApiPath(SERVICES.USER, '/app/user/follow/status'),
    MY_FOLLOWING: buildApiPath(SERVICES.USER, '/app/user/follow/my/following'),
    MY_FOLLOWERS: buildApiPath(SERVICES.USER, '/app/user/follow/my/followers'),
    USER_FOLLOWERS: buildApiPath(SERVICES.USER, '/app/user/follow/followers'),
    USER_FOLLOWING: buildApiPath(SERVICES.USER, '/app/user/follow/following'),
    FOLLOWERS: buildApiPath(SERVICES.USER, '/app/user/follow/my/followers'),
    FOLLOWING: buildApiPath(SERVICES.USER, '/app/user/follow/following'),
  },

  WALLET: {
    POINTS_OVERVIEW: buildApiPath(SERVICES.WALLET, '/app/wallet/points/query-overview'),
    POINTS_TXN_LIST: buildApiPath(SERVICES.WALLET, '/app/wallet/points/txn-list'),
  },

  GROUP: {
    PUBLIC_QUESTION: buildApiPath(SERVICES.USER, '/app/group/public/question/:questionId'),
    PUBLIC_QUESTION_IDS: buildApiPath(SERVICES.USER, '/app/group/public/ids/question/:questionId'),
    JOIN: buildApiPath(SERVICES.USER, '/app/group/:groupId/join'),
    MESSAGE_PUBLIC_LIST: buildApiPath(SERVICES.USER, '/app/group-message/public/list'),
    MESSAGE_LIST: buildApiPath(SERVICES.USER, '/app/group-message/list'),
    MESSAGE_CREATE: buildApiPath(SERVICES.USER, '/app/group-message/create'),
  },

  // 问题相关
  QUESTION: {
    LIST: buildApiPath(SERVICES.CONTENT, '/app/content/question/list'),  // 问题列表（新接口）
    DETAIL: buildApiPath(SERVICES.CONTENT, '/app/content/question/:id'),  // 问题详情
    DRAFT_DETAIL: buildApiPath(SERVICES.CONTENT, '/app/content/question/:id'),  // 获取草稿详情
    LIKE: buildApiPath(SERVICES.CONTENT, '/app/content/question/:id/like'),  // 点赞问题
    UNLIKE: buildApiPath(SERVICES.CONTENT, '/app/content/question/:id/unlike'),  // 取消点赞问题
    DISLIKE: buildApiPath(SERVICES.CONTENT, '/app/content/question/:id/dislike'),  // 点踩问题
    UNDISLIKE: buildApiPath(SERVICES.CONTENT, '/app/content/question/:id/undislike'),  // 取消点踩问题
    COLLECT: buildApiPath(SERVICES.CONTENT, '/app/content/question/:id/collect'),  // 收藏问题
    UNCOLLECT: buildApiPath(SERVICES.CONTENT, '/app/content/question/:id/uncollect'),  // 取消收藏问题
    SUPPLEMENTS: buildApiPath(SERVICES.CONTENT, '/app/content/supplement/question/:questionId/list'),  // 问题补充列表
    PUBLISH_SUPPLEMENT: buildApiPath(SERVICES.CONTENT, '/app/content/supplement/question/:questionId'),  // 发布补充问题
    DISLIKE_SUPPLEMENT: buildApiPath(SERVICES.CONTENT, '/app/content/supplement/:id/dislike'),  // 踩一下补充问题
    UNDISLIKE_SUPPLEMENT: buildApiPath(SERVICES.CONTENT, '/app/content/supplement/:id/undislike'),  // 取消踩补充问题
    LIKE_SUPPLEMENT: buildApiPath(SERVICES.CONTENT, '/app/content/supplement/:id/like'),  // 点赞补充问题
    UNLIKE_SUPPLEMENT: buildApiPath(SERVICES.CONTENT, '/app/content/supplement/:id/unlike'),  // 取消点赞补充问题
    COLLECT_SUPPLEMENT: buildApiPath(SERVICES.CONTENT, '/app/content/supplement/:id/collect'),  // 收藏补充问题
    UNCOLLECT_SUPPLEMENT: buildApiPath(SERVICES.CONTENT, '/app/content/supplement/:id/uncollect'),  // 取消收藏补充问题
    CREATE: buildApiPath(SERVICES.CONTENT, '/app/content/question'),
    PUBLISH: buildApiPath(SERVICES.CONTENT, '/app/content/question/publish'),  // 发布问题
    UPDATE: '/questions/:id',
    DELETE: '/questions/:id',
    DRAFT: buildApiPath(SERVICES.CONTENT, '/app/content/question/draft'),  // 保存草稿
    DRAFTS: buildApiPath(SERVICES.CONTENT, '/app/content/question/drafts'),  // 获取草稿列表
    BROWSE_MY: buildApiPath(SERVICES.CONTENT, '/app/content/browse/my'),  // 获取我的浏览历史
    HOT: '/questions/hot',
    RANKING: '/questions/ranking',
    RANK_LIST: buildApiPath(SERVICES.CONTENT, '/app/content/rank/list'),
    HOT_TABS: buildApiPath(SERVICES.CONTENT, '/app/content/rank/hot/tabs'),
    RANKING_ALL: buildApiPath(SERVICES.CONTENT, '/app/content/rank/question/all'),
    SEARCH: '/questions/search',
    COMMUNITY_SOLVE_VOTE_SUMMARY: buildApiPath(SERVICES.CONTENT, '/app/content/question/:id/communitySolveVote/summary'),
    COMMUNITY_SOLVE_VOTE: buildApiPath(SERVICES.CONTENT, '/app/content/question/:id/communitySolveVote'),
  },
  
  // 分类相关
  CATEGORY: {
    LIST: buildApiPath(SERVICES.CONTENT, '/app/content/category/list'),
  },

  CHANNEL: {
    CATALOG: buildApiPath(SERVICES.CONTENT, '/app/content/channel/catalog/query'),
    COMBINED_CREATE: buildApiPath(SERVICES.CONTENT, '/app/content/channel/combined/create'),
    COMBINED_MY_CREATED: buildApiPath(SERVICES.CONTENT, '/app/content/channel/combined/my-created/query'),
    HOME: buildApiPath(SERVICES.CONTENT, '/app/content/channel/home/query'),
    MY_ORDER_SAVE: buildApiPath(SERVICES.CONTENT, '/app/content/channel/my/order/save'),
    SUBSCRIBE: buildApiPath(SERVICES.CONTENT, '/app/content/channel/subscribe'),
    MY_SUBSCRIBED_REMOVE: buildApiPath(SERVICES.CONTENT, '/app/content/channel/my/subscribed/remove'),
    MY_SUBSCRIBED: buildApiPath(SERVICES.CONTENT, '/app/content/channel/my/subscribed/query'),
  },

  REGION: {
    CHILDREN: buildApiPath(SERVICES.USER, '/app/region/children'),
  },
  
  // 回答相关
  ANSWER: {
    LIST: buildApiPath(SERVICES.CONTENT, '/app/content/answer/question/:questionId/list'),
    MY: buildApiPath(SERVICES.CONTENT, '/app/content/answer/my'),
    DETAIL: buildApiPath(SERVICES.CONTENT, '/app/content/answer/:id'),  // 回答详情
    SUPPLEMENT_LIST: buildApiPath(SERVICES.CONTENT, '/app/content/answer-supplement/answer/:answerId/list'),  // 补充回答列表
    SUPPLEMENT_PUBLISH: buildApiPath(SERVICES.CONTENT, '/app/content/answer-supplement/answer/:answerId'),  // 发布补充回答
    PUBLISH: buildApiPath(SERVICES.CONTENT, '/app/content/answer/question/:questionId'),  // 发布回答
    COLLECT: buildApiPath(SERVICES.CONTENT, '/app/content/answer/:id/collect'),  // 收藏回答
    UNCOLLECT: buildApiPath(SERVICES.CONTENT, '/app/content/answer/:id/uncollect'),  // 取消收藏回答
    LIKE: buildApiPath(SERVICES.CONTENT, '/app/content/answer/:id/like'),  // 点赞回答
    UNLIKE: buildApiPath(SERVICES.CONTENT, '/app/content/answer/:id/unlike'),  // 取消点赞回答
    DISLIKE: buildApiPath(SERVICES.CONTENT, '/app/content/answer/:id/dislike'),  // 点踩回答
    UNDISLIKE: buildApiPath(SERVICES.CONTENT, '/app/content/answer/:id/undislike'),  // 取消踩回答
    ADOPT: buildApiPath(SERVICES.CONTENT, '/app/content/answer/question/:questionId/accept/:answerId'),  // 采纳回答
  },
  
  // 活动相关
  ACTIVITY: {
    LIST: buildApiPath(SERVICES.ACTIVITY, '/app/activity/list'),
    CENTER_LIST: buildApiPath(SERVICES.ACTIVITY, '/app/activity/center/list'),
    CREATE: buildApiPath(SERVICES.ACTIVITY, '/app/activity/create'),
    DETAIL: '/activities/:id',
    JOIN: '/activities/:id/join',
    PARTICIPANTS: '/activities/:id/participants',
  },
  
  // 团队相关
  TEAM: {
    PUBLIC_QUESTION: buildApiPath(SERVICES.USER, '/app/team/public/question/:questionId'),
    LIST: '/teams',
    MINE: buildApiPath(SERVICES.USER, '/app/team/mine'),
    DETAIL: buildApiPath(SERVICES.USER, '/app/team/detail/:teamId'),
    CREATE: buildApiPath(SERVICES.USER, '/app/team/create'),
    APPLY: buildApiPath(SERVICES.USER, '/app/team/:teamId/apply'),
    APPLICATIONS: buildApiPath(SERVICES.USER, '/app/team/:teamId/applications'),
    APPROVE_APPLICATION: buildApiPath(SERVICES.USER, '/app/team/:teamId/apply/:appUserId/approve'),
    REJECT_APPLICATION: buildApiPath(SERVICES.USER, '/app/team/:teamId/apply/:appUserId/reject'),
    TRANSFER: buildApiPath(SERVICES.USER, '/app/team/:teamId/transfer'),
    LEAVE: buildApiPath(SERVICES.USER, '/app/team/:teamId/leave'),
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
    HELP_LIST: buildApiPath(SERVICES.CONTENT, '/app/content/emergency-help/list'),
    HELP_DETAIL: buildApiPath(SERVICES.CONTENT, '/app/content/emergency-help/:id'),
    HELP_COMMENTS: buildApiPath(SERVICES.CONTENT, '/app/content/emergency-help/:id/comments'),
    HELP_CONTACT: buildApiPath(SERVICES.CONTENT, '/app/content/emergency-help/:id/contact'),
    HELP_JOIN: buildApiPath(SERVICES.CONTENT, '/app/content/emergency-help/:id/join'),
    HELP_RESOLVE: buildApiPath(SERVICES.CONTENT, '/app/content/emergency-help/:id/resolve'),
    HELP_LEAVE: buildApiPath(SERVICES.CONTENT, '/app/content/emergency-help/:id/leave'),
    LIST: '/emergency',
    CREATE: '/emergency',
    DETAIL: '/emergency/:id',
    RESPOND: '/emergency/:id/respond',
    QUOTA: buildApiPath(SERVICES.CONTENT, '/app/content/emergency-help/quota'),
    SETTINGS_PUBLIC: buildApiPath(SERVICES.CONTENT, '/app/content/emergency-help/settings/public'),
    FEE_ESTIMATE: buildApiPath(SERVICES.CONTENT, '/app/content/emergency-help/fee-estimate'),
    PUBLISH: buildApiPath(SERVICES.CONTENT, '/app/content/emergency-help/publish'),
  },
  
  // Twitter 相关
  TWITTER: {
    SEARCH_USERS: '/api/twitter/search/users',      // 搜索 Twitter 用户
    INVITE_USER: '/api/twitter/invite',              // 邀请 Twitter 用户
    INVITED_USERS: '/api/twitter/invited',           // 获取已邀请的用户列表
  },
  
  // 评论相关
  COMMENT: {
    CREATE: buildApiPath(SERVICES.CONTENT, '/app/content/comment'),  // 发布评论
    LIST: buildApiPath(SERVICES.CONTENT, '/app/content/comment/list'),  // 评论列表
    LIKE: buildApiPath(SERVICES.CONTENT, '/app/content/comment/:id/like'),  // 点赞评论
    UNLIKE: buildApiPath(SERVICES.CONTENT, '/app/content/comment/:id/unlike'),  // 取消点赞评论
    COLLECT: buildApiPath(SERVICES.CONTENT, '/app/content/comment/:id/collect'),  // 收藏评论
    UNCOLLECT: buildApiPath(SERVICES.CONTENT, '/app/content/comment/:id/uncollect'),  // 取消收藏评论
    DISLIKE: buildApiPath(SERVICES.CONTENT, '/app/content/comment/:id/dislike'),  // 点踩评论
    UNDISLIKE: buildApiPath(SERVICES.CONTENT, '/app/content/comment/:id/undislike'),  // 取消点踩评论
  },
  
  // 上传相关
  REPORT: {
    SUBMIT: buildApiPath(SERVICES.CONTENT, '/app/content/report'),
  },

  UPLOAD: {
    IMAGE: buildApiPath(SERVICES.CONTENT, '/app/content/image/upload'),
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
