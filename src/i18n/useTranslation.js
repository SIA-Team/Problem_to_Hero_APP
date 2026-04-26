import React from 'react';
import i18n from './index';

export const useTranslation = () => {
  const [, forceUpdate] = React.useReducer(count => count + 1, 0);

  React.useEffect(() => {
    return i18n.subscribe(() => {
      forceUpdate();
    });
  }, []);

  const t = React.useCallback((key, params) => {
    return i18n.t(key, params);
  }, []);
  
  return { t, i18n };
};

export default useTranslation;
