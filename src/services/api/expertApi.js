import contentApiClient from './contentApiClient';

/**
 * 专家相关 API
 */
const expertApi = {
  /**
   * 获取专家列表（支持分页和分类筛选）
   * @param {Object} params - 查询参数
   * @param {number} params.categoryId - 问题类别ID，筛选该类别下的专家；不传则返回全部专家
   * @param {number} params.pageNum - 页码，从1开始
   * @param {number} params.pageSize - 每页条数
   * @returns {Promise<Object>} { total, rows }
   */
  getExpertList: async (params = {}) => {
    const { categoryId, pageNum = 1, pageSize = 10 } = params;
    
    const queryParams = {
      pageNum,
      pageSize,
    };
    
    // 只有传入 categoryId 时才添加到查询参数
    if (categoryId) {
      queryParams.categoryId = categoryId;
    }
    
    console.log('🔍 请求专家列表:', queryParams);
    
    const response = await contentApiClient.get('/app/content/expert/list', { params: queryParams });
    
    console.log('📦 专家列表响应:', response);
    
    return response;
  },
};

export default expertApi;
