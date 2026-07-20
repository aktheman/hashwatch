import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, fontSize, fontWeight, radius } from '../utils/design';
import { useAuthStore } from '../store/auth';
import {
  fetchMarketplaceListings,
  fetchMyListings,
  createMarketplaceListing,
  deleteMarketplaceListing,
  type MarketplaceListing,
} from '../api/client';
import * as haptic from '../utils/haptics';

interface MarketplaceScreenProps {
  navigation?: { goBack: () => void };
}

const CONDITION_KEYS: Record<string, string> = {
  like_new: 'likeNew',
  good: 'goodCondition',
  fair: 'fairCondition',
};

const CONDITION_COLORS: Record<string, string> = {
  like_new: '#10B981',
  good: '#3B82F6',
  fair: '#F59E0B',
};

const PLACEHOLDER_ICONS = ['⚡', '🔧', '💎', '📡', '🖥️', '⚙️'];

export function MarketplaceScreen(_props: MarketplaceScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { token } = useAuthStore();

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createPrice, setCreatePrice] = useState('');
  const [createCurrency, setCreateCurrency] = useState('USD');
  const [createModel, setCreateModel] = useState('');
  const [createCondition, setCreateCondition] = useState('good');
  const [createLocation, setCreateLocation] = useState('');
  const [creating, setCreating] = useState(false);

  const [showMyListings, setShowMyListings] = useState(false);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);

  const fetchData = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const data = await fetchMarketplaceListings(pageNum, 20);
      if (append) {
        setListings((prev) => [...prev, ...data.listings]);
      } else {
        setListings(data.listings);
      }
      setHasMore(data.listings.length === 20);
      setPage(pageNum);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(1, false);
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(1, false);
    setRefreshing(false);
  }, [fetchData]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchData(page + 1, true);
    }
  }, [hasMore, loading, page, fetchData]);

  const handleCreate = useCallback(async () => {
    if (
      !createTitle.trim() ||
      !createPrice.trim() ||
      !createModel.trim() ||
      !createLocation.trim()
    ) {
      return;
    }
    const price = parseFloat(createPrice);
    if (isNaN(price) || price <= 0) return;

    setCreating(true);
    try {
      await createMarketplaceListing({
        title: createTitle.trim(),
        description: createDescription.trim(),
        price,
        currency: createCurrency.trim() || 'USD',
        model: createModel.trim(),
        condition: createCondition,
        location: createLocation.trim(),
      });
      haptic.success();
      Alert.alert(t('common.success'), t('marketplace.newListing'));
      setShowCreate(false);
      setCreateTitle('');
      setCreateDescription('');
      setCreatePrice('');
      setCreateModel('');
      setCreateCondition('good');
      setCreateLocation('');
      fetchData(1, false);
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setCreating(false);
    }
  }, [
    createTitle,
    createDescription,
    createPrice,
    createCurrency,
    createModel,
    createCondition,
    createLocation,
    t,
    fetchData,
  ]);

  const handleDelete = useCallback(
    async (id: string) => {
      Alert.alert(t('marketplace.deleteListing'), t('marketplace.deleteListing'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMarketplaceListing(id);
              haptic.success();
              setListings((prev) => prev.filter((l) => l.id !== id));
              setMyListings((prev) => prev.filter((l) => l.id !== id));
            } catch {
              Alert.alert(t('common.error'), t('common.error'));
            }
          },
        },
      ]);
    },
    [t],
  );

  const loadMyListings = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchMyListings();
      setMyListings(data);
    } catch {
      // silent
    }
  }, [token]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
        },
        content: {
          padding: spacing.md,
          paddingBottom: spacing.xxl,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.md,
          paddingHorizontal: spacing.xxs,
        },
        title: {
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
          color: theme.text,
          letterSpacing: -0.5,
        },
        headerActions: {
          flexDirection: 'row',
          gap: spacing.xs,
        },
        headerBtn: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: radius.md,
          borderWidth: 1,
        },
        headerBtnText: {
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        grid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
        },
        listingCard: {
          width: '47%',
          backgroundColor: theme.surface,
          borderRadius: radius.xl,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: theme.border,
          boxShadow: `0 2px 12px ${theme.glow}`,
        },
        listingIcon: {
          width: '100%',
          height: 80,
          borderRadius: radius.md,
          backgroundColor: theme.surfaceLight,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing.sm,
        },
        listingIconText: {
          fontSize: 32,
        },
        listingTitle: {
          fontSize: fontSize.md,
          fontWeight: fontWeight.bold,
          color: theme.text,
          marginBottom: spacing.xxs,
        },
        listingPrice: {
          fontSize: fontSize.lg,
          fontWeight: fontWeight.extrabold,
          color: theme.primary,
          marginBottom: spacing.xs,
        },
        conditionBadge: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: radius.sm,
          alignSelf: 'flex-start',
          marginBottom: spacing.xs,
        },
        conditionText: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
          color: '#fff',
        },
        listingLocation: {
          fontSize: fontSize.xs,
          color: theme.textMuted,
        },
        emptyContainer: {
          alignItems: 'center',
          paddingTop: spacing.xxl * 2,
          gap: spacing.md,
        },
        emptyIcon: {
          fontSize: 48,
          color: theme.textMuted,
        },
        emptyText: {
          fontSize: fontSize.lg,
          color: theme.textDim,
          fontWeight: fontWeight.semibold,
        },
        fab: {
          position: 'absolute',
          bottom: spacing.lg,
          right: spacing.lg,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.primary,
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: `0 4px 16px ${theme.primary}40`,
        },
        fabText: {
          fontSize: 28,
          color: '#fff',
          marginTop: -2,
        },
        modal: {
          flex: 1,
          backgroundColor: theme.bg,
          padding: spacing.lg,
        },
        modalHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.lg,
          paddingTop: spacing.xs,
        },
        modalTitle: {
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
          color: theme.text,
        },
        modalClose: {
          fontSize: fontSize.xl,
          color: theme.textMuted,
          padding: spacing.xs,
        },
        formField: {
          marginBottom: spacing.md,
        },
        formLabel: {
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          color: theme.textDim,
          marginBottom: spacing.xxs,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        formInput: {
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.md,
          padding: spacing.sm,
          color: theme.text,
          fontSize: fontSize.base,
          borderWidth: 1,
          borderColor: theme.border,
        },
        formInputMultiline: {
          minHeight: 80,
          textAlignVertical: 'top',
        },
        conditionPicker: {
          flexDirection: 'row',
          gap: spacing.xs,
        },
        conditionOption: {
          flex: 1,
          padding: spacing.sm,
          borderRadius: radius.md,
          borderWidth: 2,
          alignItems: 'center',
        },
        conditionOptionText: {
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        submitBtn: {
          backgroundColor: theme.primary,
          borderRadius: radius.md,
          padding: spacing.md,
          alignItems: 'center',
          marginTop: spacing.md,
        },
        submitBtnText: {
          color: '#fff',
          fontSize: fontSize.md,
          fontWeight: fontWeight.bold,
        },
        submitBtnDisabled: {
          opacity: 0.5,
        },
        detailCard: {
          backgroundColor: theme.surface,
          borderRadius: radius.xl,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: theme.border,
        },
        detailTitle: {
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
          color: theme.text,
          marginBottom: spacing.sm,
        },
        detailPrice: {
          fontSize: fontSize.h2,
          fontWeight: fontWeight.extrabold,
          color: theme.primary,
          marginBottom: spacing.md,
        },
        detailLabel: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
          color: theme.textDim,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: spacing.xxs,
          marginTop: spacing.sm,
        },
        detailValue: {
          fontSize: fontSize.base,
          color: theme.text,
          lineHeight: 22,
        },
        contactBtn: {
          backgroundColor: theme.primary,
          borderRadius: radius.md,
          padding: spacing.md,
          alignItems: 'center',
          marginTop: spacing.lg,
        },
        contactBtnText: {
          color: '#fff',
          fontSize: fontSize.md,
          fontWeight: fontWeight.bold,
        },
        sellerInfo: {
          fontSize: fontSize.sm,
          color: theme.textMuted,
          marginBottom: spacing.sm,
        },
        loadMore: {
          alignItems: 'center',
          paddingVertical: spacing.lg,
        },
        loadMoreText: {
          color: theme.primary,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        myListingRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.surface,
          padding: spacing.md,
          borderRadius: radius.md,
          marginBottom: spacing.xs,
          borderWidth: 1,
          borderColor: theme.border,
        },
        myListingTitle: {
          fontSize: fontSize.md,
          fontWeight: fontWeight.semibold,
          color: theme.text,
          flex: 1,
        },
        myListingPrice: {
          fontSize: fontSize.md,
          fontWeight: fontWeight.bold,
          color: theme.primary,
          marginRight: spacing.md,
        },
        deleteBtn: {
          backgroundColor: theme.danger + '1A',
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: radius.sm,
        },
        deleteBtnText: {
          color: theme.danger,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
        },
      }),
    [theme],
  );

  const getPlaceholderIcon = (idx: number) => PLACEHOLDER_ICONS[idx % PLACEHOLDER_ICONS.length];

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('marketplace.title')}</Text>
          <View style={styles.headerActions}>
            {token ? (
              <Pressable
                style={[styles.headerBtn, { borderColor: theme.primary }]}
                onPress={() => {
                  haptic.light();
                  loadMyListings();
                  setShowMyListings(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('marketplace.myListings')}
              >
                <Text style={[styles.headerBtnText, { color: theme.primary }]}>
                  {t('marketplace.myListings')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {listings.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏪</Text>
            <Text style={styles.emptyText}>{t('marketplace.noListings')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              {listings.map((listing, idx) => (
                <Pressable
                  key={listing.id}
                  style={styles.listingCard}
                  onPress={() => {
                    haptic.light();
                    setSelectedListing(listing);
                    setShowDetail(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${listing.title} - ${listing.price} ${listing.currency}`}
                >
                  <View style={styles.listingIcon}>
                    <Text style={styles.listingIconText}>{getPlaceholderIcon(idx)}</Text>
                  </View>
                  <Text style={styles.listingTitle} numberOfLines={2}>
                    {listing.title}
                  </Text>
                  <View
                    style={[
                      styles.conditionBadge,
                      { backgroundColor: CONDITION_COLORS[listing.condition] || theme.info },
                    ]}
                  >
                    <Text style={styles.conditionText}>
                      {t(`marketplace.${CONDITION_KEYS[listing.condition] || listing.condition}`)}
                    </Text>
                  </View>
                  <Text style={styles.listingPrice}>
                    {listing.currency} {listing.price.toFixed(2)}
                  </Text>
                  <Text style={styles.listingLocation}>📍 {listing.location}</Text>
                </Pressable>
              ))}
            </View>
            {hasMore && (
              <Pressable style={styles.loadMore} onPress={loadMore} accessibilityRole="button">
                <Text style={styles.loadMoreText}>{t('common.retry')}</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => {
          if (!token) {
            Alert.alert(t('common.error'), t('common.offline'));
            return;
          }
          haptic.medium();
          setShowCreate(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={t('marketplace.createListing')}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* Detail Modal */}
      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('marketplace.title')}</Text>
            <Pressable
              onPress={() => setShowDetail(false)}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          {selectedListing && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>{selectedListing.title}</Text>
                <Text style={styles.detailPrice}>
                  {selectedListing.currency} {selectedListing.price.toFixed(2)}
                </Text>
                <View
                  style={[
                    styles.conditionBadge,
                    {
                      backgroundColor: CONDITION_COLORS[selectedListing.condition] || theme.info,
                    },
                  ]}
                >
                  <Text style={styles.conditionText}>
                    {t(
                      `marketplace.${CONDITION_KEYS[selectedListing.condition] || selectedListing.condition}`,
                    )}
                  </Text>
                </View>
                <Text style={styles.detailLabel}>{t('marketplace.model')}</Text>
                <Text style={styles.detailValue}>{selectedListing.model}</Text>
                <Text style={styles.detailLabel}>{t('marketplace.location')}</Text>
                <Text style={styles.detailValue}>{selectedListing.location}</Text>
                <Text style={styles.detailLabel}>{t('marketplace.description')}</Text>
                <Text style={styles.detailValue}>{selectedListing.description}</Text>
                <Text style={styles.sellerInfo}>
                  {t('marketplace.contactSeller')} • {selectedListing.sellerId}
                </Text>
                <Pressable
                  style={styles.contactBtn}
                  onPress={() => {
                    haptic.medium();
                    Alert.alert(t('marketplace.contactSeller'), t('marketplace.contactSeller'), [
                      { text: t('common.ok') },
                    ]);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('marketplace.contactSeller')}
                >
                  <Text style={styles.contactBtnText}>{t('marketplace.contactSeller')}</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Create Listing Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('marketplace.newListing')}</Text>
            <Pressable
              onPress={() => setShowCreate(false)}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>{t('marketplace.newListing')}</Text>
              <TextInput
                style={styles.formInput}
                value={createTitle}
                onChangeText={setCreateTitle}
                placeholder={t('marketplace.newListing')}
                placeholderTextColor={theme.textMuted}
                accessibilityLabel={t('marketplace.newListing')}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>{t('marketplace.model')}</Text>
              <TextInput
                style={styles.formInput}
                value={createModel}
                onChangeText={setCreateModel}
                placeholder="BitAxe Ultra"
                placeholderTextColor={theme.textMuted}
                accessibilityLabel={t('marketplace.model')}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>{t('marketplace.price')}</Text>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <TextInput
                  style={[styles.formInput, { width: 80 }]}
                  value={createCurrency}
                  onChangeText={setCreateCurrency}
                  placeholder="USD"
                  placeholderTextColor={theme.textMuted}
                  accessibilityLabel="Currency"
                />
                <TextInput
                  style={[styles.formInput, { flex: 1 }]}
                  value={createPrice}
                  onChangeText={setCreatePrice}
                  placeholder="0.00"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="decimal-pad"
                  accessibilityLabel={t('marketplace.price')}
                />
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>{t('marketplace.condition')}</Text>
              <View style={styles.conditionPicker}>
                {(['like_new', 'good', 'fair'] as const).map((cond) => (
                  <Pressable
                    key={cond}
                    style={[
                      styles.conditionOption,
                      {
                        borderColor:
                          createCondition === cond ? CONDITION_COLORS[cond] : theme.border,
                        backgroundColor:
                          createCondition === cond ? CONDITION_COLORS[cond] + '15' : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      haptic.selection();
                      setCreateCondition(cond);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t(`marketplace.${CONDITION_KEYS[cond]}`)}
                  >
                    <Text
                      style={[
                        styles.conditionOptionText,
                        {
                          color: createCondition === cond ? CONDITION_COLORS[cond] : theme.text,
                        },
                      ]}
                    >
                      {t(`marketplace.${CONDITION_KEYS[cond]}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>{t('marketplace.location')}</Text>
              <TextInput
                style={styles.formInput}
                value={createLocation}
                onChangeText={setCreateLocation}
                placeholder="New York, NY"
                placeholderTextColor={theme.textMuted}
                accessibilityLabel={t('marketplace.location')}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>{t('marketplace.description')}</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                value={createDescription}
                onChangeText={setCreateDescription}
                placeholder={t('marketplace.description')}
                placeholderTextColor={theme.textMuted}
                multiline
                accessibilityLabel={t('marketplace.description')}
              />
            </View>
            <Pressable
              style={[
                styles.submitBtn,
                (!createTitle.trim() ||
                  !createPrice.trim() ||
                  !createModel.trim() ||
                  !createLocation.trim()) &&
                  styles.submitBtnDisabled,
              ]}
              onPress={handleCreate}
              disabled={
                creating ||
                !createTitle.trim() ||
                !createPrice.trim() ||
                !createModel.trim() ||
                !createLocation.trim()
              }
              accessibilityRole="button"
              accessibilityLabel={t('marketplace.createListing')}
            >
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>{t('marketplace.createListing')}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* My Listings Modal */}
      <Modal visible={showMyListings} animationType="slide" transparent>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('marketplace.myListings')}</Text>
            <Pressable
              onPress={() => setShowMyListings(false)}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {myListings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>{t('marketplace.noListings')}</Text>
              </View>
            ) : (
              myListings.map((listing) => (
                <View key={listing.id} style={styles.myListingRow}>
                  <Text style={styles.myListingTitle} numberOfLines={1}>
                    {listing.title}
                  </Text>
                  <Text style={styles.myListingPrice}>
                    {listing.currency} {listing.price.toFixed(2)}
                  </Text>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(listing.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('marketplace.deleteListing')}
                  >
                    <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
