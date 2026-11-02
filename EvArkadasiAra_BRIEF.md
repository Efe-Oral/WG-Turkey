# EvArkadaşıAra: Build Brief for Claude Code

This document is the single source of truth for building **EvArkadaşıAra**, a Turkish shared-housing listing site modeled on the classic WG-Gesucht.de experience. Read it fully before writing any code. If something here is ambiguous or conflicts with a technical constraint, **stop and ask me** instead of guessing. Do not add features that are not in this brief.

All UI text is **Turkish**. Code, comments, commit messages, DB names and this brief are **English**.

---

## 0. How to work

1. Build in the phases listed in section 14, in order. Finish and verify one phase before starting the next.
2. At the end of each phase: run lint, type-check and the Playwright smoke tests, then give me a short summary and wait for my "devam" before continuing.
3. Commit after each meaningful step with clear messages.
4. Reference screenshots of WG-Gesucht are in `/docs/reference/`. Use them only for **layout, proportions, spacing, component structure and behavior**. Never copy their logo, icons, photos, text or source code. All visuals and copy must be our own.
5. Never use cyan (`#35E5FD`) as a text color on a white background (contrast 1.52:1, unreadable). See section 3.
6. Never use em dashes in UI copy.

---

## 1. Product summary

- **What:** A free listing site where people offer rooms in shared flats (ev arkadaşı odası), studios (1+0) and flats in Turkey, and others search and message them.
- **Who offers:** Tenants with a free room, small landlords, and later businesses (apart/özel yurt, emlakçı).
- **Who searches:** Students, young professionals, international students.
- **Launch market:** All 81 provinces selectable, marketing focus on **Ankara**.
- **Design principle:** The simplicity of classic WG-Gesucht. Dense, plain, fast, list-first. No hero animations, no carousels on the homepage, no clutter, no ads.

### Hard product rules
- **Searchers never pay for anything.** No feature for searchers is ever locked or paid.
- **Posting a listing is free.** No per-listing fees, no mandatory subscriptions.
- Future paid items (NOT active at launch, only hooks): optional "Öne çıkar" (boost) for listers, and business accounts. See section 11.
- Browsing listings and listing detail pages works **without an account**. An account is required to message, post, and save favorites.
- There are **no "search request" (Gesuch) listings.** Only offers.

### Out of scope for v1 (do not build)
Payments, Gesuch/request listings, native apps, AI matching, landlord-permission field, document/credit check features, WG-Gesucht+ style locked stats, attachments in messages, multiple languages (only scaffold i18n), "Direkt buchen", Apple login, ads.

---

## 2. Tech stack

- **Framework:** Next.js (latest stable, App Router, TypeScript strict, Server Components, Server Actions). SSR for all public pages (SEO is critical).
- **Styling:** Tailwind CSS with design tokens from section 3. No component library that imposes its own look. Headless primitives (Radix UI) are allowed for dropdowns, dialogs, popovers, tabs.
- **Icons:** Lucide.
- **Backend:** Supabase (Postgres, Auth, Storage, RLS). Region **eu-central-1 (Frankfurt)**.
- **Hosting:** Vercel.
- **Email:** Resend (transactional: login code, new message notification).
- **Maps:** Leaflet + OpenStreetMap tiles (with proper attribution).
- **Forms/validation:** react-hook-form + zod. Every server action validates with zod again.
- **Charts (admin only):** Recharts.
- **Web analytics:** Plausible or Umami (cookie-free), configured via env var so I can choose. Plus our own `events` table (section 12).
- **i18n:** next-intl, only `tr` locale for now, all strings in `messages/tr.json`. No hardcoded UI strings.
- **Tests:** Playwright smoke tests per phase.
- **PWA:** Basic manifest and icons. No offline mode.

Environment variables go in `.env.example` with comments. Never commit secrets.

---

## 3. Design system

### 3.1 Colors (exact, do not add new brand hues)
| Token | Hex | Use |
|---|---|---|
| `cyan` | `#35E5FD` | Primary buttons (fill), active states, badges, selected chips, logo accent, focus rings, page accents |
| `graphite` | `#484848` | Search button, footer background, secondary dark buttons, icons |
| `black` | `#000000` | All body text, headings, links |
| `white` | `#FFFFFF` | Page and card backgrounds, text on graphite |

Neutral tints are allowed **only as opacity of black or graphite** (no new hues):
- Borders: `black/12%`
- Subtle section background / zebra rows: `black/4%`
- Secondary text (meta lines, placeholders): `black/60%`
- Disabled: `black/30%`

**Functional status colors (the only exception, use sparingly):**
- Error text and invalid input border: `#C62828`
- Valid input check icon: `#2E7D32`

**Contrast rules:**
- Text on cyan: always black. Text on graphite: always white.
- Links: black, underlined on hover, `font-weight: 500`.
- Cyan never as text color on white. Cyan text is allowed only on graphite or black backgrounds.

### 3.2 Typography
- Font: **Inter** via `next/font` (subsets `latin`, `latin-ext` for ğ, ş, ı, İ, ç, ö, ü). Enable tabular numbers (`font-variant-numeric: tabular-nums`) for prices, m² and dates.
- Sizes: body 15px / line-height 1.5; meta 13px; small 12px; H1 26px semibold; H2 20px semibold; H3 17px semibold; price in cards 18px bold.
- Turkish casing: use `toLocaleUpperCase('tr-TR')` anywhere text is uppercased (i → İ).

### 3.3 Spacing, radius, shadow
- Container max width 1200px, side padding 16px (mobile) / 24px (desktop).
- 4px spacing scale.
- Radius: form inputs 4px; cards 6px; pill buttons and filter dropdowns 999px.
- Shadow: cards `0 1px 3px black/8%`; floating buttons and modals `0 4px 16px black/12%`.

