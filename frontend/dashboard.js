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

    // ─── 5. Stats — live from /api/listings/dashboard/metrics/ ────
    async function loadStats() {
        if (typeof getDashboardMetrics !== 'function') return;
        const m = await getDashboardMetrics();
        if (!m) return;

        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        set('stat-active-listings', m.active_listings ?? 0);
        set('stat-pending-transactions', m.pending_orders ?? 0);
        set('stat-unread-messages', m.unread_messages ?? 0);

        const rev = parseFloat(m.total_revenue) || 0;
        set('stat-total-revenue', `JD ${rev.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
    }

    // ─── 6. Recent Activity feed (orders + ratings) ──────────
    async function loadActivity() {
        const list = document.querySelector('.dashboard-activity-list');
        if (!list) return;

        const items = [];

        // Pull recent completed sales + received ratings
        try {
            if (typeof getMySales === 'function') {
                const sales = await getMySales({ status: 'completed', page_size: 5 });
                sales.data.forEach(o => items.push({
                    when: o.updated_at || o.created_at,
                    icon: 'sync_alt',
                    title: `Listing Sold: ${escapeHtml(o.listing_name)}`,
                    desc: `Sold to <strong>${escapeHtml(o.buyer_name)}</strong> for ${o.price}`,
                    badge: 'SALE COMPLETED',
                    badgeClass: 'dashboard-badge--success',
                }));
            }
            if (typeof getRatings === 'function') {
                const ratings = await getRatings('received');
                ratings.data.slice(0, 5).forEach(r => items.push({
                    when: r.created_at,
                    icon: 'star',
                    title: `New Review from ${escapeHtml(r.rater_name)}`,
                    desc: r.comment
                        ? `"${escapeHtml(r.comment.slice(0, 120))}${r.comment.length > 120 ? '…' : ''}"`
                        : 'No comment provided.',
                    rating: r.stars,
                }));
            }
        } catch (e) { console.warn('[Dashboard] activity fetch failed', e); }

        // Sort newest first, take top 5
        items.sort((a, b) => new Date(b.when) - new Date(a.when));
        const shown = items.slice(0, 6);

        list.innerHTML = '';
        if (shown.length === 0) {
            list.innerHTML = `<div style="padding:2rem; text-align:center; color:#888;">No recent activity yet.</div>`;
            return;
        }

        shown.forEach(it => {
            const ratingHtml = it.rating
                ? `<div class="dashboard-activity-rating">${
                    Array.from({length: 5}, (_, i) => `<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1; color:${i < it.rating ? '#f59e0b' : '#ddd'};">star</span>`).join('')
                  }</div>`
                : '';
            const badgeHtml = it.badge
                ? `<span class="dashboard-badge ${it.badgeClass || ''}">${it.badge}</span>`
                : '';

            const div = document.createElement('div');
            div.className = 'dashboard-activity-item';
            div.innerHTML = `
                <div class="dashboard-activity-icon">
                    <span class="material-symbols-outlined">${it.icon}</span>
                </div>
                <div class="dashboard-activity-content">
                    <div class="dashboard-activity-header">
                        <h5 class="dashboard-activity-title">${it.title}</h5>
                        <span class="dashboard-activity-time">${timeAgo(it.when)}</span>
                    </div>
                    <p class="dashboard-activity-desc">${it.desc}</p>
                    ${ratingHtml}${badgeHtml}
                </div>
            `;
            list.appendChild(div);
        });
    }

    function timeAgo(iso) {
        const diff = (Date.now() - new Date(iso).getTime()) / 1000;
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
        return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    // ─── Expiring Soon widget ────────────────────────────
    async function loadExpiringSoon() {
        const container = document.getElementById('expiring-listings');
        if (!container || typeof getMyListings !== 'function') return;

        try {
            const result = await getMyListings({ expiry_days: 7, status: 'Active', page_size: 5 });
            const items = result.data || [];
            container.innerHTML = '';

            if (items.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding:1.5rem 0.5rem; color:#888;">
                        <span class="material-symbols-outlined" style="font-size:2rem; color:#ddd;">check_circle</span>
                        <p style="margin:0.5rem 0 0 0; font-size:0.85rem;">Nothing expiring soon — your inventory is fresh.</p>
                    </div>`;
                return;
            }

            items.forEach(item => {
                const imgHtml = item.image
                    ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" class="dashboard-list-image">`
                    : `<div class="dashboard-list-image" style="display:flex; align-items:center; justify-content:center; background:#f3f4f6; color:#aaa;"><span class="material-symbols-outlined" style="font-size:1.25rem;">image</span></div>`;

                const days = item.expiryDays || 0;
                // Urgency-based progress (the closer to expiry, the more filled — and the redder)
                const pct = Math.max(0, Math.min(100, 100 - (days / 7) * 100));
                const barColor = days <= 2 ? '#ef4444' : days <= 5 ? '#f59e0b' : '#10b981';

                const div = document.createElement('div');
                div.className = 'dashboard-list-item';
                div.style.cursor = 'pointer';
                div.onclick = () => window.location.href = `edit-listing.html?id=${item.id}`;
                div.innerHTML = `
                    <div class="dashboard-list-top">
                        ${imgHtml}
                        <div class="dashboard-list-info">
                            <h5 class="dashboard-list-title">${escapeHtml(item.name)}</h5>
                            <span class="dashboard-list-sku">${escapeHtml(item.sku || '')}</span>
                        </div>
                    </div>
                    <div class="dashboard-list-meta">
                        <span class="dashboard-list-label" style="color:${days <= 2 ? '#ef4444' : '#d97706'};">
                            ${days <= 0 ? 'Expires today' : `Expires in ${days} day${days !== 1 ? 's' : ''}`}
                        </span>
                        <span class="dashboard-list-stock">Stock: ${item.inventoryCurrent} ${item.unit}</span>
                    </div>
                    <div class="dashboard-progress-bg">
                        <div class="dashboard-progress-fill" style="width:${pct}%; background:${barColor};"></div>
                    </div>
                `;
                container.appendChild(div);
            });
        } catch (e) {
            console.warn('[Dashboard] expiring widget failed', e);
        }
    }

    // ─── Impact widget (waste + CO2 + tier) ─────────────
    async function loadImpact() {
        if (typeof getDashboardMetrics !== 'function') return;
        const m = await getDashboardMetrics();
        if (!m) return;

        const wasteKg = m.waste_redirected_kg || 0;
        const wasteEl = document.getElementById('impact-waste');
        if (wasteEl) wasteEl.textContent = m.waste_redirected_display || '0 kg';

        // CO2 estimate: ~2.5 kg CO2 per kg waste diverted (industry avg)
        const co2 = wasteKg * 2.5;
        const co2El = document.getElementById('impact-co2');
        if (co2El) co2El.textContent = co2 >= 1000
            ? `${(co2 / 1000).toFixed(2)} tons`
            : `${co2.toFixed(0)} kg`;

        // Progress toward 1-ton waste milestone & 500-kg CO2 milestone
        const wasteBar = document.getElementById('impact-waste-bar');
        if (wasteBar) wasteBar.style.width = Math.min(100, (wasteKg / 1000) * 100) + '%';
        const co2Bar = document.getElementById('impact-co2-bar');
        if (co2Bar) co2Bar.style.width = Math.min(100, (co2 / 500) * 100) + '%';

        // Tier ribbon
        const tier = document.getElementById('impact-tier');
        if (tier) {
            if (wasteKg >= 1000) tier.textContent = '🏆 Sustainability Champion — over 1 ton diverted';
            else if (wasteKg >= 200) tier.textContent = '🌟 Waste Guardian — keep going!';
            else if (wasteKg >= 50) tier.textContent = '🌱 Eco Conscious — great progress';
            else tier.textContent = '🌿 Starter — every kg counts';
        }
    }

    // ─── Profile Quick View ──────────────────────────────
    async function loadProfile() {
        const userJson = localStorage.getItem('user');
        if (!userJson) return;
        const user = JSON.parse(userJson);

        const avatar = document.getElementById('profile-avatar');
        const nameEl = document.getElementById('profile-name');
        const roleEl = document.getElementById('profile-role');
        const ratingEl = document.getElementById('profile-rating');
        const salesEl = document.getElementById('profile-sales');

        const displayName = user.business_profile?.business_name || user.full_name || user.email;
        const initials = user.initials || displayName.charAt(0).toUpperCase();

        if (avatar) avatar.textContent = initials;
        if (nameEl) nameEl.textContent = displayName;
        if (roleEl) {
            const role = (user.role || 'member').toLowerCase();
            roleEl.textContent = role === 'both' ? 'Buyer & Seller'
                : role === 'seller' ? 'Seller'
                : role === 'buyer' ? 'Buyer'
                : 'Member';
        }

        // Pull fresh rating + sales counts
        if (typeof getRatingSummary === 'function') {
            try {
                const s = await getRatingSummary();
                if (s && ratingEl) ratingEl.textContent = s.total > 0
                    ? `${s.average.toFixed(1)}/5.0`
                    : '— / 5.0';
            } catch (_) {}
        }

        // Sales count from dashboard metrics (completed orders)
        if (typeof getDashboardMetrics === 'function' && typeof getMySales === 'function') {
            try {
                const sales = await getMySales({ status: 'completed', page_size: 1 });
                if (salesEl) salesEl.textContent = sales.pagination?.count ?? 0;
            } catch (_) {}
        }
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    // Initialize everything
    loadStats();
    loadActivity();
    loadExpiringSoon();
    loadImpact();
    loadProfile();
});
