import React from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Star, ExternalLink } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';

type ResourceItem = {
  id: string;
  name: string;
  description: string;
  data_url: string;
  type: string;
  featured: boolean;
  slug?: string;
  external?: boolean;
  image_url: string;
};

type Props = {
  item: ResourceItem;
};

const TYPE_COLORS: Record<string, string> = {
  BIBLE: '#C8A84B',
  STUDY: '#3A7BD5',
  DEVOTION: '#C0392B',
  VIDEO: '#8E44AD',
  AUDIO: '#E84393',
  WEBSITE: '#27AE60',
  QUIZ: '#E67E22',
  MAP: '#2A7B7A',
};

export default function FeaturedCard({ item }: Props) {
  const typeColor = TYPE_COLORS[item.type] ?? Colors.gold.primary;
  const router = useRouter();

  const handlePress = () => {
    if (item.external === false) {
      if (item.type === 'BIBLE') {
        router.push({ pathname: '/bible', params: { version: item.slug } });
      } else if (item.data_url && item.data_url !== 'null') {
        router.push({
          pathname: '/webview',
          params: {
            url: encodeURIComponent(item.data_url),
            title: item.name,
            itemType: item.type,
          },
        });
      }
    } else {
      void WebBrowser.openBrowserAsync(item.data_url, {
        toolbarColor: Colors.bg.secondary,
      });
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.82}
    >
      <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(8,15,28,0.7)', 'rgba(8,15,28,0.97)']}
        style={styles.gradient}
      />
      <View style={styles.content}>
        <View style={styles.badges}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '30', borderColor: typeColor + '70' }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>{item.type}</Text>
          </View>
          <View style={styles.featuredBadge}>
            <Star size={8} color={Colors.gold.primary} fill={Colors.gold.primary} />
            <Text style={styles.featuredText}>FEATURED</Text>
          </View>
        </View>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        <View style={styles.urlRow}>
          <ExternalLink size={10} color={Colors.gold.dim} strokeWidth={2} />
          <Text style={styles.urlText} numberOfLines={1}>
            {item.data_url.replace('https://', '').replace('www.', '').split('/')[0]}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    height: 160,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.gold.dim + '55',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'flex-end',
    gap: 4,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    marginBottom: 2,
  },
  typeBadge: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.8,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.gold.subtle,
    borderWidth: 1,
    borderColor: Colors.gold.muted,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  featuredText: {
    fontSize: 8,
    fontWeight: Typography.weight.bold,
    color: Colors.gold.light,
    letterSpacing: 0.8,
  },
  name: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  description: {
    fontSize: 10,
    color: Colors.text.secondary,
    lineHeight: 14,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  urlText: {
    fontSize: 9,
    color: Colors.gold.dim,
  },
});
