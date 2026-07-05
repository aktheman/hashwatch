import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight, buttonText } from '../utils/design';
import { SkeletonCard } from '../components/SkeletonCard';
import { Wallet } from '../types';
import * as DB from '../db/database';
import { useMinerStore } from '../store/miners';
import { useToastStore } from '../store/toast';
import { isValidBitcoinAddress } from '../utils/bitcoin';

const WALLET_COLORS = [
  '#6C63FF',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#3B82F6',
  '#EC4899',
  '#8B5CF6',
  '#14B8A6',
];

export function WalletsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [color, setColor] = useState(WALLET_COLORS[0]);

  useEffect(() => {
    DB.loadWallets().then((w) => {
      setWallets(w);
      setLoading(false);
    });
  }, []);

  const loadWallets = async () => {
    const w = await DB.loadWallets();
    setWallets(w);
  };

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWallets();
    setRefreshing(false);
  }, []);

  const openCreate = () => {
    setEditingWallet(null);
    setName('');
    setAddress('');
    setColor(WALLET_COLORS[0]);
    setModalVisible(true);
  };

  const openEdit = (w: Wallet) => {
    setEditingWallet(w);
    setName(w.name);
    setAddress(w.address);
    setColor(w.color);
    setModalVisible(true);
  };

  const save = async () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert(t('wallets.validation'), t('wallets.validationBody'));
      return;
    }
    if (!isValidBitcoinAddress(address.trim())) {
      Alert.alert(t('wallets.invalidAddress'), t('wallets.invalidAddressBody'));
      return;
    }
    const w: Wallet = editingWallet
      ? { ...editingWallet, name: name.trim(), address: address.trim(), color }
      : {
          id: `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: name.trim(),
          address: address.trim(),
          color,
          createdAt: Date.now(),
        };
    await DB.saveWallet(w);
    setModalVisible(false);
    await loadWallets();
  };

  const remove = (id: string, name: string) => {
    Alert.alert(t('wallets.deleteWallet'), t('wallets.deleteWalletBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          useToastStore.getState().showUndo({
            id: `wallet-${id}`,
            message: t('wallets.walletRemoved', { name }),
            onUndo: () => {},
            onConfirm: async () => {
              await DB.deleteWallet(id);
              await loadWallets();
            },
          });
        },
      },
    ]);
  };

  const minerCount = (walletId: string) => miners.filter((m) => m.walletId === walletId).length;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.bg },
        headerBar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.xs,
        },
        headerTitle: {
          color: theme.text,
          fontSize: fontSize.h1,
          fontWeight: fontWeight.extrabold,
          letterSpacing: -0.5,
        },
        headerSub: { color: theme.textDim, fontSize: fontSize.xs, marginTop: spacing.xxs },
        empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
        emptyIcon: { fontSize: 48, color: theme.textMuted, marginBottom: spacing.md },
        emptyTitle: {
          color: theme.text,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.xs,
        },
        emptyText: {
          color: theme.textDim,
          fontSize: fontSize.base,
          textAlign: 'center',
          lineHeight: 20,
        },
        card: {
          backgroundColor: theme.surface,
          marginHorizontal: spacing.md,
          marginBottom: spacing.sm,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: theme.border,
        },
        cardTop: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        colorDot: { width: 14, height: 14, borderRadius: 7, marginRight: spacing.md },
        walletName: {
          color: theme.text,
          fontSize: fontSize.md,
          fontWeight: fontWeight.bold,
          flex: 1,
        },
        walletAddress: {
          color: theme.textDim,
          fontSize: fontSize.xs,
          fontFamily: 'monospace',
          marginTop: spacing.xxs,
          marginLeft: 26,
        },
        badge: {
          backgroundColor: theme.surfaceLight,
          paddingHorizontal: spacing.xs,
          paddingVertical: spacing.xxs,
          borderRadius: radius.sm,
        },
        badgeText: { color: theme.textDim, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
        cardActions: {
          flexDirection: 'row',
          gap: spacing.xs,
          marginTop: spacing.xs,
          marginLeft: 26,
        },
        actionBtn: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: radius.sm,
        },
        actionBtnEdit: { backgroundColor: theme.primary + '20' },
        actionBtnDelete: { backgroundColor: theme.danger + '20' },
        actionText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
        actionTextEdit: { color: theme.primary },
        actionTextDelete: { color: theme.danger },
        addBtn: {
          marginHorizontal: spacing.md,
          marginTop: spacing.xs,
          marginBottom: spacing.xl,
          backgroundColor: theme.primary,
          padding: spacing.md,
          borderRadius: radius.md,
          alignItems: 'center',
        },
        addBtnText: { color: buttonText, fontSize: fontSize.md, fontWeight: fontWeight.bold },
        modalOverlay: {
          flex: 1,
          backgroundColor: theme.bg + '99',
          justifyContent: 'flex-end',
        },
        modalContent: {
          backgroundColor: theme.surface,
          borderTopLeftRadius: radius.xxl,
          borderTopRightRadius: radius.xxl,
          padding: spacing.xl,
          paddingBottom: 40,
        },
        modalTitle: {
          color: theme.text,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.md,
        },
        label: {
          color: theme.textDim,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold,
          marginBottom: spacing.xxs,
          marginTop: spacing.xs,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        input: {
          backgroundColor: theme.bg,
          color: theme.text,
          borderRadius: radius.md,
          padding: spacing.md,
          fontSize: fontSize.md,
          borderWidth: 1,
          borderColor: theme.border,
        },
        colorRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
        colorCircle: { width: 32, height: 32, borderRadius: radius.lg, borderWidth: 2 },
        colorCircleSelected: { borderColor: buttonText },
        colorCircleUnselected: { borderColor: 'transparent' },
        modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
        modalCancel: {
          flex: 1,
          backgroundColor: theme.surfaceLight,
          padding: spacing.md,
          borderRadius: radius.md,
          alignItems: 'center',
        },
        modalSave: {
          flex: 1,
          backgroundColor: theme.primary,
          padding: spacing.md,
          borderRadius: radius.md,
          alignItems: 'center',
        },
        modalCancelText: {
          color: theme.text,
          fontSize: fontSize.md,
          fontWeight: fontWeight.semibold,
        },
        modalSaveText: { color: buttonText, fontSize: fontSize.md, fontWeight: fontWeight.bold },
        list: { paddingTop: spacing.xs, paddingBottom: 40 },
      }),
    [theme],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>{t('wallets.title')}</Text>
          <Text style={styles.headerSub}>
            {t('wallets.walletCount', { count: wallets.length })}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ paddingTop: 8 }}>
          <SkeletonCard rows={2} />
          <SkeletonCard rows={2} />
        </View>
      ) : wallets.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💼</Text>
          <Text style={styles.emptyTitle}>{t('wallets.noWallets')}</Text>
          <Text style={styles.emptyText}>{t('wallets.noWalletsBody')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create Wallet"
            style={styles.addBtn}
            onPress={openCreate}
          >
            <Text style={styles.addBtnText}>{t('wallets.createWallet')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={wallets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add Wallet"
              style={styles.addBtn}
              onPress={openCreate}
            >
              <Text style={styles.addBtnText}>{t('wallets.addWallet')}</Text>
            </Pressable>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  <Text style={styles.walletName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {t('wallets.minerCount', { count: minerCount(item.id) })}
                  </Text>
                </View>
              </View>
              <Text style={styles.walletAddress} numberOfLines={1}>
                {item.address}
              </Text>
              <View style={styles.cardActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit wallet: ${item.name}`}
                  style={[styles.actionBtn, styles.actionBtnEdit]}
                  onPress={() => openEdit(item)}
                >
                  <Text style={[styles.actionText, styles.actionTextEdit]}>{t('common.edit')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete wallet: ${item.name}`}
                  style={[styles.actionBtn, styles.actionBtnDelete]}
                  onPress={() => remove(item.id, item.name)}
                >
                  <Text style={[styles.actionText, styles.actionTextDelete]}>
                    {t('common.delete')}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingWallet ? t('wallets.editWallet') : t('wallets.newWallet')}
            </Text>
            <Text style={styles.label}>{t('wallets.name')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('wallets.namePlaceholder')}
              placeholderTextColor={theme.textMuted}
              accessibilityLabel="Wallet name input"
            />
            <Text style={styles.label}>{t('wallets.bitcoinAddress')}</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder={t('wallets.addressPlaceholder')}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Bitcoin address input"
            />
            <Text style={styles.label}>{t('wallets.color')}</Text>
            <View style={styles.colorRow}>
              {WALLET_COLORS.map((c) => (
                <Pressable
                  key={c}
                  accessibilityRole="button"
                  accessibilityLabel="Select color"
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    color === c ? styles.colorCircleSelected : styles.colorCircleUnselected,
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save"
                style={styles.modalSave}
                onPress={save}
              >
                <Text style={styles.modalSaveText}>{t('common.save')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
