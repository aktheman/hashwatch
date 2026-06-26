import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Alert, StyleSheet } from 'react-native';
import { useMinerStore } from '../store/miners';
import { useToastStore } from '../store/toast';
import { useTheme } from '../theme';
import { Miner } from '../types';
import { useTranslation } from 'react-i18next';
import * as DB from '../db/database';
import { toHashesPerSecond, formatHashrateValue } from '../utils/hashrate';

async function loadEmptyGroups(): Promise<string[]> {
  const raw = await DB.getSetting('empty_groups');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveEmptyGroups(groups: string[]): Promise<void> {
  await DB.setSetting('empty_groups', JSON.stringify(groups));
}

export function GroupsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);
  const setMinerGroup = useMinerStore((s) => s.setMinerGroup);

  const [newGroupName, setNewGroupName] = useState('');
  const [emptyGroups, setEmptyGroups] = useState<string[]>([]);

  useEffect(() => {
    loadEmptyGroups().then(setEmptyGroups);
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, Miner[]>();
    for (const m of miners) {
      const g = m.group || 'Ungrouped';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(m);
    }
    for (const g of emptyGroups) {
      if (!map.has(g)) map.set(g, []);
    }
    const arr = Array.from(map.entries()).sort(([a], [b]) =>
      a === 'Ungrouped' ? 1 : b === 'Ungrouped' ? -1 : a.localeCompare(b),
    );
    return arr;
  }, [miners, emptyGroups]);

  const groupStats = useMemo(() => {
    const map = new Map<string, { totalHash: number; avgTemp: number; count: number }>();
    for (const [name, members] of groups) {
      const totalHash = members.reduce(
        (sum, m) => sum + toHashesPerSecond(m.status?.hashRate ?? 0, m.status?.hashRateUnit),
        0,
      );
      const withTemp = members.filter((m) => m.status?.temperature != null);
      const avgTemp =
        withTemp.length > 0
          ? withTemp.reduce((sum, m) => sum + (m.status?.temperature ?? 0), 0) / withTemp.length
          : 0;
      map.set(name, { totalHash, avgTemp, count: members.length });
    }
    return map;
  }, [groups]);

  const maxHash = useMemo(
    () => Math.max(0, ...Array.from(groupStats.values()).map((s) => s.totalHash)),
    [groupStats],
  );

  const addGroup = useCallback(async () => {
    const name = newGroupName.trim();
    if (!name) return;
    if (miners.some((m) => m.group === name) || emptyGroups.includes(name)) {
      Alert.alert(t('groups.groupExists'), t('groups.groupExistsBody', { name }));
      return;
    }
    const updated = [...emptyGroups, name];
    await saveEmptyGroups(updated);
    setEmptyGroups(updated);
    setNewGroupName('');
  }, [newGroupName, miners, emptyGroups, setNewGroupName]);

  const removeGroup = useCallback(
    (groupName: string) => {
      Alert.alert(t('groups.removeGroup'), t('groups.removeGroupBody', { groupName }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('groups.remove'),
          style: 'destructive',
          onPress: () => {
            useToastStore.getState().showUndo({
              id: `group-${groupName}`,
              message: t('groups.groupRemoved', { groupName }),
              onUndo: () => {},
              onConfirm: async () => {
                const inGroup = miners.filter((m) => m.group === groupName);
                for (const m of inGroup) {
                  await setMinerGroup(m.id, undefined);
                }
                if (emptyGroups.includes(groupName)) {
                  const updated = emptyGroups.filter((g) => g !== groupName);
                  await saveEmptyGroups(updated);
                  setEmptyGroups(updated);
                }
              },
            });
          },
        },
      ]);
    },
    [miners, emptyGroups, setMinerGroup, t],
  );

  const renameGroup = useCallback(
    (oldName: string) => {
      if (typeof Alert.prompt === 'function') {
        Alert.prompt(t('groups.renameGroup'), t('groups.renamePrompt'), async (newName: string) => {
          const trimmed = newName.trim();
          if (!trimmed || trimmed === oldName) return;
          const inGroup = miners.filter((m) => m.group === oldName);
          for (const m of inGroup) {
            await setMinerGroup(m.id, trimmed);
          }
        });
      } else {
        Alert.alert(t('groups.renameGroup'), t('groups.editInDetails'));
      }
    },
    [miners, setMinerGroup],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.bg, padding: 16 },
        title: {
          color: theme.text,
          fontSize: 24,
          fontWeight: '800',
          marginBottom: 16,
          marginTop: 8,
          letterSpacing: -0.5,
        },
        inputRow: {
          flexDirection: 'row',
          gap: 8,
          marginBottom: 20,
        },
        input: {
          flex: 1,
          backgroundColor: theme.surfaceLight,
          borderRadius: 10,
          padding: 12,
          color: theme.text,
          fontSize: 15,
          borderWidth: 1,
          borderColor: theme.border,
        },
        addBtn: {
          backgroundColor: theme.primary,
          borderRadius: 10,
          paddingHorizontal: 20,
          justifyContent: 'center',
          alignItems: 'center',
        },
        addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
        groupCard: {
          backgroundColor: theme.surface,
          borderRadius: 12,
          padding: 14,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: theme.border,
        },
        groupHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        groupName: {
          color: theme.text,
          fontSize: 16,
          fontWeight: '700',
        },
        groupCount: {
          color: theme.textDim,
          fontSize: 13,
          marginTop: 2,
        },
        actions: { flexDirection: 'row', gap: 8 },
        actionBtn: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 8,
          borderWidth: 1,
        },
        actionBtnText: { fontSize: 12, fontWeight: '600' },
        minerList: { marginTop: 8, gap: 4 },
        minerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 4,
          paddingHorizontal: 8,
          backgroundColor: theme.surfaceLight,
          borderRadius: 8,
        },
        minerName: { color: theme.text, fontSize: 13, fontWeight: '500' },
        ungroupBtn: {
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 6,
          backgroundColor: theme.danger + '20',
        },
        ungroupBtnText: { color: theme.danger, fontSize: 11, fontWeight: '600' },
        emptyText: { color: theme.textDim, fontSize: 14, textAlign: 'center', marginTop: 40 },
      }),
    [theme],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('groups.title')}</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={newGroupName}
          onChangeText={setNewGroupName}
          placeholder={t('groups.namePlaceholder')}
          placeholderTextColor={theme.textMuted}
          onSubmitEditing={addGroup}
          returnKeyType="done"
          accessibilityLabel="New group name"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add group"
          style={styles.addBtn}
          onPress={addGroup}
        >
          <Text style={styles.addBtnText}>{t('common.add')}</Text>
        </Pressable>
      </View>

      <FlatList
        data={groups}
        keyExtractor={([name]) => name}
        renderItem={({ item: [name, members] }) => {
          const stats = groupStats.get(name);
          const barRatio = stats && maxHash > 0 ? stats.totalHash / maxHash : 0;
          return (
            <View style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View>
                  <Text style={styles.groupName}>
                    📁 {name === 'Ungrouped' ? t('groups.ungrouped') : name}
                  </Text>
                  <Text style={styles.groupCount}>
                    {t('groups.minerCount', { count: members.length })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {stats && stats.totalHash > 0 && (
                    <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '700' }}>
                      {formatHashrateValue(stats.totalHash)}
                    </Text>
                  )}
                  {stats && stats.avgTemp > 0 && (
                    <Text style={{ color: theme.textDim, fontSize: 11 }}>
                      {stats.avgTemp.toFixed(0)}°C avg
                    </Text>
                  )}
                </View>
              </View>
              {stats && stats.totalHash > 0 && (
                <View style={{ marginTop: 6, marginBottom: 4 }}>
                  <View
                    style={{
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: theme.border,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.max(barRatio * 100, 1)}%`,
                        height: '100%',
                        borderRadius: 2,
                        backgroundColor: theme.primary,
                      }}
                    />
                  </View>
                </View>
              )}
              {name !== 'Ungrouped' && (
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Rename group ${name}`}
                    style={[styles.actionBtn, { borderColor: theme.primary }]}
                    onPress={() => renameGroup(name)}
                  >
                    <Text style={[styles.actionBtnText, { color: theme.primary }]}>
                      {t('groups.rename')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove group ${name}`}
                    style={[styles.actionBtn, { borderColor: theme.danger }]}
                    onPress={() => removeGroup(name)}
                  >
                    <Text style={[styles.actionBtnText, { color: theme.danger }]}>
                      {t('groups.remove')}
                    </Text>
                  </Pressable>
                </View>
              )}
              {members.length > 0 && (
                <View style={styles.minerList}>
                  {members.map((m) => (
                    <View key={m.id} style={styles.minerRow}>
                      <Text style={styles.minerName}>
                        {m.name} ({m.ip})
                      </Text>
                      {name !== 'Ungrouped' && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${m.name} from group`}
                          style={styles.ungroupBtn}
                          onPress={() => setMinerGroup(m.id, undefined)}
                        >
                          <Text style={styles.ungroupBtnText}>{t('groups.remove')}</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('groups.noMiners')}</Text>}
      />
    </View>
  );
}
