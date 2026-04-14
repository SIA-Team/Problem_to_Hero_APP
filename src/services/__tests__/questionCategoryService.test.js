jest.mock('../api/categoryApi', () => ({
  __esModule: true,
  default: {
    getCategoryList: jest.fn(),
  },
}));

import categoryApi from '../api/categoryApi';
import {
  getLevel1Categories,
  getLevel2Categories,
  resetQuestionCategoryCache,
} from '../questionCategoryService';

describe('questionCategoryService', () => {
  beforeEach(() => {
    resetQuestionCategoryCache();
    jest.clearAllMocks();
  });

  it('caches level1 categories after the first request', async () => {
    categoryApi.getCategoryList.mockResolvedValue({
      code: 200,
      data: {
        rows: [{ id: 1, name: '国家', icon: 'home' }],
        total: 1,
        pageSize: 100,
      },
    });

    const first = await getLevel1Categories();
    const second = await getLevel1Categories();

    expect(first).toEqual(second);
    expect(categoryApi.getCategoryList).toHaveBeenCalledTimes(1);
  });

  it('reuses the in-flight promise for the same level2 parent request', async () => {
    let resolveRequest;
    categoryApi.getCategoryList.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );

    const pendingA = getLevel2Categories(1, { parentName: '国家' });
    const pendingB = getLevel2Categories(1, { parentName: '国家' });

    expect(categoryApi.getCategoryList).toHaveBeenCalledTimes(1);

    resolveRequest({
      code: 200,
      data: {
        rows: [{ id: 11, name: '政策法规', icon: 'book' }],
        total: 1,
        pageSize: 100,
      },
    });

    await expect(pendingA).resolves.toEqual([
      expect.objectContaining({
        id: 11,
        name: '政策法规',
        parentId: 1,
        parentName: '国家',
      }),
    ]);
    await expect(pendingB).resolves.toEqual([
      expect.objectContaining({
        id: 11,
        name: '政策法规',
        parentId: 1,
        parentName: '国家',
      }),
    ]);
  });
});
