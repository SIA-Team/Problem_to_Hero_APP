import React from 'react';
import i18n from './index';

const useI18nSubscription = () => {
  const [, forceUpdate] = React.useReducer(count => count + 1, 0);

  React.useEffect(() => {
    return i18n.subscribe(() => {
      forceUpdate();
    });
  }, []);
};

export const withTranslation = (Component) => {
  return (props) => {
    useI18nSubscription();

    const t = (key, params) => {
      return i18n.t(key, params);
    };

    return <Component {...props} t={t} i18n={i18n} />;
  };
};

export const useTranslation = () => {
  useI18nSubscription();

  const t = (key, params) => {
    return i18n.t(key, params);
  };

  return { t, i18n };
};

export default withTranslation;
