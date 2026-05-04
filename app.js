/* ═══════════════════════════════════════════════════════
   BackHouse — Shared / Global JavaScript
   Vanilla JS · No dependencies
   Loaded on EVERY page · Page-specific logic lives in
   its own file (login.js, register.js, etc.)
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ─── 1. Sidebar Injection & Initialization ───────────
  const initSidebar = async () => {
    const sidebarContainer = document.querySelector('.dashboard-sidebar');
    if (!sidebarContainer) return;

    try {
      const response = await fetch('sidebar-component.html');
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

  const updateSidebarCounts = (container) => {
    if (typeof getOrders !== 'function') return;

    // 1. Transactions Logic (Pending Orders)
    const orders = getOrders();
    // Count orders that are "pending" where I am either the buyer or seller
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    
    const transBadge = container.querySelector('#nav-badge-transactions');
    if (transBadge) {
        if (pendingCount > 0) {
            transBadge.textContent = pendingCount;
            transBadge.style.display = 'flex';
        } else {
            transBadge.style.display = 'none';
        }
    }

    // 2. Messages Logic (Mocked dynamic logic)
    // In a real app, this would fetch from getMessages()
    const msgBadge = container.querySelector('#nav-badge-messages');
    if (msgBadge) {
        // For now, let's say we have 2 unread messages as a baseline
        const unreadMessages = 2; 
        if (unreadMessages > 0) {
            msgBadge.textContent = unreadMessages;
            msgBadge.style.display = 'flex';
        } else {
            msgBadge.style.display = 'none';
        }
    }
  };

  const setupSidebarInteractivity = (container) => {
    // Dropdown Toggles
    container.querySelectorAll('.dashboard-nav-dropdown > .dashboard-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const dropdown = btn.closest('.dashboard-nav-dropdown');
        const caret = btn.querySelector('.dashboard-nav-item__caret');
        const content = dropdown.querySelector('.dashboard-nav-dropdown__content');

        const isOpen = dropdown.classList.toggle('dashboard-nav-dropdown--open');
        if (content) content.classList.toggle('dashboard-nav-dropdown__content--active', isOpen);
        if (caret) caret.textContent = isOpen ? 'expand_less' : 'expand_more';
      });
    });

    // Language Toggle (Sidebar Footer)
    const langToggle = container.querySelector('.dashboard-lang__toggle');
    if (langToggle) {
      langToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('span');
        if (!btn || btn.textContent === '|') return;

        const allBtns = langToggle.querySelectorAll('span');
        allBtns.forEach(b => {
          if (b.textContent !== '|') {
            b.className = (b === btn) ? 'dashboard-lang__active' : 'dashboard-lang__inactive';
          }
        });
        console.log(`[Sidebar] Language switched to: ${btn.textContent.trim()}`);
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
