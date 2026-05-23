/**
 * LISTING DETAIL PAGE
 * Reads ?id=X from URL, fetches the listing from /api/listings/X/,
 * and renders the full detail view.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const listingId = params.get('id');
    const content = document.getElementById('detail-content');

    if (!listingId) {
        content.innerHTML = `<div class="detail-error">No listing ID in URL.</div>`;
        return;
    }

    const listing = await getListingById(listingId);
    if (!listing) {
        content.innerHTML = `<div class="detail-error">Listing not found or no longer available.</div>`;
        return;
    }

    document.title = `${listing.name} | BackHouse`;

    const statusKey = String(listing.status || '').toLowerCase();
    const badgeClass = ['reserved', 'inactive', 'expired'].includes(statusKey)
        ? `detail-badge--${statusKey}` : '';

    const imageHtml = listing.image
        ? `<img src="${listing.image}" alt="${listing.name}" class="detail-img">`
        : `<div class="detail-img detail-img--placeholder"><span class="material-symbols-outlined">image</span></div>`;

    const expiryText = listing.expiry_date
        ? `${listing.expiryDays} days (${listing.expiry_date})`
        : 'Not specified';

    // Detect if the current user is the seller — hide the buy button if so
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const isOwnListing = currentUser && currentUser.id === listing.seller;
    const isAvailable = listing.status === 'Active' && listing.inventoryCurrent > 0;
    const canBuy = !isOwnListing && isAvailable;

    // Friendly reason if not available
    let unavailableReason = '';
    if (!isOwnListing && !isAvailable) {
        if (listing.status === 'Expired') unavailableReason = 'This listing has expired and is no longer available.';
        else if (listing.status === 'Reserved') unavailableReason = 'This listing is currently reserved.';
        else if (listing.status === 'Inactive') unavailableReason = 'This listing has been deactivated by the seller.';
        else if (listing.inventoryCurrent <= 0) unavailableReason = 'This product is sold out.';
        else unavailableReason = 'This listing is not currently available for purchase.';
    }

    content.innerHTML = `
        <div class="detail-card">
            <div>${imageHtml}</div>
            <div class="detail-info">
                <span class="detail-badge ${badgeClass}">${listing.status}</span>
                <h1>${escapeHtml(listing.name)}</h1>
                <div class="detail-sku">${listing.sku}</div>

                <div class="detail-price">${listing.price}</div>

                <div class="detail-meta-grid">
                    <div class="detail-meta-item">
                        <div class="label">Available</div>
                        <div class="value">${listing.inventoryCurrent} / ${listing.inventoryTotal} ${listing.unit}</div>
                    </div>
                    <div class="detail-meta-item">
                        <div class="label">Category</div>
                        <div class="value">${listing.category || '—'}</div>
                    </div>
                    <div class="detail-meta-item">
                        <div class="label">Expiry</div>
                        <div class="value">${expiryText}</div>
                    </div>
                    <div class="detail-meta-item">
                        <div class="label">Views</div>
                        <div class="value">${(listing.views || 0).toLocaleString()}</div>
                    </div>
                </div>

                ${listing.description
                    ? `<div class="detail-desc">${escapeHtml(listing.description)}</div>`
                    : ''}

                <div class="detail-seller">
                    <div class="detail-seller-avatar">${listing.seller_initials || '??'}</div>
                    <div>
                        <div style="font-weight:700;">${listing.seller_name}</div>
                        <div style="font-size:0.75rem; color:#666;">
                            ${listing.seller_rating ? '★ ' + listing.seller_rating : 'New seller'}
                            ${listing.seller_reviews ? ' · ' + listing.seller_reviews + ' reviews' : ''}
                        </div>
                    </div>
                </div>

                ${unavailableReason
                    ? `<div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); color:#b91c1c; padding:0.75rem 1rem; border-radius:8px; margin-top:1rem; display:flex; gap:0.5rem; align-items:center;">
                         <span class="material-symbols-outlined">block</span>
                         <span style="font-size:0.875rem;">${unavailableReason}</span>
                       </div>`
                    : ''}

                <div class="detail-actions">
                    ${!isOwnListing
                        ? `<button class="btn-message-seller" id="btn-message-seller">
                             <span class="material-symbols-outlined" style="font-size:1rem; vertical-align:middle;">chat_bubble</span>
                             Message Seller
                           </button>`
                        : ''}
                    ${canBuy
                        ? `<button class="btn-buy" id="btn-buy">
                             <span class="material-symbols-outlined" style="font-size:1rem; vertical-align:middle;">shopping_cart</span>
                             Place Order
                           </button>`
                        : isOwnListing
                            ? `<button class="btn-message-seller" onclick="window.location.href='edit-listing.html?id=${listing.id}'">
                                 <span class="material-symbols-outlined" style="font-size:1rem; vertical-align:middle;">edit</span>
                                 Edit Listing
                               </button>`
                            : ''}
                </div>
            </div>
        </div>
    `;

    // Wire up actions — Message Seller jumps straight into a live chat
    document.getElementById('btn-message-seller')?.addEventListener('click', async () => {
        if (!listing.seller) {
            await uiAlert({ type: 'error', message: 'Seller info missing — please refresh the page.' });
            return;
        }

        // Create (or find) the conversation silently, then navigate into it
        // so the user lands in the chat with the input already active.
        try {
            const convo = await startConversation({
                recipient: listing.seller,
                listing: listing.id,
                // no body — we just open the chat, the user types in messages page
            });
            window.location.href = `messages.html?conversation=${convo.id}`;
        } catch (err) {
            const fields = err?.error?.fields || {};
            const msg = Object.values(fields).flat().join('\n')
                || err?.error?.message
                || 'Could not open chat. You may need to log in.';
            await uiAlert({
                type: 'error',
                title: 'Could not open chat',
                message: msg,
            });
        }
    });

    document.getElementById('btn-buy')?.addEventListener('click', async () => {
        const qty = await uiPrompt({
            title: 'Place order',
            message: `How many ${listing.unit} would you like?`,
            inputType: 'number',
            defaultValue: '1',
            min: '1',
            max: String(listing.inventoryCurrent),
            confirmText: 'Order',
        });
        if (!qty) return;
        const quantity = parseInt(qty);
        if (isNaN(quantity) || quantity < 1) return;
        try {
            await createOrderApi({ listing_id: listing.id, quantity });
            await uiAlert({
                type: 'success',
                title: 'Order placed',
                message: `Your order is pending the seller's approval. You'll see it on My Purchases.`,
            });
            window.location.href = 'my-purchases.html';
        } catch (err) {
            // Surface the specific backend reason — the message is usually generic ("Please correct…"),
            // but the real cause is in error.fields (e.g. non_field_errors → "You cannot order your own listing.")
            const fields = err?.error?.fields || {};
            const fieldMessages = Object.entries(fields)
                .map(([k, v]) => Array.isArray(v) ? v.join(' ') : String(v))
                .join('\n');
            const message = fieldMessages
                || err?.error?.message
                || 'Please try again.';
            console.error('[Order failed] raw error:', err);
            await uiAlert({
                type: 'error',
                title: 'Order failed',
                message,
            });
        }
    });

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }
});
