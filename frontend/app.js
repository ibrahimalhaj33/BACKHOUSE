/* ═══════════════════════════════════════════════════════
   BackHouse — Shared / Global JavaScript
   Vanilla JS · No dependencies
   Loaded on EVERY page · Page-specific logic lives in
   its own file (login.js, register.js, etc.)
   ═══════════════════════════════════════════════════════ */

// Auto-load shared utilities on every page.
//   ui-modals.js — replaces native confirm/alert/prompt with styled modals
//   messaging-data.js — sidebar badge needs getUnreadCount()
(function () {
    const inject = (id, src) => {
        if (!document.getElementById(id)) {
            const s = document.createElement('script');
            s.id = id; s.src = src;
            (document.head || document.documentElement).appendChild(s);
        }
    };
    inject('ui-modals-script', 'ui-modals.js');
    inject('messaging-data-script', 'messaging-data.js');
    inject('engagement-data-script', 'engagement-data.js');
    inject('orders-data-script', 'orders-data.js');
    inject('notifications-script', 'notifications.js');
})();

// ─── Global sidebar-dropdown click handler ───────────────
// Delegated on `document` so it fires on every page regardless of when
// the sidebar HTML is injected, and survives any re-renders.
(function () {
    if (window.__bhSidebarDropdownBound) return;
    window.__bhSidebarDropdownBound = true;

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.dashboard-nav-dropdown > .dashboard-nav-item');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        const dropdown = btn.closest('.dashboard-nav-dropdown');
        if (!dropdown) return;
        const caret   = btn.querySelector('.dashboard-nav-item__caret');
        const content = dropdown.querySelector('.dashboard-nav-dropdown__content');

        const isOpen = dropdown.classList.toggle('dashboard-nav-dropdown--open');
        if (content) {
            content.classList.toggle('dashboard-nav-dropdown__content--active', isOpen);
            content.style.display = isOpen ? 'flex' : 'none';
        }
        if (caret) caret.textContent = isOpen ? 'expand_less' : 'expand_more';
    }, true); // capture phase — runs before any other click listener can stop it
})();

