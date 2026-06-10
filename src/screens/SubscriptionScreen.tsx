import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSubscriptionStore } from '../store/subscription';

export function SubscriptionScreen() {
  const { isPro, tier, loading, purchase, restore } = useSubscriptionStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HashWatch Pro</Text>
      <Text style={styles.subtitle}>
        Monitor unlimited miners with advanced features
      </Text>

      <View style={styles.planCard}>
        <Text style={styles.planName}>Free</Text>
        <Text style={styles.planPrice}>$0</Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>✓ Up to 3 miners</Text>
          <Text style={styles.featureItem}>✓ Live dashboard</Text>
          <Text style={styles.featureItem}>✓ Basic stats</Text>
        </View>
        {tier === 'free' && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current Plan</Text>
          </View>
        )}
      </View>

      <View style={[styles.planCard, styles.proCard]}>
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>POPULAR</Text>
        </View>
        <Text style={styles.planName}>Pro</Text>
        <Text style={styles.planPrice}>$4.99<Text style={{fontSize:14,color:'#9CA3AF'}}>/month</Text></Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>✓ Unlimited miners</Text>
          <Text style={styles.featureItem}>✓ Historical charts (30 days)</Text>
          <Text style={styles.featureItem}>✓ Push notifications</Text>
          <Text style={styles.featureItem}>✓ Cloud backup</Text>
          <Text style={styles.featureItem}>✓ Remote monitoring (Phase 2)</Text>
          <Text style={styles.featureItem}>✓ Multi-wallet tracking</Text>
        </View>
        {isPro ? (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Active</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.upgradeBtn, loading && styles.btnDisabled]}
            onPress={purchase}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.restoreBtn, loading && styles.btnDisabled]}
        onPress={restore}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#3B82F6" />
        ) : (
          <Text style={styles.restoreBtnText}>Restore Purchases</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  planCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  proCard: {
    borderColor: '#3B82F6',
    position: 'relative',
  },
  proBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  proBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  planName: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '700',
  },
  planPrice: {
    color: '#F9FAFB',
    fontSize: 36,
    fontWeight: '700',
    marginVertical: 8,
  },
  featureList: {
    marginTop: 12,
    gap: 6,
  },
  featureItem: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  currentBadge: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  currentBadgeText: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  upgradeBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  upgradeBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  restoreBtn: {
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  restoreBtnText: {
    color: '#3B82F6',
    fontSize: 14,
  },
});
