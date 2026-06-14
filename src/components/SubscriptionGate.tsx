import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useSubscriptionStore } from '../store/subscription';
import { useTheme } from '../theme';

interface SubscriptionGateProps {
  children: React.ReactNode;
  feature?: string;
}

export function SubscriptionGate({ children, feature }: SubscriptionGateProps) {
  const { isPro } = useSubscriptionStore();
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          position: 'relative',
          opacity: 0.5,
        },
        overlay: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.bg + 'A0',
          borderRadius: 12,
        },
        lockIcon: {
          fontSize: 24,
        },
        text: {
          color: theme.text,
          fontSize: 14,
          fontWeight: '600',
          marginTop: 4,
        },
        subtext: {
          color: theme.textDim,
          fontSize: 12,
          marginTop: 2,
        },
      }),
    [theme],
  );

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View pointerEvents="none">{children}</View>
      <View
        style={styles.overlay}
        pointerEvents="auto"
        accessibilityElementsHidden
        accessible={false}
      >
        <Text style={styles.lockIcon}>🔒</Text>
        {feature && <Text style={styles.text}>{feature}</Text>}
        <Text style={styles.subtext}>Upgrade to Pro to unlock</Text>
      </View>
    </View>
  );
}
