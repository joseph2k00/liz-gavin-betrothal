# Liz & Gawin Betrothal Invite: Architecture

## 1. Summary

A single-page, mobile-first invitation at one shared link. It shows the invitation wording, both events, directions and calendar links, and an RSVP form. Replies go into a private Google Sheet the family can read.

**Goals:** clear on a phone, easy for older relatives, fast on weak connections, and simple for the family to read replies.

**Out of scope:** guest accounts, personal links, passcodes, per-event RSVP, photo galleries, music, an admin page, and translations.

## 2. Decisions

| Area | Decision |
|---|---|
| Tradition | Catholic |
| Host voice | "We", with both sets of parents named under the couple |
| Parent naming | Name + house name + home town |
| Faith touch | Opening blessing line only: "By the grace of God Almighty" |
| Language | English only |
| Access | One shared link, no login |
| Schedule | Both events on the same day, at different venues |
| Audience | Everyone is invited to both events |
| RSVP | One answer and one headcount covering both events |
| RSVP fields | Name, attendance, headcount (no phone) |
| Headcount | 1 to 6, including the guest |
| Reply date | Soft "kindly respond by" date; the form never closes |
| RSVP storage | Google Sheet in Joseph's account, shared with the cousin |
| Visual style | Ivory and antique gold, typography plus one fine-line illustration |
| Opening | Straight to the invite with a gentle fade; no envelope or tap |
| Extras | Google Maps link and Add to Calendar per event |
| Address | Free subdomain, e.g. `liz-gawin.vercel.app`, if available |

### Assumptions to confirm with the family

- The couple's first names are Liz and Gawin (taken from the folder name).
- Liz is the bride, so her parents are listed first.
- "Holy Qurbana" is the correct term. The church's name says Syro-Malabar, so the site uses this instead of "Holy Mass". This is one field in the content file.
- All times are in IST (`Asia/Kolkata`).

## 3. Page structure

One scrolling page, in this order:

1. **Logo**: interlocked rings with a small heart
2. **Blessing line**
3. **"Betrothal Ceremony" heading**, underlined with a gold rule that has a heart in the middle
4. **Invitation wording**, with both sets of parents and the couple's names
5. **Betrothal details**: illustrated location, time and date sections, then Directions and Add to Calendar
6. **"With love" message**: Rose Tom, Jose Tom and Aiwin Paul, with a small heart, between two mirrored olive branches
7. **Event: Reception**: time, date, hall, address, Directions, Add to Calendar
8. **RSVP form**
9. **Short closing line**, e.g. "With love and prayers"

## 4. Wording

Square brackets are placeholders, to be filled in `content.js`.

```text
By the grace of God Almighty

Betrothal Ceremony

With joyful hearts, we invite you to celebrate the betrothal of

Liz Tom
daughter of
Mr. [Father] & Mrs. [Mother] [Family]
[House], [Town]

&

Gawin Paul
son of
Mr. [Father] & Mrs. [Mother] [Family]
[House], [Town]

as they begin a beautiful new chapter together

[Pin icon]      Location   [Church], [Town]
[Clock icon]    Time       [Start time], during the Holy Qurbana
[Calendar icon] Date       [Date], [Weekday]

Reception
[Time]
[Weekday], [Date]
[Hall]
[Address]
```

The opening, the names and the "new chapter" line are the family's own wording. The betrothal's location, time and date appear as three illustrated sections: stacked rows on phones, and three columns from 520px.

Parent names need to allow for titles such as "Dr." and for a late parent, e.g. "Late Mr. [Father] & Mrs. [Mother]". Each parent line is therefore free text. The family should confirm how they want this worded.

### RSVP wording

```text
Kindly let us know if you can join us
Kindly respond by [Date]

Your name
[                    ]

Will you be able to join us for the betrothal and reception?
( ) Joyfully, yes
( ) Regretfully, no

Including yourself, how many will be attending?
[ - ]  1  [ + ]
If you are more than 6, please send a second response.

[ Send my response ]
```

- **Yes:** "Thank you, [Name]. We look forward to celebrating with you."
- **No:** "Thank you for letting us know, [Name]. You will be in our prayers."
- **Both:** "Need to change your reply? Simply send a new one using the same name."

## 5. Technical architecture

```text
Guest's phone
   |  loads page
   v
Vercel static hosting  (index.html, styles.css, content.js, main.js, assets)
   |
   |  POST the RSVP as JSON (Content-Type: text/plain)
   v
Google Apps Script web app  (validates, then appends)
   |
   v
Private Google Sheet  <-- the family reads replies here
```

**Stack:** plain HTML, CSS and JavaScript, with no framework and no build step. A one-page site doesn't need more, and this keeps the page light.

### Files

