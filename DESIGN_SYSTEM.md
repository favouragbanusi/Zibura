ZIBURA DESIGN SYSTEM

Source of truth: styles.css, top of file (the :root block). Use these tokens. Add a new token when something new is needed. Do not write one off values.

COLOUR
Zibura Blue #111C44 (--navy). Primary brand colour. Text, buttons, navy bands, footer.
Light Blue #D2EAFF (--sky). Used sparingly. Small accents and text on navy.
White #FFFFFF (--white). Default page and surface colour.
Surfaces: white or very pale grey (#F6F7FA, #F1F3F8) with a hairline border (--line #E4E8F2). Light blue fills and borders appear only where they do a job.
Secondary text: --ink-soft #5A6481.
Product and campaign colours (--yellow, --red, --green, --orange, --purple) appear in product swatches, Style Compass profiles and the Zi Card. They are not part of the permanent brand palette.

TYPE
Bricolage Grotesque: headlines and display (--serif).
Public Sans: body and functional text (--sans).
The Zi Card artwork uses Lexend, Lexend Zetta, Yellowtail and Mrs Saint Delafield. These fonts stay inside the card.
Scale: --t-xs 13px, --t-sm 15px, --t-md 17px, --t-lg 20 to 24px, --t-h3 26 to 40px, --t-h2 32 to 56px, --t-h1 40 to 88px, --t-d 46 to 128px. Page headings use clamp(34px, 4.2vw, 56px).

SPACE
--s-1 8px, --s-2 16px, --s-3 24px, --s-4 40px, --s-5 56 to 96px, --s-6 72 to 150px. Page gutter --gutter 20 to 56px.

SHAPE
Controls (buttons, fields, selects): corner radius 10px (--r-ctl), 1px border.
Cards and panels: 12px to 22px radius.
Borders: 1px, --line colour, navy on hover and focus.
Shadows: none by default.

BUTTONS
Primary: navy fill, white text, navy border. Hover: white fill, navy text.
Line: transparent fill, navy text, navy border.
Light: white fill on navy backgrounds.
Minimum tap size 44px on screens up to 1024px wide and on touch devices.
States: default, hover, focus (visible outline), active, disabled.

FIELDS
White fill, 1px --line border, 10px radius, Public Sans. Labels sit above the field. Errors appear below the field in plain words.

MOTION
Scroll reveals: 22px rise and fade, 0.8 seconds.
Pinned and scroll driven sections stay under about three screens of scrolling.
Full screen sections use 100svh.
Capsule rows open at once and fade in over 0.35 seconds.
Reduced motion shows a plain version with all content visible.
Every hover effect has a touch version.

DO
Use white surfaces with hairline borders.
Use navy for text and buttons.
Use the type and space tokens.
Keep one radius for controls.

DO NOT USE
Bright blue (#2FA8FF) or any colour outside the palette for interface elements.
Light blue fills on many surfaces at once.
Solid dark panels for secondary content.
New font families outside the Zi Card.
