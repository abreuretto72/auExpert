import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';
import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';
import { rs, fs } from '../hooks/useResponsive';
import { Button } from './ui/Button';
import i18n from '../i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // TODO: log to Supabase or external service
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <AlertTriangle size={rs(48)} color={colors.warning} strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>{i18n.t('errors.unexpectedTitle')}</Text>
        <Text style={styles.message}>
          {i18n.t('errors.unexpectedBody')}
        </Text>
        {__DEV__ && this.state.error && (
          <Text style={styles.debug}>{this.state.error.message}</Text>
        )}
        <View style={styles.btnWrap}>
          <Button
            label={i18n.t('common.retry')}
            onPress={this.handleReset}
            icon={<RotateCcw size={rs(18)} color="#fff" strokeWidth={2} />}
          />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rs(spacing.xl),
  },
  iconWrap: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(40),
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(spacing.lg),
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(22),
    color: colors.text,
    marginBottom: rs(spacing.sm),
  },
  message: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(14),
    color: colors.textSec,
    textAlign: 'center',
    lineHeight: fs(22),
    marginBottom: rs(spacing.lg),
  },
  debug: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: fs(11),
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: rs(radii.sm),
    padding: rs(spacing.sm),
    marginBottom: rs(spacing.lg),
    maxWidth: '100%',
  },
  btnWrap: {
    width: '100%',
    maxWidth: rs(280),
  },
});
