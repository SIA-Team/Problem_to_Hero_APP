import { Alert } from 'react-native';
import { showAppAlert } from './appAlert';

/**
 * 统一错误处理工具
 */
class ErrorHandler {
  /**
   * 显示错误提示
   * @param {string|Object} error - 错误信息或错误对象
   * @param {string} title - 提示标题
   */
  static showError(error, title = '错误') {
    const message = typeof error === 'string' ? error : error?.message || '操作失败';
    
    showAppAlert(title, message, [{ text: '确定' }]);
  }

  /**
   * 显示成功提示
   * @param {string} message - 成功信息
   * @param {string} title - 提示标题
   */
  static showSuccess(message, title = '成功') {
    showAppAlert(title, message, [{ text: '确定' }]);
  }

  /**
   * 显示确认对话框
   * @param {string} message - 确认信息
   * @param {Function} onConfirm - 确认回调
   * @param {string} title - 提示标题
   */
  static showConfirm(message, onConfirm, title = '确认') {
    showAppAlert(
      title,
      message,
      [
        { text: '取消', style: 'cancel' },
        { text: '确定', onPress: onConfirm },
      ]
    );
  }

  /**
   * 处理 API 错误
   * @param {Object} error - 错误对象
   * @param {boolean} showAlert - 是否显示提示
   * @returns {string} 错误信息
   */
  static handleApiError(error, showAlert = true) {
    let message = '操作失败';

    if (error?.message) {
      message = error.message;
    } else if (error?.response?.data?.message) {
      message = error.response.data.message;
    } else if (error?.status) {
      message = this.getStatusMessage(error.status);
    }

    if (showAlert) {
      this.showError(message);
    }

    // 记录错误日志
    if (__DEV__) {
      console.error('API Error:', error);
    }

    return message;
  }

  /**
   * 根据状态码获取错误信息
   * @param {number} status - HTTP 状态码
   * @returns {string}
   */
  static getStatusMessage(status) {
    const statusMessages = {
      400: '请求参数错误',
      401: '未授权，请重新登录',
      403: '没有权限访问',
      404: '请求的资源不存在',
      500: '服务器错误，请稍后重试',
      502: '网关错误',
      503: '服务暂时不可用',
    };

    return statusMessages[status] || `请求失败 (${status})`;
  }

  /**
   * 处理网络错误
   * @param {boolean} showAlert - 是否显示提示
   */
  static handleNetworkError(showAlert = true) {
    const message = '网络连接失败，请检查网络';
    
    if (showAlert) {
      this.showError(message, '网络错误');
    }

    return message;
  }
}

export default ErrorHandler;
