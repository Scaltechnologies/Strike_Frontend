# Strike Vendor — Design System

> Version 1.0 · June 2026 · React Native / Expo

---

## 1. Brand Identity

**Strike** is a loyalty card platform for food & beverage vendors. The vendor app is a **professional operations tool** — not a consumer app. Every design decision should communicate reliability, speed, and control.

Design direction: **Modern food-tech SaaS** — think Square POS meets Stripe Dashboard, adapted for mobile.

---

## 2. Color Tokens

### Brand

| Token        | Hex       | Usage                                          |
|--------------|-----------|------------------------------------------------|
| `primary`    | `#CC2200` | CTAs, active states, brand highlights          |
| `primaryDark`| `#991A00` | Pressed states, focus rings                    |
| `primarySoft`| `#FFF0EE` | Backgrounds behind primary elements            |
| `accent`     | `#C17B2F` | Gold highlights, secondary labels, info icons  |
| `accentSoft` | `#FEF6EC` | Accent backgrounds                             |

### Semantic

| Token         | Hex       | Usage                             |
|---------------|-----------|-----------------------------------|
| `success`     | `#16A34A` | Active status, confirmed, positive|
| `successSoft` | `#F0FDF4` | Success backgrounds               |
| `warning`     | `#D97706` | Pending, needs attention          |
| `warningSoft` | `#FFFBEB` | Warning backgrounds               |
| `error`       | `#DC2626` | Errors, destructive, rejected     |
| `errorSoft`   | `#FFF1F1` | Error backgrounds                 |

### Neutral

| Token     | Hex       | Usage                             |
|-----------|-----------|-----------------------------------|
| `bg`      | `#F6F7FA` | Screen backgrounds                |
| `surface` | `#FFFFFF` | Cards, inputs, modals             |
| `border`  | `#EAECEF` | Dividers, card outlines           |
| `text`    | `#1A1A1A` | Primary text                      |
| `text2`   | `#5A6272` | Secondary text, labels            |
| `text3`   | `#9BA3AF` | Placeholder, hint, tertiary       |

### Inline DS Object (every screen file)

```typescript
const DS = {
  bg:          '#F6F7FA',
  surface:     '#FFFFFF',
  border:      '#EAECEF',
  primary:     '#CC2200',
  primaryDark: '#991A00',
  primarySoft: '#FFF0EE',
  accent:      '#C17B2F',
  accentSoft:  '#FEF6EC',
  success:     '#16A34A',
  successSoft: '#F0FDF4',
  warning:     '#D97706',
  warningSoft: '#FFFBEB',
  error:       '#DC2626',
  errorSoft:   '#FFF1F1',
  text:        '#1A1A1A',
  text2:       '#5A6272',
  text3:       '#9BA3AF',
};
```

> **Note on Home screen confirm button:** The "Confirm Strike" action uses `#16A34A` (success green) — NOT brand red. Green = money confirmed = good. Red is reserved for errors and brand identity only.

---

## 3. Typography Scale

All font weights use the system font stack (SF Pro on iOS, Roboto on Android).

| Name        | Size | Weight | Letter Spacing | Usage                        |
|-------------|------|--------|----------------|------------------------------|
| `display`   | 28px | 800    | —              | Splash headlines             |
| `h1`        | 22px | 800    | —              | Screen titles, hero numbers  |
| `h2`        | 18px | 700    | —              | Section headlines            |
| `h3`        | 16px | 700    | —              | Card titles, modal headers   |
| `bodyLg`    | 15px | 600    | —              | Nav labels, button text      |
| `body`      | 14px | 400–500| —              | General content              |
| `bodySm`    | 13px | 400–500| —              | Secondary info               |
| `caption`   | 12px | 500–600| —              | Chips, badges, timestamps    |
| `label`     | 11px | 700    | +1.0px         | Section labels (UPPERCASE)   |
| `micro`     | 10px | 700    | +0.5px         | Stat labels (UPPERCASE)      |

---

## 4. Spacing System

Base unit: **4px**

