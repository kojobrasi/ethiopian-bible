import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, RotateCcw, WifiOff, Globe } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { useAppSettings, type FontOption } from '@/contexts/AppContext';
import { type ThemeColors } from '@/constants/theme';
import { fetchWithCache, getCacheMeta, clearCache } from '@/lib/webviewCache';

// ─── Font → CSS stack & Google Fonts URL map ──────────────────────────────────
const FONT_CSS_STACK: Record<string, string> = {
  'system':            `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
  'open-sans':         `'Open Sans', sans-serif`,
  'lato':              `'Lato', sans-serif`,
  'merriweather':      `'Merriweather', serif`,
  'noto-serif':        `'Noto Serif', serif`,
  'libre-baskerville': `'Libre Baskerville', serif`,
  'noto-ethiopic':     `'Noto Serif Ethiopic', serif`,
};

const GFONTS_URL: Record<string, string> = {
  'open-sans':         'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap',
  'lato':              'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
  'merriweather':      'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap',
  'noto-serif':        'https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&display=swap',
  'libre-baskerville': 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap',
  'noto-ethiopic':     'https://fonts.googleapis.com/css2?family=Noto+Serif+Ethiopic:wght@400;700&display=swap',
};

// ─── CSS theme injection (runs before content loads) ─────────────────────────
function buildThemeCSS(colors: ThemeColors, fontOption: FontOption, accentColor: string): string {
  const fontStack = FONT_CSS_STACK[fontOption.key] ?? FONT_CSS_STACK['system'];
  const gfontsUrl = GFONTS_URL[fontOption.key];
  const fontImport = gfontsUrl ? `@import url('${gfontsUrl}');` : '';

  // Escape for JS string embedding
  const css = `
    ${fontImport}
    :root {
      --app-bg:        ${colors.bg.primary};
      --app-bg-card:   ${colors.bg.card};
      --app-text:      ${colors.text.primary};
      --app-text-sec:  ${colors.text.secondary};
      --app-text-muted:${colors.text.muted};
      --app-accent:    ${accentColor};
      --app-border:    ${colors.border.default};
      --app-font:      ${fontStack};
    }
    html, body {
      background-color: var(--app-bg) !important;
      color: var(--app-text) !important;
      font-family: var(--app-font) !important;
      font-size: 16px !important;
      line-height: 1.7 !important;
      -webkit-text-size-adjust: 100%;
    }
    p, li, td, th, blockquote, label, span {
      color: var(--app-text) !important;
      font-family: var(--app-font) !important;
    }
    h1, h2, h3, h4, h5, h6 {
      color: var(--app-text) !important;
      font-family: var(--app-font) !important;
    }
    a, a:visited { color: var(--app-accent) !important; }
    a:hover      { opacity: 0.8; }
    code, pre    { background: var(--app-bg-card) !important; color: var(--app-text-sec) !important; border-radius: 4px; padding: 2px 6px; }
    input, textarea, select, button {
      background: var(--app-bg-card) !important;
      color: var(--app-text) !important;
      border-color: var(--app-border) !important;
      font-family: var(--app-font) !important;
    }
    /* Neutralise white/light hard-coded backgrounds on common wrappers */
    div[style*="background:#fff"], div[style*="background: #fff"],
    div[style*="background:white"], div[style*="background: white"],
    section[style*="background:#fff"], article[style*="background:#fff"] {
      background-color: var(--app-bg) !important;
    }
  `.replace(/`/g, '\\`').replace(/\$/g, '\\$');

  return `
(function () {
  var style = document.createElement('style');
  style.id = '__app_theme__';
  style.textContent = \`${css}\`;
  var head = document.head || document.documentElement;
  head.insertBefore(style, head.firstChild);
})();
true;
`;
}

// ─── Download intercept (runs after content loads) ───────────────────────────
const DOWNLOAD_INJECTION = `
(function () {
  document.addEventListener('click', function (e) {
    var el = e.target.closest('a[download], a[href$=".pdf"], a[href$=".epub"], a[href$=".mp3"], a[href$=".mp4"]');
    if (el) {
      e.preventDefault();
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DOWNLOAD', url: el.href, name: el.download || '' }));
    }
  }, true);
})();
true;
`;

