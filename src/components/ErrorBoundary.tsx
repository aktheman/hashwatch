import { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { withTranslation, WithTranslation } from 'react-i18next';
import { theme } from '../theme';
import { spacing, fontSize, fontWeight, radius } from '../utils/design';
import { captureError } from '../services/errorTracking';

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
    captureError(error, { componentStack: errorInfo.componentStack });
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
    padding: spacing.xl,
  },
  icon: {
    fontSize: fontSize.h1,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  retryText: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.md,
  },
});
