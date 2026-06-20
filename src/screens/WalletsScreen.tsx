import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
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
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 8,
        },
        headerTitle: { color: theme.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
        headerSub: { color: theme.textDim, fontSize: 12, marginTop: 2 },
        empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
        emptyIcon: { fontSize: 48, color: theme.textMuted, marginBottom: 16 },
        emptyTitle: { color: theme.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
        emptyText: { color: theme.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20 },
        card: {
          backgroundColor: theme.surface,
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.border,
        },
        cardTop: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        colorDot: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
        walletName: { color: theme.text, fontSize: 16, fontWeight: '700', flex: 1 },
        walletAddress: {
          color: theme.textDim,
          fontSize: 11,
          fontFamily: 'monospace',
          marginTop: 4,
          marginLeft: 26,
        },
        badge: {
          backgroundColor: theme.surfaceLight,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 8,
        },
        badgeText: { color: theme.textDim, fontSize: 11, fontWeight: '600' },
        cardActions: { flexDirection: 'row', gap: 8, marginTop: 12, marginLeft: 26 },
        actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
        actionBtnEdit: { backgroundColor: theme.primary + '20' },
        actionBtnDelete: { backgroundColor: theme.danger + '20' },
        actionText: { fontSize: 12, fontWeight: '600' },
        actionTextEdit: { color: theme.primary },
        actionTextDelete: { color: theme.danger },
        addBtn: {
          marginHorizontal: 16,
          marginTop: 8,
          marginBottom: 24,
          backgroundColor: theme.primary,
          padding: 14,
          borderRadius: 14,
          alignItems: 'center',
        },
        addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
        modalOverlay: {
          flex: 1,
          backgroundColor: theme.bg + '99',
          justifyContent: 'flex-end',
        },
        modalContent: {
          backgroundColor: theme.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          paddingBottom: 40,
        },
        modalTitle: { color: theme.text, fontSize: 20, fontWeight: '700', marginBottom: 20 },
        label: {
          color: theme.textDim,
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 6,
          marginTop: 12,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        input: {
          backgroundColor: theme.bg,
          color: theme.text,
          borderRadius: 12,
          padding: 14,
          fontSize: 15,
          borderWidth: 1,
          borderColor: theme.border,
        },
        colorRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
        colorCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
        colorCircleSelected: { borderColor: '#FFF' },
        colorCircleUnselected: { borderColor: 'transparent' },
        modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
        modalCancel: {
          flex: 1,
          backgroundColor: theme.surfaceLight,
          padding: 14,
          borderRadius: 12,
          alignItems: 'center',
        },
        modalSave: {
          flex: 1,
          backgroundColor: theme.primary,
          padding: 14,
          borderRadius: 12,
          alignItems: 'center',
        },
        modalCancelText: { color: theme.text, fontSize: 15, fontWeight: '600' },
        modalSaveText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
        list: { paddingTop: 8, paddingBottom: 40 },
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
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Create Wallet"
            style={styles.addBtn}
            onPress={openCreate}
          >
            <Text style={styles.addBtnText}>{t('wallets.createWallet')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wallets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Add Wallet"
              style={styles.addBtn}
              onPress={openCreate}
            >
              <Text style={styles.addBtnText}>{t('wallets.addWallet')}</Text>
            </TouchableOpacity>
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
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Edit wallet: ${item.name}`}
                  style={[styles.actionBtn, styles.actionBtnEdit]}
                  onPress={() => openEdit(item)}
                >
                  <Text style={[styles.actionText, styles.actionTextEdit]}>{t('common.edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Delete wallet: ${item.name}`}
                  style={[styles.actionBtn, styles.actionBtnDelete]}
                  onPress={() => remove(item.id, item.name)}
                >
                  <Text style={[styles.actionText, styles.actionTextDelete]}>
                    {t('common.delete')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
                <TouchableOpacity
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
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Save"
                style={styles.modalSave}
                onPress={save}
              >
                <Text style={styles.modalSaveText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