// ─── Scripture linkification injection ────────────────────────────────────────
// Injected into loaded HTML pages to identify and linkify Bible references.
const SCRIPTURE_LINKIFY_INJECTION = `
(function () {
  if (window.__scriptureLinked) return;
  window.__scriptureLinked = true;

  // Comprehensive Bible book name/abbreviation list
  var BOOKS = [
    { num:10, names:["Gen","Ge","Genesis"] },
    { num:20, names:["Exod","Ex","Exo","Exodus"] },
    { num:30, names:["Lev","Le","Levi","Leviticus"] },
    { num:40, names:["Num","Nu","Numb","Numbers"] },
    { num:50, names:["Deut","De","Deu","Deuteronomy"] },
    { num:60, names:["Josh","Jos","Joshua"] },
    { num:70, names:["Judg","Jdg","Jdgs","Judges"] },
    { num:80, names:["Ruth","Ru"] },
    { num:90, names:["1 Sam","1 Sam.","1Sam","1 Sa","1Sa","1 Samuel"] },
    { num:100, names:["2 Sam","2 Sam.","2Sam","2 Sa","2Sa","2 Samuel"] },
    { num:110, names:["1 Kgs","1Kgs","1 Ki","1Ki","1 Kings"] },
    { num:120, names:["2 Kgs","2Kgs","2 Ki","2Ki","2 Kings"] },
    { num:130, names:["1 Chr","1Chr","1 Ch","1Ch","1 Chron","1 Chronicles"] },
    { num:140, names:["2 Chr","2Chr","2 Ch","2Ch","2 Chron","2 Chronicles"] },
    { num:150, names:["Ezra","Ezr","Ez"] },
    { num:160, names:["Neh","Ne","Nehemiah"] },
    { num:190, names:["Esth","Est","Es","Esther"] },
    { num:220, names:["Job"] },
    { num:230, names:["Ps","Psa","Psm","Pss","Psalm","Psalms"] },
    { num:240, names:["Prov","Pro","Pr","Proverbs"] },
    { num:250, names:["Eccl","Ecc","Ec","Ecclesiastes"] },
    { num:260, names:["Song","So","SOS","Song of Sol","Song of Solomon"] },
    { num:290, names:["Isa","Is","Isaiah"] },
    { num:300, names:["Jer","Je","Jeremiah"] },
    { num:310, names:["Lam","La","Lamentations"] },
    { num:330, names:["Ezek","Eze","Ezekiel"] },
    { num:340, names:["Dan","Da","Dnl","Daniel"] },
    { num:350, names:["Hos","Ho","Hosea"] },
    { num:360, names:["Joel","Joe"] },
    { num:370, names:["Amos","Am","Amo"] },
    { num:380, names:["Obad","Ob","Oba","Obadiah"] },
    { num:390, names:["Jonah","Jon","Jnh"] },
    { num:400, names:["Mic","Mi","Micah"] },
    { num:410, names:["Nah","Na","Nahum"] },
    { num:420, names:["Hab","Ha","Habakkuk"] },
    { num:430, names:["Zeph","Zep","Zephaniah"] },
    { num:440, names:["Hag","Ha","Haggai"] },
    { num:450, names:["Zech","Zec","Zechariah"] },
    { num:460, names:["Mal","Ml","Malachi"] },
    { num:470, names:["Matt","Mt","Mat","Matthew"] },
    { num:480, names:["Mark","Mk","Mrk"] },
    { num:490, names:["Luke","Lk","Luk"] },
    { num:500, names:["John","Jn","Joh"] },
    { num:510, names:["Acts","Act","Ac"] },
    { num:520, names:["Rom","Ro","Romans"] },
    { num:530, names:["1 Cor","1Cor","1 Co","1Co","1 Corinthians"] },
    { num:540, names:["2 Cor","2Cor","2 Co","2Co","2 Corinthians"] },
    { num:550, names:["Gal","Ga","Galatians"] },
    { num:560, names:["Eph","Ep","Ephesians"] },
    { num:570, names:["Phil","Php","Philippians"] },
    { num:580, names:["Col","Co","Colossians"] },
    { num:590, names:["1 Thess","1Thess","1 Thes","1Thes","1 Th","1Th","1 Thessalonians"] },
    { num:600, names:["2 Thess","2Thess","2 Thes","2Thes","2 Th","2Th","2 Thessalonians"] },
    { num:610, names:["1 Tim","1Tim","1 Ti","1Ti","1 Timothy"] },
    { num:620, names:["2 Tim","2Tim","2 Ti","2Ti","2 Timothy"] },
    { num:630, names:["Titus","Tit","Ti"] },
    { num:640, names:["Philemon","Phm","Phile"] },
    { num:650, names:["Heb","He","Hebrews"] },
    { num:660, names:["James","Jas","Ja"] },
    { num:670, names:["1 Pet","1Pet","1 Pe","1Pe","1 Peter"] },
    { num:680, names:["2 Pet","2Pet","2 Pe","2Pe","2 Peter"] },
    { num:690, names:["1 Jn","1Jn","1 Jo","1Jo","1 Joh","1John","1 John"] },
    { num:700, names:["2 Jn","2Jn","2 Jo","2Jo","2 Joh","2 John"] },
    { num:710, names:["3 Jn","3Jn","3 Jo","3Jo","3 Joh","3 John"] },
    { num:720, names:["Jude","Jud"] },
    { num:730, names:["Rev","Re","Revelation","Revelations"] },
    { num:731, names:["1 Esd","1Esd","1 Es","1Es","1 Esdras"] },
    { num:732, names:["2 Esd","2Esd","2 Es","2Es","2 Esdras"] },
    { num:733, names:["Tobit","Tob","To"] },
    { num:734, names:["Judith","Jdt","Jd"] },
    { num:735, names:["Add Est","Additions to Esther"] },
    { num:736, names:["Wis","Wsd","Wisdom","Wisdom of Solomon"] },
    { num:737, names:["Sirach","Sir","Si","Ecclesiasticus"] },
    { num:738, names:["Baruch","Bar","Ba"] },
    { num:739, names:["Ep Jer","EpJer","Epistle of Jeremy"] },
    { num:740, names:["Pr Az","PrAz","Prayer of Azariah"] },
    { num:741, names:["Susanna","Sus","Su"] },
    { num:742, names:["Bel","Bel and the Dragon"] },
    { num:743, names:["Pr Man","PrMan","Prayer of Manasseh"] },
    { num:744, names:["1 Macc","1Macc","1 Mac","1Mac","1 Ma","1Ma","1 Maccabees"] },
    { num:745, names:["2 Macc","2Macc","2 Mac","2Mac","2 Ma","2Ma","2 Maccabees"] },
    { num:746, names:["Jubilees","Jub"] },
    { num:747, names:["1 Enoch","1 En","1Enoch","1 Book of Enoch"] },
    { num:748, names:["2 Enoch","2 En","2Enoch","2 Book of Enoch"] },
    { num:749, names:["Jasher","Jash","Book of Jasher"] },
    { num:750, names:["1 Meq","1Meq","1 Meqabyan"] },
    { num:751, names:["2 Meq","2Meq","2 Meqabyan"] },
    { num:752, names:["3 Meq","3Meq","3 Meqabyan"] },
    { num:753, names:["Ps 151","Ps151","Psa 151","Psa151"] },
    { num:754, names:["1 Clem","1Clem","1 Cl","1Cl","1 Letter of Clement"] },
    { num:755, names:["2 Clem","2Clem","2 Cl","2Cl","2 Letter of Clement"] },
  ];

  // Build lookup by lowest common name
  var BOOK_MAP = {};
  BOOKS.forEach(function(b) {
    b.names.forEach(function(n) {
      var key = n.toLowerCase().replace(/[.\\s]/g, '');
      BOOK_MAP[key] = b.num;
    });
  });

  // Regex: match a chapter:verse or chapter pattern after a potential book name
  // Pattern: (possible book name starts) followed by chapter:verse[-endVerse]
  function findRefs(text) {
    if (!text || text.length < 4) return [];
    var results = [];
    // Find all chapter:verse candidates
    var re = /(\\d{1,3})(?::(\\d{1,3}))?(?:-(\\d{1,3}))?\\b/g;
    var m;
    while ((m = re.exec(text)) !== null) {
      var ch = parseInt(m[1], 10);
      var vs = m[2] ? parseInt(m[2], 10) : 1;
      var endVs = m[3] ? parseInt(m[3], 10) : undefined;
      if (ch < 1 || ch > 200 || vs < 1 || vs > 200) continue;

      // Scan backwards from this match to find a book name
      var beforeText = text.slice(Math.max(0, m.index - 50), m.index);
      var matchedBook = null;
      var matchStart = -1;
      var bestDistance = Infinity;

      BOOKS.forEach(function(book) {
        book.names.forEach(function(abbr) {
          var idx = beforeText.toLowerCase().lastIndexOf(abbr.toLowerCase());
          if (idx === -1) return;
          var end = idx + abbr.length;
          // Check boundary before
          var charBefore = idx > 0 ? beforeText[idx - 1] : ' ';
          if (/[\\s(\\[{\\'"]/.test(charBefore) || charBefore === undefined) {
            var dist = m.index - end;
            if (dist < bestDistance && dist >= 0) {
              var charAfterBook = end < beforeText.length ? beforeText[end] : ' ';
              if (/[\\s]/.test(charAfterBook)) {
                bestDistance = dist;
                matchedBook = book.num;
                matchStart = Math.max(0, m.index - 50) + idx;
              }
            }
          }
        });
      });

      if (matchedBook !== null) {
        results.push({
          book: matchedBook,
          chapter: ch,
          verse: vs,
          endVerse: endVs,
          matchStart: matchStart,
          matchEnd: m.index + m[0].length,
        });
      }
    }
    return results;
  }

  // Walk text nodes and linkify
  function walkAndLinkify(root) {
    var treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var textNodes = [];
    while (treeWalker.nextNode()) textNodes.push(treeWalker.currentNode);

    textNodes.forEach(function(textNode) {
      var text = textNode.textContent;
      var refs = findRefs(text);
      if (refs.length === 0) return;

      var parent = textNode.parentNode;
      // Skip if already linked
      if (parent.tagName === 'A' || parent.classList.contains('scripture-link')) return;
      // Skip if very small text (likely in sidebar, footer, etc.)
      if (text.length > 5000) return;

      var fragment = document.createDocumentFragment();
      var lastIdx = 0;

      refs.forEach(function(ref) {
        var localStart = Math.max(0, ref.matchStart);
        var localEnd = Math.min(text.length, ref.matchEnd);

        if (localStart > lastIdx) {
          fragment.appendChild(document.createTextNode(text.slice(lastIdx, localStart)));
        }

        var refText = text.slice(localStart, localEnd);
        var navPath = '/bible?book=' + ref.book + '&chapter=' + ref.chapter + '&verse=' + ref.verse;
        if (ref.endVerse) navPath += '&endVerse=' + ref.endVerse;

        var anchor = document.createElement('a');
        anchor.href = navPath;
        anchor.textContent = refText;
        anchor.className = 'scripture-link';
        anchor.style.color = '#C8A84B';
        anchor.style.textDecoration = 'underline';
        anchor.style.cursor = 'pointer';
        anchor.setAttribute('data-bible-ref', navPath);
        anchor.addEventListener('click', function(e) {
          e.preventDefault();
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'BIBLE_REF', ref: navPath }));
          } else {
            window.location.href = navPath;
          }
        });

        fragment.appendChild(anchor);
        lastIdx = localEnd;
      });

      if (lastIdx < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
      }

      if (parent) {
        parent.replaceChild(fragment, textNode);
      }
    });
  }

  // Run when DOM is ready
  function init() {
    if (document.body) {
      walkAndLinkify(document.body);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
true;
`;

