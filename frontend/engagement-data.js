/**
 * ENGAGEMENT DATA MANAGER (Phase 5)
 * Ratings, Favorites, Saved Searches — all backed by the Django API.
 * Depends on authFetch() from listings-data.js.
 */

const ENG_API = 'http://127.0.0.1:8000/api';

// ─── RATINGS ───────────────────────────────────────

async function getRatings(type = 'received') {
    try {
        const res = await authFetch(`${ENG_API}/ratings/?type=${type}`);
        const body = await res.json();
        return { data: body.data || [], pagination: body.meta?.pagination || null };
    } catch (e) { return { data: [], pagination: null }; }
}

async function getRatingSummary() {
    try {
        const res = await authFetch(`${ENG_API}/ratings/summary/`);
        const body = await res.json();
        return body.data || null;
    } catch (e) { return null; }
}

async function getPendingRatings() {
    try {
        const res = await authFetch(`${ENG_API}/ratings/pending/`);
        const body = await res.json();
        return body.data || [];
    } catch (e) { return []; }
}

async function submitRating({ order, stars, comment = '' }) {
    try {
        const res = await authFetch(`${ENG_API}/ratings/`, {
            method: 'POST',
            body: JSON.stringify({ order, stars, comment }),
        });
        const body = await res.json();
        if (!res.ok) throw body;
        return body.data;
    } catch (e) {
        console.error('[API] submitRating failed:', e);
        throw e;
    }
}

// ─── FAVORITES ─────────────────────────────────────

async function getFavorites() {
    try {
        const res = await authFetch(`${ENG_API}/favorites/`);
        const body = await res.json();
        return { data: body.data || [], pagination: body.meta?.pagination || null };
    } catch (e) { return { data: [], pagination: null }; }
}

async function getFavoriteIds() {
    try {
        const res = await authFetch(`${ENG_API}/favorites/ids/`);
        const body = await res.json();
        return new Set(body.data?.ids || []);
    } catch (e) { return new Set(); }
}

async function toggleFavorite(listingId) {
    try {
        const res = await authFetch(`${ENG_API}/favorites/toggle/${listingId}/`, { method: 'POST' });
        const body = await res.json();
        if (!res.ok) throw body;
        return body.data;  // { favorited, total, listing_id }
    } catch (e) {
        console.error('[API] toggleFavorite failed:', e);
        throw e;
    }
}

async function removeFavorite(favoriteId) {
    try {
        const res = await authFetch(`${ENG_API}/favorites/${favoriteId}/`, { method: 'DELETE' });
        return res.ok;
    } catch (e) { return false; }
}

// ─── SAVED SEARCHES ────────────────────────────────

async function getSavedSearches() {
    try {
        const res = await authFetch(`${ENG_API}/searches/`);
        const body = await res.json();
        return body.data || [];
    } catch (e) { return []; }
}

async function createSavedSearch(payload) {
    try {
        const res = await authFetch(`${ENG_API}/searches/`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        const body = await res.json();
        if (!res.ok) throw body;
        return body.data;
    } catch (e) {
        console.error('[API] createSavedSearch failed:', e);
        throw e;
    }
}

async function updateSavedSearch(id, payload) {
    try {
        const res = await authFetch(`${ENG_API}/searches/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        const body = await res.json();
        if (!res.ok) throw body;
        return body.data;
    } catch (e) {
        console.error('[API] updateSavedSearch failed:', e);
        throw e;
    }
}

async function deleteSavedSearch(id) {
    try {
        const res = await authFetch(`${ENG_API}/searches/${id}/`, { method: 'DELETE' });
        return res.ok;
    } catch (e) { return false; }
}

async function runSavedSearch(id) {
    try {
        const res = await authFetch(`${ENG_API}/searches/${id}/run/`);
        const body = await res.json();
        return { data: body.data || [], pagination: body.meta?.pagination || null };
    } catch (e) { return { data: [], pagination: null }; }
}
