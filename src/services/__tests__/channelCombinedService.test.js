jest.mock('../api/channelApi', () => ({
  __esModule: true,
  default: {
    getMyCreatedCombinedChannels: jest.fn(),
  },
}));

import { normalizeMyCreatedCombinedChannelsResponse } from '../channelCombinedService';

describe('channelCombinedService', () => {
  it('normalizes combined channel names from row objects', () => {
    const normalized = normalizeMyCreatedCombinedChannelsResponse({
      code: 200,
      data: {
        rows: [
          { combinedChannelName: '北京互联网' },
          { comboChannelName: '上海制造业' },
          { name: '深圳金融' },
        ],
      },
    });

    expect(normalized).toEqual(['北京互联网', '上海制造业', '深圳金融']);
  });

  it('deduplicates empty and repeated names', () => {
    const normalized = normalizeMyCreatedCombinedChannelsResponse({
      code: 200,
      data: {
        list: [
          { channelName: '杭州教育' },
          { channelName: '杭州教育' },
          '',
          { title: '广州医疗' },
        ],
      },
    });

    expect(normalized).toEqual(['杭州教育', '广州医疗']);
  });
});
