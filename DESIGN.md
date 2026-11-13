---
name: Store Admin
description: A white-label back office for stores built on simple-express.
colors:
  ink: 'oklch(0.145 0 0)'
  charcoal: 'oklch(0.205 0 0)'
  slate-text: 'oklch(0.556 0 0)'
  hairline: 'oklch(0.922 0 0)'
  mist: 'oklch(0.97 0 0)'
  paper-shade: 'oklch(0.985 0 0)'
  paper: 'oklch(1 0 0)'
  alarm-red: 'oklch(0.577 0.245 27.325)'
  amber-tint: 'oklch(0.962 0.059 95.617)'
  amber-text: 'oklch(0.473 0.137 46.201)'
  blue-tint: 'oklch(0.932 0.032 255.585)'
  blue-text: 'oklch(0.424 0.199 265.638)'
  green-tint: 'oklch(0.962 0.044 156.743)'
  green-text: 'oklch(0.448 0.119 151.328)'
typography:
  headline:
    fontFamily: 'Geist Variable, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 600
    lineHeight: 1.333
  title:
    fontFamily: 'Geist Variable, sans-serif'
    fontSize: '1rem'
    fontWeight: 500
    lineHeight: 1
  body:
    fontFamily: 'Geist Variable, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: 'Geist Variable, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 500
    lineHeight: 1
  caption:
    fontFamily: 'Geist Variable, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: 1.33
rounded:
  sm: '6px'
  md: '8px'
  lg: '10px'
  xl: '14px'
spacing:
  xs: '8px'
  sm: '12px'
  md: '16px'
  lg: '24px'
  xl: '32px'
components:
  button-primary:
    backgroundColor: '{colors.charcoal}'
    textColor: '{colors.paper-shade}'
    rounded: '{rounded.lg}'
    height: '44px'
    padding: '0 12px'
  button-outline:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.lg}'
    height: '44px'
    padding: '0 12px'
  button-destructive:
    backgroundColor: '{colors.alarm-red}'
    textColor: '{colors.paper}'
    rounded: '{rounded.lg}'
    height: '44px'
    padding: '0 12px'
  input:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.lg}'
    height: '44px'
    padding: '4px 10px'
  nav-item-active:
    backgroundColor: '{colors.hairline}'
    textColor: '{colors.charcoal}'
    rounded: '{rounded.md}'
    height: '44px'
    padding: '0 8px'
  dialog:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.xl}'
    padding: '16px'
---

# Design System: Store Admin

## Overview

**Creative North Star: "The Quiet Back Office"**

Store Admin is the room behind the shop. Staff come in to confirm a payment, fix a price, or add a category, and they leave. The interface stays neutral so that any store can run it under its own name, and quiet so that the one thing that needs attention, an error, a destructive action, the current page, is the only thing that speaks.

The system is shadcn/ui's neutral theme, owned and tuned for use on a phone. It is achromatic by design: the store's identity lives in its storefront, not here. Restraint is the brand. Quality shows in precise details instead: 44px touch targets on phones, aligned figures, a visible focus ring, and errors placed beside the field they describe.

**Key Characteristics:**

- Achromatic neutrals, with red reserved for danger and soft tints only on status badges.
- Flat surfaces separated by hairlines, not shadows.
- Phone first: 44px controls below `md`, the desktop density from `md` up.
- One page title, then content; no decorative headers.
- Feedback for every action: skeleton shapes while loading, a toast on success, a message beside the field on error.

**Reference: Shopify Admin.** Every screen follows Shopify Admin's patterns, as it does the same job: orders, products with variants, payments, and shipping. When designing a screen, start from how Shopify Admin handles it. Take its layout and behavior, not its branding: the rules in this file, such as the grey palette, red for danger, and the status tints, still decide the look.

Built so far from it: the Order page's side panel and Next step card, the Orders status tabs, and the record header with its More menu.

## Colors

A grey palette from ink to paper, a single red for danger, and three soft tints that only status badges use.

### Primary

- **Charcoal** (oklch(0.205 0 0)): primary buttons, the active nav text, and anything that is the main action on a screen.

### Neutral

- **Ink** (oklch(0.145 0 0)): body text, headings, and nav links.
- **Slate Text** (oklch(0.556 0 0)): secondary text, nav pages, captions, empty messages, and the focus ring. It meets 4.5:1 on Paper.
- **Hairline** (oklch(0.922 0 0)): borders, dividers between rows, input strokes, and the active nav background.
- **Mist** (oklch(0.97 0 0)): image placeholders, loading skeletons, hovered rows, and the dialog footer band.
- **Paper Shade** (oklch(0.985 0 0)): the sidebar, the phone top bar, and the menu sheet.
- **Paper** (oklch(1 0 0)): the page, cards, dialogs, and inputs.