| Token | Value | Usage                               |
|-------|-------|-------------------------------------|
| `xs`  | 4px   | Icon gaps, tight inline spacing     |
| `sm`  | 8px   | Chip padding, compact rows          |
| `md`  | 12px  | Chip padding H, small card padding  |
| `lg`  | 16px  | Standard padding, card padding      |
| `xl`  | 20px  | Section gaps, header padding H      |
| `2xl` | 24px  | Sheet padding, screen horizontal    |
| `3xl` | 32px  | Large section gaps                  |
| `4xl` | 48px  | Auth screen top spacing             |

---

## 5. Border Radius Scale

| Token    | Value | Usage                                   |
|----------|-------|-----------------------------------------|
| `xs`     | 6px   | Small chips, micro badges               |
| `sm`     | 8px   | Tight chips, small tags                 |
| `md`     | 12px  | Inputs, buttons, small cards            |
| `lg`     | 16px  | Standard cards, section cards           |
| `xl`     | 20px  | Feature cards, queue items              |
| `2xl`    | 24px  | Sheet top corners, large modals         |
| `3xl`    | 32px  | Modal sheets, auth bottom card          |
| `pill`   | 50px  | Never use — replaced by `md` 14px      |

> **Convention change from old code:** Drop `borderRadius: 50` pill buttons. Use `borderRadius: 14` for all buttons — more modern, less consumer-app.

---

## 6. Elevation (Shadow) System

| Level | Shadow                          | Elevation | Usage                       |
|-------|---------------------------------|-----------|-----------------------------|
| `xs`  | `0 1 3 rgba(0,0,0,0.06)`       | 1         | Inputs on colored bg        |
| `sm`  | `0 2 6 rgba(0,0,0,0.05)`       | 2         | Standard cards              |
| `md`  | `0 4 12 rgba(0,0,0,0.08)`      | 4         | Elevated cards, header      |
| `lg`  | `0 8 24 rgba(0,0,0,0.10)`      | 6         | Modals, bottom sheets       |
| `colored` | Brand color at 30% opacity  | 5         | Primary CTAs only           |

---

## 7. Component Patterns

### 7.1 Button — Primary

```
┌─────────────────────────────────┐
│  [Icon]  Button Label           │  height: 52px
└─────────────────────────────────┘
  bg: primary   radius: 14   text: white/700/16px
  disabled: opacity 0.4
  loading: ActivityIndicator (white, small)
```

### 7.2 Button — Secondary (Outlined)

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│  [Icon]  Button Label           │  height: 52px
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
  bg: transparent  border: 1.5px primary  radius: 14
  text: primary/700/16px
```

### 7.3 Button — Ghost / Danger

```
   Button Label
  text: primary/600/15px  no bg  no border
```

### 7.4 Input

```
  Label (12px/600/text2)
  ┌─────────────────────────────────┐
  │  [Prefix]  value / placeholder  │  height: 52px
  └─────────────────────────────────┘
  bg: #F6F7FA  border: #EAECEF  radius: 12  text: 15px
  focus: border primary  error: border error
```

### 7.5 Status Badge

```
  ┌ ● ACTIVE ┐   bg: successSoft  text: success  radius: 20
  └──────────┘   dot: 6px circle (status color)
```

Status → Color mapping:
- `ACTIVE` → success / successSoft
- `PENDING_APPROVAL`, `PENDING` → warning / warningSoft
- `SUSPENDED`, `REJECTED`, `FAILED` → error / errorSoft
- `INACTIVE`, `TEMPORARILY_CLOSED` → text3 / bg

### 7.6 Section Card

```
  ┌────────────────────────────────┐
  │  SECTION LABEL (11px/700/text3)│  ← above card
  │  ──────────────────────────────│
  │  content                       │  bg: surface
  │                                │  radius: 16
  └────────────────────────────────┘  border: 1px border
```

### 7.7 Nav Row

```
  ┌────────────────────────────────────┐
  │ [icon/20]  Label        Subtitle ›  │  height: 56px
  └────────────────────────────────────┘
  icon color: text2  chevron: text3  label: 15/600/text
  subtitle: 12/400/text3  divider: 1px border (left-inset 50px)
