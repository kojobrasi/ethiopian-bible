import { ThemeColors } from '../constants/theme';

// Optional project-specific theme overrides.
// Export any of these values to override the defaults in `constants/theme.ts`.
export const CustomColors: Partial<ThemeColors> = {
  // Example: uncomment to change the primary gold across the app
  // gold: { primary: '#FFAA00' },
};

export const CustomSpacing = {
  // Example: xs: 6,
};

export const CustomRadius = {
  // Example: md: 12,
};

export const CustomTypography = {
  // Example: size: { base: 16 },
};

export default {
  colors: CustomColors,
  spacing: CustomSpacing,
  radius: CustomRadius,
  typography: CustomTypography,
};
