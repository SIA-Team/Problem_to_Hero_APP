import { showToast } from './toast';

let appAlertRef = null;

export const setAppAlertRef = (ref) => {
  appAlertRef = ref;
};

export const showAppAlert = (title, message = '', buttons = [], options = {}) => {
  if (appAlertRef && typeof appAlertRef.showAlert === 'function') {
    appAlertRef.showAlert(title, message, buttons, options);
    return;
  }

  const fallbackText = [title, message].filter(Boolean).join('\n');
  showToast(fallbackText || '提示', 'info', 2500);
};
