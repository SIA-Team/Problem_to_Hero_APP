jest.mock('@react-native-async-storage/async-storage', () => ({
  getAllKeys: jest.fn(),
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyQuestionInteractionSnapshot,
  getQuestionInteractionSnapshot,
  publishQuestionInteractionSync,
} from '../questionInteractionSync';

const flushAsyncWork = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
};

describe('questionInteractionSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getAllKeys.mockResolvedValue([]);
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
    AsyncStorage.removeItem.mockResolvedValue(undefined);
    AsyncStorage.multiRemove.mockResolvedValue(undefined);
  });

  it('persists updated question interactions back into cached question lists', async () => {
    const cacheKey = 'cache_questions_page=1&tabType=recommend';
    const cachedQuestions = [
      { id: 'question-1', liked: false, likeCount: 2, likes: 2, disliked: false, collectCount: 0 },
      { id: 'question-2', liked: false, likeCount: 1, likes: 1, disliked: false, collectCount: 0 },
    ];

    AsyncStorage.getAllKeys.mockResolvedValue([cacheKey]);
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({
        data: cachedQuestions,
        timestamp: Date.now(),
      })
    );

    const snapshot = publishQuestionInteractionSync({
      id: 'question-1',
      liked: true,
      disliked: false,
      collected: false,
      likeCount: 3,
      dislikeCount: 0,
      collectCount: 0,
    });

    await flushAsyncWork();

    expect(snapshot).toMatchObject({
      id: 'question-1',
      liked: true,
      likeCount: 3,
    });
    expect(getQuestionInteractionSnapshot('question-1')).toMatchObject({
      liked: true,
      likeCount: 3,
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      cacheKey,
      expect.stringContaining('"liked":true')
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      cacheKey,
      expect.stringContaining('"likeCount":3')
    );
  });

  it('marks synced counts as resolved to avoid double-counting in detail displays', () => {
    const nextQuestion = applyQuestionInteractionSnapshot(
      {
        id: 'question-1',
        disliked: false,
        dislikeCount: 0,
        __dislikeCountResolved: false,
      },
      {
        id: 'question-1',
        liked: false,
        disliked: true,
        collected: false,
        likeCount: 0,
        dislikeCount: 1,
        collectCount: 0,
      }
    );

    expect(nextQuestion).toMatchObject({
      disliked: true,
      dislikeCount: 1,
      dislikes: 1,
      __dislikeCountResolved: true,
      __likeCountResolved: true,
      __collectCountResolved: true,
    });
  });
});
