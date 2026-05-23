/**
 * settings.js — Live API integration for Settings (business + account)
 * Endpoints used:
 *   GET   /api/auth/me/
 *   PATCH /api/auth/me/business/
 *   PATCH /api/auth/me/preferences/
 *   POST  /api/auth/me/change-password/
 *   POST  /api/auth/me/location/
 */

const SETTINGS_API = 'http://127.0.0.1:8000/api/auth';

document.addEventListener('DOMContentLoaded', async () => {
    // Toast helper (used everywhere)
    window.showToast = function (message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `settings-toast settings-toast--${type}`;
        toast.innerHTML = `
            <span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('settings-toast--visible'), 10);
        setTimeout(() => {
            toast.classList.remove('settings-toast--visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // Wait until authFetch is available (auto-loaded from listings-data.js)
    if (typeof authFetch !== 'function') {
        console.warn('[Settings] authFetch not available — listings-data.js must load before settings.js');
    }

    // Fetch the current user from the API
    const user = await fetchMe();
    if (!user) return;

    // Initialize whichever page is open
    if (document.getElementById('biz-name')) initBusinessProfile(user);
    if (document.getElementById('toggle-email')) initAccountSettings(user);
});

/** Pull the latest user profile from the API. */
async function fetchMe() {
    try {
        const res = await authFetch(`${SETTINGS_API}/me/`);
        const body = await res.json();
        if (!res.ok) throw body;
        // Refresh localStorage so other pages see the latest profile too
        if (body.data) localStorage.setItem('user', JSON.stringify(body.data));
        return body.data;
    } catch (e) {
        console.error('[Settings] failed to load user', e);
        return null;
    }
}

// ─── BUSINESS PROFILE ─────────────────────────────────────
function initBusinessProfile(user) {
    const bp = user.business_profile || {};

    // Fill fields
    setVal('biz-name', bp.business_name || '');
    setVal('biz-email', user.email || '');          // email is on User
    setVal('biz-phone', user.phone || '');          // phone is on User
    setVal('biz-address', bp.address || '');

    // Map marker drag (visual only — we save lat/lng via POST /me/location/)
    const marker = document.querySelector('.settings-map-marker');
    const map = document.querySelector('.settings-map-container');
    let isDragging = false;

    if (marker && map) {
        marker.addEventListener('mousedown', (e) => { isDragging = true; marker.style.cursor = 'grabbing'; e.preventDefault(); });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const rect = map.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
            marker.style.left = `${(x / rect.width) * 100}%`;
            marker.style.top = `${(y / rect.height) * 100}%`;
        });
        document.addEventListener('mouseup', () => {
            if (isDragging) { isDragging = false; marker.style.cursor = 'grab'; }
        });
    }

    // Update Business Profile button
    const updateBtn = document.getElementById('btn-update-profile');
    if (updateBtn) {
        updateBtn.addEventListener('click', async () => {
            const original = updateBtn.innerHTML;
            updateBtn.innerHTML = 'Saving…';
            updateBtn.disabled = true;
            try {
                // 1. Update business profile (name + address)
                const bpRes = await authFetch(`${SETTINGS_API}/me/business/`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        business_name: getVal('biz-name'),
                        address: getVal('biz-address'),
                    }),
                });
                if (!bpRes.ok) {
                    const err = await bpRes.json().catch(() => null);
                    throw err || { error: { message: 'Failed to update business.' } };
                }

                // 2. Update phone (lives on User, separate endpoint)
                const acctRes = await authFetch(`${SETTINGS_API}/me/account/`, {
                    method: 'PATCH',
                    body: JSON.stringify({ phone: getVal('biz-phone') }),
                });
                if (!acctRes.ok) {
                    const err = await acctRes.json().catch(() => null);
                    throw err || { error: { message: 'Failed to update phone.' } };
                }

                await fetchMe();   // refresh localStorage
                showToast('Business profile updated successfully!');
            } catch (err) {
                const msg = err?.error?.message
                    || Object.values(err?.error?.fields || {}).flat().join(' ')
                    || 'Could not save. Please try again.';
                showToast(msg, 'error');
            } finally {
                updateBtn.innerHTML = original;
                updateBtn.disabled = false;
            }
        });
    }

    // Optional: detect-my-location button (if present)
    const detectBtn = document.getElementById('btn-detect-location');
    if (detectBtn) {
        detectBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                showToast('Geolocation not supported by this browser.', 'error');
                return;
            }
            detectBtn.disabled = true;
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        const res = await authFetch(`${SETTINGS_API}/me/location/`, {
                            method: 'POST',
                            body: JSON.stringify({
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude,
                            }),
                        });
                        if (!res.ok) throw await res.json();
                        showToast('Location saved!');
                    } catch (e) {
                        showToast('Could not save location.', 'error');
                    } finally {
                        detectBtn.disabled = false;
                    }
                },
                () => { detectBtn.disabled = false; showToast('Location permission denied.', 'error'); },
            );
        });
    }
}

// ─── ACCOUNT / PREFERENCES ───────────────────────────────
function initAccountSettings(user) {
    const prefs = user.preferences || {};

    // 1. Toggles
    const toggles = {
        'toggle-email': 'email_notifications',
        'toggle-sms': 'sms_alerts',
    };
    Object.keys(toggles).forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const key = toggles[id];
        btn.classList.toggle('settings-toggle--active', !!prefs[key]);
        btn.addEventListener('click', () => btn.classList.toggle('settings-toggle--active'));
    });

    // 2. Granular checkboxes
    const cbNewMessages = document.getElementById('check-new-messages');
    const cbTransactions = document.getElementById('check-transactions');
    if (cbNewMessages) cbNewMessages.checked = prefs.notify_new_messages !== false;
    if (cbTransactions) cbTransactions.checked = prefs.notify_transaction_updates !== false;

    // 3. Timezone select (English-only — no language dropdown)
    const tzSel = document.getElementById('select-timezone');
    if (tzSel && prefs.timezone) tzSel.value = prefs.timezone;

    // 3. Save preferences button
    const updateBtn = document.getElementById('btn-update-account');
    if (updateBtn) {
        updateBtn.addEventListener('click', async () => {
            const original = updateBtn.innerHTML;
            updateBtn.innerHTML = 'Saving…';
            updateBtn.disabled = true;
            try {
                const payload = {
                    email_notifications: !!document.getElementById('toggle-email')?.classList.contains('settings-toggle--active'),
                    sms_alerts: !!document.getElementById('toggle-sms')?.classList.contains('settings-toggle--active'),
                    notify_new_messages: !!document.getElementById('check-new-messages')?.checked,
                    notify_transaction_updates: !!document.getElementById('check-transactions')?.checked,
                };
                if (tzSel?.value) payload.timezone = tzSel.value;
                const res = await authFetch(`${SETTINGS_API}/me/preferences/`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw await res.json();
                await fetchMe();
                showToast('Account preferences saved!');
            } catch (err) {
                const msg = err?.error?.message
                    || Object.values(err?.error?.fields || {}).flat().join(' ')
                    || 'Could not save preferences.';
                showToast(msg, 'error');
            } finally {
                updateBtn.innerHTML = original;
                updateBtn.disabled = false;
            }
        });
    }

    // 4. Change Password modal
    const modal = document.getElementById('modal-password');
    const openBtn = document.getElementById('btn-open-password');
    const closeBtn = document.getElementById('btn-close-password');
    const cancelBtn = document.getElementById('btn-cancel-password');
    const savePassBtn = document.getElementById('btn-save-password');

    if (modal && openBtn) {
        const toggleModal = (show) => {
            modal.classList.toggle('settings-modal--visible', show);
            if (!show) {
                ['old-pass', 'new-pass', 'confirm-pass'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            }
        };
        openBtn.addEventListener('click', () => toggleModal(true));
        closeBtn?.addEventListener('click', () => toggleModal(false));
        cancelBtn?.addEventListener('click', () => toggleModal(false));

        savePassBtn?.addEventListener('click', async () => {
            const oldPass = getVal('old-pass');
            const newPass = getVal('new-pass');
            const confirmPass = getVal('confirm-pass');

            if (!oldPass) return showToast('Enter your current password.', 'error');
            if (newPass.length < 8) return showToast('New password must be at least 8 characters.', 'error');
            if (newPass !== confirmPass) return showToast('Passwords do not match.', 'error');

            const original = savePassBtn.innerHTML;
            savePassBtn.innerHTML = 'Saving…';
            savePassBtn.disabled = true;
            try {
                const res = await authFetch(`${SETTINGS_API}/me/change-password/`, {
                    method: 'POST',
                    body: JSON.stringify({
                        current_password: oldPass,
                        new_password: newPass,
                        confirm_new_password: confirmPass,
                    }),
                });
                if (!res.ok) throw await res.json();
                showToast('Password updated successfully!');
                toggleModal(false);
            } catch (err) {
                const msg = err?.error?.message
                    || Object.values(err?.error?.fields || {}).flat().join(' ')
                    || 'Could not update password.';
                showToast(msg, 'error');
            } finally {
                savePassBtn.innerHTML = original;
                savePassBtn.disabled = false;
            }
        });
    }

    // 5. Deactivate account (real backend call)
    const deactivateBtn = document.getElementById('btn-deactivate');
    if (deactivateBtn) {
        deactivateBtn.addEventListener('click', async () => {
            const ok = await uiConfirm({
                title: 'Deactivate your account?',
                message: 'This will permanently disable your login, hide all your active listings, and log you out. This cannot be undone from inside the app — you would need to contact support to reactivate.',
                confirmText: 'Yes, deactivate',
                cancelText: 'Keep account',
                danger: true,
            });
            if (!ok) return;

            const original = deactivateBtn.innerHTML;
            deactivateBtn.innerHTML = 'Deactivating…';
            deactivateBtn.disabled = true;

            try {
                const refresh = localStorage.getItem('refresh_token');
                const res = await authFetch(`${SETTINGS_API}/me/deactivate/`, {
                    method: 'POST',
                    body: JSON.stringify({ refresh }),
                });
                if (!res.ok) throw await res.json();

                // Clear tokens + user from localStorage and redirect to login
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                localStorage.removeItem('notifications_seen');
                sessionStorage.clear();

                await uiAlert({
                    type: 'success',
                    title: 'Account deactivated',
                    message: 'Your account has been deactivated and you are now signed out.',
                });
                window.location.href = 'login.html';
            } catch (err) {
                deactivateBtn.innerHTML = original;
                deactivateBtn.disabled = false;
                const msg = err?.error?.message || 'Could not deactivate. Please try again.';
                await uiAlert({ type: 'error', title: 'Deactivation failed', message: msg });
            }
        });
    }
}

// ─── Tiny helpers ────────────────────────────────────────
function setVal(id, value) { const el = document.getElementById(id); if (el) el.value = value; }
function getVal(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
