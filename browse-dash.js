document.addEventListener('DOMContentLoaded', () => {

    const listingsGrid = document.querySelector('.listings-grid');

    /**
     * THE STAMP: renderProductCard(product)
     * This function generates the EXACT same HTML structure for any product
     * coming from a database. This guarantees your design stays perfect.
     */
    function renderProductCard(product) {
        // Handle ratings (draw stars based on number)
        const fullStars = Math.floor(product.seller_rating || 0);
        let starsHTML = '';
        for (let i = 0; i < 5; i++) {
            const fill = i < fullStars ? 1 : 0;
            starsHTML += `<span class="material-symbols-outlined" style="font-size: 12px; font-variation-settings: 'FILL' ${fill};">star</span>`;
        }

        // Return the exact HTML structure from your design
        return `
            <article class="listing-card" data-product-id="${product.id}">
                <div class="card-image-wrap">
                    <img alt="${product.name}" src="${product.image}">
                    ${product.expiring ? '<div class="card-badge"><span class="material-symbols-outlined" style="font-size: 14px;">timer</span> Expiring Soon</div>' : ''}
                    <button class="card-fav-btn glass-panel" data-product-id="${product.id}">
                        <span class="material-symbols-outlined" style="font-size: 1.125rem;">favorite</span>
                    </button>
                </div>
                <div class="card-content">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <h3 class="card-title">${product.name}</h3>
                        <span class="card-price">${product.price}</span>
                    </div>
                    <div class="card-tags">
                        <span class="card-tag">Qty: ${product.quantity}</span>
                        <span class="card-tag card-tag-emerald">${product.distance} away</span>
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




    /**
     * Gathers all current filter settings into a data payload.
     * Ready to be sent to a Search API.
     */
    function getFilterState() {
        const radiusInput = document.querySelector('.filter-group input[type="range"]');
        const priceMin = document.querySelector('.filter-group input[placeholder="Min"]');
        const priceMax = document.querySelector('.filter-group input[placeholder="Max"]');
        const weightMin = document.querySelector('.filter-group input[placeholder="0"]'); // Our new Weight input
        const expirySelect = document.querySelector('.filter-group select');
        const searchInput = document.querySelector('.browse-header__search-bar input');

        // Categories & Attributes (checked checkboxes)
        const categories = [];
        const attributes = [];

        document.querySelectorAll('.filter-group input[type="checkbox"]:checked').forEach(cb => {
            const label = cb.parentElement.textContent.trim();
            // Simple logic: if it's in the first group, it's a category. If in second, it's an attribute.
            if (label.includes('Only') || label.includes('Pickup') || label.includes('Sellers')) {
                attributes.push(label);
            } else {
                categories.push(label);
            }
        });

        return {
            search_query: searchInput ? searchInput.value.trim() : '',
            radius_km: radiusInput ? parseInt(radiusInput.value) : 25,
            price_range: {
                min: priceMin ? parseFloat(priceMin.value) || 0 : 0,
                max: priceMax ? parseFloat(priceMax.value) || 0 : null
            },
            min_weight_kg: weightMin ? parseFloat(weightMin.value) || 0 : 0,
            categories: categories,
            attributes: attributes,
            expiry_limit: expirySelect ? expirySelect.value : 'Anytime',
            timestamp: new Date().toISOString()
        };
    }

    // --- SAVE SEARCH BUTTON ---
    const saveSearchBtn = document.querySelector('.save-search-btn');
    if (saveSearchBtn) {
        saveSearchBtn.addEventListener('click', () => {
            const payload = getFilterState();
            console.log('>>> [BACKEND READY] SAVE_SEARCH_REQUEST:', payload);
            alert('Search Criteria Saved!\n(Check console for the data payload)');
        });
    }

    // --- LIVE FILTER LOGGING ---
    // Log whenever any filter changes
    document.querySelector('.filters-sidebar')?.addEventListener('change', () => {
        console.log('[Filter Change] New State:', getFilterState());
    });

    // Add search listener to log the state (Backend Preview)
    const searchBar = document.querySelector('.browse-header__search-bar');
    if (searchBar) {
        const searchInput = searchBar.querySelector('input');
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('[Dashboard API] Searching with filters:', getFilterState());
            }
        });
    }

    /**
     * Radius Slider Interactivity
     */
    const radiusInput = document.querySelector('.filter-group input[type="range"]');
    const radiusDisplay = radiusInput?.previousElementSibling?.querySelector('span');

    if (radiusInput && radiusDisplay) {
        radiusInput.addEventListener('input', (e) => {
            radiusDisplay.textContent = `${e.target.value} km`;
            console.log('[Filter Change] Radius updated:', getFilterState());
        });
    }

    /**
     * Filter Reset Functionality
     */
    const resetButton = document.querySelector('.filters-sidebar-header button');

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.filter-group input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);

            const priceInputs = document.querySelectorAll('.filter-group input[type="number"]');
            priceInputs.forEach(input => input.value = '');

            if (radiusInput) {
                radiusInput.value = radiusInput.getAttribute('value') || 25;
                if (radiusDisplay) radiusDisplay.textContent = `${radiusInput.value} km`;
            }

            const select = document.querySelector('.filter-group select');
            if (select) {
                const defaultOption = Array.from(select.options).find(opt => opt.hasAttribute('selected'));
                if (defaultOption) select.value = defaultOption.value;
                else select.selectedIndex = 0;
            }

            console.log('[Filter Change] Filters Reset:', getFilterState());
        });
    }

    /**
     * THE LOOP: renderGrid()
     * Pulls data from Brain and fills the grid
     */
    function renderGrid() {
        if (!listingsGrid) return;
        
        const listings = getListings();
        listingsGrid.innerHTML = ''; // Clear static items

        listings.forEach(product => {
            listingsGrid.innerHTML += renderProductCard(product);
        });
    }

    // Initial render
    renderGrid();

    // --- Highlight Feature: Checks for ?highlight=listing_id in URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const highlightId = urlParams.get('highlight');

    if (highlightId) {
        // Small timeout to ensure browser has settled after DOM injection
        setTimeout(() => {
            const targetCard = document.querySelector(`.listing-card[data-product-id="${highlightId}"]`);
            if (targetCard) {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetCard.classList.add('highlight-flash');
                
                // Cleanup class after animation ends
                setTimeout(() => {
                    targetCard.classList.remove('highlight-flash');
                }, 4000);
            }
        }, 400);
    }

    /**
     * Favorite Toggles (Event Delegation)
     */
    if (listingsGrid) {
        listingsGrid.addEventListener('click', (e) => {
            // Check if the clicked element (or its parent) is a favorite button
            const btn = e.target.closest('.card-fav-btn');
            if (!btn) return;

            e.preventDefault();

            // Toggle the visual state
            const isActive = btn.classList.toggle('card-fav-btn--active');

            // Capture the Product ID
            const productId = btn.getAttribute('data-product-id') || 'unknown';

            const payload = {
                product_id: productId,
                action: isActive ? 'add_to_favorites' : 'remove_from_favorites',
                timestamp: new Date().toISOString()
            };

            console.log('[Favorites API] State changed via Delegation:', payload);
        });

        // --- Add to Cart Logic ---
        listingsGrid.addEventListener('click', (e) => {
            const btnCart = e.target.closest('.btn-cart');
            if (!btnCart) return;

            e.preventDefault();

            const card = btnCart.closest('.listing-card');
            if (!card) return;
            const productId = card.getAttribute('data-product-id');
            
            const product = getListingById(productId);
            if (!product) return;

            // Create Order via listings-data.js
            const newOrder = createOrder({
                buyer_id: "user_current",
                buyer_name: "Ahmad Al-Masri",
                seller_id: product.seller_initials === "AM" ? "seller_other" : "user_seller", // Mock seller
                seller_name: product.seller_name,
                listing_id: product.id,
                listing_name: product.name,
                listing_sku: product.sku,
                listing_image: product.image,
                price: product.price,
                rate: product.quantity + " " + product.unit + " total",
            });

            // Check for duplicate
            if (newOrder.error === 'duplicate') {
                const toast = document.createElement('div');
                toast.className = 'toast-notification';
                toast.style.backgroundColor = 'var(--color-error-container)';
                toast.style.color = 'var(--color-error)';
                toast.innerHTML = `<span class="material-symbols-outlined">warning</span> Item is already in your cart!`;
                document.body.appendChild(toast);
                setTimeout(() => toast.classList.add('toast--visible'), 10);
                setTimeout(() => {
                    toast.classList.remove('toast--visible');
                    setTimeout(() => toast.remove(), 400);
                }, 3000);
                return;
            }

            console.log('[Orders API] New Order Created:', newOrder);
            
            // Visual Feedback
            const originalIcon = btnCart.innerHTML;
            btnCart.innerHTML = `<span class="material-symbols-outlined" style="color: #10b981;">check_circle</span>`;
            
            // Show Premium Toast
            const toast = document.createElement('div');
            toast.className = 'toast-notification';
            toast.innerHTML = `<span class="material-symbols-outlined" style="color: #10b981;">check_circle</span> Added to Cart: ${product.name}`;
            document.body.appendChild(toast);
            
            // Trigger animation
            setTimeout(() => toast.classList.add('toast--visible'), 10);
            
            setTimeout(() => {
                btnCart.innerHTML = originalIcon;
                // Remove Toast
                toast.classList.remove('toast--visible');
                setTimeout(() => toast.remove(), 400); // Wait for transition
            }, 3000);
        });
    }

    /**
     * Pagination Interactivity
     */
    const paginationContainer = document.querySelector('.pagination');
    if (paginationContainer) {
        const allBtns = Array.from(paginationContainer.querySelectorAll('.page-btn'));
        const numBtns = allBtns.filter(btn => !btn.querySelector('.material-symbols-outlined'));

        const updateActivePage = (targetBtn) => {
            numBtns.forEach(btn => btn.classList.remove('page-btn-active'));
            targetBtn.classList.add('page-btn-active');
            console.log('[Pagination] Page changed:', targetBtn.textContent.trim());
        };

        numBtns.forEach(btn => {
            btn.addEventListener('click', () => updateActivePage(btn));
        });
    }
});
