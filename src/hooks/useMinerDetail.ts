import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Alert, Share } from 'react-native';
import { useMinerStore } from '../store/miners';
import { useAuthStore } from '../store/auth';
import { useToastStore } from '../store/toast';
import { MinerSnapshot, Wallet, MinerNoteItem } from '../types';
import * as DB from '../db/database';
import { fetchMinerNotes, addMinerNote, deleteMinerNote, recordPoolChange } from '../api/client';
import { getAlertRules, setAlertRules, DEFAULT_RULES, AlertRule } from '../services/notifications';
import { BitAxeClient } from '../api/bitaxe';
import { analyzeMinerHealth, HealthPrediction } from '../utils/healthPredictions';
import {
  formatHashrate,
  formatTemperature,
  formatPower,
  formatUptime,
  formatWTHs,
} from '../utils/formatters';
import { useTranslation } from 'react-i18next';

export function useMinerDetail(minerId: string) {
  const { t } = useTranslation();

  const miners = useMinerStore((s) => s.miners);
  const refreshMiner = useMinerStore((s) => s.refreshMiner);
  const removeMiner = useMinerStore((s) => s.removeMiner);
  const getSnapshots = useMinerStore((s) => s.getSnapshots);
  const setMinerWallet = useMinerStore((s) => s.setMinerWallet);
  const setMinerIp = useMinerStore((s) => s.setMinerIp);
  const setMinerIcon = useMinerStore((s) => s.setMinerIcon);
  const setMinerLocation = useMinerStore((s) => s.setMinerLocation);
  const setMinerTags = useMinerStore((s) => s.setMinerTags);
  const setMinerNotes = useMinerStore((s) => s.setMinerNotes);
  const setMinerMaintenance = useMinerStore((s) => s.setMinerMaintenance);
  const setMinerGroup = useMinerStore((s) => s.setMinerGroup);

  const [snapshots, setSnapshots] = useState<MinerSnapshot[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [alertRules, setAlertRulesState] = useState<AlertRule | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notes, setNotes] = useState<MinerNoteItem[]>([]);
  const groupDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const miner = miners.find((m) => m.id === minerId);

  const healthPrediction = useMemo<HealthPrediction | null>(() => {
    if (miner && snapshots.length > 0) {
      return analyzeMinerHealth(miner, snapshots);
    } else if (miner) {
      return analyzeMinerHealth(miner, []);
    }
    return null;
  }, [miner, snapshots]);

  useEffect(() => {
    let cancelled = false;
    DB.loadWallets().then((w) => {
      if (cancelled) return;
      setWallets(w);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    getAlertRules(minerId).then(setAlertRulesState);
  }, [minerId]);

  useEffect(() => {
    let cancelled = false;
    if (minerId) {
      getSnapshots(minerId, 50).then((s) => {
        if (cancelled) return;
        setSnapshots(s);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [minerId, miner?.lastSeen]);

  useEffect(() => {
    let cancelled = false;
    const token = useAuthStore.getState().token;
    if (token && minerId) {
      fetchMinerNotes(minerId).then((ns) => {
        if (cancelled) return;
        setNotes(ns);
      });
    } else if (miner?.noteItems) {
      setNotes(miner.noteItems);
    }
    return () => {
      cancelled = true;
    };
  }, [minerId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMiner(minerId);
    setRefreshing(false);
  }, [minerId, refreshMiner]);

  const handleShare = useCallback(async () => {
    if (!miner) return;
    const s = miner.status!;
    const wallet = miner.walletId ? wallets.find((w) => w.id === miner.walletId) : null;
    const msg = [
      `⬡ ${miner.name}`,
      `Hashrate: ${formatHashrate(s.hashRate, s.hashRateUnit)}`,
      `Temp: ${formatTemperature(s.temperature)}`,
      `Power: ${formatPower(s.power)}`,
      `Uptime: ${formatUptime(s.uptimeSeconds)}`,
      `Pool: ${s.pool}${s.poolPort ? `:${s.poolPort}` : ''}`,
      `Efficiency: ${formatWTHs(s.power, s.hashRate, s.hashRateUnit)}`,
      wallet ? `Wallet: ${wallet.name}` : '',
      `IP: ${miner.ip}`,
      '',
      `Shared via HashWatch`,
    ]
      .filter(Boolean)
      .join('\n');
    await Share.share({ message: msg }).catch((e) => console.warn('Share failed:', e));
  }, [miner, wallets]);

  const handleRestart = useCallback(async (): Promise<boolean> => {
    if (!miner) return false;
    try {
      const client = new BitAxeClient(
        miner.ip,
        miner.port,
        miner.apiPath ?? undefined,
        miner.statusPath ?? undefined,
      );
      return await client.restart();
    } catch {
      return false;
    }
  }, [miner]);

  const savePool = useCallback(
    async (url: string, portStr: string, user: string): Promise<boolean> => {
      if (!miner || !url.trim()) return false;
      const port = parseInt(portStr, 10) || 3333;
      const client = new BitAxeClient(
        miner.ip,
        miner.port,
        miner.apiPath ?? undefined,
        miner.statusPath ?? undefined,
      );
      const ok = await client.setPool(url.trim(), port, user.trim());
      if (ok) {
        const s = miner.status!;
        const prevPool = s.pool ? `${s.pool}:${s.poolPort || 3333}` : '';
        const newPool = `${url.trim()}:${port}`;
        try {
          await recordPoolChange(miner.id, prevPool, newPool, Date.now());
        } catch {}
        await refreshMiner(miner.id);
      }
      return ok;
    },
    [miner, refreshMiner],
  );

  const deleteMinerAction = useCallback(() => {
    if (!miner) return;
    useToastStore.getState().showUndo({
      id: `delete-${minerId}`,
      message: t('minerDetail.minerRemoved', { name: miner.name }),
      onUndo: () => {},
      onConfirm: () => removeMiner(minerId),
    });
  }, [miner, minerId, removeMiner, t]);

  const addNote = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !minerId) return;
      try {
        const token = useAuthStore.getState().token;
        if (token) {
          const newNote = await addMinerNote(minerId, trimmed);
          setNotes((prev) => [newNote, ...prev]);
        } else {
          const newNote: MinerNoteItem = {
            id: Date.now(),
            minerid: minerId,
            text: trimmed,
            createdat: new Date().toISOString(),
          };
          setNotes((prev) => {
            const updated = [newNote, ...prev];
            setMinerNotes(minerId, updated.map((n) => n.text).join('\n'), updated);
            return updated;
          });
        }
      } catch {
        Alert.alert(t('minerDetail.error'), t('minerDetail.addNoteFailed'));
      }
    },
    [minerId, setMinerNotes, t],
  );

  const deleteNote = useCallback(
    async (noteId: number) => {
      try {
        const token = useAuthStore.getState().token;
        if (token) {
          await deleteMinerNote(minerId, noteId);
        }
        setNotes((prev) => {
          const updated = prev.filter((n) => n.id !== noteId);
          setMinerNotes(minerId, updated.map((n) => n.text).join('\n'), updated);
          return updated;
        });
      } catch {
        Alert.alert(t('minerDetail.error'), t('minerDetail.deleteNoteFailed'));
      }
    },
    [minerId, setMinerNotes, t],
  );

  const updateAlertRules = useCallback(
    (partial: Partial<AlertRule>) => {
      setAlertRulesState((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...partial };
        setAlertRules(minerId, next);
        return next;
      });
    },
    [minerId],
  );

  const resetAlertRules = useCallback(() => {
    setAlertRulesState(DEFAULT_RULES);
    setAlertRules(minerId, DEFAULT_RULES);
  }, [minerId]);

  const saveGroupTag = useCallback(
    (text: string) => {
      if (groupDebounceRef.current) clearTimeout(groupDebounceRef.current);
      groupDebounceRef.current = setTimeout(() => {
        if (!miner) return;
        const updated = { ...miner, group: text || undefined };
        DB.saveMiner(updated);
        setMinerGroup(minerId, text || undefined);
      }, 500);
    },
    [miner, minerId, setMinerGroup],
  );

  return {
    miner,
    healthPrediction,
    snapshots,
    wallets,
    alertRules,
    notes,
    refreshing,
    refreshMiner,
    removeMiner,
    setMinerWallet,
    setMinerIp,
    setMinerIcon,
    setMinerLocation,
    setMinerTags,
    setMinerNotes,
    setMinerMaintenance,
    refresh,
    handleShare,
    handleRestart,
    savePool,
    deleteMinerAction,
    addNote,
    deleteNote,
    updateAlertRules,
    resetAlertRules,
    saveGroupTag,
  };
}
