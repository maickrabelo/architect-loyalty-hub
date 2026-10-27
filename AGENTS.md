## Architecture decisions

- Serialize ranking exports separately from the view with Brazilian numeric formatting, semicolon-separated UTF-8 CSV and the shared file-delivery helper so spreadsheet columns, accents and mobile downloads remain consistent.

- Export professional contact data through a field-allowlisted, parameterless RPC restricted to gestor and empresa roles; use one shared CSV/download control so both dashboards export all registered professionals without widening profile RLS or exposing identity documents and internal notes.

- Store professional profile photos in the private `fotos-profissionais` bucket under each user's ID and render them through short-lived signed URLs, because workspace policy disallows public buckets and profile images should remain authenticated-only.
- Store professional dashboard banners in the private `banners-profissionais` bucket and expose them through signed URLs; only managers may manage them.
- Normalize story images client-side to 1080x1920 WebP before private storage upload to reduce transfer size while preserving visual quality.
- Keep homepage banners separate from professional banners: managers manage `banners_home` and private `banners-home` uploads; the public read-only `banners-home` function exposes only active artwork through signed URLs (or seeded Lovable Assets URLs) so anonymous visitors can see the homepage without public buckets.
- Detect global destination upgrades transactionally from sales using a seeded high-water mark; wake a private email outbox on enqueue and use hourly failure reconciliation and provider idempotency so old achievements and successful deliveries are not repeated.