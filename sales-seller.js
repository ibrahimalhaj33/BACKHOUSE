document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.sales-grid');
    if (!grid) return;

    // Find the stats card so we don't delete it
    const statsCard = grid.querySelector('.sales-stats');
    const feed = grid.querySelector('.sales-feed');
    const tabs = document.querySelectorAll('.sales-tabs__btn');
    
    let currentPage = 1;
    let currentTab = 'pending';
    const ITEMS_PER_PAGE = 2;

    function renderPendingOrders() {
        if (!feed) return;
        
        // Clear all current order cards and pagination
        feed.innerHTML = '';
        
        // Remove any lingering cards from previous direct grid insertions
        grid.querySelectorAll('.sales-card').forEach(card => card.remove());
        const oldPagination = grid.querySelector('.seller-pagination');
        if (oldPagination) oldPagination.remove();

        // Get orders where current user is the seller (we mock this by matching the ID we set in browse-dash.js)
        const orders = getOrdersBySeller('user_seller'); 
        
        // As per requirements, we render Pending orders
        const pendingOrders = orders.filter(o => o.status === 'pending');

        // Update the badge in the tab
        const badge = document.querySelector('.sales-tabs__btn--active .sales-tabs__badge') || document.querySelector('.sales-tabs__badge');
        if (badge && currentTab === 'pending') badge.textContent = pendingOrders.length;

        if (pendingOrders.length === 0) {
            // Render an empty state
            const emptyState = document.createElement('div');
            emptyState.className = 'sales-card';
            emptyState.innerHTML = `
                <div class="sales-card__content" style="display: flex; justify-content: center; align-items: center; padding: 4rem; color: var(--color-secondary); width: 100%;">
                    No pending orders at this time.
                </div>
            `;
            feed.appendChild(emptyState);
            return;
        }

        // Pagination Logic
        const totalPages = Math.ceil(pendingOrders.length / ITEMS_PER_PAGE);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageItems = pendingOrders.slice(startIndex, endIndex);

        // Render each pending order
        pageItems.forEach(order => {
            const card = document.createElement('div');
            card.className = 'sales-card';
            card.innerHTML = `
                <div class="sales-card__content">
                    <div class="sales-card__image-wrapper">
                        <img src="${order.listing_image || 'https://via.placeholder.com/400'}" alt="${order.listing_name}" class="sales-card__image">
                    </div>
                    <div class="sales-card__details">
                        <div class="sales-card__header">
                            <div>
                                <span class="sales-card__tag">Resource ID: ${order.listing_sku}</span>
                                <h3 class="sales-card__title">${order.listing_name}</h3>
                            </div>
                            <div class="sales-card__price-box">
                                <p class="sales-card__price">${order.price}</p>
                                <p class="sales-card__rate">${order.rate || ''}</p>
                            </div>
                        </div>
                        
                        <div class="sales-card__meta-grid">
                            <div class="sales-meta-box">
                                <span class="sales-meta-label">Buyer Details</span>
                                <div class="sales-meta-value">
                                    <span class="material-symbols-outlined" style="color: var(--color-secondary);">account_circle</span>
                                    <span class="sales-meta-text">${order.buyer_name}</span>
                                </div>
                            </div>
                            <div class="sales-meta-box">
                                <span class="sales-meta-label">Requested Date</span>
                                <div class="sales-meta-value">
                                    <span class="material-symbols-outlined" style="font-size: 1rem;">calendar_today</span>
                                    <span class="sales-meta-text">${new Date(order.date_created).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div class="sales-card__actions">
                            <button class="sales-btn-accept" data-order-id="${order.id}">
                                <span class="material-symbols-outlined">schedule_send</span> Accept & Schedule
                            </button>
                            <a href="messages.html?to=${order.buyer_id}&ref=${order.listing_id}" class="sales-btn-message" style="text-decoration: none; display: flex; align-items: center; gap: 8px; justify-content: center; background: var(--color-surface-container); color: var(--color-on-surface); border: 1px solid var(--color-outline-variant); padding: 8px 16px; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.875rem; transition: background 0.2s;">
                                <span class="material-symbols-outlined">chat_bubble</span> Message Buyer
                            </a>
                            <button class="sales-btn-reject" data-order-id="${order.id}">
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            `;
            feed.appendChild(card);
        });

        // Render Pagination UI
        if (totalPages > 1) {
            const paginationContainer = document.createElement('div');
            paginationContainer.className = 'seller-pagination';
            paginationContainer.style.cssText = 'display: flex; gap: 0.5rem; justify-content: center; align-items: center; width: 100%; margin-top: 1rem; margin-bottom: 2rem; height: max-content;';
            
            let pagesHtml = '';
            for (let i = 1; i <= totalPages; i++) {
                const isActive = i === currentPage ? 'background-color: var(--color-primary); color: white;' : 'background-color: var(--color-surface); color: var(--color-on-surface);';
                pagesHtml += `<button class="page-btn" data-page="${i}" style="border: 1px solid var(--color-outline); border-radius: 4px; padding: 0.5rem 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; height: max-content; ${isActive}">${i}</button>`;
            }

            paginationContainer.innerHTML = `
                <button class="page-btn-prev" ${currentPage === 1 ? 'disabled' : ''} style="border: 1px solid var(--color-outline); border-radius: 4px; padding: 0.5rem 1rem; cursor: pointer; background-color: var(--color-surface); height: max-content; opacity: ${currentPage === 1 ? '0.5' : '1'};"><span class="material-symbols-outlined" style="vertical-align: middle;">chevron_left</span></button>
                ${pagesHtml}
                <button class="page-btn-next" ${currentPage === totalPages ? 'disabled' : ''} style="border: 1px solid var(--color-outline); border-radius: 4px; padding: 0.5rem 1rem; cursor: pointer; background-color: var(--color-surface); height: max-content; opacity: ${currentPage === totalPages ? '0.5' : '1'};"><span class="material-symbols-outlined" style="vertical-align: middle;">chevron_right</span></button>
            `;
            feed.appendChild(paginationContainer);
        }
    }

    function renderConfirmedOrders() {
        if (!feed) return;
        
        feed.innerHTML = '';
        
        // Remove lingering
        grid.querySelectorAll('.sales-card').forEach(card => card.remove());
        const oldPagination = grid.querySelector('.seller-pagination');
        if (oldPagination) oldPagination.remove();

        const orders = getOrdersBySeller('user_seller'); 
        const confirmedOrders = orders.filter(o => o.status === 'confirmed');

        if (confirmedOrders.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'sales-card';
            emptyState.innerHTML = `
                <div class="sales-card__content" style="display: flex; justify-content: center; align-items: center; padding: 4rem; color: var(--color-secondary); width: 100%;">
                    No confirmed orders at this time.
                </div>
            `;
            feed.appendChild(emptyState);
            return;
        }

        const totalPages = Math.ceil(confirmedOrders.length / ITEMS_PER_PAGE);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageItems = confirmedOrders.slice(startIndex, endIndex);

        pageItems.forEach(order => {
            const card = document.createElement('div');
            card.className = 'sales-card';
            card.innerHTML = `
                <div class="sales-card__content">
                    <div class="sales-card__image-wrapper">
                        <img src="${order.listing_image || 'https://via.placeholder.com/400'}" alt="${order.listing_name}" class="sales-card__image">
                    </div>
                    <div class="sales-card__details">
                        <div class="sales-card__header">
                            <div>
                                <h3 class="sales-card__title">${order.listing_name}</h3>
                                <div class="sales-badge-group">
                                    <span class="sales-card__tag" style="margin-bottom: 0;">Resource ID: ${order.listing_sku}</span>
                                    <span class="sales-badge"><span class="material-symbols-outlined">account_circle</span> ${order.buyer_name}</span>
                                    <span class="sales-badge sales-badge--confirmed"><span class="material-symbols-outlined">check_circle</span> Confirmed</span>
                                </div>
                            </div>
                            <div class="sales-card__price-box">
                                <p class="sales-card__price">${order.price}</p>
                                <p class="sales-card__rate">${order.rate || ''}</p>
                            </div>
                        </div>
                        
                        <div class="sales-info-banner">
                            <span class="material-symbols-outlined" style="color: var(--color-primary);">info</span>
                            Waiting for it to be delivered.
                        </div>

                        <div class="sales-card__actions" style="margin-top: auto; flex-direction: row; align-items: center; justify-content: flex-start;">
                            <div class="sales-date-box sales-date-box--interactive" data-pickup="${new Date(order.date_created).toLocaleDateString()}">
                                <span class="material-symbols-outlined" style="color: var(--color-on-surface-variant); font-size: 1.125rem;">calendar_today</span>
                                <div class="sales-date-box__col">
                                    <span class="sales-date-box__label">Trade Date</span>
                                    <span class="sales-date-box__value">${new Date(order.date_created).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <a href="messages.html?to=${order.buyer_id}&ref=${order.listing_id}" class="sales-btn-message" style="margin-left: auto; padding: 0.5rem 1rem; border: 1px solid var(--color-outline-variant); background: transparent; text-decoration: none; color: var(--color-on-surface); display: flex; align-items: center; gap: 8px; border-radius: 4px; font-weight: 600; font-size: 0.875rem;">
                                <span class="material-symbols-outlined" style="font-size: 1.125rem;">chat</span> Message
                            </a>
                        </div>
                    </div>
                </div>
            `;
            feed.appendChild(card);
        });

        // Pagination
        if (totalPages > 1) {
            const paginationContainer = document.createElement('div');
            paginationContainer.className = 'seller-pagination';
            paginationContainer.style.cssText = 'display: flex; gap: 0.5rem; justify-content: center; align-items: center; width: 100%; margin-top: 1rem; margin-bottom: 2rem; height: max-content;';
            
            let pagesHtml = '';
            for (let i = 1; i <= totalPages; i++) {
                const isActive = i === currentPage ? 'background-color: var(--color-primary); color: white;' : 'background-color: var(--color-surface); color: var(--color-on-surface);';
                pagesHtml += `<button class="page-btn" data-page="${i}" style="border: 1px solid var(--color-outline); border-radius: 4px; padding: 0.5rem 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; height: max-content; ${isActive}">${i}</button>`;
            }

            paginationContainer.innerHTML = `
                <button class="page-btn-prev" ${currentPage === 1 ? 'disabled' : ''} style="border: 1px solid var(--color-outline); border-radius: 4px; padding: 0.5rem 1rem; cursor: pointer; background-color: var(--color-surface); height: max-content; opacity: ${currentPage === 1 ? '0.5' : '1'};"><span class="material-symbols-outlined" style="vertical-align: middle;">chevron_left</span></button>
                ${pagesHtml}
                <button class="page-btn-next" ${currentPage === totalPages ? 'disabled' : ''} style="border: 1px solid var(--color-outline); border-radius: 4px; padding: 0.5rem 1rem; cursor: pointer; background-color: var(--color-surface); height: max-content; opacity: ${currentPage === totalPages ? '0.5' : '1'};"><span class="material-symbols-outlined" style="vertical-align: middle;">chevron_right</span></button>
            `;
            feed.appendChild(paginationContainer);
        }
    }

    function renderCompletedOrders() {
        if (!feed) return;
        
        feed.innerHTML = '';
        
        // Remove lingering
        grid.querySelectorAll('.sales-card').forEach(card => card.remove());
        const oldPagination = grid.querySelector('.seller-pagination');
        if (oldPagination) oldPagination.remove();

        const orders = getOrdersBySeller('user_seller'); 
        const completedOrders = orders.filter(o => o.status === 'completed');

        if (completedOrders.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'sales-card';
            emptyState.innerHTML = `
                <div class="sales-card__content" style="display: flex; justify-content: center; align-items: center; padding: 4rem; color: var(--color-secondary); width: 100%;">
                    No completed orders yet.
                </div>
            `;
            feed.appendChild(emptyState);
            return;
        }

        const totalPages = Math.ceil(completedOrders.length / ITEMS_PER_PAGE);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageItems = completedOrders.slice(startIndex, endIndex);

        pageItems.forEach(order => {
            const card = document.createElement('div');
            card.className = 'sales-card';
            card.innerHTML = `
                <div class="sales-card__content">
                    <div class="sales-card__image-wrapper">
                        <img src="${order.listing_image || 'https://via.placeholder.com/400'}" alt="${order.listing_name}" class="sales-card__image">
                    </div>
                    <div class="sales-card__details">
                        <div class="sales-card__header">
                            <div>
                                <h3 class="sales-card__title">${order.listing_name}</h3>
                                <div class="sales-badge-group">
                                    <span class="sales-card__tag" style="margin-bottom: 0;">Resource ID: ${order.listing_sku}</span>
                                    <span class="sales-badge"><span class="material-symbols-outlined">local_shipping</span> Delivered</span>
                                    <span class="sales-badge sales-badge--confirmed"><span class="material-symbols-outlined">check_circle</span> Completed</span>
                                </div>
                            </div>
                            <div class="sales-card__price-box">
                                <p class="sales-card__price">${order.price}</p>
                                <p class="sales-card__rate">${order.rate || ''}</p>
                            </div>
                        </div>
                        
                        <div class="sales-info-banner" style="margin-bottom: 0;">
                            <span class="material-symbols-outlined" style="color: var(--color-primary);">info</span>
                            Buyer got the order and paid
                        </div>
                    </div>
                </div>
            `;
            feed.appendChild(card);
        });

        // Pagination
        if (totalPages > 1) {
            const paginationContainer = document.createElement('div');
            paginationContainer.className = 'seller-pagination';
            paginationContainer.style.cssText = 'display: flex; gap: 0.5rem; justify-content: center; align-items: center; width: 100%; margin-top: 1rem; margin-bottom: 2rem; height: max-content;';
            
            let pagesHtml = '';
            for (let i = 1; i <= totalPages; i++) {
                const isActive = i === currentPage ? 'background-color: var(--color-primary); color: white;' : 'background-color: var(--color-surface); color: var(--color-on-surface);';
                pagesHtml += `<button class="page-btn" data-page="${i}" style="border: 1px solid var(--color-outline); border-radius: 4px; padding: 0.5rem 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; height: max-content; ${isActive}">${i}</button>`;
            }

            paginationContainer.innerHTML = `
                <button class="page-btn-prev" ${currentPage === 1 ? 'disabled' : ''} style="border: 1px solid var(--color-outline); border-radius: 4px; padding: 0.5rem 1rem; cursor: pointer; background-color: var(--color-surface); height: max-content; opacity: ${currentPage === 1 ? '0.5' : '1'};"><span class="material-symbols-outlined" style="vertical-align: middle;">chevron_left</span></button>
                ${pagesHtml}
                <button class="page-btn-next" ${currentPage === totalPages ? 'disabled' : ''} style="border: 1px solid var(--color-outline); border-radius: 4px; padding: 0.5rem 1rem; cursor: pointer; background-color: var(--color-surface); height: max-content; opacity: ${currentPage === totalPages ? '0.5' : '1'};"><span class="material-symbols-outlined" style="vertical-align: middle;">chevron_right</span></button>
            `;
            feed.appendChild(paginationContainer);
        }
    }

    function renderActiveTab() {
        if (currentTab === 'pending') renderPendingOrders();
        else if (currentTab === 'confirmed') renderConfirmedOrders();
        else if (currentTab === 'completed') renderCompletedOrders();
        else {
            if (feed) feed.innerHTML = `
                <div class="sales-card" style="padding: 4rem; text-align: center; color: var(--color-secondary);">
                    Section coming soon
                </div>
            `;
        }
    }

    // Tab Switching Logic
    if (tabs.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('sales-tabs__btn--active'));
                e.currentTarget.classList.add('sales-tabs__btn--active');
                
                const tabText = e.currentTarget.textContent.trim().toLowerCase();
                currentPage = 1; // reset page
                
                if (tabText.includes('pending')) currentTab = 'pending';
                else if (tabText.includes('confirmed')) currentTab = 'confirmed';
                else if (tabText.includes('completed')) currentTab = 'completed';
                else if (tabText.includes('rejected')) currentTab = 'rejected';
                
                renderActiveTab();
            });
        });
    }

    // Initial Render
    renderActiveTab();

    // Event Delegation for Actions
    grid.addEventListener('click', (e) => {
        // Accept Button
        const acceptBtn = e.target.closest('.sales-btn-accept');
        if (acceptBtn) {
            const orderId = acceptBtn.getAttribute('data-order-id');
            
            // Show Premium Modal for Scheduling
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-card">
                    <div class="modal-header">
                        <h3 class="modal-title">Schedule Pickup</h3>
                        <button class="modal-close"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <div class="modal-body">
                        <label for="pickup-time" style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.875rem; color: var(--color-on-surface);">Select Date & Time</label>
                        <input type="datetime-local" id="pickup-time" class="modal-input" required>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn-cancel modal-close-btn">Cancel</button>
                        <button class="modal-btn-confirm" id="confirm-schedule-btn">Confirm Schedule</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Trigger animation
            setTimeout(() => modal.classList.add('modal--visible'), 10);

            // Close Handlers
            const closeModal = () => {
                modal.classList.remove('modal--visible');
                setTimeout(() => modal.remove(), 300);
            };

            const closeHandlers = modal.querySelectorAll('.modal-close, .modal-close-btn');
            closeHandlers.forEach(btn => btn.addEventListener('click', closeModal));

            // Confirm Handler
            const confirmBtn = modal.querySelector('#confirm-schedule-btn');
            confirmBtn.addEventListener('click', () => {
                const input = modal.querySelector('#pickup-time');
                if (!input.value) {
                    input.style.borderColor = 'var(--color-error)';
                    return;
                }
                
                // Format the date nicely
                const dateObj = new Date(input.value);
                const formattedDate = dateObj.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                updateOrderStatus(orderId, 'confirmed', formattedDate);
                closeModal();
                renderPendingOrders();
                
                // Show Success Toast
                const toast = document.createElement('div');
                toast.className = 'toast-notification';
                toast.innerHTML = `<span class="material-symbols-outlined" style="color: #10b981;">check_circle</span> Order Scheduled!`;
                document.body.appendChild(toast);
                setTimeout(() => toast.classList.add('toast--visible'), 10);
                setTimeout(() => {
                    toast.classList.remove('toast--visible');
                    setTimeout(() => toast.remove(), 400);
                }, 3000);
            });
            return;
        }

        // Reject Button
        const rejectBtn = e.target.closest('.sales-btn-reject');
        if (rejectBtn) {
            const orderId = rejectBtn.getAttribute('data-order-id');
            updateOrderStatus(orderId, 'rejected');
            renderActiveTab();
            return;
        }

        // Message Buyer Button
        const messageBtn = e.target.closest('.sales-btn-message');
        if (messageBtn) {
            window.location.href = 'messages.html';
            return;
        }

        // View Schedule Button (Confirmed Card Date Box)
        const scheduleBtn = e.target.closest('.sales-date-box--interactive');
        if (scheduleBtn) {
            const date = scheduleBtn.getAttribute('data-pickup');
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-card">
                    <div class="modal-header">
                        <h3 class="modal-title">Pickup Schedule</h3>
                        <button class="modal-close"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <div class="modal-body">
                        <div class="modal-text-display">
                            <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px; color: var(--color-primary);">event_available</span>
                            Scheduled for: ${date}
                        </div>
                        <p style="font-size: 0.875rem; color: var(--color-secondary); margin-top: 1rem;">
                            Waiting for buyer to mark as received upon delivery.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn-confirm modal-close-btn">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            setTimeout(() => modal.classList.add('modal--visible'), 10);

            const closeHandlers = modal.querySelectorAll('.modal-close, .modal-close-btn');
            closeHandlers.forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.classList.remove('modal--visible');
                    setTimeout(() => modal.remove(), 300);
                });
            });
            return;
        }

        // Pagination
        const pageBtn = e.target.closest('.page-btn');
        if (pageBtn) {
            currentPage = parseInt(pageBtn.getAttribute('data-page'));
            renderActiveTab();
            return;
        }

        const prevBtn = e.target.closest('.page-btn-prev');
        if (prevBtn && !prevBtn.hasAttribute('disabled')) {
            currentPage--;
            renderActiveTab();
            return;
        }

        const nextBtn = e.target.closest('.page-btn-next');
        if (nextBtn && !nextBtn.hasAttribute('disabled')) {
            currentPage++;
            renderActiveTab();
            return;
        }
    });

    // Background Polling for Status Auto-Updates
    setInterval(() => {
        // Only re-render if we are on a tab that might change from external actions
        if (currentTab === 'confirmed' || currentTab === 'pending' || currentTab === 'completed') {
            renderActiveTab();
        }
    }, 5000);
});