### Tertiary

- **Alarm Red** (oklch(0.577 0.245 27.325)): destructive buttons and menu items, field errors, and failed requests. Nothing else.

### Status tints

Each is a pale fill with dark text of the same hue, at least 6.4:1. Dark mode uses a translucent fill with light text. They are the `warning`, `info`, and `success` tokens and Badge variants.

- **Amber** (fill oklch(0.962 0.059 95.617), text oklch(0.473 0.137 46.201)): staff need to act, such as Pending and Payment to check.
- **Blue** (fill oklch(0.932 0.032 255.585), text oklch(0.424 0.199 265.638)): in progress, such as Confirmed and Shipped.
- **Green** (fill oklch(0.962 0.044 156.743), text oklch(0.448 0.119 151.328)): done, such as Delivered and Paid.
- Anything waiting on the customer or closed, such as Awaiting payment, Unpaid, Cancelled, Returned, and Refunded, stays a grey fill.

### Named Rules

**The Status Tint Rule.** The tints mark a state on a badge, and only there. The same tint always means the same thing, they are never used for buttons, text, or decoration, and the label always says the state, so color is never the only signal.

**The Red Means Stop Rule.** Alarm Red appears only where something can go wrong or is irreversible: Delete, Refund, Reject, Cancel, and error text. It is never decoration, a brand accent, or a status for something that is fine.

**The No Store Color Rule.** The admin carries no store's brand color. A store's identity reaches the admin only through `VITE_STORE_NAME`.

## Typography

**Body Font:** Geist Variable (with sans-serif)

**Character:** One neutral grotesque in a few weights. It reads clearly at small sizes and on low-quality phone screens, and it never competes with the content.

### Hierarchy

- **Headline** (600, 1.5rem, 1.333): the single page title, such as "Categories" or "Page not found". One per screen.
- **Title** (500, 1rem, 1): dialog and sheet titles.
- **Body** (400, 0.875rem, 1.43): table and list text, descriptions, and messages. Inputs use 1rem on phones so that iOS does not zoom, and 0.875rem from `md` up.
- **Label** (500, 0.875rem, 1): form labels and legends, and category names in lists.
- **Caption** (400, 0.75rem, 1.33): file details, and the reason under a disabled menu item.

### Named Rules

**The Aligned Figures Rule.** Any number that can sit above or beside another number, such as page counts, file sizes, money, and quantities, uses tabular figures (`tabular-nums`).

## Layout

On phones, a sticky top bar holds the menu button on the left and the store name; navigation opens in a sheet from the left. From `md` (768px), a fixed 224px sidebar replaces the bar. The nav follows Shopify Admin: four areas with icons, Home, Orders, Products, and Content, then Settings at the bottom, and the account below it. An area's own pages (Categories under Products; Blog, Banners, and Files under Content; Payment methods, People, Roles, and Audit log under Settings) show indented under it only while one of them is open, so the nav stays short. Pages a role cannot use are left out, and so is an area with none left. The sidebar stays in view as the page scrolls. Content padding is 16px on phones and 32px from `md` up, and content is never wider than the space left by the sidebar.

Screens stack vertically with 24px between blocks: the page title row (`PageHeader`: the title on the left, an optional one-line Slate Text description under it, and the main action on the right), then the list, grid, or form. Form fields are 8px from their labels and 16px from each other. Lists and grids stay single-purpose: one row or tile per item, with its actions on the same line.

Nested data indents 24px per level, inside one bordered list, rather than nesting boxes.

## Elevation & Depth

The page is flat. Rows, cards, and the sidebar are separated by 1px Hairline borders, not shadows. Depth appears only when something floats above the page: dialogs and the image picker use a 1px ring at 10% ink, menus use a soft medium shadow, and the menu sheet uses a large shadow. Overlays dim the page with 10% black and a slight blur.

### Named Rules

**The Flat Page Rule.** Anything that sits in the page is flat. Only things that float above it, such as dialogs, menus, and sheets, get depth.

## Shapes

Corners are gently rounded and consistent: 10px for buttons and inputs, 8px for nav items, images, and menu items, and 14px for dialogs. Thumbnails are square with 8px corners, and image placeholders are the same shape in Mist, so that a missing image keeps the layout.

