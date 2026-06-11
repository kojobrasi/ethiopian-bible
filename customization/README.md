# Customization

Place project-specific overrides in `customization/theme.ts`.

Examples:
- Change a color token: export `CustomColors` with partial keys.
- Adjust spacing or typography similarly by exporting `CustomSpacing`, `CustomRadius`, `CustomTypography`.

The app automatically merges these overrides with the defaults in `constants/theme.ts`.
