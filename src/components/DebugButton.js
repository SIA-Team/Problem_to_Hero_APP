import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { Ionicons } from '@expo/vector-icons';
import DebugToken from '../utils/debugToken';
import { SIMULATE_PRODUCTION } from '../config/debugMode';
import { isDevPreviewFeatureEnabled } from '../utils/devPreviewGate';

export default function DebugButton() {
  const isDebugButtonEnabled = isDevPreviewFeatureEnabled({
    isDev: __DEV__,
    simulateProduction: SIMULATE_PRODUCTION,
    platformOS: Platform.OS,
    updatesChannel: Updates.channel,
  });

  const handlePress = async () => {
    console.log('\nDebug button pressed, checking token state...\n');
    await DebugToken.checkTokenStatus();
    await DebugToken.testTokenInRequest();
  };

  if (!isDebugButtonEnabled) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.debugButton}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.buttonContent}>
        <Ionicons name="bug" size={20} color="#fff" />
        <Text style={styles.buttonText}>Check Token</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  debugButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
