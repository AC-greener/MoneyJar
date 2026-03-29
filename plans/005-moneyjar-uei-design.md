# MoneyJar UI Design Specification

## Overview

- **App Name**: MoneyJar (存钱罐)
- **Screens**: 3 screens
- **Theme**: Light minimalist
- **Mascot**: Chubby golden piggy bank "Jinny"

---

## 60 / 30 / 10 Color Rule

### 60% — BASE (warm off-white)
- Page background: `#FAFAF8`
- Card background: `#FFFFFF`
- Rule: Most of the screen is air and white space. Numbers and content should "float" on it. Never fill a zone with color just to fill it.

### 30% — SECONDARY (cool gray-blue)
- Secondary text: `#9395A0`
- Dividers: `#EBEBED`
- Inactive icons: `#C2C3CC`
- Placeholder text: `#C2C3CC`
- Card border: `0.5px solid #EBEBED`
- Rule: Use for anything that supports but does not demand attention.

### 10% — ACCENT (warm gold)
- Gold: `#F5A623`
- Gold light bg: `#FEF3DC` (tinted surfaces only)
- Gold dark text: `#7A4F00` (text ON gold bg)
- Rule: Reserve gold ONLY for:
  - Jinny the mascot body
  - Primary CTA button (one per screen)
  - The single most important number (monthly total expense or balance)
  - Active nav icon
  - Mic button
  - NOTHING ELSE gets gold. Not headers. Not decorative lines. Not tags.

### Supporting Semantic Colors (<2%)
- Income green: `#34C759` (iOS system green)
- Expense red: `#FF3B30` (iOS system red)
- These only appear on transaction amounts and category bar fills. Never as backgrounds.

---

## Global Tokens

### Typography
- Font: SF Pro Display / Inter / Pretendard
- H1 display: `32px` weight-300 `#1A1A1A`
- H2 section: `18px` weight-500 `#1A1A1A`
- Body: `14px` weight-400 `#1A1A1A`
- Caption: `12px` weight-400 `#9395A0`
- Mono number: `14px` weight-500 tabular-nums

### Corners
- Card: `16px`
- Button: `12px`
- Pill: `999px`
- Row: `10px`

### Spacing
- Page margin: `24px`
- Card padding: `20px`
- Row padding: `14px` vertical, `16px` horizontal
- Section gap: `24px`
- Element gap: `12px`

### Elevation
- NONE. No drop shadows. Separation comes from color contrast between `#FFFFFF` card and `#FAFAF8` page.

---

## Mascot — Jinny the Golden Pig

Flat vector, chubby and round.

### Body Colors
- Main body: `#F5A623` (gold, 60% of pig area)
- Highlight area: `#FBBF24` (lighter, upper belly)
- Shadow area: `#D97706` (darker, underside)
- No actual gradients, just 3 overlapping shapes

### Details
- Coin slot on head top: `#7A4F00`, `3px` wide oval
- Eyes: `#1A1A1A` circles, `3px` white sparkle dot
- Cheek blush: `#FECDD3` soft circles, opacity 60%
- Snout: `#E09015` ellipse, two `#7A4F00` dot nostrils
- Legs: 4 small `#E09015` rounded rects
- Tail: `#E09015` tight spiral path

### 4 Expressions
1. **HAPPY** — eyes curved `^^`, tiny gold star above
2. **LISTENING** — eyes wide `O O`, 3 concentric arc lines beside head in `#C2C3CC` (30% color, not gold)
3. **PROUD** — eyes closed contentedly `( ‿ )`, 2–3 small coin shapes nearby in gold `#F5A623`
4. **SLEEPING** — eyes as thin lines, "z z" in `#C2C3CC` floating up-right

### Reference
Charm reference: Duolingo owl proportions, LINE Friends roundness, clean vector edges.

---

## Screen 1 — 首页 · 小猪的肚子

### Background
- `#FAFAF8` (60%)
- All secondary UI: `#9395A0` / `#EBEBED` (30%)
- Gold used: balance number + nav active icon (10%)

### Layout

#### Status bar
- Light mode, dark text

