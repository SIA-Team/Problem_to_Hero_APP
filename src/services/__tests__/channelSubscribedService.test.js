jest.mock('../api/channelApi', () => ({
  __esModule: true,
  default: {
    getMySubscribedChannels: jest.fn(),
    subscribeChannel: jest.fn(),
    removeMySubscribedChannel: jest.fn(),
  },
}));

import channelApi from '../api/channelApi';
import {
  buildSubscribeChannelPayload,
  buildRemoveMySubscribedChannelPayload,
  normalizeMySubscribedChannelItemsResponse,
  normalizeMySubscribedChannelsResponse,
  subscribeChannel,
  removeMySubscribedChannel,
} from '../channelSubscribedService';

describe('channelSubscribedService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes subscribed channel items with target metadata', () => {
    const normalized = normalizeMySubscribedChannelItemsResponse({
      code: 200,
      data: {
        rows: [
          { channelName: 'Policy', targetType: 'CATEGORY', targetKey: '1001' },
          { name: 'Internet', subscribeTargetType: 'CATEGORY', subscribeTargetKey: '1002' },
          { displayName: 'Beijing Internet', targetType: 'COMBINED', id: '3001' },
        ],
      },
    });

    expect(normalized).toEqual([
      expect.objectContaining({ name: 'Policy', targetType: 'CATEGORY', targetKey: '1001' }),
      expect.objectContaining({ name: 'Internet', targetType: 'CATEGORY', targetKey: '1002' }),
      expect.objectContaining({ name: 'Beijing Internet', targetType: 'COMBINED', targetKey: '3001' }),
    ]);
  });

  it('keeps backward-compatible name arrays', () => {
    const normalized = normalizeMySubscribedChannelsResponse({
      code: 200,
      data: {
        myChannels: [
          { title: 'Manufacturing', targetType: 'CATEGORY', targetKey: '10' },
          { title: 'Manufacturing', targetType: 'CATEGORY', targetKey: '10' },
          '',
          { comboChannelName: 'Shanghai Manufacturing', targetType: 'COMBINED', targetKey: '99' },
        ],
      },
    });

    expect(normalized).toEqual(['Manufacturing', 'Shanghai Manufacturing']);
  });

  it('builds remove payloads with normalized text', () => {
    expect(
      buildRemoveMySubscribedChannelPayload({
        targetType: ' CATEGORY ',
        targetKey: ' 1001 ',
      })
    ).toEqual({
      targetType: 'CATEGORY',
      targetKey: '1001',
    });
  });

  it('builds subscribe payloads with normalized text', () => {
    expect(
      buildSubscribeChannelPayload({
        targetType: ' CATEGORY ',
        targetKey: ' 2002 ',
      })
    ).toEqual({
      targetType: 'CATEGORY',
      targetKey: '2002',
    });
  });

  it('submits subscribe requests with real payload', async () => {
    channelApi.subscribeChannel.mockResolvedValue({
      code: 200,
      data: {
        success: true,
      },
    });

    await expect(
      subscribeChannel({
        targetType: 'CATEGORY',
        targetKey: '1002',
      })
    ).resolves.toEqual({ success: true });

    expect(channelApi.subscribeChannel).toHaveBeenCalledWith({
      targetType: 'CATEGORY',
      targetKey: '1002',
    });
  });

  it('submits remove requests with real payload', async () => {
    channelApi.removeMySubscribedChannel.mockResolvedValue({
      code: 200,
      data: {
        success: true,
      },
    });

    await expect(
      removeMySubscribedChannel({
        targetType: 'COMBINED',
        targetKey: 'abc-123',
      })
    ).resolves.toEqual({ success: true });

    expect(channelApi.removeMySubscribedChannel).toHaveBeenCalledWith({
      targetType: 'COMBINED',
      targetKey: 'abc-123',
    });
  });
});
