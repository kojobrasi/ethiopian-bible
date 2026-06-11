import React from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { ExternalLink } from 'lucide-react-native';
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
  cardWidth: number;
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

export default function ResourceCard({ item, cardWidth }: Props) {
  const typeColor = TYPE_COLORS[item.type] ?? Colors.gold.primary;
  const router = useRouter();

  const handlePress = () => {
    if (item.external === false) {
      if (item.type === 'BIBLE') {
        // Bible entries navigate to the local bible reader
        router.push({ pathname: '/bible', params: { version: item.slug } });
      } else if (item.data_url && item.data_url !== 'null') {
        // All other internal items open in the in-app cached WebView
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
      style={[styles.card, { width: cardWidth }]}
      onPress={handlePress}
      activeOpacity={0.82}
    >
      <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
      <View style={styles.imgOverlay} />

      <View style={styles.body}>
        <View style={[styles.typeBadge, { backgroundColor: typeColor + '28', borderColor: typeColor + '60' }]}>
          <Text style={[styles.typeText, { color: typeColor }]}>{item.type}</Text>
        </View>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        <View style={styles.urlRow}>
          <ExternalLink size={10} color={Colors.gold.light} strokeWidth={2} />
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
    borderRadius: Radius.lg,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 90,
    opacity: 0.4,
  },
  imgOverlay: {
    ...StyleSheet.absoluteFillObject,
    height: 90,
    backgroundColor: 'rgba(8,15,28,0.45)',
  },
  body: {
    padding: Spacing.md,
    gap: 5,
  },
  typeBadge: {
    alignSelf: 'flex-start',
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
  name: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    lineHeight: 17,
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
    marginTop: 2,
  },
  urlText: {
    fontSize: 9,
    color: Colors.gold.light,
  },
});
