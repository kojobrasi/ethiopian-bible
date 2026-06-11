export type ThemeColors = {
  bg: { primary: string; secondary: string; card: string; elevated: string; input: string; overlay: string };
  gold: { primary: string; light: string; dim: string; subtle: string; muted: string };
  text: { primary: string; secondary: string; muted: string; inverse: string };
  border: { subtle: string; default: string; bright: string };
  tab: { bg: string; border: string; active: string; inactive: string };
  status: { success: string; error: string; warning: string; info: string };
  types: { BIBLE: string; STUDY: string; DEVOTION: string; VIDEO: string; AUDIO: string; WEBSITE: string; QUIZ: string; MAP: string };
};

export const DarkColors: ThemeColors = {
  bg: {
    primary:   '#080F1C',
    secondary: '#0D1829',
    card:      '#111E33',
    elevated:  '#162641',
    input:     '#0E1A2E',
    overlay:   'rgba(8,15,28,0.85)',
  },
  gold: {
    primary: '#C8A84B',
    light:   '#E4C166',
    dim:     '#9B7A2E',
    subtle:  '#231C0A',
    muted:   '#5A4820',
  },
  text: {
    primary:   '#F0F4FF',
    secondary: '#8AAAC8',
    muted:     '#3D5470',
    inverse:   '#080F1C',
  },
  border: {
    subtle:  '#121E30',
    default: '#1A2E47',
    bright:  '#243F60',
  },
  tab: {
    bg:       '#090E1A',
    border:   '#111D2E',
    active:   '#C8A84B',
    inactive: '#3D5470',
  },
  status: {
    success: '#2E8B57',
    error:   '#C0392B',
    warning: '#D4880A',
    info:    '#2471A3',
  },
  types: {
    BIBLE:   '#C8A84B',
    STUDY:   '#3A7BD5',
    DEVOTION:'#C0392B',
    VIDEO:   '#8E44AD',
    AUDIO:   '#E84393',
    WEBSITE: '#27AE60',
    QUIZ:    '#E67E22',
    MAP:     '#2A7B7A',
  },
};

// Warm parchment light theme
export const LightColors: ThemeColors = {
  bg: {
    primary:   '#FAFAF4',
    secondary: '#F2EDE1',
    card:      '#FFFFFF',
    elevated:  '#F8F4EC',
    input:     '#F0EBE0',
    overlay:   'rgba(245,240,228,0.92)',
  },
  gold: {
    primary: '#B8930A',
    light:   '#9A7A08',
    dim:     '#D4A820',
    subtle:  '#FFF8DC',
    muted:   '#E8D080',
  },
  text: {
    primary:   '#1C1408',
    secondary: '#5A4630',
    muted:     '#9B8A6A',
    inverse:   '#FAFAF4',
  },
  border: {
    subtle:  '#EAE0CB',
    default: '#D9CEAF',
    bright:  '#C8BC94',
  },
  tab: {
    bg:       '#F0EBE1',
    border:   '#E0D5BB',
    active:   '#B8930A',
    inactive: '#9B8A6A',
  },
  status: {
    success: '#2E7D46',
    error:   '#B03020',
    warning: '#C07A08',
    info:    '#1F5F8F',
  },
  types: {
    BIBLE:   '#B8930A',
    STUDY:   '#2E6DC4',
    DEVOTION:'#B03020',
    VIDEO:   '#7A34A0',
    AUDIO:   '#C0307A',
    WEBSITE: '#207030',
    QUIZ:    '#C46010',
    MAP:     '#1E6A68',
  },
};

// Backward-compatible default (dark) — existing screens that haven't adopted useAppSettings
// continue to render correctly in dark mode
import CustomTheme from '../customization/theme';

function mergeObjects<T>(base: T, override?: Partial<T>): T {
  if (!override) return base;
  const result: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const key of Object.keys(override)) {
    const ov = (override as any)[key];
    const bv = (result as any)[key];
    if (ov && typeof ov === 'object' && !Array.isArray(ov) && bv && typeof bv === 'object') {
      result[key] = mergeObjects(bv, ov);
    } else {
      result[key] = ov;
    }
  }
  return result as T;
}

export const Colors: ThemeColors = mergeObjects(DarkColors, (CustomTheme && CustomTheme.colors) || undefined);

export const Spacing = mergeObjects(
  {
    xs:   4,
    sm:   8,
    md:   12,
    lg:   16,
    xl:   24,
    xxl:  32,
    xxxl: 48,
  } as const,
  (CustomTheme && CustomTheme.spacing) || undefined
) as const;

export const Radius = mergeObjects(
  {
    sm:   6,
    md:   10,
    lg:   14,
    xl:   20,
    xxl:  28,
    full: 9999,
  } as const,
  (CustomTheme && CustomTheme.radius) || undefined
) as const;

export const Typography = mergeObjects(
  {
    size: {
      xs:      10,
      sm:      12,
      md:      14,
      base:    15,
      lg:      16,
      xl:      18,
      xxl:     22,
      xxxl:    28,
      display: 34,
    },
    weight: {
      regular:   '400' as const,
      medium:    '500' as const,
      semibold:  '600' as const,
      bold:      '700' as const,
      extrabold: '800' as const,
    },
  } as const,
  (CustomTheme && CustomTheme.typography) || undefined
) as const;
