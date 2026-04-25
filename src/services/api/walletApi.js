import apiClient from './apiClient';
import { API_ENDPOINTS } from '../../config/api';
import deviceRiskService from '../deviceRiskService';

const WALLET_API_PLACEHOLDER_MESSAGE = 'wallet api not configured';

const buildBaseWalletPayload = async ({
  action,
  amount,
  currency,
  metadata = {},
  riskScene,
  riskAction,
} = {}) => {
  const normalizedAmount = amount === undefined || amount === null ? null : Number(amount);
  const normalizedCurrency = String(currency || 'usd').toLowerCase();
  const riskContext = await deviceRiskService.captureRiskContext({
    scene: riskScene || 'wallet',
    action: riskAction || action || 'unknown',
    includeFullDeviceInfo: true,
    metadata,
  });

  return {
    action: action || 'unknown',
    amount: Number.isFinite(normalizedAmount) ? normalizedAmount : null,
    currency: normalizedCurrency,
    riskContext,
    metadata,
  };
};

const walletApi = {
  async buildRechargeCreatePayload({
    amount,
    currency = 'usd',
    channel = 'official_web',
    returnUrl = null,
    metadata = {},
  } = {}) {
    return buildBaseWalletPayload({
      action: 'recharge_create',
      amount,
      currency,
      riskScene: 'wallet',
      riskAction: 'recharge_create',
      metadata: {
        channel,
        returnUrl,
        ...metadata,
      },
    });
  },

  async buildWithdrawCreatePayload({
    amount,
    currency = 'usd',
    destinationType = 'default',
    destinationAccount = null,
    metadata = {},
  } = {}) {
    return buildBaseWalletPayload({
      action: 'withdraw_create',
      amount,
      currency,
      riskScene: 'wallet',
      riskAction: 'withdraw_create',
      metadata: {
        destinationType,
        destinationAccount,
        ...metadata,
      },
    });
  },

  async createRecharge(params = {}) {
    const payload = await this.buildRechargeCreatePayload(params);

    if (!API_ENDPOINTS.WALLET.RECHARGE_CREATE) {
      return {
        code: 200,
        msg: WALLET_API_PLACEHOLDER_MESSAGE,
        data: {
          disabled: true,
          payload,
        },
      };
    }

    return apiClient.post(API_ENDPOINTS.WALLET.RECHARGE_CREATE, payload);
  },

  async confirmRecharge(params = {}) {
    const payload = await buildBaseWalletPayload({
      action: 'recharge_confirm',
      amount: params.amount,
      currency: params.currency,
      riskScene: 'wallet',
      riskAction: 'recharge_confirm',
      metadata: params.metadata || {},
    });

    if (!API_ENDPOINTS.WALLET.RECHARGE_CONFIRM) {
      return {
        code: 200,
        msg: WALLET_API_PLACEHOLDER_MESSAGE,
        data: {
          disabled: true,
          payload,
        },
      };
    }

    return apiClient.post(API_ENDPOINTS.WALLET.RECHARGE_CONFIRM, payload);
  },

  async createWithdraw(params = {}) {
    const payload = await this.buildWithdrawCreatePayload(params);

    if (!API_ENDPOINTS.WALLET.WITHDRAW_CREATE) {
      return {
        code: 200,
        msg: WALLET_API_PLACEHOLDER_MESSAGE,
        data: {
          disabled: true,
          payload,
        },
      };
    }

    return apiClient.post(API_ENDPOINTS.WALLET.WITHDRAW_CREATE, payload);
  },

  async getWithdrawList(params = {}) {
    if (!API_ENDPOINTS.WALLET.WITHDRAW_LIST) {
      return {
        code: 200,
        msg: WALLET_API_PLACEHOLDER_MESSAGE,
        data: [],
      };
    }

    return apiClient.get(API_ENDPOINTS.WALLET.WITHDRAW_LIST, {
      params,
    });
  },
};

export default walletApi;
