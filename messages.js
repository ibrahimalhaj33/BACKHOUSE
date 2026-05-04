// ═══════════════════════════════════════════════════════
// BackHouse — Messages Page Logic
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('to');
    const listingRef = urlParams.get('ref');
    
    // In a real app, this would be the authenticated user's ID
    // For our mock, we check if we are on the seller or buyer dashboard recently
    // Defaulting to Marcus Chen (buyer) for demonstration
    const currentUser = {
        id: "user_current",
        name: "Marcus Chen",
        initials: "MC"
    };

    const chatListContainer = document.querySelector('.chat-list');
    const chatFeed = document.querySelector('.chat-window__feed');
    const chatHeader = document.querySelector('.chat-window__header');
    const inputField = document.querySelector('.chat-input-box__field');
    const sendBtn = document.querySelector('.btn-send');

    // 1. Initial Render
    init();

    function init() {
        renderChatList();
        if (targetId) {
            loadConversation(targetId, listingRef);
        } else {
            // Load the most recent conversation if no target specified
            const allMessages = getMessages();
            if (allMessages.length > 0) {
                const mostRecent = allMessages[allMessages.length - 1];
                const otherParty = mostRecent.from === currentUser.id ? mostRecent.to : mostRecent.from;
                loadConversation(otherParty, mostRecent.listingId);
            }
        }
    }

    // 2. Render Chat List (Left Panel)
    function renderChatList() {
        const messages = getMessages();
        const chatListContainer = document.querySelector('.chat-list');
        chatListContainer.innerHTML = '';

        // Group messages by conversation (other party ID)
        const conversations = {};
        messages.forEach(msg => {
            const otherPartyId = msg.from === currentUser.id ? msg.to : msg.from;
            if (!conversations[otherPartyId] || new Date(msg.timestamp) > new Date(conversations[otherPartyId].lastMessage.timestamp)) {
                conversations[otherPartyId] = {
                    lastMessage: msg,
                    otherPartyId: otherPartyId
                };
            }
        });

        // Convert to array and sort by latest
        const sortedConvos = Object.values(conversations).sort((a, b) => 
            new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp)
        );

        sortedConvos.forEach(convo => {
            const otherParty = findUserById(convo.otherPartyId);
            if (!otherParty) return;

            const isActive = convo.otherPartyId === targetId ? 'chat-card--active' : '';
            const lastMsg = convo.lastMessage;
            
            const li = document.createElement('li');
            li.className = `chat-card ${isActive}`;
            li.innerHTML = `
                <div class="chat-card__avatar">
                    ${otherParty.avatar ? 
                        `<img src="${otherParty.avatar}" alt="${otherParty.name}" class="chat-card__avatar-img">` :
                        `<div class="chat-card__initials">${otherParty.initials || otherParty.name.substring(0,2).toUpperCase()}</div>`
                    }
                </div>
                <div class="chat-card__content">
                    <div class="chat-card__header">
                        <span class="chat-card__name">${otherParty.name}</span>
                        <span class="chat-card__time">${formatTime(lastMsg.timestamp)}</span>
                    </div>
                    <div class="chat-card__ref">${lastMsg.listingId ? 'Ref: ' + (getListingById(lastMsg.listingId)?.name || 'Product') : ''}</div>
                    <div class="chat-card__preview">${lastMsg.text}</div>
                </div>
            `;
            li.onclick = () => window.location.href = `messages.html?to=${convo.otherPartyId}${lastMsg.listingId ? '&ref=' + lastMsg.listingId : ''}`;
            chatListContainer.appendChild(li);
        });
    }

    // 3. Load Conversation (Right Panel)
    function loadConversation(otherId, listingId) {
        const otherParty = findUserById(otherId);
        if (!otherParty) return;

        // Update Header
        chatHeader.innerHTML = `
            <div class="chat-window__user-info">
                ${otherParty.avatar ? 
                    `<img src="${otherParty.avatar}" alt="${otherParty.name}" class="chat-window__avatar">` :
                    `<div class="message__initials" style="width:40px; height:40px; font-size: 1rem;">${otherParty.initials}</div>`
                }
                <div class="chat-window__name-group">
                    <div class="chat-window__name-row">
                        <span class="chat-window__name">${otherParty.name}</span>
                        <span class="chat-window__role">${otherParty.role || 'Partner'}</span>
                    </div>
                    <span class="chat-window__status-text">Online • Active on BackHouse</span>
                </div>
            </div>
            <div class="chat-window__actions">
                ${listingId ? `
                    <button class="btn-view-listing" onclick="window.location.href='browse-dash.html?highlight=${listingId}'">
                        <span class="material-symbols-outlined" style="font-size: 1.125rem;">visibility</span>
                        View Listing
                    </button>
                ` : ''}
                <button class="btn-icon-only"><span class="material-symbols-outlined">more_vert</span></button>
            </div>
        `;

        // Render Feed
        renderFeed(otherId, listingId);
    }

    function renderFeed(otherId, listingId) {
        const allMessages = getMessages();
        const convoMessages = allMessages.filter(msg => 
            (msg.from === currentUser.id && msg.to === otherId) || 
            (msg.from === otherId && msg.to === currentUser.id)
        );

        chatFeed.innerHTML = '';
        
        // Date divider for demonstration
        const dateDivider = document.createElement('div');
        dateDivider.className = 'chat-date-divider';
        dateDivider.innerHTML = '<span>TODAY</span>';
        chatFeed.appendChild(dateDivider);

        convoMessages.forEach((msg, index) => {
            const isSent = msg.from === currentUser.id;
            const sender = isSent ? currentUser : findUserById(msg.from);
            
            const msgDiv = document.createElement('div');
            msgDiv.className = `message ${isSent ? 'message--sent' : 'message--received'}`;
            
            msgDiv.innerHTML = `
                ${!isSent && sender.avatar ? `<img src="${sender.avatar}" class="message__avatar">` : ''}
                ${!isSent && !sender.avatar ? `<div class="message__initials">${sender.initials}</div>` : ''}
                <div class="message__content">
                    <div class="message__bubble">
                        ${msg.text}
                    </div>
                    <div class="message__meta">
                        <span>${formatTime(msg.timestamp)}</span>
                        ${isSent ? '<span class="material-symbols-outlined" style="font-size: 0.875rem; color: #10b981;">done_all</span>' : ''}
                    </div>
                </div>
            `;
            chatFeed.appendChild(msgDiv);

            // Inject Negotiation Card after the first message if it's a product discussion
            if (index === 0 && listingId) {
                const listing = getListingById(listingId);
                if (listing) {
                    const card = document.createElement('div');
                    card.className = 'negotiation-card';
                    card.innerHTML = `
                        <img src="${listing.image}" alt="${listing.name}" class="negotiation-card__image">
                        <div class="negotiation-card__details">
                            <div class="negotiation-card__status">Inquiry for Product</div>
                            <h4 class="negotiation-card__title">${listing.name}</h4>
                            <div class="negotiation-card__info">${listing.price} • ${listing.quantity} ${listing.unit} Available</div>
                        </div>
                        <span class="material-symbols-outlined" style="color: var(--color-secondary);">chevron_right</span>
                    `;
                    card.onclick = () => window.location.href = `browse-dash.html?highlight=${listingId}`;
                    chatFeed.appendChild(card);
                }
            }
        });

        // Scroll to bottom
        chatFeed.scrollTop = chatFeed.scrollHeight;
    }

    // 4. Send Message Logic
    sendBtn.onclick = () => {
        const text = inputField.value.trim();
        if (!text || !targetId) return;

        sendMessage(currentUser.id, targetId, text, listingRef);
        inputField.value = '';
        renderFeed(targetId, listingRef);
        renderChatList();
    };

    // Helper: Find User/Seller by ID (DYNAMIC)
    function findUserById(id) {
        if (id === 'user_current' || id === 'user_seller') return currentUser;
        
        // 1. Check orders (to find Buyer or Seller info)
        const orders = getOrders();
        const orderMatch = orders.find(o => o.seller_id === id || o.buyer_id === id);
        
        if (orderMatch) {
            // Determine if the target is a buyer or seller in this context
            const isSeller = orderMatch.seller_id === id;
            return {
                id: id,
                name: isSeller ? orderMatch.seller_name : orderMatch.buyer_name,
                avatar: isSeller ? orderMatch.listing_image : orderMatch.buyer_avatar, // Using listing image as placeholder for seller
                initials: isSeller ? orderMatch.seller_name.substring(0,2).toUpperCase() : orderMatch.buyer_name.substring(0,2).toUpperCase(),
                role: isSeller ? "Seller" : "Buyer"
            };
        }

        // 2. Check Listings (Fallback)
        const listings = getListings();
        const listingMatch = listings.find(l => l.seller_initials === id || l.id === id);
        if (listingMatch) {
            return {
                id: id,
                name: listingMatch.seller_name,
                avatar: listingMatch.image,
                initials: listingMatch.seller_initials,
                role: "Seller"
            };
        }

        // 3. Fallback for common mock IDs if data missing
        if (id === 'seller_gv') return { id: id, name: "Green Valley Farm", initials: "GV", role: "Seller", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150" };
        if (id === 'seller_db') return { id: id, name: "Daily Bread Co.", initials: "DB", role: "Seller", avatar: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=150&h=150" };

        return { id: id, name: "Unknown Partner", initials: "??", role: "Partner" };
    }

    // Helper: Format Time
    function formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
});
