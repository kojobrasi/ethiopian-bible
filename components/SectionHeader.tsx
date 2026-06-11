import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';
import type { LucideIcon } from 'lucide-react-native';

type Props = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  rightElement?: React.ReactNode;
};

export default function SectionHeader({ title, subtitle, icon: Icon, iconColor = Colors.gold.primary, rightElement }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={styles.accent} />
        <View>
          <View style={styles.titleRow}>
            {Icon && <Icon size={14} color={iconColor} strokeWidth={2} />}
            <Text style={styles.title}>{title}</Text>
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {rightElement ? <View>{rightElement}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  accent: {
    width: 3,
    height: 18,
    backgroundColor: Colors.gold.primary,
    borderRadius: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  title: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.secondary,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginTop: 1,
  },
});