### 3.4 Components
- **Primary button:** cyan fill, black bold text, pill, height 44px (40px compact). Hover: darken 6% via filter, never change hue.
- **Secondary button:** white fill, black text, pill, shadow.
- **Dark button:** graphite fill, white text, pill (used for the main search button, like the reference real-estate site).
- **Text input:** white, 1px `black/20%` border, radius 4px, height 44px, label above in 13px semibold. Valid state shows a green check icon inside right. Error shows red border and red helper text below.
- **Dropdown (filter style):** pill, 1px border, centered value text "fark etmez" when empty, caret on right. Opens a white popover with a list; selected rows show a black check on the left and a light `black/4%` background.
- **Multi-select dropdown:** same, plus a small round graphite badge on the top-right of the trigger showing the number of selected items (see reference `dropdown-multiselect`).
- **Checkbox / radio:** native size 18px, accent color cyan, label 15px.
- **Toggle switch:** for boolean settings.
- **Chip:** pill, `black/4%` background, 13px text; selected chip is cyan fill.
- **Card:** white, border, 6px radius, shadow.
- **Modal:** white, 16px radius, title left, close X on right, max width 520px, backdrop `black/40%`.
- **Toast:** bottom center, graphite background, white text.
- **Avatar:** circle; if no photo, graphite background with white initials.
- **Empty state:** short text + one primary button. No illustrations.

### 3.5 Logo
Wordmark: "EvArkadaşı" in Inter 800, black, followed by "Ara" in Inter 800, black, inside a cyan rounded rectangle (4px radius, 2px 6px padding). Build it as an SVG component. Favicon: the cyan "Ara" box alone. I may replace it later.

### 3.6 Responsiveness
Desktop-first visual design, but **every page must work at 360px width without horizontal scroll.** Below 768px: sidebars move below or into a collapsible section, the listing card stacks photo above text, the filter strip wraps into rows, the search bar stacks vertically. No separate mobile design pass.

### 3.7 Formatting
- Currency: `12.500 TL` using `Intl.NumberFormat('tr-TR')`. Always monthly: "12.500 TL / ay".
- Dates: `dd.MM.yyyy`. Relative times: "3 saat önce", "dün", "2 gün önce".
- Area: `15 m²`.

---

## 4. Global layout

### 4.1 Header (all pages)
Left: logo (links to `/`). Then nav links: **İlanlar** (`/ilanlar`), **Güvenlik** (`/guvenlik`), **İlan ver** (bold, `/ilan-ver`). Right: **Hesabım** (opens auth modal if logged out; dropdown with Mesajlar, İlanlarım, Favoriler, Profil, Çıkış if logged in). Unread message count badge (cyan circle, black number) next to Hesabım. Thin bottom border. Height 64px. No ad-blocker banner.

### 4.2 Footer (all pages)
Above the dark footer: a white link grid in 4 columns (13px, `black/60%` links): "Popüler şehirler" (Ankara, İstanbul, İzmir, Eskişehir, Bursa, Antalya, Konya, Kocaeli...), "Ankara ilçeleri" (Çankaya, Keçiören, Yenimahalle, Etimesgut...), "Kategoriler" (Ev arkadaşı odası, Stüdyo (1+0), Daire), "Bilgi" (Nasıl çalışır, Güvenlik ipuçları).
Dark footer: graphite background, white text, two rows of pipe-separated links: "Yardım | Hakkımızda | Kullanım Şartları | KVKK Aydınlatma Metni | Gizlilik Politikası | Çerez Politikası | İletişim" and "İlanları gör | İlan ver | Şifremi unuttum | Geri bildirim". Bottom row: Instagram link, language selector placeholder showing "TR".

---

## 5. Pages

URL slugs are Turkish, lowercase, ASCII (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u).

### 5.1 Homepage `/`
Mirrors the structure of the WG-Gesucht homepage reference, simplified.
1. **Search hero:** full-width band with a plain photo-free background (cyan, like the reference real-estate screenshot). A white rounded card (16px radius, shadow) containing one row: city autocomplete input, category multi-select, offer type ("İlanlar" only, so skip this control), and the dark "Ara" button with search icon. Above the row: "Türkiye'de ev arkadaşı, oda ve stüdyo ilanları" (black, semibold).
2. **Heading:** H1 "Ev arkadaşı, kiralık oda ve stüdyo bul" with subline "Birkaç dakikada yeni evine, ücretsiz ve doğrudan."
3. **Three category cards** in a row: "Ev arkadaşı odası", "Stüdyo (1+0)", "Daire". Each: Lucide icon, title, one line, link "Hemen ara" (goes to results with that category and the last used city or Ankara).
4. **One card "Odanı ilan et":** icon, title, short text, bullets ("Ücretsiz ilan ver", "İlgilenenlerle doğrudan iletişim", "Birkaç dakikada yayında"), primary button "İlan ver". (No Gesuch card.)
5. **"Nasıl çalışır?"** three short steps in a row.
6. **Safety strip:** one line "Evi görmeden asla kapora gönderme." + link to `/guvenlik`.
7. Footer link grid + footer.

### 5.2 Search results `/[il]/[kategori]` (e.g. `/ankara/oda`)
Also `/[il]` (all categories) and `/[il]/[ilce]/[kategori]`. `/ilanlar` redirects to the user's last city or `/ankara`.

**Top search bar** (full width, white card):
- **City input**: text field with autocomplete over the 81 provinces only. The user can type a partial name, but can only submit a value chosen from the list. Free text like "Ankara'da oda" is not possible. Turkish-aware matching (i/İ, ı/I).
- **Category** multi-select: Ev arkadaşı odası, Stüdyo (1+0), Daire. Badge with count.
- **Kiralama süresi** multi-select: Süresiz, Süreli.
- **m² (en az)** small numeric dropdown.
- **Kira (en fazla)** small numeric dropdown (TL steps: 5.000, 7.500, 10.000, 12.500, 15.000, 20.000, 25.000, 30.000, 40.000, 50.000+).
- Dark circular search button on the right.

