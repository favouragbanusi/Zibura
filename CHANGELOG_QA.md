ZIBURA QA CHANGE LOG

Format: file and location | old | new | reason

1. build.js, both page layouts, html tag | lang="en" | lang="en-CA" | Language and region set.
2. build.js, both page layouts, top of body | no skip link | Skip to content link pointing to #main | Keyboard access.
3. build.js, write() | main tag without id | main id="main" on every page | Skip link target.
4. styles.css, end of file | none | .skip rule, hidden until focused | Skip link styling.
5. products.json type for Orbit, taxonomy.json name, build.js LOOK_POS key | Jewelry | Jewellery | Canadian spelling.
6. Google Sheet, Pieces tab, cell D6 | Jewelry | Jewellery | Matches the files.
7. build.js, policy page meta description | whole intro paragraph (191 characters on Privacy) | first sentence (119 characters on Privacy) | Descriptions stay under 160 characters.
8. build.js, noindex list | admin, reset, thanks, join, 404 | admin, reset, thanks, join, account, cart, 404 | Private pages stay out of search.
9. build.js, sitemap | Account and Cart listed, no dates | Account and Cart removed, lastmod date on every URL | Search essentials.
10. build.js, new file _headers | none | X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, X-Frame-Options SAMEORIGIN, Permissions-Policy, one day cache on /assets, revalidate on HTML | Security headers and caching.
11. styles.css, progress bar and cursor | #2fa8ff and rgba(47,168,255,x) | #111c44 and rgba(17,28,68,x) | Bright blue is outside the brand palette.
12. styles.css, new block at end | none | 44 pixel minimum tap size on screens up to 1024 pixels and on touch devices for header icons, footer links, breadcrumbs, text links, tabs, filters, slide arrows, social links, FAQ rows, selects and text fields | Tap targets.
13. build.js and new files | one 64 pixel favicon | favicon for light and dark tabs, favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png, site.webmanifest | Browser tab and phone home screen icons.
14. styles.css, new print block | no print rules | Header, notice, menus, cursor and dialogs hidden when printing, black text on white | Clean print.
15. build.js, seoHead() | search tags inserted before meta charset | search tags inserted after meta charset | Character set must come first in the page head.
16. app.js, shop render() | product grid height collapsed during redraw | grid keeps its height during redraw | Layout shift on Shop (0.33 on desktop, 0.13 on mobile).
17. styles.css, footer logo | height only | width 117px, height 22px, aspect ratio 636 to 120 | Reserves space for the logo.
18. build.js, product page rating link | empty link until script runs | link shows Be the first to review | Link has a readable name.
19. Google Sheet, Copy tab, row 645 | none | site.skip, Skip to content | Every word editable.
20. Google Sheet, Copy tab, row 646 | none | product.be-first, Be the first to review | Every word editable.
21. build.js, structured data | FAQ shown on Zi Card page with no structured data | FAQPage structured data with 9 questions | Search and answer engines.
22. build.js, waitlist page layout | no skip link | skip link added | Keyboard access.
23. README.md | short description | file by file list with where each goes | Delivery.
24. DESIGN_SYSTEM.md | none | new design system document | Delivery.
25. styles.css, end of file | products rail arrows and waitlist scroll arrow at 40 by 40 and 27 by 38 | 44 by 44 on screens up to 1024 pixels and touch devices | Tap targets.
26. styles.css, policy page links (Privacy policy, Terms, Shipping and returns, Contact) | 38 pixels high | 44 pixels high on screens up to 1024 pixels and touch devices | Tap targets.

27. Safari: removed blend modes, will-change layers, backdrop blur and 3D perspective from Zi Looks and the Looks detail view. Menu drawer now opens with display and a simple fade. Added Safari text smoothing rules. These fixes are unverified in Safari because it cannot be tested in this workspace.
28. Zi Looks detail panel rebuilt: tag (audience and piece count) and look name on top, preview image and description removed, piece rows with thumbnail, name, price, colour, size and Add button. Fits phone, tablet and desktop without clipping.
29. Menu drawer now stays available up to 1259px wide, matching where the menu button shows.
30. Site icon: one navy icon that reads on light and dark tabs, 32px ico, apple touch icon, web manifest, theme colour.
31. SEO: robots preview directives, og:locale, theme-color, BreadcrumbList on inner pages, llms.txt, optional Google and Bing verification (set GOOGLE_VERIFY and BING_VERIFY at build).
32. Type scale: hero titles, capsule titles, lead text and skip link now use scale tokens.
33. Looks detail columns fixed at 380px and 440px so Safari and Chrome lay it out the same. Look summary replaces the piece list while open.
34. Looks detail on phones: the total bar no longer covers the piece list. Checked at 320 to 2576px wide.
35. Home play layer (trial): logo-shaped corners, Cream and Peach and Coral from the palette, mixed-case hero title, staggered product tiles, bouncy hover. Scoped to the home page only.
36. Honey accent applied site wide. Blue (navy) stays the core brand colour. Honey is the accent for buttons, tags and small highlights. Pale honey tint sits inside boxes (Ministries, calendar, chips) and in the footer. Page sections stay plain. Buttons are pills. The Z icon shape (one square corner) is used on product pictures only. Footer wordmark is navy.
