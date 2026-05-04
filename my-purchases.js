document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('.purchases-table tbody');
    const itemCountSpan = document.querySelector('.table-header__count');
    const tableContainer = document.querySelector('.table-container');

    let currentPage = 1;
    const ITEMS_PER_PAGE = 5;

    function renderTable() {
        if (!tableBody) return;

        // Clear existing pagination
        const existingPagination = tableContainer.parentElement.querySelector('.buyer-pagination');
        if (existingPagination) existingPagination.remove();

        // Get orders for the current buyer
        const orders = getOrdersByBuyer('user_current');
        
        // Update item count
        if (itemCountSpan) {
            itemCountSpan.textContent = `${orders.length} items`;
        }

        tableBody.innerHTML = ''; // Clear existing

        if (orders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 3rem; color: var(--color-secondary);">
                        No purchases found. <a href="browse-dash.html" style="color: var(--color-primary); text-decoration: underline;">Browse listings</a>
                    </td>
                </tr>
            `;
            return;
        }

        // Pagination Logic
        const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageItems = orders.slice(startIndex, endIndex);

        pageItems.forEach(order => {
            let statusBadge = '';
            let actionsHTML = '';

            // Status Badge Logic
            if (order.status === 'pending') {
                statusBadge = `
                    <span class="status-badge status-badge--pending">
                        <span class="status-dot status-dot--green"></span>
                        Pending
                    </span>
                `;
                actionsHTML = `
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center;">
                        <a href="messages.html?to=${order.seller_id}&ref=${order.listing_id}" class="btn-message" title="Message Seller" style="color: var(--color-secondary); text-decoration: none; display: flex; align-items: center; transition: color 0.2s;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-secondary)'">
                            <span class="material-symbols-outlined" style="font-size: 1.125rem;">chat_bubble</span>
                        </a>
                        <button class="action-btn btn-remove" title="Remove" data-order-id="${order.id}">
                            <span class="material-symbols-outlined" style="font-size: 1.125rem;">close</span>
                        </button>
                    </div>
                `;
            } else if (order.status === 'confirmed') {
                statusBadge = `
                    <span class="status-badge status-badge--confirmed" style="background-color: var(--color-primary); color: var(--color-on-primary);">
                        <span class="status-dot status-dot--white"></span>
                        Confirmed
                    </span>
                `;
                actionsHTML = `
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center;">
                        <a href="messages.html?to=${order.seller_id}&ref=${order.listing_id}" class="btn-message" title="Message Seller" style="color: var(--color-secondary); text-decoration: none; display: flex; align-items: center; border: 1px solid var(--color-outline-variant); border-radius: 4px; padding: 0.25rem 0.5rem; transition: background 0.2s;" onmouseover="this.style.background='var(--color-surface-low)'" onmouseout="this.style.background='none'">
                            <span class="material-symbols-outlined" style="font-size: 1rem;">chat_bubble</span>
                        </a>
                        <button class="btn-schedule" data-pickup="${order.pickup_date}" style="background: none; border: 1px solid var(--color-outline-variant); border-radius: 4px; padding: 0.25rem 0.5rem; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: var(--color-on-surface);">
                            <span class="material-symbols-outlined" style="font-size: 1rem;">calendar_today</span> Schedule
                        </button>
                        <button class="btn-received" data-order-id="${order.id}" style="background-color: var(--color-primary); color: white; border: none; border-radius: 4px; padding: 0.25rem 0.5rem; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem;">
                            <span class="material-symbols-outlined" style="font-size: 1rem;">check_circle</span> Received
                        </button>
                    </div>
                `;
            } else if (order.status === 'rejected') {
                statusBadge = `
                    <span class="status-badge" style="background-color: var(--color-error-container); color: var(--color-error); padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.5rem;">
                        <span class="status-dot" style="background-color: var(--color-error);"></span>
                        Rejected
                    </span>
                `;
                actionsHTML = `
                    <button class="action-btn btn-remove" title="Remove" data-order-id="${order.id}">
                        <span class="material-symbols-outlined" style="font-size: 1.125rem;">close</span>
                    </button>
                `;
            } else if (order.status === 'completed') {
                statusBadge = `
                    <span class="status-badge" style="background-color: var(--color-secondary-container); color: var(--color-on-surface); padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.5rem;">
                        <span class="status-dot" style="background-color: var(--color-secondary);"></span>
                        Completed
                    </span>
                `;
                actionsHTML = `
                    <div style="display: flex; gap: 0.75rem; justify-content: flex-end; align-items: center;">
                        <a href="messages.html?to=${order.seller_id}&ref=${order.listing_id}" class="btn-message" title="Message Seller" style="color: var(--color-secondary); text-decoration: none; display: flex; align-items: center; transition: color 0.2s;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-secondary)'">
                            <span class="material-symbols-outlined" style="font-size: 1.125rem;">chat_bubble</span>
                        </a>
                        <span style="font-size: 0.75rem; color: var(--color-secondary);">Delivered</span>
                    </div>
                `;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="prod-cell">
                        <img src="${order.listing_image || 'https://via.placeholder.com/150'}" class="prod-image" alt="${order.listing_name}">
                        <div>
                            <span class="prod-name">${order.listing_name}</span>
                            <span class="prod-sku">${order.listing_sku}</span>
                        </div>
                    </div>
                </td>
                <td><span class="price-cell">${order.price}</span></td>
                <td>${statusBadge}</td>
                <td style="text-align: right;">${actionsHTML}</td>
            `;
            tableBody.appendChild(tr);
        });

        // Render Pagination UI
        if (totalPages > 1) {
            const paginationContainer = document.createElement('div');
            paginationContainer.className = 'buyer-pagination';
            paginationContainer.style.cssText = 'display: flex; gap: 0.5rem; justify-content: center; width: 100%; margin-top: 1rem; margin-bottom: 2rem;';
            
            let pagesHtml = '';
            for (let i = 1; i <= totalPages; i++) {
                const isActive = i === currentPage ? 'background-color: var(--color-primary); color: white;' : 'background-color: var(--color-surface); color: var(--color-on-surface);';
                pagesHtml += `<button class="page-btn" data-page="${i}" style="border: 1px solid var(--color-outline); border-radius: 4px; padding: 0.5rem 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; ${isActive}">${i}</button>`;
            }

            paginationContainer.innerHTML = `
                <button class="page-btn-prev" ${currentPage === 1 ? 'disabled' : ''} style="border: 1px solid var(--color-outline); border-radius: 4px; padding: 0.5rem 1rem; cursor: pointer; background-color: var(--color-surface); opacity: ${currentPage === 1 ? '0.5' : '1'};"><span class="material-symbols-outlined" style="vertical-align: middle;">chevron_left</span></button>
                ${pagesHtml}
                <button class="page-btn-next" ${currentPage === totalPages ? 'disabled' : ''} style="border: 1px solid var(--color-outline); border-radius: 4px; padding: 0.5rem 1rem; cursor: pointer; background-color: var(--color-surface); opacity: ${currentPage === totalPages ? '0.5' : '1'};"><span class="material-symbols-outlined" style="vertical-align: middle;">chevron_right</span></button>
            `;
            // Insert right after table-container
            tableContainer.parentNode.insertBefore(paginationContainer, tableContainer.nextSibling);
        }
    }

    // Initial render
    renderTable();

    // Event Delegation for Table Actions
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            // Remove Button (Pending/Rejected)
            const removeBtn = e.target.closest('.btn-remove');
            if (removeBtn) {
                const orderId = removeBtn.getAttribute('data-order-id');
                // Removed confirm() for instant action
                deleteOrder(orderId);
                renderTable();
                return;
            }

            // View Schedule Button (Confirmed)
            const scheduleBtn = e.target.closest('.btn-schedule');
            if (scheduleBtn) {
                const date = scheduleBtn.getAttribute('data-pickup');
                
                // Show Premium Modal instead of alert
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
                                ${date}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="modal-btn-confirm modal-close-btn">Close</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                // Trigger animation
                setTimeout(() => modal.classList.add('modal--visible'), 10);

                // Close Handlers
                const closeHandlers = modal.querySelectorAll('.modal-close, .modal-close-btn');
                closeHandlers.forEach(btn => {
                    btn.addEventListener('click', () => {
                        modal.classList.remove('modal--visible');
                        setTimeout(() => modal.remove(), 300);
                    });
                });
                return;
            }

            // Mark Received Button (Confirmed) - Shows Rating Modal
            const receivedBtn = e.target.closest('.btn-received');
            if (receivedBtn) {
                const orderId = receivedBtn.getAttribute('data-order-id');
                const orders = getOrdersByBuyer('user_current');
                const targetOrder = orders.find(o => o.id === orderId);
                if (!targetOrder) return;

                const modal = document.createElement('div');
                modal.className = 'modal-overlay';
                modal.innerHTML = `
                    <div class="modal-card" style="max-width: 400px; text-align: center;">
                        <div class="modal-header" style="justify-content: center; position: relative;">
                            <h3 class="modal-title">Rate Seller</h3>
                            <button class="modal-close" style="position: absolute; right: 0; top: 0;"><span class="material-symbols-outlined">close</span></button>
                        </div>
                        <div class="modal-body">
                            <p style="color: var(--color-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
                                How was your experience with <strong>${targetOrder.seller_name}</strong>?
                            </p>
                            <div class="rating-container" id="modal-rating-stars">
                                <span class="material-symbols-outlined rating-star" data-value="1">star</span>
                                <span class="material-symbols-outlined rating-star" data-value="2">star</span>
                                <span class="material-symbols-outlined rating-star" data-value="3">star</span>
                                <span class="material-symbols-outlined rating-star" data-value="4">star</span>
                                <span class="material-symbols-outlined rating-star" data-value="5">star</span>
                            </div>
                        </div>
                        <div class="modal-footer" style="justify-content: center;">
                            <button class="modal-btn-confirm" id="submit-rating-btn" disabled style="width: 100%;">Submit & Complete Order</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                // Trigger animation
                setTimeout(() => modal.classList.add('modal--visible'), 10);

                // Star Hover and Click Logic
                const stars = modal.querySelectorAll('.rating-star');
                const submitBtn = modal.querySelector('#submit-rating-btn');
                let selectedRating = 0;

                stars.forEach(star => {
                    // Hover effect
                    star.addEventListener('mouseenter', () => {
                        const hoverValue = parseInt(star.getAttribute('data-value'));
                        stars.forEach(s => {
                            if (parseInt(s.getAttribute('data-value')) <= hoverValue) {
                                s.classList.add('hover-active');
                            } else {
                                s.classList.remove('hover-active');
                            }
                        });
                    });

                    // Remove hover effect
                    star.addEventListener('mouseleave', () => {
                        stars.forEach(s => s.classList.remove('hover-active'));
                    });

                    // Click to select
                    star.addEventListener('click', () => {
                        selectedRating = parseInt(star.getAttribute('data-value'));
                        stars.forEach(s => {
                            if (parseInt(s.getAttribute('data-value')) <= selectedRating) {
                                s.classList.add('selected');
                            } else {
                                s.classList.remove('selected');
                            }
                        });
                        submitBtn.removeAttribute('disabled');
                    });
                });

                // Submit Action
                submitBtn.addEventListener('click', () => {
                    if (selectedRating === 0) return;

                    // 1. Submit the rating to the centralized data layer
                    if (typeof submitSellerRating === 'function') {
                        submitSellerRating(targetOrder.seller_name, selectedRating);
                    }
                    
                    // NEW: Save this as a "Given" rating in our new system
                    if (typeof addRating === 'function') {
                        addRating('given', targetOrder.seller_name, selectedRating, targetOrder.listing_image);
                    }

                    // 2. Complete the order
                    updateOrderStatus(orderId, 'completed');
                    renderTable();

                    // 3. Show Toast and Close Modal
                    modal.classList.remove('modal--visible');
                    setTimeout(() => modal.remove(), 300);

                    const toast = document.createElement('div');
                    toast.className = 'toast-notification';
                    toast.innerHTML = `<span class="material-symbols-outlined" style="color: #10b981;">check_circle</span> Rating submitted & Order Completed`;
                    document.body.appendChild(toast);
                    setTimeout(() => toast.classList.add('toast--visible'), 10);
                    setTimeout(() => {
                        toast.classList.remove('toast--visible');
                        setTimeout(() => toast.remove(), 400);
                    }, 3000);
                });

                // Close Handlers
                const closeHandlers = modal.querySelectorAll('.modal-close');
                closeHandlers.forEach(btn => {
                    btn.addEventListener('click', () => {
                        modal.classList.remove('modal--visible');
                        setTimeout(() => modal.remove(), 300);
                    });
                });

                return;
            }
        });
    }

    // Event Delegation for Pagination
    document.addEventListener('click', (e) => {
        const pageBtn = e.target.closest('.buyer-pagination .page-btn');
        if (pageBtn) {
            currentPage = parseInt(pageBtn.getAttribute('data-page'));
            renderTable();
            return;
        }

        const prevBtn = e.target.closest('.buyer-pagination .page-btn-prev');
        if (prevBtn && !prevBtn.hasAttribute('disabled')) {
            currentPage--;
            renderTable();
            return;
        }

        const nextBtn = e.target.closest('.buyer-pagination .page-btn-next');
        if (nextBtn && !nextBtn.hasAttribute('disabled')) {
            currentPage++;
            renderTable();
            return;
        }
    });
});
