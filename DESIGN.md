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

- Achromatic neutrals, with red reserved for danger.
- Flat surfaces separated by hairlines, not shadows.
- Phone first: 44px controls below `md`, the desktop density from `md` up.
- One page title, then content; no decorative headers.
- Feedback for every action: a status line while loading, a toast on success, a message beside the field on error.

## Colors

A strictly grey palette from ink to paper, with a single red for danger.

### Primary

- **Charcoal** (oklch(0.205 0 0)): primary buttons, the active nav text, and anything that is the main action on a screen.

### Neutral

- **Ink** (oklch(0.145 0 0)): body text and headings.
- **Slate Text** (oklch(0.556 0 0)): secondary text, inactive nav links, captions, loading and empty messages, and the focus ring. It meets 4.5:1 on Paper.
- **Hairline** (oklch(0.922 0 0)): borders, dividers between rows, input strokes, and the active nav background.
- **Mist** (oklch(0.97 0 0)): image placeholders, hovered rows, and the dialog footer band.
- **Paper Shade** (oklch(0.985 0 0)): the sidebar, the phone top bar, and the menu sheet.
- **Paper** (oklch(1 0 0)): the page, cards, dialogs, and inputs.

### Tertiary

- **Alarm Red** (oklch(0.577 0.245 27.325)): destructive buttons and menu items, field errors, and failed requests. Nothing else.

### Named Rules

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

On phones, a sticky top bar holds the menu button on the left and the store name; navigation opens in a sheet from the left. From `md` (768px), a fixed 224px sidebar replaces the bar. Content padding is 16px on phones and 32px from `md` up, and content is never wider than the space left by the sidebar.

Screens stack vertically with 24px between blocks: the page title row (title on the left, the main action on the right), then the list, grid, or form. Form fields are 8px from their labels and 16px from each other. Lists and grids stay single-purpose: one row or tile per item, with its actions on the same line.

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

- **Links:** 44px tall on phones and 32px from `md` up, with 8px corners. Inactive links are Slate Text and darken on hover. The active link has a Hairline background, Charcoal text, and medium weight.
- **Phone:** a sheet from the left with the store name, the links, the signed-in email, and Log out. Choosing a link closes it.

### Status

- **Loading:** a Slate Text "Loading…" line with `role="status"`.
- **Empty:** one Slate Text sentence that says what is missing and what to do.
- **Error:** the message in a `role="alert"` line, with the request id on server errors, and a "Try again" button.
- **Success:** a short toast such as "Category saved" or "Image uploaded".

### Badges

- **Style:** small pills (0.75rem, medium weight) for order and payment states, side by side.
- **Order status:** outline, except Cancelled and Returned, which use the soft red tint.
- **Payment:** a soft grey fill, except "Payment to check", which is filled Charcoal so the one state that needs staff stands out without red.

### Steps

- **Use:** to show where something is in a fixed process, such as an order's status or its payment. Vertical, so it fits a phone.
- **Markers (24px circles):** done is a filled Charcoal circle with a check, current is a Charcoal ring with a dot, not reached is a Hairline circle with Slate Text, and stopped (Cancelled, Returned) is filled Alarm Red with a cross. A 1px Hairline line joins them.
- **Current step:** marked with `aria-current="step"`, with one sentence under it that says what it means and what to do next. Details that belong to it, such as the payment reference, sit there too.
- **Honesty:** only show steps the data proves. When the backend does not record where something stopped, show the end state alone.

### Action cards

- **Style:** a bordered section with a title, a body, and a footer bar (Hairline top border, Mist band) for its actions.
- **Footer order:** secondary actions first and the main action last, so it sits on the right on desktop and on top, full width, on phones. Cards side by side stretch to the same height, so their footers line up.
- **No actions:** no footer.

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
- **Don't** use Alarm Red for anything that is not an error or a destructive action.
- **Don't** add shadows to things that sit in the page, such as rows, cards, and the sidebar.
- **Don't** show three or more equal-weight buttons on a list row; move the extra actions into the "More actions" menu.
- **Don't** invent figures, stat tiles, or sample data to fill an empty screen.