## Components

### Buttons

Calm and decisive.

- **Shape:** gently rounded (10px).
- **Size:** 44px tall on phones, 32px from `md` up. The small size is 40px on phones and 28px from `md` up. Icon buttons are square at the same heights.
- **Primary:** Charcoal fill with Paper Shade text, for the one main action on a screen, such as "New category" or "Save".
- **Outline:** Paper with a Hairline border, for secondary actions in a row, such as "Edit" and "Cancel".
- **Ghost:** no fill until hovered, for icon buttons such as the menu and "More actions".
- **Destructive:** solid Alarm Red with white text. It only appears in the confirmation dialog, never directly in a list row.
- **Focus:** a solid 3px Slate Text ring. **Disabled:** 50% opacity, while saving or uploading, so that a double tap cannot send twice.

### Inputs / Fields

- **Style:** Paper fill, Hairline stroke, 10px corners, 44px tall on phones and 32px from `md` up. Native `select` elements are styled to match.
- **Focus:** the border and a 3px ring turn Slate Text.
- **Error:** the border turns Alarm Red, `aria-invalid` is set, and the message sits directly below in red 0.875rem text, linked with `aria-describedby`.

### Lists and rows

- **Style:** one bordered container with 10px corners, rows divided by Hairlines, and 8px vertical padding.
- **Row content:** a 40px thumbnail or Mist placeholder, the name (truncated), then the actions on the same line.
- **Actions:** one visible outline button for the common action, and a ghost "More actions" menu for the rest. Destructive items in the menu are red, and are disabled with a one-line reason when the backend would refuse them.

### Dialogs

- **Style:** Paper, 14px corners, 16px padding, a 10% ink ring, and a Mist footer band with Cancel and the action.
- **Behavior:** used for forms and for confirming destructive actions. On phones the footer buttons stack full width, with the action on top.

### Navigation

- **Areas:** a 20px lucide icon and the label, 44px tall on phones and 36px from `md` up, with 8px corners. The area you are in has a Hairline background, semibold text, and a heavier icon stroke. Areas without a page of their own, such as Content and Settings, open their first page the role can use.
- **Pages:** indented under their area, Slate Text, darkening on hover. The open one is Ink and medium weight.
- **Orders count:** an amber badge with the number of payments to check, from the order report, for roles with `reports.operations`. It is one backend number, never a sum.
- **Account:** at the bottom, your initials in a Charcoal circle, your email, and your role. It opens a menu with Log out, so that a stray tap cannot sign you out.
- **Phone:** a sheet from the left with the store name and the same nav. Choosing a link closes it.

### Tabs

- **Use:** saved views of a list, such as the Orders list's All, Payments to check, To confirm, To ship, and Shipped. Each is a link that sets the list's URL filters, so it works with Back and can be shared. Dropdown filters stay below for anything else.
- **Style:** a row of text links on a Hairline bottom border, 44px tall on phones and 36px from `md` up. Inactive tabs are Slate Text and darken on hover. The selected one is Ink, medium weight, with a 2px Ink underline and `aria-current="page"`.
- **Counts:** a view with work waiting shows its count in an amber badge after the label, from the backend. No count when nothing waits.
- **Phone:** the row scrolls sideways in one line instead of wrapping.

### Status

- **Loading:** Mist skeleton blocks in the layout of what is coming, from `src/components/Loading.tsx`. Lists get bordered rows, record pages a title and two cards, Files a grid of tiles, Dashboard cards their own shape, and the first load the sidebar and page frame. Each is a `role="status"` with a hidden "Loading…", and pulses only when the system allows motion. Buttons still say "Saving…" or "Uploading…", as those are actions, not content.
- **Empty:** `EmptyState`, after Shopify Admin: a dashed Hairline box with a Slate Text icon in a Mist circle, a short semibold heading such as "No banners yet", one Slate Text sentence on what goes there, and the action that fills it, such as New banner. When filters hide everything, the heading says "No … match these filters" with a search icon, and the sentence points to Clear filters.
- **Error:** the message in a `role="alert"` line, with the request id on server errors, and a "Try again" button.
- **Success:** a short toast such as "Category saved" or "Image uploaded".

### Badges

