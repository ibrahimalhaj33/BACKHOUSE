/* ═══════════════════════════════════════════════════════
   BackHouse — Edit Listing Page JS (edit-listing.html)
   Vanilla JS · No dependencies
   Backend Ready: All data operations go through listings-data.js
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ─── 1. Read Listing ID from URL ─────────────────────
    const params = new URLSearchParams(window.location.search);
    const listingId = params.get('id');

    if (!listingId) {
        console.warn('[Edit Listing] No listing ID provided in URL.');
        return;
    }

    // ─── 2. Load Listing Data from Brain ─────────────────
    if (typeof getListingById !== 'function') {
        console.error('[Edit Listing] listings-data.js not loaded.');
        return;
    }

    const listing = getListingById(listingId);

    if (!listing) {
        console.warn('[Edit Listing] Listing not found for ID:', listingId);
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
    // Track current images for this listing (URLs or base64 data)
    let currentImages = [];

    // Initialize from listing data
    if (listing.image) {
        currentImages = [listing.image];
    }

    // ─── 5. Populate Form with Listing Data ──────────────
    function populateForm(data) {
        if (nameInput) nameInput.value = data.name || '';

        // Category: Try to match the select option
        if (categorySelect && data.category) {
            const options = categorySelect.querySelectorAll('option');
            options.forEach(opt => {
                if (opt.textContent.trim().toLowerCase() === data.category.toLowerCase()) {
                    opt.selected = true;
                }
            });
        }

        if (expiryInput && data.expiry_date) {
            expiryInput.value = data.expiry_date;
        }

        if (descTextarea) descTextarea.value = data.description || '';

        if (quantityInput) quantityInput.value = data.quantity || data.inventoryCurrent || '';
        if (unitInput) unitInput.value = data.unit || '';

        // Price: Strip $ symbol if present
        if (priceInput) {
            const price = data.numericPrice || parseFloat(String(data.price).replace(/[^0-9.]/g, '')) || '';
            priceInput.value = price;
        }

        if (priceOriginal) {
            const origPrice = data.originalPrice || data.numericPrice || '';
            priceOriginal.value = origPrice;
        }

        // Update discount badge
        updateDiscountBadge();

        // Update page header to reflect the item being edited
        if (pageTitle) pageTitle.textContent = 'Edit: ' + data.name;
        if (pageSubtitle) pageSubtitle.textContent = 'Modify listing details for ' + data.name + '. Updates are reflected in the marketplace immediately upon saving.';
        if (breadcrumbCurrent) breadcrumbCurrent.textContent = data.name;

        // Update browser tab title
        document.title = 'Edit: ' + data.name + ' | BackHouse';

        // Render the image gallery
        renderMediaGallery();
    }

    // ─── 6. Render Media Gallery ─────────────────────────
    function renderMediaGallery() {
        if (!mediaGrid) return;

        // Clear existing image items (keep the upload button)
        const existingItems = mediaGrid.querySelectorAll('.edit-media__item');
        existingItems.forEach(item => item.remove());

        // Insert each image BEFORE the upload button
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
            var overlay = e.target.closest('.edit-media__overlay');
            if (!overlay) return;

            var mediaItem = overlay.closest('.edit-media__item');
            if (!mediaItem) return;

            var index = parseInt(mediaItem.dataset.index);

            // Animate out
            mediaItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            mediaItem.style.opacity = '0';
            mediaItem.style.transform = 'scale(0.8)';

            setTimeout(function() {
                // Remove from state
                currentImages.splice(index, 1);
                // Re-render to fix indices
                renderMediaGallery();
                console.log('[Edit Listing] Image removed. Remaining:', currentImages.length);
            }, 300);
        });
    }

    // ─── 8. Upload Image ─────────────────────────────────
    // Clicking the upload area triggers the hidden file input
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', function() {
            fileInput.click();
        });

        fileInput.addEventListener('change', function() {
            var file = fileInput.files[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                console.warn('[Edit Listing] Invalid file type:', file.type);
                return;
            }

            // Read file as base64 data URL
            var reader = new FileReader();
            reader.onload = function(event) {
                var base64 = event.target.result;

                // Replace existing image or add new one
                if (currentImages.length > 0) {
                    // Replace the first image (primary listing image)
                    currentImages[0] = base64;
                    console.log('[Edit Listing] Replaced primary image with uploaded file.');
                } else {
                    // No images yet — add as first
                    currentImages.push(base64);
                    console.log('[Edit Listing] Added new image from upload.');
                }

                renderMediaGallery();
            };
            reader.readAsDataURL(file);

            // Reset input so same file can be re-selected
            fileInput.value = '';
        });
    }

    // ─── 9. Discount Badge Calculator ────────────────────
    function updateDiscountBadge() {
        if (!discountBadge || !priceInput || !priceOriginal) return;

        var current = parseFloat(priceInput.value) || 0;
        var original = parseFloat(priceOriginal.value) || 0;

        if (original > 0 && current < original) {
            var discount = Math.round(((original - current) / original) * 100);
            discountBadge.textContent = discount + '% OFF RETAIL';
            discountBadge.style.display = '';
        } else {
            discountBadge.style.display = 'none';
        }
    }

    // Listen for price changes to update discount live
    if (priceInput) priceInput.addEventListener('input', updateDiscountBadge);
    if (priceOriginal) priceOriginal.addEventListener('input', updateDiscountBadge);

    // ─── 10. Collect Updated Payload ─────────────────────
    /**
     * Builds the update payload from form values.
     * Backend: This object is sent as the PUT body.
     */
    function collectPayload() {
        var price = parseFloat(priceInput ? priceInput.value : 0) || 0;

        return {
            name:             nameInput ? nameInput.value.trim() : listing.name,
            category:         categorySelect ? categorySelect.value : '',
            expiry_date:      expiryInput ? expiryInput.value : '',
            description:      descTextarea ? descTextarea.value.trim() : '',
            quantity:         parseInt(quantityInput ? quantityInput.value : 0) || 0,
            inventoryCurrent: parseInt(quantityInput ? quantityInput.value : 0) || 0,
            unit:             unitInput ? unitInput.value.trim() : '',
            price:            '$' + price.toFixed(2),
            numericPrice:     price,
            originalPrice:    parseFloat(priceOriginal ? priceOriginal.value : 0) || null,
            image:            currentImages[0] || listing.image || '',
            last_updated:     new Date().toISOString()
        };
    }

    // ─── 11. Update Listing Handler ──────────────────────
    if (updateBtn) {
        updateBtn.addEventListener('click', function() {
            // Basic validation
            var name = nameInput ? nameInput.value.trim() : '';
            if (!name) {
                if (nameInput) {
                    nameInput.focus();
                    nameInput.style.borderColor = 'var(--color-error)';
                }
                return;
            }

            // 1. Collect payload
            var payload = collectPayload();
            console.log('[Edit Listing] UPDATE payload:', payload);

            // 2. Loading state
            var originalText = updateBtn.textContent;
            updateBtn.textContent = 'Saving\u2026';
            updateBtn.disabled = true;
            updateBtn.style.opacity = '0.7';
            updateBtn.style.cursor = 'not-allowed';

            // 3. Save to brain (simulated delay for backend feel)
            // Backend: Replace setTimeout + updateListing with fetch PUT
            setTimeout(function() {
                var result = updateListing(listingId, payload);

                if (result) {
                    console.log('[Edit Listing] ✓ Listing updated successfully:', result.name);
                    updateBtn.textContent = '✓ Saved!';

                    // Redirect back to All Listings after success
                    setTimeout(function() {
                        window.location.href = 'all-listings.html';
                    }, 1000);
                } else {
                    console.error('[Edit Listing] Update failed — listing not found.');
                    updateBtn.textContent = originalText;
                    updateBtn.disabled = false;
                    updateBtn.style.opacity = '';
                    updateBtn.style.cursor = '';
                }
            }, 800);
        });
    }

    // ─── 12. Clear validation on input ───────────────────
    if (nameInput) {
        nameInput.addEventListener('input', function() {
            nameInput.style.borderColor = '';
        });
    }

    // ─── INIT ────────────────────────────────────────────
    populateForm(listing);

});
