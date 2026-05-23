/* ═══════════════════════════════════════════════════════
   BackHouse — Messages Page (Phase 4: real API)
   Depends on messaging-data.js (loaded before this)
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialConvId = urlParams.get('conversation') || urlParams.get('id');
    const recipientId = urlParams.get('to');
    const listingRef = urlParams.get('ref');

    const chatListContainer = document.querySelector('.chat-list');
    const chatFeed = document.querySelector('.chat-window__feed');
    const chatHeader = document.querySelector('.chat-window__header');
    const inputField = document.querySelector('.chat-input-box__field');
    const sendBtn = document.querySelector('.btn-send');

    let conversations = [];
    let activeConvo = null;   // the currently open conversation object

    // ─── Init ───────────────────────────────────────────
    console.log('[Messages] init params:', { initialConvId, recipientId, listingRef });
    await loadConversations();
    console.log('[Messages] loaded', conversations.length, 'conversations');

    // If we came in with ?to=X or ?conversation=Y, route accordingly
    if (initialConvId) {
        // First try the cached list...
        let convo = conversations.find(c => String(c.id) === String(initialConvId));
        // ...if not there (just-created conversation), fetch it directly
        if (!convo && typeof getConversationById === 'function') {
            convo = await getConversationById(initialConvId);
            // Refresh the sidebar so the new convo shows up there too
            if (convo) await loadConversations();
        }
        if (convo) {
            await openConversation(convo);
        } else {
            console.warn('[Messages] Could not find conversation', initialConvId);
            await uiAlert({
                type: 'error',
                title: 'Conversation not found',
                message: 'This chat may have been deleted, or you don\'t have access to it.',
            });
        }
    } else if (recipientId) {
        // Start (or find) a conversation with the given recipient
        try {
            const convo = await startConversation({
                recipient: parseInt(recipientId),
                listing: listingRef ? parseInt(listingRef) : null,
            });
            if (convo) {
                await loadConversations();
                const fresh = conversations.find(c => c.id === convo.id) || convo;
                await openConversation(fresh);
            }
        } catch (err) {
            console.error('[Messages] Could not start conversation:', err);
            const fields = err?.error?.fields || {};
            const msg = Object.values(fields).flat().join('\n')
                || err?.error?.message
                || 'You may need to log in first, or you cannot message yourself.';
            await uiAlert({
                type: 'error',
                title: 'Could not start chat',
                message: msg,
            });
        }
    } else if (conversations.length > 0) {
        await openConversation(conversations[0]);
    }

    // ─── 1. Load conversation list (left panel) ─────────
    async function loadConversations() {
        const result = await getConversations();
        conversations = result.data;
        renderChatList();
    }

    function renderChatList() {
        if (!chatListContainer) return;
        chatListContainer.innerHTML = '';

        if (conversations.length === 0) {
            chatListContainer.innerHTML = `
                <li style="padding:2rem; text-align:center; color:#666; list-style:none;">
                    No conversations yet.
                </li>`;
            return;
        }

        conversations.forEach(c => {
            const isActive = activeConvo && activeConvo.id === c.id;
            const last = c.last_message;
            const preview = last ? last.body : 'No messages yet';
            const time = c.last_message_at ? formatTime(c.last_message_at) : '';

            const li = document.createElement('li');
            li.className = 'chat-card' + (isActive ? ' chat-card--active' : '');
            li.innerHTML = `
                <div class="chat-card__avatar">
                    ${c.other_party_avatar
                        ? `<img src="${c.other_party_avatar}" alt="${c.other_party_name}" class="chat-card__avatar-img">`
                        : `<div class="chat-card__initials">${c.other_party_initials || '??'}</div>`}
                </div>
                <div class="chat-card__content">
                    <div class="chat-card__header">
                        <span class="chat-card__name">${c.other_party_name}</span>
                        <span class="chat-card__time">${time}</span>
                    </div>
                    <div class="chat-card__ref">${c.listing_name ? 'Ref: ' + c.listing_name : ''}</div>
                    <div class="chat-card__preview" style="${c.unread_count ? 'font-weight:600; color:#1a1a1a;' : ''}">${escapeHtml(preview)}</div>
                </div>
                ${c.unread_count
                    ? `<span style="background:#10b981; color:#fff; font-size:0.7rem; padding:0.15rem 0.5rem; border-radius:999px; font-weight:700;">${c.unread_count}</span>`
                    : ''}
            `;
            li.onclick = () => openConversation(c);
            chatListContainer.appendChild(li);
        });
    }

    // ─── 2. Open & render a conversation ────────────────
    async function openConversation(convo) {
        activeConvo = convo;
        renderHeader(convo);
        await renderFeed(convo.id);
        renderChatList();
        setInputEnabled(true);
        if (convo.unread_count) convo.unread_count = 0;
    }

    /** Visually highlight the chat input — kept always enabled for typing,
     *  but Send will prompt for a recipient if no conversation is active. */
    function setInputEnabled(enabled) {
        if (inputField) {
            inputField.disabled = false;  // always allow typing
            inputField.placeholder = enabled
                ? 'Type your message...'
                : 'Type your message…';
        }
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.style.opacity = '1';
            sendBtn.style.cursor = 'pointer';
        }
    }
    setInputEnabled(false);

    function renderHeader(convo) {
        if (!chatHeader) return;
        chatHeader.innerHTML = `
            <div class="chat-window__user-info">
                ${convo.other_party_avatar
                    ? `<img src="${convo.other_party_avatar}" alt="${convo.other_party_name}" class="chat-window__avatar">`
                    : `<div class="message__initials" style="width:40px; height:40px; font-size:1rem;">${convo.other_party_initials || '??'}</div>`}
                <div class="chat-window__name-group">
                    <div class="chat-window__name-row">
                        <span class="chat-window__name">${convo.other_party_name}</span>
                        ${convo.listing_name ? `<span class="chat-window__role">${convo.listing_name}</span>` : ''}
                    </div>
                    <span class="chat-window__status-text">Online · BackHouse partner</span>
                </div>
            </div>
            <div class="chat-window__actions">
                ${convo.listing
                    ? `<button class="btn-view-listing" id="btn-view-listing">
                         <span class="material-symbols-outlined" style="font-size:1.125rem;">visibility</span> View Listing
                       </button>`
                    : ''}
                <div class="chat-menu-wrap" style="position:relative;">
                    <button class="btn-icon-only" id="btn-chat-menu" aria-label="More options">
                        <span class="material-symbols-outlined">more_vert</span>
                    </button>
                    <div class="chat-menu" id="chat-menu" hidden>
                        <button class="chat-menu__item" data-action="mark-unread">
                            <span class="material-symbols-outlined">mark_email_unread</span> Mark as unread
                        </button>
                        <hr style="border:none; border-top:1px solid #eee; margin:0.25rem 0;">
                        <button class="chat-menu__item chat-menu__item--danger" data-action="delete">
                            <span class="material-symbols-outlined">delete</span> Delete conversation
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Reliable click handler (replaces inline onclick — works even when the template has nested quotes)
        const viewBtn = document.getElementById('btn-view-listing');
        if (viewBtn && convo.listing) {
            viewBtn.addEventListener('click', () => {
                window.location.href = `listing-detail.html?id=${convo.listing}`;
            });
        }

        // ─── Three-dot menu ────────────────────────────
        const menuBtn = document.getElementById('btn-chat-menu');
        const menu = document.getElementById('chat-menu');
        if (menuBtn && menu) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.hidden = !menu.hidden;
            });
            document.addEventListener('click', (e) => {
                if (!menu.hidden && !menu.contains(e.target) && e.target !== menuBtn) {
                    menu.hidden = true;
                }
            });

            menu.querySelectorAll('.chat-menu__item').forEach(item => {
                item.addEventListener('click', async () => {
                    menu.hidden = true;
                    const action = item.dataset.action;

                    if (action === 'mark-unread') {
                        const ok = await markConversationUnread(convo.id);
                        if (ok) {
                            await uiAlert({
                                type: 'success',
                                title: 'Marked as unread',
                                message: 'You can come back to this later.',
                            });
                            await loadConversations();
                        }

                    } else if (action === 'delete') {
                        const ok = await uiConfirm({
                            title: 'Delete conversation?',
                            message: `This will permanently remove all messages with ${convo.other_party_name}. The other party will also lose access.`,
                            confirmText: 'Delete',
                            cancelText: 'Keep',
                            danger: true,
                        });
                        if (!ok) return;
                        const deleted = await deleteConversation(convo.id);
                        if (deleted) {
                            activeConvo = null;
                            await loadConversations();
                            if (chatHeader) chatHeader.innerHTML = '';
                            if (chatFeed) chatFeed.innerHTML = '<div style="padding:3rem; text-align:center; color:#888;">Conversation deleted.</div>';
                        } else {
                            await uiAlert({ type: 'error', title: 'Could not delete', message: 'Please try again.' });
                        }
                    }
                });
            });
        }
    }

    async function renderFeed(convoId) {
        if (!chatFeed) return;
        chatFeed.innerHTML = '<div style="padding:2rem; text-align:center; color:#aaa;">Loading…</div>';

        const messages = await getMessages(convoId);
        chatFeed.innerHTML = '';

        // Date divider
        const dateDivider = document.createElement('div');
        dateDivider.className = 'chat-date-divider';
        dateDivider.innerHTML = '<span>CONVERSATION</span>';
        chatFeed.appendChild(dateDivider);

        // Listing context card (if convo is about a listing)
        if (activeConvo && activeConvo.listing_image) {
            const card = document.createElement('div');
            card.className = 'negotiation-card';
            card.innerHTML = `
                <img src="${activeConvo.listing_image}" alt="${activeConvo.listing_name}" class="negotiation-card__image">
                <div class="negotiation-card__details">
                    <div class="negotiation-card__status">Discussing</div>
                    <h4 class="negotiation-card__title">${activeConvo.listing_name}</h4>
                </div>
                <span class="material-symbols-outlined" style="color: var(--color-secondary);">chevron_right</span>
            `;
            card.onclick = () => window.location.href = `listing-detail.html?id=${activeConvo.listing}`;
            chatFeed.appendChild(card);
        }

        if (messages.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding:2rem; text-align:center; color:#888;';
            empty.textContent = 'No messages yet. Say hello!';
            chatFeed.appendChild(empty);
        }

        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = `message ${msg.is_mine ? 'message--sent' : 'message--received'}`;

            // Image messages: body is a data: URL → render <img>; otherwise escape as text
            const isImage = typeof msg.body === 'string' && msg.body.startsWith('data:image/');
            const bubbleContent = isImage
                ? `<img src="${msg.body}" alt="Sent image">`
                : escapeHtml(msg.body);

            div.innerHTML = `
                ${!msg.is_mine ? `<div class="message__initials">${msg.sender_initials || '??'}</div>` : ''}
                <div class="message__content">
                    <div class="message__bubble">${bubbleContent}</div>
                    <div class="message__meta">
                        <span>${formatTime(msg.created_at)}</span>
                        ${msg.is_mine
                            ? `<span class="material-symbols-outlined" style="font-size:0.875rem; color:${msg.read_at ? '#10b981' : '#999'};">done_all</span>`
                            : ''}
                    </div>
                </div>
            `;
            chatFeed.appendChild(div);
        });

        chatFeed.scrollTop = chatFeed.scrollHeight;
    }

    // ─── 3. Send message ────────────────────────────────
    if (sendBtn) {
        sendBtn.onclick = async () => {
            const text = inputField.value.trim();
            if (!text) return;
            const original = sendBtn.innerHTML;
            sendBtn.disabled = true;
            try {
                // If no active convo yet but we have a recipientId from URL,
                // create one on-the-fly and send the message in a single call.
                if (!activeConvo && recipientId) {
                    const convo = await startConversation({
                        recipient: parseInt(recipientId),
                        listing: listingRef ? parseInt(listingRef) : null,
                        body: text,
                    });
                    inputField.value = '';
                    await loadConversations();
                    const fresh = conversations.find(c => c.id === convo.id) || convo;
                    await openConversation(fresh);
                    return;
                }
                if (!activeConvo) {
                    await uiAlert({ type: 'info', message: 'Pick a conversation on the left first, or open a chat from a listing.' });
                    return;
                }
                await sendMessageApi(activeConvo.id, text);
                inputField.value = '';
                await renderFeed(activeConvo.id);
                await loadConversations();
                const fresh = conversations.find(c => c.id === activeConvo.id);
                if (fresh) activeConvo = fresh;
            } catch (err) {
                const fields = err?.error?.fields || {};
                const msg = Object.values(fields).flat().join('\n')
                    || err?.error?.message || 'Please try again.';
                await uiAlert({
                    type: 'error',
                    title: 'Message not sent',
                    message: msg,
                });
            } finally {
                sendBtn.disabled = false;
                sendBtn.innerHTML = original;
            }
        };
    }

    // Enter to send (without Shift)
    if (inputField) {
        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn?.click();
            }
        });
    }

    // ─── Chat input tools (templates / emoji / image) ───
    setupChatTools();

    function setupChatTools() {
        const templates = [
            "Hi! Is this still available?",
            "Can you tell me more about pickup logistics?",
            "Would you accept a slightly lower price?",
            "Great, I'll come by at the scheduled time. Thank you!",
        ];
        const emojis = ['😀','😄','😊','😍','🤗','👍','👌','🙏','🙌','🤝','💪','🔥','✨','💯','✅','❌','⚠️','📦','📅','🕐','⏰','💰','💵','🛒','🎉','❤️','💚','💛','😢','😅','🤔','👀'];

        const tmplBtn = document.getElementById('tool-templates');
        const tmplPopup = document.getElementById('popup-templates');
        const emojiBtn = document.getElementById('tool-emoji');
        const emojiPopup = document.getElementById('popup-emoji');
        const imageBtn = document.getElementById('tool-image');
        const imageInput = document.getElementById('image-file-input');

        // Populate templates
        if (tmplPopup) {
            templates.forEach(text => {
                const b = document.createElement('button');
                b.textContent = text;
                b.addEventListener('click', () => {
                    insertAtCursor(inputField, text);
                    tmplPopup.hidden = true;
                    inputField.focus();
                });
                tmplPopup.appendChild(b);
            });
        }

        // Populate emojis
        if (emojiPopup) {
            emojis.forEach(e => {
                const b = document.createElement('button');
                b.textContent = e;
                b.addEventListener('click', () => {
                    insertAtCursor(inputField, e);
                    emojiPopup.hidden = true;
                    inputField.focus();
                });
                emojiPopup.appendChild(b);
            });
        }

        const toggle = (popup, btn) => {
            // Close other popups first
            [tmplPopup, emojiPopup].forEach(p => { if (p && p !== popup) p.hidden = true; });
            if (popup) popup.hidden = !popup.hidden;
        };

        tmplBtn?.addEventListener('click', (e) => { e.stopPropagation(); toggle(tmplPopup, tmplBtn); });
        emojiBtn?.addEventListener('click', (e) => { e.stopPropagation(); toggle(emojiPopup, emojiBtn); });

        // Close popups when clicking outside
        document.addEventListener('click', (e) => {
            if (tmplPopup && !tmplPopup.hidden && !tmplPopup.contains(e.target) && e.target !== tmplBtn) {
                tmplPopup.hidden = true;
            }
            if (emojiPopup && !emojiPopup.hidden && !emojiPopup.contains(e.target) && e.target !== emojiBtn) {
                emojiPopup.hidden = true;
            }
        });

        // Image upload — convert to data URL and send as a message
        imageBtn?.addEventListener('click', () => imageInput?.click());
        imageInput?.addEventListener('change', async () => {
            const file = imageInput.files[0];
            imageInput.value = '';
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                await uiAlert({ type: 'error', title: 'Not an image', message: 'Please select an image file.' });
                return;
            }
            if (file.size > 500 * 1024) {
                await uiAlert({ type: 'warning', title: 'Image too large',
                    message: 'Please choose an image under 500 KB. (Larger uploads coming soon.)' });
                return;
            }
            if (!activeConvo) {
                await uiAlert({ type: 'info', message: 'Open a conversation first.' });
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                const dataUrl = e.target.result;
                try {
                    await sendMessageApi(activeConvo.id, dataUrl);
                    await renderFeed(activeConvo.id);
                    await loadConversations();
                } catch (err) {
                    await uiAlert({
                        type: 'error',
                        title: 'Image not sent',
                        message: err?.error?.message || 'Please try again.',
                    });
                }
            };
            reader.readAsDataURL(file);
        });
    }

    /** Insert text at the textarea's caret position. */
    function insertAtCursor(textarea, text) {
        if (!textarea) return;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const before = textarea.value.slice(0, start);
        const after = textarea.value.slice(end);
        textarea.value = before + text + after;
        const pos = start + text.length;
        textarea.setSelectionRange(pos, pos);
    }

    // ─── helpers ────────────────────────────────────────
    function formatTime(iso) {
        const d = new Date(iso);
        const now = new Date();
        const sameDay = d.toDateString() === now.toDateString();
        return sameDay
            ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
    }
});
