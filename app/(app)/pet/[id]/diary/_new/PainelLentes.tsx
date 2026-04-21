/**
 * PainelLentes — "20 lentes" informational panel extracted verbatim
 * from app/(app)/pet/[id]/diary/new.tsx.
 *
 * Move-only extraction. Same props, same JSX, same painelStyles —
 * imported back into new.tsx via `import { PainelLentes } from './_new/PainelLentes'`.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  ShieldCheck, Stethoscope, FlaskConical, Pill, Scale, DollarSign,
  ThermometerSun, Utensils, AlertTriangle, Scissors, Activity,
  ShoppingBag, MapPin, PawPrint, Sparkles,
} from 'lucide-react-native';
import { colors } from '../../../../../../constants/colors';
import { rs, fs } from '../../../../../../hooks/useResponsive';

export function PainelLentes({ t }: { t: (k: string, opts?: Record<string, unknown>) => string }) {
  const LENTES = [
    { icon: <ShieldCheck   size={rs(14)} color={colors.success} strokeWidth={1.8} />, color: colors.success, labelKey: 'mic.lenteVacina',      descKey: 'mic.lenteVacinaDesc' },
    { icon: <Stethoscope   size={rs(14)} color={colors.petrol}  strokeWidth={1.8} />, color: colors.petrol,  labelKey: 'mic.lenteConsulta',     descKey: 'mic.lenteConsultaDesc' },
    { icon: <FlaskConical  size={rs(14)} color={colors.sky}     strokeWidth={1.8} />, color: colors.sky,     labelKey: 'mic.lenteExame',        descKey: 'mic.lenteExameDesc' },
    { icon: <Pill          size={rs(14)} color={colors.purple}  strokeWidth={1.8} />, color: colors.purple,  labelKey: 'mic.lenteMedicamento',  descKey: 'mic.lenteMedicamentoDesc' },
    { icon: <Scale         size={rs(14)} color={colors.accent}  strokeWidth={1.8} />, color: colors.accent,  labelKey: 'mic.lentePeso',         descKey: 'mic.lentePesoDesc' },
    { icon: <DollarSign    size={rs(14)} color={colors.warning} strokeWidth={1.8} />, color: colors.warning, labelKey: 'mic.lenteGasto',        descKey: 'mic.lenteGastoDesc' },
    { icon: <ThermometerSun size={rs(14)} color={colors.danger} strokeWidth={1.8} />, color: colors.danger,  labelKey: 'mic.lenteSintoma',      descKey: 'mic.lenteSintomaDesc' },
    { icon: <Utensils      size={rs(14)} color={colors.success} strokeWidth={1.8} />, color: colors.success, labelKey: 'mic.lenteAlimentacao',  descKey: 'mic.lenteAlimentacaoDesc' },
    { icon: <AlertTriangle size={rs(14)} color={colors.warning} strokeWidth={1.8} />, color: colors.warning, labelKey: 'mic.lenteAlergia',      descKey: 'mic.lenteAlergiaDesc' },
    { icon: <Scissors      size={rs(14)} color={colors.petrol}  strokeWidth={1.8} />, color: colors.petrol,  labelKey: 'mic.lenteCirurgia',     descKey: 'mic.lenteCirurgiaDesc' },
    { icon: <Activity      size={rs(14)} color={colors.rose}    strokeWidth={1.8} />, color: colors.rose,    labelKey: 'mic.lenteMetrica',      descKey: 'mic.lenteMetricaDesc' },
    { icon: <ShoppingBag   size={rs(14)} color={colors.accent}  strokeWidth={1.8} />, color: colors.accent,  labelKey: 'mic.lenteCompra',       descKey: 'mic.lenteCompraDesc' },
    { icon: <MapPin        size={rs(14)} color={colors.sky}     strokeWidth={1.8} />, color: colors.sky,     labelKey: 'mic.lenteViagem',       descKey: 'mic.lenteViagemDesc' },
    { icon: <PawPrint      size={rs(14)} color={colors.accent}  strokeWidth={1.8} />, color: colors.accent,  labelKey: 'mic.lenteConexao',      descKey: 'mic.lenteConexaoDesc' },
    { icon: <Sparkles      size={rs(14)} color={colors.gold}    strokeWidth={1.8} />, color: colors.gold,    labelKey: 'mic.lenteMomento',      descKey: 'mic.lenteMomentoDesc' },
  ];

  return (
    <View style={painelStyles.container}>
      <Text style={painelStyles.subtitle}>{t('mic.painelSubtitle')}</Text>
      {LENTES.map((lente, idx) => (
        <View key={idx} style={painelStyles.item}>
          <View style={[painelStyles.iconBox, { backgroundColor: lente.color + '18' }]}>
            {lente.icon}
          </View>
          <View style={painelStyles.textCol}>
            <Text style={[painelStyles.label, { color: lente.color }]}>
              {t(lente.labelKey).toUpperCase()}
            </Text>
            <Text style={painelStyles.desc}>{t(lente.descKey)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const painelStyles = StyleSheet.create({
  container: { gap: rs(8) },
  subtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    marginBottom: rs(4),
    lineHeight: fs(18),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    paddingVertical: rs(6),
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  iconBox: {
    width: rs(28), height: rs(28),
    borderRadius: rs(8),
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: { flex: 1, gap: rs(2) },
  label: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    letterSpacing: 0.5,
  },
  desc: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textSec,
    lineHeight: fs(16),
  },
});