#### Top row (px 24)
- Left stack:
  - "早上好" `12px` `#9395A0` (30%)
  - "张晓明" `18px/500` `#1A1A1A`
- Right: avatar circle `36px`
  - bg `#EBEBED` (30%), text "张" `14px` `#9395A0`

#### HERO — Jinny mascot
- Centered, `180×180px`, HAPPY expression
- No background shape behind pig
- Pig floats directly on `#FAFAF8` page
- Below pig, two floating stat pills side by side, centered:
  - Left pill:
    - bg `#F0FBF5` (very pale green)
    - "↑ ¥12,500" `13px` `#34C759` weight-500
    - "收入" `11px` `#9395A0` below amount
    - radius `999px` px `14` py `8`
  - Right pill:
    - bg `#FFF3F2` (very pale red)
    - "↓ ¥8,219" `13px` `#FF3B30` weight-500
    - "支出" `11px` `#9395A0` below amount
    - radius `999px` px `14` py `8`
  - Gap between pills: `12px`

#### Balance block (centered, mt 20)
- "本月结余" `12px` `#9395A0` (30%) letter-spacing `0.08em`
- "¥ 4,280" — `40px` weight-300 `#F5A623` (GOLD, 10%)
- This is the ONLY gold text on this screen

#### AI Insight card (mx 24 mt 24)
- bg `#FFFFFF`, border `0.5px` `#EBEBED`, radius `16px`
- px `16` py `14`
- Left: `8px` circle dot, bg `#F5A623` (gold), pulse animation opacity `1→0.4→1` `2s`
- Right text: `13px` `#9395A0` (30%)
  - "餐饮支出比上月多 " + "23%" in `#1A1A1A/500` + "，主要在工作日午餐。"
- No colored background on this card. The dot is the ONLY gold element here.

#### Section header (px 24 mt 24)
- "最近记录" `14px/500` `#1A1A1A` (left)
- "全部" `12px` `#9395A0` (right) — NOT gold

#### Transaction rows (px 24, gap 8)
- Each row:
  - bg `#FFFFFF`, border `0.5px` `#EBEBED`,
  - radius `10px`, px `16` py `14`
  - Icon box `36×36` radius `8` bg `#F5F5F4` (30% neutral, NOT colored)
  - Text block flex-1 ml `12`
    - Line 1: name `13px/500` `#1A1A1A`
    - Line 2: "餐饮 · 今天 12:30" `11px` `#9395A0`
  - Amount right
    - Expense: "−28.00" `14px/500` `#FF3B30`
    - Income: "+12,500" `14px/500` `#34C759`

Rows:
1. 🍜 午餐·面馆 餐饮·今天 12:30  −28.00
2. 🚇 地铁通勤 交通·今天 08:15   −4.00
3. 💰 工资到账 收入·昨天        +12,500
4. ☕ 星巴克   餐饮·昨天 09:00  −38.00
5. 🛍 超市采购 购物·前天        −156.00

#### Bottom nav
- bg `#FFFFFF` border-top `#EBEBED`
- Left: House icon `#C2C3CC` (30%, inactive)
- Center: FAB circle `56×56px` bg `#F5A623` (GOLD 10%)
  - Mic icon inside `#FFFFFF` `22px`
  - Raised `8px` above nav bar
  - Thin ring `68×68px` border `1.5px` `#F5A623` opacity-20 around FAB
- Right: List icon `#C2C3CC` (30%, inactive)

Active state (Home selected):
- House icon fills to `#F5A623` (gold)
- Small `4px` gold dot below icon

---

## Screen 2 — 记账页 · 小猪在听

### Mood
- The emptiest screen. Maximum white space. Almost nothing on it.
- The pig and mic button are the whole point.

### Background
- `#FAFAF8`
- Gold used: mic FAB + confirm button only (10%)

### Layout

#### Status bar
- Same as Screen 1

#### Page label (centered mt 48)
- "说出你的消费" `13px` `#9395A0` (30%)
- No large title. No decoration.

