# BackHouse Project - Master Architecture & Execution Guide

## 1. Project Overview & The Prime Directive
**Project:** BackHouse (A B2B surplus marketplace for the HORECA industry).
**UI/UX Vibe:** Premium, modern, institutional-grade SaaS platform.
**The Prime Directive:** You are taking over this codebase mid-flight. Your primary goal is **Flawless Mimicry**. You must seamlessly continue the exact work of the previous Senior Developer. You are strictly forbidden from introducing new design patterns, new frameworks, or unsolicited refactoring.

## 2. The "Zero Invention" CSS Policy
When styling new pages, you must strictly follow the existing CSS conventions.
* **Scan First:** Before writing HTML/CSS for a new page, scan `styles.css` (or the existing HTML files) to understand the exact class naming structure (e.g., if we use BEM like `nav__link--active`, you must use exactly that).
* **Reuse, Do Not Re-create:** If you need a button, card, or input field, you MUST reuse the exact CSS classes from existing pages (like `home.html` or `contact.html`). Do not invent a new class like `.new-btn` if a `.btn-primary` already exists.
* **Layouts:** Rely heavily on CSS Grid and Flexbox. Do not use absolute positioning, fixed pixels (`px`), or float-based layouts. Stick to relative units (`rem`, `em`, `%`).

## 3. Strict JavaScript Architecture
We maintain a strict separation of logic to prevent null-reference errors. **NO INLINE SCRIPTS ARE ALLOWED IN HTML FILES.**
* **`app.js` (The Global Core):** Contains ONLY global logic that runs on every single page (e.g., top navigation bar toggles, global footers, language selection). 
* **Page-Specific `.js` Files:** Every interactive page has its own dedicated script (e.g., `contact.js`, `browse.js`, `login.js`). 
* **Loading Order:** At the bottom of every new HTML `<body>`, you must link the global script first, followed by the specific script.
  * *Example:* `<script src="app.js"></script>` then `<script src="login.js"></script>`.

## 4. Navigation & Page Linking (Connecting the Flow)
When generating new pages, they must connect flawlessly to the existing ecosystem.
* **Relative Links Only:** All navigation links must use standard HTML relative paths (e.g., `<a href="login.html">`, `<a href="browse.html">`). 
* **No Single Page App (SPA) Routing:** Do not attempt to use hash routing (`#login`) or JavaScript `window.location` redirects for standard navigation. This is a multi-page HTML application.
* **Active States:** When building the header for a new page, ensure the corresponding navigation link has the `.active` CSS class applied so the user knows where they are.

## 5. Required Localization (Amman, Jordan)
All dummy data, placeholder text, and geographical references MUST be localized to **Amman, Jordan**.
* **Names:** Use standard Jordanian names (e.g., Ahmad Al-Masri, Omar, Laila).
* **Locations:** Use Amman-based locations (e.g., Amman Innovation Hub, King Hussein Business Park).
* **Phone Numbers:** Use standard Jordanian formats (`+962 79 XXX XXXX` for mobile, `+962 6 XXX XXXX` for landline).
* **Work Week:** Sunday through Thursday.

## 6. Execution Checklist for the AI Agent
Before providing code for a new task, silently verify:
[ ] Did I reuse existing CSS classes instead of inventing new ones?
[ ] Is the HTML completely free of `<script>` tags (excluding the `src` links at the bottom)?
[ ] Did I link `app.js` first, and the page-specific `.js` second?
[ ] Do all `<a href="">` tags correctly point to the `.html` files in the directory?
[ ] Is the dummy data localized to Jordan?