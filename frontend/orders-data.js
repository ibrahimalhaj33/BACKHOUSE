/**
 * ORDERS DATA MANAGER (Phase 3)
 * All order functions now call the Django API.
 * Depends on authFetch() from listings-data.js (must be loaded first).
 */

const ORDERS_API = 'http://127.0.0.1:8000/api/orders';

// ─── Buyer-side ──────────────────────────────────────────

async function createOrderApi({ listing_id, quantity = 1, notes = '' }) {
    try {
        const res = await authFetch(`${ORDERS_API}/`, {
            method: 'POST',
            body: JSON.stringify({ listing: listing_id, quantity, notes }),
        });
        const body = await res.json();
        if (!res.ok) throw body;
        return body.data;
    } catch (e) {
        console.error('[API] createOrderApi failed:', e);
        throw e;
    }
}

async function getMyPurchases(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    try {
        const res = await authFetch(`${ORDERS_API}/purchases/${qs ? '?' + qs : ''}`);
        const body = await res.json();
        return {
            data: body.data || [],
            pagination: body.meta?.pagination || null,
        };
    } catch (e) {
        console.error('[API] getMyPurchases failed:', e);
        return { data: [], pagination: null };
    }
}

// ─── Seller-side ─────────────────────────────────────────

async function getMySales(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    try {
        const res = await authFetch(`${ORDERS_API}/sales/${qs ? '?' + qs : ''}`);
        const body = await res.json();
        return {
            data: body.data || [],
            pagination: body.meta?.pagination || null,
        };
    } catch (e) {
        console.error('[API] getMySales failed:', e);
        return { data: [], pagination: null };
    }
}

// ─── Shared ──────────────────────────────────────────────

async function getOrderById(id) {
    try {
        const res = await authFetch(`${ORDERS_API}/${id}/`);
        const body = await res.json();
        return body.data || null;
    } catch (e) {
        console.error('[API] getOrderById failed:', e);
        return null;
    }
}

async function updateOrderStatus(id, status, extras = {}) {
    try {
        const res = await authFetch(`${ORDERS_API}/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ status, ...extras }),
        });
        const body = await res.json();
        if (!res.ok) throw body;
        return body.data;
    } catch (e) {
        console.error('[API] updateOrderStatus failed:', e);
        throw e;
    }
}

async function getSellerDashboard() {
    try {
        const res = await authFetch(`${ORDERS_API}/seller-dashboard/`);
        const body = await res.json();
        return body.data || null;
    } catch (e) {
        console.error('[API] getSellerDashboard failed:', e);
        return null;
    }
}

async function getBuyerScorecard() {
    try {
        const res = await authFetch(`${ORDERS_API}/scorecard/`);
        const body = await res.json();
        return body.data || null;
    } catch (e) {
        console.error('[API] getBuyerScorecard failed:', e);
        return null;
    }
}

async function confirmPickup(id) {
    try {
        const res = await authFetch(`${ORDERS_API}/${id}/confirm-pickup/`, { method: 'POST' });
        const body = await res.json();
        if (!res.ok) throw body;
        return body.data;
    } catch (e) {
        console.error('[API] confirmPickup failed:', e);
        throw e;
    }
}

async function cancelOrder(id) {
    try {
        const res = await authFetch(`${ORDERS_API}/${id}/`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error('[API] cancelOrder failed:', e);
        return false;
    }
}
