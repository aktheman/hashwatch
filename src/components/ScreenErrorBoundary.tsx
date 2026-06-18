import { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { buttonText } from '../utils/design';

interface Props {
  children: ReactNode;
  onGoBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ScreenErrorBoundaryInner extends Component<
  Props & { theme: ReturnType<typeof useTheme> },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Screen error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoBack = () => {
    this.props.onGoBack?.();
  };

  render() {
    if (this.state.hasError) {
      const t = this.props.theme;
      return (
        <View style={[styles.container, { backgroundColor: t.bg }]}>
          <Text style={[styles.icon, { color: t.danger }]}>⚠</Text>
          <Text style={[styles.title, { color: t.text }]}>Screen Error</Text>
          <Text style={[styles.message, { color: t.textDim }]}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: t.primary }]}
            onPress={this.handleRetry}
            accessibilityLabel="Try again"
            accessibilityRole="button"
          >
            <Text style={[styles.retryText, { color: buttonText }]}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.goBackBtn, { borderColor: t.border }]}
            onPress={this.handleGoBack}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={[styles.goBackText, { color: t.text }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export function ScreenErrorBoundary({ children, onGoBack }: Props) {
  const theme = useTheme();
  return (
    <ScreenErrorBoundaryInner theme={theme} onGoBack={onGoBack}>
      {children}
    </ScreenErrorBoundaryInner>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  retryText: {
    fontWeight: '700',
    fontSize: 15,
  },
  goBackBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  goBackText: {
    fontWeight: '700',
    fontSize: 15,
  },
});
