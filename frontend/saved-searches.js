/**
 * SAVED SEARCHES (Phase 5: live API)
 */

document.addEventListener('DOMContentLoaded', async () => {
    const registryContainer = document.getElementById('saved-searches-container');
    if (!registryContainer) return;

    let searches = [];
    let nameFilter = '';

    async function load() {
        const userJson = localStorage.getItem('user');
        const accessToken = localStorage.getItem('access_token');
        console.log('[SavedSearches] logged-in user:', userJson ? JSON.parse(userJson).email : '(none)');
        console.log('[SavedSearches] has access_token:', !!accessToken);

        // Make the API call directly so we can see what's happening
        try {
            const res = await fetch('http://127.0.0.1:8000/api/searches/', {
                headers: accessToken
                    ? { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
                    : { 'Content-Type': 'application/json' },
            });
            console.log('[SavedSearches] GET /api/searches/ →', res.status);
            const body = await res.json();
            console.log('[SavedSearches] response body:', body);
            searches = Array.isArray(body.data) ? body.data : [];
        } catch (e) {
            console.error('[SavedSearches] fetch error:', e);
            searches = [];
        }
        render();
    }

    function getVisible() {
        if (!nameFilter) return searches;
        const q = nameFilter.toLowerCase();
        return searches.filter(s => (s.name || '').toLowerCase().includes(q));
    }

    function render() {
        registryContainer.innerHTML = '';
        const visible = getVisible();
        if (!visible.length) {
            if (!searches.length) {
                registryContainer.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:3rem; color:#888;">
                        <span class="material-symbols-outlined" style="font-size:3rem; color:#ddd;">bookmark</span>
                        <h3 style="margin:1rem 0 0.5rem 0; color:#555;">No saved searches yet</h3>
                        <p>Save a filter combination from the marketplace to revisit it later.</p>
                        <a href="browse-dash.html" class="btn-primary" style="display:inline-block; margin-top:1rem;">Browse Marketplace</a>
                    </div>`;
            } else {
                registryContainer.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:2rem; color:#888;">
                        No saved searches match "${escapeHtml(nameFilter)}".
                    </div>`;
            }
            return;
        }
        visible.forEach(s => registryContainer.appendChild(renderCard(s)));
    }

    // ─── "Create New Saved Search" button → styled creation modal ──
    const createBtn = document.getElementById('btn-create-saved-search');
    if (createBtn) {
        createBtn.addEventListener('click', () => openCreateModal());
    }

    function openCreateModal() {
        const overlay = document.createElement('div');
        overlay.className = 'ui-modal__overlay';
        overlay.innerHTML = `
            <div class="ui-modal" style="width:440px; max-width:92vw;">
                <div class="ui-modal__icon ui-modal__icon--info">
                    <span class="material-symbols-outlined">bookmark_add</span>
                </div>
                <h3 class="ui-modal__title">New Saved Search</h3>
                <p class="ui-modal__message" style="text-align:left; margin-bottom:1rem;">Save a filter combination to revisit it later. All fields except <strong>Name</strong> are optional.</p>

                <label style="font-size:0.75rem; font-weight:600; display:block; margin-bottom:0.25rem;">Name</label>
                <input id="cs-name" class="ui-modal__input" type="text" placeholder="e.g. Bakery near me under 50 JOD" maxlength="120" style="margin-bottom:0.75rem;">

                <label style="font-size:0.75rem; font-weight:600; display:block; margin-bottom:0.25rem;">Keyword</label>
                <input id="cs-search" class="ui-modal__input" type="text" placeholder="coffee, flour…" style="margin-bottom:0.75rem;">

                <label style="font-size:0.75rem; font-weight:600; display:block; margin-bottom:0.25rem;">Category</label>
                <select id="cs-category" class="ui-modal__input" style="margin-bottom:0.75rem;">
                    <option value="">Any category</option>
                    <option>Fresh Produce</option>
                    <option>Dairy &amp; Eggs</option>
                    <option>Meat &amp; Seafood</option>
                    <option>Bakery &amp; Pastry</option>
                    <option>Dry Goods &amp; Pantry</option>
                    <option>Beverages</option>
                    <option>Packaging &amp; Disposables</option>
                    <option>Kitchen Equipment</option>
                    <option>Tableware &amp; Glassware</option>
                    <option>Cleaning &amp; Hygiene</option>
                </select>

                <div style="display:flex; gap:0.5rem; margin-bottom:0.75rem;">
                    <div style="flex:1;">
                        <label style="font-size:0.75rem; font-weight:600; display:block; margin-bottom:0.25rem;">Min price (JOD)</label>
                        <input id="cs-price-min" class="ui-modal__input" type="number" min="0" placeholder="0">
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:0.75rem; font-weight:600; display:block; margin-bottom:0.25rem;">Max price (JOD)</label>
                        <input id="cs-price-max" class="ui-modal__input" type="number" min="0" placeholder="∞">
                    </div>
                </div>

                <label style="font-size:0.75rem; font-weight:600; display:block; margin-bottom:0.25rem;">Expiring within</label>
                <select id="cs-expiry" class="ui-modal__input" style="margin-bottom:1.25rem;">
                    <option value="">Anytime</option>
                    <option value="1">Next 24 hours</option>
                    <option value="3">Next 3 days</option>
                    <option value="7">Next 7 days</option>
                    <option value="30">Next 30 days</option>
                </select>

                <div class="ui-modal__actions">
                    <button class="ui-modal__btn ui-modal__btn--cancel" data-action="cancel">Cancel</button>
                    <button class="ui-modal__btn ui-modal__btn--primary" data-action="save">Save</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

        overlay.querySelector('[data-action="save"]').addEventListener('click', async () => {
            const name = overlay.querySelector('#cs-name').value.trim();
            if (!name) {
                await uiAlert({ type: 'warning', message: 'Please give your saved search a name.' });
                return;
            }
            const payload = {
                name,
                search: overlay.querySelector('#cs-search').value.trim(),
                category: overlay.querySelector('#cs-category').value || '',
                price_min: overlay.querySelector('#cs-price-min').value || null,
                price_max: overlay.querySelector('#cs-price-max').value || null,
                expiry_days: parseInt(overlay.querySelector('#cs-expiry').value) || null,
                notify_email: false,
            };
            try {
                await createSavedSearch(payload);
                close();
                await load();
                await uiAlert({
                    type: 'success',
                    title: 'Saved',
                    message: `"${name}" has been added to your list.`,
                });
            } catch (err) {
                await uiAlert({
                    type: 'error',
                    title: 'Could not save',
                    message: err?.error?.message || 'Please try again.',
                });
            }
        });

        // Auto-focus the name field
        setTimeout(() => overlay.querySelector('#cs-name').focus(), 50);
    }

    // Wire the page-header search box to filter saved-searches by name (debounced)
    const headerSearch = document.querySelector('.favorites-search__input');
    let headerSearchDebounce = null;
    headerSearch?.addEventListener('input', () => {
        nameFilter = headerSearch.value.trim();
        clearTimeout(headerSearchDebounce);
        headerSearchDebounce = setTimeout(render, 200);
    });

    function renderCard(s) {
        const tags = [];
        if (s.search) tags.push({ icon: 'search', text: `"${s.search}"` });
        if (s.category) tags.push({ icon: 'category', text: s.category });
        if (s.price_min || s.price_max) {
            const range = `${s.price_min ?? '0'}–${s.price_max ?? '∞'} JOD`;
            tags.push({ icon: 'payments', text: range });
        }
        if (s.expiry_days) tags.push({ icon: 'schedule', text: `Within ${s.expiry_days} days` });
        if (s.radius_km) tags.push({ icon: 'distance', text: `< ${s.radius_km} km` });

        const tagsHtml = tags.map(t =>
            `<span class="registry-tag"><span class="material-symbols-outlined">${t.icon}</span> ${escapeHtml(t.text)}</span>`
        ).join('');

        const lastRun = s.last_run_at
            ? `Last run ${timeAgo(s.last_run_at)}`
            : 'Never run yet';

        const article = document.createElement('article');
        article.className = 'registry-card';
        article.dataset.searchId = s.id;
        article.innerHTML = `
            <div class="registry-card__indicator registry-card__indicator--gray"></div>
            <div class="registry-card__body">
                <div class="registry-card__main">
                    <div class="registry-card__header-row">
                        <div class="registry-card__title-group" style="display:flex; align-items:center; gap:0.4rem;">
                            <h3 class="registry-card__title" style="margin:0;">${escapeHtml(s.name || 'Untitled search')}</h3>
                            <button class="btn-rename" data-search-id="${s.id}" title="Rename"
                                    style="background:transparent; border:none; color:#888; cursor:pointer; padding:0.15rem; line-height:0;">
                                <span class="material-symbols-outlined" style="font-size:0.95rem;">edit</span>
                            </button>
                        </div>
                        <div class="registry-card__actions" style="display:flex; gap:0.5rem; align-items:center;">
                            <button class="btn-run" data-search-id="${s.id}"
                                    style="background:#10b981; color:#fff; border:none; border-radius:6px; padding:0.4rem 0.8rem; cursor:pointer; font-size:0.8rem;">
                                <span class="material-symbols-outlined" style="font-size:1rem; vertical-align:middle;">play_arrow</span> Run
                            </button>
                            <button class="btn-delete" data-search-id="${s.id}"
                                    style="background:transparent; border:1px solid #fecaca; color:#b91c1c; border-radius:6px; padding:0.4rem 0.6rem; cursor:pointer; font-size:0.8rem;">
                                <span class="material-symbols-outlined" style="font-size:1rem; vertical-align:middle;">delete</span>
                            </button>
                        </div>
                    </div>
                    <div class="registry-tags" style="display:flex; flex-wrap:wrap; gap:0.4rem; margin:0.75rem 0;">
                        ${tagsHtml || '<span style="color:#aaa; font-size:0.8rem;">No filters set</span>'}
                    </div>
                    <div style="font-size:0.75rem; color:#888;">${lastRun}</div>
                </div>
            </div>
        `;
        return article;
    }

    registryContainer.addEventListener('click', async (e) => {
        const runBtn = e.target.closest('.btn-run');
        const delBtn = e.target.closest('.btn-delete');
        const renameBtn = e.target.closest('.btn-rename');

        if (runBtn) {
            const id = runBtn.dataset.searchId;
            sessionStorage.setItem('run_saved_search_id', id);
            window.location.href = `browse-dash.html?run_search=${id}`;
            return;
        }

        if (renameBtn) {
            const id = renameBtn.dataset.searchId;
            const saved = searches.find(s => String(s.id) === String(id));
            const newName = await uiPrompt({
                title: 'Rename saved search',
                message: 'Give this search a clearer name.',
                inputType: 'text',
                defaultValue: saved?.name || '',
                confirmText: 'Rename',
            });
            if (newName === null) return;
            try {
                await updateSavedSearch(id, { name: newName.trim() || 'Untitled search' });
                await load();
            } catch (err) {
                await uiAlert({ type: 'error', title: 'Rename failed', message: err?.error?.message || 'Please try again.' });
            }
            return;
        }

        if (delBtn) {
            const id = delBtn.dataset.searchId;
            const ok = await uiConfirm({
                title: 'Delete saved search?',
                message: 'This will permanently remove this search.',
                confirmText: 'Delete',
                cancelText: 'Keep',
                danger: true,
            });
            if (!ok) return;
            const success = await deleteSavedSearch(id);
            if (success) await load();
            else await uiAlert({ type: 'error', message: 'Could not delete.' });
        }
    });

    // (Notify-me toggle removed — only Run / Rename / Delete remain)

    function timeAgo(iso) {
        const diff = (Date.now() - new Date(iso).getTime()) / 1000;
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
        return new Date(iso).toLocaleDateString([], { month:'short', day:'numeric' });
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    await load();
});
