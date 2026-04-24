/**
 * PROPOSTA — AuExpertLogo Elite (wordmark tipográfico)
 *
 * Este arquivo é uma PROPOSTA de substituição para
 * `components/AuExpertLogo.tsx`. Não é executado pelo app.
 *
 * Quando aprovado, copiar sobre o arquivo real.
 *
 * Mudança: o logo deixa de ser uma IMAGEM PNG do mascote cartoon e passa a
 * ser TIPOGRAFIA PURA — `au` em Playfair Display Italic + `Expert` em
 * Playfair Display Regular. O mascote cartoon continua vivo APENAS no
 * ícone da app store / homescreen do celular.
 *
 * Assinatura pública (tamanhos e props) preservada pra não quebrar os
 * ~20+ call sites atuais.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { rs, fs } from '../hooks/useResponsive';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';

type LogoSize = 'large' | 'normal' | 'small';

interface AuExpertLogoProps {
  size?: LogoSize;
  /** @deprecated kept for backward compat — wordmark doesn't have a separate icon */
  showIcon?: boolean;
  /** Se true, adiciona tagline "INTELIGÊNCIA ÚNICA" abaixo. Default: false. */
  showTagline?: boolean;
}

// Tamanhos do wordmark por variante
// Base-line ratio: altura-x ≈ fontSize × 0.52 (Playfair), ajustado por olho
const sizes: Record<LogoSize, { fontSize: number; taglineSize: number; taglineLetterSpacing: number }> = {
  large:  { fontSize: 36, taglineSize: 10, taglineLetterSpacing: 2.8 },
  normal: { fontSize: 24, taglineSize: 8,  taglineLetterSpacing: 2.2 },
  small:  { fontSize: 18, taglineSize: 7,  taglineLetterSpacing: 1.8 },
};

const AuExpertLogo: React.FC<AuExpertLogoProps> = ({ size = 'normal', showTagline = false }) => {
  const { fontSize, taglineSize, taglineLetterSpacing } = sizes[size];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.wordmark, { fontSize: fs(fontSize) }]} numberOfLines={1}>
        <Text style={[styles.au, { fontFamily: fonts.displayItalic }]}>au</Text>
        <Text style={[styles.expert, { fontFamily: fonts.display, color: colors.textSec }]}>Expert</Text>
      </Text>
      {showTagline && (
        <Text
          style={[
            styles.tagline,
            { fontSize: fs(taglineSize), letterSpacing: taglineLetterSpacing },
          ]}
          numberOfLines={1}
        >
          INTELIGÊNCIA ÚNICA
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
  },
  wordmark: {
    fontWeight: '500',
    color: colors.text,
    lineHeight: undefined,
    letterSpacing: 0.3,
  },
  au: {
    color: colors.text,
  },
  expert: {
    color: colors.textSec,
  },
  tagline: {
    fontFamily: fonts.body,
    color: colors.textDim,
    textTransform: 'uppercase',
    marginTop: rs(2),
    fontWeight: '500',
  },
});

export default AuExpertLogo;