document.addEventListener('DOMContentLoaded', () => {

  // ─── 1. Sidebar Injection & Initialization ───────────
  const initSidebar = async () => {
    const sidebarContainer = document.querySelector('.dashboard-sidebar');
    if (!sidebarContainer) return;

    try {
      const response = await fetch('sidebar-component.html?v=6');
      if (!response.ok) throw new Error('Failed to load sidebar');
      const html = await response.text();
      sidebarContainer.innerHTML = html;

      // After injection, initialize interactivity
      setupSidebarInteractivity(sidebarContainer);
      highlightActiveLink(sidebarContainer);
      updateSidebarCounts(sidebarContainer);
    } catch (error) {
      console.error('Sidebar Error:', error);
    }
  };

  const updateSidebarCounts = async (container) => {
    // 1. Transactions: real pending orders from /api/listings/dashboard/metrics/
    const transBadge = container.querySelector('#nav-badge-transactions');
    const msgBadge = container.querySelector('#nav-badge-messages');

    const setBadge = (el, count) => {
        if (!el) return;
        if (count > 0) { el.textContent = count; el.style.display = 'flex'; }
        else { el.style.display = 'none'; }
    };

    if (typeof getDashboardMetrics === 'function') {
        try {
            const m = await getDashboardMetrics();
            if (m) setBadge(transBadge, m.pending_orders || 0);
        } catch (_) {}
    }

    // 2. Messages: real unread count from /api/conversations/unread-count/
    if (typeof getUnreadCount === 'function') {
        try {
            const count = await getUnreadCount();
            setBadge(msgBadge, count);
        } catch (_) {}
    }

    // 3. My Listings: real total from dashboard metrics, fallback to /listings/my/
    const listingsBadge = container.querySelector('#nav-badge-listings');
    if (listingsBadge) {
        try {
            let total = null;
            if (typeof getDashboardMetrics === 'function') {
                const m = await getDashboardMetrics();
                if (m && typeof m.total_listings === 'number') total = m.total_listings;
            }
            if (total === null && typeof getMyListings === 'function') {
                const r = await getMyListings({ page_size: 1 });
                total = r?.pagination?.count ?? (r?.data?.length || 0);
            }
            setBadge(listingsBadge, total || 0);
        } catch (_) {}
    }
  };

  const setupSidebarInteractivity = (container) => {
    // Per-button cursor only; the click handler is delegated globally below
    container.querySelectorAll('.dashboard-nav-dropdown > .dashboard-nav-item').forEach(btn => {
      btn.style.cursor = 'pointer';
    });

    // Logout link in sidebar footer — clear tokens and redirect to login
    const logoutLink = container.querySelector('.dashboard-logout');
    if (logoutLink) {
      logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Best-effort: blacklist the refresh token on the server
        const refresh = localStorage.getItem('refresh_token');
        if (refresh) {
          fetch('http://127.0.0.1:8000/api/auth/logout/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
            },
            body: JSON.stringify({ refresh }),
          }).catch(() => {});
        }
        // Always clear local state and redirect — even if the network call fails
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('notifications_seen');
        sessionStorage.clear();
        window.location.href = 'login.html';
      });
    }
  };

  const highlightActiveLink = (container) => {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    
    // Find matching link
    const links = container.querySelectorAll('a.dashboard-nav-item, a.dashboard-nav-subitem');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPath) {
        if (link.classList.contains('dashboard-nav-subitem')) {
          link.classList.add('dashboard-nav-subitem--active');
          // Open parent dropdown
          const dropdown = link.closest('.dashboard-nav-dropdown');
          if (dropdown) {
            dropdown.classList.add('dashboard-nav-dropdown--open');
            const caret = dropdown.querySelector('.dashboard-nav-item__caret');
            const content = dropdown.querySelector('.dashboard-nav-dropdown__content');
            if (content) content.classList.add('dashboard-nav-dropdown__content--active');
            if (caret) caret.textContent = 'expand_less';
          }
        } else {
          link.classList.add('dashboard-nav-item--active');
        }
      }
    });
  };

  // ─── 3. Profile Header Sync ──────────────────────────
  const updateProfileHeader = () => {
    // Only run if we have the profile brain loaded
    if (typeof getUserProfile !== 'function') return;

    const profile = getUserProfile();
    // Target both dashboard headers and top-nav headers
    const profileBtns = document.querySelectorAll('.dashboard-header__btn, .top-nav__signin');

    profileBtns.forEach(btn => {
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon && (icon.textContent === 'account_circle' || icon.textContent === 'person')) {
        // Create the wrapper for Name + Avatar
        const wrapper = document.createElement('div');
        wrapper.className = 'header-user-profile';
        
        // Add the Name and Role info
        wrapper.innerHTML = `
          <div class="header-user-info">
            <p class="header-user-name">${profile.name}</p>
          </div>
          <div class="profile-avatar-box">
             ${profile.image ? 
               `<img src="${profile.image}" class="header-avatar" alt="${profile.name}">` : 
               `<div class="header-initials">${profile.initials}</div>`
             }
          </div>
        `;

        // Replace the button's content or the button itself if needed
        // For dashboard style, we usually want to keep the button for clicking
        btn.innerHTML = '';
        btn.appendChild(wrapper);
        btn.classList.add('profile-btn');

        // Make the header avatar/name a shortcut to Business Profile settings
        btn.style.cursor = 'pointer';
        btn.setAttribute('title', 'Open Business Profile');
        btn.setAttribute('aria-label', 'Open Business Profile');
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = 'settings-business.html';
        });
      }
    });
  };

  // Run initializations
  initSidebar();
  updateProfileHeader();

  // ─── 2. Password Visibility Toggle (all pages) ─────────

  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = btn.querySelector('.material-symbols-outlined');

      if (!input) return;

      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      icon.textContent = isHidden ? 'visibility_off' : 'visibility';
      btn.setAttribute('aria-label',
        isHidden ? 'Hide password' : 'Show password'
      );
    });
  });


  // ─── Shared Helpers ─────────────────────────────────
  window.showError = function showError(input, message) {
    if (!input) return;
    clearError(input);
    const row = input.closest('.form-input-row');
    const group = input.closest('.form-group');
    if (row) row.style.borderColor = 'var(--color-error)';
    if (group) {
      const error = document.createElement('p');
      error.className = 'form-error';
      error.textContent = message;
      group.appendChild(error);
    }
  };

  window.clearError = function clearError(element) {
    if (!element) return; // CRITICAL FIX
    element.style.borderColor = "";
    const errorText = element.nextElementSibling;
    if (errorText && errorText.classList.contains('error-message')) {
        errorText.remove();
    }
  };

  window.isValidEmail = function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Auto-clear errors on typing (all pages)
  document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('input', () => {
      const row = input.closest('.form-input-row');
      if (row && row.style.borderColor) {
        clearError(input);
      }
    });
  });

  // ─── Phone input: allow only digits, +, spaces, dashes, parens ──
  document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9+\-() ]/g, '');
    });
  });

});
