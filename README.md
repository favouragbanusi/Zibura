ZIBURA SITE FILES

Upload every file in this folder to the root of the GitHub repository (branch main).

Cloudflare Pages settings: build command node build.js, build output directory dist.
Secrets and bindings: STRIPE_SECRET_KEY, D1 database DB (zibura), R2 bucket PHOTOS (zibura-photos), Brevo key.

PAGES AND LOGIC
build.js: builds every page, sitemap, robots, headers, manifest and redirects into dist.
sheet.js: reads the Google Sheet tabs (Pieces, Copy, Images, Links, Looks) during the build.
_worker.js: handles /api routes (checkout, accounts, waitlist, reviews, Zi Cards, admin).
app.js: shared behaviour (menu, cart, cursor, reveals, Zi Card).
looks.js: Zi Looks wall.
waitlist.js: waitlist page effects.
styles.css: all styling.
schema.sql, update.sql, update-passport.sql: database setup and updates.

DATA
products.json: product list.
taxonomy.json: categories and types.
colors.json: colour names.

IMAGES AND BRAND FILES
logo-wordmark-navy.png, logo-wordmark-sky.png, logo-icon-navy.png, logo-icon-sky.png: logos.
favicon.png, favicon-dark.png, favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png: browser and phone icons.
share.png: link preview image (1200 by 630).
hero.jpg, ruova.jpg: home page images.
zi-card-*.png: Zi Card artwork.
Product photos (name-1.jpg, name-2.jpg): one pair per product.

DOCUMENTS
DESIGN_SYSTEM.md: colours, type, space, shape, buttons, fields, motion, do and do not.
QA_REPORT.md: the audit report.
CHANGELOG_QA.md: every change with old and new values.
