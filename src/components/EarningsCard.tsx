import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { toHashesPerSecond, estimateBTCPerDay, formatBTC, formatUSD } from '../utils/hashrate';
import { Miner } from '../types';

interface EarningsCardProps {
  miners: Miner[];
  title?: string;
}

export function EarningsCard({ miners, title = 'Estimated Earnings' }: EarningsCardProps) {
  const theme = useTheme();

  const totalHps = miners.reduce(
    (sum, m) => sum + toHashesPerSecond(m.status?.hashRate ?? 0, m.status?.hashRateUnit),
    0,
  );
  const btcPerDay = estimateBTCPerDay(totalHps);
  const sats = Math.round(btcPerDay * 100000000);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.textDim }]}>{title}</Text>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={[styles.value, { color: theme.accent }]}>
            {sats > 0 ? formatBTC(btcPerDay) : '—'}
          </Text>
          <Text style={[styles.label, { color: theme.textDim }]}>per day</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.value, { color: theme.text }]}>
            {sats > 0 ? formatUSD(sats) : '—'}
          </Text>
          <Text style={[styles.label, { color: theme.textDim }]}>per day (est.)</Text>
        </View>
      </View>
      {sats > 0 && (
        <Text style={[styles.sats, { color: theme.textMuted }]}>
          ~{sats.toLocaleString()} sat/day
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flex: 1,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  sats: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
  },
});
