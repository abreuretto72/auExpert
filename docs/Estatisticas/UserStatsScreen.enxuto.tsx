/**
 * Tela "Minhas Estatísticas" — versão ENXUTA para o tutor final.
 * Arquivo: app/(app)/stats.tsx  (sobrescrever a versão v2)
 *
 * REMOVIDO em relação à v2:
 *   • Banner de erros
 *   • Seção "Saúde da sua IA" (taxa de sucesso + latência)
 *   • Toggle "Ver detalhes técnicos" (custo, breakdown por modelo, erros por categoria)
 *
 * A elite do auExpert não vê dados técnicos de IA. Isso fica no dashboard admin.
 */

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  Camera, Video, Mic, ScanLine, UtensilsCrossed, FileText,
  Dog, Cat, Users, Stethoscope, Calendar, ChevronDown,
} from 'lucide-react-native';
import {
  useUserStats,
  getCurrentYearMonth,
  getLastNMonths,
} from '@/hooks/useUserStats';
import { PROFESSIONAL_TYPE_LABELS } from '@/types/userStats';

const COLORS = {
  bg: '#0D0E16',
  bgDeep: '#08090F',
  card: '#161826',
  border: '#2A2D3E',
  text: '#F0EDF5',
  textMuted: '#A89FB5',
  textDim: '#6B6478',
  ametista: '#8F7FA8',
  jade: '#4FA89E',
};

const StatCard = ({
  icon: Icon, label, value, hint, color = COLORS.jade,
}: {
  icon: any; label: string; value: number | string; hint?: string; color?: string;
}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Icon size={18} color={color} strokeWidth={1.5} />
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
    <Text style={[styles.cardValue, { color }]}>{value}</Text>
    {hint ? <Text style={styles.cardHint}>{hint}</Text> : null}
  </View>
);

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

