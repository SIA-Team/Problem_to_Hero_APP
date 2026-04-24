import React from 'react';
import renderer from 'react-test-renderer';
import { ScrollView, TouchableOpacity } from 'react-native';
import WriteAnswerModal from '../WriteAnswerModal';
import useKeyboardVisibility from '../../hooks/useKeyboardVisibility';
import useMentionComposer from '../../hooks/useMentionComposer';
import { resolveComposerScrollPadding } from '../../utils/composerLayout';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));
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
jest.mock('../../utils/toast', () => ({
  showToast: jest.fn(),
}));
jest.mock('../../utils/localInviteUsers', () => ({
  mergeLocalInviteUsers: jest.fn(users => users),
  normalizeFollowingInviteUsers: jest.fn(() => []),
  normalizePublicUserSearchResponse: jest.fn(() => []),
}));

describe('WriteAnswerModal', () => {
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
        <WriteAnswerModal
          visible={false}
          onClose={jest.fn()}
          onSubmit={jest.fn()}
          onChangeText={jest.fn()}
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

  it('does not mount the image picker overlay until the toolbar button is used', () => {
    let tree;

    renderer.act(() => {
      tree = renderer.create(
        <WriteAnswerModal
          visible={false}
          onClose={jest.fn()}
          onSubmit={jest.fn()}
          onChangeText={jest.fn()}
        />
      );
    });

    expect(tree.root.findAllByType('ImagePickerSheet')).toHaveLength(0);
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
        <WriteAnswerModal
          visible={false}
          onClose={jest.fn()}
          onSubmit={jest.fn()}
          onChangeText={jest.fn()}
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

  it('renders publish failures inside the answer composer instead of behind the modal', async () => {
    let tree;
    let publishButton;

    renderer.act(() => {
      tree = renderer.create(
        <WriteAnswerModal
          visible
          onClose={jest.fn()}
          onSubmit={jest.fn(async () => ({
            ok: false,
            title: '回答发布失败',
            message: '回答发布失败，请稍后重试',
          }))}
          onChangeText={jest.fn()}
          text="测试回答"
        />
      );
    });

    publishButton = tree.root.findAllByType(TouchableOpacity)[0];

    await renderer.act(async () => {
      await publishButton.props.onPress();
    });

    expect(tree.root.findAllByProps({ children: '回答发布失败' }).length).toBeGreaterThan(0);
    expect(
      tree.root.findAllByProps({ children: '回答发布失败，请稍后重试' }).length
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
        <WriteAnswerModal
          visible
          onClose={jest.fn()}
          onSubmit={jest.fn()}
          onChangeText={jest.fn()}
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
