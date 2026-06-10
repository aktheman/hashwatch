import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorBannerProps {
  message: string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onDismiss, onRetry }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
      <View style={styles.actions}>
        {onRetry && (
          <TouchableOpacity onPress={onRetry}>
            <Text style={styles.retry}>Retry</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss}>
            <Text style={styles.dismiss}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#7F1D1D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
  },
  text: {
    color: '#FCA5A5',
    fontSize: 13,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 12,
  },
  retry: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '600',
  },
  dismiss: {
    color: '#6B7280',
    fontSize: 13,
  },
});
