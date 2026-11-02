# Decisions on top of the brief

`EvArkadasiAra_BRIEF.md` stays the source of truth. These decisions were made with the project owner and take priority over it where they conflict.

## Product

- **Phone verification is off at launch.** It no longer blocks the first listing. It sits behind `PHONE_VERIFICATION_ENABLED`, so it can return later. While it is off:
  - First listings still go through manual review.
  - The verified phone badge is hidden.
  - The quality score rescales, so a listing can still reach 100 without the 10 phone points.
  - "Telefonu göster" and its form toggle are hidden, so nobody can publish an unverified number.
  - Phase 2 acceptance does not include phone verification.
- **Prices use the total monthly cost.** Cards, the "Kira" filter and rent sorting all use `total_monthly`.
- **`total_monthly`** is rent + aidat + other costs + utilities (unless included in the rent). The deposit is excluded.
- **Room layout for Daire.** A room layout field (1+1, 2+1, 3+1...) is added to the form, the detail page and the filters.
- **Size for studios and flats.** `flat_size_m2` is required for them and drives the m² filter and sort. The key facts bar says "Daire büyüklüğü".
- **"Yayında tut" only resets the expiry clock.** Newest-first sorting stays on `published_at`.

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

## Privacy and security

- `docs/reference/` is not committed. The screenshots contain real people's personal data, and this repo is public.
- Phone numbers never appear in public data. They are fetched only after login.
- Phone and URL masking happens on the server, so logged-out visitors never receive the raw text.
- `/dev/ui` returns 404 in production unless `ENABLE_DEV_UI=true`.

## Open legal questions

These need a lawyer before launch. The project owner operates the site personally.

- **EİDS:** Turkish listing platforms reportedly must verify the poster's identity and authority over the property. No EİDS work is planned.
- **KVKK transfers abroad:** Frankfurt and any US vendors count as transfers abroad.
- **Consent wording:** the auth modal and the KVKK checkbox need review.
- **"LGBTİ+ dostu":** this household type needs a legal and data-sensitivity check.
