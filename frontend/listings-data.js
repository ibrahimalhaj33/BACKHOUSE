/**
 * LISTINGS DATA MANAGER
 * Phase 2: All listing functions now call the Django API.
 * Orders, messages, ratings still use localStorage (Phase 3+).
 */

const API_BASE = 'http://127.0.0.1:8000/api';

function getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function refreshAccessToken() {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return false;
    try {
        const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
        });
        if (!res.ok) return false;
        const body = await res.json();
        const newAccess = body?.data?.access || body?.access;
        if (!newAccess) return false;
        localStorage.setItem('access_token', newAccess);
        return true;
    } catch (e) {
        return false;
    }
}

// Wraps fetch: on 401, tries to refresh the token and retry once.
async function authFetch(url, options = {}) {
    options.headers = { ...getAuthHeaders(), ...(options.headers || {}) };
    let res = await fetch(url, options);
    if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            options.headers = { ...getAuthHeaders(), ...(options.headers || {}) };
            res = await fetch(url, options);
        } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            alert('Your session has expired. Please log in again.');
            window.location.href = 'login.html';
        }
    }
    return res;
}

// ─── LISTINGS (API) ────────────────────────────────────────

async function getListings(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = `${API_BASE}/listings/${params ? '?' + params : ''}`;
    try {
        const res = await authFetch(url);
        const body = await res.json();
        // Backwards-compat: callers that did `const arr = await getListings()`
        // still get an iterable array thanks to the Proxy-like wrapper below.
        const list = body.data || [];
        list.pagination = body.meta?.pagination || null;
        return list;
    } catch (e) {
        console.error('[API] getListings failed:', e);
        const empty = [];
        empty.pagination = null;
        return empty;
    }
}

async function getMyListings(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = `${API_BASE}/listings/my/${params ? '?' + params : ''}`;
    try {
        const res = await authFetch(url);
        const body = await res.json();
        return {
            data: body.data || [],
            pagination: body.meta?.pagination || null,
        };
    } catch (e) {
        console.error('[API] getMyListings failed:', e);
        return { data: [], pagination: null };
    }
}

async function getListingById(id) {
    try {
        const res = await authFetch(`${API_BASE}/listings/${id}/`);
        const data = await res.json();
        return data.data || null;
    } catch (e) {
        console.error('[API] getListingById failed:', e);
        return null;
    }
}

async function addListing(listingData) {
    try {
        const res = await authFetch(`${API_BASE}/listings/`, {
            method: 'POST',
            body: JSON.stringify(listingData),
        });
        const data = await res.json();
        if (!res.ok) throw data;
        return data.data;
    } catch (e) {
        console.error('[API] addListing failed:', e);
        throw e;
    }
}

