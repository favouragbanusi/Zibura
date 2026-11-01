# Zibura store

A static storefront with two small functions, hosted on Cloudflare Pages.

## Folders

- data/products.json holds the Pieces. Each Piece has a name, category, Signal, Arc, prices in CAD, USD, GBP, and NGN, colors, and sizes.
- src holds the styles and the cart script.
- functions/api/region.js reads the visitor's country and picks a currency.
- functions/api/checkout.js looks up prices on the server and opens Stripe Checkout.
- build.js turns the data into the pages in dist.

## Cloudflare Pages settings

- Build command: node build.js
- Build output directory: dist
- Secret variable: STRIPE_SECRET_KEY

## Next

The Pieces in data/products.json are samples. The catalog will move to Sanity, then to an Excel upload.