- **Style:** small pills (0.75rem, medium weight) for order and payment states, side by side, on the Orders list and beside the number on the Order page.
- **Tone:** each state takes its status tint (amber to act, blue in progress, green done) or a grey fill, following the Status Tint Rule. A cancelled order is grey, not red, as it is closed rather than dangerous.
- **Other badges**, such as Draft, Inactive, and Built in, stay grey.

### Steps

- **Use:** to show where something is in a fixed process, such as an order's status or its payment. Vertical, so it fits a phone.
- **Markers (24px circles):** done is a filled Charcoal circle with a check, current is a Charcoal ring with a dot, not reached is a Hairline circle with Slate Text, and stopped (Cancelled, Returned) is filled Alarm Red with a cross. A 1px Hairline line joins them.
- **Current step:** marked with `aria-current="step"`, with one sentence under it that says what it means and what to do next. Details that belong to it, such as the payment reference, sit there too.
- **Honesty:** only show steps the data proves. When the backend does not record where something stopped, show the end state alone.

### Action cards

- **Style:** a bordered section with a title, a body, and a footer bar (Hairline top border, Mist band) for its actions.
- **Footer order:** secondary actions first and the main action last, so it sits on the right on desktop and on top, full width, on phones. Cards side by side stretch to the same height, so their footers line up.
- **No actions:** no footer.

### Record pages

Every page for one record, such as an order, product, blog post, or role, starts with the same header, `RecordHeader` from `src/components/`.

- **Header:** Back, the title with its badges, a More menu on the right, then one Slate Text line of facts, such as "2 variants · Updated 12 Nov 2026" or "By Juan · Last saved 2 Nov 2026". The title is the record's saved name, so it stays put while its field is edited.
- **More menu:** `MoreMenu`, an outline "More" button that opens the record's rarer actions: History first, then actions such as Deactivate, Unpublish, Delete, or Cancel order. Destructive items are red and still ask first. An item the backend would refuse is disabled with a one-line reason under it. The menu is left out when a role has nothing in it.
- **Footer:** the form's own save actions only, with the main action last.

**The Order page** adds a side panel: a main column and a 320px panel from `lg` up, one column below it.

- **Next step:** the first card, with a darker border (Ink at 25%), a small uppercase "Next step" label, a verb title such as "Check the payment", one sentence, and its buttons in a footer. It is left out when nothing is left to do, and has no footer for roles that cannot act.
- **Side panel:** one bordered card with sections divided by Hairlines: Progress, Customer, Ship to, and Payment.
- **Phone order:** Next step, the main content, the side panel, then Activity.
- **Activity:** a timeline of the record's audit entries, newest first, each with who made it and its changes as "Field: before → after", ending with when the record was created.

**The Product page** uses the same two columns, after Shopify's product page.

- **Main column:** Details (name, description, option names), then Images, then Variants.
- **Side panel** (`SidePanel` and `PanelSection` from `src/components/`): Status, with an "On sale" (green) or "Inactive" (grey) badge, one sentence, and Deactivate or Turn on; then Organization, with the category.
- **Phone order:** Details, the side panel, Images, then Variants.
- **Saving:** no Save button in a card. Fields in both columns save together through the save bar.

**The Blog post page** uses the same two columns, after Shopify's post editor: Title and Content on the left, then Visibility (Published or Draft, as radio buttons), Cover image, and Author on the right. Choosing Draft on a published post says that shoppers can no longer read it once saved.

**The New product page** uses the Product page's layout: Details and Options and variants on the left, then Status (On sale or Inactive, as radio buttons) and Organization on the right. Saving creates the product and opens it.

**The Role editor** puts Name, Description, and Permissions on the left, and on the right a Summary (how many permissions are checked, as they change) and, for a saved role, who has it, with a link to them on People.

### Save bar

- **Use:** a record page whose fields are spread across cards or columns, such as the Product page. `SaveBar` from `src/components/`.
- **Behavior:** it appears once anything differs from the saved record, and says "Unsaved changes" with Discard and Save. Discard puts back the saved values. Save sends only the fields that changed, and the bar goes away once the saved record matches. Leaving with unsaved changes asks first, through `useLeaveGuard` from `src/lib/`.
- **Style:** fixed to the bottom of the window, beside the sidebar, with a Hairline top border and a large shadow, as it floats above the page. The page leaves room at its end while it shows. It sits at the bottom rather than the top, as Shopify's does, so it never covers the phone's top bar or Back.
- **Roles that cannot edit** never see it.

### Figures and charts

