import React, { useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Search, X, Mic } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs } from '../../hooks/useResponsive';

interface PetSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  style?: ViewStyle;
}

const PetSearchBar: React.FC<PetSearchBarProps> = ({ value, onChangeText, style }) => {
  const { t } = useTranslation();

  const handleClear = useCallback(() => {
    onChangeText('');
  }, [onChangeText]);

  return (
    <View style={[styles.container, style]}>
      <Search
        size={rs(16)}
        color={colors.textDim}
        strokeWidth={1.8}
        style={styles.searchIcon}
      />

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={t('pets.searchPlaceholder')}
        placeholderTextColor={colors.placeholder}
        autoCorrect={false}
        returnKeyType="search"
        autoCapitalize="none"
        selectionColor={colors.click}
      />

      {value.length > 0 ? (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <X size={rs(16)} color={colors.click} strokeWidth={2} />
        </TouchableOpacity>
      ) : (
        <Mic size={rs(16)} color={colors.click} strokeWidth={1.8} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(10),
    height: rs(44),
    paddingHorizontal: rs(12),
    gap: rs(8),
  },
  searchIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontFamily: 'Sora_400Regular',
    fontSize: rs(14),
    color: colors.text,
    paddingVertical: 0,
  },
});

export default PetSearchBar;
