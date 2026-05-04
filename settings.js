/**
 * settings.js - Logic for Business Profile & Account Settings
 * Handles data persistence, map interactivity, and preference toggles.
 */

document.addEventListener('DOMContentLoaded', () => {
    const profile = getUserProfile();
    
    // 1. Initialize Business Profile (if present)
    if (document.getElementById('biz-name')) {
        initBusinessProfile(profile);
    }

    // 2. Initialize Account Settings (if present)
    if (document.getElementById('toggle-email')) {
        initAccountSettings(profile);
    }

    // 3. Global Toast System
    window.showToast = function(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `settings-toast settings-toast--${type}`;
        toast.innerHTML = `
            <span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('settings-toast--visible'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('settings-toast--visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };
});

/**
 * MODULE: Business Profile
 */
function initBusinessProfile(profile) {
    const biz = profile.business;
    
    // Fill fields
    document.getElementById('biz-name').value = biz.name;
    document.getElementById('biz-email').value = biz.email;
    document.getElementById('biz-phone').value = biz.phone;
    document.getElementById('biz-address').value = biz.address;

    // Map Marker Interactivity (Simplified Draggable)
    const marker = document.querySelector('.settings-map-marker');
    const map = document.querySelector('.settings-map-container');
    let isDragging = false;

    if (marker && map) {
        marker.addEventListener('mousedown', (e) => {
            isDragging = true;
            marker.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const rect = map.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;

            // Constrain to map bounds
            x = Math.max(0, Math.min(x, rect.width));
            y = Math.max(0, Math.min(y, rect.height));

            // Apply position (as percentage for responsiveness)
            const xPercent = (x / rect.width) * 100;
            const yPercent = (y / rect.height) * 100;
            
            marker.style.left = `${xPercent}%`;
            marker.style.top = `${yPercent}%`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                marker.style.cursor = 'grab';
                console.log('[Map] New location pinned:', marker.style.left, marker.style.top);
            }
        });
    }

    // Update Profile Action
    const updateBtn = document.getElementById('btn-update-profile');
    if (updateBtn) {
        updateBtn.addEventListener('click', () => {
            // Update the profile object
            profile.business.name = document.getElementById('biz-name').value;
            profile.business.email = document.getElementById('biz-email').value;
            profile.business.phone = document.getElementById('biz-phone').value;
            profile.business.address = document.getElementById('biz-address').value;
            
            // Also sync the main name if it matches the business name
            profile.name = profile.business.name;

            saveUserProfile(profile);
            showToast('Business profile updated successfully!');
        });
    }
}

/**
 * MODULE: Account Settings
 */
function initAccountSettings(profile) {
    const prefs = profile.preferences;

    // 1. Initialize Toggles
    const toggles = {
        'toggle-email': 'emailNotifications',
        'toggle-sms': 'smsAlerts'
    };

    Object.keys(toggles).forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        
        const prefKey = toggles[id];
        
        // Set initial state
        if (prefs[prefKey]) btn.classList.add('settings-toggle--active');
        else btn.classList.remove('settings-toggle--active');

        // Toggle click logic
        btn.addEventListener('click', () => {
            const isActive = btn.classList.toggle('settings-toggle--active');
            prefs[prefKey] = isActive;
        });
    });

    // 2. Initialize Selects
    const langSelect = document.getElementById('select-lang');
    const tzSelect = document.getElementById('select-timezone');

    if (langSelect) langSelect.value = prefs.language;
    if (tzSelect) tzSelect.value = prefs.timezone;

    // 3. Update Preferences Action
    const updateBtn = document.getElementById('btn-update-account');
    if (updateBtn) {
        updateBtn.addEventListener('click', () => {
            // Save selects
            if (langSelect) prefs.language = langSelect.value;
            if (tzSelect) prefs.timezone = tzSelect.value;

            saveUserProfile(profile);
            showToast('Account preferences saved!');
        });
    }

    // 4. Password Modal Logic
    const modal = document.getElementById('modal-password');
    const openBtn = document.getElementById('btn-open-password');
    const closeBtn = document.getElementById('btn-close-password');
    const cancelBtn = document.getElementById('btn-cancel-password');
    const savePassBtn = document.getElementById('btn-save-password');

    if (modal && openBtn) {
        const toggleModal = (show) => {
            modal.classList.toggle('settings-modal--visible', show);
            if (!show) {
                // Clear inputs on close
                document.getElementById('old-pass').value = '';
                document.getElementById('new-pass').value = '';
                document.getElementById('confirm-pass').value = '';
            }
        };

        openBtn.addEventListener('click', () => toggleModal(true));
        closeBtn.addEventListener('click', () => toggleModal(false));
        cancelBtn.addEventListener('click', () => toggleModal(false));

        savePassBtn.addEventListener('click', () => {
            const oldPass = document.getElementById('old-pass').value;
            const newPass = document.getElementById('new-pass').value;
            const confirmPass = document.getElementById('confirm-pass').value;

            if (!oldPass) {
                alert('Please enter your current password.');
                return;
            }

            if (newPass.length < 8) {
                alert('New password must be at least 8 characters.');
                return;
            }

            if (newPass !== confirmPass) {
                alert('Passwords do not match.');
                return;
            }

            // Success flow
            showToast('Password updated successfully!');
            toggleModal(false);
        });
    }

    // 5. Security placeholders
    const deactivateBtn = document.getElementById('btn-deactivate');
    if (deactivateBtn) {
        deactivateBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to deactivate your account? This action cannot be undone.')) {
                showToast('Account deactivation requested.', 'error');
            }
        });
    }
}
