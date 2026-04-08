# Embedded Dashboard Brand Kit

## Purpose
This document defines the brand kit for the embedded B2B dashboard so frontend implementation can visually match the parent storefront as closely as possible, while avoiding marketing-page-only patterns.

Primary source pages analyzed:
- `https://xrff1c-0p.myshopify.com/`
- `https://xrff1c-0p.myshopify.com/pages/reolbegger-quote`
- `https://xrff1c-0p.myshopify.com/pages/trusted`

## Scope and interpretation rules
- Mirror storefront brand identity: typography, color language, control styling, spacing rhythm, border/shadow behavior.
- Do not copy storefront content layout patterns that are not dashboard-relevant (hero banners, editorial sections, promo CTA strips).
- Prefer the strongest repeated values across the three analyzed pages.
- If two values conflict, use this priority:
  1. global theme token (`:root` or `.color-scheme-*`)
  2. shared base component styling (`base.css`)
  3. repeated custom section overrides
  4. one-off section styling

## Brand DNA summary
- Visual tone: industrial/professional B2B, clean and high-contrast.
- Typography: IBM Plex Sans everywhere.
- Surface system: mostly white/light gray planes.
- Accent strategy:
  - red for primary actions/highlights
  - dark neutral for body content
  - muted gray for secondary/meta copy
  - blue used selectively as secondary accent/emphasis
- Shape language: mostly squared/low radius.
- Elevation: subtle and sparse.

---

## 1) Design Tokens (Canonical for embedded dashboard)

### 1.1 Color tokens
Use these as the embedded app token source of truth.

#### Core neutrals
- `--bk-color-bg-default: #FFFFFF`
- `--bk-color-bg-subtle: #F9F9F9`
- `--bk-color-bg-muted: #F1F3F4`
- `--bk-color-text-primary: #2F2F2F`
- `--bk-color-text-strong: #121212`
- `--bk-color-text-muted: #4A4A4A`
- `--bk-color-text-subtle: #828282`
- `--bk-color-border-default: #D8D8D8`
- `--bk-color-border-strong: #4A4A4A`

#### Brand accents
- `--bk-color-accent-primary: #C4262F`
- `--bk-color-accent-primary-hover: #9C0C11`
- `--bk-color-accent-secondary: #2D4D86`
- `--bk-color-accent-secondary-2: #1F5DA8`
- `--bk-color-accent-secondary-hover-dark: #2F2F2F`

#### Inverse and utility
- `--bk-color-text-inverse: #FFFFFF`
- `--bk-color-bg-inverse: #2F2F2F`
- `--bk-color-overlay-soft: rgba(0, 0, 0, 0.10)` (equivalent to `#0000001A`)

### 1.2 Typography tokens

#### Font family and weight
- `--bk-font-family-base: "IBM Plex Sans", sans-serif`
- `--bk-font-weight-regular: 300`
- `--bk-font-weight-medium: 500`
- `--bk-font-weight-semibold: 600`
- `--bk-font-weight-bold: 700` (used in custom sections)

#### Body scale
- Desktop base body: `16px`
- Mobile base body: `15px`
- Default body letter spacing: near `0` to `0.06rem` depending on component.

#### Heading scale used in storefront implementation
- `h1`: `28px` (`1.75rem`)
- `h2`: `24px` mobile, `28px` desktop in theme core
- `h3`: `20px` (`1.25rem`)

#### Frequently repeated custom sizes (important in real pages)
- `32px` (hero/major section headings)
- `28px` (section headings)
- `24px` (subsection headings/stat labels)
- `20px` (tabs, subheads, body-large)
- `18px` (supporting body in process sections)
- `16px` (standard action text, secondary body)
- `14px` (descriptions/meta)

### 1.3 Spacing tokens
The pages repeatedly use a 4px/8px rhythm with larger section paddings.

- `--bk-space-1: 4px`
- `--bk-space-2: 8px`
- `--bk-space-3: 12px`
- `--bk-space-4: 16px`
- `--bk-space-5: 20px`
- `--bk-space-6: 24px`
- `--bk-space-7: 28px`
- `--bk-space-8: 32px`
- `--bk-space-10: 40px`
- `--bk-space-12: 48px`
- `--bk-space-13: 50px`
- `--bk-space-15: 60px`
- `--bk-space-16: 64px`
- `--bk-space-17: 68px`

Common section paddings observed:
- `40px 20px`
- `50px 20px`
- `60px 20px`

