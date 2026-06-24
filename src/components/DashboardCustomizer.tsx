import { View, Text, TouchableOpacity, Modal, Switch } from 'react-native';
import { useTheme } from '../theme';

export type SectionKey =
  | 'earnings'
  | 'ticker'
  | 'map'
  | 'legend'
  | 'pools'
  | 'metrics'
  | 'filters'
  | 'sort';

export const SECTION_LABELS: Record<SectionKey, string> = {
  earnings: 'Earnings Card',
  ticker: 'BTC / Network Ticker',
  map: 'World Map',
  legend: 'Map Legend',
  pools: 'Pool Stats',
  metrics: 'Metric Tiles',
  filters: 'Wallet / Group Filters',
  sort: 'Sort Controls',
};

export const DEFAULT_VISIBLE: Record<SectionKey, boolean> = {
  earnings: true,
  ticker: true,
  map: true,
  legend: true,
  pools: true,
  metrics: true,
  filters: true,
  sort: true,
};

interface DashboardCustomizerProps {
  visible: boolean;
  onClose: () => void;
  visibleSections: Record<SectionKey, boolean>;
  onToggle: (key: SectionKey) => void;
  kioskMode: boolean;
  onToggleKiosk: (val: boolean) => void;
}

export function DashboardCustomizer({
  visible,
  onClose,
  visibleSections,
  onToggle,
  kioskMode,
  onToggleKiosk,
}: DashboardCustomizerProps) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 40,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>
              Customize Dashboard
            </Text>
            <TouchableOpacity accessibilityRole="button" onPress={onClose}>
              <Text style={{ color: theme.primary, fontSize: 16 }}>Done</Text>
            </TouchableOpacity>
          </View>
          {Object.entries(SECTION_LABELS).map(([key, label]) => (
            <View
              key={key}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 14 }}>{label}</Text>
              <Switch
                value={visibleSections[key as SectionKey]}
                onValueChange={() => onToggle(key as SectionKey)}
                trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
                thumbColor={visibleSections[key as SectionKey] ? theme.primary : theme.textMuted}
              />
            </View>
          ))}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 14 }}>📺 Kiosk Mode</Text>
            <Switch
              value={kioskMode}
              onValueChange={(val) => onToggleKiosk(val)}
              trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
              thumbColor={kioskMode ? theme.primary : theme.textMuted}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
