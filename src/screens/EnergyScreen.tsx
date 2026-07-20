import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../theme';
import { useTranslation } from 'react-i18next';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { DEFAULT_SOURCES, calculateEnergyStats } from '../utils/energyTracking';
import type { EnergySource, EnergyReading } from '../utils/energyTracking';
import * as haptic from '../utils/haptics';

const SOURCE_ICONS: Record<EnergySource['type'], string> = {
  grid: '🔌',
  solar: '☀️',
  wind: '💨',
  hydro: '💧',
  battery: '🔋',
};

export function EnergyScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [sources, setSources] = useState<EnergySource[]>(DEFAULT_SOURCES);
  const [readings, setReadings] = useState<EnergyReading[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<EnergySource['type']>('grid');
  const [newMaxWatts, setNewMaxWatts] = useState('');
  const [readingSourceId, setReadingSourceId] = useState('');
  const [readingWatts, setReadingWatts] = useState('');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(() => calculateEnergyStats(readings, sources), [readings, sources]);

  const handleAddSource = useCallback(() => {
    const maxW = parseInt(newMaxWatts, 10);
    if (!newName.trim() || !maxW || maxW <= 0) {
      Alert.alert('Error', 'Name and valid max watts required');
      return;
    }
    const colors: Record<string, string> = {
      grid: '#ff4444',
      solar: '#ffaa00',
      wind: '#44aaff',
      hydro: '#44ffaa',
      battery: '#aa44ff',
    };
    const source: EnergySource = {
      id: Date.now().toString(),
      name: newName.trim(),
      type: newType,
      maxWatts: maxW,
      color: colors[newType] ?? '#888888',
    };
    setSources((prev) => [...prev, source]);
    setNewName('');
    setNewType('grid');
    setNewMaxWatts('');
    setShowAddModal(false);
    haptic.success();
  }, [newName, newType, newMaxWatts]);

  const handleAddReading = useCallback(() => {
    const watts = parseInt(readingWatts, 10);
    if (!readingSourceId || !watts || watts < 0) {
      Alert.alert('Error', 'Select source and enter valid watts');
      return;
    }
    const source = sources.find((s) => s.id === readingSourceId);
    const carbonKg = (watts / 1000) * (source?.type === 'grid' ? 0.45 : 0);
    const reading: EnergyReading = {
      sourceId: readingSourceId,
      watts,
      timestamp: Date.now(),
      carbonKg,
    };
    setReadings((prev) => [...prev, reading]);
    setReadingWatts('');
    setShowReadingModal(false);
    haptic.success();
  }, [readingSourceId, readingWatts, sources]);

  const removeSource = useCallback(
    (id: string) => {
      Alert.alert('Remove', 'Remove this energy source?', [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => setSources((prev) => prev.filter((s) => s.id !== id)),
        },
      ]);
    },
    [t],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg, padding: spacing.md }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            setTimeout(() => setRefreshing(false), 300);
          }}
          tintColor={theme.primary}
        />
      }
    >
      <Text
        style={{
          color: theme.text,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.md,
        }}
      >
        {t('energy.title')}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginBottom: spacing.md,
        }}
      >
        {sources.map((s) => (
          <Pressable
            key={s.id}
            style={{
              backgroundColor: theme.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              borderWidth: 1.5,
              borderColor: selectedSourceId === s.id ? s.color : theme.border,
              minWidth: 100,
              alignItems: 'center',
              gap: spacing.xxs,
            }}
            onPress={() => {
              haptic.selection();
              setSelectedSourceId(selectedSourceId === s.id ? null : s.id);
            }}
            onLongPress={() => {
              haptic.medium();
              removeSource(s.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Energy source ${s.name}`}
          >
            <Text style={{ fontSize: 24 }}>{SOURCE_ICONS[s.type]}</Text>
            <Text
              style={{ color: theme.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
              numberOfLines={1}
            >
              {s.name}
            </Text>
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>{s.maxWatts}W</Text>
          </Pressable>
        ))}
        <Pressable
          style={{
            backgroundColor: theme.surface,
            borderRadius: radius.md,
            padding: spacing.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: theme.border,
            minWidth: 100,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => {
            haptic.light();
            setShowAddModal(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Add energy source"
        >
          <Text style={{ color: theme.textMuted, fontSize: fontSize.xs }}>
            + {t('energy.addSource')}
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          backgroundColor: theme.surface,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Text
          style={{
            color: theme.textDim,
            fontSize: fontSize.xs,
            fontWeight: fontWeight.bold,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: spacing.xs,
          }}
        >
          {t('energy.totalKwh')}
        </Text>
        <Text style={{ color: theme.text, fontSize: fontSize.h2, fontWeight: fontWeight.bold }}>
          {stats.totalKwhToday} kWh
        </Text>
        <View style={{ flexDirection: 'row', marginTop: spacing.xs, gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
              {t('energy.renewablePercent')}
            </Text>
            <Text
              style={{ color: theme.success, fontSize: fontSize.md, fontWeight: fontWeight.bold }}
            >
              {stats.renewablePercent}%
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
              {t('energy.gridPercent')}
            </Text>
            <Text
              style={{ color: theme.danger, fontSize: fontSize.md, fontWeight: fontWeight.bold }}
            >
              {stats.gridPercent}%
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
              {t('energy.carbonSaved')}
            </Text>
            <Text
              style={{ color: theme.success, fontSize: fontSize.md, fontWeight: fontWeight.bold }}
            >
              {stats.carbonSavedKg} kg
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
              {t('energy.estimatedCost')}
            </Text>
            <Text style={{ color: theme.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>
              ${stats.estimatedCost}
            </Text>
          </View>
        </View>
      </View>

      {stats.totalKwhToday > 0 && (
        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.md,
            borderWidth: 1,
            borderColor: theme.border,
            gap: spacing.xs,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View
              style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: theme.success }}
            />
            <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>
              Renewable: {stats.renewablePercent}%
            </Text>
            <View
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.surfaceLight,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${stats.renewablePercent}%`,
                  backgroundColor: theme.success,
                  borderRadius: 4,
                }}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View
              style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: theme.danger }}
            />
            <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>
              Grid: {stats.gridPercent}%
            </Text>
            <View
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.surfaceLight,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${stats.gridPercent}%`,
                  backgroundColor: theme.danger,
                  borderRadius: 4,
                }}
              />
            </View>
          </View>
        </View>
      )}

      <Pressable
        style={{
          backgroundColor: theme.primary,
          borderRadius: radius.md,
          padding: spacing.sm,
          alignItems: 'center',
          marginBottom: spacing.md,
        }}
        onPress={() => {
          haptic.light();
          setReadingSourceId(sources[0]?.id ?? '');
          setShowReadingModal(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Log power reading"
      >
        <Text style={{ color: '#FFF', fontSize: fontSize.md, fontWeight: fontWeight.bold }}>
          {t('energy.addReading')}
        </Text>
      </Pressable>

      {readings.length > 0 && (
        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: radius.md,
            padding: spacing.md,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text
            style={{
              color: theme.textDim,
              fontSize: fontSize.xs,
              fontWeight: fontWeight.bold,
              textTransform: 'uppercase',
              marginBottom: spacing.xs,
            }}
          >
            Recent Readings
          </Text>
          {readings
            .slice(-5)
            .reverse()
            .map((r, i) => {
              const src = sources.find((s) => s.id === r.sourceId);
              return (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: spacing.xxs,
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: fontSize.sm }}>
                    {src?.name ?? r.sourceId}
                  </Text>
                  <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>
                    {r.watts}W · {new Date(r.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              );
            })}
        </View>
      )}

      <Modal visible={showAddModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            padding: spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: radius.lg,
              padding: spacing.lg,
              gap: spacing.md,
            }}
          >
            <Text style={{ color: theme.text, fontSize: fontSize.h3, fontWeight: fontWeight.bold }}>
              {t('energy.addSource')}
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.surfaceLight,
                borderRadius: radius.md,
                padding: spacing.sm,
                color: theme.text,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              value={newName}
              onChangeText={setNewName}
              placeholder={t('energy.sourceName')}
              placeholderTextColor={theme.textMuted}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ gap: spacing.xs }}
            >
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {(['grid', 'solar', 'wind', 'hydro', 'battery'] as const).map((type) => (
                  <Pressable
                    key={type}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.xs,
                      borderRadius: radius.md,
                      backgroundColor: newType === type ? theme.primary : theme.surfaceLight,
                      borderWidth: 1,
                      borderColor: newType === type ? theme.primary : theme.border,
                    }}
                    onPress={() => {
                      haptic.selection();
                      setNewType(type);
                    }}
                  >
                    <Text
                      style={{
                        color: newType === type ? '#FFF' : theme.text,
                        fontSize: fontSize.sm,
                      }}
                    >
                      {SOURCE_ICONS[type]} {t(`energy.${type}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <TextInput
              style={{
                backgroundColor: theme.surfaceLight,
                borderRadius: radius.md,
                padding: spacing.sm,
                color: theme.text,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              value={newMaxWatts}
              onChangeText={setNewMaxWatts}
              placeholder={t('energy.maxWatts')}
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Pressable
                style={{
                  flex: 1,
                  backgroundColor: theme.surfaceLight,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  alignItems: 'center',
                }}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={{ color: theme.text }}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={{
                  flex: 1,
                  backgroundColor: theme.primary,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  alignItems: 'center',
                }}
                onPress={handleAddSource}
              >
                <Text style={{ color: '#FFF', fontWeight: fontWeight.bold }}>
                  {t('common.add')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showReadingModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            padding: spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: radius.lg,
              padding: spacing.lg,
              gap: spacing.md,
            }}
          >
            <Text style={{ color: theme.text, fontSize: fontSize.h3, fontWeight: fontWeight.bold }}>
              {t('energy.addReading')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {sources.map((s) => (
                  <Pressable
                    key={s.id}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.xs,
                      borderRadius: radius.md,
                      backgroundColor:
                        readingSourceId === s.id ? theme.primary : theme.surfaceLight,
                      borderWidth: 1,
                      borderColor: readingSourceId === s.id ? theme.primary : theme.border,
                    }}
                    onPress={() => {
                      haptic.selection();
                      setReadingSourceId(s.id);
                    }}
                  >
                    <Text
                      style={{
                        color: readingSourceId === s.id ? '#FFF' : theme.text,
                        fontSize: fontSize.sm,
                      }}
                    >
                      {SOURCE_ICONS[s.type]} {s.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <TextInput
              style={{
                backgroundColor: theme.surfaceLight,
                borderRadius: radius.md,
                padding: spacing.sm,
                color: theme.text,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              value={readingWatts}
              onChangeText={setReadingWatts}
              placeholder={t('energy.watts')}
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Pressable
                style={{
                  flex: 1,
                  backgroundColor: theme.surfaceLight,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  alignItems: 'center',
                }}
                onPress={() => setShowReadingModal(false)}
              >
                <Text style={{ color: theme.text }}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={{
                  flex: 1,
                  backgroundColor: theme.primary,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  alignItems: 'center',
                }}
                onPress={handleAddReading}
              >
                <Text style={{ color: '#FFF', fontWeight: fontWeight.bold }}>
                  {t('common.save')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
