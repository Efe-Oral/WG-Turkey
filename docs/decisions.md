# Decisions on top of the brief

`EvArkadasiAra_BRIEF.md` stays the source of truth. These decisions were made with the project owner and take priority over it where they conflict.

## Product

- **Phone verification is off at launch.** It no longer blocks the first listing. It sits behind `PHONE_VERIFICATION_ENABLED`, so it can return later. While it is off:
  - First listings still go through manual review.
  - The verified phone badge is hidden.
  - The quality score rescales, so a listing can still reach 100 without the 10 phone points.
  - "Telefonu göster" and its form toggle are hidden, so nobody can publish an unverified number.
  - Phase 2 acceptance does not include phone verification.
- **Bringing phone verification back needs one more step.** The flag, the publish check and the phone reveal exist, but the SMS sending and the code screen are not built.
- **Prices use the total monthly cost.** Cards, the "Kira" filter and rent sorting all use `total_monthly`.
- **`total_monthly`** is rent + aidat + other costs + utilities (unless included in the rent). The deposit is excluded.
- **Room layout for Daire.** A room layout field (1+1, 2+1, 3+1...) is added to the form, the detail page and the filters.
- **Size for studios and flats.** `flat_size_m2` is required for them and drives the m² filter and sort. The key facts bar says "Daire büyüklüğü".
- **"Yayında tut" only resets the expiry clock.** Newest-first sorting stays on `published_at`.
- **Date filters mean "covers my stay".** Müsaitlik başlangıcı finds listings free by that date. Müsaitlik bitişi finds listings still free on that date, or open-ended.
- **Editing a live listing has no autosave.** Changes apply on "Kaydet", and moderation runs again, so a scam text can send it back to review.
- **A rejected listing returns to draft,** with the reason stored and emailed to the owner.
- **Three open reports pause a listing.** The owner can resume it once fewer than three remain open. A person can hold only one open report per listing, so three reports always means three accounts.

## Navigation

- "Şifremi unuttum" is removed, since there are no passwords.
- "Yardım" and "Geri bildirim" point to `/iletisim`, and "Nasıl çalışır" points to `/#nasil-calisir`. These are generic links for now.
- The homepage hero follows the brief's text. No separate real-estate reference screenshot exists.

## URLs

- There is no locale prefix.
- Category slugs are `oda`, `studyo` and `daire`.
- Listing URLs use `public_number`.
- `/ankara/cankaya` is added for all-category district pages. The second segment is checked as a category first, then as a district. The seed generator refuses a district slug that clashes with a category.
- Selecting several categories stays in the query string.

## Design

- The focus ring is cyan plus a thin black outline, because cyan alone is 1.52:1 on white.
- Input borders use `black/20%` as section 3.4 says, even though the tint list in section 3.1 only names `black/12%`.

## Login

- Supabase refuses custom email templates on its built-in mailer, so the login email holds a link until Resend is connected. The app accepts both the link and the 6-digit code.
- "Google ile devam et" stays hidden until `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` is true.

## Privacy and security

- `docs/reference/` is not committed. The screenshots contain real people's personal data, and this repo is public.
- Phone numbers never appear in public data. They are fetched only after login.
- Phone and URL masking happens on the server, so logged-out visitors never receive the raw text.
- `/dev/ui` returns 404 in production unless `ENABLE_DEV_UI=true`.
- All listing and message writes go through server actions. The public API can only read public data.
- Supabase's default grants are replaced with exact ones, because views skip Row Level Security.
- Account deletion keeps message text for the other person, with the sender erased. A lawyer should confirm this meets KVKK.
- `SUPABASE_SECRET_KEY` holds the service-role key locally, because the CLI masks the newer secret keys.

## Performance

- Public pages receive only the text their client components use. Larger sections wrap themselves in `FullMessages`.
- The login form and the Supabase browser client load on demand.
- The map loads when it is near the viewport.
- Link lists and reply times on the detail page are cached for two minutes, so they can lag slightly.
- The 410 check runs in `src/proxy.ts`, because a page render cannot answer 410.

## Open legal questions

These need a lawyer before launch. The project owner operates the site personally.

- **EİDS:** Turkish listing platforms reportedly must verify the poster's identity and authority over the property. No EİDS work is planned.
- **KVKK transfers abroad:** Frankfurt and any US vendors count as transfers abroad.
- **Consent wording:** the auth modal and the KVKK checkbox need review.
- **"LGBTİ+ dostu":** this household type needs a legal and data-sensitivity check.
