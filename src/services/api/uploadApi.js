import apiClient from './apiClient';
import { API_ENDPOINTS } from '../../config/api';

/**
 * 上传相关 API
 */
const uploadApi = {
  /**
   * 上传图片
   * @param {Object} file - 图片文件对象
   * @param {string} file.uri - 图片URI
   * @param {string} file.name - 文件名
   * @param {string} file.type - 文件类型
   * @returns {Promise<Object>}
   */
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name || 'image.jpg',
      type: file.type || 'image/jpeg',
    });

    return apiClient.post(API_ENDPOINTS.UPLOAD.IMAGE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * 批量上传图片
   * @param {Array} files - 图片文件数组
   * @returns {Promise<Array>}
   */
  uploadImages: async (files) => {
    const uploadPromises = files.map(file => uploadApi.uploadImage(file));
    return Promise.all(uploadPromises);
  },

  /**
   * 上传文件
   * @param {Object} file - 文件对象
   * @param {string} file.uri - 文件URI
   * @param {string} file.name - 文件名
   * @param {string} file.type - 文件类型
   * @returns {Promise<Object>}
   */
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    });

    return apiClient.post(API_ENDPOINTS.UPLOAD.FILE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default uploadApi;
