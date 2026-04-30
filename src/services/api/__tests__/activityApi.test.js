jest.mock('../apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
}));

jest.mock('../../../config/api', () => ({
  API_ENDPOINTS: {
    ACTIVITY: {
      CENTER_LIST: '/qa-hero-activity/app/activity/center/list',
      MY_ACTIVITIES: '/qa-hero-activity/app/activity/my-activities',
      DETAIL: '/qa-hero-activity/app/activity/detail/:id',
      JOIN: '/qa-hero-activity/app/activity/:id/join',
      CANCEL: '/qa-hero-activity/app/activity/:id/cancel',
    },
  },
  replaceUrlParams: jest.fn((template, params) =>
    template.replace(':id', String(params.id))
  ),
}));

import apiClient from '../apiClient';
import activityApi from '../activityApi';

describe('activityApi.cancelActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the cancel endpoint with the normalized id in both path and body', async () => {
    const response = { code: 200, msg: '', data: {} };
    apiClient.delete.mockResolvedValueOnce(response);

    await expect(activityApi.cancelActivity('12')).resolves.toBe(response);

    expect(apiClient.delete).toHaveBeenCalledWith(
      '/qa-hero-activity/app/activity/12/cancel',
      {
        data: {
          id: 12,
        },
      }
    );
  });

  it('rejects invalid activity ids before sending the request', () => {
    expect(() => activityApi.cancelActivity('')).toThrow();
    expect(apiClient.delete).not.toHaveBeenCalled();
  });
});

describe('activityApi.getMyActivities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the optional type query parameter to the my activities endpoint', async () => {
    const response = { code: 200, msg: '', data: [] };
    apiClient.get.mockResolvedValueOnce(response);

    await expect(activityApi.getMyActivities({ type: '2' })).resolves.toBe(response);

    expect(apiClient.get).toHaveBeenCalledWith(
      '/qa-hero-activity/app/activity/my-activities',
      {
        params: {
          type: 2,
        },
      }
    );
  });
});
