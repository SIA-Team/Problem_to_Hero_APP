import { Alert } from 'react-native';
import { sanitizeUserFacingMessage } from './userFacingMessage';

let appAlertRef = null;

const sanitizeAlertTitle = (title) =>
  sanitizeUserFacingMessage(title, '提示', 'info');

const showSanitizedAlert = (
  title,
  message = '',
  buttons = [],
  options = {},
  type = 'error',
  fallbackMessage = '',
  preserveEmptyMessage = false
) => {
  const normalizedTitle = sanitizeAlertTitle(title);
  const normalizedMessage =
    message === undefined || message === null || message === ''
      ? preserveEmptyMessage
        ? ''
        : sanitizeUserFacingMessage('', fallbackMessage, type)
      : sanitizeUserFacingMessage(message, fallbackMessage, type);

  const { messageType: _messageType, ...alertOptions } = options || {};
  const normalizedButtons =
    Array.isArray(buttons) && buttons.length > 0 ? buttons : [{ text: '我知道了' }];

  if (appAlertRef && typeof appAlertRef.showAlert === 'function') {
    appAlertRef.showAlert(normalizedTitle, normalizedMessage, normalizedButtons, alertOptions);
    return;
  }

  Alert.alert(normalizedTitle || '提示', normalizedMessage || '', normalizedButtons, alertOptions);
};

export const setAppAlertRef = (ref) => {
  appAlertRef = ref;
};

export const showAppAlert = (title, message = '', buttons = [], options = {}) => {
  const { messageType = 'error', ...alertOptions } = options || {};
  showSanitizedAlert(title, message, buttons, alertOptions, messageType, '', true);
};

export const showPublishFailureAlert = (
  message,
  {
    title = '发布失败',
    fallbackMessage = '发布失败，请稍后重试',
    buttons = [],
    options = {},
  } = {}
) => {
  showSanitizedAlert(title, message, buttons, options, 'error', fallbackMessage);
};

export const showPublishBlockedAlert = (
  message,
  {
    title = '暂时无法发布',
    fallbackMessage = '当前内容暂时无法发布',
    buttons = [],
    options = {},
  } = {}
) => {
  showSanitizedAlert(title, message, buttons, options, 'warning', fallbackMessage);
};
