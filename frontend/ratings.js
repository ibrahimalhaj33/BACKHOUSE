/* ═══════════════════════════════════════════════════════
   BackHouse — Ratings Page (fully live)
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
    const tabButtons = document.querySelectorAll('.header-tab');
    const ratingsGrid = document.querySelector('.ratings-grid');
    const sortSelect = document.querySelector('.sort-group__select');
    const showMoreBtn = document.getElementById('show-more-ratings');

    if (!ratingsGrid) return;

    let currentType = 'received';   // received | given
    let currentSort = 'recent';     // recent | highest | lowest
    let visibleCount = 6;
    let ratings = [];
    let summary = null;
    let pending = [];

    async function load() {
        const [r, s, p] = await Promise.all([
            typeof getRatings === 'function' ? getRatings(currentType) : Promise.resolve({ data: [] }),
            typeof getRatingSummary === 'function' ? getRatingSummary() : Promise.resolve(null),
            typeof getPendingRatings === 'function' ? getPendingRatings() : Promise.resolve([]),
        ]);
        ratings = r.data || [];
        summary = s;
        pending = p || [];
        renderHero();
        renderPendingBanner();
        renderGrid();
    }

    // ─── HERO: Score card + Distribution ─────────────────
    function renderHero() {
        if (!summary) return;
        const avg = summary.average || 0;
        const total = summary.total || 0;

        // Score card
        const bigNum = document.querySelector('.score-card__big-num');
        if (bigNum) bigNum.textContent = avg.toFixed(1);

        const starsEl = document.querySelector('.score-card__stars');
        if (starsEl) {
            const full = Math.floor(avg);
            const half = (avg - full) >= 0.5 ? 1 : 0;
            const empty = 5 - full - half;
            let html = '';
            for (let i = 0; i < full; i++) html += '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">star</span>';
            if (half) html += '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">star_half</span>';
            for (let i = 0; i < empty; i++) html += '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 0;">star</span>';
            starsEl.innerHTML = html;
        }

        const subtext = document.querySelector('.score-card__subtext');
        if (subtext) {
            subtext.innerHTML = total > 0
                ? `Based on <strong>${total.toLocaleString()}</strong> verified transaction${total !== 1 ? 's' : ''} across the BackHouse circular network.`
                : `No ratings yet — complete an order to start building your trust score.`;
        }

        // Distribution
        const breakdown = summary.breakdown || {};
        const distRows = document.querySelectorAll('.dist-row');
        const order = ['5', '4', '3', '2', '1'];   // HTML order: 5★ first
        distRows.forEach((row, idx) => {
            const star = order[idx];
            const count = breakdown[star] || 0;
            const pct = total ? Math.round((count / total) * 100) : 0;
            const fill = row.querySelector('.dist-row__bar-fill');
            const pctEl = row.querySelector('.dist-row__percent');
            if (fill) fill.style.width = pct + '%';
            if (pctEl) pctEl.textContent = pct + '%';
        });
    }

    // ─── PENDING BANNER (orders not yet rated) ───────────
    function renderPendingBanner() {
        const existing = document.getElementById('rating-pending-banner');
        if (existing) existing.remove();
        if (!pending.length || currentType !== 'received') return;

        const banner = document.createElement('div');
        banner.id = 'rating-pending-banner';
        banner.style.cssText = `
            background: linear-gradient(135deg, #10b981, #059669);
            color: #fff;
            border-radius: 12px;
            padding: 1rem 1.25rem;
            margin: 0 0 1.5rem 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
        `;
        banner.innerHTML = `
            <div>
                <div style="font-weight:700; font-size:1rem;">⭐ Share your feedback</div>
                <div style="font-size:0.875rem; opacity:0.9;">
                    You have ${pending.length} completed order${pending.length !== 1 ? 's' : ''} waiting for your rating.
                </div>
            </div>
            <button id="show-pending-ratings"
                    style="background:#fff; color:#059669; border:none; border-radius:8px; padding:0.5rem 1rem; font-weight:700; cursor:pointer;">
                Rate now
            </button>
        `;
        ratingsGrid.parentElement?.insertBefore(banner, ratingsGrid);
        document.getElementById('show-pending-ratings').addEventListener('click', openRatePicker);
    }

    async function openRatePicker() {
        if (pending.length === 1) return openRatingModal(pending[0]);
        const choice = await pickPending(pending);
        if (choice) openRatingModal(choice);
    }

    function pickPending(list) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'ui-modal__overlay';
            overlay.innerHTML = `
                <div class="ui-modal" style="width:480px; max-width:90vw;">
                    <h3 class="ui-modal__title">Which order would you like to rate?</h3>
                    <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1rem; max-height:50vh; overflow-y:auto;">
                        ${list.map(p => `
                            <button data-order="${p.order_id}"
                                    style="text-align:left; background:#f8f9fa; border:1px solid #eee; border-radius:8px; padding:0.75rem; cursor:pointer; font-family:inherit;">
                                <div style="font-weight:600;">${escapeHtml(p.listing_name)}</div>
                                <div style="font-size:0.75rem; color:#666; margin-top:0.25rem;">
                                    Rating ${escapeHtml(p.counterpart_name)} (${p.i_am === 'buyer' ? 'seller' : 'buyer'})
                                </div>
                            </button>
                        `).join('')}
                    </div>
                    <div class="ui-modal__actions">
                        <button class="ui-modal__btn ui-modal__btn--cancel" data-action="cancel">Cancel</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.querySelectorAll('[data-order]').forEach(btn => {
                btn.addEventListener('click', () => {
                    overlay.remove();
                    resolve(list.find(p => String(p.order_id) === btn.dataset.order));
                });
            });
            overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => {
                overlay.remove();
                resolve(null);
            });
        });
    }

    function openRatingModal(pendingOrder) {
        const overlay = document.createElement('div');
        overlay.className = 'ui-modal__overlay';
        overlay.innerHTML = `
            <div class="ui-modal">
                <div class="ui-modal__icon" style="background:rgba(245,158,11,0.12); color:#d97706;">
                    <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">star</span>
                </div>
                <h3 class="ui-modal__title">Rate ${escapeHtml(pendingOrder.counterpart_name)}</h3>
                <p class="ui-modal__message">How was your experience with the <strong>${escapeHtml(pendingOrder.listing_name)}</strong> order?</p>
                <div id="star-picker" style="text-align:center; margin-bottom:1rem;">
                    ${[1,2,3,4,5].map(i => `
                        <span class="rating-star material-symbols-outlined" data-value="${i}"
                              style="font-size:36px; cursor:pointer; color:#ddd; font-variation-settings:'FILL' 1;">star</span>
                    `).join('')}
                </div>
                <textarea class="ui-modal__input" id="rating-comment" rows="3" placeholder="Add a comment (optional)" style="resize:vertical; min-height:60px;"></textarea>
                <div class="ui-modal__actions">
                    <button class="ui-modal__btn ui-modal__btn--cancel" data-action="cancel">Cancel</button>
                    <button class="ui-modal__btn ui-modal__btn--primary" data-action="submit">Submit</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        let selected = 0;
        const stars = overlay.querySelectorAll('.rating-star');
        const paint = (n) => stars.forEach((s, i) => s.style.color = i < n ? '#f59e0b' : '#ddd');
        stars.forEach(s => {
            s.addEventListener('mouseenter', () => paint(parseInt(s.dataset.value)));
            s.addEventListener('mouseleave', () => paint(selected));
            s.addEventListener('click', () => { selected = parseInt(s.dataset.value); paint(selected); });
        });

        overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => overlay.remove());
        overlay.querySelector('[data-action="submit"]').addEventListener('click', async () => {
            if (!selected) {
                await uiAlert({ type: 'warning', message: 'Please pick a star rating first.' });
                return;
            }
            const comment = overlay.querySelector('#rating-comment').value.trim();
            try {
                await submitRating({ order: pendingOrder.order_id, stars: selected, comment });
                overlay.remove();
                await uiAlert({ type: 'success', title: 'Thanks for your feedback!', message: 'Your rating has been recorded.' });
                await load();
            } catch (err) {
                const fields = err?.error?.fields || {};
                const msg = Object.values(fields).flat().join('\n')
                    || err?.error?.message || 'Please try again.';
                await uiAlert({ type: 'error', title: 'Could not submit', message: msg });
            }
        });
    }

    // ─── RATING CARDS ────────────────────────────────────
    function starsHtml(value, size = 14) {
        let html = '';
        for (let i = 1; i <= 5; i++) {
            const fill = i <= value ? 1 : 0;
            html += `<span class="material-symbols-outlined" style="font-size:${size}px; font-variation-settings: 'FILL' ${fill}; color:#f59e0b;">star</span>`;
        }
        return html;
    }

    function getSortedRatings() {
        const list = [...ratings];
        if (currentSort === 'highest') list.sort((a, b) => b.stars - a.stars);
        else if (currentSort === 'lowest') list.sort((a, b) => a.stars - b.stars);
        else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return list;
    }

    function renderCard(rating) {
        const article = document.createElement('article');
        article.className = 'rating-card';
        article.style.cssText = 'background:#fff; border:1px solid rgba(0,0,0,0.06); border-radius:12px; padding:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.03);';

        const displayName = currentType === 'received' ? rating.rater_name : rating.ratee_name;
        const displayInitials = currentType === 'received' ? rating.rater_initials : rating.ratee_initials;
        const avatar = rating.rater_avatar
            ? `<img src="${rating.rater_avatar}" alt="${escapeHtml(displayName)}" style="width:44px; height:44px; border-radius:50%; object-fit:cover;">`
            : `<div style="width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg,#10b981,#059669); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700;">${escapeHtml(displayInitials || '?')}</div>`;

        article.innerHTML = `
            <div style="display:flex; gap:0.75rem; margin-bottom:0.75rem;">
                ${avatar}
                <div style="flex:1; min-width:0;">
                    <p style="margin:0; font-weight:700; font-size:0.95rem;">${escapeHtml(displayName || '')}</p>
                    <p style="margin:0.15rem 0 0 0; font-size:0.75rem; color:#888;">
                        ${formatDate(rating.created_at)}
                        ${rating.listing_name ? ' · ' + escapeHtml(rating.listing_name) : ''}
                    </p>
                </div>
            </div>
            <div style="margin-bottom:0.5rem;">${starsHtml(rating.stars, 18)}</div>
            ${rating.comment
                ? `<p style="margin:0; color:#444; line-height:1.5; font-size:0.875rem;">${escapeHtml(rating.comment)}</p>`
                : `<p style="margin:0; color:#aaa; font-style:italic; font-size:0.85rem;">No comment.</p>`}
        `;
        return article;
    }

    function renderGrid() {
        ratingsGrid.innerHTML = '';
        const sorted = getSortedRatings();
        const visible = sorted.slice(0, visibleCount);

        if (sorted.length === 0) {
            ratingsGrid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:3rem; color:#888;">
                    <span class="material-symbols-outlined" style="font-size:3rem; color:#ddd;">reviews</span>
                    <p style="margin-top:0.5rem;">No ${currentType} ratings yet.</p>
                </div>`;
            if (showMoreBtn) showMoreBtn.style.display = 'none';
            return;
        }

        visible.forEach(r => ratingsGrid.appendChild(renderCard(r)));

        // Toggle Show More button
        if (showMoreBtn) {
            showMoreBtn.style.display = sorted.length > visibleCount ? 'flex' : 'none';
        }
    }

    // ─── Tabs ───────────────────────────────────────────
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('header-tab--active'));
            btn.classList.add('header-tab--active');
            const label = btn.textContent.trim().toLowerCase();
            currentType = label.includes('given') ? 'given' : 'received';
            visibleCount = 6;
            load();
        });
    });

    // ─── Sort dropdown ──────────────────────────────────
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            const v = sortSelect.value.toLowerCase();
            if (v.includes('highest')) currentSort = 'highest';
            else if (v.includes('lowest')) currentSort = 'lowest';
            else currentSort = 'recent';
            visibleCount = 6;
            renderGrid();
        });
    }

    // ─── Show More button ───────────────────────────────
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', () => {
            visibleCount += 6;
            renderGrid();
        });
    }

    function formatDate(iso) {
        return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    await load();
});
