/**
 * ALL LISTINGS - Management Logic
 * Seller's own listings, fetched from the API.
 * Uses global uiConfirm()/uiAlert() from ui-modals.js (auto-loaded by app.js).
 */

// Backwards-compat alias — keep `confirmDialog` calls working
const confirmDialog = (opts) => uiConfirm(opts);

// 1. DATA STATE
let listings = [];

// State
let currentFilter = '';      // backend status filter — '' means all
let searchQuery = '';
let selectedIds = new Set();
let searchDebounceId = null;
let currentPage = 1;
let pagination = null;       // last response's pagination meta

// Advanced filter state (from the Filter panel)
let advFilters = {
    category: '',
    price_min: '',
    price_max: '',
    expiry_days: '',
    ordering: '-created_at',
};

const PAGE_SIZE = 4;

async function refreshData() {
    if (typeof getMyListings !== 'function') return;
    const params = { page: currentPage, page_size: PAGE_SIZE };
    if (currentFilter) params.status = currentFilter;
    if (searchQuery) params.search = searchQuery;
    if (advFilters.category) params.category = advFilters.category;
    if (advFilters.price_min !== '') params.price_min = advFilters.price_min;
    if (advFilters.price_max !== '') params.price_max = advFilters.price_max;
    if (advFilters.expiry_days) params.expiry_days = advFilters.expiry_days;
    if (advFilters.ordering) params.ordering = advFilters.ordering;

    const result = await getMyListings(params);
    listings = result.data;
    pagination = result.pagination;
    renderPagination();
}

function renderPagination() {
    const info = document.querySelector('.listings-pagination__info');
    const prevBtn = document.querySelector('.listings-pagination__btns .btn-page:first-child');
    const nextBtn = document.querySelector('.listings-pagination__btns .btn-page:last-child');

    if (!pagination) return;

    const { count, page, page_size, total_pages, next, previous } = pagination;
    const start = (page - 1) * page_size + 1;
    const end = Math.min(start + listings.length - 1, count);

    if (info) {
        if (count === 0) {
            info.innerHTML = 'No listings found';
        } else {
            info.innerHTML = `Showing <span>${start}-${end}</span> of ${count} listing${count !== 1 ? 's' : ''}`;
        }
    }
    if (prevBtn) prevBtn.disabled = !previous;
    if (nextBtn) nextBtn.disabled = !next;
    if (prevBtn) prevBtn.style.opacity = previous ? '1' : '0.4';
    if (nextBtn) nextBtn.style.opacity = next ? '1' : '0.4';
}

// Reset filters or search → return to page 1
function resetToFirstPage() {
    currentPage = 1;
}

// DOM References
let tableBody, searchInput, tabButtons, selectAllCheckbox, selectionCounter, bulkActionsBar;

// INITIALIZE
document.addEventListener('DOMContentLoaded', async () => {
    await refreshData();
    captureElements();
    if (tableBody) {
        setupListeners();
        setupFilterPanel();   // ← wires up the Filter button + dropdown
        renderTable();
        updateStats();
    }
});

// ─── Advanced Filter Panel ────────────────────────────────
async function setupFilterPanel() {
    const toggleBtn = document.getElementById('filter-toggle-btn');
    const panel = document.getElementById('filter-panel');
    const catSelect = document.getElementById('filter-category');
    const priceMin = document.getElementById('filter-price-min');
    const priceMax = document.getElementById('filter-price-max');
    const expiry = document.getElementById('filter-expiry');
    const ordering = document.getElementById('filter-ordering');
    const applyBtn = document.getElementById('filter-apply-btn');
    const clearBtn = document.getElementById('filter-clear-btn');
    const saveBtn = document.getElementById('filter-save-btn');

    if (!toggleBtn || !panel) return;

    // Populate categories from API once
    if (catSelect && typeof getCategories === 'function') {
        const cats = await getCategories();
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            catSelect.appendChild(opt);
        });
    }

    // Toggle the panel
    toggleBtn.addEventListener('click', () => {
        panel.hidden = !panel.hidden;
    });

    // Close button inside the panel
    document.getElementById('filter-close-btn')?.addEventListener('click', () => {
        panel.hidden = true;
    });

    // Apply filters
    applyBtn?.addEventListener('click', () => {
        advFilters.category = catSelect?.value || '';
        advFilters.price_min = priceMin?.value || '';
        advFilters.price_max = priceMax?.value || '';
        advFilters.expiry_days = expiry?.value || '';
        advFilters.ordering = ordering?.value || '-created_at';
        panel.hidden = true;
        selectedIds.clear();
        resetToFirstPage();
        reloadFromApi();
    });

    // Save current filter as a SavedSearch
    saveBtn?.addEventListener('click', async () => {
        if (typeof createSavedSearch !== 'function') return;
        const name = await uiPrompt({
            title: 'Save this search',
            message: 'Give it a name so you can find it later.',
            inputType: 'text',
            placeholder: 'e.g. Cheap dairy near me',
            confirmText: 'Save',
        });
        if (name === null) return;

        // Read the current panel values directly (so seller doesn't have to click Apply first)
        const catLabel = catSelect?.selectedOptions?.[0]?.textContent?.trim();
        const payload = {
            name: name.trim() || 'Untitled search',
            search: searchQuery || '',
            category: (catLabel && catLabel !== 'All categories') ? catLabel : '',
            price_min: priceMin?.value || null,
            price_max: priceMax?.value || null,
            expiry_days: expiry?.value || null,
            notify_email: false,
        };
        try {
            await createSavedSearch(payload);
            await uiAlert({
                type: 'success',
                title: 'Search saved',
                message: 'Find it on the Saved Searches page anytime.',
            });
        } catch (err) {
            await uiAlert({
                type: 'error',
                title: 'Could not save',
                message: err?.error?.message || 'Please try again.',
            });
        }
    });

    // Clear filters
    clearBtn?.addEventListener('click', () => {
        if (catSelect) catSelect.value = '';
        if (priceMin) priceMin.value = '';
        if (priceMax) priceMax.value = '';
        if (expiry) expiry.value = '';
        if (ordering) ordering.value = '-created_at';
        advFilters = { category: '', price_min: '', price_max: '', expiry_days: '', ordering: '-created_at' };
        panel.hidden = true;
        selectedIds.clear();
        resetToFirstPage();
        reloadFromApi();
    });
}

