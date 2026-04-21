import React from 'react';
import renderer from 'react-test-renderer';
import useMentionComposer from '../useMentionComposer';

jest.mock('../../services/api/userApi', () => ({
  searchPublicProfiles: jest.fn(),
}));

jest.mock('../../utils/localInviteUsers', () => ({
  mergeLocalInviteUsers: jest.fn(users => users),
  normalizePublicUserSearchResponse: jest.fn(() => []),
}));

describe('useMentionComposer', () => {
  function renderHarness(props) {
    let latestResult = null;

    function Harness(componentProps) {
      latestResult = useMentionComposer({
        visible: true,
        text: '',
        onChangeText: jest.fn(),
        inputRef: { current: null },
        windowHeight: 800,
        recommendedUsers: [],
        ...componentProps,
      });

      return null;
    }

    renderer.act(() => {
      renderer.create(<Harness {...props} />);
    });

    return latestResult;
  }

  it('inserts an @ marker when there is no active mention', () => {
    const onChangeText = jest.fn();
    const composer = renderHarness({
      text: '',
      onChangeText,
    });

    renderer.act(() => {
      composer.handleMentionPress({ focusInput: false });
    });

    expect(onChangeText).toHaveBeenCalledWith('@');
  });

  it('does not insert a duplicate @ when the cursor is already inside an active mention', () => {
    const onChangeText = jest.fn();
    const composer = renderHarness({
      text: '@',
      onChangeText,
      recommendedUsers: [{ id: 1, userId: 1, username: 'alice' }],
    });

    renderer.act(() => {
      composer.handleMentionPress({ focusInput: false });
    });

    expect(onChangeText).not.toHaveBeenCalled();
    expect(composer.activeMention).toEqual({
      start: 0,
      end: 1,
      keyword: '',
    });
  });

  it('keeps the mention panel available when only a bare @ token exists', () => {
    const composer = renderHarness({
      text: '@',
      onChangeText: jest.fn(),
      recommendedUsers: [],
    });

    expect(composer.activeMention).toEqual({
      start: 0,
      end: 1,
      keyword: '',
    });
    expect(composer.shouldShowMentionPanel).toBe(true);
  });
});
