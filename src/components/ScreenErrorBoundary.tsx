import { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useTheme } from '../theme';
import { spacing, fontSize, fontWeight, radius, buttonText } from '../utils/design';

interface Props {
  children: ReactNode;
  onGoBack?: () => void;
}

interface InnerProps extends Props {
  theme: ReturnType<typeof useTheme>;
  t: TFunction;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ScreenErrorBoundaryInner extends Component<InnerProps, State> {
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
      const { t: translate } = this.props;
      return (
        <View style={[styles.container, { backgroundColor: t.bg }]}>
          <Text style={[styles.icon, { color: t.danger }]}>⚠</Text>
          <Text style={[styles.title, { color: t.text }]}>
            {translate('errorBoundary.screenError')}
          </Text>
          <Text style={[styles.message, { color: t.textDim }]}>
            {this.state.error?.message || translate('errorBoundary.unexpectedError')}
          </Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: t.primary }]}
            onPress={this.handleRetry}
            accessibilityLabel={translate('errorBoundary.tryAgain')}
            accessibilityRole="button"
          >
            <Text style={[styles.retryText, { color: buttonText }]}>
              {translate('errorBoundary.tryAgain')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.goBackBtn, { borderColor: t.border }]}
            onPress={this.handleGoBack}
            accessibilityLabel={translate('common.goBack')}
            accessibilityRole="button"
          >
            <Text style={[styles.goBackText, { color: t.text }]}>{translate('common.goBack')}</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export function ScreenErrorBoundary({ children, onGoBack }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <ScreenErrorBoundaryInner theme={theme} t={t} onGoBack={onGoBack}>
      {children}
    </ScreenErrorBoundaryInner>
  );
}

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
    marginBottom: spacing.sm,
  },
  retryText: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.md,
  },
  goBackBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  goBackText: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.md,
  },
});
