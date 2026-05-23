/**
 * SALES SELLER PAGE
 * Shows orders placed on the current user's listings.
 * Backed by /api/orders/sales/.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.querySelector('.sales-grid');
    if (!grid) return;

    const feed = grid.querySelector('.sales-feed');
    const tabs = document.querySelectorAll('.sales-tabs__btn');

    let currentPage = 1;
    let currentTab = 'pending';  // pending | confirmed | completed | cancelled
    let orders = [];
    let pagination = null;

    async function fetchOrders() {
        const params = { page: currentPage, page_size: 5 };
        if (currentTab) params.status = currentTab;
        const result = await getMySales(params);
        orders = result.data;
        pagination = result.pagination;
    }

    function statusBadge(status) {
        const map = {
            pending:          { label: 'New',        color: '#b45309', bg: 'rgba(245,158,11,0.15)' },
            confirmed:        { label: 'Confirmed',  color: '#047857', bg: 'rgba(16,185,129,0.15)' },
            pickup_scheduled: { label: 'Scheduled',  color: '#1d4ed8', bg: 'rgba(59,130,246,0.15)' },
            completed:        { label: 'Completed',  color: '#4338ca', bg: 'rgba(99,102,241,0.15)' },
            cancelled:        { label: 'Cancelled',  color: '#b91c1c', bg: 'rgba(239,68,68,0.15)' },
        };
        const s = map[status] || { label: status, color: '#333', bg: '#eee' };
        return `<span style="background:${s.bg}; color:${s.color}; padding:0.25rem 0.75rem; border-radius:999px; font-size:0.75rem; font-weight:700;">${s.label}</span>`;
    }

    function actionsFor(order) {
        // Buttons depend on current status
        if (order.status === 'pending') {
            return `
                <button class="action-confirm btn-primary" data-id="${order.id}"
                        style="padding:0.4rem 0.8rem; font-size:0.8rem;">Confirm</button>
                <button class="action-cancel" data-id="${order.id}"
                        style="background:none; border:1px solid #fecaca; color:#b91c1c; border-radius:6px; padding:0.4rem 0.8rem; cursor:pointer; font-size:0.8rem;">Reject</button>`;
        }
        if (order.status === 'confirmed') {
            return `
                <button class="action-schedule" data-id="${order.id}"
                        style="background:#3b82f6; color:#fff; border:none; border-radius:6px; padding:0.4rem 0.8rem; cursor:pointer; font-size:0.8rem;">Schedule Pickup</button>
                <button class="action-complete" data-id="${order.id}"
                        style="background:#10b981; color:#fff; border:none; border-radius:6px; padding:0.4rem 0.8rem; cursor:pointer; font-size:0.8rem;">Mark Completed</button>`;
        }
        if (order.status === 'pickup_scheduled') {
            return `
                <button class="action-reschedule" data-id="${order.id}"
                        style="background:#fff; color:#1d4ed8; border:1px solid #93c5fd; border-radius:6px; padding:0.4rem 0.8rem; cursor:pointer; font-size:0.8rem;">Reschedule</button>
                <button class="action-cancel" data-id="${order.id}"
                        style="background:none; border:1px solid #fecaca; color:#b91c1c; border-radius:6px; padding:0.4rem 0.8rem; cursor:pointer; font-size:0.8rem;">Cancel</button>
                <button class="action-complete" data-id="${order.id}"
                        style="background:#10b981; color:#fff; border:none; border-radius:6px; padding:0.4rem 0.8rem; cursor:pointer; font-size:0.8rem;">Mark Completed</button>`;
        }
        return '';
    }

    function renderCard(order) {
        const card = document.createElement('article');
        card.className = 'sales-card';
        const imgCell = order.listing_image
            ? `<img src="${order.listing_image}" style="width:64px; height:64px; border-radius:8px; object-fit:cover;">`
            : `<div style="width:64px; height:64px; border-radius:8px; background:#f0f0f0; display:flex; align-items:center; justify-content:center; color:#aaa;"><span class="material-symbols-outlined">image</span></div>`;

        card.innerHTML = `
            <div class="sales-card__content" style="display:flex; gap:1rem; padding:1rem; align-items:center; background:#fff; border:1px solid rgba(0,0,0,0.08); border-radius:12px; margin-bottom:0.75rem;">
                ${imgCell}
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                        <p style="margin:0; font-weight:700;">${order.listing_name}</p>
                        ${statusBadge(order.status)}
                    </div>
                    <p style="margin:0.25rem 0; font-size:0.75rem; color:#666;">
                        Buyer: <strong>${order.buyer_name}</strong> · Qty ${order.quantity} · ${order.price}
                    </p>
                    ${order.pickup_date_display
                        ? `<p style="margin:0; font-size:0.75rem; color:#1d4ed8;">
                             📅 Pickup: ${order.pickup_date_display}
                             ${order.buyer_confirmed_pickup
                                ? '<span style="color:#10b981; margin-left:0.5rem; font-weight:600;">✓ Buyer confirmed</span>'
                                : '<span style="color:#d97706; margin-left:0.5rem; font-weight:600;">⏳ Awaiting buyer confirmation</span>'}
                           </p>`
                        : ''}
                </div>
                <div style="display:flex; gap:0.5rem; flex-shrink:0;">
                    ${actionsFor(order)}
                </div>
            </div>
        `;
        return card;
    }

    async function render() {
        if (!feed) return;
        await fetchOrders();

        feed.innerHTML = '';
        grid.querySelectorAll('.sales-card').forEach(c => c.remove());
        const oldPag = grid.querySelector('.seller-pagination');
        if (oldPag) oldPag.remove();

        // Update tab badges with live counts (just for the active tab; cheap)
        const activeBadge = document.querySelector('.sales-tabs__btn--active .sales-tabs__badge');
        if (activeBadge) activeBadge.textContent = pagination?.count ?? orders.length;

        if (orders.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding:3rem; text-align:center; color:#666;';
            const labels = {
                pending:          'pending',
                confirmed:        'confirmed',
                pickup_scheduled: 'pickup-scheduled',
                completed:        'completed',
                cancelled:        'cancelled',
            };
            empty.textContent = `No ${labels[currentTab] || currentTab} orders.`;
            feed.appendChild(empty);
            return;
        }

        orders.forEach(o => feed.appendChild(renderCard(o)));

        // Pagination
        if (pagination && pagination.total_pages > 1) {
            const pagBox = document.createElement('div');
            pagBox.className = 'seller-pagination';
            pagBox.style.cssText = 'display:flex; gap:0.5rem; justify-content:center; margin-top:1rem;';
            pagBox.innerHTML = `
                <button class="page-btn-prev" ${!pagination.previous ? 'disabled' : ''}
                        style="border:1px solid #ddd; border-radius:6px; padding:0.5rem 1rem; cursor:pointer; opacity:${pagination.previous ? '1' : '0.4'};">‹</button>
                <span style="display:flex; align-items:center; font-size:0.875rem;">Page ${pagination.page} of ${pagination.total_pages}</span>
                <button class="page-btn-next" ${!pagination.next ? 'disabled' : ''}
                        style="border:1px solid #ddd; border-radius:6px; padding:0.5rem 1rem; cursor:pointer; opacity:${pagination.next ? '1' : '0.4'};">›</button>`;
            feed.appendChild(pagBox);

            pagBox.querySelector('.page-btn-prev')?.addEventListener('click', () => {
                if (pagination.previous) { currentPage -= 1; render(); }
            });
            pagBox.querySelector('.page-btn-next')?.addEventListener('click', () => {
                if (pagination.next) { currentPage += 1; render(); }
            });
        }
    }

    // Tabs (Pending / Confirmed / Completed) — read data-status from the button
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(b => b.classList.remove('sales-tabs__btn--active'));
            btn.classList.add('sales-tabs__btn--active');
            currentTab = btn.dataset.status || 'pending';
            currentPage = 1;
            render();
        });
    });

    /** Open the styled datetime picker and return an ISO string, or null. */
    async function pickPickupDateTime(currentIso) {
        const seed = currentIso ? new Date(currentIso) : (() => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            d.setHours(10, 0, 0, 0);
            return d;
        })();
        // Convert to local YYYY-MM-DDTHH:MM (the format the datetime-local input expects)
        const pad = (n) => String(n).padStart(2, '0');
        const seedLocal =
            `${seed.getFullYear()}-${pad(seed.getMonth() + 1)}-${pad(seed.getDate())}` +
            `T${pad(seed.getHours())}:${pad(seed.getMinutes())}`;

        const dt = await uiPrompt({
            title: currentIso ? 'Reschedule Pickup' : 'Schedule Pickup',
            message: currentIso
                ? 'Pick a new date and time. The buyer will be notified.'
                : 'When should the buyer come pick up this order?',
            inputType: 'datetime-local',
            defaultValue: seedLocal,
            icon: 'event',
            confirmText: currentIso ? 'Reschedule' : 'Schedule',
        });
        if (!dt) return null;
        try {
            return new Date(dt).toISOString();
        } catch (_) {
            return null;
        }
    }

    // Action handlers (event delegation on the grid)
    grid.addEventListener('click', async (e) => {
        const confirmBtn = e.target.closest('.action-confirm');
        const cancelBtn = e.target.closest('.action-cancel');
        const scheduleBtn = e.target.closest('.action-schedule');
        const rescheduleBtn = e.target.closest('.action-reschedule');
        const completeBtn = e.target.closest('.action-complete');

        if (confirmBtn) {
            await updateOrderStatus(confirmBtn.dataset.id, 'confirmed');
            render();
        } else if (cancelBtn) {
            const ok = await uiConfirm({
                title: 'Reject this order?',
                message: 'The buyer will be notified and the order will be cancelled.',
                confirmText: 'Reject',
                cancelText: 'Keep',
                danger: true,
            });
            if (!ok) return;
            await updateOrderStatus(cancelBtn.dataset.id, 'cancelled');
            render();
        } else if (scheduleBtn) {
            const iso = await pickPickupDateTime(null);
            if (!iso) return;
            try {
                await updateOrderStatus(scheduleBtn.dataset.id, 'pickup_scheduled', { pickup_date: iso });
                render();
            } catch (err) {
                await uiAlert({ type: 'error', title: 'Failed to schedule', message: 'Please try again with a valid date.' });
            }
        } else if (rescheduleBtn) {
            const orderId = rescheduleBtn.dataset.id;
            const order = orders.find(o => String(o.id) === String(orderId));
            const iso = await pickPickupDateTime(order?.pickup_date);
            if (!iso) return;
            try {
                // Re-send the same status with the updated pickup_date — backend allows this self-transition
                await updateOrderStatus(orderId, 'pickup_scheduled', { pickup_date: iso });
                await uiAlert({ type: 'success', title: 'Pickup rescheduled', message: 'The buyer can see the updated time.' });
                render();
            } catch (err) {
                await uiAlert({ type: 'error', title: 'Failed to reschedule', message: 'Please try again.' });
            }
        } else if (completeBtn) {
            const ok = await uiConfirm({
                title: 'Mark order as completed?',
                message: 'This will decrement the listing inventory and finalize the order.',
                confirmText: 'Mark completed',
                cancelText: 'Cancel',
                danger: false,
            });
            if (!ok) return;
            await updateOrderStatus(completeBtn.dataset.id, 'completed');
            render();
        }
    });

    // ─── Dashboard widgets (hero CO2, tab badges, stats card) ────
    async function renderDashboard() {
        if (typeof getSellerDashboard !== 'function') return;
        const d = await getSellerDashboard();
        if (!d) return;

        // Hero CO2 badge
        const heroCO2 = document.getElementById('sales-hero-co2');
        if (heroCO2) heroCO2.textContent = d.monthly_co2_display;

        // Tab badges
        const setBadge = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        setBadge('badge-pending', d.status_counts.pending);
        setBadge('badge-confirmed', d.status_counts.confirmed);
        setBadge('badge-scheduled', d.status_counts.pickup_scheduled);
        setBadge('badge-completed', d.status_counts.completed);

        // Revenue card
        const revenue = document.getElementById('stat-revenue');
        if (revenue) revenue.textContent = d.monthly_revenue_display;

        const trendEl = document.getElementById('stat-revenue-trend');
        if (trendEl) {
            const up = d.monthly_revenue_trend_pct >= 0;
            trendEl.className = `sales-stats__trend sales-stats__trend--${up ? 'up' : 'down'}`;
            trendEl.innerHTML = `
                <span class="material-symbols-outlined" style="font-size: 1rem;">${up ? 'trending_up' : 'trending_down'}</span>
                ${up ? '+' : ''}${d.monthly_revenue_trend_pct}%
            `;
        }

        // Circular Efficiency
        const eff = document.getElementById('stat-efficiency');
        if (eff) eff.textContent = `${d.circular_efficiency_pct}%`;
        const effDetail = document.getElementById('stat-efficiency-detail');
        if (effDetail) effDetail.textContent = `${d.sold_listings} / ${d.total_listings} sold`;

        // Warehouse Space Saved
        const spaceBar = document.getElementById('space-bar');
        const spaceText = document.getElementById('space-text');
        if (spaceBar) spaceBar.style.width = `${d.space_progress_pct}%`;
        if (spaceText) spaceText.textContent = `${d.space_saved_sqft.toLocaleString()} / ${d.space_target_sqft.toLocaleString()} sq.ft reclaimed`;
    }

    await render();
    await renderDashboard();

    // Also refresh dashboard whenever the user takes a status-changing action
    const _origRender = render;
    render = async function() {
        await _origRender();
        await renderDashboard();
    };
});
