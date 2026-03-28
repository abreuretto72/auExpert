import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';
import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';
import { Button } from './ui/Button';

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
          <AlertTriangle size={48} color={colors.warning} strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>Algo deu errado</Text>
        <Text style={styles.message}>
          Ocorreu um erro inesperado. Tente novamente.
        </Text>
        {__DEV__ && this.state.error && (
          <Text style={styles.debug}>{this.state.error.message}</Text>
        )}
        <View style={styles.btnWrap}>
          <Button
            label="Tentar novamente"
            onPress={this.handleReset}
            icon={<RotateCcw size={18} color="#fff" strokeWidth={2} />}
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
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: 22,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  message: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: colors.textSec,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  debug: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.lg,
    maxWidth: '100%',
  },
  btnWrap: {
    width: '100%',
    maxWidth: 280,
  },
});
