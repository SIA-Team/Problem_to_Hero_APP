import apiClient from './apiClient';
import contentApiClient from './contentApiClient';
import { API_ENDPOINTS, replaceUrlParams } from '../../config/api';

/**
 * 问题相关 API
 */
const questionApi = {
  /**
   * 获取问题列表
   * @param {Object} params - 查询参数
   * @param {Object} params.question - 筛选条件
   * @param {number} params.question.userId - 提问者ID
   * @param {number} params.question.type - 问题类型
   * @param {number} params.question.categoryId - 类别ID
   * @param {number} params.question.status - 状态
   * @param {string} params.question.title - 标题（模糊搜索）
   * @param {number} params.pageNum - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise<Object>}
   */
  getQuestions: async (params) => {
    const { pageNum = 1, pageSize = 20, question = {} } = params;
    
    // 构建请求参数
    const requestParams = {
      pageNum,
      pageSize,
      question: {
        ...question,
        // 确保必要的字段存在
        params: question.params || {},
      },
    };
    
    console.log('📡 请求问题列表:', requestParams);
    
    const response = await contentApiClient.get(API_ENDPOINTS.QUESTION.LIST, { params: requestParams });
    
    // 显示后端返回的原始数据（第一条）
    if (response && response.data && response.data.rows && response.data.rows.length > 0) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🔍 后端返回的原始数据（第一条问题的所有字段）:');
      console.log('═══════════════════════════════════════════════════════════');
      const firstItem = response.data.rows[0];
      console.log(JSON.stringify(firstItem, null, 2));
      console.log('═══════════════════════════════════════════════════════════');
    }
    
    // 检查 payViewAmount 字段
    if (response && response.data && response.data.rows) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('💰 检查 payViewAmount 字段');
      console.log('═══════════════════════════════════════════════════════════');
      
      // 显示所有问题的 payViewAmount 字段
      console.log('\n所有问题的 payViewAmount 字段:');
      response.data.rows.forEach((item, index) => {
        console.log(`${index + 1}. ID:${item.id} - ${item.title}`);
        console.log(`   payViewAmount: ${item.payViewAmount} (类型: ${typeof item.payViewAmount})`);
        console.log(`   type: ${item.type}, status: ${item.status}`);
      });
      
      const paidQuestions = response.data.rows.filter(item => item.payViewAmount && item.payViewAmount > 0);
      
      console.log(`\n总问题数: ${response.data.rows.length}`);
      console.log(`付费问题数: ${paidQuestions.length}`);
      
      if (paidQuestions.length > 0) {
        console.log('\n付费问题详情:');
        paidQuestions.forEach((item, index) => {
          console.log(`\n${index + 1}. 问题ID: ${item.id}`);
          console.log(`   标题: ${item.title}`);
          console.log(`   payViewAmount: ${item.payViewAmount} 分 (${item.payViewAmount / 100} 元)`);
          console.log(`   type: ${item.type}`);
          console.log(`   status: ${item.status}`);
        });
      } else {
        console.log('⚠️ 没有找到 payViewAmount > 0 的问题');
      }
      
      console.log('═══════════════════════════════════════════════════════════');
    }
    
    // 过滤掉 status 为 0 的数据
    if (response && response.data && response.data.rows) {
      const originalCount = response.data.rows.length;
      response.data.rows = response.data.rows.filter(item => item.status !== 0);
      const filteredCount = response.data.rows.length;
      
      if (originalCount !== filteredCount) {
        console.log(`🔍 过滤问题列表: 原始${originalCount}条，过滤后${filteredCount}条（移除了${originalCount - filteredCount}条 status=0 的数据）`);
      }
    }
    
    return response;
  },

  /**
   * 获取问题详情
   * @param {string} questionId - 问题ID
   * @returns {Promise<Object>}
   */
  getQuestionDetail: (questionId) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.DETAIL, { id: questionId });
    return apiClient.get(url);
  },

  /**
   * 发布问题
   * @param {Object} data - 问题数据
   * @param {number} data.id - 问题ID（0=新建问题，有值=更新问题）
   * @param {number} data.type - 问题类型：0=公开问题，1=悬赏问题，2=定向问题
   * @param {number} data.categoryId - 二级分类ID（必填）
   * @param {string} data.title - 问题标题（必填，1-200字符）
   * @param {string} data.description - 问题描述
   * @param {string} data.subQuestions - 子问题（JSON数组字符串）
   * @param {number} data.bountyAmount - 悬赏金额（单位：分）
   * @param {number} data.payViewAmount - 付费查看金额（单位：分）
   * @param {string} data.location - 位置信息
   * @param {number} data.visibilityScope - 可见范围：0=所有人，1=仅关注我的人，2=仅自己
   * @param {number} data.isAnonymous - 是否匿名：0=不匿名，1=匿名
   * @param {number} data.isPublicAnswer - 是否公开答案：0=不公开，1=公开
   * @param {number} data.teamId - 团队ID
   * @param {Array<number>} data.expertIds - 专家ID列表
   * @param {Array<number>} data.topicIds - 已有话题ID列表
   * @param {Array<string>} data.topicNames - 新话题名称列表
   * @param {Array<string>} data.imageUrls - 图片URL列表
   * @returns {Promise<Object>}
   */
  publishQuestion: (data) => {
    console.log('📤 questionApi.publishQuestion 接收到的数据:', JSON.stringify(data, null, 2));
    console.log('📤 数据验证:');
    console.log('  - title:', `"${data.title}" (类型: ${typeof data.title}, 长度: ${data.title?.length || 0})`);
    console.log('  - categoryId:', `${data.categoryId} (类型: ${typeof data.categoryId})`);
    console.log('  - type:', `${data.type} (类型: ${typeof data.type})`);
    console.log('  - type详细检查:');
    console.log('    * 原始值:', data.type);
    console.log('    * JSON序列化:', JSON.stringify(data.type));
    console.log('    * 是否为数字:', typeof data.type === 'number');
    console.log('    * 是否为整数:', Number.isInteger(data.type));
    console.log('    * 是否在有效范围:', [0, 1, 2].includes(data.type));
    
    // 修复 subQuestions 字段：如果为空字符串，改为空数组的 JSON 字符串
    const fixedData = {
      ...data,
      subQuestions: data.subQuestions === '' ? '[]' : data.subQuestions
    };
    
    // 直接发送数据，不包装（后端的 @RequestBody 会自动映射到 QuestionPublishRequest 对象）
    console.log('📤 直接发送数据（不包装）:', JSON.stringify(fixedData, null, 2));
    
    return contentApiClient.post(API_ENDPOINTS.QUESTION.PUBLISH, fixedData);
  },

  /**
   * 保存问题草稿
   * @param {Object} data - 草稿数据
   * @param {number} data.id - 草稿ID（0=新建草稿，有值=更新草稿）
   * @param {number} data.type - 问题类型：0=公开问题，1=悬赏问题，2=定向问题
   * @param {number} data.categoryId - 二级分类ID
   * @param {string} data.title - 问题标题
   * @param {string} data.description - 问题描述
   * @param {string} data.subQuestions - 子问题
   * @param {number} data.bountyAmount - 悬赏金额（单位：分）
   * @param {number} data.payViewAmount - 付费查看金额（单位：分）
   * @param {string} data.location - 位置信息
   * @param {number} data.visibilityScope - 可见范围：0=所有人，1=仅关注我的人，2=仅自己
   * @param {number} data.isAnonymous - 是否匿名：0=不匿名，1=匿名
   * @param {number} data.isPublicAnswer - 是否公开答案：0=不公开，1=公开
   * @param {number} data.teamId - 团队ID
   * @param {Array<number>} data.expertIds - 专家ID列表
   * @param {Array<number>} data.topicIds - 已有话题ID列表
   * @param {Array<string>} data.topicNames - 新话题名称列表
   * @param {Array<string>} data.imageUrls - 图片URL列表
   * @returns {Promise<Object>}
   */
  saveDraft: (data) => {
    // 修复 subQuestions 字段：如果为空字符串，改为空数组的 JSON 字符串
    const fixedData = {
      ...data,
      subQuestions: data.subQuestions === '' ? '[]' : data.subQuestions
    };
    
    console.log('📝 保存问题草稿（直接发送，不包装）:', JSON.stringify(fixedData, null, 2));
    
    // 直接发送数据，不包装
    return contentApiClient.post(API_ENDPOINTS.QUESTION.DRAFT, fixedData);
  },

  /**
   * 获取草稿详情
   * @param {number} id - 草稿ID
   * @returns {Promise<Object>}
   */
  getDraftDetail: (id) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.DRAFT_DETAIL, { id });
    console.log(`📋 获取草稿详情: ID=${id}`);
    return contentApiClient.get(url);
  },

  /**
   * 获取草稿列表
   * @param {Object} params - 查询参数
   * @param {number} params.pageNum - 页码（默认1）
   * @param {number} params.pageSize - 每页数量（默认10）
   * @returns {Promise<Object>}
   */
  getDraftsList: (params) => {
    const { pageNum = 1, pageSize = 10 } = params;
    
    const requestParams = {
      pageNum,
      pageSize,
    };
    
    console.log('📋 获取草稿列表:', requestParams);
    
    return contentApiClient.get(API_ENDPOINTS.QUESTION.DRAFTS, { params: requestParams });
  },

  /**
   * 更新问题
   * @param {string} questionId - 问题ID
   * @param {Object} data - 更新的数据
   * @returns {Promise<Object>}
   */
  updateQuestion: (questionId, data) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.UPDATE, { id: questionId });
    return apiClient.put(url, data);
  },

  /**
   * 删除问题
   * @param {string} questionId - 问题ID
   * @returns {Promise<Object>}
   */
  deleteQuestion: (questionId) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.DELETE, { id: questionId });
    return apiClient.delete(url);
  },

  /**
   * 获取热门问题
   * @param {Object} params - 查询参数
   * @returns {Promise<Object>}
   */
  getHotQuestions: (params) => {
    return apiClient.get(API_ENDPOINTS.QUESTION.HOT, { params });
  },

  /**
   * 获取问题排行榜
   * @param {Object} params - 查询参数
   * @param {string} params.type - 排行类型（views/answers/rewards）
   * @returns {Promise<Object>}
   */
  getQuestionRanking: (params) => {
    return apiClient.get(API_ENDPOINTS.QUESTION.RANKING, { params });
  },

  /**
   * 搜索问题
   * @param {Object} params - 搜索参数
   * @param {string} params.keyword - 关键词
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise<Object>}
   */
  searchQuestions: (params) => {
    return apiClient.get(API_ENDPOINTS.QUESTION.SEARCH, { params });
  },

  /**
   * 获取推荐列表（用于首页优化）
   * @param {Object} params - 查询参数
   * @param {number} params.pageNum - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise<Object>}
   */
  getRecommendList: (params) => {
    const { pageNum = 1, pageSize = 20 } = params;
    
    // 推荐列表：获取所有已发布的问题，按创建时间排序
    return questionApi.getQuestions({
      pageNum,
      pageSize,
      question: {
        status: 1, // 只获取已发布的问题
      },
    });
  },

  /**
   * 获取热榜列表（用于首页优化）
   * @param {Object} params - 查询参数
   * @param {number} params.pageNum - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise<Object>}
   */
  getHotList: (params) => {
    const { pageNum = 1, pageSize = 20 } = params;
    
    // 热榜列表：可以根据浏览量、点赞数等排序
    // 这里先使用基础接口，后续可以优化
    return questionApi.getQuestions({
      pageNum,
      pageSize,
      question: {
        status: 1,
      },
    });
  },

  /**
   * 获取关注列表（用于首页优化）
   * @param {Object} params - 查询参数
   * @param {number} params.pageNum - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise<Object>}
   */
  getFollowList: (params) => {
    const { pageNum = 1, pageSize = 20 } = params;
    
    // 关注列表：获取关注用户的问题
    // 这里先使用基础接口，后续需要后端支持
    return questionApi.getQuestions({
      pageNum,
      pageSize,
      question: {
        status: 1,
      },
    });
  },
};

export default questionApi;
