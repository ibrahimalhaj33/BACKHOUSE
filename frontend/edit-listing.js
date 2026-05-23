/* ═══════════════════════════════════════════════════════
   BackHouse — Edit Listing Page JS (edit-listing.html)
   Vanilla JS · No dependencies
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {

    // ─── 0. Clear ALL hardcoded placeholder values from the HTML ──
    // (so you never see "Premium White Wheat Flour" etc. — even if data fails to load)
    const clearForm = () => {
        document.querySelectorAll('.form-input, .form-textarea').forEach(el => { el.value = ''; });
        const sel = document.querySelector('select[name="category"]');
        if (sel) sel.selectedIndex = 0;
        const badge = document.querySelector('.edit-discount-badge');
        if (badge) badge.style.display = 'none';
    };
    clearForm();

    // ─── 1. Read Listing ID from URL or sessionStorage ───
    // (sessionStorage is more reliable — some dev servers strip query strings)
    const params = new URLSearchParams(window.location.search);
    let listingId = params.get('id') || sessionStorage.getItem('edit_listing_id');

    console.log('[Edit Listing] Loaded with id =', listingId);

    if (!listingId || listingId === 'undefined' || listingId === 'null') {
        alert('No listing selected. Redirecting back to All Listings.');
        window.location.href = 'all-listings.html';
        return;
    }

    // ─── 2. Load Listing Data from API ───────────────────
    if (typeof getListingById !== 'function') {
        console.error('[Edit Listing] listings-data.js not loaded.');
        return;
    }

    let listing = null;

    // 1. Try the API first (gives us the freshest data)
    try {
        listing = await getListingById(listingId);
        console.log('[Edit Listing] API returned:', listing);
    } catch (e) {
        console.warn('[Edit Listing] API call failed, will try cache:', e);
    }

    // 2. Fall back to the cached copy passed from all-listings.html
    if (!listing) {
        const cached = sessionStorage.getItem('edit_listing_cache');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (String(parsed.id) === String(listingId)) {
                    listing = parsed;
                    console.log('[Edit Listing] Using cached listing from sessionStorage');
                }
            } catch (_) {}
        }
    }

    if (!listing) {
        alert(`Could not load listing #${listingId}. Try refreshing All Listings and clicking the pencil again.`);
        return;
    }

    console.log('[Edit Listing] Loaded listing:', listing.id, listing.name);

    // ─── 3. DOM References ───────────────────────────────
    const nameInput         = document.querySelector('input[name="name"]');
    const categorySelect    = document.querySelector('select[name="category"]');
    const expiryInput       = document.querySelector('input[name="expiry_date"]');
    const descTextarea      = document.querySelector('textarea[name="description"]');
    const quantityInput     = document.querySelector('input[name="quantity"]');
    const unitInput         = document.querySelector('input[name="unit"]');
    const priceInput        = document.querySelector('input[name="price"]');
    const priceOriginal     = document.querySelector('input[name="price_original"]');
    const discountBadge     = document.querySelector('.edit-discount-badge');
    const updateBtn         = document.querySelector('.edit-btn-update');
    const pageTitle         = document.querySelector('.edit-header__title');
    const pageSubtitle      = document.querySelector('.edit-header__subtitle');
    const breadcrumbCurrent = document.querySelector('.edit-breadcrumbs__current');
    const mediaGrid         = document.getElementById('edit-media-grid');
    const uploadBtn         = document.getElementById('edit-media-upload-btn');
    const fileInput         = document.getElementById('edit-media-file-input');

    // ─── 4. Image State ──────────────────────────────────
    let currentImages = [];
    if (listing.image) currentImages = [listing.image];

    // ─── 5. Populate Form with Listing Data ──────────────
    function populateForm(data) {
        if (nameInput) nameInput.value = data.name || '';

        if (categorySelect && data.category) {
            const catName = String(data.category).trim().toLowerCase();
            const options = categorySelect.querySelectorAll('option');
            options.forEach(opt => {
                if (opt.textContent.trim().toLowerCase() === catName) {
                    opt.selected = true;
                }
            });
        }

        if (expiryInput && data.expiry_date) expiryInput.value = data.expiry_date;
        if (descTextarea) descTextarea.value = data.description || '';
        if (quantityInput) quantityInput.value = data.quantity || data.inventoryCurrent || '';
        if (unitInput) unitInput.value = data.unit || '';

        if (priceInput) {
            const price = data.numericPrice || parseFloat(String(data.price).replace(/[^0-9.]/g, '')) || '';
            priceInput.value = price;
        }

        if (priceOriginal) {
            priceOriginal.value = data.originalPrice || data.numericPrice || '';
        }

        updateDiscountBadge();

        if (pageTitle) pageTitle.textContent = 'Edit: ' + data.name;
        if (pageSubtitle) pageSubtitle.textContent = 'Modify listing details for ' + data.name + '. Updates are reflected in the marketplace immediately upon saving.';
        if (breadcrumbCurrent) breadcrumbCurrent.textContent = data.name;
        document.title = 'Edit: ' + data.name + ' | BackHouse';

        renderMediaGallery();
    }

    // ─── 6. Render Media Gallery ─────────────────────────
    function renderMediaGallery() {
        if (!mediaGrid) return;
        mediaGrid.querySelectorAll('.edit-media__item').forEach(item => item.remove());

        currentImages.forEach((imgSrc, index) => {
            const div = document.createElement('div');
            div.className = 'edit-media__item';
            div.dataset.index = index;
            div.innerHTML =
                '<img src="' + imgSrc + '" alt="Product photo ' + (index + 1) + '">' +
                '<div class="edit-media__overlay">' +
                    '<span class="material-symbols-outlined">delete</span>' +
                '</div>';
            mediaGrid.insertBefore(div, uploadBtn);
        });
    }

    // ─── 7. Image Delete (delegated click) ───────────────
    if (mediaGrid) {
        mediaGrid.addEventListener('click', function(e) {
            const overlay = e.target.closest('.edit-media__overlay');
            if (!overlay) return;
            const mediaItem = overlay.closest('.edit-media__item');
            if (!mediaItem) return;
            const index = parseInt(mediaItem.dataset.index);
            mediaItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            mediaItem.style.opacity = '0';
            mediaItem.style.transform = 'scale(0.8)';
            setTimeout(() => {
                currentImages.splice(index, 1);
                renderMediaGallery();
            }, 300);
        });
    }

    // ─── 8. Upload Image ─────────────────────────────────
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (!file || !file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                if (currentImages.length > 0) {
                    currentImages[0] = event.target.result;
                } else {
                    currentImages.push(event.target.result);
                }
                renderMediaGallery();
            };
            reader.readAsDataURL(file);
            fileInput.value = '';
        });
    }

    // ─── 9. Discount Badge Calculator ────────────────────
    function updateDiscountBadge() {
        if (!discountBadge || !priceInput || !priceOriginal) return;
        const current = parseFloat(priceInput.value) || 0;
        const original = parseFloat(priceOriginal.value) || 0;
        if (original > 0 && current < original) {
            const discount = Math.round(((original - current) / original) * 100);
            discountBadge.textContent = discount + '% OFF RETAIL';
            discountBadge.style.display = '';
        } else {
            discountBadge.style.display = 'none';
        }
    }

    if (priceInput) priceInput.addEventListener('input', updateDiscountBadge);
    if (priceOriginal) priceOriginal.addEventListener('input', updateDiscountBadge);

    // ─── 10. Collect Updated Payload ─────────────────────
    function collectPayload() {
        const payload = {};

        const name = nameInput ? nameInput.value.trim() : '';
        if (name) payload.name = name;

        const category = categorySelect ? categorySelect.value.trim() : '';
        if (category) payload.category = category;

        const expiry = expiryInput ? expiryInput.value.trim() : '';
        payload.expiry_date = expiry || null;

        if (descTextarea) payload.description = descTextarea.value.trim();

        const qty = parseInt(quantityInput ? quantityInput.value : 0);
        if (!isNaN(qty) && qty > 0) payload.quantity = qty;

        const unit = unitInput ? unitInput.value.trim() : '';
        if (unit) payload.unit = unit;

        const price = parseFloat(priceInput ? priceInput.value : 0);
        if (!isNaN(price) && price >= 0) payload.price = price;

        // Only send image_base64 if the user uploaded a new image
        if (currentImages[0] && currentImages[0].startsWith('data:')) {
            payload.image_base64 = currentImages[0];
        }
        return payload;
    }

    // ─── 11. Update Listing Handler ──────────────────────
    if (updateBtn) {
        updateBtn.addEventListener('click', async function() {
            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) {
                if (nameInput) {
                    nameInput.focus();
                    nameInput.style.borderColor = 'var(--color-error)';
                }
                return;
            }

            const payload = collectPayload();
            const originalText = updateBtn.textContent;
            updateBtn.textContent = 'Saving…';
            updateBtn.disabled = true;
            updateBtn.style.opacity = '0.7';
            updateBtn.style.cursor = 'not-allowed';

            try {
                const result = await updateListing(listingId, payload);
                if (result) {
                    updateBtn.textContent = '✓ Saved!';
                    setTimeout(() => window.location.href = 'all-listings.html', 1000);
                }
            } catch (err) {
                console.error('[Edit Listing] Update failed:', err);
                const baseMsg = err?.error?.message || 'Update failed. Please try again.';
                const fields = err?.error?.fields;
                let detail = '';
                if (fields && typeof fields === 'object') {
                    detail = '\n\n' + Object.entries(fields)
                        .map(([k, v]) => `• ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                        .join('\n');
                }
                alert(baseMsg + detail);
                updateBtn.textContent = originalText;
                updateBtn.disabled = false;
                updateBtn.style.opacity = '';
                updateBtn.style.cursor = '';
            }
        });
    }

    // ─── 12. Clear validation on input ───────────────────
    if (nameInput) {
        nameInput.addEventListener('input', () => { nameInput.style.borderColor = ''; });
    }

    // ─── INIT ────────────────────────────────────────────
    populateForm(listing);
});