#### HERO — Jinny LISTENING (centered mt 32)
- `160×160px`
- Sound wave arcs beside head:
  - 3 arcs each side
  - Color: `#EBEBED` (30% divider color, very subtle)
  - Stroke `1.5px`, no fill
  - Opacity: 80% / 50% / 25% outward
- Below pig, status text `13px` `#9395A0`:
  - Default: "按住麦克风开始说话"
  - Recording: "正在聆听..."
  - Parsing: "AI 解析中..."
- Status text centered, mt `12`

#### Mic FAB (centered mt 32)
- Inner circle: `68×68px` bg `#F5A623` (GOLD)
  - Mic icon `#FFFFFF` `24px`
- Outer ring: `84×84px`
  - border `1.5px` `#F5A623` opacity-25
- Recording state:
  - Outer ring pulses: scale `1→1.2` opacity `0.25→0` `1.5s` loop
- Label: "按住说话" `11px` `#9395A0` mt `12`

#### OR row (mt 32)
- `[line #EBEBED flex-1]` "或文字输入" `11px` `#C2C3CC` mx `12` `[line #EBEBED flex-1]`

#### Text input (mx 24 mt 16)
- bg `#FFFFFF` border `0.5px` `#EBEBED` radius `12px`
- px `16` py `14`
- Placeholder: "今天买苹果花了 15 块..." `13px` `#C2C3CC` (30% hint)
- Text when typing: `13px` `#1A1A1A`
- Right: arrow-up icon `16px` `#C2C3CC` turns `#F5A623` (gold) only when text exists

#### AI Parse Result (mx 24 mt 20)
- Appears after parse. Replaces "OR + input".
- Card: bg `#FFFFFF` border `0.5px` `#EBEBED` radius `16px`
- px `16` py `16`

- Top label row:
  - Small pill: bg `#FEF3DC` radius `999px` px `8` py `3`
  - "AI 解析" `10px` `#7A4F00` weight-500

- Result row mt `12`:
  - "🍎" `18px` + " 餐饮" `14px/500` `#1A1A1A` + "  |  " `14px` `#EBEBED` +
  - "¥ 15.00" `16px/500` `#F5A623` (GOLD — this is the key number) + "  |  " `14px` `#EBEBED` + "刚刚" `12px` `#9395A0`

- Divider line `#EBEBED` `0.5px` mt `12`

- Button row mt `12`, gap `8`:
  - Left 38%: "重新识别"
    - bg `#FAFAF8` border `0.5px` `#EBEBED`
    - radius `10px` py `12`
    - text `13px` `#9395A0`
  - Right 58%: "确认入账"
    - bg `#F5A623` radius `10px` py `12`
    - text `13px` `#7A4F00` weight-500
    - ONLY gold button on this screen

#### Coin animation (on confirm tap)
- Jinny switches to PROUD expression
- Coin: `24px` gold circle `#F5A623` with "¥" symbol `#7A4F00`
- Motion path: starts at "确认入账" button center
  - → curves up and arcs into pig's coin slot
  - Scale `1 → 0.3` as it enters slot
  - Opacity `1 → 0` at slot
- Animation: "Coin drop, 60fps ease-in-out, 400ms total, + '叮' SFX"

#### Bottom nav
- Same as Screen 1
- Center FAB active (recording):
  - bg `#FF3B30` (red) instead of gold to signal "recording in progress"

---

## Screen 3 — 明细页 · 小猪的账本

### Background
- `#FAFAF8`
- Gold used: active period tab + nav icon (10%)

### Layout

#### Status bar
- Same as Screen 1

#### Top row (px 24 mt 20)
- Left: "账本" `20px/500` `#1A1A1A`
- Right: period toggle — 3 pills in a row
  - Container: bg `#F0F0EF` radius `999px` p `3`
  - Each pill: "周" "月" "年" `12px` px `14` py `6`
  - Active: bg `#F5A623` text `#7A4F00` (GOLD 10%)
  - Inactive: bg transparent text `#9395A0` (30%)

#### Donut chart (centered mt 24)
- Outer diameter: `200px`
- Ring thickness: `28px`
- Center hole diameter: `144px`

