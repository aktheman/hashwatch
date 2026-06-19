import { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { useMinerStore } from '../store/miners';
import { useTheme } from '../theme';
import { Miner } from '../types';
import { useTranslation } from 'react-i18next';

export function GroupsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);
  const setMinerGroup = useMinerStore((s) => s.setMinerGroup);

  const [newGroupName, setNewGroupName] = useState('');

  const groups = useMemo(() => {
    const map = new Map<string, Miner[]>();
    for (const m of miners) {
      const g = m.group || 'Ungrouped';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(m);
    }
    const arr = Array.from(map.entries()).sort(([a], [b]) =>
      a === 'Ungrouped' ? 1 : b === 'Ungrouped' ? -1 : a.localeCompare(b),
    );
    return arr;
  }, [miners]);

  const addGroup = useCallback(() => {
    const name = newGroupName.trim();
    if (!name) return;
    if (miners.some((m) => m.group === name)) {
      Alert.alert(t('groups.groupExists'), t('groups.groupExistsBody', { name }));
      return;
    }
    setNewGroupName('');
    Alert.alert(t('groups.groupCreated'), t('groups.groupCreatedBody', { name }));
  }, [newGroupName, miners, setNewGroupName]);

  const removeGroup = useCallback(
    (groupName: string) => {
      Alert.alert(t('groups.removeGroup'), t('groups.removeGroupBody', { groupName }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('groups.remove'),
          style: 'destructive',
          onPress: async () => {
            const inGroup = miners.filter((m) => m.group === groupName);
            for (const m of inGroup) {
              await setMinerGroup(m.id, undefined);
            }
          },
        },
      ]);
    },
    [miners, setMinerGroup],
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
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Add group"
          style={styles.addBtn}
          onPress={addGroup}
        >
          <Text style={styles.addBtnText}>{t('common.add')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={([name]) => name}
        renderItem={({ item: [name, members] }) => (
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
              {name !== 'Ungrouped' && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Rename group ${name}`}
                    style={[styles.actionBtn, { borderColor: theme.primary }]}
                    onPress={() => renameGroup(name)}
                  >
                    <Text style={[styles.actionBtnText, { color: theme.primary }]}>
                      {t('groups.rename')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Remove group ${name}`}
                    style={[styles.actionBtn, { borderColor: theme.danger }]}
                    onPress={() => removeGroup(name)}
                  >
                    <Text style={[styles.actionBtnText, { color: theme.danger }]}>
                      {t('groups.remove')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {members.length > 0 && (
              <View style={styles.minerList}>
                {members.map((m) => (
                  <View key={m.id} style={styles.minerRow}>
                    <Text style={styles.minerName}>
                      {m.name} ({m.ip})
                    </Text>
                    {name !== 'Ungrouped' && (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${m.name} from group`}
                        style={styles.ungroupBtn}
                        onPress={() => setMinerGroup(m.id, undefined)}
                      >
                        <Text style={styles.ungroupBtnText}>{t('groups.remove')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('groups.noMiners')}</Text>}
      />
    </View>
  );
}
