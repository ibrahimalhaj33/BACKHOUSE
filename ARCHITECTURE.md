# BackHouse — Frontend Architecture Guide

> This file is the single source of truth for how this project is structured.
> Every future session should read this file first before making changes.

---

## Project Type
Static website — no bundler, no framework. Pure HTML / CSS / vanilla JS.

---

## Design System
- **CSS Variables:** All colors, typography, spacing, and radii defined in `:root` inside `styles.css`
- **Naming Convention:** BEM (Block__Element--Modifier)
- **Typography:** `Manrope` (headlines), `Work Sans` (body)
- **Icons:** Google Material Symbols Outlined

---

## Navigation Pattern
- Consistent `top-nav` component across all pages
- Active page indicated with `.top-nav__link--active` class
- Links: Home → `home.html`, Browse Listings → `browse.html`, How It Works → `how-it-works.html`, About Us → `#`, Contact → `contact.html`

---

## JavaScript Architecture

### Current State (pre-refactor)
Everything is in a single `app.js` file, with page-specific sections guarded by `if (element)` checks.

### Planned Refactor (step-by-step)

1. **Write Contact page JS** → add to `app.js` (same pattern as now)
2. **Test all pages** → confirm nothing is broken
3. **Split `app.js`** into separate files:

| File | Contents |
|------|----------|
| `app.js` | Global only — nav, shared utilities |
| `register.js` | Multi-step form, validation, stepper |
| `login.js` | Form validation, password toggle |
| `forgot-password.js` | Form submit, success state toggle |
| `browse.js` | Filters, chips, slider, pagination |
| `how-it-works.js` | Tab switching |
| `contact.js` | Contact form handling |

4. **Update each HTML file** → load `app.js` + its own page file
5. **Test all pages again** → confirm split didn't break anything
6. **All future pages** → write JS directly into a new dedicated file

### Rules for New Pages
- Every page loads `app.js` (global/shared logic)
- Only pages with interactivity get their own JS file
- Static/display-only pages do NOT need a dedicated JS file

### Pages That Do NOT Need Their Own JS
- `index.html` (static landing)
- `home.html` (static landing)

---

## File Structure

```
backdoor/
├── index.html              (landing / registration page)
├── home.html               (home page)
├── browse.html             (marketplace catalog)
├── how-it-works.html       (process explainer)
├── contact.html            (contact form + info)
├── login.html              (login form)
├── register.html           (multi-step registration)
├── forgot-password.html    (password reset)
├── styles.css              (all CSS — design tokens + components + pages)
├── app.js                  (JS — currently monolithic, will be split)
└── ARCHITECTURE.md         (this file)
```

---

## Jordanian Localization
- Locations: Amman-based (Abdali, Sweifieh, Khalda, etc.)
- Phone format: `+962 X XXX XXXX`
- Work week: Sun–Thu (Friday off, Saturday varies)
- Names: Standard Jordanian names in placeholders
- Currency context: JOD where applicable

---

## Dashboard UX Scaling Rules

When dealing with lists of items (like pending transactions, orders, or messages) on dashboard pages (e.g., `sales-seller.html`):
- **1-2 Items:** Use the "Bento Grid" large detailed card layout (`.sales-card`).
- **3-5 Items:** Stack the large cards vertically on the left side of the grid, and make the right column (e.g., Summary Stats) `position: sticky` so it stays in view while the user scrolls through their feed.
- **5+ Items:** Transition the UI to "Compact Cards" (thumbnail on left, info center, actions right) to save vertical space. If the volume exceeds 10 items, implement pagination or a Table View (like `all-listings.html`).
- **Hybrid Approach:** The most recent/urgent pending transaction should ALWAYS be a large Bento card at the top, followed by Compact Cards for the rest of the queue.
