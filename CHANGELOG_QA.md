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

## 37. One colour and state system
- Honey is one hex, #f0b04a. No dark honey. Honey fills one primary action per section and the top notice link. It is never used for body text.
- Faint tint is #fff8e9 with a #f3e6c9 hairline. It appears inside boxes, chips and the footer. Page backgrounds are white.
- Text is navy (#111c44) or pure white. All light blue text and borders on navy are now white.
- Primary buttons: honey fill, navy text. Hover and keyboard focus: navy fill, white text. On navy or photos: white fill, navy text. Press: shrinks to 97%. Disabled: 45% opacity.
- Secondary buttons: outline at rest, filled on hover and focus.
- Links: text links are underlined at rest and thicker on hover. Navigation and footer links are plain at rest and underlined on hover.
- Focus ring: 3px navy on light, white on navy.
- Waitlist page uses the site fonts, white page, pill input and button, tinted cards, 24px tiles and a smaller centre logo.
- Home hero title breaks into "Your expression," and "your world." on every width. Verified at 320 to 1920 px.
- Icons, favicons and share image regenerated with the mark at about 46 to 58% of the tile so the boundary shows.
- Checks: no horizontal overflow on 15 pages at 11 widths; regression passes; accessibility 0 violations on tested pages. Safari not tested.

## 38. Contrast pass
- Audit script hovers, focuses and opens every interactive element on the main pages and measures text against its real background. Result: 0 failures after fixes.
- Fixed: Ministries cards (hover, focus, open are navy with white text), modal close buttons (light disc, navy cross), active tabs (stay navy with white text on hover), waitlist scroll arrow (white disc, navy arrow), footer buttons (navy with white text on hover).
- Progress bars and tracks: navy fill on neutral light grey. No honey on any progress. Avatar is a white disc with navy initials.
- Tier labels on photos are plain white text, no background.
- Tags (non clickable labels) use the Z shape: white fill, navy text, navy border, one square corner. Buttons remain pills.
- Waitlist: logo grows with scroll and is full size by the middle of the scroll. Headline, countdown and caption are lighter.
- Icons, favicons and share image: mark reduced to 38 to 46% of the tile for more space around it.

## 39. Waitlist and tags
- Waitlist: removed the "Zi Republic is about to open its borders" line and the capsule collection caption. The headline remains as screen reader text. Countdown size restored.
- Tag shape A (Z corner) confirmed: square top left corner, other corners round. Used by every non clickable label.

## 40. Waitlist copy restored, yellow removed from Ministries and calendar
- Waitlist page hero text and caption restored. The form header now shows only "Ministry of Communications" and "Join the waitlist".
- Ministries cards are white with a neutral hairline and turn navy on hover and open. Calendar entries are ruled rows with no fill.

## 41. Ministries turn cards and interactive calendar
- Ministries: five cards with one shared shape (sharp top left corner, like the Z). Each has its own icon. Hover, focus or tap turns the card to show what the ministry looks after. Reduced motion uses a fade.
- Calendar: month grid with previous, next and Today. Event days are honey. Today has a navy ring. Selected day is navy. Event cards list upcoming days and open a detail panel. Dated days burst with small confetti.
- Colour roles: navy for text, outlines and interaction. Honey for things to notice (event days, event icons, primary buttons). No tags in the calendar.
- PLACEHOLDER CONTENT: Zero Email Day, Zigzag Day, Zebra Crossing Day, Zillar Day, Zany Hour and all seven dates are invented for design. Real copy and dates go in the Copy tab: brand.calendar-<name>-description, brand.calendar-<name>-iso (YYYY-MM-DD).

## 42. Cleaner cards and calendar
- Ministries: turn button removed. Cards fade between front and back (no 3D turn, so text stays crisp). Back face leads with a bold ministry name, then smaller text with room around it.
- Calendar: one event per month. Zi Day is on April 18, 2027. Other days remain placeholders. New icons for the upcoming days.
- Waitlist: caption sits above the email row. Scroll arrow is an SVG.

## 43. Spacing pass and calendar edits
- Ministries back face: smaller title, more padding, taller card, so "Communications" and the longest description keep clear space inside the card.
- Explore sealed collection titles scale down on narrow screens so "Collection II" and "Collection III" stay inside the page at 390px.
- "While you wait" cards: white surface, hairline border, Z corner, wider right padding, outlined arrow circle that text never touches.
- Calendar: Zero Email Day and Zany Hour removed. "Zebra Crossing Day" renamed "Zibra Crossing Day".
- Waitlist scroll arrow is centred with margin and only fades in, so it no longer moves after load.
- Explore: the tag "The first collection. Launching soon." removed.
- Padding audit (pad.py) and overflow audit (fit.py) show no real findings at 1280, 820, 390.
