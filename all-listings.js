/**
 * ALL LISTINGS - Management Logic
 * Designed for easy backend integration.
 */

// 1. DATA STATE
// Now pulled from our central "Brain" (listings-data.js)
let listings = [];

function refreshData() {
    if (typeof getListings === 'function') {
        listings = getListings();
    }
}

// State
let currentFilter = null;
let searchQuery = '';
let selectedIds = new Set();

// DOM References
let tableBody, searchInput, tabButtons, selectAllCheckbox, selectionCounter, bulkActionsBar;

// INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    refreshData(); // Pull from brain
    captureElements();
    if (tableBody) {
        setupListeners();
        renderTable();
        updateStats(); 
    }
});

function captureElements() {
    tableBody = document.getElementById('listings-table-body');
    searchInput = document.querySelector('.listings-search__input');
    tabButtons = document.querySelectorAll('.listings-tabs__btn');
    selectAllCheckbox = document.getElementById('select-all');
    selectionCounter = document.querySelector('.listings-bulk__count');
    bulkActionsBar = document.querySelector('.listings-bulk');
}

function setupListeners() {
    // Search
    searchInput?.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderTable();
    });

    // Tabs
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.textContent.trim();
            if (currentFilter === val) {
                currentFilter = null;
                btn.classList.remove('listings-tabs__btn--active');
            } else {
                tabButtons.forEach(b => b.classList.remove('listings-tabs__btn--active'));
                btn.classList.add('listings-tabs__btn--active');
                currentFilter = val;
            }
            selectedIds.clear();
            renderTable();
        });
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
    document.getElementById('bulk-delete')?.addEventListener('click', () => {
        handleBulkAction('delete');
    });

    document.getElementById('bulk-deactivate')?.addEventListener('click', () => {
        handleBulkAction('deactivate');
    });
}

function getVisibleItems() {
    return listings.filter(item => {
        const matchesTab = currentFilter === null || item.status === currentFilter;
        const name = item.name || '';
        const sku = item.sku || '';
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             sku.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });
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
        const invPercent = (item.inventoryCurrent / item.inventoryTotal) * 100;
        const colorClass = invPercent < 25 ? 'tertiary' : 'emerald';
        const isSelected = selectedIds.has(item.id);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="listings-product">
                    <input type="checkbox" class="row-check" ${isSelected ? 'checked' : ''}>
                    <img src="${item.image}" class="listings-product__img">
                    <div class="listings-product__info">
                        <p>${item.name}</p>
                        <span class="listings-product__sku">SKU: ${item.sku}</span>
                    </div>
                </div>
            </td>
            <td>
                <div class="listings-inventory">
                    <div class="listings-inventory__label"><span>${item.inventoryCurrent}/${item.inventoryTotal} ${item.unit}</span></div>
                    <div class="listings-inventory__bar"><div class="listings-inventory__fill listings-inventory__fill--${colorClass}" style="width: ${invPercent}%"></div></div>
                </div>
            </td>
            <td style="font-weight: 700;">$${(item.numericPrice || 0).toFixed(2)}</td>
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

        tr.querySelector('.row-delete').addEventListener('click', () => {
            listings = listings.filter(l => l.id !== item.id);
            selectedIds.delete(item.id);
            renderTable();
            updateStats(); 
        });

        tr.querySelector('.action-edit').addEventListener('click', () => {
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

// STATS CALCULATION
function updateStats() {
    const totalListings = document.getElementById('stat-total-listings');
    const activeValue = document.getElementById('stat-active-value');
    const expiringSoon = document.getElementById('stat-expiring-soon');

    if (!totalListings || !activeValue || !expiringSoon) return;

    totalListings.textContent = listings.length;

    const totalValue = listings
        .filter(item => item.status === 'Active')
        .reduce((sum, item) => sum + (item.numericPrice || 0), 0);
    
    activeValue.textContent = `$${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    // EXPIRING SOON LOGIC:
    // 1. Must NOT be already 'Expired'
    // 2. Must have expiryDays <= 5
    const expiringCount = listings.filter(item => 
        item.status !== 'Expired' && item.expiryDays <= 5
    ).length;
    
    expiringSoon.textContent = expiringCount;
}