async function updateListing(id, updatedData) {
    try {
        const res = await authFetch(`${API_BASE}/listings/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(updatedData),
        });
        const data = await res.json();
        if (!res.ok) throw data;
        return data.data;
    } catch (e) {
        console.error('[API] updateListing failed:', e);
        throw e;
    }
}

async function deleteListing(id) {
    try {
        const res = await authFetch(`${API_BASE}/listings/${id}/`, {
            method: 'DELETE',
        });
        return res.ok;
    } catch (e) {
        console.error('[API] deleteListing failed:', e);
        return false;
    }
}

async function updateListingStatus(id, newStatus) {
    return updateListing(id, { status: newStatus });
}

async function getCategories() {
    try {
        const res = await fetch(`${API_BASE}/listings/categories/`);
        const data = await res.json();
        return data.data || [];
    } catch (e) {
        console.error('[API] getCategories failed:', e);
        return [];
    }
}

async function getDashboardMetrics() {
    try {
        const res = await authFetch(`${API_BASE}/listings/dashboard/metrics/`);
        const data = await res.json();
        return data.data || null;
    } catch (e) {
        console.error('[API] getDashboardMetrics failed:', e);
        return null;
    }
}

// ─── USER PROFILE ──────────────────────────────────────────

function getUserProfile() {
    const stored = localStorage.getItem('user');
    if (stored) {
        const user = JSON.parse(stored);
        return {
            name: user.full_name || user.first_name,
            initials: user.initials || user.full_name?.charAt(0),
            image: user.avatar || null,
            role: user.role,
            rating: user.rating,
            sales: user.total_sales,
            business: {
                name: user.business_profile?.business_name || '',
                email: user.email,
                phone: user.phone,
                address: user.business_profile?.address || '',
                type: user.business_profile?.business_type || '',
                regNumber: user.business_profile?.registration_number || '',
            },
            preferences: user.preferences || {},
        };
    }
    return {
        name: "Guest",
        initials: "G",
        image: null,
        role: "buyer",
        rating: 0,
        sales: 0,
        business: {},
        preferences: {},
    };
}

function saveUserProfile(profile) {
    localStorage.setItem('backhouse_user_profile', JSON.stringify(profile));
    if (typeof updateProfileHeader === 'function') updateProfileHeader();
}

// ─── ORDERS (localStorage — Phase 3) ──────────────────────

const ORDERS_STORAGE_KEY = 'backhouse_orders';

const DEFAULT_ORDERS = [
    {
        id: "ord_001",
        buyer_id: "user_current",
        buyer_name: "Ahmad Al-Masri",
        seller_id: "seller_gv",
        seller_name: "Green Valley Farm",
        listing_id: "prod_001",
        listing_name: "Organic Surplus Bell Peppers",
        listing_sku: "SKU · 001",
        listing_image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=400",
        price: "144.00 JOD",
        status: "confirmed",
        pickup_date: "Tomorrow, 9:30 AM",
        date_created: new Date().toISOString()
    },
    {
        id: "ord_002",
        buyer_id: "user_current",
        buyer_name: "Ahmad Al-Masri",
        seller_id: "seller_db",
        seller_name: "Daily Bread Co.",
        listing_id: "prod_002",
        listing_name: "Bakery End-of-Day Bundle",
        listing_sku: "SKU · 002",
        listing_image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400",
        price: "76.50 JOD",
        status: "pending",
        pickup_date: null,
        date_created: new Date().toISOString()
    }
];

function getOrders() {
    const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!stored) { saveOrders(DEFAULT_ORDERS); return DEFAULT_ORDERS; }
    return JSON.parse(stored);
}
function saveOrders(ordersArray) { localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(ordersArray)); }
function createOrder(orderData) {
    const currentList = getOrders();
    const isDuplicate = currentList.some(o => o.buyer_id === orderData.buyer_id && o.listing_id === orderData.listing_id && o.status === 'pending');
    if (isDuplicate) return { error: 'duplicate' };
    const newOrder = { id: "ord_" + Math.random().toString(36).substr(2, 9), date_created: new Date().toISOString(), status: "pending", pickup_date: null, ...orderData };
    currentList.unshift(newOrder);
    saveOrders(currentList);
    return newOrder;
}
function getOrdersByBuyer(buyerId = "user_current") { return getOrders().filter(o => o.buyer_id === buyerId); }
function getOrdersBySeller(sellerId = "user_current") { return getOrders().filter(o => o.seller_id === sellerId); }
function updateOrderStatus(orderId, newStatus, pickupDate = null) {
    const currentList = getOrders();
    const index = currentList.findIndex(i => i.id === orderId);
    if (index !== -1) { currentList[index].status = newStatus; if (pickupDate) currentList[index].pickup_date = pickupDate; saveOrders(currentList); return currentList[index]; }
    return null;
}
function deleteOrder(orderId) { saveOrders(getOrders().filter(i => i.id !== orderId)); }

// ─── MESSAGES (localStorage — Phase 4) ────────────────────

const DEFAULT_MESSAGES = [
    { id: "msg_001", from: "seller_gv", to: "user_current", listingId: "prod_001", text: "Hi! I noticed you were interested in our stock. Are you looking for immediate delivery or warehouse pickup?", timestamp: "2026-05-01T10:30:00Z" },
    { id: "msg_002", from: "user_current", to: "seller_gv", listingId: "prod_001", text: "Warehouse pickup works best for us. We have a truck nearby on Thursday.", timestamp: "2026-05-01T10:35:00Z" }
];

function getMessages() {
    const saved = localStorage.getItem('backhouse_messages');
    if (!saved) { localStorage.setItem('backhouse_messages', JSON.stringify(DEFAULT_MESSAGES)); return DEFAULT_MESSAGES; }
    return JSON.parse(saved);
}
function saveMessages(messages) { localStorage.setItem('backhouse_messages', JSON.stringify(messages)); }
function sendMessage(fromId, toId, text, listingId = null) {
    const messages = getMessages();
    const newMessage = { id: "msg_" + Date.now(), from: fromId, to: toId, listingId, text, timestamp: new Date().toISOString() };
    messages.push(newMessage);
    saveMessages(messages);
    return newMessage;
}

// ─── RATINGS (localStorage — Phase 5) ─────────────────────

const DEFAULT_RATINGS = [
    { id: "rat_001", type: "received", businessName: "EcoLogic Logistics Ltd.", image: null, stars: 5, date: "2023-10-24T10:00:00Z" },
    { id: "rat_002", type: "received", businessName: "Urban Refurb Co.", image: null, stars: 4, date: "2023-10-18T14:30:00Z" },
    { id: "rat_003", type: "given", businessName: "Iron & Steel Refurb", image: null, stars: 5, date: "2023-11-01T10:00:00Z" }
];

function getRatings() {
    const stored = localStorage.getItem('backhouse_ratings');
    if (!stored) { localStorage.setItem('backhouse_ratings', JSON.stringify(DEFAULT_RATINGS)); return DEFAULT_RATINGS; }
    return JSON.parse(stored);
}
function saveRatings(ratings) { localStorage.setItem('backhouse_ratings', JSON.stringify(ratings)); }
function addRating(type, businessName, stars, image = null) {
    const ratings = getRatings();
    const newRating = { id: "rat_" + Date.now(), type, businessName, image, stars: parseFloat(stars), date: new Date().toISOString() };
    ratings.unshift(newRating);
    saveRatings(ratings);
    return newRating;
}
function submitSellerRating(sellerName, newRating) {}
