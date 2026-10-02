## Architecture decisions

- Store professional profile photos in the private `fotos-profissionais` bucket under each user's ID and render them through short-lived signed URLs, because workspace policy disallows public buckets and profile images should remain authenticated-only.
- Store professional dashboard banners in the private `banners-profissionais` bucket and expose them through signed URLs; only managers may manage them.