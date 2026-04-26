jest.mock('../api/channelApi', () => ({
  __esModule: true,
  default: {
    getChannelCatalog: jest.fn(),
  },
}));

import {
  hasChannelCatalogData,
  normalizeChannelCatalogResponse,
} from '../channelCatalogService';

describe('channelCatalogService', () => {
  it('normalizes flat channel rows grouped by parent name', () => {
    const normalized = normalizeChannelCatalogResponse({
      code: 200,
      data: {
        rows: [
          { channelId: 11, channelName: '社会民生', parentName: '国家问题', categoryId: 11 },
          { channelId: 12, channelName: '互联网', parentName: '行业问题', categoryId: 12 },
          { channelId: 13, channelName: '企业管理', parentName: '企业问题' },
          { channelId: 14, channelName: '旅游', parentName: '个人问题' },
        ],
      },
    });

    expect(normalized.groupsByType.country.map(item => item.name)).toEqual(['社会民生']);
    expect(normalized.groupsByType.industry.map(item => item.name)).toEqual(['互联网']);
    expect(normalized.groupsByType.enterprise.map(item => item.name)).toEqual(['企业管理']);
    expect(normalized.groupsByType.personal.map(item => item.name)).toEqual(['旅游']);
    expect(normalized.groupsByType.country[0]).toEqual(
      expect.objectContaining({
        targetType: 'CATEGORY',
        targetKey: '11',
      })
    );
    expect(hasChannelCatalogData(normalized)).toBe(true);
  });

  it('normalizes grouped arrays and removes duplicate channels', () => {
    const normalized = normalizeChannelCatalogResponse({
      code: 200,
      data: {
        country: [
          { channelId: 21, channelName: '经济发展' },
          { channelId: 21, channelName: '经济发展' },
        ],
        industry: [{ channelId: 31, channelName: '制造业' }],
      },
    });

    expect(normalized.groupsByType.country.map(item => item.name)).toEqual(['经济发展']);
    expect(normalized.groupsByType.industry.map(item => item.name)).toEqual(['制造业']);
    expect(normalized.groupsByType.enterprise).toEqual([]);
    expect(normalized.groupsByType.personal).toEqual([]);
  });

  it('prefers explicit subscribe metadata for default channels', () => {
    const normalized = normalizeChannelCatalogResponse({
      code: 200,
      data: {
        rows: [
          {
            channelCode: 'workplace',
            channelName: '职场',
            parentName: '默认频道',
            targetType: 'DEFAULT',
            targetKey: 'workplace',
          },
        ],
      },
    });

    expect(normalized.sections[0].channels[0]).toEqual(
      expect.objectContaining({
        name: '职场',
        targetType: 'DEFAULT',
        targetKey: 'workplace',
      })
    );
  });
});
