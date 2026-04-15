import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, StatusBar, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PublicProfileHeader({
  onBack,
  onShare,
  showBlacklist = false,
  onBlacklist,
  blacklistLabel = '加入黑名单',
  blacklistDisabled = false,
  overlay = true,
}) {
  const insets = useSafeAreaInsets();
  const safeTopInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0
  );

  return (
    <View
      style={[
        styles.container,
        overlay ? styles.overlayContainer : styles.defaultContainer,
        { paddingTop: safeTopInset, minHeight: safeTopInset + 48 },
      ]}
    >
      <TouchableOpacity
        style={[styles.iconButton, styles.backButton, overlay && styles.overlayIconButton]}
        onPress={onBack}
        activeOpacity={0.85}
      >
        <Ionicons name="arrow-back" size={22} color={overlay ? '#fff' : '#1f2937'} />
      </TouchableOpacity>

      <View style={styles.centerSection} />

      <View style={styles.actions}>
        {showBlacklist ? (
          <TouchableOpacity
            style={[
              styles.blacklistButton,
              overlay && styles.overlayChip,
              blacklistDisabled && styles.blacklistButtonDisabled,
            ]}
            onPress={onBlacklist}
            disabled={blacklistDisabled}
            activeOpacity={0.85}
          >
            <Text style={[styles.blacklistText, overlay && styles.overlayText]}>
              {blacklistLabel}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.iconButton, overlay && styles.overlayIconButton]}
          onPress={onShare}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-redo-outline" size={22} color={overlay ? '#fff' : '#1f2937'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 2,
  },
  defaultContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  overlayContainer: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  centerSection: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    alignItems: 'center',
  },
  overlayIconButton: {
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  blacklistButton: {
    minWidth: 88,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayChip: {
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  blacklistButtonDisabled: {
    opacity: 0.6,
  },
  blacklistText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  overlayText: {
    color: '#fff',
  },
});
