import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Droplet, X } from 'lucide-react-native';
import { rs } from '../../../../../hooks/useResponsive';
import { colors } from '../../../../../constants/colors';
import { styles } from './styles';

interface Props {
  visible: boolean;
  onClose: () => void;
  isDog: boolean;
}

export function BloodTypeInfoModal({ visible, onClose, isDog }: Props) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.btOverlay} onPress={onClose}>
        <Pressable style={styles.btSheet} onPress={() => {}}>
          <View style={styles.btHandle} />
          <View style={styles.btHeader}>
            <Droplet size={rs(20)} color={colors.danger} strokeWidth={1.8} />
            <Text style={styles.btTitle}>{t('health.bloodTypeTitle')}</Text>
            <TouchableOpacity onPress={onClose} style={{ marginLeft: 'auto' }}>
              <X size={rs(18)} color={colors.accent} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Dog types */}
            <Text style={styles.btSectionLabel}>{t('health.bloodTypeDog')}</Text>
            {[
              { type: 'DEA 1.1+', freq: '40-60%', desc: 'Universal recipient' },
              { type: 'DEA 1.1-', freq: '40-60%', desc: 'Universal donor' },
              { type: 'DEA 1.2', freq: '20%', desc: 'Common' },
              { type: 'DEA 3', freq: '6%', desc: 'Rare' },
              { type: 'DEA 4', freq: '98%', desc: 'Very common, low antigenicity' },
              { type: 'DEA 5', freq: '25%', desc: 'Uncommon' },
              { type: 'DEA 7', freq: '45%', desc: 'Common' },
            ].map((bt) => (
              <View key={bt.type} style={styles.btRow}>
                <Text style={styles.btType}>{bt.type}</Text>
                <Text style={styles.btFreq}>{bt.freq}</Text>
                <Text style={styles.btDesc}>{isDog ? bt.desc : ''}</Text>
              </View>
            ))}

            {/* Cat types */}
            <Text style={[styles.btSectionLabel, { marginTop: rs(16) }]}>{t('health.bloodTypeCat')}</Text>
            {[
              { type: 'A', freq: '85-95%', desc: 'Most common worldwide' },
              { type: 'B', freq: '5-15%', desc: 'More common in some breeds (British, Devon Rex)' },
              { type: 'AB', freq: '<1%', desc: 'Very rare, universal recipient' },
            ].map((bt) => (
              <View key={bt.type} style={styles.btRow}>
                <Text style={styles.btType}>{bt.type}</Text>
                <Text style={styles.btFreq}>{bt.freq}</Text>
                <Text style={styles.btDesc}>{bt.desc}</Text>
              </View>
            ))}

            <Text style={styles.btDisclaimer}>{t('health.bloodTypeDisclaimer')}</Text>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
