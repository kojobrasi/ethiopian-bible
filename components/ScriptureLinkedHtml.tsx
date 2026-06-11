/**
 * ScriptureLinkedHtml — wraps react-native-render-html's RenderHtml
 * and automatically linkifies Bible scripture references.
 *
 * Whenever a user taps a linked reference, it calls onPressBibleRef
 * with the parsed book/chapter/verse navigation path.
 *
 * Also handles existing protocol-style links like href="B:bookNum ch:verse"
 * used in TSK commentary data.
 */

import React, { useCallback, useMemo } from 'react';
import {
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import RenderHtml, {
  type RenderHTMLProps,
} from 'react-native-render-html';
import { useRouter } from 'expo-router';
import {
  linkifyScriptureToHtml,
} from '@/lib/scriptureLinks';

export type ScriptureLinkedHtmlProps = {
  html: string;
  contentWidth?: number;
  /** Called when a scripture link is tapped. Default: navigates to bible screen */
  onPressBibleRef?: (navPath: string) => void;
  /** Pass-through props for RenderHtml */
  renderHtmlProps?: Partial<RenderHTMLProps>;
};

/**
 * Pre-process HTML content to linkify scripture references within text nodes,
 * and convert custom protocol links (B:) to tappable refs.
 */
function preprocessHtml(html: string): string {
  if (!html) return '';

  let processed = html;

  // 1. Convert existing TSK-style links: href='B:140 36:21' → data-bible-ref
  //    This regex matches the B: protocol links and extracts bookNumber chapter:verse
  processed = processed.replace(
    /<a\s+href=['"]B:(\d+)\s+(\d+):(\d+)(?:-(\d+))?['"][^>]*>(.*?)<\/a>/gi,
    (_, bookNum, ch, vs, endVs, content) => {
      const navPath = `/bible?book=${bookNum}&chapter=${ch}&verse=${vs}${endVs ? `&endVerse=${endVs}` : ''}`;
      return `<a href="${navPath}" data-bible-ref="${navPath}" class="scripture-link">${content}</a>`;
    },
  );

  // 2. For plain text content that might contain unlinked references,
  //    only linkify inside <p>, <li>, <div>, <span>, <blockquote> tags
  //    to avoid breaking existing <a> tags, scripts, etc.
  processed = processed.replace(
    /<(p|li|div|span|blockquote|td|th)([^>]*)>(.*?)<\/\1>/gis,
    (match, tag, attrs, content) => {
      // Skip if this element already contains an anchor tag (already linked)
      if (/<a\s/i.test(content)) return match;
      const linked = linkifyScriptureToHtml(content);
      return `<${tag}${attrs}>${linked}</${tag}>`;
    },
  );

  return processed;
}

export default function ScriptureLinkedHtml({
  html,
  contentWidth,
  onPressBibleRef,
  renderHtmlProps,
}: ScriptureLinkedHtmlProps) {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const effectiveWidth = contentWidth ?? windowWidth - 32;

  const processedHtml = useMemo(() => preprocessHtml(html), [html]);

  const handleLinkPress = useCallback(
    (_e: GestureResponderEvent, href: string) => {
      if (!href) return;

      // Check for internal bible ref link
      if (href.startsWith('/bible?') || href.includes('data-bible-ref')) {
        if (onPressBibleRef) {
          onPressBibleRef(href);
        } else {
          router.push(href as any);
        }
        return;
      }

      // Check for bible:// deep link
      if (href.startsWith('bible://')) {
        const match = href.match(/bible:\/\/open\/(\d+)\/(\d+)\?verse=(\d+)(?:&endVerse=(\d+))?/);
        if (match) {
          const [, book, ch, vs, endVs] = match;
          const navPath = `/bible?book=${book}&chapter=${ch}&verse=${vs}${endVs ? `&endVerse=${endVs}` : ''}`;
          if (onPressBibleRef) {
            onPressBibleRef(navPath);
          } else {
            router.push(navPath as any);
          }
          return;
        }
      }

      // For external URLs, let the default handler open them
      // (We could integrate with a browser or WebView here)
    },
    [router, onPressBibleRef],
  );

  const defaultTagsStyles = useMemo(
    () => ({
      a: {
        color: '#C8A84B',
        textDecorationLine: 'underline' as const,
      },
      '.scripture-link': {
        color: '#C8A84B',
        textDecorationLine: 'underline' as const,
      },
    }),
    [],
  );

  const mergedTagsStyles = useMemo(
    () => ({
      ...defaultTagsStyles,
      ...(renderHtmlProps?.tagsStyles || {}),
    }),
    [renderHtmlProps?.tagsStyles, defaultTagsStyles],
  );

  return (
    <RenderHtml
      contentWidth={effectiveWidth}
      source={{ html: processedHtml }}
      {...renderHtmlProps}
      tagsStyles={mergedTagsStyles}
      renderersProps={{
        ...(renderHtmlProps?.renderersProps || {}),
        a: {
          onPress: handleLinkPress,
        },
      }}
    />
  );
}

