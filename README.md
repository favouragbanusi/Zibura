# Zibura store

A static storefront hosted on Cloudflare Pages.

Files in the main folder:

- products.json holds the products.
- build.js turns the data into pages.
- styles.css and app.js hold the design and the cart.
- _worker.js reads the visitor's country and opens Stripe Checkout.
- logo files and favicon.png hold the brand marks.

Cloudflare Pages settings: Build command node build.js, Build output directory dist, secret STRIPE_SECRET_KEY.
