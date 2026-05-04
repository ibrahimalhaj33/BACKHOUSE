/* ═══════════════════════════════════════════════════════
   BackHouse — Ratings Page Logic
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.header-tab');
    const ratingsGrid = document.querySelector('.ratings-grid');
    const sortSelect = document.querySelector('.sort-group__select');
    const showMoreBtn = document.querySelector('.ratings-wrapper > div[style*="cursor: pointer"]');
    
    let currentType = 'received'; // Default view
    let currentSort = 'Most Recent';
    let visibleCount = 6;

    // 1. Initial Render
    renderRatings();

    // 2. Tab Toggle Logic
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update Active Class
            tabButtons.forEach(b => b.classList.remove('header-tab--active'));
            btn.classList.add('header-tab--active');

            // Switch Type
            currentType = btn.textContent.trim().toLowerCase();
            visibleCount = 6; // Reset pagination
            renderRatings();
        });
    });

    // 3. Sorting Logic
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderRatings();
        });
    }

    // 4. "Show More" Logic
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', () => {
            visibleCount += 6;
            renderRatings();
        });
    }

    /**
     * THE ENGINE: renderRatings()
     * Filters, sorts, and builds the HTML cards
     */
    function renderRatings() {
        if (!ratingsGrid) return;

        // Force a fresh fetch from localStorage every time we render
        let allRatings = getRatings();
        
        // Filter by Type (Received vs Given)
        let filtered = allRatings.filter(r => r.type === currentType);

        // Sort Data: Newest first (using Date objects)
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Most Recent is actually the default now
        if (currentSort === 'Highest Rated') {
            filtered.sort((a, b) => b.stars - a.stars);
        } else if (currentSort === 'Lowest Rated') {
            filtered.sort((a, b) => a.stars - b.stars);
        }

        // Handle Pagination
        const toShow = filtered.slice(0, visibleCount);
        
        // Hide "Show More" if we've reached the end
        if (showMoreBtn) {
            showMoreBtn.style.display = filtered.length > visibleCount ? 'flex' : 'none';
        }

        // Build HTML
        ratingsGrid.innerHTML = '';
        
        if (toShow.length === 0) {
            ratingsGrid.innerHTML = `<div style="grid-column: 1/-1; padding: 4rem; text-align: center; color: var(--color-secondary); font-style: italic;">No ${currentType} ratings found.</div>`;
            return;
        }

        toShow.forEach(rating => {
            const card = document.createElement('article');
            card.className = 'rating-card';
            
            // Generate Stars HTML
            let starsHTML = '';
            const fullStars = Math.floor(rating.stars);
            const hasHalf = rating.stars % 1 !== 0;

            for (let i = 0; i < 5; i++) {
                if (i < fullStars) {
                    starsHTML += `<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">star</span>`;
                } else if (i === fullStars && hasHalf) {
                    starsHTML += `<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">star_half</span>`;
                } else {
                    starsHTML += `<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">star</span>`;
                }
            }

            const imgHTML = rating.image ? 
                `<img src="${rating.image}" alt="${rating.businessName}" class="rating-card__img">` :
                `<div class="rating-card__img" style="background: var(--color-surface-container-highest); display: flex; align-items: center; justify-content: center; color: var(--color-secondary);">
                    <span class="material-symbols-outlined">${currentType === 'received' ? 'business' : 'storefront'}</span>
                </div>`;

            card.innerHTML = `
                <div class="rating-card__left">
                    ${imgHTML}
                    <div>
                        <h4 class="rating-card__name">${rating.businessName}</h4>
                        <time class="rating-card__date">${new Date(rating.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
                    </div>
                </div>
                <div class="rating-card__right">
                    <div class="rating-card__stars">
                        ${starsHTML}
                    </div>
                </div>
            `;
            ratingsGrid.appendChild(card);
        });
    }
});
