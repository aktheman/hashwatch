import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSubscriptionStore } from '../store/subscription';

interface SubscriptionGateProps {
  children: React.ReactNode;
  feature?: string;
}

export function SubscriptionGate({ children, feature }: SubscriptionGateProps) {
  const { canAddMiner, isPro } = useSubscriptionStore();

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <View style={styles.wrapper}>
      {children}
      <View style={styles.overlay}>
        <Text style={styles.lockIcon}>🔒</Text>
        {feature && <Text style={styles.text}>{feature}</Text>}
        <Text style={styles.subtext}>Upgrade to Pro to unlock</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    opacity: 0.5,
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
  },
  lockIcon: {
    fontSize: 24,
  },
  text: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  subtext: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
});