type RouteParams = {
  url: string;
  title?: string;
  itemType?: string;
};

export default function InternalWebView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { url: rawUrl, title = 'Loading…', itemType = '' } = useLocalSearchParams<RouteParams>();
  const { colors, fontOption, theme } = useAppSettings();

  const url = decodeURIComponent(rawUrl ?? '');
  const typeColor = TYPE_COLORS[itemType] ?? Colors.gold.primary;

  // Build theme injection once per settings change
  const themeInjection = useMemo(
    () => buildThemeCSS(colors, fontOption, typeColor),
    [colors, fontOption, typeColor],
  );

  const webviewRef = useRef<WebView>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [fromCache, setFromCache] = useState(false);
  const [cachedHtml, setCachedHtml] = useState<string | null>(null);
  const [navTitle, setNavTitle] = useState(title);
  const [canGoBack, setCanGoBack] = useState(false);
  const [cachedAt, setCachedAt] = useState<Date | null>(null);

  // ── Network-first cache resolution ─────────────────────────────────────────
  const resolve = useCallback(async () => {
    if (!url) return;
    setLoadState('loading');
    setFromCache(false);

    const result = await fetchWithCache(url);
    if (!result) {
      setLoadState('error');
      return;
    }

    if (result.fromCache) {
      setFromCache(true);
      setCachedHtml(result.html);
      const meta = await getCacheMeta(url);
      if (meta) setCachedAt(new Date(meta.cachedAt));
      setLoadState('ready');
    } else {
      // Live fetch succeeded → let the WebView load it directly (full JS support)
      setCachedHtml(null);
      setFromCache(false);
      // loadState will be set by WebView onLoadEnd/onError
    }
  }, [url]);

  useEffect(() => {
    void resolve();
  }, [resolve]);

  // ── Download handler ─────────────────────────────────────────────────────────
  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'DOWNLOAD' && msg.url) {
          Alert.alert(
            'Download',
            `Download "${msg.name || msg.url.split('/').pop()}"?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Download',
                onPress: async () => {
                  const { default: FileSystem } = await import('expo-file-system');
                  const dest =
                    FileSystem.documentDirectory + (msg.name || msg.url.split('/').pop() || 'file');
                  try {
                    await FileSystem.downloadAsync(msg.url, dest);
                    Alert.alert('Saved', `File saved to app documents.`);
                  } catch {
                    Alert.alert('Error', 'Download failed.');
                  }
                },
              },
            ],
          );
        } else if (msg.type === 'BIBLE_REF' && msg.ref) {
          router.push(msg.ref as any);
        }
      } catch {
        // ignore non-JSON messages
      }
    },
    [router],
  );

  const handleNavState = useCallback((state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
    if (state.title) setNavTitle(state.title);
  }, []);

  const handleRefresh = useCallback(async () => {
    await clearCache(url);
    setCachedHtml(null);
    setFromCache(false);
    setLoadState('loading');
    void resolve();
  }, [url, resolve]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.bg.secondary, Colors.bg.primary]}
        style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              if (canGoBack && !cachedHtml) {
                webviewRef.current?.goBack();
              } else {
                router.back();
              }
            }}
          >
            <ChevronLeft size={22} color={Colors.text.secondary} />
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Globe size={13} color={typeColor} />
            <Text style={styles.titleText} numberOfLines={1}>
              {navTitle}
            </Text>
          </View>

          <TouchableOpacity style={styles.iconBtn} onPress={handleRefresh}>
            <RotateCcw size={18} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Offline / cache banner */}
        {fromCache && (
          <View style={styles.cacheBanner}>
            <WifiOff size={12} color={Colors.status.warning} />
            <Text style={styles.cacheText}>
              Offline — showing cached version
              {cachedAt ? ` from ${cachedAt.toLocaleDateString()}` : ''}
            </Text>
          </View>
        )}

        {/* Type badge */}
        {itemType ? (
          <View style={[styles.typeBadge, { borderColor: typeColor + '60', backgroundColor: typeColor + '18' }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>{itemType}</Text>
          </View>
        ) : null}

        <View style={styles.divider} />
      </LinearGradient>

      {/* Content */}
      <View style={styles.body}>
        {loadState === 'loading' && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={Colors.gold.primary} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        )}

        {loadState === 'error' && (
          <View style={styles.overlay}>
            <WifiOff size={36} color={Colors.text.muted} />
            <Text style={styles.errorTitle}>No connection</Text>
            <Text style={styles.errorBody}>
              This page isn't cached yet. Connect to the internet and try again.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
              <RotateCcw size={16} color={Colors.gold.primary} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cached HTML path: inject into WebView as baseUrl HTML string */}
        {loadState === 'ready' && cachedHtml && (
          <WebView
            ref={webviewRef}
            key="cached"
            source={{ html: cachedHtml, baseUrl: url }}
            style={styles.webview}
            injectedJavaScriptBeforeContentLoaded={themeInjection}
            injectedJavaScript={DOWNLOAD_INJECTION + ' ' + SCRIPTURE_LINKIFY_INJECTION}
            onMessage={handleMessage}
            onNavigationStateChange={handleNavState}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            allowFileAccess
            allowUniversalAccessFromFileURLs
            onShouldStartLoadWithRequest={(req) => {
              const ext = req.url.split('?')[0].split('.').pop()?.toLowerCase();
              if (['pdf', 'epub', 'mp3', 'mp4', 'zip', 'docx'].includes(ext ?? '')) {
                handleMessage({ nativeEvent: { data: JSON.stringify({ type: 'DOWNLOAD', url: req.url, name: '' }) } });
                return false;
              }
              return true;
            }}
          />
        )}

        {/* Live network path */}
        {!cachedHtml && url && (
          <WebView
            ref={webviewRef}
            key="live"
            source={{ uri: url }}
            style={[styles.webview, loadState === 'loading' && { opacity: 0 }]}
            injectedJavaScriptBeforeContentLoaded={themeInjection}
            injectedJavaScript={DOWNLOAD_INJECTION + ' ' + SCRIPTURE_LINKIFY_INJECTION}
            onMessage={handleMessage}
            onNavigationStateChange={handleNavState}
            onLoadStart={() => setLoadState('loading')}
            onLoadEnd={() => setLoadState('ready')}
            onError={() => setLoadState('error')}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            allowFileAccess
            allowUniversalAccessFromFileURLs
            geolocationEnabled={false}
            onShouldStartLoadWithRequest={(req) => {
              const ext = req.url.split('?')[0].split('.').pop()?.toLowerCase();
              if (['pdf', 'epub', 'mp3', 'mp4', 'zip', 'docx'].includes(ext ?? '')) {
                handleMessage({ nativeEvent: { data: JSON.stringify({ type: 'DOWNLOAD', url: req.url, name: '' }) } });
                return false;
              }
              return true;
            }}
          />
        )}
      </View>
    </View>
  );
}

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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg.elevated,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    overflow: 'hidden',
  },
  titleText: {
    flex: 1,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  cacheBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.status.warning + '18',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginBottom: Spacing.xs,
  },
  cacheText: {
    fontSize: Typography.size.xs,
    color: Colors.status.warning,
    flex: 1,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: Spacing.xs,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.8,
  },
  divider: { height: 1, backgroundColor: Colors.border.subtle },
  body: { flex: 1 },
  webview: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  loadingText: { fontSize: Typography.size.sm, color: Colors.text.muted },
  errorTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  errorBody: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.gold.primary,
    marginTop: Spacing.sm,
  },
  retryText: {
    fontSize: Typography.size.sm,
    color: Colors.gold.primary,
    fontWeight: Typography.weight.semibold,
  },
});