### 1.4 Radius tokens
- `--bk-radius-none: 0px`
- `--bk-radius-sm: 2px` (rare)
- `--bk-radius-md: 4px` (primary controls)
- `--bk-radius-lg: 6px` (some cards)
- `--bk-radius-pill: 40px` (pill patterns)

### 1.5 Border and divider tokens
- Default border width: `1px`
- Active tab underline: `2px`
- Occasional structural divider: `1.5px` (stats mobile split)
- Inputs and cards generally use light-gray borders.

### 1.6 Shadow and elevation tokens
- Base theme shadows are mostly disabled.
- Practical elevated shadow used repeatedly:
  - `--bk-shadow-soft: 0 4px 12px rgba(0,0,0,0.10)`

### 1.7 Motion tokens
From storefront timing:
- `--bk-motion-fast: 100ms`
- `--bk-motion-default: 200ms`
- `--bk-motion-medium: 300ms`
- `--bk-motion-slow: 500ms`
- `--bk-ease-standard: ease`

Use subtle hover transitions (`200-300ms`), avoid dramatic movement.

---

## 2) Layout system for embedded dashboard

### 2.1 Container behavior
- Theme max width token is very large (`145rem`) because storefront sections can be wide.
- For dashboard readability, use:
  - page max content width: `1200-1440px`
  - horizontal padding:
    - mobile: `16px-20px`
    - desktop: `32px-40px`

### 2.2 Grid behavior
- Base storefront grid gaps:
  - mobile: `16px`
  - desktop horizontal: `24px`
  - desktop vertical: `8px`
- Dashboard recommendation:
  - card/list grids: `24px` desktop, `16px` mobile
  - dense form/table regions: `16px`

### 2.3 Section rhythm
- Standard dashboard section top/bottom: `40px-60px`.
- Internal card/content padding: `24px-28px` (matches trusted/cert blocks).

---

## 3) Component-level spec (dashboard-relevant)

## 3.1 Buttons

### Primary button
- Background: `#C4262F`
- Text: `#FFFFFF`
- Hover: `#9C0C11`
- Radius: `4px`
- Height target: `43-45px`
- Horizontal padding: `20-28px`
- Font: `16px`, `600`

### Secondary button
- Two valid variants observed:
  - dark neutral: `#2F2F2F` background, white text
  - brand blue: `#1F5DA8`/`#005FA8` background, white text
- Hover can darken toward `#2F2F2F`.

### Focus state
- Use clear 2-layer ring behavior:
  - inner ring close to background
  - outer ring with foreground alpha

## 3.2 Inputs and form fields
- Height: `48px` in base theme.
- Border: `1px solid #D8D8D8`
- Radius: 0px in theme token, but custom overrides commonly show `4px`; for dashboard use `4px` for practical parity with visible sections.
- Label/body sizing commonly `16px`.

## 3.3 Tabs
Observed on solution page:
- Inactive: `#828282`, transparent bottom border.
- Active: `#2F2F2F` with `2px` underline.
- Font: `20px`, `600`.
- Horizontal gap between tabs: around `32px`.

## 3.4 Cards
Observed card pattern (certification blocks):
- Background: white.
- Border: `1px solid #D8D8D8`.
- Radius: `6px`.
- Padding: `28px` desktop, `22px` mobile.
- Description text: `14px`, muted gray.
- Action link: red accent (`#C4262F`), `16px`, medium.

For dashboard KPI/info cards:
- keep same border/radius and padding principles
- use subtle/no shadow by default
- add `0 4px 12px rgba(0,0,0,0.10)` only for explicit emphasis states

## 3.5 Stats blocks / KPI rows
Observed in trusted stats section:
- Section background: `#F9F9F9`
- Main title: `28px`, `600`
- Number: `36px`, `500`, blue (`#2D4D86`)
- Label: `20px`, `500`, dark text
- Vertical separators: `1px #828282` desktop; on mobile, structure changes with left border accents.

## 3.6 Breadcrumbs
- Text size: `16px`
- Weight: `500`
- Regular breadcrumb text: dark/muted neutral
- Current page/accent segment often uses blue (`#2D4D86`)

## 3.7 FAQ/accordion style direction
- Questions use heading weight (`600`) with compact icon treatment.
- Answers in muted neutral body text.
- Use clean line separators or card divisions; avoid heavy decoration.

## 3.8 Header/nav influence for embedded app shell
The storefront header uses:
- high contrast iconography in `#2F2F2F`
- compact icon touch areas around `44px`
- restrained line separators

