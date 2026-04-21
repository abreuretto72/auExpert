/**
 * Shared types, helpers, and CardActions component used across timeline cards.
 * Extracted verbatim from TimelineCards.tsx.
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { EyeOff, Pencil, Trash2, X } from 'lucide-react-native';
import { colors } from '../../../constants/colors';
import { rs } from '../../../hooks/useResponsive';
import { getPublicUrl } from '../../../lib/storage';
import { useAuthStore } from '../../../stores/authStore';
import type { TimelineEvent } from '../timelineTypes';
import { type ModuleRow } from '../DiaryModuleCard';

// ── Shared types ──

export interface CardProps {
  event: TimelineEvent;
  t: (k: string, opts?: Record<string, string>) => string;
  onDelete?: (id: string) => void;
  /** True when the current user is the pet's root admin (owner role). */
  isOwner?: boolean;
  /** Admin-only: deactivate a record that belongs to another tutor. */
  onAdminDeactivate?: (id: string) => void;
}

export interface DiaryCardProps extends CardProps {
  petName: string;
  getMoodData: (id: string | null | undefined) => { label: string; color: string } | null;
  onEdit: (id: string) => void;
  onRetry?: (id: string) => void;
}

// ── CardActions ── permission-aware: creator gets pencil→trash; owner gets EyeOff

export const HIT = { top: 12, bottom: 12, left: 12, right: 12 } as const;

export function CardActions({
  event, onDelete, isOwner, onAdminDeactivate,
}: {
  event: TimelineEvent;
  onDelete?: (id: string) => void;
  isOwner?: boolean;
  onAdminDeactivate?: (id: string) => void;
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [deleteMode, setDeleteMode] = useState(false);

  if (!currentUserId) return null;

  const isCreator = event.registeredBy === currentUserId;

  // Admin (owner) viewing another tutor's record → deactivate button
  if (!isCreator && isOwner && onAdminDeactivate) {
    return (
      <TouchableOpacity
        onPress={() => onAdminDeactivate(event.id)}
        style={cas.trashBtn}
        hitSlop={HIT}
      >
        <EyeOff size={rs(14)} color={colors.danger} strokeWidth={1.8} />
      </TouchableOpacity>
    );
  }

  // Record creator → pencil toggle → trash + cancel
  if (!isCreator || !onDelete) return null;

  if (deleteMode) {
    return (
      <View style={cas.row}>
        <TouchableOpacity
          onPress={() => { setDeleteMode(false); onDelete(event.id); }}
          style={cas.trashBtn}
          hitSlop={HIT}
        >
          <Trash2 size={rs(15)} color={colors.danger} strokeWidth={1.8} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDeleteMode(false)} style={cas.cancelBtn} hitSlop={HIT}>
          <X size={rs(13)} color={colors.textDim} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={() => setDeleteMode(true)} style={cas.editBtn} hitSlop={HIT}>
      <Pencil size={rs(14)} color={colors.accent} strokeWidth={1.8} />
    </TouchableOpacity>
  );
}

// ── Helper: resolve a media URI ──
// Passes through already-resolved URIs (remote or local) untouched; routes bare
// storage paths through getPublicUrl. Local `file://` / `content://` URIs show
// up on optimistic temp entries (M4) — they must bypass the storage resolver.

export function resolveMediaUri(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (/^(https?:|file:|content:|data:)/i.test(raw)) return raw;
  return getPublicUrl('pet-photos', raw);
}

// ── Helper: match classification type → module row ──

export const MODULE_TYPE_TO_KEY: Record<string, keyof NonNullable<TimelineEvent['modules']>> = {
  vaccine:       'vaccines',
  consultation:  'consultations',
  return_visit:  'consultations',
  expense:       'expenses',
  weight:        'clinical_metrics',
  medication:    'medications',
};

export function resolveModuleRow(
  type: string,
  index: number,
  modules: TimelineEvent['modules'],
): ModuleRow | undefined {
  if (!modules) return undefined;
  const key = MODULE_TYPE_TO_KEY[type];
  if (!key) return undefined;
  const arr = modules[key] as ModuleRow[] | undefined;
  if (!arr || arr.length === 0) return undefined;
  // Match by index within same type (most entries have only 1 per type)
  const sameTypeIndex = index; // caller already filtered by type confidence
  return arr[sameTypeIndex] ?? arr[0];
}

// ── CardActions styles ── (exported: DiaryCard reuses cas.trashBtn for inline admin deactivate)
export const cas = StyleSheet.create({
  editBtn: {
    width: rs(28), height: rs(28), borderRadius: rs(8),
    backgroundColor: colors.accent + '12',
    alignItems: 'center', justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: rs(6) },
  trashBtn: {
    width: rs(28), height: rs(28), borderRadius: rs(8),
    backgroundColor: colors.danger + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtn: {
    width: rs(26), height: rs(26), borderRadius: rs(7),
    backgroundColor: colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
});
