import React from 'react';
import renderer from 'react-test-renderer';
import { ScrollView } from 'react-native';
import SupplementAnswerModal from '../SupplementAnswerModal';
import useKeyboardVisibility from '../../hooks/useKeyboardVisibility';
import useMentionComposer from '../../hooks/useMentionComposer';
import { resolveComposerScrollPadding } from '../../utils/composerLayout';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));
jest.mock('../Avatar', () => 'Avatar');
jest.mock('../IdentitySelector', () => 'IdentitySelector');
jest.mock('../ImagePickerSheet', () => 'ImagePickerSheet');
jest.mock('../MentionSuggestionsPanel', () => 'MentionSuggestionsPanel');
jest.mock('../ComposerModalScaffold', () => {
  const React = require('react');
  const { View } = require('react-native');

  return function MockComposerModalScaffold({ children, overlayContent }) {
    return (
      <View>
        {children}
        {overlayContent}
      </View>
    );
  };
});
jest.mock('../../hooks/useBottomSafeInset', () => jest.fn(() => 12));
jest.mock('../../hooks/useKeyboardVisibility', () => jest.fn(() => false));
jest.mock('../../hooks/useMentionComposer', () =>
  jest.fn(() => ({
    activeMention: null,
    candidateUsers: [],
    focusInput: jest.fn(),
    handleMentionPress: jest.fn(),
    handleMentionSelect: jest.fn(),
    handleSelectionChange: jest.fn(),
    listMaxHeight: 240,
    mentionBottomInset: 0,
    mentionLoading: false,
    panelAnimatedStyle: null,
    panelBottomOffset: 0,
    panelMaxHeight: 240,
    renderMentionPanel: false,
    selection: undefined,
    shouldShowMentionPanel: false,
  }))
);
jest.mock('../../services/api/userApi', () => ({
  getFollowing: jest.fn(),
  searchPublicProfiles: jest.fn(),
}));
jest.mock('../../services/api/answerApi', () => ({
  publishSupplementAnswer: jest.fn(),
}));
jest.mock('../../services/api/uploadApi', () => ({
  uploadImage: jest.fn(),
}));
jest.mock('../../utils/toast', () => ({
  toast: {
    warning: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));
jest.mock('../../utils/appAlert', () => ({
  showPublishFailureAlert: jest.fn(),
}));
jest.mock('../../utils/localInviteUsers', () => ({
  mergeLocalInviteUsers: jest.fn(users => users),
  normalizeFollowingInviteUsers: jest.fn(() => []),
  normalizePublicUserSearchResponse: jest.fn(() => []),
}));

describe('SupplementAnswerModal', () => {
  const answer = {
    id: 1,
    author: 'Test User',
    content: 'Original answer content',
  };

  beforeEach(() => {
    useKeyboardVisibility.mockReturnValue(false);
    useMentionComposer.mockReturnValue({
      activeMention: null,
      candidateUsers: [],
      focusInput: jest.fn(),
      handleMentionPress: jest.fn(),
      handleMentionSelect: jest.fn(),
      handleSelectionChange: jest.fn(),
      listMaxHeight: 240,
      mentionBottomInset: 0,
      mentionLoading: false,
      panelAnimatedStyle: null,
      panelBottomOffset: 0,
      panelMaxHeight: 240,
      renderMentionPanel: false,
      selection: undefined,
      shouldShowMentionPanel: false,
    });
  });

  it('keeps keyboard-aware scroll padding so team identity stays reachable', () => {
    useKeyboardVisibility.mockReturnValue(true);

    let tree;

    renderer.act(() => {
      tree = renderer.create(
        <SupplementAnswerModal
          visible={false}
          onClose={jest.fn()}
          answer={answer}
          onSuccess={jest.fn()}
        />
      );
    });

    const contentScrollView = tree.root.findByType(ScrollView);

    expect(contentScrollView.props.automaticallyAdjustKeyboardInsets).toBe(true);
    expect(contentScrollView.props.contentInsetAdjustmentBehavior).toBe('automatic');
    expect(contentScrollView.props.keyboardShouldPersistTaps).toBe('handled');
    expect(contentScrollView.props.contentContainerStyle).toEqual([
      expect.objectContaining({ paddingBottom: 24 }),
      expect.objectContaining({
        paddingBottom: resolveComposerScrollPadding({
          basePaddingBottom: 24,
          keyboardVisible: true,
        }),
      }),
    ]);
  });

  it('preserves mention-panel spacing after the keyboard closes', () => {
    useKeyboardVisibility.mockReturnValue(false);
    useMentionComposer.mockReturnValue({
      activeMention: { start: 0, end: 1, keyword: '' },
      candidateUsers: [],
      focusInput: jest.fn(),
      handleMentionPress: jest.fn(),
      handleMentionSelect: jest.fn(),
      handleSelectionChange: jest.fn(),
      listMaxHeight: 240,
      mentionBottomInset: 0,
      mentionLoading: false,
      panelAnimatedStyle: null,
      panelBottomOffset: 0,
      panelMaxHeight: 240,
      renderMentionPanel: false,
      selection: { start: 1, end: 1 },
      shouldShowMentionPanel: true,
    });

    let tree;

    renderer.act(() => {
      tree = renderer.create(
        <SupplementAnswerModal
          visible={false}
          onClose={jest.fn()}
          answer={answer}
          onSuccess={jest.fn()}
        />
      );
    });

    const contentScrollView = tree.root.findByType(ScrollView);

    expect(contentScrollView.props.contentContainerStyle).toEqual([
      expect.objectContaining({ paddingBottom: 24 }),
      expect.objectContaining({
        paddingBottom: resolveComposerScrollPadding({
          basePaddingBottom: 24,
          keyboardVisible: true,
        }),
      }),
    ]);
  });
});
