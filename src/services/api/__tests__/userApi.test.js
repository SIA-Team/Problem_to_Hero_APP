jest.mock('../apiClient', () => ({
  get: jest.fn(),
}));

jest.mock('../../../config/api', () => ({
  API_ENDPOINTS: {
    USER: {
      PUBLIC_SEARCH: '/qa-hero-app-user/app/user/profile/public/search',
      MY_FOLLOWING: '/qa-hero-app-user/app/user/follow/my/following',
      USER_FOLLOWING: '/qa-hero-app-user/app/user/follow/following',
    },
  },
  replaceUrlParams: jest.fn(),
}));

jest.mock('../../../utils/localInviteUsers', () => ({
  mergeLocalInviteUsers: jest.fn(users => users),
  normalizeFollowingInviteUsers: jest.fn(response => response?.__users ?? []),
}));

import apiClient from '../apiClient';
import userApi from '../userApi';

describe('userApi.searchPublicProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the primary search response when the business code succeeds', async () => {
    const response = {
      code: 200,
      data: [{ userId: '1', username: 'alice' }],
    };

    apiClient.get.mockResolvedValueOnce(response);

    await expect(userApi.searchPublicProfiles('alice', 10)).resolves.toBe(response);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it('falls back to following list search when the backend routes "search" into :userId', async () => {
    apiClient.get
      .mockResolvedValueOnce({
        code: 500,
        msg: '请求参数类型不匹配，参数[userId]要求类型为：java.lang.Long，但输入值为：search',
      })
      .mockResolvedValueOnce({
        code: 200,
        __users: [
          { userId: '1', username: 'alice', nickName: 'Alice' },
          { userId: '2', username: 'bob', nickName: 'Bob' },
        ],
      });

    const response = await userApi.searchPublicProfiles('ali', 10);

    expect(apiClient.get).toHaveBeenCalledTimes(2);
    expect(apiClient.get).toHaveBeenNthCalledWith(
      2,
      '/qa-hero-app-user/app/user/follow/my/following',
      {
        params: {
          pageNum: 1,
          pageSize: 100,
          size: 100,
          limit: 100,
        },
      }
    );
    expect(response).toEqual({
      code: 200,
      msg: 'ok',
      data: [{ userId: '1', username: 'alice', nickName: 'Alice' }],
    });
  });

  it('throws the business message when the response fails for another reason', async () => {
    apiClient.get.mockResolvedValueOnce({
      code: 500,
      msg: 'database unavailable',
    });

    await expect(userApi.searchPublicProfiles('alice', 10)).rejects.toThrow('database unavailable');
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it('routes getFollowing to the my-following endpoint when userId is absent', async () => {
    apiClient.get.mockResolvedValueOnce({ code: 200, data: [] });

    await userApi.getFollowing({
      pageNum: 1,
      page: 1,
      pageSize: 20,
      size: 20,
      limit: 20,
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/qa-hero-app-user/app/user/follow/my/following',
      {
        params: {
          pageNum: 1,
          page: 1,
          pageSize: 20,
          size: 20,
          limit: 20,
        },
      }
    );
  });

  it('routes getFollowing to the user-following endpoint when userId is present', async () => {
    apiClient.get.mockResolvedValueOnce({ code: 200, data: [] });

    await userApi.getFollowing({
      userId: 1234567890123456,
      pageNum: 1,
      pageSize: 20,
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/qa-hero-app-user/app/user/follow/following',
      {
        params: {
          userId: '1234567890123456',
          pageNum: 1,
          pageSize: 20,
        },
      }
    );
  });
});
