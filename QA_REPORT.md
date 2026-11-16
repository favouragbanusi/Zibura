ZIBURA QA REPORT

Scope: the built site (35 pages) tested in a local copy with Chromium. The live address, other browsers, email delivery and payments could not be reached from here. Each is marked Not tested.

TOP FIVE FINDINGS
1. Forms and API routes have no spam protection or rate limits. I found none in _worker.js. Priority High.
2. Tap targets under 44 pixels were common on phones and tablets (header icons, footer links, breadcrumbs, FAQ rows, tabs, slide arrows). All are now 44 pixels or larger.
3. The Shop page shifted layout when its product grid redrew (0.33 on desktop, 0.13 on mobile). The grid now keeps its height during the redraw.
4. The brand documents list Looks as a retired term. The site has a Zi Looks page. Decision needed.
5. No analytics and no cookie notice are installed. Decision needed.

SCOREBOARD
1 Previews and discovery | Pass with notes | Titles, descriptions, canonical, share image (1200 by 630) and favicons present. Platform link previews Not tested (needs the live address).
2 Loading sequence | Pass with notes | The site has no loader. Live HTTPS and www redirect Not tested.
3 Journeys and navigation | Pass with notes | Cart, waitlist, account, shop and archive paths tested. Zero broken internal links across 35 pages.
4 Copy and content | Pass with notes | No dashes in visible text. No retired terms in visible text. Jewelry corrected to Jewellery. Three repeated sentences flagged.
5 Design and brand | Pass with notes | Off palette bright blue removed. Product and Style Compass colours remain by design. Zi Card fonts differ by design.
6 Spacing and layout | Pass | No horizontal overflow at 17 sizes on 20 pages.
7 Flow and rhythm | Pass with notes | Look book pinned scroll is long (see Flagged).
8 Interaction and motion | Pass with notes | Reduced motion shows all content. Touch versions tested on Looks, Archive and menus in earlier rounds. Safari motion Not tested.
9 Responsive | Pass | Widths 320, 360, 375, 390, 414, 600, 768, 820, 1024, 1280, 1366, 1440, 1920, 2560 plus 667 by 375 and 844 by 390 landscape.
10 Browsers and devices | Fail for coverage | Chromium only. Safari, Firefox, Edge, Samsung Internet, Opera, Brave Not tested. Site stays light in dark mode by design. Print gives a clean page.
11 Resilience | Pass with notes | Content reads without JavaScript. Slow sheet and offline Not tested.
12 Functionality and content management | Pass with notes | Sheet covers page copy. Script messages (errors, step labels) live in app.js. Sheet edit survival tests Not tested.
13 Performance | Pass with notes | Local Lighthouse, desktop 94 to 98, mobile 64 to 75 (limited by blocked fonts in the test environment). Run again on the live address.
14 Accessibility | Pass with notes | Skip link, main landmark, language and link names fixed. Contrast issue on the home statement words (see Flagged). Screen reader Not tested.
15 SEO, AEO and GEO | Pass with notes | Organization, WebSite, Product and FAQPage data added. Search Console and Bing steps need your login.
16 Technical and hosting | Pass with notes | Security headers added. DNS and deployment Not tested.
17 Analytics | Fail | Not installed.
18 Legal and trust | Pass with notes | Privacy, terms and shipping and returns exist. Wording needs legal review.
19 Cross site and email | Not tested | Needs live domains and inboxes.
20 Launch readiness | Pass with notes | No test pages or staging links found in the build. Backups are your action.
21 Offers, pricing and content | Pass with notes | Prices match the Pieces tab. Suggested prices need your confirmation.
22 What is missing | See Missing pieces.
23 Generated content | Pass | Zi Card titles run from 59 offices and 74 domains, every title is Office of Domain and fits the card.
24 Shop and accounts | Pass with notes | Cart, quantity, remove, empty state, failed checkout message and thanks pages tested. Real Stripe payment and order emails Not tested.
25 Forms, backend and email | Fail | No spam protection or rate limits found. Email delivery Not tested.
26 Delivery | Pass | Zip, readme, change log and design system included.

JOURNEY MAP
Shopper | find and buy a piece | Home, Shop, product, size and colour, Add to cart, cart, checkout | Works to the checkout step. Payment Not tested.
Instagram visitor | join the waitlist | Waitlist page, email, dialog with the Zi Card form, confirmation | Works at 390 and 1470 wide. Delivery of the welcome email Not tested.
Applicant | get a Zi Card | Home, Zi Card page, form | Page and FAQ work. Submission delivery Not tested.
Collection browser | see Collection I capsules | Archive, Open Collection I, capsule tiles, capsule page | Tiles open at once. Smooth scroll measured at 60 frames per second.
Partner or journalist | contact Zibura | Footer, Contact page | Contact page and hello@zibura.com present. Inbox arrival Not tested.

