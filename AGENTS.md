## Architecture decisions

- Share one store/group scope across the company overview and ranking; expose group campaign indicators only as authenticated, demo-excluded monthly/professional aggregates, never other stores' raw sales or client details.

- Generate manager campaign-comparison PDFs from refreshed authenticated comparison reads, using shared annual calculations, bundled Unicode fonts and file delivery; show year-over-year and within-year monthly variation without mixing campaign points or adding payment information.

- Store imported annual campaign snapshots and monthly totals in report-only historical tables, never in operational sales or linked profile points; compare matching months and preserve source discrepancies so past campaigns cannot affect rankings, rewards, invoices or upgrade emails.

- Reuse the manager's read-only sales detail view for finance, scoped to the dashboard's selected month; rely on existing finance SELECT policies so consultation does not grant sales editing or manager access.

- Generate financial PDFs client-side from fresh authenticated reads on each click, excluding demo data and separating bank balances, invoice receipts and cash movements; use bundled Unicode fonts and the shared file-delivery helper without closing the cash register.

- Generate personal points statements from the authenticated professional's existing filtered sales, preserving recorded points and exporting all matching rows plus totals through the shared CSV file-delivery helper; never fetch other professionals for this download.

- Serialize ranking exports separately from the view with Brazilian numeric formatting, semicolon-separated UTF-8 CSV and the shared file-delivery helper so spreadsheet columns, accents and mobile downloads remain consistent.

- Export professional contact data through a field-allowlisted, parameterless RPC restricted to gestor and empresa roles; use one shared CSV/download control so both dashboards export all registered professionals without widening profile RLS or exposing identity documents and internal notes.

- Store professional profile photos in the private `fotos-profissionais` bucket under each user's ID and render them through short-lived signed URLs, because workspace policy disallows public buckets and profile images should remain authenticated-only.
- Store professional dashboard banners in the private `banners-profissionais` bucket and expose them through signed URLs; only managers may manage them.
- Normalize story images client-side to 1080x1920 WebP before private storage upload to reduce transfer size while preserving visual quality.
- Keep homepage banners separate from professional banners: managers manage `banners_home` and private `banners-home` uploads; the public read-only `banners-home` function exposes only active artwork through signed URLs (or seeded Lovable Assets URLs) so anonymous visitors can see the homepage without public buckets.
- Detect global destination upgrades transactionally from sales using a seeded high-water mark; wake a private email outbox on enqueue and use hourly failure reconciliation and provider idempotency so old achievements and successful deliveries are not repeated.
- Sort company lists and company-level report rows alphabetically with the shared `ordenarPorNome` helper in `src/lib/ordenar.ts`, because operators scan long company lists by name; professional rankings keep their points order.