**Horizontal filter strip** (directly below the search bar, always visible, NOT a modal): a light `black/4%` band with filters laid out horizontally in rows of compact pill dropdowns and checkboxes. First row visible by default; a "Daha fazla filtre" toggle expands more rows in place (pushes content down). Filters:
- Row 1: İlçe (multi-select, depends on city), Müsaitlik başlangıcı (date), Müsaitlik bitişi (date), Ev tipi (multi: Öğrenci evi, Çalışanlar evi, Kadınlar evi, Erkekler evi, Karma), Ev sakinleri cinsiyeti (Fark etmez / Kadın / Erkek / Karma), Aranan cinsiyet (my gender match), Yaşım (number input).
- Row 2 (expanded): Ev kişi sayısı min/max, Sigara (Fark etmez / İçilebilir / Balkonda / İçilmez), Eşyalı (Fark etmez / Eşyalı / Kısmen / Eşyasız), Evcil hayvan izinli, Yayın tarihi (Son 24 saat / 3 gün / 7 gün / fark etmez), Kat.
- Row 3 (expanded) as checkbox chips: Fotoğraflı, Balkon, Asansör, İnternet dahil, Faturalar dahil, Otopark, Engelli erişimine uygun.
- Right end of the strip: "Filtreleri temizle" link and "Uygula" primary button. Also apply on change (debounced) and reflect every filter in the URL query string so results are shareable and indexable where sensible.

**Layout under the bar:** two columns on desktop: left sidebar (240px) and results (rest).

Left sidebar (cards stacked):
1. "Favorilerim" with count and link.
2. "İlan numarasıyla ara" input + button.
3. "Diğer şehirler" list of province links (SEO).
(Search alerts by email come in a later phase; leave a disabled placeholder card "Yeni ilanları e-postayla al (yakında)".)

Results column:
- H1: "Ankara'da ev arkadaşı odaları, stüdyolar ve kiralık daireler" (dynamic by city and categories).
- Meta line: "195 ilan".
- Category chips with counts: "Ev arkadaşı odası (119) | Stüdyo (28) | Daire (48)".
- Sort dropdown (reference `dropdown-sort`): "Yayın tarihi" (default, newest), "Kira (en düşük)", "Kira (en yüksek)", "m² (en büyük)", "Müsaitlik başlangıcı", "Müsaitlik bitişi", "Ev kişi sayısı".
- **One listing per row** (single column, NOT a grid). Card spec:
  - Left: cover photo 260×195 (4:3), object-fit cover, photo count dots overlay at bottom, top-left label chip "Bireysel" or "İşletme". If boosted: chip "Öne çıkan" (cyan). Lazy loaded, Next Image.
  - Right, top row: **price** "12.500 TL / ay" (bold 18px) on the left, favorite heart on the right.
  - Title (semibold 16px, one line, ellipsis), whole card clickable.
  - Meta line 1 (13px, `black/60%`): "3 kişilik ev · Çankaya, Bahçelievler · 7. Cadde" (category-specific: for studio "Stüdyo (1+0) · ilçe, mahalle").
  - Meta line 2: "15 m²" · "01.12.2026'dan itibaren" or "01.12.2026 - 31.05.2027" · residents icon "2/3" (current residents / total) for rooms.
  - Bottom row: avatar + display name (+ verified phone check icon if verified) on the left, "3 saat önce" relative time on the right.
  - Card height about 200px on desktop. 12px vertical gap between cards.
- Pagination: numbered, "1 2 3 4 5 ... 10 >", 20 per page.
- Empty result: "Bu kriterlere uygun ilan yok." + "Filtreleri temizle" + "Odanı ilan et" buttons. Log a `search_zero_results` event.
- Empty city (zero listings at all): "{İl} için henüz ilan yok. İlk ilanı sen ver." + primary button. Page is `noindex` until it has at least one active listing.
- Below results: SEO text block placeholder per city (rendered from a DB/markdown field, empty by default), breadcrumb, "Popüler ilçeler" links.

### 5.3 Listing detail `/ilan/[id]-[slug]`
Follows the WG-Gesucht detail reference.

Two columns on desktop: left sticky contact column (300px), right main column.

**Top of main column:** "Önceki ilan" / "123 sonuç" / "Sonraki ilan" navigation (only when arriving from a search; keep the result IDs in session).

**Main column, in order:**
1. Title (H1) with a small category icon.
2. **Photo gallery:** large image, left/right arrows, counter chip "16 fotoğraf", click opens fullscreen lightbox with keyboard navigation. Below: "İlan no: 14290400".
3. **Key facts bar:** full-width graphite band, white text: left "Oda büyüklüğü: **15 m²**", right "Toplam aylık maliyet: **12.500 TL**".
4. **Maliyet** card: table rows Kira, Aidat, Faturalar (tahmini), Diğer giderler, Depozito. Empty values show "belirtilmemiş". Right side of this card: "İlan sahibi genelde X içinde yanıt veriyor" (from data, hidden if not enough data).
5. **Adres** and **Müsaitlik** side by side. Adres: street (no door number), mahalle, ilçe, il. Müsaitlik: "Başlangıç: 01.12.2026", "Bitiş: süresiz" or date, "Yayında: 3 saat".
6. **Description tabs:** "Oda", "Konum", "Ev hayatı", "Diğer" (only tabs with content are shown). Plain text, preserve line breaks, auto-link nothing. Phone numbers and URLs inside the text are masked unless logged in.
7. **Ev detayları** card (rooms only), bullet lists exactly like the reference:
   - "Ev:" 15 m² oda, 3 kişilik ev · Ev büyüklüğü: 110 m² · Ev sakinleri: 1 kadın, 1 erkek · Sakin yaşları: 22-28 · Sigara: balkonda · Ev tipi: Öğrenci evi, Karma · Konuşulan diller: Türkçe, İngilizce.
   - "Aranan:" Cinsiyet: fark etmez · Yaş: 20-30.
