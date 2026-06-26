import { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { withTranslation, WithTranslation } from 'react-i18next';
import { theme } from '../theme';

interface Props extends WithTranslation {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInternal extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App crash:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const t = this.props.t!;
      const tTheme = theme;
      return (
        <View style={[styles.container, { backgroundColor: tTheme.bg }]}>
          <Text style={[styles.icon, { color: tTheme.danger }]}>⚠</Text>
          <Text style={[styles.title, { color: tTheme.text }]}>
            {t('errorBoundary.somethingWentWrong')}
          </Text>
          <Text style={[styles.message, { color: tTheme.textDim }]}>
            {this.state.error?.message || t('errorBoundary.unexpectedError')}
          </Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: tTheme.primary }]}
            onPress={this.handleRetry}
            accessibilityLabel={t('errorBoundary.tryAgain')}
            accessibilityRole="button"
          >
            <Text style={[styles.retryText, { color: '#FFF' }]}>{t('errorBoundary.tryAgain')}</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryInternal);

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
  },
  retryText: {
    fontWeight: '700',
    fontSize: 15,
  },
});
