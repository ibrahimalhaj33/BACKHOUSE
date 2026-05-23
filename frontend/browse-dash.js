document.addEventListener('DOMContentLoaded', async () => {

    const listingsGrid = document.querySelector('.listings-grid');

    // ─── Upgrade the static category checkboxes with real backend IDs ──
    // (The checkboxes are pre-rendered in HTML so they always appear.
    //  This optional fetch enriches them with category IDs for backend filtering.)
    try {
        const res = await fetch('http://127.0.0.1:8000/api/listings/categories/');
        const body = await res.json();
        const apiCats = body.data || [];
        const byName = {};
        apiCats.forEach(c => { byName[c.name.toLowerCase()] = c.id; });
        document.querySelectorAll('#filter-categories-list input[data-category-name]').forEach(cb => {
            const name = (cb.dataset.categoryName || '').toLowerCase();
            const id = byName[name];
            if (id) cb.dataset.categoryId = id;
        });
        console.log('[Browse] linked', Object.keys(byName).length, 'API categories to checkboxes');
    } catch (err) {
        console.warn('[Browse] could not link categories to API (backend offline?). UI still works.', err);
    }

    // Hydrate the set of currently-favorited listing IDs so cards render with the correct heart state
    let favoriteIds = new Set();
    if (typeof getFavoriteIds === 'function') {
        try { favoriteIds = await getFavoriteIds(); } catch (_) {}
    }

    // ─── Geolocation wiring ────────────────────────────────
    const locBtn       = document.getElementById('btn-use-location');
    const locStatus    = document.getElementById('location-status');
    const radiusBox    = document.getElementById('radius-control');
    const radiusInput  = document.getElementById('filter-radius');
    const radiusLabel  = document.getElementById('radius-display');
    const clearLocBtn  = document.getElementById('btn-clear-location');

    function updateLocationUI() {
        const stored = JSON.parse(sessionStorage.getItem('buyer_location') || 'null');
        if (stored) {
            if (locStatus) locStatus.innerHTML = `📍 Location set <span style="color:#10b981;">●</span> showing within radius`;
            if (radiusBox) radiusBox.hidden = false;
            if (locBtn) {
                locBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:1rem;">refresh</span> Update my location`;
            }
        } else {
            if (locStatus) locStatus.textContent = 'Click above to find listings nearby.';
            if (radiusBox) radiusBox.hidden = true;
            if (locBtn) {
                locBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:1rem;">my_location</span> Use my location`;
            }
        }
    }
    updateLocationUI();

    // Define the click handler ONCE and expose it globally so both the JS
    // addEventListener path and the inline onclick fallback can invoke it.
    window.__handleLocationClick = function (btn) {
        const b = btn || locBtn;
        if (!navigator.geolocation) {
            (window.uiAlert || alert)({ type: 'error', title: 'Not supported',
                message: 'Your browser does not support geolocation.' });
            return;
        }
        if (locStatus) locStatus.textContent = 'Detecting your location…';
        if (b) b.disabled = true;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                sessionStorage.setItem('buyer_location', JSON.stringify({ lat: latitude, lng: longitude }));
                updateLocationUI();
                if (b) b.disabled = false;
                currentPage = 1;
                renderGrid();
                if (typeof authFetch === 'function') {
                    authFetch('http://127.0.0.1:8000/api/auth/me/location/', {
                        method: 'POST',
                        body: JSON.stringify({ latitude, longitude }),
                    }).catch(() => {});
                }
            },
            (err) => {
                if (b) b.disabled = false;
                if (locStatus) locStatus.textContent = 'Could not detect location.';
                (window.uiAlert || alert)({
                    type: 'warning',
                    title: 'Location blocked',
                    message: 'Please allow location access in your browser to use radius search.',
                });
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
    };

    if (locBtn) {
        locBtn.addEventListener('click', () => window.__handleLocationClick(locBtn));
    }

    if (radiusInput && radiusLabel) {
        radiusInput.addEventListener('input', () => { radiusLabel.textContent = radiusInput.value; });
        radiusInput.addEventListener('change', () => { currentPage = 1; renderGrid(); });
    }

    if (clearLocBtn) {
        clearLocBtn.addEventListener('click', () => {
            sessionStorage.removeItem('buyer_location');
            updateLocationUI();
            currentPage = 1;
            renderGrid();
        });
    }

    function renderProductCard(product) {
        const fullStars = Math.floor(product.seller_rating || 0);
        let starsHTML = '';
        for (let i = 0; i < 5; i++) {
            const fill = i < fullStars ? 1 : 0;
            starsHTML += `<span class="material-symbols-outlined" style="font-size: 12px; font-variation-settings: 'FILL' ${fill};">star</span>`;
        }

        const imageHtml = product.image
            ? `<img alt="${product.name}" src="${product.image}">`
            : `<div class="card-image-placeholder"><span class="material-symbols-outlined">image</span></div>`;

        const isFav = favoriteIds.has(product.id);
        return `
            <article class="listing-card" data-product-id="${product.id}">
                <div class="card-image-wrap">
                    ${imageHtml}
                    ${product.expiring ? '<div class="card-badge"><span class="material-symbols-outlined" style="font-size: 14px;">timer</span> Expiring Soon</div>' : ''}
                    <button class="card-fav-btn glass-panel ${isFav ? 'card-fav-btn--active' : ''}" data-product-id="${product.id}">
                        <span class="material-symbols-outlined" style="font-size: 1.125rem; ${isFav ? "font-variation-settings: 'FILL' 1; color: #ef4444;" : ''}">favorite</span>
                    </button>
                </div>
                <div class="card-content">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <h3 class="card-title">${product.name}</h3>
                        <span class="card-price">${product.price}</span>
                    </div>
                    <div class="card-tags">
                        <span class="card-tag">Qty: ${product.quantity}</span>
                        <span class="card-tag card-tag-emerald">
                            <span class="material-symbols-outlined" style="font-size:0.85rem; vertical-align:-2px;">${product.distance_km != null ? 'location_on' : 'place'}</span>
                            ${product.distance_km != null ? product.distance_km.toFixed(1) + ' km' : product.distance}
                        </span>
                    </div>
                    <div class="card-seller">
                        <div class="seller-avatar">${product.seller_initials || '??'}</div>
                        <div>
                            <p class="seller-name">${product.seller_name}</p>
                            <div class="seller-rating">
                                ${starsHTML}
                                <span style="color: #605e61; margin-left: 4px;">(${product.seller_reviews})</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn-details">View Details</button>
                        <button class="btn-cart">
                            <span class="material-symbols-outlined">add_shopping_cart</span>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    function getFilterState() {
        const priceMin  = document.getElementById('filter-price-min');
        const priceMax  = document.getElementById('filter-price-max');
        const expirySel = document.getElementById('filter-expiry');
        const sortSel   = document.getElementById('filter-sort');
        const radiusEl  = document.getElementById('filter-radius');
        const searchInput = document.querySelector('.browse-header__search-bar input');

        const categoryNames = [];
        document.querySelectorAll('#filter-categories-list input[type="checkbox"]:checked').forEach(cb => {
            const name = cb.dataset.categoryName;
            if (name) categoryNames.push(name);
        });

        const loc = JSON.parse(sessionStorage.getItem('buyer_location') || 'null');

        return {
            search_query: searchInput ? searchInput.value.trim() : '',
            categoryNames,
            price_min: priceMin?.value ? parseFloat(priceMin.value) : null,
            price_max: priceMax?.value ? parseFloat(priceMax.value) : null,
            expiry_days: expirySel?.value ? parseInt(expirySel.value) : null,
            ordering: sortSel?.value || '-created_at',
            urgent: document.getElementById('attr-urgent')?.checked || false,
            bulk:   document.getElementById('attr-bulk')?.checked || false,
            verified: document.getElementById('attr-verified')?.checked || false,
            // Geolocation (when buyer enabled location filter)
            lat: loc?.lat ?? null,
            lng: loc?.lng ?? null,
            radius_km: loc ? (radiusEl?.value ? parseInt(radiusEl.value) : 10) : null,
        };
    }

    // ─── Build name→id map from the rendered category checkboxes ─
    // (the actual fetch + render happened at the top of this handler)
    const categoriesByName = {};
    document.querySelectorAll('#filter-categories-list input[data-category-id]').forEach(cb => {
        const name = cb.dataset.categoryName;
        const id = cb.dataset.categoryId;
        if (name && id) categoriesByName[name.toLowerCase()] = parseInt(id);
    });

    // Build API-compatible params from current filter state
    function buildApiFilters() {
        const state = getFilterState();
        const params = {};
        if (state.search_query) params.search = state.search_query;
        if (state.price_min !== null && state.price_min >= 0) params.price_min = state.price_min;
        if (state.price_max !== null && state.price_max >= 0) params.price_max = state.price_max;
        if (state.expiry_days) params.expiry_days = state.expiry_days;
        if (state.ordering) params.ordering = state.ordering;

        // Category: first checked category (backend takes single id)
        if (state.categoryNames.length > 0) {
            const catId = categoriesByName[state.categoryNames[0].toLowerCase()];
            if (catId) params.category = catId;
        }

        // HORECA quick-filters
        if (state.urgent) params.urgent = true;
        if (state.bulk) params.min_quantity = 10;
        if (state.verified) params.verified = true;

        // Geolocation — buyer's coords + chosen radius
        if (state.lat !== null && state.lng !== null) {
            params.lat = state.lat;
            params.lng = state.lng;
            if (state.radius_km) params.radius_km = state.radius_km;
        }

        return params;
    }

    // --- SAVE SEARCH BUTTON (real API) ---
    const saveSearchBtn = document.querySelector('.save-search-btn');
    if (saveSearchBtn) {
        saveSearchBtn.addEventListener('click', async () => {
            const state = getFilterState();
            const name = await uiPrompt({
                title: 'Save this search',
                message: 'Give it a name so you can find it later on the Saved Searches page.',
                placeholder: 'e.g. Local produce near me',
                confirmText: 'Save',
            });
            if (name === null) return;
            try {
                await createSavedSearch({
                    name: name.trim() || 'Untitled search',
                    search: state.search_query || '',
                    category: state.categoryNames[0] || '',
                    price_min: state.price_min || null,
                    price_max: state.price_max || null,
                    expiry_days: state.expiry_days || null,
                    radius_km: state.radius_km || null,
                    notify_email: false,
                });
                await uiAlert({
                    type: 'success',
                    title: 'Search saved',
                    message: 'You can find it on the Saved Searches page anytime.',
                });
            } catch (err) {
                await uiAlert({
                    type: 'error',
                    title: 'Could not save',
                    message: err?.error?.message || 'Please try again.',
                });
            }
        });
    }

    // --- LIVE FILTER: any change resets to page 1 and re-fetches ---
    document.querySelector('.filters-sidebar')?.addEventListener('change', () => {
        currentPage = 1;
        renderGrid();
    });

    // Filter Reset
    const resetButton = document.querySelector('.filters-sidebar-header button');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            // Reset checkboxes, number inputs, and select dropdowns
            document.querySelectorAll('.filter-group input[type="checkbox"]').forEach(cb => cb.checked = false);
            document.querySelectorAll('.filter-group input[type="number"]').forEach(input => input.value = '');
            document.querySelectorAll('.filter-group select').forEach(sel => { sel.selectedIndex = 0; });
            currentPage = 1;
            renderGrid();
        });
    }

    // ─── Live Search bar (debounced) ───────────────────────
    const searchInputEl = document.getElementById('marketplace-search');
    const searchClearBtn = document.getElementById('marketplace-search-clear');
    let searchDebounceId = null;

    const triggerSearch = () => {
        currentPage = 1;          // reset to first page on new search
        renderGrid();
    };

    const showClearBtn = () => {
        if (!searchClearBtn || !searchInputEl) return;
        searchClearBtn.hidden = !searchInputEl.value;
    };

    if (searchInputEl) {
        // Debounced live search: re-fetch 300ms after the user stops typing
        searchInputEl.addEventListener('input', () => {
            showClearBtn();
            clearTimeout(searchDebounceId);
            searchDebounceId = setTimeout(triggerSearch, 300);
        });
        // Instant search on Enter
        searchInputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(searchDebounceId);
                triggerSearch();
            }
        });
    }

    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            if (searchInputEl) {
                searchInputEl.value = '';
                searchInputEl.focus();
            }
            showClearBtn();
            triggerSearch();
        });
    }

    // ─── Pagination state ────────────────────────────
    let currentPage = 1;
    const PAGE_SIZE = 9;

    // THE LOOP: renderGrid() — fetches from API with current filters
    async function renderGrid() {
        if (!listingsGrid) return;
        listingsGrid.innerHTML = '<p style="text-align:center;padding:3rem;opacity:0.5;">Loading listings...</p>';

        const apiFilters = buildApiFilters();
        apiFilters.page = currentPage;
        apiFilters.page_size = PAGE_SIZE;
        const listings = await getListings(apiFilters);

        listingsGrid.innerHTML = '';

        if (listings.length === 0) {
            listingsGrid.innerHTML = '<p style="text-align:center;padding:3rem;opacity:0.5;">No listings found.</p>';
            return;
        }

        listings.forEach(product => {
            listingsGrid.innerHTML += renderProductCard(product);
        });
        renderPagination(listings.pagination);
    }

    // Render pagination buttons from backend meta
    function renderPagination(pagination) {
        const container = document.getElementById('browse-pagination');
        if (!container) return;
        container.innerHTML = '';

        if (!pagination || pagination.total_pages <= 1) return;

        const { page, total_pages, next, previous } = pagination;

        const makeBtn = (html, disabled, onClick, active = false) => {
            const b = document.createElement('button');
            b.className = 'page-btn' + (active ? ' page-btn-active' : '');
            b.innerHTML = html;
            if (disabled) {
                b.disabled = true;
                b.style.opacity = '0.4';
                b.style.cursor = 'not-allowed';
            } else if (onClick) {
                b.addEventListener('click', onClick);
            }
            return b;
        };

        // Prev
        container.appendChild(makeBtn(
            `<span class="material-symbols-outlined" style="font-size: 1.25rem;">chevron_left</span>`,
            !previous,
            () => { currentPage = page - 1; renderGrid(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        ));

        // Build a compact page list: 1 … (p-1) p (p+1) … last
        const pages = new Set([1, total_pages, page, page - 1, page + 1]);
        const sorted = [...pages].filter(p => p >= 1 && p <= total_pages).sort((a, b) => a - b);

        let prevP = 0;
        sorted.forEach(p => {
            if (p - prevP > 1) {
                const dots = document.createElement('div');
                dots.style.color = '#7c7a7d';
                dots.textContent = '…';
                container.appendChild(dots);
            }
            container.appendChild(makeBtn(
                String(p),
                false,
                () => { currentPage = p; renderGrid(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
                p === page,
            ));
            prevP = p;
        });

        // Next
        container.appendChild(makeBtn(
            `<span class="material-symbols-outlined" style="font-size: 1.25rem;">chevron_right</span>`,
            !next,
            () => { currentPage = page + 1; renderGrid(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        ));
    }

    // (Filter-change handler is registered above — currentPage reset + renderGrid)

    // ─── Apply saved-search filters if arriving via ?run_search=X ─
    const urlSearchId = new URLSearchParams(window.location.search).get('run_search');
    if (urlSearchId && typeof getSavedSearches === 'function') {
        try {
            const list = await getSavedSearches();
            const saved = list.find(s => String(s.id) === String(urlSearchId));
            if (saved) {
                // Pre-fill sidebar inputs from saved search
                const sInput = document.querySelector('.browse-header__search-bar input');
                if (sInput && saved.search) sInput.value = saved.search;
                const pMin = document.getElementById('filter-price-min');
                const pMax = document.getElementById('filter-price-max');
                if (pMin && saved.price_min) pMin.value = saved.price_min;
                if (pMax && saved.price_max) pMax.value = saved.price_max;
                const expSel = document.getElementById('filter-expiry');
                if (expSel && saved.expiry_days) expSel.value = saved.expiry_days;
                // Pre-fill city if saved
                if (saved.city) {
                    const citySel = document.getElementById('filter-city');
                    if (citySel) citySel.value = saved.city;
                }
                // Check the matching category checkbox (by data-category-name)
                if (saved.category) {
                    document.querySelectorAll('#filter-categories-list input[type="checkbox"]').forEach(cb => {
                        if ((cb.dataset.categoryName || '').toLowerCase() === saved.category.toLowerCase()) {
                            cb.checked = true;
                        }
                    });
                }
            }
        } catch (_) {}
    }

    // Initial render
    renderGrid();

    // Highlight feature: ?highlight=listing_id
    const urlParams = new URLSearchParams(window.location.search);
    const highlightId = urlParams.get('highlight');
    if (highlightId) {
        setTimeout(() => {
            const targetCard = document.querySelector(`.listing-card[data-product-id="${highlightId}"]`);
            if (targetCard) {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetCard.classList.add('highlight-flash');
                setTimeout(() => targetCard.classList.remove('highlight-flash'), 4000);
            }
        }, 600);
    }

    // Favorite Toggles (Event Delegation)
    if (listingsGrid) {
        listingsGrid.addEventListener('click', async (e) => {
            const btn = e.target.closest('.card-fav-btn');
            if (!btn) return;
            e.preventDefault();
            const productId = parseInt(btn.getAttribute('data-product-id'));
            if (!productId || typeof toggleFavorite !== 'function') return;

            // Optimistic UI toggle
            const wasActive = btn.classList.contains('card-fav-btn--active');
            btn.classList.toggle('card-fav-btn--active', !wasActive);
            const icon = btn.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.style.fontVariationSettings = !wasActive ? "'FILL' 1" : "'FILL' 0";
                icon.style.color = !wasActive ? '#ef4444' : '';
            }

            try {
                const result = await toggleFavorite(productId);
                // Sync our local set
                if (result.favorited) favoriteIds.add(productId);
                else favoriteIds.delete(productId);
            } catch (err) {
                // Revert on failure
                btn.classList.toggle('card-fav-btn--active', wasActive);
                if (icon) {
                    icon.style.fontVariationSettings = wasActive ? "'FILL' 1" : "'FILL' 0";
                    icon.style.color = wasActive ? '#ef4444' : '';
                }
                showToast('Could not update favorite. Please log in.', 'error');
            }
        });

        // View Details → listing-detail page
        listingsGrid.addEventListener('click', (e) => {
            const detailsBtn = e.target.closest('.btn-details');
            if (!detailsBtn) return;
            e.preventDefault();
            const card = detailsBtn.closest('.listing-card');
            const productId = card?.getAttribute('data-product-id');
            if (productId) window.location.href = `listing-detail.html?id=${productId}`;
        });

        // Whole-card click (image area) also opens details — but skip when clicking interactive controls
        listingsGrid.addEventListener('click', (e) => {
            if (e.target.closest('.btn-cart, .btn-details, .card-fav-btn')) return;
            const card = e.target.closest('.listing-card');
            if (!card) return;
            // Only fire on image clicks
            if (!e.target.closest('.card-image-wrap')) return;
            const productId = card.getAttribute('data-product-id');
            if (productId) window.location.href = `listing-detail.html?id=${productId}`;
        });

        // Add to Cart
        listingsGrid.addEventListener('click', async (e) => {
            const btnCart = e.target.closest('.btn-cart');
            if (!btnCart) return;
            e.preventDefault();

            const card = btnCart.closest('.listing-card');
            if (!card) return;
            const productId = card.getAttribute('data-product-id');

            const product = await getListingById(productId);
            if (!product) return;

            // Front-end gate: don't even send the request if obviously unavailable
            if (product.status && product.status !== 'Active') {
                showToast(`This listing is ${product.status.toLowerCase()} — cannot order.`, 'error');
                return;
            }
            if (product.inventoryCurrent <= 0) {
                showToast('This product is sold out.', 'error');
                return;
            }

            try {
                const newOrder = await createOrderApi({
                    listing_id: product.id,
                    quantity: 1,
                });
                console.log('[Orders API] Order created:', newOrder);

                const originalIcon = btnCart.innerHTML;
                btnCart.innerHTML = `<span class="material-symbols-outlined" style="color: #10b981;">check_circle</span>`;
                showToast(`Order placed for: ${product.name}`, 'success');
                setTimeout(() => { btnCart.innerHTML = originalIcon; }, 3000);
            } catch (err) {
                const msg = err?.error?.message
                    || (err?.error?.fields ? Object.values(err.error.fields).flat().join(' ') : '')
                    || 'Could not place order.';
                showToast(msg, 'error');
            }
        });
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        if (type === 'error') {
            toast.style.backgroundColor = 'var(--color-error-container)';
            toast.style.color = 'var(--color-error)';
            toast.innerHTML = `<span class="material-symbols-outlined">warning</span> ${message}`;
        } else {
            toast.innerHTML = `<span class="material-symbols-outlined" style="color: #10b981;">check_circle</span> ${message}`;
        }
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('toast--visible'), 10);
        setTimeout(() => {
            toast.classList.remove('toast--visible');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // Pagination is now handled by renderPagination() called from renderGrid().
});