8. **Evin özellikleri** icon grid (round `black/4%` icon backgrounds, label below): Bina yaşı, Kat, Eşyalı, Isınma (Kombi / Merkezi / Soba / Klima / Yerden), Banyo (Küvet / Duş), İnternet (hız), Zemin (Laminat / Parke / Seramik / Halı), Otopark, Asansör, Balkon, Çamaşır makinesi, Bulaşık makinesi, Evcil hayvan izinli. Only show those that are set.
9. **Map:** Leaflet, approximate location only: a 300m radius circle around a jittered point (jitter generated once at publish time and stored). Never the exact pin. Button "Çevredeki ilanları göster" links to results filtered by ilçe.
10. Breadcrumb: "EvArkadaşıAra > Ankara > Ev arkadaşı odası > {başlık}".
11. Link lists: "{İlçe}'deki diğer ilanlar", "Yakın ilçeler", "Ankara'daki kategoriler".

**Left contact column (sticky card):**
- Avatar, display name, "Üye: Haziran 2026", verified phone badge if any, "Bireysel" / "İşletme".
- Secondary buttons: "Favorilere ekle", "Not al" (private note, stored per user).
- Primary button: **"Mesaj gönder"**.
- Secondary: "Telefonu göster" (only if the lister enabled phone display; requires login; logs `phone_reveal`).
- Small text links: "Paylaş" (copy link / WhatsApp share), "Şikayet et", "Yazdır".

**Sticky bottom bar** appears after scrolling past the gallery: name + type on the left, "Mesaj gönder" primary in the center, favorite heart and "Şikayet et" icon on the right.

Do NOT build: required documents section, credit check products, locked statistics, "Oben platzieren" upsells.

Logged-out user clicking Mesaj gönder / Favorilere ekle opens the auth modal and then continues the action.

Listing states: `active` (public), `pending_review` (only owner and admin), `paused` and `rented` (public page shows "Bu ilan artık yayında değil." with links to similar listings, HTTP 200 for 30 days then 410), `deleted` (404).

### 5.4 Post / edit listing `/ilan-ver` and `/ilan/[id]/duzenle`
Follows the WG-Gesucht "Angebot aufgeben" reference: a single long page with a left sticky section navigation (anchor links with icons) and white section cards on the right. Autosave draft every 10 seconds and on blur. Bottom: preview mini-card + buttons "Taslağı kaydet" (secondary) and "Yayınla" (primary). Required fields marked with `*`. Inline validation messages in Turkish.

Before the first listing: the user must verify a phone number (SMS OTP, see 6.2). Show this step inline at the top of the form if not verified.

Sections:
1. **Başlangıç:** İlan başlığı* (max 80 chars, live counter "45 karakter kaldı"), İl* (autocomplete from 81), Kategori* (Ev arkadaşı odası / Stüdyo (1+0) / Daire), Kiralama süresi* (Süresiz / Süreli).
2. **Konum:** İlçe* (dropdown depending on il), Mahalle* (text with suggestions), Sokak / Cadde*, Bina no (stored, never shown publicly), Posta kodu. Below: a small Leaflet map where the user drags a pin to the exact location (stored privately; the public map uses the jittered point).
3. **Ev bilgileri:** Müsaitlik başlangıcı* (date + "Bugün" button), Müsaitlik bitişi (required if Süreli), Bina tipi (Apartman / Site içinde / Müstakil / Rezidans), Kat (Bodrum, Zemin, Bahçe katı, 1-30+), Oda büyüklüğü m²* (for rooms), Ev büyüklüğü m², Toplu taşımaya yürüme (dakika), Bina yaşı (0-5 / 5-10 / 10-20 / 20+).
4. **Maliyet:** Kira (TL)*, Aidat, Faturalar (tahmini aylık), Diğer giderler, Depozito. Checkbox "Faturalar kiraya dahil". Show computed "Toplam aylık maliyet" live.
5. **Ev arkadaşı bilgileri** (only for category Oda): Ev kişi sayısı* (2-8+, including the free room), Şu anki sakinler: Kadın sayısı, Erkek sayısı*, Sakin yaş aralığı (min-max), Aranan cinsiyet* (Fark etmez / Kadın / Erkek), Aranan yaş aralığı, Sigara (İçilebilir / Balkonda / İçilmez), Evde evcil hayvan var mı, Konuşulan diller (multi-select), Ev tipi* (checkboxes: Öğrenci evi, Çalışanlar evi, Kadınlar evi, Erkekler evi, Karma; "daha fazla" reveals: Vejetaryen/vegan, LGBTİ+ dostu, Sessiz ev).
6. **Açıklama:** Tabs "Oda", "Konum", "Ev hayatı", "Diğer", each a textarea with a small word count badge on the tab. Below: "Toplam kelime: 0". Guidance text: "En az 50 kelime yazmanızı öneririz. Her başlık için birkaç cümle yeterli." Minimum to publish: 30 words total (soft guidance, hard minimum 30).
7. **Özellikler:** checkbox groups in 3 columns: Eşya (Eşyalı / Kısmen eşyalı), Isınma (single select), İnternet (Fiber / ADSL / Yok + hız dropdown), Banyo (Küvet, Duş, Odaya ait banyo), Zemin, Diğer (Çamaşır makinesi, Bulaşık makinesi, Balkon, Asansör, Otopark, Bahçe, Teras, Evcil hayvan izinli, Engelli erişimine uygun, Klima).
8. **Fotoğraflar:** upload area with "Kapak" label on the first tile, drag to reorder, "0 / 20". Minimum 3 photos to publish. Client-side resize to max 1600px longest side, WebP, quality 80. Strip all EXIF (especially GPS) before upload. Guidance: "Yatay veya kare, aydınlık fotoğraflar kullan. İnternetten bulunan veya telifli görseller yasaktır."
9. **İletişim:** Telefon numarasını ilanda göster (toggle, default off). Note: "Önerimiz site içi mesajlaşmayı kullanman."