FIXED
See CHANGELOG_QA.md for 26 changes with old and new values.

FLAGGED FOR YOU
Issue | Where | Why it matters | What you do | Priority
Spam protection and rate limits | _worker.js routes (waitlist, apply, sign up, reviews, contact) | Bots can fill forms and the database | Approve Cloudflare Turnstile and rate limits. I can build both | High
Zi Looks name | /looks/, menus, sheet Looks tab | The Master Brand Reference lists Looks as retired | Decide to keep the name or rename | High
Zi Card titles with Minister and Office wording | Zi Card | The reference retires the ten Ministry arrangement | Confirm titles stay as playful appointments | Medium
Look book pinned scroll length | Home page | About 8,000 pixels of scrolling on desktop. The target is about three screens | Choose a shorter flow | High
Analytics and cookie notice | Whole site | No data on visitors | Choose a cookieless option or a consent banner | Medium
Home statement words start at 16 percent opacity | Home, statement section | Fails text contrast until lit by scroll | Choose a higher starting opacity | Medium
Product photos 400 to 570 KB each | assets/media | Slower mobile loads | Approve recompressing to about 250 KB | Medium
Policy wording defaults | Shipping and returns, Privacy, Terms | 30 day returns, 7 day damage report, Alberta law came from defaults | Confirm each with a lawyer | High
Script messages outside the sheet | app.js (for example Choose a size for Halo) | Cannot be edited from the sheet | Approve moving them | Medium
Placeholder photos | Looks, Collection II and III, capsule covers | Real photos could not be confirmed live | Supply or approve photos | High
Saved payment methods in accounts | Account | Requested earlier, needs Stripe live connection | Connect Stripe, then I build it | Medium
Fonts for the Zi Card load on every page | Page head | Extra requests | Approve loading them only on card pages | Low
Content Security Policy header | _headers | Extra protection | Approve after checking Stripe and fonts | Low

MISSING PIECES
Shop FAQ (sizing, shipping, returns) | Visitors ask these before buying | Draft from facts you supply.
Size guide | Reduces returns | Supply measurements.
Press or media page | Journalists need a contact and assets | Add a short page with hello@zibura.com and the logo files.
Order tracking wording | Visitors expect it after checkout | Add once the shipping partner is chosen.

OPTIONS FOR YOU
No copy needs rewriting from this audit. Three sentences repeat across sections (waitlist invitation on Brand, Zi Looks card on Waitlist, Zi Card line on Zi Card). Each repeat is a call to action. I recommend keeping all three.

DECISIONS NEEDED
1. Keep the Zi Looks name? Recommendation: rename it to a name you choose and set a redirect from /looks/.
2. Add Turnstile and rate limits? Recommendation: yes.
3. Shorten the look book? Recommendation: pin it for about three screens and let the rest scroll.
4. Add analytics? Recommendation: a cookieless option.
5. Recompress product photos? Recommendation: yes.

SECTIONS NOT COVERED BY THE DOCUMENTS
The Master Brand Reference and Playbook do not cover the Shop, cart and checkout wording, Zi Looks, Style Compass, the Archive page copy, the Contact page and the policy pages. They are left as they are.

RETEST LIST AFTER YOU ACT
Upload the zip and check the Cloudflare build log (sheet rows read for Copy, Images, Looks).
Purge the Cloudflare cache and hard refresh.
Run Lighthouse on the live address, mobile and desktop.
Paste the live address into the LinkedIn, Facebook and X link debuggers and WhatsApp.
Submit sitemap.xml in Google Search Console and Bing Webmaster Tools, then request indexing for the home page.
Send a test waitlist signup and confirm the email arrives.
Check www and zibura.com both reach the site.
Test on an iPhone in Safari and on Firefox.

SEARCH CONSOLE STEPS
1. Open search.google.com/search-console and sign in.
2. Select the zibura.com property (add it with the Domain option if it is missing).
3. Choose Sitemaps in the left menu, type sitemap.xml, select Submit.
4. Choose URL inspection, paste https://zibura.com/, select Request indexing.
5. Repeat for /shop/, /explore/ and /waitlist/.
6. For Bing, open bing.com/webmasters, select Import from Google Search Console, confirm.