export default function UserStatsScreen() {
  const [{ year, month }, setPeriod] = useState(getCurrentYearMonth);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const months = useMemo(() => getLastNMonths(12), []);

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useUserStats({ year, month });

  const currentLabel = useMemo(() => {
    return months.find(m => m.year === year && m.month === month)?.label
      ?? `${month}/${year}`;
  }, [months, year, month]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ title: 'Minhas Estatísticas' }} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.jade} />
        }
      >
        {/* Seletor de mês */}
        <Pressable onPress={() => setShowMonthPicker(v => !v)} style={styles.monthSelector}>
          <Calendar size={16} color={COLORS.ametista} strokeWidth={1.5} />
          <Text style={styles.monthSelectorText}>{currentLabel}</Text>
          <ChevronDown size={16} color={COLORS.ametista} strokeWidth={1.5} />
        </Pressable>

        {showMonthPicker && (
          <View style={styles.monthPicker}>
            {months.map(m => {
              const selected = m.year === year && m.month === month;
              return (
                <Pressable
                  key={`${m.year}-${m.month}`}
                  onPress={() => {
                    setPeriod({ year: m.year, month: m.month });
                    setShowMonthPicker(false);
                  }}
                  style={[styles.monthOption, selected && styles.monthOptionSelected]}
                >
                  <Text style={[styles.monthOptionText, selected && styles.monthOptionTextSelected]}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.jade} />
          </View>
        ) : isError ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>Não foi possível carregar.</Text>
            <Text style={styles.errorHint}>{error?.message}</Text>
          </View>
        ) : data ? (
          <>
            {/* ───── Uso de IA ───── */}
            <SectionHeader title="Uso de inteligência artificial" />
            <View style={styles.grid}>
              <StatCard icon={Camera}          label="Imagens analisadas"   value={data.ai_usage.images} />
              <StatCard icon={Video}           label="Vídeos analisados"    value={data.ai_usage.videos} />
              <StatCard icon={Mic}             label="Áudios analisados"    value={data.ai_usage.audios} />
              <StatCard icon={ScanLine}        label="Scanners (OCR)"       value={data.ai_usage.scanners} />
              <StatCard icon={UtensilsCrossed} label="Cardápios criados"    value={data.ai_usage.cardapios} />
              <StatCard icon={FileText}        label="Prontuários gerados"  value={data.ai_usage.prontuarios} />
            </View>

            {/* ───── Meus pets ───── */}
            <SectionHeader title="Meus pets" />
            <View style={styles.grid}>
              <StatCard icon={Dog} label="Cães"  value={data.pets.dogs} color={COLORS.ametista} />
              <StatCard icon={Cat} label="Gatos" value={data.pets.cats} color={COLORS.ametista} />
            </View>

            {/* ───── Pessoas vinculadas ───── */}
            <SectionHeader title="Pessoas vinculadas aos seus pets" />
            <View style={styles.grid}>
              <StatCard icon={Users} label="Co-tutores"  value={data.people.co_parents} color={COLORS.ametista} />
              <StatCard icon={Users} label="Cuidadores"  value={data.people.caregivers} color={COLORS.ametista} />
              <StatCard icon={Users} label="Visitantes"  value={data.people.visitors}   color={COLORS.ametista} />
              <StatCard icon={Users} label="Total"        value={data.people.total}      color={COLORS.jade} />
            </View>

            {/* ───── Profissionais ───── */}
            <SectionHeader title="Profissionais convidados" />
            {data.professionals.total === 0 && data.professionals.pending_invites === 0 ? (
              <Text style={styles.empty}>Nenhum profissional convidado ainda.</Text>
            ) : (
              <View style={styles.grid}>
                {Object.entries(data.professionals.by_type).map(([type, count]) => (
                  <StatCard
                    key={type}
                    icon={Stethoscope}
                    label={PROFESSIONAL_TYPE_LABELS[type] ?? type}
                    value={count as number}
                    color={COLORS.ametista}
                  />
                ))}
                {data.professionals.pending_invites > 0 && (
                  <StatCard
                    icon={Stethoscope}
                    label="Convites pendentes"
                    value={data.professionals.pending_invites}
                    hint="Aguardando aceite"
                    color={COLORS.textDim}
                  />
                )}
              </View>
            )}

            {/* ───── Atividade ───── */}
            <SectionHeader title="Sua atividade" />
            <View style={styles.grid}>
              <StatCard
                icon={Calendar}
                label="Dias ativos no mês"
                value={data.activity.logins_days_count}
                hint={
                  data.activity.last_login_at
                    ? `Último login: ${new Date(data.activity.last_login_at).toLocaleDateString('pt-BR')}`
                    : undefined
                }
              />
            </View>

            <View style={{ height: 32 }} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 16, paddingBottom: 40 },
  centered: { padding: 32, alignItems: 'center' },
  errorText: { color: COLORS.text, fontSize: 15, textAlign: 'center' },
  errorHint: { color: COLORS.textDim, fontSize: 12, marginTop: 8, textAlign: 'center' },
  monthSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, marginBottom: 16,
  },
  monthSelectorText: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  monthPicker: {
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, padding: 4, marginBottom: 16,
  },
  monthOption: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  monthOptionSelected: { backgroundColor: 'rgba(79, 168, 158, 0.14)' },
  monthOptionText: { color: COLORS.textMuted, fontSize: 13 },
  monthOptionTextSelected: { color: COLORS.jade, fontWeight: '600' },
  sectionHeader: {
    color: COLORS.ametista, fontSize: 12, fontWeight: '500',
    textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 20, marginBottom: 10,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    flexBasis: '48%', flexGrow: 1, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardLabel: {
    color: COLORS.textMuted, fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 0.5, fontWeight: '500',
  },
  cardValue: { fontSize: 28, fontWeight: '500', lineHeight: 32 },
  cardHint: { color: COLORS.textDim, fontSize: 11, marginTop: 6 },
  empty: { color: COLORS.textDim, fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },
});
