import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';

type Props = {
  label: string;
  icon: LucideIcon;
  color?: string;
  size: number;
  onPress: () => void;
};

export default function MenuButton({ label, icon: Icon, color = Colors.gold.primary, size, onPress }: Props) {
  return (
    <TouchableOpacity style={[styles.btn, { width: size }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconWrap, { backgroundColor: color + '18', borderColor: color + '40' }]}>
        <Icon size={22} color={color} strokeWidth={1.8} />
      </View>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
