import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  StyleSheet,
  RefreshControl,
  Animated,
  Platform,
  Modal,
} from 'react-native';
import { useMinerStore } from '../store/miners';
import { useToastStore } from '../store/toast';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { SkeletonCard } from '../components/SkeletonCard';
import { Miner, AutoAssignRule } from '../types';
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
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null);
  const dragAnim = useRef(new Animated.Value(0)).current;
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const [rules, setRules] = useState<AutoAssignRule[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoAssignRule | null>(null);
  const [ruleField, setRuleField] = useState<AutoAssignRule['field']>('ip');
  const [rulePattern, setRulePattern] = useState('');
  const [ruleGroup, setRuleGroup] = useState('');
  const [showRuleEditor, setShowRuleEditor] = useState(false);

  useEffect(() => {
    Promise.all([
      loadEmptyGroups(),
      DB.getSetting('groups_order').then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      }),
      useMinerStore.getState().loadAutoAssignRules(),
    ]).then(([eg, go, rl]) => {
      setEmptyGroups(eg);
      setGroupOrder(go);
      setRules(rl);
      setLoading(false);
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const [eg, go] = await Promise.all([
      loadEmptyGroups(),
      DB.getSetting('groups_order').then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      }),
    ]);
    setEmptyGroups(eg);
    setGroupOrder(go);
    setRefreshing(false);
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
    const allNames = Array.from(map.keys());
    const ordered = groupOrder.filter((n) => allNames.includes(n));
    const remaining = allNames
      .filter((n) => !ordered.includes(n) && n !== 'Ungrouped')
      .sort((a, b) => a.localeCompare(b));
    const arr = ordered.map((name) => [name, map.get(name)!] as [string, Miner[]]);
    for (const name of remaining) {
      arr.push([name, map.get(name)!]);
    }
    if (map.has('Ungrouped')) {
      arr.push(['Ungrouped', map.get('Ungrouped')!]);
    }
    return arr;
  }, [miners, emptyGroups, groupOrder]);

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

  const moveGroup = useCallback(
    (name: string, direction: 'up' | 'down') => {
      const idx = groups.findIndex(([g]) => g === name);
      if (idx === -1) return;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= groups.length) return;
      const names = groups.map(([g]) => g);
      const namesNoUngrouped = names.filter((g) => g !== 'Ungrouped');
      const srcIdx = namesNoUngrouped.indexOf(name);
      const tgtIdx = direction === 'up' ? srcIdx - 1 : srcIdx + 1;
      if (tgtIdx < 0 || tgtIdx >= namesNoUngrouped.length) return;
      const newOrder = [...namesNoUngrouped];
      [newOrder[srcIdx], newOrder[tgtIdx]] = [newOrder[tgtIdx], newOrder[srcIdx]];
      setGroupOrder(newOrder);
      DB.setSetting('groups_order', JSON.stringify(newOrder));
      useToastStore.getState().showUndo({
        id: `group-reorder-${Date.now()}`,
        message: t('groups.orderSaved') || '',
        onUndo: () => {
          const reverted = [...newOrder];
          [reverted[srcIdx], reverted[tgtIdx]] = [reverted[tgtIdx], reverted[srcIdx]];
          setGroupOrder(reverted);
          DB.setSetting('groups_order', JSON.stringify(reverted));
        },
        onConfirm: () => {},
      });
    },
    [groups, t],
  );

  const performSwap = useCallback(
    (fromName: string, toName: string) => {
      const names = groups.map(([g]) => g).filter((g) => g !== 'Ungrouped');
      const fromIdx = names.indexOf(fromName);
      const toIdx = names.indexOf(toName);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
      const newOrder = [...names];
      [newOrder[fromIdx], newOrder[toIdx]] = [newOrder[toIdx], newOrder[fromIdx]];
      setGroupOrder(newOrder);
      DB.setSetting('groups_order', JSON.stringify(newOrder));
      useToastStore.getState().showUndo({
        id: `group-swap-${Date.now()}`,
        message: t('groups.orderSaved') || '',
        onUndo: () => {
          const reverted = [...newOrder];
          [reverted[fromIdx], reverted[toIdx]] = [reverted[toIdx], reverted[fromIdx]];
          setGroupOrder(reverted);
          DB.setSetting('groups_order', JSON.stringify(reverted));
        },
        onConfirm: () => {},
      });
      setDraggedGroup(null);
      setSwapTarget(null);
    },
    [groups, t],
  );

  const startDrag = useCallback(
    (name: string) => {
      setDraggedGroup(name);
      Animated.spring(dragAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    },
    [dragAnim],
  );

  const cancelDrag = useCallback(() => {
    Animated.timing(dragAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setDraggedGroup(null);
      setSwapTarget(null);
    });
  }, [dragAnim]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !draggedGroup) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelDrag();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [draggedGroup, cancelDrag]);

  const hoverSwap = useCallback((name: string) => {
    setSwapTarget(name);
  }, []);

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

  const addRule = useCallback(() => {
    if (!rulePattern.trim() || !ruleGroup.trim()) return;
    const newRule: AutoAssignRule = {
      id: `rule_${Date.now()}`,
      field: ruleField,
      pattern: rulePattern.trim(),
      group: ruleGroup.trim(),
      enabled: true,
    };
    const updated = editingRule
      ? rules.map((r) => (r.id === editingRule.id ? { ...newRule, id: editingRule.id } : r))
      : [...rules, newRule];
    setRules(updated);
    useMinerStore.getState().saveAutoAssignRules(updated);
    setShowRuleEditor(false);
    setEditingRule(null);
    setRulePattern('');
    setRuleGroup('');
  }, [rules, ruleField, rulePattern, ruleGroup, editingRule]);

  const toggleRule = useCallback(
    (ruleId: string) => {
      const updated = rules.map((r) =>
        r.id === ruleId ? { ...r, enabled: !r.enabled } : r,
      );
      setRules(updated);
      useMinerStore.getState().saveAutoAssignRules(updated);
    },
    [rules],
  );

  const deleteRule = useCallback(
    (ruleId: string) => {
      const updated = rules.filter((r) => r.id !== ruleId);
      setRules(updated);
      useMinerStore.getState().saveAutoAssignRules(updated);
    },
    [rules],
  );

  const editRule = useCallback((rule: AutoAssignRule) => {
    setEditingRule(rule);
    setRuleField(rule.field);
    setRulePattern(rule.pattern);
    setRuleGroup(rule.group);
    setShowRuleEditor(true);
  }, []);

  const applyRules = useCallback(async () => {
    await useMinerStore.getState().applyAutoAssignRulesAll();
    Alert.alert(t('groups.rulesApplied'), t('groups.applyRules'));
  }, [t]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.bg, padding: 16 },
        title: {
          color: theme.text,
          fontSize: 24,
          fontWeight: fontWeight.extrabold,
          marginBottom: 16,
          marginTop: spacing.xs,
          letterSpacing: -0.5,
        },
        inputRow: {
          flexDirection: 'row',
          gap: spacing.xxs,
          marginBottom: 20,
        },
        input: {
          flex: 1,
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.md,
          padding: 12,
          color: theme.text,
          fontSize: fontSize.md,
          borderWidth: 1,
          borderColor: theme.border,
        },
        addBtn: {
          backgroundColor: theme.primary,
          borderRadius: radius.md,
          paddingHorizontal: spacing.lg,
          justifyContent: 'center',
          alignItems: 'center',
        },
        addBtnText: { color: '#FFF', fontWeight: fontWeight.bold, fontSize: fontSize.md },
        groupCard: {
          backgroundColor: theme.surface,
          borderRadius: radius.md,
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
          fontSize: fontSize.lg,
          fontWeight: fontWeight.bold,
        },
        groupCount: {
          color: theme.textDim,
          fontSize: fontSize.base,
          marginTop: spacing.xxs,
        },
        actions: { flexDirection: 'row', gap: spacing.xxs },
        actionBtn: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: radius.sm,
          borderWidth: 1,
        },
        actionBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
        minerList: { marginTop: spacing.xs, gap: spacing.xxs },
        minerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.xxs,
          paddingHorizontal: spacing.xs,
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.sm,
        },
        minerName: { color: theme.text, fontSize: fontSize.base, fontWeight: '500' },
        ungroupBtn: {
          paddingHorizontal: spacing.xs,
          paddingVertical: spacing.xxs,
          borderRadius: radius.xxs,
          backgroundColor: theme.danger + '20',
        },
        ungroupBtnText: {
          color: theme.danger,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        emptyText: {
          color: theme.textDim,
          fontSize: fontSize.base,
          textAlign: 'center',
          marginTop: spacing.xs,
        },
        dragHandle: {
          width: 32,
          height: 32,
          borderRadius: radius.sm,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 8,
        },
        dragHandleText: {
          fontSize: fontSize.h3,
          color: theme.textMuted,
          lineHeight: 22,
        },
        dropHint: {
          color: theme.primary,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          textAlign: 'center',
          marginTop: spacing.xs,
        },
        rulesToggle: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.sm,
          marginTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        },
        rulesToggleText: {
          color: theme.text,
          fontSize: fontSize.md,
          fontWeight: fontWeight.bold,
        },
        ruleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.sm,
          marginBottom: spacing.xxs,
        },
        ruleInfo: { flex: 1, marginLeft: spacing.sm },
        ruleField: { color: theme.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
        rulePattern: { color: theme.text, fontSize: fontSize.base, fontFamily: 'monospace' },
        ruleGroup: { color: theme.textMuted, fontSize: fontSize.xs },
        addRuleBtn: {
          backgroundColor: theme.primary + '20',
          borderRadius: radius.sm,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          alignItems: 'center',
          marginTop: spacing.xs,
        },
        addRuleBtnText: { color: theme.primary, fontWeight: fontWeight.bold, fontSize: fontSize.sm },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          padding: 32,
        },
        modalCard: {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          padding: 20,
          gap: 12,
        },
        modalTitle: { color: theme.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
        pickerRow: { flexDirection: 'row', gap: spacing.xs, marginVertical: spacing.xs },
        fieldChip: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: radius.sm,
          borderWidth: 1,
        },
        fieldChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
        ruleInput: {
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.md,
          padding: 12,
          color: theme.text,
          fontSize: fontSize.md,
          borderWidth: 1,
          borderColor: theme.border,
        },
        modalActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', marginTop: spacing.sm },
      }),
    [theme],
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: 16 }]}>
        <SkeletonCard rows={4} />
        <SkeletonCard rows={3} />
      </View>
    );
  }

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
          const isDragged = draggedGroup === name;
          const isDropTarget = draggedGroup && draggedGroup !== name;
          const isHovered = swapTarget === name;
          const scale = isDragged
            ? dragAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] })
            : 1;
          const elevation = isDragged
            ? dragAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] })
            : 0;
          return (
            <Animated.View
              style={[
                styles.groupCard,
                isDragged && { transform: [{ scale }], zIndex: 100, elevation },
                isHovered && isDropTarget && { borderColor: theme.primary, borderWidth: 2 },
                isDropTarget &&
                  !isHovered && { borderColor: theme.primary + '40', borderWidth: 1.5 },
              ]}
            >
              <View style={styles.groupHeader}>
                {name !== 'Ungrouped' && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isDragged ? `Release ${name}` : `Drag ${name}`}
                    onLongPress={() => !draggedGroup && startDrag(name)}
                    onPress={() => {
                      if (isDragged) {
                        cancelDrag();
                      } else if (isDropTarget) {
                        performSwap(draggedGroup!, name);
                      }
                    }}
                    delayLongPress={300}
                    style={[
                      styles.dragHandle,
                      isDragged && { backgroundColor: theme.primary + '20' },
                    ]}
                    onPressIn={() => isDropTarget && hoverSwap(name)}
                  >
                    <Text style={[styles.dragHandleText, isDragged && { color: theme.primary }]}>
                      {isDragged ? '✕' : '≡'}
                    </Text>
                  </Pressable>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName}>
                    📁 {name === 'Ungrouped' ? t('groups.ungrouped') : name}
                  </Text>
                  <Text style={styles.groupCount}>
                    {t('groups.minerCount', { count: members.length })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {stats && stats.totalHash > 0 && (
                    <Text
                      style={{
                        color: theme.primary,
                        fontSize: fontSize.sm,
                        fontWeight: fontWeight.bold,
                      }}
                    >
                      {formatHashrateValue(stats.totalHash)}
                    </Text>
                  )}
                  {stats && stats.avgTemp > 0 && (
                    <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>
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
                      borderRadius: radius.xxs,
                      backgroundColor: theme.border,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.max(barRatio * 100, 1)}%`,
                        height: '100%',
                        borderRadius: radius.xxs,
                        backgroundColor: theme.primary,
                      }}
                    />
                  </View>
                </View>
              )}
              {name !== 'Ungrouped' && !draggedGroup && (
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Move group ${name} up`}
                    style={[styles.actionBtn, { borderColor: theme.textMuted }]}
                    onPress={() => moveGroup(name, 'up')}
                  >
                    <Text style={[styles.actionBtnText, { color: theme.textMuted }]}>
                      {'\u25B2'}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Move group ${name} down`}
                    style={[styles.actionBtn, { borderColor: theme.textMuted }]}
                    onPress={() => moveGroup(name, 'down')}
                  >
                    <Text style={[styles.actionBtnText, { color: theme.textMuted }]}>
                      {'\u25BC'}
                    </Text>
                  </Pressable>
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
              {isDropTarget && (
                <Text style={styles.dropHint}>{t('groups.tapToDrop', 'Tap to place here')}</Text>
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
            </Animated.View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('groups.noMiners')}</Text>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Toggle auto-assign rules"
        style={styles.rulesToggle}
        onPress={() => setShowRules((s) => !s)}
      >
        <Text style={styles.rulesToggleText}>{t('groups.autoAssignRules')}</Text>
        <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>
          {showRules ? '▲' : '▼'}
        </Text>
      </Pressable>
      {showRules && (
        <View style={{ marginBottom: 16 }}>
          {rules.length === 0 && (
            <Text style={{ color: theme.textDim, fontSize: fontSize.sm, paddingVertical: spacing.xs }}>
              {t('groups.noRules')}
            </Text>
          )}
          {rules.map((rule) => (
            <View key={rule.id} style={styles.ruleRow}>
              <Text style={{ fontSize: fontSize.lg, color: rule.enabled ? theme.success : theme.textMuted }}>
                {rule.enabled ? '✓' : '○'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('groups.editRule')}
                style={styles.ruleInfo}
                onPress={() => editRule(rule)}
              >
                <Text style={styles.ruleField}>{rule.field}</Text>
                <Text style={styles.rulePattern}>/{rule.pattern}/</Text>
                <Text style={styles.ruleGroup}>→ {rule.group}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={rule.enabled ? t('groups.disableRule') : t('groups.enableRule')}
                hitSlop={8}
                onPress={() => toggleRule(rule.id)}
                style={{ padding: 4 }}
              >
                <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>
                  {rule.enabled ? t('groups.off') : t('groups.on')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('groups.deleteRule')}
                hitSlop={8}
                onPress={() => deleteRule(rule.id)}
                style={{ padding: 4, marginLeft: 4 }}
              >
                <Text style={{ color: theme.danger, fontSize: fontSize.sm }}>✕</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('groups.addRule')}
            style={styles.addRuleBtn}
            onPress={() => {
              setEditingRule(null);
              setRuleField('ip');
              setRulePattern('');
              setRuleGroup('');
              setShowRuleEditor(true);
            }}
          >
            <Text style={styles.addRuleBtnText}>{t('groups.addRule')}</Text>
          </Pressable>
          {rules.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('groups.applyAll')}
              style={[styles.addRuleBtn, { borderWidth: 1, borderColor: theme.primary + '40', marginTop: 4 }]}
              onPress={applyRules}
            >
              <Text style={styles.addRuleBtnText}>{t('groups.applyRules')}</Text>
            </Pressable>
          )}
        </View>
      )}
      <Modal visible={showRuleEditor} transparent animationType="fade" onRequestClose={() => setShowRuleEditor(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingRule ? t('groups.editRule') : t('groups.newRule')}</Text>
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>{t('groups.matchField')}</Text>
            <View style={styles.pickerRow}>
              {(['ip', 'name', 'tag'] as const).map((f) => (
                <Pressable
                  key={f}
                  accessibilityRole="button"
                  accessibilityLabel={f === 'ip' ? t('groups.fieldIP') : f === 'name' ? t('groups.fieldName') : t('groups.fieldTag')}
                  style={[styles.fieldChip, { backgroundColor: ruleField === f ? theme.primary + '20' : theme.surfaceLight, borderColor: ruleField === f ? theme.primary : theme.border }]}
                  onPress={() => setRuleField(f)}
                >
                  <Text style={[styles.fieldChipText, { color: ruleField === f ? theme.primary : theme.textMuted }]}>
                    {f === 'ip' ? t('groups.fieldIP') : f === 'name' ? t('groups.fieldName') : t('groups.fieldTag')}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.ruleInput}
              value={rulePattern}
              onChangeText={setRulePattern}
              placeholder={t('groups.patternPlaceholder')}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.ruleInput}
              value={ruleGroup}
              onChangeText={setRuleGroup}
              placeholder={t('groups.targetGroupPlaceholder')}
              placeholderTextColor={theme.textMuted}
            />
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                style={[styles.ruleInput, { flex: 0, paddingHorizontal: 16, borderColor: theme.border }]}
                onPress={() => setShowRuleEditor(false)}
              >
                <Text style={{ color: theme.textMuted }}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={editingRule ? t('common.save') : t('common.add')}
                style={[styles.ruleInput, { flex: 0, paddingHorizontal: 16, backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={addRule}
              >
                <Text style={{ color: '#FFF', fontWeight: fontWeight.bold }}>
                  {editingRule ? t('common.save') : t('common.add')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