```

### 7.8 Skeleton Loader

Use animated opacity pulse (0.3 → 0.8 → 0.3, 1.2s loop) on `bg` (#EAECEF) filled shapes matching the content shape.

```
  ┌──────────────────────────────┐
  │ ████████████  ███████████    │  ← text skeleton
  │ ██████████████████           │
  │ ████ │ ██████ │ ██████       │  ← row skeleton
  └──────────────────────────────┘
```

### 7.9 Empty State

```
       ┌──────────┐
       │  [icon]  │   72px circle, primarySoft bg, primary icon
       └──────────┘
         Title (18/800/text)
         Subtitle (14/400/text2, centered, max 260px wide)
         [Primary CTA]  (optional, if action exists)
```

### 7.10 Error State

```
       ┌──────────┐
       │  wifi-off│   60px, text3 color
       └──────────┘
         "Something went wrong" (16/700/text)
         error.message (13/400/text2)
         [  Retry  ]  (outlined primary, compact)
```

---

## 8. Screen Layout Templates

### 8.1 Detail Screen (push navigation)

```
  SafeAreaView (surface)
  ┌─ Header (56px) ─────────────────┐
  │ ← Back     TITLE     [Action]   │
  └─────────────────────────────────┘
  StatusBar: dark-content, surface bg
  ScrollView (bg) → contentContainerStyle: p16 pb32
```

### 8.2 Tab Screen (no back button)

```
  StatusBar: dark-content
  SafeAreaView (surface)
  ┌─ Header ───────────────────────┐
  │ Store Name          [icons]    │
  └─────────────────────────────────┘
  Content area (bg)
```

### 8.3 Auth Screen

```
  KeyboardAvoidingView (bg)
  ┌─ Brand Zone (40% height) ──────┐
  │   Logo + Tagline               │  bg: surface or gradient
  └─────────────────────────────────┘
  ┌─ Form Zone (flex 1) ───────────┐
  │   Fields + CTAs                │  bg: surface, radius: 32 top
  └─────────────────────────────────┘
```

### 8.4 Bottom Sheet Modal

```
  ModalOverlay: rgba(0,0,0,0.55)
  ┌─ Sheet (surface) ─────────────┐
  │  [handle bar 40×4]            │
  │  content                      │  radius: 28 top
  │  [actions footer]             │  pt16 pb32
  └─────────────────────────────────┘
```

---

## 9. Loading Strategy

| Scenario                  | Pattern                             |
|---------------------------|-------------------------------------|
| Initial screen load       | Skeleton loader (shape-matched)     |
| Pull-to-refresh           | RefreshControl (primary color)      |
| Button action (submit)    | ActivityIndicator in button         |
| Inline data reload        | ActivityIndicator centered          |
| Background sync           | Subtle header indicator (optional)  |

**Rule:** Never show a blank white screen. Always skeleton → content OR error.

---

## 10. Naming & File Conventions

- Design token object: always named `DS` (inline const in each file)
- Skeleton component: `function SkeletonBlock({ w, h, radius }: ...)` — define once per file if needed
- Status badge helper: `function statusStyle(status: string): { bg: string; fg: string }`
- Loading state name: `loading` (initial) + `refreshing` (pull-to-refresh)
- Error state name: `error` (`string | null`)

---

## 11. What's Changing vs. Current Code

| Area                  | Old                           | New (DS v1.0)                       |
|-----------------------|-------------------------------|--------------------------------------|
| Auth background       | `Colors.bgWarm` + circles     | Clean white + red brand zone         |
| Auth buttons          | `borderRadius: 50` pill       | `borderRadius: 14` modern            |
| Home header bg        | `#E8F5E9` (green)             | `DS.bg` (#F6F7FA) neutral            |
| Profile header bg     | `DS.primarySoft` (#FFF0EE)    | `DS.bg` → consistent neutral         |
| Loading states        | ActivityIndicator only        | Skeleton → content transition        |
| Colors import         | `Colors` (old file)           | Inline `DS` object (all files)       |
| Button border radius  | `50` (pill)                   | `14` (modern)                        |
| Section label style   | varies per file               | 11px / 700 / text3 / +1px tracking  |