Dashboard app shell should mirror this through:
- icon button hit area min `40-44px`
- neutral text on light surface
- 1px separators

---

## 4) Responsive behavior

### 4.1 Typographic shifts
- Many custom sections downshift at `<=768px`:
  - large titles from `28-32px` down to `20-22px`
  - body from `20/18px` down to `16px`

### 4.2 Layout shifts
- Multi-column grids collapse to 1 or 2 columns at tablet/mobile.
- CTA buttons become full-width on mobile.
- Keep dashboard tables responsive through horizontal scroll wrappers and compact cell spacing.

### 4.3 Spacing shifts
- Maintain section spacing but reduce internal gaps:
  - desktop `24-32px`
  - mobile `12-20px`

---

## 5) Dashboard-specific application guidance

## 5.1 What to copy exactly
- Font family and major weight hierarchy.
- Core color palette and role assignment.
- Border + radius language (mostly low radius).
- Primary button red treatment and hover behavior.
- Muted text and subtle-divider patterns.

## 5.2 What to adapt for dashboard usability
- Reduce oversized marketing typography in data-dense views.
- Keep consistent card and panel patterns for fast scanning.
- Use blue accent as secondary/semantic highlight, not dominant CTA color.
- Prefer robust form affordances and clear table contrast.

## 5.3 What to avoid
- Hero banner proportions.
- Decorative image-heavy section spacing.
- One-off custom inline style hacks from marketing pages.

---

## 6) Implementation starter (CSS variables)

```css
:root {
  --bk-font-family-base: "IBM Plex Sans", sans-serif;

  --bk-color-bg-default: #ffffff;
  --bk-color-bg-subtle: #f9f9f9;
  --bk-color-bg-muted: #f1f3f4;
  --bk-color-text-primary: #2f2f2f;
  --bk-color-text-strong: #121212;
  --bk-color-text-muted: #4a4a4a;
  --bk-color-text-subtle: #828282;
  --bk-color-border-default: #d8d8d8;

  --bk-color-accent-primary: #c4262f;
  --bk-color-accent-primary-hover: #9c0c11;
  --bk-color-accent-secondary: #2d4d86;
  --bk-color-accent-secondary-2: #1f5da8;

  --bk-radius-none: 0px;
  --bk-radius-md: 4px;
  --bk-radius-lg: 6px;

  --bk-shadow-soft: 0 4px 12px rgba(0, 0, 0, 0.1);

  --bk-space-4: 16px;
  --bk-space-5: 20px;
  --bk-space-6: 24px;
  --bk-space-8: 32px;
  --bk-space-10: 40px;
  --bk-space-13: 50px;
  --bk-space-15: 60px;
}
```

---

## 7) Tailwind token mapping (if using Tailwind)
Suggested mapping in `tailwind.config`:
- colors:
  - `brand.red: #C4262F`
  - `brand.redHover: #9C0C11`
  - `brand.blue: #2D4D86`
  - `brand.blueAlt: #1F5DA8`
  - `ui.text: #2F2F2F`
  - `ui.textMuted: #4A4A4A`
  - `ui.textSubtle: #828282`
  - `ui.border: #D8D8D8`
  - `ui.bg: #FFFFFF`
  - `ui.bgSubtle: #F9F9F9`
  - `ui.bgMuted: #F1F3F4`
- fontFamily:
  - `sans: ["IBM Plex Sans", "sans-serif"]`
- borderRadius:
  - `none: 0`
  - `md: 4`
  - `lg: 6`
- boxShadow:
  - `soft: 0 4px 12px rgba(0,0,0,0.10)`

---

## 8) QA checklist for visual parity
- Typography uses IBM Plex Sans globally.
- Primary CTA red exactly matches (`#C4262F`) with correct hover.
- Body text colors stay in neutral range (`#2F2F2F`, `#4A4A4A`, `#828282`).
- Borders are subtle/light (`#D8D8D8`) and mostly 1px.
- Radius remains low and consistent (0/4/6).
- Mobile breakpoints reduce type and collapse grids correctly.
- No marketing-only hero spacing patterns in dashboard pages.

---

## 9) Source evidence links
- [Home page](https://xrff1c-0p.myshopify.com/)
- [Reolbegger Quote page](https://xrff1c-0p.myshopify.com/pages/reolbegger-quote)
- [Trusted page](https://xrff1c-0p.myshopify.com/pages/trusted)

