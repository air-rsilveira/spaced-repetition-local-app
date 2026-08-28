# Visual Identity

This document defines the visual identity for the project. Apply these guidelines to all UI work.

## Styling Framework

- Use **Tailwind CSS** for all styling. Prefer utility classes over custom CSS.
- Only write custom CSS when a style genuinely cannot be expressed with Tailwind utilities.
- Configure the palette below in `tailwind.config` under `theme.extend.colors` so tokens are reusable (e.g. `bg-aws-squid-ink`, `text-aws-orange`).
- Keep spacing, typography, and sizing consistent by relying on Tailwind's default scale.

## Color Scheme — AWS Palette

Follow the AWS color scheme. These are the core brand colors and their intended usage.

### Primary Brand Colors

| Token          | Hex       | Usage                                              |
| -------------- | --------- | -------------------------------------------------- |
| `aws-orange`   | `#FF9900` | Primary accent, CTAs, active states, highlights    |
| `aws-squid-ink`| `#232F3E` | Primary dark surface, headers, nav, footer         |
| `aws-anchor`   | `#161E2D` | Deepest background, elevated dark contrast         |

### Secondary / Support Colors

| Token             | Hex       | Usage                                       |
| ----------------- | --------- | ------------------------------------------- |
| `aws-blue`        | `#146EB4` | Links, secondary actions, informational UI  |
| `aws-blue-dark`   | `#0F5A94` | Hover state for blue elements               |
| `aws-orange-dark` | `#EC7211` | Hover/pressed state for orange elements     |

### Neutrals

| Token           | Hex       | Usage                              |
| --------------- | --------- | ---------------------------------- |
| `aws-white`     | `#FFFFFF` | Light surfaces, text on dark       |
| `aws-gray-100`  | `#F2F3F3` | Page background (light mode)       |
| `aws-gray-200`  | `#EAEDED` | Card background, dividers          |
| `aws-gray-400`  | `#AAB7B8` | Borders, disabled states           |
| `aws-gray-600`  | `#545B64` | Secondary text                     |
| `aws-gray-900`  | `#16191F` | Primary text on light backgrounds  |

### Semantic Colors

| Token          | Hex       | Usage                    |
| -------------- | --------- | ------------------------ |
| `aws-success`  | `#1D8102` | Success messages, valid  |
| `aws-warning`  | `#FF9900` | Warnings (reuses orange) |
| `aws-error`    | `#D13212` | Errors, destructive      |
| `aws-info`     | `#146EB4` | Info (reuses blue)       |

## Tailwind Config Snippet

Add these tokens to `tailwind.config.js` (or `.ts`):

```js
theme: {
  extend: {
    colors: {
      aws: {
        orange: '#FF9900',
        'orange-dark': '#EC7211',
        'squid-ink': '#232F3E',
        anchor: '#161E2D',
        blue: '#146EB4',
        'blue-dark': '#0F5A94',
        white: '#FFFFFF',
        'gray-100': '#F2F3F3',
        'gray-200': '#EAEDED',
        'gray-400': '#AAB7B8',
        'gray-600': '#545B64',
        'gray-900': '#16191F',
        success: '#1D8102',
        error: '#D13212',
      },
    },
  },
}
```

## Usage Guidelines

- **Primary actions**: `bg-aws-orange` with `hover:bg-aws-orange-dark` and dark text (`text-aws-squid-ink`) for contrast.
- **Secondary actions**: `bg-aws-blue` with `hover:bg-aws-blue-dark` and `text-aws-white`.
- **Headers / navigation**: `bg-aws-squid-ink` with `text-aws-white`; use `aws-orange` for the active item.
- **Body text**: `text-aws-gray-900` on light backgrounds, `text-aws-white` on dark surfaces.
- **Cards / panels**: `bg-aws-white` on an `aws-gray-100` page background, with `border-aws-gray-200`.
- **Reserve `aws-orange` as an accent.** Do not flood large areas with it; it signals interactivity and emphasis.

## Accessibility

- Maintain a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text.
- Do not place `aws-orange` text on white or light-gray backgrounds for body copy (fails contrast). Use it on dark surfaces or as a background with dark text.
- Never rely on color alone to convey meaning; pair semantic colors with icons or labels.
