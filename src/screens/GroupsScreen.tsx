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
import { useGroupSharingStore } from '../store/groupSharing';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { SkeletonCard } from '../components/SkeletonCard';
import { Miner, AutoAssignRule, GroupConfig, GroupAlertConfig, GroupShare } from '../types';
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
  const [groupConfigs, setGroupConfigs] = useState<GroupConfig[]>([]);
  const [groupAlerts, setGroupAlerts] = useState<GroupAlertConfig[]>([]);
  const [showGroupAlerts, setShowGroupAlerts] = useState(false);
  const [editingAlert, setEditingAlert] = useState<GroupAlertConfig | null>(null);
  const [alertType, setAlertType] = useState<GroupAlertConfig['type']>('offline_count');
  const [alertThreshold, setAlertThreshold] = useState('3');
  const [alertGroupId, setAlertGroupId] = useState('');
  const [showAlertEditor, setShowAlertEditor] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareGroupId, setShareGroupId] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [shareAccessLevel, setShareAccessLevel] = useState('view');
  const [groupShares, setGroupShares] = useState<GroupShare[]>([]);

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
      useMinerStore.getState().loadGroupConfigs(),
      useMinerStore.getState().loadGroupAlerts(),
    ]).then(([eg, go, rl, gc, ga]) => {
      setEmptyGroups(eg);
      setGroupOrder(go);
      setRules(rl);
      setGroupConfigs(gc);
      setGroupAlerts(ga);
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

  const flatGroups = useMemo(() => {
    const configMap = new Map(groupConfigs.map((c) => [c.name, c]));
    const childMap = new Map<string, string[]>();
    for (const c of groupConfigs) {
      if (c.parentId) {
        const parentConfig = configMap.get(c.parentId);
        if (parentConfig) {
          if (!childMap.has(parentConfig.name)) childMap.set(parentConfig.name, []);
          childMap.get(parentConfig.name)!.push(c.name);
        }
      }
    }
    const result: { name: string; miners: Miner[]; depth: number; hasChildren: boolean }[] = [];
    const visited = new Set<string>();

    function addGroup(name: string, depth: number) {
      if (visited.has(name)) return;
      visited.add(name);
      const entry = groups.find(([n]) => n === name);
      const miners = entry ? entry[1] : [];
      const children = childMap.get(name) || [];
      result.push({ name, miners, depth, hasChildren: children.length > 0 });
      for (const child of children) {
        addGroup(child, depth + 1);
      }
    }

    for (const [name] of groups) {
      if (name === 'Ungrouped') continue;
      const config = configMap.get(name);
      if (!config || !config.parentId) {
        addGroup(name, 0);
      }
    }
    const ungrouped = groups.find(([n]) => n === 'Ungrouped');
    if (ungrouped) {
      result.push({ name: 'Ungrouped', miners: ungrouped[1], depth: 0, hasChildren: false });
    }
    return result;
  }, [groups, groupConfigs]);

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
      const updated = rules.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
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

  const addGroupAlert = useCallback(async () => {
    const threshold = parseFloat(alertThreshold);
    if (isNaN(threshold) || !alertGroupId) return;
    const newAlert: GroupAlertConfig = {
      id: `galert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      groupId: alertGroupId,
      type: alertType,
      threshold,
      enabled: true,
    };
    const updated = [...groupAlerts, newAlert];
    await useMinerStore.getState().saveGroupAlerts(updated);
    setGroupAlerts(updated);
    setShowAlertEditor(false);
  }, [alertType, alertThreshold, alertGroupId, groupAlerts]);

  const toggleGroupAlert = useCallback(
    async (id: string) => {
      const updated = groupAlerts.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a));
      await useMinerStore.getState().saveGroupAlerts(updated);
      setGroupAlerts(updated);
    },
    [groupAlerts],
  );

  const deleteGroupAlert = useCallback(
    async (id: string) => {
      const updated = groupAlerts.filter((a) => a.id !== id);
      await useMinerStore.getState().saveGroupAlerts(updated);
      setGroupAlerts(updated);
    },
    [groupAlerts],
  );

  const evaluateGroupAlerts = useCallback(async () => {
    const triggered = await useMinerStore.getState().evaluateGroupAlerts();
    if (triggered.length === 0) {
      Alert.alert(t('groups.groupAlerts'), t('groups.noGroupAlerts'));
    } else {
      for (const alert of triggered) {
        Alert.alert(
          t('groups.alertTriggered'),
          t('groups.alertTriggeredBody', { group: alert.groupId, type: alert.type }),
        );
      }
    }
  }, [t]);

  const openShareModal = useCallback(async (groupId: string) => {
    setShareGroupId(groupId);
    setShareEmail('');
    setShareAccessLevel('view');
    const shares = await useGroupSharingStore.getState().sharedByMe;
    setGroupShares(shares.filter((s) => s.groupId === groupId));
    setShowShareModal(true);
  }, []);

  const submitShare = useCallback(async () => {
    if (!shareEmail.trim() || !shareGroupId) return;
    try {
      await useGroupSharingStore
        .getState()
        .shareGroup(shareGroupId, shareEmail.trim(), shareAccessLevel);
      const updated = await useGroupSharingStore.getState().sharedByMe;
      setGroupShares(updated.filter((s) => s.groupId === shareGroupId));
      setShareEmail('');
    } catch {
      Alert.alert(t('groupSharing.shareError'), t('groupSharing.shareError'));
    }
  }, [shareEmail, shareGroupId, shareAccessLevel, t]);

  const handleRevokeShare = useCallback(
    async (shareId: number) => {
      Alert.alert(t('groupSharing.revoke'), t('groupSharing.revoke') + '?', [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('groupSharing.revoke'),
          style: 'destructive',
          onPress: async () => {
            try {
              await useGroupSharingStore.getState().revokeShare(shareId);
              setGroupShares((prev) => prev.filter((s) => s.id !== shareId));
            } catch {
              // silent
            }
          },
        },
      ]);
    },
    [t],
  );

  const handleUpdateShareAccess = useCallback(async (shareId: number, newLevel: string) => {
    try {
      await useGroupSharingStore.getState().updateAccess(shareId, newLevel);
      setGroupShares((prev) =>
        prev.map((s) => (s.id === shareId ? { ...s, accessLevel: newLevel } : s)),
      );
    } catch {
      // silent
    }
  }, []);

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
        addRuleBtnText: {
          color: theme.primary,
          fontWeight: fontWeight.bold,
          fontSize: fontSize.sm,
        },
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
        modalActions: {
          flexDirection: 'row',
          gap: spacing.sm,
          justifyContent: 'flex-end',
          marginTop: spacing.sm,
        },
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
      <Text style={styles.title} accessibilityRole="header">
        {t('groups.title')}
      </Text>

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
        data={flatGroups}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => {
          const { name, miners: members, depth } = item;
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
          const groupConfig = groupConfigs.find((c) => c.name === name);
          const indent = depth * 20;
          return (
            <Animated.View
              style={[
                styles.groupCard,
                isDragged && { transform: [{ scale }], zIndex: 100, elevation },
                isHovered && isDropTarget && { borderColor: theme.primary, borderWidth: 2 },
                isDropTarget &&
                  !isHovered && { borderColor: theme.primary + '40', borderWidth: 1.5 },
                depth > 0 && {
                  marginLeft: indent,
                  borderLeftWidth: 3,
                  borderLeftColor: groupConfig?.color || theme.primary + '40',
                },
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
                  <Text
                    style={styles.groupName}
                    accessibilityRole="header"
                    accessibilityLabel={`Group: ${name}`}
                  >
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
                      {t('groups.avgTemp', { temp: stats.avgTemp.toFixed(0) })}
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
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('groupSharing.shareGroup')}
                    style={[styles.actionBtn, { borderColor: theme.accent }]}
                    onPress={() => openShareModal(name)}
                  >
                    <Text style={[styles.actionBtnText, { color: theme.accent }]}>
                      {t('groupSharing.shareGroup')}
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
            <Text
              style={{ color: theme.textDim, fontSize: fontSize.sm, paddingVertical: spacing.xs }}
            >
              {t('groups.noRules')}
            </Text>
          )}
          {rules.map((rule) => (
            <View key={rule.id} style={styles.ruleRow}>
              <Text
                style={{
                  fontSize: fontSize.lg,
                  color: rule.enabled ? theme.success : theme.textMuted,
                }}
              >
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
              style={[
                styles.addRuleBtn,
                { borderWidth: 1, borderColor: theme.primary + '40', marginTop: 4 },
              ]}
              onPress={applyRules}
            >
              <Text style={styles.addRuleBtnText}>{t('groups.applyRules')}</Text>
            </Pressable>
          )}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Toggle group alerts"
        style={styles.rulesToggle}
        onPress={() => setShowGroupAlerts((s) => !s)}
      >
        <Text style={styles.rulesToggleText}>{t('groups.groupAlerts')}</Text>
        <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>
          {showGroupAlerts ? '▲' : '▼'}
        </Text>
      </Pressable>
      {showGroupAlerts && (
        <View style={{ marginBottom: 16 }}>
          {groupAlerts.length === 0 && (
            <Text
              style={{ color: theme.textDim, fontSize: fontSize.sm, paddingVertical: spacing.xs }}
            >
              {t('groups.noGroupAlerts')}
            </Text>
          )}
          {groupAlerts.map((alert) => (
            <View key={alert.id} style={styles.ruleRow}>
              <Text
                style={{
                  fontSize: fontSize.lg,
                  color: alert.enabled ? theme.success : theme.textMuted,
                }}
              >
                {alert.enabled ? '✓' : '○'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('groups.editRule')}
                style={styles.ruleInfo}
                onPress={() => {
                  setEditingAlert(alert);
                  setAlertType(alert.type);
                  setAlertThreshold(String(alert.threshold));
                  setAlertGroupId(alert.groupId);
                  setShowAlertEditor(true);
                }}
              >
                <Text style={styles.ruleField}>{alert.groupId}</Text>
                <Text style={styles.rulePattern}>{alert.type}</Text>
                <Text style={styles.ruleGroup}>≥ {alert.threshold}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  alert.enabled ? t('groups.alertDisabled') : t('groups.alertEnabled')
                }
                hitSlop={8}
                onPress={() => toggleGroupAlert(alert.id)}
                style={{ padding: 4 }}
              >
                <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>
                  {alert.enabled ? t('groups.off') : t('groups.on')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('groups.deleteRule')}
                hitSlop={8}
                onPress={() => deleteGroupAlert(alert.id)}
                style={{ padding: 4, marginLeft: 4 }}
              >
                <Text style={{ color: theme.danger, fontSize: fontSize.sm }}>✕</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('groups.addGroupAlert')}
            style={styles.addRuleBtn}
            onPress={() => {
              setEditingAlert(null);
              setAlertType('offline_count');
              setAlertThreshold('3');
              setAlertGroupId(groups[0]?.[0] || '');
              setShowAlertEditor(true);
            }}
          >
            <Text style={styles.addRuleBtnText}>{t('groups.addGroupAlert')}</Text>
          </Pressable>
          {groupAlerts.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('groups.groupAlerts')}
              style={[
                styles.addRuleBtn,
                { borderWidth: 1, borderColor: theme.primary + '40', marginTop: 4 },
              ]}
              onPress={evaluateGroupAlerts}
            >
              <Text style={styles.addRuleBtnText}>{t('groups.groupAlerts')}</Text>
            </Pressable>
          )}
        </View>
      )}
      <Modal
        visible={showRuleEditor}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRuleEditor(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingRule ? t('groups.editRule') : t('groups.newRule')}
            </Text>
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
              {t('groups.matchField')}
            </Text>
            <View style={styles.pickerRow}>
              {(['ip', 'name', 'tag'] as const).map((f) => (
                <Pressable
                  key={f}
                  accessibilityRole="button"
                  accessibilityLabel={
                    f === 'ip'
                      ? t('groups.fieldIP')
                      : f === 'name'
                        ? t('groups.fieldName')
                        : t('groups.fieldTag')
                  }
                  style={[
                    styles.fieldChip,
                    {
                      backgroundColor: ruleField === f ? theme.primary + '20' : theme.surfaceLight,
                      borderColor: ruleField === f ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setRuleField(f)}
                >
                  <Text
                    style={[
                      styles.fieldChipText,
                      { color: ruleField === f ? theme.primary : theme.textMuted },
                    ]}
                  >
                    {f === 'ip'
                      ? t('groups.fieldIP')
                      : f === 'name'
                        ? t('groups.fieldName')
                        : t('groups.fieldTag')}
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
              accessibilityLabel="Rule pattern"
            />
            <TextInput
              style={styles.ruleInput}
              value={ruleGroup}
              onChangeText={setRuleGroup}
              placeholder={t('groups.targetGroupPlaceholder')}
              placeholderTextColor={theme.textMuted}
              accessibilityLabel="Target group name"
            />
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                style={[
                  styles.ruleInput,
                  { flex: 0, paddingHorizontal: 16, borderColor: theme.border },
                ]}
                onPress={() => setShowRuleEditor(false)}
              >
                <Text style={{ color: theme.textMuted }}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={editingRule ? t('common.save') : t('common.add')}
                style={[
                  styles.ruleInput,
                  {
                    flex: 0,
                    paddingHorizontal: 16,
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
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
      <Modal
        visible={showAlertEditor}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAlertEditor(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingAlert ? t('groups.editRule') : t('groups.addGroupAlert')}
            </Text>
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
              {t('groups.alertType')}
            </Text>
            <View style={styles.pickerRow}>
              {(['offline_count', 'temp_high', 'hashrate_drop', 'efficiency_drop'] as const).map(
                (tp) => (
                  <Pressable
                    key={tp}
                    accessibilityRole="button"
                    accessibilityLabel={tp}
                    style={[
                      styles.fieldChip,
                      {
                        backgroundColor:
                          alertType === tp ? theme.primary + '20' : theme.surfaceLight,
                        borderColor: alertType === tp ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setAlertType(tp)}
                  >
                    <Text
                      style={[
                        styles.fieldChipText,
                        { color: alertType === tp ? theme.primary : theme.textMuted },
                      ]}
                    >
                      {tp === 'offline_count'
                        ? t('groups.alertOfflineCount')
                        : tp === 'temp_high'
                          ? t('groups.alertTempHigh')
                          : tp === 'hashrate_drop'
                            ? t('groups.alertHashrateDrop')
                            : t('groups.alertEfficiencyDrop')}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
            <TextInput
              style={styles.ruleInput}
              value={alertThreshold}
              onChangeText={setAlertThreshold}
              placeholder={t('groups.alertThreshold')}
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
              accessibilityLabel="Alert threshold value"
            />
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs, marginTop: 8 }}>
              {t('groups.parentGroup')}
            </Text>
            <View style={styles.pickerRow}>
              {groups.map(([name]) => (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityLabel={name}
                  style={[
                    styles.fieldChip,
                    {
                      backgroundColor:
                        alertGroupId === name ? theme.primary + '20' : theme.surfaceLight,
                      borderColor: alertGroupId === name ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setAlertGroupId(name)}
                >
                  <Text
                    style={[
                      styles.fieldChipText,
                      { color: alertGroupId === name ? theme.primary : theme.textMuted },
                    ]}
                  >
                    {name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                style={[
                  styles.ruleInput,
                  { flex: 0, paddingHorizontal: 16, borderColor: theme.border },
                ]}
                onPress={() => setShowAlertEditor(false)}
              >
                <Text style={{ color: theme.textMuted }}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={editingAlert ? t('common.save') : t('common.add')}
                style={[
                  styles.ruleInput,
                  {
                    flex: 0,
                    paddingHorizontal: 16,
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={addGroupAlert}
              >
                <Text style={{ color: '#FFF', fontWeight: fontWeight.bold }}>
                  {editingAlert ? t('common.save') : t('common.add')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showShareModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('groupSharing.shareGroup')}</Text>
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
              {t('groupSharing.shareWith')} {shareGroupId}
            </Text>
            <TextInput
              style={styles.ruleInput}
              value={shareEmail}
              onChangeText={setShareEmail}
              placeholder={t('groupSharing.email')}
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Email address to share with"
            />
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
              {t('groupSharing.accessLevel')}
            </Text>
            <View style={styles.pickerRow}>
              {(['view', 'edit'] as const).map((lvl) => (
                <Pressable
                  key={lvl}
                  accessibilityRole="button"
                  accessibilityLabel={
                    lvl === 'view' ? t('groupSharing.view') : t('groupSharing.edit')
                  }
                  style={[
                    styles.fieldChip,
                    {
                      backgroundColor:
                        shareAccessLevel === lvl ? theme.primary + '20' : theme.surfaceLight,
                      borderColor: shareAccessLevel === lvl ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setShareAccessLevel(lvl)}
                >
                  <Text
                    style={[
                      styles.fieldChipText,
                      { color: shareAccessLevel === lvl ? theme.primary : theme.textMuted },
                    ]}
                  >
                    {lvl === 'view' ? t('groupSharing.view') : t('groupSharing.edit')}
                  </Text>
                </Pressable>
              ))}
            </View>
            {groupShares.length > 0 && (
              <View style={{ marginTop: spacing.xs }}>
                <Text
                  style={{ color: theme.textDim, fontSize: fontSize.xs, marginBottom: spacing.xxs }}
                >
                  {t('groupSharing.sharedByMe')}
                </Text>
                {groupShares.map((share) => (
                  <View key={share.id} style={styles.ruleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rulePattern}>{share.sharedWithEmail}</Text>
                      <Text style={styles.ruleGroup}>{share.accessLevel}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('groupSharing.revoke')}
                      style={{ padding: 4 }}
                      onPress={() => handleRevokeShare(share.id)}
                    >
                      <Text style={{ color: theme.danger, fontSize: fontSize.sm }}>
                        {t('groupSharing.revoke')}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('groupSharing.accessLevel')}
                      style={{ padding: 4, marginLeft: 4 }}
                      onPress={() =>
                        handleUpdateShareAccess(
                          share.id,
                          share.accessLevel === 'view' ? 'edit' : 'view',
                        )
                      }
                    >
                      <Text style={{ color: theme.primary, fontSize: fontSize.sm }}>
                        {share.accessLevel === 'view'
                          ? t('groupSharing.edit')
                          : t('groupSharing.view')}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            {groupShares.length === 0 && (
              <Text
                style={{ color: theme.textDim, fontSize: fontSize.sm, paddingVertical: spacing.xs }}
              >
                {t('groupSharing.noShares')}
              </Text>
            )}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                style={[
                  styles.ruleInput,
                  { flex: 0, paddingHorizontal: 16, borderColor: theme.border },
                ]}
                onPress={() => setShowShareModal(false)}
              >
                <Text style={{ color: theme.textMuted }}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('groupSharing.shareGroup')}
                style={[
                  styles.ruleInput,
                  {
                    flex: 0,
                    paddingHorizontal: 16,
                    backgroundColor: theme.accent,
                    borderColor: theme.accent,
                  },
                ]}
                onPress={submitShare}
              >
                <Text style={{ color: '#FFF', fontWeight: fontWeight.bold }}>
                  {t('groupSharing.shareGroup')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