On publish: the user's **first** listing goes to `pending_review`; later listings go `active` immediately unless flagged by automatic checks (section 10). Show a confirmation page with the listing link and "İlanını paylaş" (copy link, WhatsApp).

### 5.5 Messaging
**Compose** (`/mesaj/yeni?ilan=ID`), following the reference:
- Top card: listing summary (title, "3 kişilik ev | 15 m² | 12.500 TL", "İlana git" link) and lister avatar, name, member since.
- Label "Mesajın:" and a large textarea (min 20 chars, max 3000).
- Buttons row: "Şablon olarak kaydet" (ghost) on the left, "Gönder" (primary) on the right. Template picker dropdown above the textarea if the user has templates.
- No attachments. No "Oben im Postfach" upsell. No credit check box.
- **First time** a user sends a message, show the **safety modal** (see 5.8) and require clicking "Güvenlik ipuçlarını okudum".
- Rate limit: max 20 new conversations per user per 24 hours, max 1 message per 5 seconds.

**Inbox** (`/mesajlar`), following the reference:
- Left small card "Güvenli ara ve ilan ver" with a one-paragraph safety note and link.
- Main: filter dropdown "Tüm mesajlar / Okunmamış / Arşiv". List rows: avatar (initials if no photo), name + "(♂, 25)" if the sender filled gender and birth year, listing title (truncated), reply arrow icon if last message is mine, last message preview (one line, prefixed "Ben:" if mine), date. Unread rows bold. Checkbox on the right for bulk archive. Pagination.
- **Thread view** (`/mesajlar/[conversationId]`): listing summary card on top, messages as simple blocks (not chat bubbles, keep it plain): sender name, date-time, text. Reply box at the bottom. Phone numbers in messages are shown as-is (user's choice), but if a message contains words like "kapora", "IBAN", "önceden ödeme" show a small inline warning above it: "Evi görmeden ödeme yapma."
- "Kiralandı" shortcut inside a thread (for the lister): marks the listing as rented and records this conversation as the match.
- Email notification via Resend on new message (max one email per conversation per hour), with an unsubscribe link in settings.
- Realtime: Supabase Realtime for unread counts and open thread updates.

### 5.6 Auth modal
Follows the reference: title "Hoş geldin", subline "Giriş yap veya ücretsiz hesap oluştur.", email input, primary "Devam et", divider "veya", secondary "Google ile devam et". Footer: "Devam ederek Kullanım Şartları ve KVKK Aydınlatma Metni'ni kabul etmiş olursun." with links.
Email flow: Supabase email OTP, a **6-digit code** screen ("E-postana gelen 6 haneli kodu gir", resend after 60 s, hint to check spam). No passwords.
New users then see a short onboarding step: Ad, Soyadı (shown as "Ahmet Y."), and a required checkbox for KVKK consent (stored with timestamp and text version).

### 5.7 Account area (`/hesabim/...`)
Left sidebar menu (like the reference): Mesajlar, İlanlarım (sub: Yayında, Taslaklar, Pasif), Favoriler, Profil (sub: Profilim, Hakkımda, Ayarlar, Giriş bilgileri, Gizlilik, Hesabı sil), Mesaj şablonlarım.

**İlanlarım** (follows the "Meine Anzeigen" reference):
- Top right buttons: "Yeni ilan ver" (primary). No "Direkt buchen".
- Card heading: "3 yayında ilan" / "1 taslak" / "1 pasif ilan".
- Listing rows: photo left (square 220px), right: title, "Ankara · {sokak} | İlan no: 13322123", "Son güncelleme: 10.05.2026 (Oluşturma: 07.04.2026)", and a stats line: "Son 30 günde mesaj: **4** | Ziyaretçi: **120** | Kalite puanı **70%**" (free, never locked). Status chip (Yayında / İncelemede / Duraklatıldı / Kiralandı / Taslak).
- "⋮" menu: Düzenle, Duraklat / Yayına al, **Kiralandı olarak işaretle**, Öne çıkar (yakında), Sil.
  - "Kiralandı olarak işaretle" opens a small dialog: "Ev arkadaşını EvArkadaşıAra üzerinden mi buldun?" Evet / Hayır / Başka bir yerden. If Evet and there are conversations, let them optionally pick which conversation. Stores `rented_via_platform` and logs `listing_rented`. This is the **north star metric**.
  - "Sil" asks a required reason: Kiraladım (bu site), Kiraladım (başka yerden), Vazgeçtim, Diğer.
  - "Öne çıkar (yakında)" shows a toast "Bu özellik yakında geliyor. İlgin için teşekkürler." and logs `boost_interest`.
- "Sayfa başına ilan: 20" dropdown.
- Kalite puanı (0-100): photos (≥3: +25, ≥6: +10), description words (≥50: +20, ≥150: +10), all cost fields filled +10, room/WG details complete +15, phone verified +10.

**Profilim** (follows the reference): photo upload with "Düzenle" chip, fields: Ad, Soyadı, Görünen ad (dropdown: "Ahmet Y." / "Ahmet Yılmaz" / "Ahmet"), Cinsiyet (Kadın / Erkek / Belirtmek istemiyorum), Doğum yılı, Durum (Öğrenci / Çalışan / Diğer), Alan/Meslek (dropdown). Contact: Telefon (verified badge). Save button centered. No street address fields.
**Hakkımda:** free text shown to listers when you message them.
**Ayarlar:** email notification toggles.
**Hesabı sil:** deletes the account and all personal data (KVKK). Listings are deleted, conversations show "Silinmiş kullanıcı".

**Favoriler:** same single-column card list as results.

### 5.8 Safety modal and `/guvenlik` page
Modal (adapted from the reference, our own wording), title with shield icon "Önemli güvenlik ipuçları":
- **Kapora ve ön ödeme:** "Evi görmeden asla kapora veya depozito gönderme. Ev sahibi şehir dışındaysa ve anahtarı kargoyla göndermeyi teklif ediyorsa dikkat et."
- **Güvenli iletişim:** "Mümkün olduğunca site içi mesajlaşmayı kullan. Dolandırıcılar konuşmayı hızlıca WhatsApp'a veya e-postaya taşımak ister."
- **Kişisel bilgiler:** "Kimlik fotokopisi veya belgelerini ev görmeden paylaşma."
- **Bize bildir:** "Şüpheli ilan veya mesajları 'Şikayet et' ile bildir."
Buttons: primary "Güvenlik ipuçlarını okudum", text link "Güvenlik hakkında daha fazla bilgi". Store `safety_ack_at` on the user.
`/guvenlik` is a simple static page expanding these points, plus "Piyasanın çok altındaki fiyatlar", "Sahte ilan nasıl anlaşılır".

### 5.9 Legal pages
`/kullanim-sartlari`, `/kvkk`, `/gizlilik`, `/cerez-politikasi`, `/hakkimizda`, `/iletisim`. Create them with clearly marked placeholder content: a red-bordered note at the top "TASLAK: Hukuki inceleme gerekli". I will provide final texts.

---

## 6. Auth, roles and security

### 6.1 Roles
`user` (default) and `admin`. Admin is set manually in the DB for my account only. `account_type` on profiles: `private` (default) or `business` (future, admin-set only for now).

### 6.2 Phone verification
Required before publishing the first listing, optional otherwise. Supabase Phone OTP with a provider configurable via env (prefer a Turkish SMS provider such as Netgsm or İleti Merkezi through a small adapter; fallback Twilio). Turkish numbers only (+90 5xx). Rate limit OTP sends (3 per hour per number and per user). Store `phone_verified_at`.

### 6.3 RLS
Enable RLS on every table. Public read only for `active`/`paused`/`rented` listings and their public fields (exclude door number, exact lat/lng, phone unless `show_phone`). Use a public view or column-level select for listings. Owners can CRUD their own rows. Messages readable only by the two participants. `events` insert-only from server, readable only by admin. Admin routes check role on the server and in RLS.

### 6.4 Other
- Validate and sanitize all input server-side. No HTML in user text.
- Storage: listing photos bucket public-read via signed or public URLs; profile photos same; originals deleted on listing delete.
- Basic bot protection on auth and message send (Cloudflare Turnstile, invisible mode).
- Security headers (CSP, etc.) via `next.config`.

---

## 7. Data model (Postgres / Supabase)

Use these tables (adjust types sensibly, use `uuid` PKs, `timestamptz`, `created_at`/`updated_at` everywhere, enums as Postgres enums). Write migrations in `supabase/migrations`.

- **provinces** (id, name, slug, plate_code, lat, lng)
- **districts** (id, province_id, name, slug, lat, lng)
  Seed all 81 provinces and all districts (~973) from a reliable public dataset; document the source in the migration. Mahalle is free text on the listing (with suggestions from previously used values in that district).
- **profiles** (id = auth user id, first_name, last_name, display_name_mode, gender, birth_year, occupation_status, occupation_field, about, avatar_url, phone, phone_verified_at, account_type, role, safety_ack_at, kvkk_consent_at, kvkk_text_version, email_notifications, banned_at)
- **listings**
  - id, public_number (sequential, shown as "İlan no"), owner_id, status (`draft`, `pending_review`, `active`, `paused`, `rented`, `deleted`), category (`room`, `studio`, `flat`), rental_term (`open_ended`, `fixed`)
  - title, slug
  - province_id, district_id, neighborhood, street, building_no (private), postal_code, lat, lng (private), public_lat, public_lng (jittered)
  - available_from, available_to
  - building_type, floor, room_size_m2, flat_size_m2, transit_walk_min, building_age
  - rent, dues (aidat), utilities_estimate, other_costs, deposit, utilities_included, total_monthly (generated column)
  - household_size, residents_female, residents_male, residents_age_min, residents_age_max, wanted_gender, wanted_age_min, wanted_age_max, smoking, has_pets, languages (text[]), household_types (text[])
  - desc_room, desc_location, desc_household, desc_other, word_count
  - furnishing, heating, internet_type, internet_speed, bathroom (text[]), flooring, amenities (text[])
  - show_phone
  - quality_score
  - published_at, last_bumped_at, paused_at, rented_at, rented_via_platform (`yes`, `no`, `elsewhere`), rented_conversation_id, deleted_at, delete_reason
  - **Monetization hooks:** boosted_until (timestamptz, null), boost_source (`admin_test`, later `paid`)
  - moderation_flags (text[]), reviewed_by, reviewed_at, reject_reason
- **listing_photos** (id, listing_id, storage_path, width, height, sort_order, phash for duplicate detection)
- **favorites** (user_id, listing_id)
- **listing_notes** (user_id, listing_id, note)
- **conversations** (id, listing_id, lister_id, seeker_id, last_message_at, lister_unread, seeker_unread, archived_by_lister, archived_by_seeker, first_reply_at)
- **messages** (id, conversation_id, sender_id, body, created_at, read_at, flagged)
- **message_templates** (id, user_id, name, body)
- **reports** (id, reporter_id, listing_id or message_id or user_id, reason (`scam`, `fake`, `wrong_info`, `discriminatory`, `offensive`, `already_rented`, `other`), details, status, handled_by, handled_at)
- **events** (see section 12)
- **daily_metrics** (date, metric_key, dimension_key, value) filled by a nightly job for fast dashboard queries.

Indexes for search: (status, province_id, category, published_at desc), (status, district_id), rent, available_from, GIN on amenities/household_types.

Search query: active listings, boosted first only if `boosted_until > now()` (shown with "Öne çıkan" chip, max 2 per page), then the chosen sort.

---

## 8. Listing lifecycle and automation

- Active listings auto-expire to `paused` after **30 days** without update; email the owner 3 days before with a one-click "Yayında tut" link (logs `listing_renewed`).
- "Yayında tut" refreshes `last_bumped_at`. No paid bumping.
- Rented listings stay public 30 days with the "not available" notice, then return 410.
- Nightly job (Supabase cron / Edge Function): expire listings, compute `daily_metrics`, compute district median rents.

---

## 9. SEO

- SSR all public pages. Metadata per page:
  - Results: title "{İl} Ev Arkadaşı ve Kiralık Oda İlanları | EvArkadaşıAra", with district variants "{İlçe}, {İl} ev arkadaşı ilanları". Description includes count and price range.
  - Listing: "{Başlık}, {İlçe}/{İl} | {kira} TL" ; description from first 155 chars.
  - Homepage title: "EvArkadaşıAra: Ev Arkadaşı, Kiralık Oda ve Stüdyo İlanları".
- Canonical URLs; filter query params are `noindex, follow` except category and district which have their own paths.
- `sitemap.xml` (homepage, province pages with listings, district pages with listings, active listings), `robots.txt`.
- JSON-LD: `BreadcrumbList` everywhere; `Offer` / `Accommodation` on listing pages.
- Open Graph image: listing cover photo; default branded image otherwise.
- Clean Turkish slugs. Core Web Vitals: LCP < 2.5s on results page.

---

## 10. Moderation and trust

- First listing of each user: `pending_review`. Admin approves or rejects with a reason (email sent).
- Automatic flags (listing goes to `pending_review` even if not first):
  - Rent below 40% of the district median (once 10+ listings exist in that district).
  - Phone number, IBAN, URL, or words "kapora", "western union", "yurt dışındayım" in the description.
  - Photo perceptual hash matching a photo in another user's listing.
  - More than 3 listings created by one user within 24 hours.
- Report button on listings, messages and user profiles. 3 open reports on a listing auto-pause it until reviewed.
- Banning a user pauses all their listings and blocks messaging.
- Gender fields are presented as household information and preference, not as exclusion. Keep the wording neutral ("Aranan cinsiyet", "Ev sakinleri").

---

## 11. Monetization hooks (built now, inactive)

- `boosted_until` and the "Öne çıkan" chip and ranking logic exist and work, but only admins can set a boost (for testing) from the admin panel.
- "Öne çıkar (yakında)" menu item in İlanlarım logs interest (`boost_interest` event with listing_id).
- `account_type = business` exists, admin-settable, shows "İşletme" chip. Users who create 4+ listings get a dashboard flag "possible business" for me to review.
- No payment code, no prices, no paywalls anywhere.

---

## 12. Analytics and metrics

### 12.1 Collection
Two layers:
1. **Cookie-free web analytics** (Plausible or Umami, env-configurable) for traffic, sources, pages. Add custom events for key actions too.
2. **Own `events` table** for marketplace metrics:
   `events (id, created_at, name, user_id null, session_id, listing_id null, conversation_id null, province_id null, district_id null, props jsonb, referrer_source, utm_source, utm_medium, utm_campaign, device_type)`
   - `session_id`: random UUID in `sessionStorage` (not persistent, no cookie).
   - Never store message bodies, emails, phone numbers or IPs in events.
   - Insert via a server action / route handler, batched where possible, never blocking UI.

### 12.2 Event list (implement all)
`page_view` (with page_type), `search` (filters in props, result_count), `search_zero_results`, `filter_changed`, `listing_view`, `gallery_open`, `favorite_add`, `favorite_remove`, `phone_reveal`, `share_click` (channel), `message_compose_open`, `message_sent` (first_in_conversation bool), `message_reply` (with reply latency minutes), `signup_started`, `signup_completed`, `login`, `phone_verified`, `listing_draft_created`, `listing_submitted`, `listing_approved`, `listing_rejected`, `listing_published`, `listing_paused`, `listing_renewed`, `listing_expired`, `listing_rented` (rented_via_platform), `listing_deleted` (reason), `report_created` (reason), `boost_interest`, `safety_ack`, `empty_city_cta_click`.

### 12.3 Admin dashboard `/admin/metrics`
Only visible to `role = admin` (server-side check + RLS). Minimal, clean, same design system. Top bar: date range picker (Son 7 gün / 30 gün / 90 gün / özel), province filter (default Tümü, quick select Ankara), compare-to-previous-period toggle. Each KPI card: big number, % change vs previous period, small sparkline. Below cards, one line chart per section.

Sections and KPIs:
1. **North star:** Haftalık kiralanan ilan (rented_via_platform = yes), and total rented.
2. **Arz:** Yeni ilan / hafta, Aktif ilan, Ortalama ilan yaşı (gün), 3+ fotoğraflı ilan oranı, Tekrar ilan veren oranı, Bekleyen onay sayısı. Table: top districts by active listings.
3. **Talep:** Tekil oturum, Arama sayısı, Sıfır sonuçlu arama oranı + table of top zero-result (province, district, category, max rent) combinations, Filtre kullanım oranı, Favori ekleme.
4. **Eşleşme:** İlan başına mesaj (mean and median), İlk yanıt süresi (median), Yanıt oranı (conversations with a reply within 72h), İlanların 14 günde kiralanma oranı, Silme sebepleri dağılımı.
5. **Güven:** 100 ilan başına şikayet, Reddedilen ilan oranı, Otomatik flag sayısı by type.
6. **Büyüme:** Kayıtlar, Kaynak dağılımı (organik, direkt, WhatsApp, Instagram, utm), 7 ve 30 gün geri dönüş (logged-in users), Funnel: Ziyaret → İlan görüntüleme → Mesaj → Yanıt → Kiralandı.
7. **Para keşfi:** boost_interest tıklamaları (and unique listers), "Possible business" users list (4+ listings), District supply/demand ratio (searches per active listing), Median rent per district and category (for future data product).

Data comes from `daily_metrics` (nightly) plus live queries for today. Every chart has an empty state. Export any table as CSV.

### 12.4 Admin other pages
- `/admin/moderasyon`: queue of `pending_review` listings with flags, preview, Approve / Reject (reason select + text).
- `/admin/sikayetler`: open reports, link to target, actions: dismiss, pause listing, ban user.
- `/admin/kullanicilar`: search by email/name, view listings, ban/unban, set account_type, set boost for testing.

---

## 13. Seed data and environments

- Seed script for **local/dev only**: 40 fake Ankara listings across districts (Çankaya, Keçiören, Yenimahalle, Etimesgut, Mamak), categories and price ranges, with **placeholder images generated locally** (solid neutral images with text "Örnek fotoğraf"). Never use real photos from the web. Seed 5 fake users, a few conversations, and 60 days of synthetic `events` so the dashboard can be developed.
- Production starts empty. A guard prevents running the seed against production.
- README: setup steps, env vars, how to make my account admin, how to run migrations, seed and tests.

---

## 14. Phases and acceptance criteria

**Phase 0: Setup**
Repo, Next.js, Tailwind tokens, Inter, i18n scaffold, Supabase project link, migrations for provinces/districts + seed, base layout (header, footer), design system page `/dev/ui` showing every component in section 3.4.
Accept: `/dev/ui` renders all components, Turkish characters render correctly, Lighthouse accessibility ≥ 95 on `/dev/ui`.

**Phase 1: Browse**
Listings schema, seed data, results page (search bar, horizontal filter strip, single-column cards, sort, pagination, sidebar), listing detail page (without messaging), homepage, empty states, SEO metadata, sitemap.
Accept: filters and sort work and sync to URL; city input only accepts provinces from the list; detail page shows the approximate map circle; works at 360px; no listing exposes building_no or exact coordinates in HTML or API responses.

**Phase 2: Auth and posting**
Auth modal with email OTP + Google, onboarding with KVKK consent, phone verification, post/edit form with autosave, photo pipeline (resize, WebP, EXIF strip, reorder), first-listing review flow, quality score.
Accept: a new user can sign up, verify phone, publish a listing that lands in `pending_review`; EXIF GPS is absent from stored photos.

**Phase 3: Messaging**
Compose, safety modal, inbox, thread, templates, realtime unread counts, email notifications, rate limits, scam-word warning.
Accept: two test users can exchange messages; unread badge updates live; safety modal appears only once.

**Phase 4: Account area**
İlanlarım with free per-listing stats, rented dialog, delete reasons, pause/resume, renew via email link, favorites, notes, profile, settings, account deletion.
Accept: marking rented records `rented_via_platform`; deleting the account removes personal data.

**Phase 5: Admin and metrics**
Event tracking for every event in 12.2, nightly `daily_metrics` job, `/admin/metrics`, moderation, reports, users, automatic moderation flags, listing expiry job.
Accept: dashboard shows all KPIs from seed data; non-admin users get 404 on all `/admin` routes.

**Phase 6: Polish**
Legal placeholder pages, `/guvenlik`, OG images, performance pass (LCP < 2.5s on results), accessibility pass, Playwright smoke tests for the main flows, README.
Accept: all smoke tests pass; no console errors; Lighthouse performance ≥ 85 and accessibility ≥ 95 on homepage, results and detail pages (mobile).

---

## 15. Copy and tone

- Turkish, informal "sen" form, short sentences, friendly but plain.
- Use "ev arkadaşı", "oda", "ilan", "kira", "aidat", "depozito" consistently.
- Button labels are verbs: "Ara", "İlan ver", "Mesaj gönder", "Kaydet", "Yayınla".
- No marketing superlatives, no emoji in the UI.
- Never claim the site verifies listings or users beyond what is true ("Telefonu doğrulanmış" only when phone is verified).

---

## 16. Reference screenshot index (`/docs/reference/`)
I will place these files (personal data redacted):
- `home.png`: WG-Gesucht homepage structure
- `results.png`: results page (note: we use a single column, not their 2-column grid)
- `filter-*.png`: their new filter modal (use only for the list of fields; we build a horizontal strip instead)
- `dropdown-sort.png`, `dropdown-multiselect.png`: dropdown style
- `detail.png`: listing detail page
- `wg-details.png`: "WG-Details" and "Angaben zum Objekt" blocks
- `post-form.png`: listing creation form
- `compose.png`, `inbox.png`: messaging
- `auth-modal.png`, `safety-modal.png`
- `my-listings.png`, `profile.png`: account area
- `palette-hc24-*.png`: source of the color palette

When the brief and a screenshot disagree, **the brief wins**.
