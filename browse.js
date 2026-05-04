/**
 * browse.js - UI State Management for Marketplace View
 * Handle category toggles, price slider updates, and access gate alerts.
 */

document.addEventListener('DOMContentLoaded', () => {
    initCategoryPills();
    initPriceSlider();
    initAccessGate();
    initCTARouting();
    console.log('✅ browse.js loaded and ready.');
});

/**
 * Manage UI State (Categories)
 */
function initCategoryPills() {
    const chips = document.querySelectorAll('.browse-filters__chip');
    
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            // Log live state for backend preview
            console.log('[Filter Change] Category updated:', getFilterState());
        });
    });
}

/**
 * Manage UI State (Price Slider)
 */
function initPriceSlider() {
    const slider = document.querySelector('.browse-filters__slider');
    const priceLabel = document.querySelector('.browse-filters__price-val');
    
    if (slider && priceLabel) {
        slider.addEventListener('input', (e) => {
            const val = e.target.value;
            const displayVal = Math.round((val / 100) * 5000);
            priceLabel.textContent = `JOD ${displayVal.toLocaleString()}+`;

            // Log live state for backend preview
            console.log('[Filter Change] Price updated:', getFilterState());
        });
    }
}

/**
 * Gathers all current filters into a state object.
 */
function getFilterState() {
    const activeChip = document.querySelector('.browse-filters__chip.active');
    const slider = document.querySelector('.browse-filters__slider');
    const searchInput = document.querySelector('.browse-search__input');

    return {
        category:    activeChip ? activeChip.textContent.trim() : 'All',
        price_range: slider ? slider.value : 0,
        search_query: (searchInput && searchInput.value) ? searchInput.value.trim() : ''
    };
}

/**
 * The Access Gate
 */
function initAccessGate() {
    const searchBtn = document.querySelector('.browse-search__btn');
    const searchInput = document.querySelector('.browse-search__input');
    
    const triggerAlert = (e) => {
        if (e.type === 'click' || (e.type === 'keypress' && e.key === 'Enter')) {
            e.preventDefault();
            
            const state = getFilterState();
            console.log('[Access Gate] "Find Listings" clicked. Payload:', state);

            alert("Please register or log in to access the full marketplace search engine.");
        }
    };

    if (searchBtn) searchBtn.addEventListener('click', triggerAlert);
    if (searchInput) searchInput.addEventListener('keypress', triggerAlert);
}

/**
 * CTA Routing
 */
function initCTARouting() {
    const ctaButtons = document.querySelectorAll('.browse-card__overlay-btn');
    ctaButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'register.html';
        });
    });
}
