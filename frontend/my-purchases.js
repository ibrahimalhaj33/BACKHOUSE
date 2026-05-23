document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.querySelector('.purchases-table tbody');
    const itemCountSpan = document.querySelector('.table-header__count');
    const tableContainer = document.querySelector('.table-container');

    let orders = [];
    let pagination = null;
    let currentPage = 1;

    async function fetchOrders() {
        const result = await getMyPurchases({ page: currentPage, page_size: 5 });
        orders = result.data;
        pagination = result.pagination;
    }

    function statusBadge(status) {
        const map = {
            pending:          { label: 'Pending',          bg: 'rgba(245,158,11,0.15)', color: '#b45309' },
            confirmed:        { label: 'Confirmed',        bg: 'rgba(16,185,129,0.15)', color: '#047857' },
            pickup_scheduled: { label: 'Pickup Scheduled', bg: 'rgba(59,130,246,0.15)', color: '#1d4ed8' },
            completed:        { label: 'Completed',        bg: 'rgba(99,102,241,0.15)', color: '#4338ca' },
            cancelled:        { label: 'Cancelled',        bg: 'rgba(239,68,68,0.15)',  color: '#b91c1c' },
        };
        const s = map[status] || { label: status, bg: '#eee', color: '#333' };
        return `<span style="background:${s.bg}; color:${s.color}; padding:0.25rem 0.75rem; border-radius:999px; font-size:0.75rem; font-weight:700;">${s.label}</span>`;
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    function actionButtons(order) {
        const messageBtn = `
            <a href="messages.html?to=${order.seller}&ref=${order.listing}" title="Message seller"
               style="color:#666; text-decoration:none; display:inline-flex; align-items:center; padding:0.25rem;">
                <span class="material-symbols-outlined" style="font-size:1.125rem;">chat_bubble</span>
            </a>`;

        if (order.status === 'pending') {
            return `
                <div style="display:flex; gap:0.5rem; justify-content:flex-end; align-items:center;">
                    ${messageBtn}
                    <button class="btn-cancel-order" data-order-id="${order.id}"
                            style="background:none; border:1px solid #fecaca; color:#b91c1c; border-radius:6px; padding:0.25rem 0.6rem; cursor:pointer; font-size:0.75rem;">
                        Cancel
                    </button>
                </div>`;
        }
        if (order.status === 'confirmed') {
            return `
                <div style="display:flex; gap:0.5rem; justify-content:flex-end; align-items:center;">
                    ${messageBtn}
                    <span style="font-size:0.75rem; color:#555;">Awaiting pickup schedule…</span>
                </div>`;
        }
        if (order.status === 'pickup_scheduled') {
            const dateChip = order.pickup_date_display
                ? `<span style="font-size:0.75rem; color:#1d4ed8;">📅 ${order.pickup_date_display}</span>`
                : '';
            if (order.buyer_confirmed_pickup) {
                return `
                    <div style="display:flex; gap:0.5rem; justify-content:flex-end; align-items:center; flex-wrap:wrap;">
                        ${messageBtn}
                        ${dateChip}
                        <span style="font-size:0.75rem; color:#10b981; font-weight:600; display:inline-flex; align-items:center; gap:0.25rem;">
                            <span class="material-symbols-outlined" style="font-size:1rem;">check_circle</span> Confirmed
                        </span>
                    </div>`;
            }
            return `
                <div style="display:flex; gap:0.5rem; justify-content:flex-end; align-items:center; flex-wrap:wrap;">
                    ${messageBtn}
                    ${dateChip}
                    <button class="btn-confirm-pickup" data-order-id="${order.id}"
                            style="background:#10b981; color:#fff; border:none; border-radius:6px; padding:0.35rem 0.8rem; cursor:pointer; font-size:0.75rem; font-weight:600;">
                        Confirm Pickup
                    </button>
                </div>`;
        }
        if (order.status === 'completed') {
            return `
                <div style="display:flex; gap:0.5rem; justify-content:flex-end; align-items:center;">
                    ${messageBtn}
                    <button class="btn-rate-order" data-order-id="${order.id}" data-counterpart="${escapeHtml(order.seller_name)}" data-listing="${escapeHtml(order.listing_name)}"
                            style="background:#f59e0b; color:#fff; border:none; border-radius:6px; padding:0.35rem 0.7rem; cursor:pointer; font-size:0.75rem; font-weight:600;">
                        <span class="material-symbols-outlined" style="font-size:1rem; vertical-align:middle; font-variation-settings: 'FILL' 1;">star</span> Rate
                    </button>
                </div>`;
        }
        return '';
    }

    async function renderTable() {
        if (!tableBody) return;

        await fetchOrders();

        const count = pagination?.count ?? orders.length;
        if (itemCountSpan) itemCountSpan.textContent = `${count} item${count !== 1 ? 's' : ''}`;

        // Remove old pagination UI
        const oldPagination = tableContainer.parentElement.querySelector('.buyer-pagination');
        if (oldPagination) oldPagination.remove();

        tableBody.innerHTML = '';

        if (orders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center; padding:3rem; color:#666;">
                        No purchases yet.
                        <a href="browse-dash.html" style="color:#10b981; text-decoration:underline;">Browse listings</a>
                    </td>
                </tr>`;
            return;
        }

        orders.forEach(order => {
            const tr = document.createElement('tr');
            const imageCell = order.listing_image
                ? `<img src="${order.listing_image}" alt="${order.listing_name}" style="width:48px; height:48px; border-radius:8px; object-fit:cover;">`
                : `<div style="width:48px; height:48px; border-radius:8px; background:#f0f0f0; display:flex; align-items:center; justify-content:center; color:#aaa;"><span class="material-symbols-outlined" style="font-size:20px;">image</span></div>`;

            tr.innerHTML = `
                <td>
                    <div style="display:flex; gap:0.75rem; align-items:center;">
                        ${imageCell}
                        <div>
                            <p style="margin:0; font-weight:600;">${order.listing_name}</p>
                            <span style="font-size:0.75rem; color:#666;">${order.listing_sku} · Qty ${order.quantity}</span>
                        </div>
                    </div>
                </td>
                <td><span style="font-weight:700;">${order.price}</span></td>
                <td>${statusBadge(order.status)}</td>
                <td style="text-align:right;">${actionButtons(order)}</td>
            `;
            tableBody.appendChild(tr);
        });

        // Pagination buttons
        if (pagination && pagination.total_pages > 1) {
            const container = document.createElement('div');
            container.className = 'buyer-pagination';
            container.style.cssText = 'display:flex; gap:0.5rem; justify-content:center; width:100%; margin:1rem 0 2rem 0;';
            container.innerHTML = `
                <button class="page-btn-prev" ${!pagination.previous ? 'disabled' : ''}
                        style="border:1px solid #ddd; border-radius:6px; padding:0.5rem 1rem; cursor:pointer; opacity:${pagination.previous ? '1' : '0.4'};">
                    <span class="material-symbols-outlined" style="vertical-align:middle;">chevron_left</span>
                </button>
                <span style="display:flex; align-items:center; font-size:0.875rem; color:#555;">
                    Page ${pagination.page} of ${pagination.total_pages}
                </span>
                <button class="page-btn-next" ${!pagination.next ? 'disabled' : ''}
                        style="border:1px solid #ddd; border-radius:6px; padding:0.5rem 1rem; cursor:pointer; opacity:${pagination.next ? '1' : '0.4'};">
                    <span class="material-symbols-outlined" style="vertical-align:middle;">chevron_right</span>
                </button>`;
            tableContainer.parentNode.insertBefore(container, tableContainer.nextSibling);

            container.querySelector('.page-btn-prev')?.addEventListener('click', () => {
                if (pagination.previous) { currentPage -= 1; renderTable(); }
            });
            container.querySelector('.page-btn-next')?.addEventListener('click', () => {
                if (pagination.next) { currentPage += 1; renderTable(); }
            });
        }
    }

    // Event delegation: Cancel button + Confirm Pickup button
    if (tableBody) {
        tableBody.addEventListener('click', async (e) => {
            const cancelBtn = e.target.closest('.btn-cancel-order');
            const confirmPickupBtn = e.target.closest('.btn-confirm-pickup');

            if (cancelBtn) {
                const orderId = cancelBtn.getAttribute('data-order-id');
                const confirmed = await uiConfirm({
                    title: 'Cancel order?',
                    message: 'This order will be cancelled and removed from your purchases.',
                    confirmText: 'Cancel order',
                    cancelText: 'Keep it',
                    danger: true,
                });
                if (!confirmed) return;
                const ok = await cancelOrder(orderId);
                if (ok) {
                    await renderTable();
                } else {
                    await uiAlert({ type: 'error', title: 'Failed', message: 'Failed to cancel the order.' });
                }
                return;
            }

            const rateBtn = e.target.closest('.btn-rate-order');
            if (rateBtn) {
                const orderId = parseInt(rateBtn.getAttribute('data-order-id'));
                const counterpart = rateBtn.getAttribute('data-counterpart') || 'the seller';
                const listingName = rateBtn.getAttribute('data-listing') || '';
                openRatingModal(orderId, counterpart, listingName);
                return;
            }

            if (confirmPickupBtn) {
                const orderId = confirmPickupBtn.getAttribute('data-order-id');
                const order = orders.find(o => String(o.id) === String(orderId));
                const ok = await uiConfirm({
                    title: 'Confirm pickup time?',
                    message: `Confirm that you can pick up "${order?.listing_name}" at:\n\n${order?.pickup_date_display || ''}\n\nThe seller will be notified.`,
                    confirmText: 'Confirm',
                    cancelText: 'Not yet',
                    danger: false,
                });
                if (!ok) return;
                try {
                    await confirmPickup(orderId);
                    await uiAlert({
                        type: 'success',
                        title: 'Pickup confirmed',
                        message: 'The seller has been notified that you accepted the schedule.',
                    });
                    await renderTable();
                } catch (err) {
                    await uiAlert({
                        type: 'error',
                        title: 'Could not confirm',
                        message: err?.error?.message || 'Please try again.',
                    });
                }
            }
        });
    }

    // ─── Sustainability Scorecard ───────────────────────
    async function renderScorecard() {
        if (typeof getBuyerScorecard !== 'function') return;
        const sc = await getBuyerScorecard();
        if (!sc) return;

        const wasteEl = document.getElementById('scorecard-waste');
        const savingsEl = document.getElementById('scorecard-savings');
        const tierLabel = document.getElementById('scorecard-tier-label');
        const tierIcon = document.getElementById('scorecard-tier-icon');
        const desc = document.getElementById('scorecard-desc');

        if (wasteEl) wasteEl.textContent = sc.waste_diverted_display;
        if (savingsEl) savingsEl.textContent = sc.procurement_savings_display;
        if (tierLabel) tierLabel.textContent = `Tier: ${sc.tier.label}`;
        if (tierIcon) tierIcon.textContent = sc.tier.icon;

        // Encourage the next tier
        if (desc && sc.next_tier) {
            desc.textContent = `Across ${sc.completed_orders} completed order${sc.completed_orders !== 1 ? 's' : ''} you've prevented ${sc.waste_diverted_display} of waste and avoided ~${sc.co2_avoided_kg.toFixed(1)} kg CO₂. ${sc.next_tier.kg_remaining.toFixed(0)} kg more to reach "${sc.next_tier.label}".`;
        } else if (desc) {
            desc.textContent = `Across ${sc.completed_orders} completed order${sc.completed_orders !== 1 ? 's' : ''} you've prevented ${sc.waste_diverted_display} of waste and avoided ~${sc.co2_avoided_kg.toFixed(1)} kg CO₂. You're at the top tier — keep it up!`;
        }
    }

    // ─── Rating modal ─────────────────────────────────────
    function openRatingModal(orderId, counterpart, listingName) {
        const overlay = document.createElement('div');
        overlay.className = 'ui-modal__overlay';
        overlay.innerHTML = `
            <div class="ui-modal">
                <div class="ui-modal__icon" style="background:rgba(245,158,11,0.12); color:#d97706;">
                    <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">star</span>
                </div>
                <h3 class="ui-modal__title">Rate ${escapeHtml(counterpart)}</h3>
                <p class="ui-modal__message">How was your experience with the <strong>${escapeHtml(listingName)}</strong> order?</p>
                <div id="star-picker" style="text-align:center; margin-bottom:1rem;">
                    ${[1,2,3,4,5].map(i => `
                        <span class="rating-star material-symbols-outlined" data-value="${i}"
                              style="font-size:36px; cursor:pointer; color:#ddd; font-variation-settings:'FILL' 1;">star</span>
                    `).join('')}
                </div>
                <textarea class="ui-modal__input" id="rating-comment" rows="3" placeholder="Add a comment (optional)" style="resize:vertical; min-height:60px;"></textarea>
                <div class="ui-modal__actions">
                    <button class="ui-modal__btn ui-modal__btn--cancel" data-action="cancel">Cancel</button>
                    <button class="ui-modal__btn ui-modal__btn--primary" data-action="submit">Submit</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        let selected = 0;
        const stars = overlay.querySelectorAll('.rating-star');
        const paint = (n) => stars.forEach((s, i) => s.style.color = i < n ? '#f59e0b' : '#ddd');
        stars.forEach(s => {
            s.addEventListener('mouseenter', () => paint(parseInt(s.dataset.value)));
            s.addEventListener('mouseleave', () => paint(selected));
            s.addEventListener('click', () => { selected = parseInt(s.dataset.value); paint(selected); });
        });
        overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => overlay.remove());
        overlay.querySelector('[data-action="submit"]').addEventListener('click', async () => {
            if (!selected) {
                await uiAlert({ type:'warning', message:'Please pick a star rating first.' });
                return;
            }
            const comment = overlay.querySelector('#rating-comment').value.trim();
            try {
                await submitRating({ order: orderId, stars: selected, comment });
                overlay.remove();
                await uiAlert({ type:'success', title:'Thanks for your feedback!', message:'Your rating has been recorded.' });
            } catch (err) {
                await uiAlert({
                    type:'error',
                    title:'Could not submit',
                    message: err?.error?.message || 'Please try again.',
                });
            }
        });
    }

    await renderTable();
    await renderScorecard();
});
