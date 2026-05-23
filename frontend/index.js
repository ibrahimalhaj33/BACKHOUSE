/* ═══════════════════════════════════════════════════════
   BackHouse — Home Page JS (index.html)
   Extracted from app.js · No logic changes
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ═══════════════════════════════════════════════════════
  //  HOME PAGE (index.html)
  // ═══════════════════════════════════════════════════════
  const heroSection = document.querySelector('.hero');

  if (heroSection) {

    const header = document.querySelector('.top-nav');
    const navLinks = document.querySelector('.top-nav__links');
    const navActions = document.querySelector('.top-nav__actions');

    // ─── 1. Dynamic Hamburger Button ────────────────────
    // Create the toggle button (only visible on mobile via injected CSS)
    const hamburger = document.createElement('button');
    hamburger.className = 'mobile-menu-toggle';
    hamburger.setAttribute('aria-label', 'Toggle navigation menu');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.innerHTML = '<span class="material-symbols-outlined">menu</span>';

    // Insert hamburger before the actions group
    header.insertBefore(hamburger, navActions);

    // ─── Inject mobile menu CSS (keeps styles.css untouched) ─
    const mobileCSS = document.createElement('style');
    mobileCSS.textContent = `
      /* Hamburger button — hidden on desktop */
      .mobile-menu-toggle {
        display: none;
        background: none;
        border: none;
        cursor: pointer;
        color: var(--color-primary);
        padding: var(--space-sm);
        margin-left: auto;
        border-radius: var(--radius-sm);
        transition: background var(--transition-fast);
      }
      .mobile-menu-toggle:hover {
        background: var(--color-surface-container);
      }
      .mobile-menu-toggle .material-symbols-outlined {
        font-size: 1.625rem;
      }

      /* Hidden on desktop */
      .mobile-menu-actions {
        display: none;
      }

      /* Show hamburger + hide desktop actions on tablet */
      @media (max-width: 64rem) {
        .mobile-menu-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .top-nav__actions {
          display: none;
        }

        /* Mobile dropdown panel */
        .top-nav__links {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          flex-direction: column;
          background: rgba(255, 255, 255, 0.97);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--color-outline-variant);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          padding: var(--space-lg) var(--space-xl);
          gap: 0;
          z-index: 99;
        }

        .top-nav__links.mobile-open {
          display: flex;
        }

        .top-nav__links a {
          padding: var(--space-md) 0;
          border-bottom: 1px solid rgba(194, 201, 187, 0.15);
          font-size: 0.9375rem;
        }
        .top-nav__links a:last-child {
          border-bottom: none;
        }

        /* Show Login + Sign Up inside mobile menu */
        .mobile-menu-actions {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          padding-top: var(--space-lg);
          margin-top: var(--space-sm);
          border-top: 1px solid var(--color-outline-variant);
        }

        .mobile-menu-actions .btn-primary {
          justify-content: center;
        }
      }

      /* Scrolled header effect */
      .top-nav.scrolled {
        box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
        border-bottom-color: transparent;
      }
    `;
    document.head.appendChild(mobileCSS);

    // Clone Login + Sign Up into mobile menu
    const mobileActions = document.createElement('div');
    mobileActions.className = 'mobile-menu-actions';
    mobileActions.innerHTML = `
      <a href="login.html" class="top-nav__login" style="text-align:center;">Login</a>
      <a href="register.html" class="btn-primary btn-primary--sm" style="text-align:center;">Sign Up</a>
    `;
    navLinks.appendChild(mobileActions);


    // ─── Toggle mobile menu ─────────────────────────────
    function openMenu() {
      navLinks.classList.add('mobile-open');
      hamburger.setAttribute('aria-expanded', 'true');
      hamburger.querySelector('.material-symbols-outlined').textContent = 'close';
    }

    function closeMenu() {
      navLinks.classList.remove('mobile-open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.querySelector('.material-symbols-outlined').textContent = 'menu';
    }

    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navLinks.classList.contains('mobile-open');
      isOpen ? closeMenu() : openMenu();
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
        closeMenu();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });

    // Close menu when a nav link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => closeMenu());
    });


    // ─── 2. Dynamic Header (scroll effect) ──────────────
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (window.scrollY > 50) {
            header.classList.add('scrolled');
          } else {
            header.classList.remove('scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });


    // ─── 3. Smooth anchor scrolling ─────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const target = anchor.getAttribute('href');
        if (target === '#') return; // skip placeholder links

        const el = document.querySelector(target);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

  }

  // ─── Live data: stat counter + featured listings ────────
  loadLandingData();

  async function loadLandingData() {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/listings/?page_size=6');
      const body = await res.json();
      const listings = body.data || [];
      const total = body.meta?.pagination?.count ?? listings.length;

      // Hero stat counter
      const counter = document.getElementById('hero-active-count');
      if (counter) counter.textContent = total > 1000 ? `${(total / 1000).toFixed(1)}k+` : `${total}+`;

      // Featured grid
      const grid = document.getElementById('featured-listings-grid');
      if (grid) {
        grid.innerHTML = listings.length === 0
          ? `<p style="grid-column:1/-1; text-align:center; padding:3rem; color:#888;">No active listings yet.</p>`
          : listings.map(renderFeaturedCard).join('');
      }
    } catch (e) {
      const counter = document.getElementById('hero-active-count');
      if (counter) counter.textContent = '—';
      console.warn('[Landing] could not load data', e);
    }
  }

  function renderFeaturedCard(listing) {
    const image = listing.image
      ? `<img src="${listing.image}" alt="${escapeHtml(listing.name)}" loading="lazy">`
      : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#f3f4f6,#e5e7eb); color:#aaa;"><span class="material-symbols-outlined" style="font-size:48px;">image</span></div>`;
    const badge = listing.expiring ? '<span class="listing-card__badge">Expiring Soon</span>' : '';
    const city = (listing.distance && listing.distance !== '—') ? listing.distance : 'Amman';

    return `
      <article class="listing-card" data-listing-id="${listing.id}" onclick="window.location.href='login.html'" style="cursor:pointer;">
        <div class="listing-card__image">
          ${image}
          ${badge}
        </div>
        <div class="listing-card__body">
          <div class="listing-card__header">
            <h3 class="listing-card__title">${escapeHtml(listing.name)}</h3>
            <span class="listing-card__price">${escapeHtml(listing.price)}</span>
          </div>
          <p class="listing-card__meta">${escapeHtml(listing.category || 'Listing')} • ${listing.quantity} ${escapeHtml(listing.unit)}</p>
          <div class="listing-card__location">
            <span class="material-symbols-outlined">location_on</span>
            ${escapeHtml(city)}
          </div>
          <button class="listing-card__action" type="button" onclick="event.stopPropagation(); window.location.href='login.html';">Sign in to view</button>
        </div>
      </article>`;
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

});