- Center hole content:
  - "¥ 8,219" `20px` weight-300 `#1A1A1A`
  - "本月支出" `11px` `#9395A0` mt `4`

- Segments (smooth, no gap):
  | Category | %    | Color    |
  |----------|------|----------|
  | 餐饮     | 40%  | `#FF6B6B` (red variant) |
  | 购物     | 25%  | `#A78BFA` (soft purple) |
  | 交通     | 9%   | `#60BBA8` (muted teal) |
  | 娱乐     | 7%   | `#FBBF24` (amber) |
  | 其他     | 19%  | `#D1D5DB` (light gray) |

- Legend — 2 columns below chart, gap `8`
- Each legend item:
  - `8px` circle fill (segment color) + " 餐饮" `12px` `#1A1A1A` + "  ¥2,840" `12px` `#9395A0` mono right-aligned
- Row gap: `6px`

#### Category breakdown (mx 24 mt 24)
- Section header: "分类明细" `14px/500` `#1A1A1A`

- Each row card:
  - bg `#FFFFFF` border `0.5px` `#EBEBED`
  - radius `10px` px `16` py `12` mt `8`

  - Top line:
    - Left: emoji + " " + name `13px/500` `#1A1A1A`
    - Right: "¥ 2,840" `13px` `#9395A0` mono

  - Progress bar mt `8`:
    - Track: `4px` height bg `#F0F0EF` radius `2px`
    - Fill: segment color, width = percentage of max category
    - radius `2px`

| Emoji | Category | Amount | Bar % | Color |
|-------|----------|--------|-------|-------|
| 🍜    | 餐饮     | ¥2,840 | 65%   | `#FF6B6B` |
| 🛍    | 购物     | ¥1,920 | 44%   | `#A78BFA` |
| 🚇    | 交通     | ¥680   | 16%   | `#60BBA8` |
| 🎬    | 娱乐     | ¥560   | 13%   | `#FBBF24` |
| 💊    | 医疗     | ¥220   | 5%    | `#86EFAC` |

#### Jinny Weekly Summary card (mx 24 mt 24 mb 32)
- bg `#FFFFFF` border `0.5px` `#EBEBED` radius `16px`
- px `20` py `18`

- Top row:
  - Left: Jinny `44×44px` PROUD expression
  - Right of pig ml `12`:
    - "小猪周报" `13px/500` `#1A1A1A`
    - "2026 · 第 13 周" `11px` `#9395A0` mt `2`

- Divider `#EBEBED` `0.5px` mt `14`

- Summary text mt `14`:
  - `14px` `#4A4A55` line-height `1.75`
  - "这周餐饮花了 ¥840，比上周少 12%，表现不错！周五晚上消费最高，下周可以控制外出频率。🐷"
  - Plain text, no bold, no gold highlights
  - The warmth comes from Jinny beside it

- Bottom row mt `12`:
  - "由 AI 生成" `10px` `#C2C3CC` (30%) left
  - Small gold dot `6px` `#F5A623` right
  - The dot is a tiny, intentional 10% accent

#### Bottom nav
- Right List icon: `#F5A623` (active, gold)
- Center FAB: `#F5A623` (always gold)
- Left House icon: `#C2C3CC` (inactive, 30%)

---

## Deliverables

1. Single Figma page, light background `#FAFAF8`
2. 3 frames at `375×812px`, `80px` apart, side by side
3. Mascot reference card:
   - 4 Jinny expressions on `#FFFFFF` cards
   - `120×120px` each, `2×2` grid
   - Label each: HAPPY / LISTENING / PROUD / SLEEPING
4. Color guide strip below frames:
   - 60% swatch `#FAFAF8` + `#FFFFFF` labeled "Background"
   - 30% swatch `#9395A0` + `#EBEBED` labeled "Secondary"
   - 10% swatch `#F5A623` labeled "Accent — use sparingly"
5. All frames use Auto Layout, text and color styles defined
6. Annotation box on Screen 2: red dashed border around coin animation zone, label "Coin drop animation — see spec above"