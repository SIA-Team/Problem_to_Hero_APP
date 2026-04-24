import React from 'react';
import renderer from 'react-test-renderer';
import { ScrollView, TouchableOpacity } from 'react-native';
import WriteCommentModal from '../WriteCommentModal';
import useKeyboardVisibility from '../../hooks/useKeyboardVisibility';
import useMentionComposer from '../../hooks/useMentionComposer';

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
jest.mock('../../utils/toast', () => ({
  showToast: jest.fn(),
}));
jest.mock('../../utils/localInviteUsers', () => ({
  mergeLocalInviteUsers: jest.fn(users => users),
  normalizeFollowingInviteUsers: jest.fn(() => []),
  normalizePublicUserSearchResponse: jest.fn(() => []),
}));

describe('WriteCommentModal', () => {
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

  it('enables keyboard insets on the comment scroll area so identity options stay reachable', () => {
    let tree;

    renderer.act(() => {
      tree = renderer.create(
        <WriteCommentModal
          visible={false}
          onClose={jest.fn()}
          onPublish={jest.fn()}
        />
      );
    });

    const contentScrollView = tree.root.findByType(ScrollView);

    expect(contentScrollView.props.automaticallyAdjustKeyboardInsets).toBe(true);
    expect(contentScrollView.props.contentInsetAdjustmentBehavior).toBe('automatic');
    expect(contentScrollView.props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('does not mount the image picker overlay until the toolbar button is used', () => {
    let tree;

    renderer.act(() => {
      tree = renderer.create(
        <WriteCommentModal
          visible={false}
          onClose={jest.fn()}
          onPublish={jest.fn()}
        />
      );
    });

    expect(tree.root.findAllByType('ImagePickerSheet')).toHaveLength(0);
  });

  it('keeps mention-panel spacing even after the keyboard visibility flag drops', () => {
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
        <WriteCommentModal
          visible={false}
          onClose={jest.fn()}
          onPublish={jest.fn()}
        />
      );
    });

    const contentScrollView = tree.root.findByType(ScrollView);
    const styles = contentScrollView.props.contentContainerStyle;

    expect(styles).toEqual([
      expect.objectContaining({ padding: 16 }),
      expect.objectContaining({ paddingBottom: 128 }),
    ]);
  });

  it('renders publish failures inside the composer overlay instead of closing the modal', async () => {
    let tree;
    let textInput;
    let publishButton;

    renderer.act(() => {
      tree = renderer.create(
        <WriteCommentModal
          visible
          onClose={jest.fn()}
          onPublish={jest.fn(async () => ({
            ok: false,
            title: '评论发布失败',
            message: '评论发布失败，请稍后重试',
          }))}
        />
      );
    });

    textInput = tree.root.findByType('TextInput');

    renderer.act(() => {
      textInput.props.onChangeText('测试回复');
    });

    publishButton = tree.root.findAllByType(TouchableOpacity)[0];

    await renderer.act(async () => {
      await publishButton.props.onPress();
    });

    expect(tree.root.findAllByProps({ children: '评论发布失败' }).length).toBeGreaterThan(0);
    expect(
      tree.root.findAllByProps({ children: '评论发布失败，请稍后重试' }).length
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
        <WriteCommentModal
          visible
          onClose={jest.fn()}
          onPublish={jest.fn()}
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
