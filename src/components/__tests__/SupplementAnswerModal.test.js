import React from 'react';
import renderer from 'react-test-renderer';
import { ScrollView, TouchableOpacity } from 'react-native';
import SupplementAnswerModal from '../SupplementAnswerModal';
import useKeyboardVisibility from '../../hooks/useKeyboardVisibility';
import useMentionComposer from '../../hooks/useMentionComposer';
import { resolveComposerScrollPadding } from '../../utils/composerLayout';
import answerApi from '../../services/api/answerApi';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));
jest.mock('../Avatar', () => 'Avatar');
jest.mock('../IdentitySelector', () => 'IdentitySelector');
jest.mock('../ImagePickerSheet', () => 'ImagePickerSheet');
jest.mock('../MentionSuggestionsPanel', () => 'MentionSuggestionsPanel');
jest.mock('../ComposerModalScaffold', () => {
  const React = require('react');
  const { View, TouchableOpacity, Text } = require('react-native');

  return function MockComposerModalScaffold({
    children,
    overlayContent,
    floatingOverlay,
    onSubmit,
  }) {
    return (
      <View>
        <TouchableOpacity onPress={onSubmit}>
          <Text>发布</Text>
        </TouchableOpacity>
        {children}
        {overlayContent}
        {floatingOverlay}
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

  it('renders publish failures inside the supplement composer instead of behind the modal', async () => {
    const onClose = jest.fn();
    let tree;
    let textInput;
    let publishButton;

    answerApi.publishSupplementAnswer.mockRejectedValueOnce(new Error('\u8865\u5145\u56de\u7b54\u53d1\u5e03\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5'));

    renderer.act(() => {
      tree = renderer.create(
        <SupplementAnswerModal
          visible
          onClose={onClose}
          answer={answer}
          onSuccess={jest.fn()}
        />
      );
    });

    textInput = tree.root.findByType('TextInput');

    renderer.act(() => {
      textInput.props.onChangeText('\u6d4b\u8bd5\u8865\u5145\u5185\u5bb9');
    });

    publishButton = tree.root.findAllByType(TouchableOpacity)[0];

    await renderer.act(async () => {
      await publishButton.props.onPress();
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(
      tree.root.findAllByProps({ children: '\u6682\u65f6\u65e0\u6cd5\u8865\u5145\u56de\u7b54' }).length
    ).toBeGreaterThan(0);
    expect(
      tree.root.findAllByProps({ children: '\u8865\u5145\u56de\u7b54\u53d1\u5e03\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5' }).length
    ).toBeGreaterThan(0);
  });

  it('uses the team-detail mention suggestion style', () => {
    useMentionComposer.mockReturnValue({
      activeMention: { start: 0, end: 1, keyword: '' },
      candidateUsers: [{ id: 1, username: 'tester' }],
      focusInput: jest.fn(),
      handleMentionPress: jest.fn(),
      handleMentionSelect: jest.fn(),
      handleSelectionChange: jest.fn(),
      listMaxHeight: 240,
      mentionBottomInset: 12,
      mentionLoading: false,
      panelAnimatedStyle: null,
      panelBottomOffset: 0,
      panelMaxHeight: 240,
      renderMentionPanel: true,
      selection: { start: 1, end: 1 },
      shouldShowMentionPanel: true,
    });

    let tree;

    renderer.act(() => {
      tree = renderer.create(
        <SupplementAnswerModal
          visible
          onClose={jest.fn()}
          answer={answer}
          onSuccess={jest.fn()}
        />
      );
    });

    const mentionPanel = tree.root.findByType('MentionSuggestionsPanel');

    expect(mentionPanel.props.variant).toBe('keyboard-inline');
    expect(mentionPanel.props.showHeader).toBe(false);
    expect(mentionPanel.props.keyboardInlineContentPadding).toBe(5);
    expect(mentionPanel.props.keyboardInlineTransparentItem).toBe(true);
  });
});
