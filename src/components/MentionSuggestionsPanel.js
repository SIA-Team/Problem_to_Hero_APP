import React from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { modalTokens } from './modalTokens';
import {
  buildLocalInviteDisplayName,
  buildLocalInviteUserDescription,
} from '../utils/localInviteUsers';
import { scaleFont } from '../utils/responsive';

export default function MentionSuggestionsPanel({
  activeKeyword = '',
  animatedStyle,
  bottomInset = 12,
  bottomOffset = 0,
  emptyText = '\u6ca1\u6709\u627e\u5230\u5339\u914d\u7528\u6237\uff0c\u6362\u4e2a\u5173\u952e\u8bcd\u8bd5\u8bd5',
  headerHint = '\u70b9\u51fb\u5373\u53ef\u63d0\u53ca',
  loading = false,
  loadingText = '\u6b63\u5728\u641c\u7d22\u76f8\u5173\u7528\u6237...',
  enableBackdrop = false,
  onBackdropPress,
  onSelect,
  panelMaxHeight,
  listMaxHeight,
  users = [],
}) {
  const hasKeyword = Boolean(String(activeKeyword ?? '').trim());
  const title = hasKeyword ? `\u641c\u7d22 @${activeKeyword}` : '\u63a8\u8350\u7528\u6237';
  const countText = loading ? '\u641c\u7d22\u4e2d' : `${users.length}\u4eba`;

  const renderStatus = (iconName, text, iconColor) => (
    <View
      style={[
        styles.status,
        {
          paddingBottom: bottomInset + 12,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={modalTokens.danger} />
      ) : (
        <Ionicons name={iconName} size={18} color={iconColor} />
      )}
      <Text style={styles.statusTitle}>
        {loading ? '\u6b63\u5728\u67e5\u627e\u53ef\u63d0\u53ca\u7684\u7528\u6237' : emptyText}
      </Text>
      {!loading ? <Text style={styles.statusHint}>{headerHint}</Text> : null}
      {loading ? <Text style={styles.statusHint}>{loadingText}</Text> : null}
    </View>
  );

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      {enableBackdrop ? <Pressable style={styles.backdrop} onPress={onBackdropPress} /> : null}

      <Animated.View
        style={[
          styles.overlay,
          animatedStyle,
          {
            bottom: Math.max(Number(bottomOffset) || 0, 0),
            maxHeight: panelMaxHeight,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons
              name={hasKeyword ? 'search-outline' : 'at-outline'}
              size={16}
              color="#64748b"
            />
            <Text style={styles.headerText} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerHint}>{headerHint}</Text>
            <Text style={styles.headerCountText}>{countText}</Text>
          </View>
        </View>

        {loading ? (
          renderStatus('search-outline', loadingText, modalTokens.primary)
        ) : users.length > 0 ? (
          <FlatList
            data={users}
            keyExtractor={(item, index) =>
              String(item?.id ?? item?.userId ?? `${buildLocalInviteDisplayName(item)}-${index}`)
            }
            style={[
              styles.list,
              {
                maxHeight: listMaxHeight,
              },
            ]}
            contentContainerStyle={{
              paddingBottom: bottomInset,
            }}
            scrollEnabled
            nestedScrollEnabled
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            renderItem={({ item: user, index }) => {
              const displayName = buildLocalInviteDisplayName(user);
              const description = buildLocalInviteUserDescription(user);
              const username = String(user?.username ?? '').trim().replace(/^@+/, '');
              const secondaryText = [username ? `@${username}` : '', description]
                .filter(Boolean)
                .join(' \u00b7 ');

              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.item,
                    index > 0 && styles.itemBorder,
                    pressed && styles.itemPressed,
                  ]}
                  android_ripple={{
                    color: 'rgba(37, 99, 235, 0.06)',
                  }}
                  onPress={() => onSelect?.(user)}
                >
                  {({ pressed }) => (
                    <>
                      <Avatar uri={user.avatar} name={displayName} size={38} />
                      <View style={styles.meta}>
                        <View style={styles.nameRow}>
                          <Text style={styles.name} numberOfLines={1}>
                            {displayName}
                          </Text>
                          {Number(user?.verified || 0) > 0 ? (
                            <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />
                          ) : null}
                        </View>
                        <Text style={styles.desc} numberOfLines={1}>
                          {secondaryText ||
                            '\u9009\u62e9\u540e\u5c06\u63d2\u5165\u5230\u5f53\u524d\u5149\u6807\u4f4d\u7f6e'}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={pressed ? modalTokens.primary : '#9aa4b2'}
                      />
                    </>
                  )}
                </Pressable>
              );
            }}
          />
        ) : (
          renderStatus('person-outline', emptyText, modalTokens.textMuted)
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  backdrop: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderTopColor: '#e8edf3',
    zIndex: 20,
  },
  header: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8edf3',
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  headerText: {
    marginLeft: 8,
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  headerRight: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  headerHint: {
    fontSize: scaleFont(11),
    color: modalTokens.textMuted,
  },
  headerCountText: {
    marginTop: 2,
    fontSize: scaleFont(11),
    color: modalTokens.textSecondary,
    fontWeight: '500',
  },
  list: {
    maxHeight: 320,
    backgroundColor: '#ffffff',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 66,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  itemBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eef2f6',
  },
  itemPressed: {
    backgroundColor: '#f8fbff',
  },
  meta: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  name: {
    flexShrink: 1,
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  desc: {
    marginTop: 4,
    fontSize: scaleFont(12),
    color: modalTokens.textSecondary,
    lineHeight: scaleFont(16),
  },
  status: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 22,
    backgroundColor: '#ffffff',
  },
  statusTitle: {
    marginTop: 10,
    fontSize: scaleFont(13),
    color: modalTokens.textPrimary,
    fontWeight: '500',
    textAlign: 'center',
  },
  statusHint: {
    marginTop: 6,
    fontSize: scaleFont(12),
    color: modalTokens.textSecondary,
    textAlign: 'center',
    lineHeight: scaleFont(18),
  },
});
