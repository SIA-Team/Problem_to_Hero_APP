/**
 * Toast 工具类
 * 提供全局 Toast 提示功能
 */

let toastRef = null;

export const setToastRef = (ref) => {
  console.log('🔗 setToastRef 被调用:', ref ? '有效引用' : '空引用');
  toastRef = ref;
};

export const showToast = (message, type = 'error', duration = 2000) => {
  console.log('🚀 showToast 被调用:', { message, type, duration });
  console.log('🚀 toastRef 状态:', toastRef ? '已设置' : '未设置');
  
  if (toastRef) {
    console.log('🚀 调用 toastRef.show');
    toastRef.show(message, type, duration);
  } else {
    console.warn('⚠️ Toast ref not set. Please add ToastContainer to your app.');
    console.warn('⚠️ 消息内容:', message);
  }
};

export const toast = {
  success: (message, duration) => {
    console.log('✅ toast.success 被调用:', message);
    showToast(message, 'success', duration);
  },
  error: (message, duration) => {
    console.log('❌ toast.error 被调用:', message);
    showToast(message, 'error', duration);
  },
  warning: (message, duration) => {
    console.log('⚠️ toast.warning 被调用:', message);
    showToast(message, 'warning', duration);
  },
  info: (message, duration) => {
    console.log('ℹ️ toast.info 被调用:', message);
    showToast(message, 'info', duration);
  },
};
