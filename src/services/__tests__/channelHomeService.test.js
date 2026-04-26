jest.mock('../api/channelApi', () => ({
  __esModule: true,
  default: {
    getHomeChannels: jest.fn(),
  },
}));

import { normalizeHomeChannelsResponse } from '../channelHomeService';

describe('channelHomeService', () => {
  it('normalizes home channels from row objects', () => {
    const normalized = normalizeHomeChannelsResponse({
      code: 200,
      data: {
        rows: [
          { channelName: '北京互联网' },
          { tabName: '上海制造业' },
          { name: '深圳金融' },
        ],
      },
    });

    expect(normalized).toEqual(['北京互联网', '上海制造业', '深圳金融']);
  });

  it('deduplicates repeated and empty tab names', () => {
    const normalized = normalizeHomeChannelsResponse({
      code: 200,
      data: {
        tabs: [
          { title: '杭州教育' },
          { title: '杭州教育' },
          '',
          { label: '广州医疗' },
        ],
      },
    });

    expect(normalized).toEqual(['杭州教育', '广州医疗']);
  });
});
