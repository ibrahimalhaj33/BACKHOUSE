/**
 * Global Notifications dropdown
 *
 * Wires the bell icon (.dashboard-header__btn[aria-label="Notifications"])
 * on every page. Aggregates real signals from the API:
 *   - New pending orders (as seller)
 *   - Unread messages
 *   - Recent ratings received
 *   - Listings expiring soon
 *
 * Auto-loaded by app.js.
 */

(function () {
    // Wait for DOM + global helpers, then run once.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        const bell = document.querySelector('.dashboard-header__btn[aria-label="Notifications"]');
        if (!bell) return;
        if (bell.dataset.notifWired) return;     // run once per page
        bell.dataset.notifWired = '1';

        // Build dropdown container (positioned relative to the bell)
        const wrap = document.createElement('div');
        wrap.id = 'notifications-wrap';
        wrap.style.cssText = 'position:relative; display:inline-block;';
        bell.parentNode.insertBefore(wrap, bell);
        wrap.appendChild(bell);

        const dropdown = document.createElement('div');
        dropdown.id = 'notifications-dropdown';
        dropdown.hidden = true;
        dropdown.style.cssText = `
            position:absolute; top:calc(100% + 0.5rem); right:0;
            width:380px; max-width:90vw; max-height:520px; overflow-y:auto;
            background:#fff; border:1px solid rgba(0,0,0,0.08);
            border-radius:14px; box-shadow:0 12px 32px rgba(0,0,0,0.15);
            padding:0; z-index:9999;
        `;
        wrap.appendChild(dropdown);

        // Toggle on bell click
        bell.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (dropdown.hidden) {
                dropdown.hidden = false;
                await loadNotifications();
            } else {
                dropdown.hidden = true;
            }
        });

        // When user clicks a notification link, mark it as seen before navigating
        dropdown.addEventListener('click', async (e) => {
            const link = e.target.closest('[data-notif-id]');
            if (link) {
                markSeen(link.dataset.notifId);
                return; // browser will navigate via the <a> href
            }
            const markAll = e.target.closest('#notif-mark-all-read');
            if (markAll) {
                e.preventDefault();
                const items = await gather();
                items.forEach(n => markSeen(n.id));
                await loadNotifications();   // re-render to show all as read
            }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.hidden && !wrap.contains(e.target)) {
                dropdown.hidden = true;
            }
        });

        // Auto-refresh the badge on page load + every 60 sec
        refreshBadge();
        setInterval(refreshBadge, 60000);

        async function refreshBadge() {
            const items = await gather();
            const unseen = items.filter(n => !n.seen).length;
            updateBadge(bell, unseen);
        }

        async function loadNotifications() {
            dropdown.innerHTML = `
                <div style="padding:1rem; text-align:center; color:#888; font-size:0.85rem;">
                    Loading…
                </div>`;
            const items = await gather();
            renderDropdown(dropdown, items);
            const unseen = items.filter(n => !n.seen).length;
            updateBadge(bell, unseen);
        }
    }

    // ─── Per-user "seen" tracking in localStorage ─────────
    const SEEN_KEY = 'notifications_seen';
    function getSeen() {
        try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); }
        catch (_) { return new Set(); }
    }
    function markSeen(id) {
        const set = getSeen();
        set.add(id);
        localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
    }

    // ─── Aggregate notifications from the API ──────────────
    async function gather() {
        const notifications = [];

        // Pending orders (as seller)
        if (typeof getMySales === 'function') {
            try {
                const res = await getMySales({ status: 'pending', page_size: 5 });
                (res.data || []).forEach(o => {
                    notifications.push({
                        id: `order-${o.id}`,
                        type: 'order',
                        icon: 'shopping_cart',
                        color: '#f59e0b',
                        title: 'New order request',
                        text: `${o.buyer_name} wants to buy ${o.quantity} × ${o.listing_name}`,
                        time: o.created_at,
                        link: 'sales-seller.html',
                    });
                });
            } catch (_) {}
        }

        // Unread messages — id includes the count so it auto-resets when count changes
        if (typeof getUnreadCount === 'function') {
            try {
                const count = await getUnreadCount();
                if (count > 0) {
                    notifications.push({
                        id: `messages-${count}`,
                        type: 'message',
                        icon: 'mark_email_unread',
                        color: '#3b82f6',
                        title: `${count} new message${count !== 1 ? 's' : ''}`,
                        text: 'Open Messages to read your latest chats.',
                        time: new Date().toISOString(),
                        link: 'messages.html',
                    });
                }
            } catch (_) {}
        }

        // Recent ratings received (last 7 days)
        if (typeof getRatings === 'function') {
            try {
                const res = await getRatings('received');
                const recent = (res.data || []).filter(r => {
                    const ageDays = (Date.now() - new Date(r.created_at).getTime()) / 86400000;
                    return ageDays <= 7;
                }).slice(0, 5);
                recent.forEach(r => {
                    notifications.push({
                        id: `rating-${r.id}`,
                        type: 'rating',
                        icon: 'star',
                        color: '#f59e0b',
                        title: `${r.rater_name} rated you ${r.stars}★`,
                        text: r.comment
                            ? `"${r.comment.slice(0, 80)}${r.comment.length > 80 ? '…' : ''}"`
                            : `For order: ${r.listing_name || 'a completed order'}`,
                        time: r.created_at,
                        link: 'ratings.html',
                    });
                });
            } catch (_) {}
        }

        // Listings expiring soon (next 3 days) — include days in id so changes re-surface it
        if (typeof getMyListings === 'function') {
            try {
                const res = await getMyListings({ expiry_days: 3, status: 'Active', page_size: 5 });
                (res.data || []).forEach(l => {
                    notifications.push({
                        id: `expiring-${l.id}-${l.expiryDays}`,
                        type: 'expiring',
                        icon: 'schedule',
                        color: '#ef4444',
                        title: `${l.name} expires soon`,
                        text: `Only ${l.expiryDays || 0} day${l.expiryDays !== 1 ? 's' : ''} left — review or extend.`,
                        time: l.created_at,
                        link: `edit-listing.html?id=${l.id}`,
                    });
                });
            } catch (_) {}
        }

        notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

        // Annotate each with a "seen" flag based on localStorage
        const seen = getSeen();
        notifications.forEach(n => { n.seen = seen.has(n.id); });

        return notifications;
    }

    function renderDropdown(dropdown, items) {
        const unseenCount = items.filter(n => !n.seen).length;
        // Header
        let html = `
            <div style="padding:0.85rem 1rem; border-bottom:1px solid #f3f4f6; display:flex; align-items:center; justify-content:space-between;">
                <h4 style="margin:0; font-size:0.95rem; font-weight:700;">Notifications</h4>
                ${unseenCount > 0
                    ? `<span style="background:#10b981; color:#fff; font-size:0.65rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:999px;">${unseenCount} new</span>`
                    : `<span style="font-size:0.7rem; color:#10b981; font-weight:600;">✓ Caught up</span>`}
            </div>`;

        if (items.length === 0) {
            html += `
                <div style="padding:2.5rem 1rem; text-align:center; color:#888;">
                    <span class="material-symbols-outlined" style="font-size:2.5rem; color:#ddd;">notifications</span>
                    <p style="margin:0.5rem 0 0 0; font-size:0.85rem;">You're all caught up.</p>
                </div>`;
        } else {
            html += '<div>';
            items.forEach((n, i) => {
                const bgUnseen = n.seen ? '#fff' : '#f0fdf4';   // soft green tint for unread
                const dotHtml = n.seen
                    ? ''
                    : `<span style="position:absolute; top:50%; right:1rem; transform:translateY(-50%); width:8px; height:8px; border-radius:50%; background:#10b981;"></span>`;

                html += `
                    <a href="${n.link}" data-notif-id="${escapeHtml(n.id)}"
                       style="position:relative; display:flex; gap:0.75rem; padding:0.75rem 1rem; border-bottom:${i === items.length - 1 ? 'none' : '1px solid #f3f4f6'}; text-decoration:none; color:inherit; transition:background 0.12s; background:${bgUnseen};"
                       onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='${bgUnseen}'">
                        <div style="width:36px; height:36px; border-radius:50%; background:${n.color}1f; color:${n.color}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            <span class="material-symbols-outlined" style="font-size:1.15rem;">${n.icon}</span>
                        </div>
                        <div style="flex:1; min-width:0; padding-right:1rem;">
                            <div style="font-weight:${n.seen ? '500' : '700'}; font-size:0.85rem; color:#111827;">${escapeHtml(n.title)}</div>
                            <div style="font-size:0.75rem; color:#6b7280; line-height:1.35; margin-top:0.15rem;">${escapeHtml(n.text)}</div>
                            <div style="font-size:0.7rem; color:#9ca3af; margin-top:0.2rem;">${timeAgo(n.time)}</div>
                        </div>
                        ${dotHtml}
                    </a>`;
            });
            html += '</div>';
        }

        // Add a "Mark all as read" footer if there are unseen items
        const unseen = items.filter(n => !n.seen);
        if (unseen.length > 0) {
            html += `
                <button id="notif-mark-all-read"
                        style="width:100%; padding:0.75rem; border:none; border-top:1px solid #f3f4f6; background:#fff; color:#10b981; font-weight:600; font-size:0.8rem; cursor:pointer; transition:background 0.12s;"
                        onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='#fff'">
                    Mark all as read
                </button>`;
        }

        dropdown.innerHTML = html;
    }

    function updateBadge(bell, count) {
        // Ensure the bell itself is positioned so the badge can anchor on it
        if (getComputedStyle(bell).position === 'static') {
            bell.style.position = 'relative';
        }

        // Inject keyframes once (subtle ping animation on the badge)
        if (!document.getElementById('notif-badge-keyframes')) {
            const style = document.createElement('style');
            style.id = 'notif-badge-keyframes';
            style.textContent = `
                @keyframes notif-badge-pop {
                    0%   { transform: scale(0.6); opacity: 0; }
                    70%  { transform: scale(1.15); opacity: 1; }
                    100% { transform: scale(1); }
                }
                @keyframes notif-badge-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.55); }
                    70%      { box-shadow: 0 0 0 7px rgba(239, 68, 68, 0); }
                }
                .notif-badge {
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    min-width: 18px;
                    height: 18px;
                    padding: 0 5px;
                    border-radius: 9px;
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: #fff;
                    font-size: 0.65rem;
                    font-weight: 700;
                    line-height: 1;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 6px rgba(239, 68, 68, 0.35), 0 0 0 2px #fff;
                    z-index: 2;
                    pointer-events: none;
                    animation: notif-badge-pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), notif-badge-pulse 2s ease-in-out 0.5s infinite;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    letter-spacing: -0.02em;
                }
            `;
            document.head.appendChild(style);
        }

        // Remove the static red dot if it exists (replace with our richer badge)
        const staticDot = bell.querySelector('.dashboard-header__dot:not(.notif-badge)');
        if (staticDot) staticDot.style.display = 'none';

        let badge = bell.querySelector('.notif-badge');
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'notif-badge';
                bell.appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = '';
        } else if (badge) {
            badge.style.display = 'none';
        }
    }

    function timeAgo(iso) {
        const diff = (Date.now() - new Date(iso).getTime()) / 1000;
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
        return new Date(iso).toLocaleDateString([], { month:'short', day:'numeric' });
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }
})();
