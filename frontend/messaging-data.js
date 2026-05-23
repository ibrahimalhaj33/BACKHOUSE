/**
 * MESSAGING DATA MANAGER (Phase 4)
 * Talks to /api/conversations/. Depends on authFetch() from listings-data.js.
 */

const CONV_API = 'http://127.0.0.1:8000/api/conversations';

async function getConversations(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    try {
        const res = await authFetch(`${CONV_API}/${qs ? '?' + qs : ''}`);
        const body = await res.json();
        return {
            data: body.data || [],
            pagination: body.meta?.pagination || null,
        };
    } catch (e) {
        console.error('[API] getConversations failed:', e);
        return { data: [], pagination: null };
    }
}

async function getConversationById(id) {
    try {
        const res = await authFetch(`${CONV_API}/${id}/`);
        const body = await res.json();
        return body.data || null;
    } catch (e) {
        console.error('[API] getConversationById failed:', e);
        return null;
    }
}

async function getMessages(conversationId) {
    try {
        const res = await authFetch(`${CONV_API}/${conversationId}/messages/`);
        const body = await res.json();
        return body.data || [];
    } catch (e) {
        console.error('[API] getMessages failed:', e);
        return [];
    }
}

async function sendMessageApi(conversationId, body) {
    try {
        const res = await authFetch(`${CONV_API}/${conversationId}/messages/`, {
            method: 'POST',
            body: JSON.stringify({ body }),
        });
        const json = await res.json();
        if (!res.ok) throw json;
        return json.data;
    } catch (e) {
        console.error('[API] sendMessageApi failed:', e);
        throw e;
    }
}

async function startConversation({ recipient, listing = null, body = '' }) {
    try {
        const res = await authFetch(`${CONV_API}/`, {
            method: 'POST',
            body: JSON.stringify({ recipient, listing, body }),
        });
        const json = await res.json();
        if (!res.ok) throw json;
        return json.data;
    } catch (e) {
        console.error('[API] startConversation failed:', e);
        throw e;
    }
}

async function markConversationRead(conversationId) {
    try {
        const res = await authFetch(`${CONV_API}/${conversationId}/read/`, { method: 'POST' });
        return res.ok;
    } catch (e) {
        return false;
    }
}

async function markConversationUnread(conversationId) {
    try {
        const res = await authFetch(`${CONV_API}/${conversationId}/unread/`, { method: 'POST' });
        return res.ok;
    } catch (e) {
        return false;
    }
}

async function deleteConversation(conversationId) {
    try {
        const res = await authFetch(`${CONV_API}/${conversationId}/delete/`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        return false;
    }
}

async function getUnreadCount() {
    try {
        const res = await authFetch(`${CONV_API}/unread-count/`);
        const body = await res.json();
        return body.data?.unread_count ?? 0;
    } catch (e) {
        return 0;
    }
}
