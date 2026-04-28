jest.mock('../api/regionApi', () => ({
  __esModule: true,
  default: {
    getRegionChildren: jest.fn(),
  },
}));

import regionApi from '../api/regionApi';
import { getRegionChildren, getRegionPathById, resetRegionCache } from '../regionService';

describe('regionService', () => {
  beforeEach(() => {
    resetRegionCache();
    jest.clearAllMocks();
  });

  it('caches children by parentId after the first request', async () => {
    regionApi.getRegionChildren.mockResolvedValue({
      code: 200,
      data: [
        {
          regionId: '1',
          parentId: '0',
          regionName: '中国',
          regionCode: 'CN',
          regionLevel: 1,
          children: [],
        },
      ],
    });

    const first = await getRegionChildren('0');
    const second = await getRegionChildren('0');

    expect(first).toEqual(second);
    expect(regionApi.getRegionChildren).toHaveBeenCalledTimes(1);
  });

  it('reuses the in-flight promise for the same parent request', async () => {
    let resolveRequest;
    regionApi.getRegionChildren.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );

    const pendingA = getRegionChildren('100');
    const pendingB = getRegionChildren('100');

    expect(regionApi.getRegionChildren).toHaveBeenCalledTimes(1);

    resolveRequest({
      code: 200,
      data: [
        {
          regionId: '101',
          parentId: '100',
          regionName: '北京',
          regionCode: 'BJ',
          regionLevel: 2,
          children: [],
        },
      ],
    });

    await expect(pendingA).resolves.toEqual([
      expect.objectContaining({
        id: '101',
        parentId: '100',
        name: '北京',
      }),
    ]);
    await expect(pendingB).resolves.toEqual([
      expect.objectContaining({
        id: '101',
        parentId: '100',
        name: '北京',
      }),
    ]);
  });

  it('maps backend SQL errors to a friendly message', async () => {
    regionApi.getRegionChildren.mockResolvedValue({
      code: 500,
      msg: "SQLSyntaxErrorException: Table 'ry-cloud.sys_region' doesn't exist",
      data: null,
    });

    await expect(getRegionChildren('0')).rejects.toThrow(
      '区域数据服务暂不可用，请联系后端检查区域表配置'
    );
  });

  it('resolves the full path for a target region id', async () => {
    regionApi.getRegionChildren.mockImplementation(async (parentId) => {
      if (parentId === '0') {
        return {
          code: 200,
          data: [
            { regionId: '1', parentId: '0', regionName: 'United States', children: [] },
          ],
        };
      }

      if (parentId === '1') {
        return {
          code: 200,
          data: [
            { regionId: '2', parentId: '1', regionName: 'Maine', children: [] },
          ],
        };
      }

      if (parentId === '2') {
        return {
          code: 200,
          data: [
            { regionId: '3', parentId: '2', regionName: 'Oxford County', children: [] },
          ],
        };
      }

      if (parentId === '3') {
        return {
          code: 200,
          data: [
            { regionId: '4', parentId: '3', regionName: 'East Dixfield', children: [] },
          ],
        };
      }

      return {
        code: 200,
        data: [],
      };
    });

    await expect(getRegionPathById('4')).resolves.toEqual([
      expect.objectContaining({ id: '1', name: 'United States' }),
      expect.objectContaining({ id: '2', name: 'Maine' }),
      expect.objectContaining({ id: '3', name: 'Oxford County' }),
      expect.objectContaining({ id: '4', name: 'East Dixfield' }),
    ]);
  });
});
