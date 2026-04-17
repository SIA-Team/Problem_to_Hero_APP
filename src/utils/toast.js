import {
  getDefaultUserFacingMessage,
  sanitizeUserFacingMessage,
} from './userFacingMessage';

const toastListeners = new Set();

export const subscribeToast = (listener) => {
  if (typeof listener !== 'function') {
    return () => {};
  }

  toastListeners.add(listener);

  return () => {
    toastListeners.delete(listener);
  };
};

export const showToast = (message, type = 'error', duration = 2000) => {
  const normalizedMessage = sanitizeUserFacingMessage(
    message,
    getDefaultUserFacingMessage(type),
    type
  );

  console.log('showToast called:', { message: normalizedMessage, type, duration });

  if (toastListeners.size === 0) {
    console.warn('Toast listener not mounted. Please render ToastContainer.');
    console.warn('Toast message:', normalizedMessage);
    return;
  }

  toastListeners.forEach((listener) => {
    try {
      listener({
        message: normalizedMessage,
        type,
        duration,
      });
    } catch (error) {
      console.error('Toast listener error:', error);
    }
  });
};

export const toast = {
  success: (message, duration) => {
    console.log('toast.success called:', message);
    showToast(message, 'success', duration);
  },
  error: (message, duration) => {
    console.log('toast.error called:', message);
    showToast(message, 'error', duration);
  },
  warning: (message, duration) => {
    console.log('toast.warning called:', message);
    showToast(message, 'warning', duration);
  },
  info: (message, duration) => {
    console.log('toast.info called:', message);
    showToast(message, 'info', duration);
  },
};
