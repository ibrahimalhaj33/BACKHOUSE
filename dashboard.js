/* ═══════════════════════════════════════════════════════
   BackHouse — Dashboard Logic (dashboard.js)
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ─── 1. Dynamic Date Rendering ──────────────────────────
    const dateElement = document.getElementById('global-date');
    if (dateElement) {
        const today = new Date();
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        // Output format example: "Sunday, Oct 24"
        dateElement.textContent = today.toLocaleDateString('en-US', options);
    }

    // ─── 2. Language Toggle Mock ────────────────────────────
    const langToggle = document.querySelector('.dashboard-lang__toggle');
    if (langToggle) {
        const langBtns = langToggle.querySelectorAll('span');
        
        langBtns.forEach(btn => {
            if (btn.textContent.trim() === '|' || btn.classList.contains('dashboard-lang__active')) return;
            
            btn.addEventListener('click', () => {
                // In a real app, this would trigger an i18n translation swap.
                // For now, we mock the UI swap.
                const currentActive = langToggle.querySelector('.dashboard-lang__active');
                if (currentActive) {
                    currentActive.className = 'dashboard-lang__inactive';
                }
                btn.className = 'dashboard-lang__active';
                console.log(`Language switched to: ${btn.textContent.trim()}`);
            });
        });
    }

    // ─── 3. Floating Action Button (FAB) ─────────────────────
    const fabButton = document.querySelector('.dashboard-fab');
    if (fabButton) {
        fabButton.addEventListener('click', () => {
            console.log('FAB Clicked! Launching Quick List modal...');
            // Normally this would open a modal to quickly list an item
            // Because of our strict JS separation, we'll navigate to the full listing creation page
            // Or log functionality for now.
            window.location.href = '#create-listing';
        });
    }

    // ─── 4. Quick Actions Routing ────────────────────────────
    const createListingBtn = document.querySelector('.dashboard-action-btn--primary');
    if (createListingBtn) {
        createListingBtn.addEventListener('click', () => {
            console.log('Navigating to Create Listing...');
        });
    }

    // ─── 5. Backend Data Integration Hub ─────────────────────
    /**
     * This function simulates fetching data from a backend API.
     * The backend team will replace this with a real fetch() call.
     */
    async function loadDashboardData() {
        console.log('[Dashboard API] Fetching metrics...');

        // Simulate API delay
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockData = {
                    active_listings: 42,
                    pending_transactions: 8,
                    unread_messages: 3,
                    total_revenue: 'JD 12,450.00'
                };
                resolve(mockData);
            }, 800);
        }).then(data => {
            renderMetrics(data);
        });
    }

    /**
     * Renders the data payload into the HTML.
     */
    function renderMetrics(data) {
        const els = {
            listings: document.getElementById('stat-active-listings'),
            trans:    document.getElementById('stat-pending-transactions'),
            msgs:     document.getElementById('stat-unread-messages'),
            rev:      document.getElementById('stat-total-revenue')
        };

        if (els.listings) els.listings.textContent = data.active_listings;
        if (els.trans)    els.trans.textContent    = data.pending_transactions;
        if (els.msgs)     els.msgs.textContent     = data.unread_messages;
        if (els.rev)      els.rev.textContent      = data.total_revenue;

        console.log('[Dashboard API] Metrics rendered successfully.');
    }

    // Initialize data load
    loadDashboardData();

});