- **Needs attention:** waiting work is a to-do list, one row per task with something waiting: a dark Charcoal count badge, a verb title such as "Confirm payments", a Slate Text caption, and Review on the right. The whole row is one link, at least 64px tall. Once the section is 672px or wider (a container query, as the sidebar takes part of the window), the rows become cards a third of the width, side by side, with Review at the bottom right, so that it stays beside its task on a wide screen. Tasks with nothing waiting are left out, and when none wait the section is one quiet line, "All caught up." The dark badge is used for waiting work only.
- **Headline figures:** up to four, each a Slate Text label over a semibold value in tabular figures (1.25rem on phones, 1.5rem from `md` up), two across on phones and four from `md` up.
- **Secondary figures** sit below a hairline in a grid of small label over value: two across on phones, three from `sm`, six from `lg`. Never a running line of label and value pairs, which mix up when they wrap on a phone.
- **Rows in half-width cards** use container queries (`@container`, `@md:`), not screen breakpoints, so a row keeps its figures on a second line whenever the card itself is narrow.
- **Charts:** the emphasis form. The series the chart is about is a 2px Charcoal line, and the context series is a 2px Slate Text line. They differ by lightness, so they stay apart without color vision. Hairline horizontal gridlines only, no dots until hover, a legend above the chart, and a crosshair tooltip with exact values.
- **Every chart has a table view** behind a "Show as table" button, and an accessible name that says what it shows.
- **No color is added for charts.** The Red Means Stop and No Store Color rules still apply.

### Image tiles

- **Style:** square photos in a grid, three across on phones and five from `sm` up, with the alt text (or "No alt text" in Slate Text) below.
- **Main image:** the first tile carries a filled "Main image" badge, as lists and the store use it.
- **Actions:** a "More actions" menu per tile, with Move earlier, Move later, Edit alt text, and Remove. Adding an image always asks for alt text in a dialog that shows the photo.

- **Uploading on Files:** Upload images takes several files, and dropping images anywhere on the page does the same. While dragging, a dashed Ink outline covers the page with "Drop images to upload them". Uploads go one at a time with "Uploading 2 of 5…" as a status, and files that were skipped are listed by name with the reason.

### Forms

- **Short forms**, with one to three fields, such as a category, open in a dialog.
- **Long forms**, such as a new product or a role, get their own page in the record page layout: sections in bordered cards on the left, settings in the side panel, Back at the top, and the save bar once anything is entered. Discard empties a new form, and leaving with something entered asks first.
- **Editors** for long text, such as a blog post, use the record page layout: the text on the left, its settings in the side panel, and the save bar. Delete is in the header's More menu. They ask before leaving with unsaved changes. Markdown fields have Write and Preview, a toolbar of icon buttons (each with a label for screen readers) that wraps the selection or starts the selected lines, and a "Formatting help" panel that shows each example through the same renderer as the preview, so the guide can never drift from the real result.
- **Repeated values**, such as option values, are typed and added as removable chips, so a phone keyboard never needs commas.
- **Money** is typed in pesos in a field with a ₱ prefix and a decimal keyboard, and checked for at most two decimals before sending.

### Money actions

- **Wording:** a dialog that moves money states the amount and, when there is one, the customer's reference: "Confirm that ₱1,150.00 arrived with reference GC12345678?"
- **Order:** the action staff usually want is the primary button. Actions that cancel, reject, refund, or return ask first, and their confirm button is solid Alarm Red.
- **Reference:** the customer's payment reference is shown large, in tabular figures, and selectable in one tap, so it can be compared with the bank or e-wallet record.

## Do's and Don'ts

### Do:

- **Do** keep every tappable control at least 44px tall below `md` (768px).
- **Do** use one primary button per screen, and outline or ghost buttons for everything else.
- **Do** put a destructive action behind a menu or a confirmation dialog, and use solid Alarm Red only on the final confirm button.
- **Do** show the backend's error message next to the field it names, and link it with `aria-describedby`.
- **Do** use `tabular-nums` for any number that can align with another.
- **Do** separate rows and regions with Hairline borders instead of shadows.

### Don't:

- **Don't** add a store's brand color, logo color, or any second accent to the admin.
- **Don't** use the status tints outside status badges, or give one tint two meanings.
- **Don't** use Alarm Red for anything that is not an error or a destructive action.
- **Don't** add shadows to things that sit in the page, such as rows, cards, and the sidebar.
- **Don't** show three or more equal-weight buttons on a list row; move the extra actions into the "More actions" menu.
- **Don't** invent figures, stat tiles, or sample data to fill an empty screen.