function captureElements() {
    tableBody = document.getElementById('listings-table-body');
    searchInput = document.querySelector('.listings-search__input');
    tabButtons = document.querySelectorAll('.listings-tabs__btn');
    selectAllCheckbox = document.getElementById('select-all');
    selectionCounter = document.querySelector('.listings-bulk__count');
    bulkActionsBar = document.querySelector('.listings-bulk');
}

async function reloadFromApi() {
    await refreshData();
    renderTable();
    updateStats();
}

function setupListeners() {
    // Search — debounce 300ms so we don't spam the API on every keystroke
    searchInput?.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        clearTimeout(searchDebounceId);
        searchDebounceId = setTimeout(() => {
            selectedIds.clear();
            resetToFirstPage();
            reloadFromApi();
        }, 300);
    });

    // Tabs — uses data-status attribute to map UI label → backend status value
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const status = btn.dataset.status ?? '';
            // Toggle off if same tab is clicked again
            if (currentFilter === status && status !== '') {
                currentFilter = '';
                btn.classList.remove('listings-tabs__btn--active');
            } else {
                tabButtons.forEach(b => b.classList.remove('listings-tabs__btn--active'));
                btn.classList.add('listings-tabs__btn--active');
                currentFilter = status;
            }
            selectedIds.clear();
            resetToFirstPage();
            reloadFromApi();
        });
    });

    // Pagination — Previous / Next buttons
    const prevBtn = document.querySelector('.listings-pagination__btns .btn-page:first-child');
    const nextBtn = document.querySelector('.listings-pagination__btns .btn-page:last-child');

    prevBtn?.addEventListener('click', () => {
        if (pagination && pagination.previous && currentPage > 1) {
            currentPage -= 1;
            selectedIds.clear();
            reloadFromApi();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    nextBtn?.addEventListener('click', () => {
        if (pagination && pagination.next) {
            currentPage += 1;
            selectedIds.clear();
            reloadFromApi();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Select All
    selectAllCheckbox?.addEventListener('change', () => {
        const visible = getVisibleItems();
        if (selectAllCheckbox.checked) {
            visible.forEach(item => selectedIds.add(item.id));
        } else {
            visible.forEach(item => selectedIds.delete(item.id));
        }
        renderTable();
    });

    // Bulk Actions
    document.getElementById('bulk-delete')?.addEventListener('click', async () => {
        await handleBulkAction('delete');
    });

    document.getElementById('bulk-deactivate')?.addEventListener('click', async () => {
        await handleBulkAction('deactivate');
    });
}

function getVisibleItems() {
    // Backend already filtered by status + search; we just return the cached list.
    return listings;
}

function renderTable() {
    if (!tableBody) return;
    const data = getVisibleItems();
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 4rem; opacity: 0.5;">No items found</td></tr>`;
        updateBulkUI();
        return;
    }

    data.forEach(item => {
        const invPercent = item.inventoryTotal > 0
            ? (item.inventoryCurrent / item.inventoryTotal) * 100
            : 0;
        const colorClass = invPercent < 25 ? 'tertiary' : 'emerald';
        const isSelected = selectedIds.has(item.id);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="listings-product">
                    <input type="checkbox" class="row-check" ${isSelected ? 'checked' : ''}>
                    ${item.image
                        ? `<img src="${item.image}" class="listings-product__img" alt="${item.name}">`
                        : `<div class="listings-product__img listings-product__img--placeholder"><span class="material-symbols-outlined">image</span></div>`
                    }
                    <div class="listings-product__info">
                        <p title="${item.name}">${item.name}</p>
                        <span class="listings-product__sku">${item.sku}</span>
                    </div>
                </div>
            </td>
            <td>
                <div class="listings-inventory">
                    <div class="listings-inventory__label"><span>${item.inventoryCurrent}/${item.inventoryTotal} ${item.unit}</span></div>
                    <div class="listings-inventory__bar"><div class="listings-inventory__fill listings-inventory__fill--${colorClass}" style="width: ${invPercent}%"></div></div>
                </div>
            </td>
            <td style="font-weight: 700;">${item.price}</td>
            <td><span class="badge badge--${item.status.toLowerCase()}">${item.status}</span></td>
            <td>${(item.views || 0).toLocaleString()}</td>
            <td style="font-weight: 700; font-size: 0.75rem; color: ${item.expiryDays <= 5 && item.status !== 'Expired' ? 'var(--color-error)' : 'inherit'}">
                ${item.expiryDays || 0} Days
            </td>
            <td>
                <div class="listings-actions">
                    <button class="btn-icon action-edit" title="Edit Listing"><span class="material-symbols-outlined">edit</span></button>
                    <button class="btn-icon row-delete" data-id="${item.id}" title="Delete Listing"><span class="material-symbols-outlined">delete</span></button>
                </div>
            </td>
        `;

        tr.querySelector('.row-check').addEventListener('change', (e) => {
            if (e.target.checked) selectedIds.add(item.id);
            else selectedIds.delete(item.id);
            updateBulkUI();
        });

        tr.querySelector('.row-delete').addEventListener('click', async () => {
            const ok = await confirmDialog({
                title: 'Delete listing?',
                message: `"${item.name}" will be permanently removed. This action cannot be undone.`,
                confirmText: 'Delete',
                cancelText: 'Cancel',
            });
            if (!ok) return;
            try {
                await deleteListing(item.id);
                selectedIds.delete(item.id);
                await reloadFromApi();
            } catch (e) {
                alert('Failed to delete listing.');
            }
        });

        tr.querySelector('.action-edit').addEventListener('click', () => {
            // Pass the listing via sessionStorage (works regardless of dev-server URL rewriting)
            sessionStorage.setItem('edit_listing_id', String(item.id));
            sessionStorage.setItem('edit_listing_cache', JSON.stringify(item));
            window.location.href = `edit-listing.html?id=${item.id}`;
        });

        tableBody.appendChild(tr);
    });

    updateBulkUI();
}

function updateBulkUI() {
    if (!selectionCounter || !bulkActionsBar) return;
    const count = selectedIds.size;
    selectionCounter.textContent = `${count} item${count !== 1 ? 's' : ''} selected`;
    bulkActionsBar.style.display = count > 0 ? 'flex' : 'none';

    const visibleIds = getVisibleItems().map(i => i.id);
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
    }
}

async function handleBulkAction(action) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    if (action === 'delete') {
        const ok = await confirmDialog({
            title: `Delete ${ids.length} listing${ids.length !== 1 ? 's' : ''}?`,
            message: 'The selected listings will be permanently removed. This action cannot be undone.',
            confirmText: `Delete ${ids.length}`,
            cancelText: 'Cancel',
        });
        if (!ok) return;
        await Promise.all(ids.map(id => deleteListing(id)));
    } else if (action === 'deactivate') {
        await Promise.all(ids.map(id => updateListingStatus(id, 'Inactive')));
    }

    selectedIds.clear();
    await reloadFromApi();
}

// STATS CALCULATION — fetched from backend /api/listings/dashboard/metrics/
async function updateStats() {
    const totalListings = document.getElementById('stat-total-listings');
    const activeValue = document.getElementById('stat-active-value');
    const wasteRedirected = document.getElementById('stat-waste-redirected');
    const expiringSoon = document.getElementById('stat-expiring-soon');

    if (typeof getDashboardMetrics !== 'function') return;
    const metrics = await getDashboardMetrics();
    if (!metrics) return;

    if (totalListings) totalListings.textContent = metrics.total_listings ?? 0;
    if (activeValue) {
        const v = parseFloat(metrics.active_value) || 0;
        activeValue.textContent = v.toLocaleString(undefined, { minimumFractionDigits: 2 }) + ' JOD';
    }
    if (wasteRedirected) wasteRedirected.textContent = metrics.waste_redirected_display || '0 kg';
    if (expiringSoon) expiringSoon.textContent = metrics.expiring_soon ?? 0;
}
