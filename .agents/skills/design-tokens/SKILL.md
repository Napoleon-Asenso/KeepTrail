---
name: design-tokens
description: Use when working with the Matisse design system (matisse-tokens-all.json, matisse-tokens.css) or converting design tokens to CSS variables. Read this before editing theme/color/font/spacing files.
---

# Matisse Design Tokens

The design system lives in `matisse-tokens-all.json` and is compiled to CSS variables in `matisse-tokens.css` by `scripts/generate-css-variables.js`.

## Data model

- `color.light` -> `:root` scope override of color variables
- `color.dark` -> `[data-theme="dark"]` scope
- All other categories (`typography`, `spacing`, `borderRadius`, `shadows`, `elevation`) are theme-independent and land in `:root`.

Token names are already prefixed by category (`spacing-4`, `font-size-base`, `radius-md`, `shadow-xs`, `elevation-2`, `primary-color`), so they map 1:1 to `--<name>`.

## Regenerating CSS after editing the JSON

```bash
node scripts/generate-css-variables.js
# optional: node scripts/generate-css-variables.js <input.json> <output.css>
```

## Usage in components

```tsx
<div className="bg-[var(--surface-container-color)] p-[var(--spacing-6)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)]">
```

Dark theme is applied via the `data-theme="dark"` attribute on `<html>`; never hardcode dark values in components.

## Rules

- Edit the source JSON, never hand-edit `matisse-tokens.css`.
- Keep `:root` for light + global tokens; keep dark overrides only in `[data-theme="dark"]`.
- Do not rename or repurpose existing token variables without updating usages.