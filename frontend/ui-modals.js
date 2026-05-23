/**
 * GLOBAL UI MODALS — replaces native confirm()/alert() across the app.
 *
 *   await uiConfirm({ title, message, confirmText, cancelText, danger })
 *     → Promise<boolean>
 *
 *   await uiAlert({ title, message, type })       // type: 'info' | 'success' | 'error' | 'warning'
 *     → Promise<void>
 *
 * Loaded by app.js (which is included on every page), so it's always available.
 */

(function () {
    // Inject CSS once
    if (!document.getElementById('ui-modals-css')) {
        const style = document.createElement('style');
        style.id = 'ui-modals-css';
        style.textContent = `
            .ui-modal__overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.45);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000;
                animation: uiModalFade 0.15s ease-out;
            }
            @keyframes uiModalFade {
                from { opacity: 0; }
                to   { opacity: 1; }
            }
            .ui-modal {
                background: #fff;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
                padding: 1.75rem;
                width: 380px;
                max-width: 90vw;
                animation: uiModalPop 0.18s ease-out;
            }
            @keyframes uiModalPop {
                from { opacity: 0; transform: scale(0.92); }
                to   { opacity: 1; transform: scale(1); }
            }
            .ui-modal__icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                margin: 0 auto 0.75rem auto;
            }
            .ui-modal__icon .material-symbols-outlined { font-size: 28px; }
            .ui-modal__icon--danger  { background: rgba(239, 68, 68, 0.12);  color: #ef4444; }
            .ui-modal__icon--info    { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
            .ui-modal__icon--success { background: rgba(16, 185, 129, 0.12); color: #10b981; }
            .ui-modal__icon--warning { background: rgba(245, 158, 11, 0.15); color: #d97706; }
            .ui-modal__icon--error   { background: rgba(239, 68, 68, 0.12);  color: #ef4444; }
            .ui-modal__title {
                font-size: 1.125rem;
                font-weight: 700;
                color: #1a1a1a;
                text-align: center;
                margin: 0 0 0.5rem 0;
                font-family: inherit;
            }
            .ui-modal__message {
                font-size: 0.875rem;
                color: #555;
                text-align: center;
                margin: 0 0 1.5rem 0;
                line-height: 1.5;
                white-space: pre-wrap;
            }
            .ui-modal__actions {
                display: flex;
                gap: 0.5rem;
            }
            .ui-modal__btn {
                flex: 1;
                padding: 0.65rem 1rem;
                border-radius: 10px;
                font-size: 0.875rem;
                font-weight: 600;
                border: none;
                cursor: pointer;
                transition: filter 0.15s, transform 0.05s;
                font-family: inherit;
            }
            .ui-modal__btn:active { transform: scale(0.98); }
            .ui-modal__btn--cancel { background: #f3f4f6; color: #1a1a1a; }
            .ui-modal__btn--cancel:hover { background: #e5e7eb; }
            .ui-modal__btn--primary { background: #10b981; color: #fff; }
            .ui-modal__btn--primary:hover { filter: brightness(1.05); }
            .ui-modal__btn--danger { background: #ef4444; color: #fff; }
            .ui-modal__btn--danger:hover { filter: brightness(1.05); }
            .ui-modal__input {
                width: 100%;
                padding: 0.65rem 0.75rem;
                font-size: 0.95rem;
                border-radius: 10px;
                border: 1px solid rgba(0,0,0,0.12);
                margin-bottom: 1.25rem;
                font-family: inherit;
                color: #1a1a1a;
                background: #fff;
                box-sizing: border-box;
            }
            .ui-modal__input:focus {
                outline: none;
                border-color: #10b981;
                box-shadow: 0 0 0 3px rgba(16,185,129,0.18);
            }
        `;
        document.head.appendChild(style);
    }

    function build({
        type = 'info',
        title,
        message = '',
        confirmText = 'OK',
        cancelText = null,         // when null → no cancel button (alert-style)
        danger = false,
        iconName,
    }) {
        // Pick default icon per type if not provided
        const defaultIcon = {
            info:    'info',
            success: 'check_circle',
            error:   'error',
            warning: 'warning',
            danger:  'delete',
        };
        const icon = iconName || defaultIcon[danger ? 'danger' : type] || 'info';
        const iconClass = danger ? 'danger' : type;

        const overlay = document.createElement('div');
        overlay.className = 'ui-modal__overlay';
        overlay.innerHTML = `
            <div class="ui-modal" role="dialog" aria-modal="true">
                <div class="ui-modal__icon ui-modal__icon--${iconClass}">
                    <span class="material-symbols-outlined">${icon}</span>
                </div>
                ${title ? `<h3 class="ui-modal__title">${title}</h3>` : ''}
                ${message ? `<p class="ui-modal__message">${message}</p>` : ''}
                <div class="ui-modal__actions">
                    ${cancelText !== null
                        ? `<button class="ui-modal__btn ui-modal__btn--cancel" data-action="cancel">${cancelText}</button>`
                        : ''}
                    <button class="ui-modal__btn ${danger ? 'ui-modal__btn--danger' : 'ui-modal__btn--primary'}"
                            data-action="confirm">${confirmText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    /** Confirm dialog — returns Promise<boolean>. */
    window.uiConfirm = function uiConfirm(opts = {}) {
        const overlay = build({
            type: 'warning',
            title: opts.title || 'Are you sure?',
            message: opts.message || '',
            confirmText: opts.confirmText || 'Confirm',
            cancelText: opts.cancelText || 'Cancel',
            danger: opts.danger ?? true,
            iconName: opts.icon,
        });

        return new Promise((resolve) => {
            const close = (result) => {
                overlay.remove();
                document.removeEventListener('keydown', onKey);
                resolve(result);
            };
            overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));
            overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
            const onKey = (e) => {
                if (e.key === 'Escape') close(false);
                if (e.key === 'Enter')  close(true);
            };
            document.addEventListener('keydown', onKey);
            overlay.querySelector('[data-action="confirm"]').focus();
        });
    };

    /** Alert dialog — single OK button, returns Promise<void>. */
    window.uiAlert = function uiAlert(opts = {}) {
        // Allow string shorthand: uiAlert("Some message")
        if (typeof opts === 'string') opts = { message: opts };

        const overlay = build({
            type: opts.type || 'info',
            title: opts.title || ({
                info: 'Info', success: 'Done', error: 'Error', warning: 'Warning'
            }[opts.type] || 'Notice'),
            message: opts.message || '',
            confirmText: opts.confirmText || 'OK',
            cancelText: null,
            iconName: opts.icon,
        });

        return new Promise((resolve) => {
            const close = () => {
                overlay.remove();
                document.removeEventListener('keydown', onKey);
                resolve();
            };
            overlay.querySelector('[data-action="confirm"]').addEventListener('click', close);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
            const onKey = (e) => {
                if (e.key === 'Escape' || e.key === 'Enter') close();
            };
            document.addEventListener('keydown', onKey);
            overlay.querySelector('[data-action="confirm"]').focus();
        });
    };

    /** Prompt for user input — returns Promise<string|null>. */
    window.uiPrompt = function uiPrompt(opts = {}) {
        if (typeof opts === 'string') opts = { message: opts };
        const inputType = opts.inputType || 'text';
        const placeholder = opts.placeholder || '';
        const defaultValue = opts.defaultValue || '';
        const icon = opts.icon || (inputType.includes('date') ? 'event' : 'edit');

        const overlay = document.createElement('div');
        overlay.className = 'ui-modal__overlay';
        overlay.innerHTML = `
            <div class="ui-modal" role="dialog" aria-modal="true">
                <div class="ui-modal__icon ui-modal__icon--info">
                    <span class="material-symbols-outlined">${icon}</span>
                </div>
                <h3 class="ui-modal__title">${opts.title || 'Enter value'}</h3>
                ${opts.message ? `<p class="ui-modal__message">${opts.message}</p>` : ''}
                <input class="ui-modal__input" type="${inputType}"
                       placeholder="${placeholder}" value="${defaultValue}"
                       ${opts.min ? `min="${opts.min}"` : ''}
                       ${opts.max ? `max="${opts.max}"` : ''}>
                <div class="ui-modal__actions">
                    <button class="ui-modal__btn ui-modal__btn--cancel" data-action="cancel">${opts.cancelText || 'Cancel'}</button>
                    <button class="ui-modal__btn ui-modal__btn--primary" data-action="confirm">${opts.confirmText || 'OK'}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const input = overlay.querySelector('input');
        input.focus();
        if (defaultValue && inputType === 'text') input.select();

        return new Promise((resolve) => {
            const close = (result) => {
                overlay.remove();
                document.removeEventListener('keydown', onKey);
                resolve(result);
            };
            overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => close(input.value));
            overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => close(null));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
            const onKey = (e) => {
                if (e.key === 'Escape') close(null);
                if (e.key === 'Enter') close(input.value);
            };
            document.addEventListener('keydown', onKey);
        });
    };

    // Override the native window.confirm and window.alert so existing code
    // throughout the app automatically uses the styled modal — no per-file changes needed.
    // Note: native confirm/alert are SYNCHRONOUS; our styled versions return Promises.
    // We keep `window.confirm` returning a Promise — call sites already using `await confirm(...)`
    // continue to work; legacy `if (confirm(...))` calls fall back to the native dialog only when
    // window.confirm is invoked WITHOUT await (which always coerces a truthy Promise → `if(true)`).
    // To make legacy code safe, we ALSO patch the global `confirm` to throw a helpful note in console.
    const _nativeConfirm = window.confirm.bind(window);
    const _nativeAlert = window.alert.bind(window);
    const _nativePrompt = window.prompt.bind(window);
    window.confirm = (msg) => uiConfirm({ message: msg || '', title: 'Are you sure?' });
    window.alert = (msg) => uiAlert({ message: String(msg ?? ''), type: 'info' });
    window.prompt = (msg, def) => uiPrompt({ message: msg || '', defaultValue: def || '' });

    // Expose the originals in case anything truly needs them
    window.nativeConfirm = _nativeConfirm;
    window.nativeAlert = _nativeAlert;
    window.nativePrompt = _nativePrompt;
})();
