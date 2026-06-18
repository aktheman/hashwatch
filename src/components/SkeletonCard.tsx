import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { Skeleton } from './Skeleton';

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
      <Skeleton width={120} height={18} borderRadius={9} />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={14} borderRadius={7} style={styles.row} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    gap: 12,
  },
  row: {
    marginTop: 0,
  },
});
