/* ═══════════════════════════════════════════════════════
   BackHouse — Favorites Page (Phase 5: fully live)
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.querySelector('.favorites-grid');
    if (!grid) return;

    let favorites = [];
    let searchQuery = '';
    let sortBy = 'newest';      // newest | price-asc | price-desc | distance

    async function loadFavorites() {
        const result = await getFavorites();
        favorites = result.data || [];
        renderGrid();
    }

    function getVisible() {
        let list = [...favorites];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(f =>
                (f.listing?.name || '').toLowerCase().includes(q) ||
                (f.listing?.seller_name || '').toLowerCase().includes(q)
            );
        }
        const numericPrice = (f) => parseFloat(f.listing?.numericPrice) || 0;
        const distanceKm = (f) => f.listing?.distance_km ?? Number.POSITIVE_INFINITY;
        if (sortBy === 'price-asc') list.sort((a, b) => numericPrice(a) - numericPrice(b));
        else if (sortBy === 'price-desc') list.sort((a, b) => numericPrice(b) - numericPrice(a));
        else if (sortBy === 'distance') list.sort((a, b) => distanceKm(a) - distanceKm(b));
        else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return list;
    }

    function renderGrid() {
        grid.innerHTML = '';
        grid.removeAttribute('style');
        const visible = getVisible();
        updateFooterCount(visible.length, favorites.length);

        if (favorites.length === 0) {
            showEmpty();
            return;
        }
        if (visible.length === 0) {
            grid.style.cssText = 'display:flex; justify-content:center; align-items:center; min-height:200px; text-align:center;';
            grid.innerHTML = `<p style="color:#888;">No favorites match "${escapeHtml(searchQuery)}".</p>`;
            return;
        }
        visible.forEach(fav => grid.appendChild(renderCard(fav)));
    }

    function renderCard(fav) {
        const listing = fav.listing;
        const fullStars = Math.floor(listing.seller_rating || 0);
        let stars = '';
        for (let i = 0; i < 5; i++) {
            stars += `<span class="material-symbols-outlined" style="font-size:13px; font-variation-settings: 'FILL' ${i < fullStars ? 1 : 0}; color:#f59e0b;">star</span>`;
        }

        const image = listing.image
            ? `<img src="${listing.image}" alt="${escapeHtml(listing.name)}" style="width:100%; height:100%; object-fit:cover; display:block;">`
            : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); color:#9ca3af;">
                 <span class="material-symbols-outlined" style="font-size:56px;">photo_library</span>
               </div>`;

        const distance = listing.distance_km != null
            ? `${listing.distance_km.toFixed(1)} km`
            : (listing.distance || '—');

        const canOrder = listing.status === 'Active' && listing.inventoryCurrent > 0;
        const ownerInitial = (listing.seller_name || '?').charAt(0).toUpperCase();

        const article = document.createElement('article');
        article.className = 'fav-card';
        article.dataset.favoriteId = fav.id;
        article.style.cssText = `
            background:#fff;
            border-radius:16px;
            overflow:hidden;
            border:1px solid rgba(0,0,0,0.06);
            box-shadow:0 1px 3px rgba(0,0,0,0.04);
            display:flex;
            flex-direction:column;
            transition:transform 0.2s ease, box-shadow 0.2s ease;
        `;
        article.onmouseenter = () => {
            article.style.transform = 'translateY(-4px)';
            article.style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)';
        };
        article.onmouseleave = () => {
            article.style.transform = '';
            article.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
        };

        article.innerHTML = `
            <!-- Media -->
            <div style="position:relative; aspect-ratio:16/10; overflow:hidden;">
                ${image}
                <!-- Top-left badges -->
                <div style="position:absolute; top:0.6rem; left:0.6rem; display:flex; flex-direction:column; gap:0.35rem; align-items:flex-start;">
                    ${listing.expiring
                        ? `<span style="background:rgba(245,158,11,0.95); color:#fff; font-size:0.65rem; font-weight:700; padding:0.25rem 0.55rem; border-radius:999px; display:inline-flex; align-items:center; gap:0.25rem; box-shadow:0 2px 6px rgba(0,0,0,0.12);">
                             <span class="material-symbols-outlined" style="font-size:0.85rem;">schedule</span>
                             Expiring soon
                           </span>`
                        : ''}
                    ${listing.status && listing.status !== 'Active'
                        ? `<span style="background:rgba(17,24,39,0.85); color:#fff; font-size:0.65rem; font-weight:700; padding:0.25rem 0.55rem; border-radius:999px; backdrop-filter:blur(4px);">
                             ${listing.status}
                           </span>`
                        : ''}
                </div>
                <!-- Heart (top-right) -->
                <button class="fav-card__delete-btn" data-favorite-id="${fav.id}" data-listing-id="${listing.id}" title="Remove from favorites"
                        style="position:absolute; top:0.6rem; right:0.6rem; background:#fff; border:none; border-radius:50%; width:36px; height:36px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.15); transition:transform 0.15s ease;"
                        onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform=''">
                    <span class="material-symbols-outlined" style="font-size:1.15rem; color:#ef4444; font-variation-settings: 'FILL' 1;">favorite</span>
                </button>
            </div>

            <!-- Body -->
            <div style="padding:1rem 1.1rem 1.1rem 1.1rem; display:flex; flex-direction:column; gap:0.6rem; flex:1;">
                <!-- Title + Price -->
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.75rem;">
                    <h3 style="margin:0; font-size:1.05rem; font-weight:700; color:#111827; line-height:1.3;">${escapeHtml(listing.name)}</h3>
                    <span style="color:#10b981; font-weight:800; font-size:1rem; white-space:nowrap;">${listing.price}</span>
                </div>

                <!-- Meta row: qty · location · expiry -->
                <div style="display:flex; flex-wrap:wrap; gap:0.4rem; font-size:0.72rem; color:#6b7280;">
                    <span style="display:inline-flex; align-items:center; gap:0.25rem; background:#f3f4f6; padding:0.2rem 0.5rem; border-radius:6px;">
                        <span class="material-symbols-outlined" style="font-size:0.85rem;">inventory_2</span>
                        ${listing.quantity} ${listing.unit}
                    </span>
                    <span style="display:inline-flex; align-items:center; gap:0.25rem; background:rgba(16,185,129,0.1); color:#047857; padding:0.2rem 0.5rem; border-radius:6px; font-weight:600;">
                        <span class="material-symbols-outlined" style="font-size:0.85rem;">location_on</span>
                        ${escapeHtml(distance)}
                    </span>
                    <span style="display:inline-flex; align-items:center; gap:0.25rem; background:#f3f4f6; padding:0.2rem 0.5rem; border-radius:6px;">
                        <span class="material-symbols-outlined" style="font-size:0.85rem;">event</span>
                        ${listing.expiryDays || 0}d
                    </span>
                </div>

                <!-- Seller -->
                <div style="display:flex; align-items:center; gap:0.55rem; padding:0.45rem 0; border-top:1px solid #f3f4f6; border-bottom:1px solid #f3f4f6;">
                    <div style="width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,#10b981,#059669); color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:700; flex-shrink:0;">
                        ${ownerInitial}
                    </div>
                    <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
                        <span style="font-size:0.8rem; font-weight:600; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(listing.seller_name || 'Unknown')}</span>
                        <div style="display:flex; align-items:center; gap:0.2rem;">
                            ${stars}
                            <span style="font-size:0.7rem; color:#9ca3af; margin-left:0.2rem;">(${listing.seller_reviews || 0})</span>
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div style="display:flex; gap:0.5rem; margin-top:auto;">
                    <button class="btn-view-detail" data-listing-id="${listing.id}"
                            style="flex:1; padding:0.6rem; border:1px solid #e5e7eb; background:#fff; color:#111827; border-radius:8px; cursor:pointer; font-size:0.82rem; font-weight:600; transition:all 0.15s ease;"
                            onmouseover="this.style.background='#f9fafb'; this.style.borderColor='#d1d5db';"
                            onmouseout="this.style.background='#fff'; this.style.borderColor='#e5e7eb';">
                        View Details
                    </button>
                    <button class="btn-order" data-listing-id="${listing.id}"
                            ${canOrder ? '' : 'disabled'}
                            style="flex:1; padding:0.6rem; border:none; background:${canOrder ? '#10b981' : '#cbd5e1'}; color:#fff; border-radius:8px; cursor:${canOrder ? 'pointer' : 'not-allowed'}; font-size:0.82rem; font-weight:600; display:inline-flex; align-items:center; justify-content:center; gap:0.3rem; transition:filter 0.15s ease;"
                            ${canOrder ? `onmouseover="this.style.filter='brightness(1.08)'" onmouseout="this.style.filter=''"` : ''}>
                        <span class="material-symbols-outlined" style="font-size:1rem;">shopping_cart</span>
                        Order
                    </button>
                </div>
            </div>
        `;
        return article;
    }

    function showEmpty() {
        grid.style.cssText = 'display:flex; justify-content:center; align-items:center; min-height:400px; text-align:center;';
        grid.innerHTML = `
            <div>
                <span class="material-symbols-outlined" style="font-size:4rem; color:#ddd;">favorite</span>
                <h3 style="margin:1rem 0 0.5rem 0; color:#555;">No favorites yet</h3>
                <p style="color:#888; margin-bottom:1.5rem;">Save listings from the marketplace to find them again easily.</p>
                <a href="browse-dash.html" class="btn-primary" style="display:inline-block;">Browse Marketplace</a>
            </div>`;
    }

    // Update the FAB label with the current count
    function updateFooterCount(visible, total) {
        const fabLabel = document.querySelector('.favorites-fab__label');
        if (fabLabel) {
            fabLabel.textContent = total === 0
                ? 'No items saved'
                : visible === total
                    ? `${total} item${total !== 1 ? 's' : ''} saved`
                    : `${visible} of ${total} shown`;
        }
    }

    // ─── Event delegation: card actions ────────────────
    grid.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.fav-card__delete-btn');
        const viewBtn = e.target.closest('.btn-view-detail');
        const orderBtn = e.target.closest('.btn-order');

        if (deleteBtn) {
            const favId = deleteBtn.dataset.favoriteId;
            const ok = await uiConfirm({
                title: 'Remove from favorites?',
                message: 'You can re-add it later by clicking the heart on the listing card.',
                confirmText: 'Remove',
                cancelText: 'Keep',
                danger: true,
            });
            if (!ok) return;
            const card = deleteBtn.closest('.fav-card');
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            const success = await removeFavorite(favId);
            setTimeout(async () => {
                if (success) await loadFavorites();
                else { card.style.opacity = '1'; card.style.transform = ''; }
            }, 300);
            return;
        }

        if (viewBtn) {
            window.location.href = `listing-detail.html?id=${viewBtn.dataset.listingId}`;
            return;
        }

        if (orderBtn && !orderBtn.disabled) {
            const listingId = parseInt(orderBtn.dataset.listingId);
            const qty = await uiPrompt({
                title: 'Place order',
                message: 'How many units would you like?',
                inputType: 'number',
                defaultValue: '1',
                min: '1',
                confirmText: 'Order',
            });
            if (!qty) return;
            try {
                await createOrderApi({ listing_id: listingId, quantity: parseInt(qty) });
                await uiAlert({
                    type: 'success',
                    title: 'Order placed',
                    message: 'Find it on My Purchases — pending seller approval.',
                });
            } catch (err) {
                const fields = err?.error?.fields || {};
                const msg = Object.values(fields).flat().join('\n')
                    || err?.error?.message || 'Please try again.';
                await uiAlert({ type: 'error', title: 'Order failed', message: msg });
            }
        }
    });

    // ─── Header search (filter favorites by listing/seller name) ─
    const headerSearch = document.querySelector('.favorites-search__input');
    let headerSearchDebounce = null;
    headerSearch?.addEventListener('input', () => {
        searchQuery = headerSearch.value.trim();
        clearTimeout(headerSearchDebounce);
        headerSearchDebounce = setTimeout(renderGrid, 200);
    });

    // ─── Sort buttons ─────────────────────────────────
    const sortBtns = document.querySelectorAll('.favorites-sort__btn, .favorites-sort__secondary');
    const sortMap = {
        'Newest First': 'newest',
        'Price': 'price-asc',     // first click → low → high
        'Distance': 'distance',
    };
    sortBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const label = btn.textContent.trim().split('\n')[0].trim();
            // Special: clicking Price again toggles asc/desc
            if (label.startsWith('Price') && sortBy === 'price-asc') {
                sortBy = 'price-desc';
            } else {
                sortBy = sortMap[label] || 'newest';
            }
            // Visual active state
            sortBtns.forEach(b => {
                b.classList.remove('favorites-sort__btn--active');
                b.classList.add('favorites-sort__secondary');
            });
            btn.classList.remove('favorites-sort__secondary');
            btn.classList.add('favorites-sort__btn--active');
            // Reflect direction in label
            if (label.startsWith('Price')) {
                btn.innerHTML = `Price ${sortBy === 'price-asc' ? '↑' : '↓'} <span class="material-symbols-outlined">expand_more</span>`;
            }
            renderGrid();
        });
    });

    // ─── FAB: compare placeholder → quick info modal ───
    const fabBtn = document.querySelector('.favorites-fab__btn');
    fabBtn?.addEventListener('click', async () => {
        if (favorites.length === 0) {
            await uiAlert({ type: 'info', message: 'You don\'t have any favorites yet.' });
            return;
        }
        // Build a compact comparison table
        const rows = favorites.map(f => `
            <tr>
                <td style="padding:0.4rem; border-bottom:1px solid #eee;">${escapeHtml(f.listing.name)}</td>
                <td style="padding:0.4rem; border-bottom:1px solid #eee; text-align:right; font-weight:700;">${f.listing.price}</td>
                <td style="padding:0.4rem; border-bottom:1px solid #eee; text-align:right;">${f.listing.quantity} ${f.listing.unit}</td>
            </tr>`).join('');
        const overlay = document.createElement('div');
        overlay.className = 'ui-modal__overlay';
        overlay.innerHTML = `
            <div class="ui-modal" style="width:520px; max-width:92vw;">
                <h3 class="ui-modal__title">Compare ${favorites.length} saved items</h3>
                <div style="max-height:50vh; overflow-y:auto; margin-bottom:1rem;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                        <thead><tr style="background:#f8f9fa;">
                            <th style="padding:0.5rem; text-align:left;">Product</th>
                            <th style="padding:0.5rem; text-align:right;">Price</th>
                            <th style="padding:0.5rem; text-align:right;">Stock</th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div class="ui-modal__actions">
                    <button class="ui-modal__btn ui-modal__btn--primary" data-action="close">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('[data-action="close"]').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    });

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    await loadFavorites();
});
