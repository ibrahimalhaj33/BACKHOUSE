/**
 * browse.js — Public marketplace landing page (no login required).
 * Fetches real listings from /api/listings/ and lets non-logged-in users
 * browse + see filters; CTA actions route to register/login.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.querySelector('.browse-grid');
    const chips = document.querySelectorAll('.browse-filters__chip');
    const slider = document.querySelector('.browse-filters__slider');
    const priceLabel = document.querySelector('.browse-filters__price-val');
    const searchBtn = document.querySelector('.browse-search__btn');
    const searchInput = document.querySelector('.browse-search__field--query input');

    let currentCategory = '';
    let currentPriceMax = null;
    let currentSearch = '';
    let categoriesByName = {};   // name → id

    // Pre-load category mapping (to translate chip labels to category PKs the API expects)
    try {
        if (typeof getCategories === 'function') {
            const cats = await getCategories();
            cats.forEach(c => { categoriesByName[c.name.toLowerCase()] = c.id; });
        }
    } catch (_) {}

    initCategoryChips();
    initPriceSlider();
    initSearchActions();

    // Initial fetch
    await loadListings();

    // ───────────────────────────────────────────────
    function initCategoryChips() {
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                const label = chip.textContent.trim();
                if (chip.classList.contains('active')) {
                    // Toggle off
                    chip.classList.remove('active');
                    currentCategory = '';
                } else {
                    chips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    currentCategory = label;
                }
                loadListings();
            });
        });
    }

    function initPriceSlider() {
        if (!slider || !priceLabel) return;
        slider.addEventListener('input', (e) => {
            const pct = parseInt(e.target.value);
            currentPriceMax = Math.round((pct / 100) * 5000);
            priceLabel.textContent = `JOD ${currentPriceMax.toLocaleString()}+`;
        });
        slider.addEventListener('change', () => loadListings());
    }

    function initSearchActions() {
        const triggerSearch = () => {
            currentSearch = (searchInput?.value || '').trim();
            loadListings();
        };
        searchBtn?.addEventListener('click', (e) => { e.preventDefault(); triggerSearch(); });
        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); triggerSearch(); }
        });
    }

    // ───────────────────────────────────────────────
    async function loadListings() {
        if (!grid) return;
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:3rem; color:#888;">Loading listings…</p>';

        const params = {};
        if (currentSearch) params.search = currentSearch;
        if (currentCategory) {
            const catId = categoriesByName[currentCategory.toLowerCase()];
            if (catId) params.category = catId;
        }
        if (currentPriceMax && currentPriceMax > 0) params.price_max = currentPriceMax;

        const listings = await getListings(params);
        grid.innerHTML = '';

        if (!listings.length) {
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:3rem; color:#888;">
                    <span class="material-symbols-outlined" style="font-size:3rem; color:#ddd;">inbox</span>
                    <p style="margin-top:0.5rem;">No listings match your filters.</p>
                </div>`;
            return;
        }

        listings.forEach(l => grid.appendChild(renderCard(l)));
    }

    function renderCard(listing) {
        const article = document.createElement('article');
        article.className = 'browse-card';
        const image = listing.image
            ? `<img class="browse-card__image" src="${listing.image}" alt="${escapeHtml(listing.name)}">`
            : `<div class="browse-card__image" style="background:linear-gradient(135deg,#f0f0f0,#e0e0e0); display:flex; align-items:center; justify-content:center; color:#aaa; min-height:200px;">
                 <span class="material-symbols-outlined" style="font-size:48px;">image</span>
               </div>`;

        article.innerHTML = `
            <div class="browse-card__blurred-content">
                <div class="browse-card__image-wrapper">
                    ${image}
                    <div class="browse-card__gradient"></div>
                    ${listing.expiring ? '<span class="browse-card__badge">Expiring Soon</span>' : ''}
                </div>
                <div class="browse-card__details">
                    <div class="browse-card__header">
                        <span class="browse-card__category">${escapeHtml(listing.category || 'Listing')}</span>
                        <span class="browse-card__price">${escapeHtml(listing.price)}</span>
                    </div>
                    <h3 class="browse-card__title">${escapeHtml(listing.name)}</h3>
                    <p class="browse-card__meta">
                        Qty ${listing.quantity} ${listing.unit} · ${escapeHtml(listing.seller_name)}
                    </p>
                </div>
            </div>
            <div class="browse-card__overlay">
                <span class="material-symbols-outlined" style="font-size:2rem; color:#fff;">lock</span>
                <p style="color:#fff; margin:0.5rem 0; text-align:center;">Sign in to see full details and place orders</p>
                <button class="browse-card__overlay-btn">Sign Up Free</button>
            </div>
        `;

        // CTA → register page
        article.querySelector('.browse-card__overlay-btn').addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'register.html';
        });

        return article;
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }
});
