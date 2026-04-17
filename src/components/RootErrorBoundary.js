import React from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      resetting: false,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      error,
      resetting: false,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RootErrorBoundary caught a fatal render error:', error, errorInfo);
    SplashScreen.hideAsync().catch(() => {
      // Ignore "already hidden" errors so the fallback screen can render.
    });
  }

  handleReset = () => {
    this.setState({
      resetting: true,
    });

    requestAnimationFrame(() => {
      this.setState({
        error: null,
        resetting: false,
      });
    });
  };

  render() {
    const { error, resetting } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>应用遇到启动异常</Text>
        <Text style={styles.message}>
          为了避免白屏，应用已进入保护页。请点击下方按钮重试；如果问题持续，请重新安装最新构建。
        </Text>
        <Text style={styles.details} numberOfLines={3}>
          {error?.message || 'Unknown startup error'}
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={this.handleReset}
          activeOpacity={0.85}
          disabled={resetting}
        >
          {resetting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>重新进入应用</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff7f7',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#b91c1c',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
  },
  details: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    minWidth: 160,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default RootErrorBoundary;
