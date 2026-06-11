import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { DarkColors, LightColors, type ThemeColors } from '@/constants/theme';

export type AppTheme = 'dark' | 'light';

export type FontOption = {
  key: string;
  label: string;
  /** Font family name as registered with useFonts — empty string = system default */
  regular: string;
  bold: string;
};

export const FONT_OPTIONS: FontOption[] = [
  { key: 'system',             label: 'System Default',      regular: '',                              bold: '' },
  { key: 'open-sans',          label: 'Open Sans',           regular: 'OpenSans_400Regular',           bold: 'OpenSans_700Bold' },
  { key: 'lato',               label: 'Lato',                regular: 'Lato_400Regular',               bold: 'Lato_700Bold' },
  { key: 'merriweather',       label: 'Merriweather',        regular: 'Merriweather_400Regular',       bold: 'Merriweather_700Bold' },
  { key: 'noto-serif',         label: 'Noto Serif',          regular: 'NotoSerif_400Regular',          bold: 'NotoSerif_700Bold' },
  { key: 'libre-baskerville',  label: 'Libre Baskerville',   regular: 'LibreBaskerville_400Regular',   bold: 'LibreBaskerville_700Bold' },
  { key: 'noto-ethiopic',      label: 'Noto Serif Ethiopic', regular: 'NotoSerifEthiopic_400Regular',  bold: 'NotoSerifEthiopic_700Bold' },
];

type AppContextValue = {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  colors: ThemeColors;
  fontOption: FontOption;
  setFontOption: (f: FontOption) => void;
  pushNotifications: boolean;
  setPushNotifications: (value: boolean) => void;
  verseOfDayNotifications: boolean;
  setVerseOfDayNotifications: (value: boolean) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

const THEME_KEY = 'wol_theme';
const FONT_KEY  = 'wol_font';
const PUSH_NOTIFICATIONS_KEY = 'wol_push_notifications';
const VOD_NOTIFICATIONS_KEY = 'wol_vod_notifications';

function getStored(key: string): string | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }
  return null;
}

function setStored(key: string, value: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const saved = getStored(THEME_KEY);
    return saved === 'light' ? 'light' : 'dark';
  });

  const [fontOption, setFontOptionState] = useState<FontOption>(() => {
    const savedKey = getStored(FONT_KEY);
    return FONT_OPTIONS.find((f) => f.key === savedKey) ?? FONT_OPTIONS[0];
  });

  const [pushNotifications, setPushNotificationsState] = useState<boolean>(() => {
    const saved = getStored(PUSH_NOTIFICATIONS_KEY);
    return saved === null ? true : saved === 'true';
  });

  const [verseOfDayNotifications, setVerseOfDayNotificationsState] = useState<boolean>(() => {
    const saved = getStored(VOD_NOTIFICATIONS_KEY);
    return saved === null ? true : saved === 'true';
  });

  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t);
    setStored(THEME_KEY, t);
  }, []);

  const setFontOption = useCallback((f: FontOption) => {
    setFontOptionState(f);
    setStored(FONT_KEY, f.key);
  }, []);

  const setPushNotifications = useCallback((value: boolean) => {
    setPushNotificationsState(value);
    setStored(PUSH_NOTIFICATIONS_KEY, String(value));
  }, []);

  const setVerseOfDayNotifications = useCallback((value: boolean) => {
    setVerseOfDayNotificationsState(value);
    setStored(VOD_NOTIFICATIONS_KEY, String(value));
  }, []);

  const colors = theme === 'dark' ? DarkColors : LightColors;

  return (
    <AppContext.Provider value={{
      theme,
      setTheme,
      colors,
      fontOption,
      setFontOption,
      pushNotifications,
      setPushNotifications,
      verseOfDayNotifications,
      setVerseOfDayNotifications,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppSettings(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppProvider');
  return ctx;
}
