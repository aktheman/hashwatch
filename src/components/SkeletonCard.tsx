import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { Skeleton } from './Skeleton';
import { spacing, radius } from '../utils/design';

interface SkeletonCardProps {
  rows?: number;
}

export function SkeletonCard({ rows = 3 }: SkeletonCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <Skeleton width={120} height={18} borderRadius={radius.sm} />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={14} borderRadius={radius.sm} style={styles.row} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: 6,
    borderWidth: 1,
    gap: spacing.md,
  },
  row: {
    marginTop: 0,
  },
});
