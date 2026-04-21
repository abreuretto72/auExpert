/**
 * SectionErrorBoundary — per-section React error boundary.
 *
 * Sits between the global ErrorBoundary (app/_layout.tsx) and any section of a
 * screen that could crash independently (diary tab, health tab, photo analysis,
 * etc.). A render error inside one section shows a compact fallback card with a
 * retry button — the rest of the app keeps working.
 *
 * Usage:
 *   <SectionErrorBoundary sectionName="health" resetKeys={[petId]}>
 *     <HealthTabContent />
 *   </SectionErrorBoundary>
 *
 * Why class component: React error boundaries MUST be class components —
 * there's no hook equivalent for componentDidCatch / getDerivedStateFromError.
 *
 * Per CLAUDE.md §12.2 layer 2: section-level isolation so a crash doesn't take
 * down the whole tree.
 */
import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';
import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';
import { rs, fs } from '../hooks/useResponsive';
import { Button } from './ui/Button';
import i18n from '../i18n';
import { reportError } from '../lib/errorReporter';

interface Props {
  children: ReactNode;
  /**
   * Short identifier used in console logs, e.g. "diary", "health".
   * Shown in __DEV__ builds to speed up debugging.
   */
  sectionName: string;
  /**
   * When any value in this array changes (shallow compare), the boundary
   * auto-resets. Useful for route params: resetKeys={[petId]} makes the
   * boundary forget the error when the user navigates to a different pet.
   */
  resetKeys?: readonly unknown[];
  /**
   * Called when the user taps "Try again" OR when resetKeys change.
   * Use it to refetch queries / clear stale state in the parent.
   */
  onReset?: () => void;
  /**
   * Custom fallback UI. If provided, replaces the default compact card.
   */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Fachada única — lib/errorReporter.ts decide pra onde vai (console em
    // dev, Sentry/etc em prod quando integrado). Nunca lança.
    reportError(error, {
      boundary: 'section',
      section: this.props.sectionName,
      componentStack: info.componentStack,
    });
  }

  componentDidUpdate(prevProps: Props) {
    if (!this.state.hasError) return;
    const prev = prevProps.resetKeys;
    const curr = this.props.resetKeys;
    if (!prev || !curr) return;
    if (prev.length !== curr.length) {
      this.reset();
      return;
    }
    for (let i = 0; i < prev.length; i++) {
      if (!Object.is(prev[i], curr[i])) {
        this.reset();
        return;
      }
    }
  }

  private reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <View style={styles.wrap}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <AlertTriangle size={rs(32)} color={colors.warning} strokeWidth={1.5} />
          </View>
          <Text style={styles.title}>{i18n.t('errors.sectionCrashTitle')}</Text>
          <Text style={styles.message}>{i18n.t('errors.sectionCrashMessage')}</Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.debug} numberOfLines={3}>
              [{this.props.sectionName}] {this.state.error.message}
            </Text>
          )}
          <View style={styles.btnWrap}>
            <Button
              label={i18n.t('common.retry')}
              onPress={this.reset}
              icon={<RotateCcw size={rs(18)} color="#fff" strokeWidth={2} />}
            />
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: rs(spacing.lg),
  },
  card: {
    width: '100%',
    maxWidth: rs(360),
    backgroundColor: colors.card,
    borderRadius: rs(radii.card),
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: rs(spacing.lg),
    paddingVertical: rs(spacing.xl),
    alignItems: 'center',
  },
  iconWrap: {
    width: rs(60),
    height: rs(60),
    borderRadius: rs(30),
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(spacing.md),
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(17),
    color: colors.text,
    marginBottom: rs(spacing.xs),
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    textAlign: 'center',
    lineHeight: fs(20),
    marginBottom: rs(spacing.md),
  },
  debug: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: fs(10),
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: rs(radii.sm),
    padding: rs(spacing.sm),
    marginBottom: rs(spacing.md),
    width: '100%',
  },
  btnWrap: {
    width: '100%',
  },
});
