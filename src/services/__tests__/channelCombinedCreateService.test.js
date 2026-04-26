jest.mock('../api/channelApi', () => ({
  __esModule: true,
  default: {
    createCombinedChannel: jest.fn(),
  },
}));

import channelApi from '../api/channelApi';
import {
  buildCombinedChannelCreatePayload,
  createCombinedChannel,
  normalizeCreatedCombinedChannel,
} from '../channelCombinedCreateService';

describe('channelCombinedCreateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds the payload with normalized numeric ids', () => {
    expect(
      buildCombinedChannelCreatePayload({
        name: '  Beijing Internet  ',
        regionId: '101',
        locationText: ' Beijing ',
        parentCategoryId: '10',
        subCategoryId: '1001',
      })
    ).toEqual({
      name: 'Beijing Internet',
      regionId: 101,
      locationText: 'Beijing',
      parentCategoryId: 10,
      subCategoryId: 1001,
    });
  });

  it('normalizes the created channel payload', () => {
    expect(
      normalizeCreatedCombinedChannel({
        data: {
          combinedChannelId: '501',
          combinedChannelName: 'Shanghai Manufacturing',
        },
      })
    ).toEqual({
      id: '501',
      name: 'Shanghai Manufacturing',
      raw: {
        combinedChannelId: '501',
        combinedChannelName: 'Shanghai Manufacturing',
      },
    });
  });

  it('submits create requests and returns the normalized result', async () => {
    channelApi.createCombinedChannel.mockResolvedValue({
      code: 200,
      data: {
        id: '9001',
        name: 'Berlin Finance',
      },
    });

    await expect(
      createCombinedChannel({
        name: 'Berlin Finance',
        regionId: 0,
        locationText: 'Berlin',
        parentCategoryId: 3,
        subCategoryId: 30,
      })
    ).resolves.toEqual({
      payload: {
        name: 'Berlin Finance',
        regionId: 0,
        locationText: 'Berlin',
        parentCategoryId: 3,
        subCategoryId: 30,
      },
      createdChannel: {
        id: '9001',
        name: 'Berlin Finance',
        raw: {
          id: '9001',
          name: 'Berlin Finance',
        },
      },
      raw: {
        id: '9001',
        name: 'Berlin Finance',
      },
    });

    expect(channelApi.createCombinedChannel).toHaveBeenCalledWith({
      name: 'Berlin Finance',
      regionId: 0,
      locationText: 'Berlin',
      parentCategoryId: 3,
      subCategoryId: 30,
    });
  });
});
