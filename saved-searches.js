/**
 * SAVED SEARCHES - VANILLA JS INTERACTIVITY & BACKEND PROOFING
 */

document.addEventListener('DOMContentLoaded', () => {
    const registryContainer = document.getElementById('saved-searches-container');
    const searchInput = document.querySelector('.favorites-search__input');

    if (!registryContainer) return;

    /**
     * THE STAMP: renderSearchCard(search)
     * This turns a data object into the exact premium HTML design.
     * Fixed: Now uses the exact <article> and body structure from the design.
     */
    function renderSearchCard(search) {
        const indicatorColor = search.new_count > 0 ? 'amber' : 'gray';
        const chipClass = search.new_count > 0 ? 'status-chip--amber' : '';
        const alertClass = search.alerts_enabled ? 'registry-switch--active' : '';

        // Build tags HTML
        let tagsHTML = '';
        if (search.categories) {
            search.categories.forEach(cat => {
                tagsHTML += `<span class="registry-tag"><span class="material-symbols-outlined">bakery_dining</span> ${cat}</span>`;
            });
        }
        if (search.radius_km) {
            tagsHTML += `<span class="registry-tag"><span class="material-symbols-outlined">distance</span> < ${search.radius_km} km</span>`;
        }
        if (search.attributes) {
            search.attributes.forEach(attr => {
                const icon = attr.includes('Bulk') ? 'inventory' : 'schedule';
                tagsHTML += `<span class="registry-tag"><span class="material-symbols-outlined">${icon}</span> ${attr}</span>`;
            });
        }

        return `
            <article class="registry-card" data-search-id="${search.id}">
                <div class="registry-card__indicator registry-card__indicator--${indicatorColor}"></div>
                <div class="registry-card__body">
                    <div class="registry-card__main">
                        <div class="registry-card__header-row">
                            <div class="registry-card__title-group">
                                <h3 class="registry-card__title">${search.name}</h3>
                                <div class="status-chip ${chipClass}">
                                    ${search.new_count > 0 ? `<span class="material-symbols-outlined">bolt</span>` : ''}
                                    ${search.new_count} NEW
                                </div>
                            </div>
                            <div class="registry-card__alert-box">
                                <span class="registry-card__alert-label">ALERTS</span>
                                <div class="registry-switch ${alertClass} js-alert-toggle"></div>
                            </div>
                        </div>
                        <p class="registry-card__meta">Last run: ${search.last_run}</p>
                        
                        <div class="registry-card__tags">
                            ${tagsHTML}
                        </div>
                    </div>

                    <div class="registry-card__divider"></div>

                    <div class="registry-card__actions">
                        <button class="registry-card__icon-btn js-delete-search" aria-label="Delete">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                        <button class="registry-card__icon-btn js-edit-search" aria-label="Edit">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="registry-card__run-btn js-run-search">
                            Run Search
                            <span class="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    // Start the automation
    const mockSearches = [];

    function loadSavedSearches() {
        if (!registryContainer) return;
        registryContainer.innerHTML = ''; // Restored: Important for production
        mockSearches.forEach(data => {
            registryContainer.insertAdjacentHTML('beforeend', renderSearchCard(data));
        });
        checkEmptyState();
    }

    // --- BACKEND HANDOFF ---
    // Uncomment the line below to switch from Hardcoded HTML to Database-driven cards.
    // loadSavedSearches();

    // --- EVENT DELEGATION FOR CARD ACTIONS ---
    registryContainer.addEventListener('click', (e) => {
        const target = e.target;
        const card = target.closest('.registry-card');
        if (!card) return;

        const searchId = card.dataset.searchId;
        const title = card.querySelector('.registry-card__title').innerText;

        // 1. ALERT TOGGLES
        if (target.classList.contains('js-alert-toggle')) {
            const isActive = target.classList.toggle('registry-switch--active');
            console.log('>>> [BACKEND READY] TOGGLE_ALERT:', {
                id: searchId,
                status: isActive ? 'ENABLED' : 'DISABLED',
                time: new Date().toLocaleTimeString()
            });
        }

        // 2. RUN SEARCH BUTTON
        if (target.closest('.js-run-search')) {
            const btn = target.closest('.js-run-search');
            const originalContent = btn.innerHTML;

            btn.innerHTML = 'Running...';
            btn.style.opacity = '0.5';
            btn.disabled = true;

            console.log('>>> [BACKEND READY] RUN_SEARCH:', {
                id: searchId,
                title: title,
                tags: Array.from(card.querySelectorAll('.registry-tag')).map(t => t.innerText.trim())
            });

            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.style.opacity = '1';
                btn.disabled = false;

                // --- FRONTEND NAVIGATION ---
                // We redirect to the Marketplace and pass the Search ID in the URL.
                // The Marketplace JS will see this and tell the backend to filter results.
                window.location.href = `browse-dash.html?run_search=${searchId}`;
            }, 1000);
        }

        // 3. DELETE SEARCH (Inline Confirmation - Bulletproof)
        const deleteBtn = target.closest('.js-delete-search');
        if (deleteBtn) {
            if (!deleteBtn.dataset.confirming) {
                // First click: Enter "Confirming" state
                deleteBtn.dataset.confirming = "true";
                deleteBtn.dataset.originalHtml = deleteBtn.innerHTML;
                deleteBtn.innerHTML = '<span class="material-symbols-outlined" style="color: var(--color-error);">check</span>';
                deleteBtn.style.borderColor = 'var(--color-error)';

                console.log('>>> [UX LOG] User entered delete confirmation mode for:', searchId);

                // Auto-reset after 3 seconds if not clicked again
                setTimeout(() => {
                    if (deleteBtn.dataset.confirming) {
                        deleteBtn.innerHTML = deleteBtn.dataset.originalHtml;
                        deleteBtn.style.borderColor = '';
                        deleteBtn.removeAttribute('data-confirming');
                    }
                }, 3000);
            } else {
                // Second click: Actual Deletion
                console.log('>>> [BACKEND READY] DELETE_ENTRY:', {
                    id: searchId,
                    title: title
                });

                card.style.transition = 'all 0.4s ease';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.9)';

                setTimeout(() => {
                    card.remove();
                    checkEmptyState();
                }, 400);
            }
        }

        // 4. EDIT SEARCH
        if (target.closest('.js-edit-search')) {
            console.log('>>> [BACKEND READY] EDIT_REQUEST:', {
                id: searchId,
                current_title: title
            });
            alert('Edit Mode: (Logic ready for Backend Modal)');
        }
    });

    function checkEmptyState() {
        const remainingCards = registryContainer.querySelectorAll('.registry-card');
        if (remainingCards.length === 0) {
            registryContainer.innerHTML = `
                <div class="registry-empty-state" style="text-align: center; padding: 5rem 2rem; background: #f9f9f9; border-radius: 12px; border: 2px dashed #eee; grid-column: 1 / -1;">
                    <span class="material-symbols-outlined" style="font-size: 4rem; color: #ccc; margin-bottom: 1.5rem;">search_off</span>
                    <h3 style="font-family: var(--font-headline); font-size: 1.5rem; margin-bottom: 0.5rem;">No Saved Searches</h3>
                    <p style="color: #666; margin-bottom: 2rem;">Automate your sourcing by creating your first saved search.</p>
                    <button class="registry-cta" style="margin: 0 auto;" onclick="location.reload()">RELOAD DEMO</button>
                </div>
            `;
        }
    }

    // FILTERING
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            registryContainer.querySelectorAll('.registry-card').forEach(card => {
                const text = card.innerText.toLowerCase();
                card.style.display = text.includes(query) ? 'flex' : 'none';
            });
        });
    }

    // --- CREATE NEW SEARCH TRIGGER ---
    const createBtn = document.querySelector('.registry-cta');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            console.log('>>> [BACKEND READY] CREATE_WIZARD_REQUEST:', {
                action: 'open_modal',
                timestamp: new Date().toISOString()
            });
            alert('Opening "Create New Saved Search" Wizard...');
        });
    }
});