```text
liz-gawin-betrothal/
  ARCHITECTURE.md
  index.html          Page shell, plus static title and social preview tags
  styles.css          Design tokens and layout
  content.js          All names, dates, venues, links and the RSVP endpoint
  main.js             Renders content, RSVP form, calendar links
  assets/
    olive-branch.svg
    rings.svg         Interlocked rings and heart logo at the top of the page
    vine.svg          Repeating side vine for screens 900px and wider
    corner-sprig.svg  Corner decoration for phones and tablets
    og-image.png      1200x630 image for the WhatsApp preview
    favicon.svg
  apps-script/
    Code.gs           RSVP endpoint, kept here for reference
  robots.txt          Disallow all, except link preview bots
  .vercelignore       Keeps this doc and apps-script/ off the live site
```

`content.js` is the only file that changes when details change. The exception is the preview tags, which stay static in `index.html` because WhatsApp doesn't run JavaScript when it builds a preview. If the couple's names or the web address change, also update those tags and remake `og-image.png`, which has the names in it.

### Content model

```js
window.INVITE = {
  blessing: "By the grace of God Almighty",
  brideSide: { child: "Liz", parents: "[TBD]", home: "[TBD]" },
  groomSide: { child: "Gawin", parents: "[TBD]", home: "[TBD]" },
  liturgyTerm: "Holy Mass", // family to confirm: or "Holy Qurbana"
  date: "[TBD: YYYY-MM-DD]",
  replyBy: "[TBD: YYYY-MM-DD]",
  events: [
    { id: "betrothal", title: "Betrothal", start: "[TBD: HH:MM]", end: "[TBD: HH:MM]",
      venue: "[TBD]", address: "[TBD]", mapsUrl: "[TBD]" },
    { id: "reception", title: "Reception", start: "[TBD: HH:MM]", end: "[TBD: HH:MM]",
      venue: "[TBD]", address: "[TBD]", mapsUrl: "[TBD]" },
  ],
  closing: "With love and prayers",
  rsvpEndpoint: "[TBD]",
};
```

Times are 24-hour IST. Any value starting with `[TBD` shows on the page as a dashed red placeholder, and its Directions or Add to Calendar button stays hidden until the value is filled in. While `rsvpEndpoint` is unset, the form pretends to succeed on `localhost` only; on a live site it shows the send error, so replies can't be lost silently.

## 6. RSVP design

### Form behaviour

- Name is required, 2 to 80 characters.
- Attendance is required, with neither option preselected.
- Headcount appears only after "Joyfully, yes". It uses a stepper from 1 to 6 and starts at 1, so nobody over-reports by accident.
- "Regretfully, no" stores a headcount of 0.
- The button shows "Sending..." and is disabled while the reply is in flight, which prevents double submits. Apps Script can take a few seconds to respond.
- On failure or after a 15-second timeout, the entries stay in place and a message asks the guest to try again.
- After success, the device remembers the reply in `localStorage`, wrapped in try/catch. On return, it shows the confirmation with a "Send a new response" option.

### Request and validation

```json
{ "name": "Thomas Kurian", "attending": "yes", "guests": 4, "website": "" }
```

`website` is a hidden honeypot field. Any reply that fills it in is dropped without an error.

Sending as `text/plain` avoids a CORS preflight, which Apps Script can't answer.

`Code.gs` `doPost` does the following:

1. Parse the JSON and check the honeypot.
2. Validate on the server: name length, `attending` is yes or no, `guests` is 1 to 6 for yes and forced to 0 for no.
3. Prefix any name starting with `=`, `+`, `-` or `@` with an apostrophe, so it can't run as a spreadsheet formula.
4. Take `LockService`, append the row, release the lock.
5. Return `{ "ok": true }` or `{ "ok": false, "error": "..." }`.

There is no `doGet` that returns data, so the public URL can only add replies and can't read them.

### Sheet layout

**`Responses` tab**

| Timestamp | Name | Attending | Guests | Ignore |
|---|---|---|---|---|

- `Ignore` is a checkbox the family ticks on an outdated or duplicate reply.
- Conditional formatting highlights repeated names.

**`Summary` tab** (formulas, excluding ignored rows)

- Total guests attending. This is the number for the caterer.
- Yes replies, No replies, and repeated names to review.

**Why duplicates aren't merged automatically:** with no phone number, name is the only identifier, and two guests in a family may share one. Replacing rows by name could silently delete a real guest. The family reviews highlighted names and ticks `Ignore` instead.

### Known limits of these choices

- One answer covers both events, so someone attending only the betrothal still counts toward the reception total.
- Anyone with the link can reply, and the honeypot only stops simple bots. The family should skim for unfamiliar names.
- There is no contact number on the page, so changes rely on the guest re-submitting or calling the family directly.

## 7. Design system

