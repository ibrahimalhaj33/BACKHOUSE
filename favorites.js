/* ═══════════════════════════════════════════════════════
   BackHouse — Favorites Page Interactivity
   Task: Item Deletion, Empty State, Sort Cycling (Backend Ready)
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.favorites-grid');
    const deleteButtons = document.querySelectorAll('.fav-card__delete, .fav-card__delete-btn');

    // ─── 1. The Deletion Mechanic ───────────────────────
    deleteButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            const productId = button.getAttribute('data-product-id') || 'unknown';
            const card = button.closest('.fav-card');
            
            if (card) {
                const payload = {
                    product_id: productId,
                    action: 'remove_from_favorites',
                    source: 'favorites_page'
                };
                console.log('>>> [BACKEND READY] REMOVE_FAVORITE:', payload);

                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                
                setTimeout(() => {
                    card.remove();
                    checkEmptyGrid();
                }, 300);
            }
        });
    });

    // ─── 2. Empty State Fallback ────────────────────────
    function checkEmptyGrid() {
        const remainingCards = grid.querySelectorAll('.fav-card');
        
        if (remainingCards.length === 0) {
            grid.innerHTML = '';
            grid.style.display = 'flex';
            grid.style.justifyContent = 'center';
            grid.style.alignItems = 'center';
            grid.style.minHeight = '400px';
            grid.style.textAlign = 'center';

            const emptyStateHTML = `
                <div class="favorites-empty-state" style="animation: fadeIn 0.5s ease forwards;">
                    <div class="empty-state__icon" style="margin-bottom: var(--space-lg);">
                        <span class="material-symbols-outlined" style="font-size: 4rem; color: var(--color-outline-variant); opacity: 0.5;">
                            shopping_cart_off
                        </span>
                    </div>
                    <p class="favorites-empty-text" style="font-family: var(--font-headline); font-size: 1.25rem; font-weight: 700; color: var(--color-secondary); margin-bottom: var(--space-xl);">
                        Your curated inventory is empty
                    </p>
                    <a href="browse-dash.html" class="fav-btn fav-btn--primary" style="text-decoration: none; display: inline-block;">
                        Browse Listings
                    </a>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', emptyStateHTML);
        }
    }

    // ─── 3. The Sort Cycling System (Backend Ready) ─────
    const sortContainer = document.querySelector('.favorites-sort__actions');
    
    if (sortContainer) {
        sortContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            // 1. Manage Active State (The Style Fix)
            sortContainer.querySelectorAll('button').forEach(b => {
                b.classList.remove('favorites-sort__btn', 'favorites-sort__btn--active');
                b.classList.add('favorites-sort__secondary');
                // Remove arrows from others
                const existingIcon = b.querySelector('.material-symbols-outlined');
                if (existingIcon) existingIcon.remove();
            });
            
            btn.classList.add('favorites-sort__btn', 'favorites-sort__btn--active');
            btn.classList.remove('favorites-sort__secondary');

            // 2. Cycle Logic & Text Update
            let sortKey = '';
            let order = 'asc';
            const currentText = btn.innerText.trim();

            if (currentText.includes('Newest') || currentText.includes('Oldest')) {
                sortKey = 'date';
                const isNewest = currentText.includes('Newest');
                btn.innerHTML = isNewest ? 'Oldest First <span class="material-symbols-outlined">expand_less</span>' : 'Newest First <span class="material-symbols-outlined">expand_more</span>';
                order = isNewest ? 'asc' : 'desc';
            } 
            else if (currentText.includes('Price')) {
                sortKey = 'price';
                const isLowest = currentText.includes('Lowest') || !currentText.includes(':');
                btn.innerHTML = isLowest ? 'Price: Highest <span class="material-symbols-outlined">expand_less</span>' : 'Price: Lowest <span class="material-symbols-outlined">expand_more</span>';
                order = isLowest ? 'desc' : 'asc';
            }
            else if (currentText.includes('Distance')) {
                sortKey = 'distance';
                const isNearest = currentText.includes('Nearest') || !currentText.includes(':');
                btn.innerHTML = isNearest ? 'Distance: Farthest <span class="material-symbols-outlined">expand_less</span>' : 'Distance: Nearest <span class="material-symbols-outlined">expand_more</span>';
                order = isNearest ? 'desc' : 'asc';
            }

            // 3. Log Backend Payload
            const payload = {
                sort_by: sortKey,
                order: order,
                timestamp: new Date().toISOString()
            };
            console.log('>>> [BACKEND READY] SORT_UPDATE:', payload);
        });
    }
});