```css
--bg: #FAF6EE;          /* warm ivory */
--text: #2B2622;        /* deep charcoal */
--accent: #A5843F;      /* antique gold: decoration and large text only */
--accent-text: #7F6329; /* darker gold: small text, links, buttons */
```

`#A5843F` on ivory has about 3.2:1 contrast, which fails for small text. `#7F6329` has about 5.2:1, which passes.

- **Type:** Pinyon Script for the couple's names, Cormorant Garamond for headings, and a clean sans such as Mulish for details and form text. Body text is at least 17px, for older readers. Load with `font-display: swap`, using only the needed weights.
- **Layout:** single centred column, at most 560px wide, with a 20px side gutter and generous vertical space. Hairline gold rules separate sections.
- **Illustration:** fine-line olive artwork only, which suits the faith theme without adding a second religious symbol. One branch divides the invitation from the event details.
- **Side decoration:** at 900px and wider, mirrored olive vines climb both sides of the page, repeating for its full length. Below 900px there's no room beside the text, so a small sprig sits in each corner of the page instead. All of it is CSS background art, so it can't intercept taps or be read out by screen readers.
- **Motion:** one gentle fade on load, plus a slow sway on the side vines and corner sprigs. Both are disabled under `prefers-reduced-motion`.
- **Touch targets:** at least 48px for the stepper, radio options and buttons.

## 8. Directions and calendar

- **Directions:** each event links to its `mapsUrl`, which opens the Maps app on most phones. Use the exact pin from Google Maps, because searching by name can land on a similarly named church or hall.
- **Add to Calendar:** each event offers Google Calendar (a prefilled link) and Apple / Other (an `.ics` file generated in the browser). Times use `Asia/Kolkata`.
- **In-app browser:** WhatsApp's browser may handle `.ics` downloads poorly, so this needs testing on real iPhone and Android devices. The Google Calendar link is the fallback.

## 9. Sharing, privacy and hosting

- **Hosting:** Vercel free tier, static deployment.
- **WhatsApp preview:** set `og:title`, `og:description` and an absolute `og:image` URL in `index.html` before the link is first shared, because WhatsApp caches previews.
- **Search engines:** add `noindex` and a disallow-all `robots.txt`, because the page has family names, home towns and event locations. WhatsApp's preview bots are explicitly allowed, so the link preview still works.
- **Analytics:** none, and no third-party tracking.
- **Data:** the Sheet stays private and is shared only with named family members. Replies hold only names and counts.
- **Fallback:** the invite details are the most important part, so they stay readable even if the RSVP endpoint is down.

## 10. Accounts and manual steps

These need Joseph's own logins:

1. Create the Sheet in his Google account and share it with the cousin.
2. In the Sheet, open **Extensions > Apps Script**, paste in `apps-script/Code.gs`, and run `setupSheet` once. This creates the `Responses` and `Summary` tabs.
3. Deploy the script as a web app: **Execute as: Me**, **Who has access: Anyone**. Copy the URL into `rsvpEndpoint` in `content.js`.
4. Log in to Vercel and deploy. If `liz-gawin.vercel.app` is taken, update the `og:url` and `og:image` tags in `index.html`.

To update the script later, use **Manage deployments > Edit > New version**. Creating a new deployment changes the URL and breaks the form.

## 11. Content checklist from the family

- [ ] Full names of the couple, and how they should appear
- [ ] Both sets of parents, with titles and any late parent wording
- [ ] House names and home towns
- [ ] Date, and start and end times for both events
- [ ] Church name, address, Google Maps pin
- [ ] Hall name, address, Google Maps pin
- [ ] "Holy Mass" or "Holy Qurbana"
- [ ] Reply-by date
- [ ] Final approval of all wording and spelling by both families

## 12. Build order

1. Scaffold the files, `content.js` with placeholders, and the design tokens.
2. Build the invitation and event sections for phone width.
3. Add the directions and calendar links.
4. Build the RSVP form and its states with a stubbed response.
5. Write `Code.gs`, set up the Sheet and Summary tab, and connect the live endpoint.
6. Add the preview tags, `og-image.png`, `noindex` and `robots.txt`.
7. Deploy, fill in final content, test, and clear test rows.

## 13. Launch checks

- [ ] No `[TBD]` left in `content.js`
- [ ] Layout holds at 360px, 390px and desktop, with no sideways scrolling
- [ ] Yes and No replies each create a correct row, and the Summary totals are right
- [ ] Tampered requests are rejected: headcount of 7, formula-style name, filled honeypot
- [ ] Failed sends keep the entered values and allow a retry
- [ ] Both Maps links open the correct location
- [ ] Calendar entries show the correct time in IST, on iPhone and Android
- [ ] The whole flow works inside WhatsApp's browser on both platforms
- [ ] The WhatsApp preview shows the right title and image
- [ ] An older relative can complete the RSVP without help
- [ ] Test rows are deleted from the Sheet before the link goes out

