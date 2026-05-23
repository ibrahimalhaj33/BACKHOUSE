/* ═══════════════════════════════════════════════════════
   BackHouse — Forgot Password Page JS (forgot-password.html)
   Extracted from app.js · No logic changes
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ─── ROUTING: detect if user is on step-2 (reset password) ──
  // URL like /forgot-password.html?token=XYZ&step=reset
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('token');
  const step = urlParams.get('step');

  if (step === 'reset' && resetToken) {
    showResetPasswordStep(resetToken);
    return;   // skip the email-input form wiring
  }

  // ═══════════════════════════════════════════════════════
  //  FORGOT PASSWORD FORM (Step 1 — email submission)
  // ═══════════════════════════════════════════════════════
  const forgotForm = document.getElementById('forgot-form');
  const resetBtn = document.getElementById('reset-btn');
  const forgotSuccess = document.getElementById('forgot-success');

  if (forgotForm && resetBtn) {

    const emailInput = forgotForm.querySelector('#email');

    /**
     * Collects reset data into a payload.
     */
    function collectPayload() {
      return {
        email:  emailInput.value.trim(),
        action: 'password_reset'
      };
    }

    async function sendResetRequest(payload) {
      const res = await fetch('http://127.0.0.1:8000/api/auth/forgot-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: payload.email }),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      // Backend always returns success to prevent email enumeration
      return { success: true, email: payload.email };
    }

    function showForgotSuccess(email) {
      // Hide the form
      forgotForm.hidden = true;

      // Update the page header
      const header = forgotForm.closest('.form-panel').querySelector('.form-panel__header');
      if (header) header.hidden = true;

      // Show success state
      if (forgotSuccess) {
        forgotSuccess.hidden = false;
        const emailEl = document.getElementById('forgot-success-email');
        if (emailEl) emailEl.textContent = email;
      }
    }

    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      let isValid = true;

      // Validate email
      if (!emailInput.value.trim()) {
        showError(emailInput, 'Email address is required.');
        isValid = false;
      } else if (!isValidEmail(emailInput.value.trim())) {
        showError(emailInput, 'Please enter a valid email address.');
        isValid = false;
      }

      if (!isValid) return;

      // 1. Collect payload
      const payload = collectPayload();

      // 2. Loading state
      const originalHTML = resetBtn.innerHTML;
      resetBtn.innerHTML = `
        Sending…
        <span class="material-symbols-outlined btn-primary__icon" aria-hidden="true">progress_activity</span>
      `;
      resetBtn.disabled = true;
      resetBtn.style.opacity = '0.7';
      resetBtn.style.cursor = 'not-allowed';

      try {
        // 3. Send to real API
        const response = await sendResetRequest(payload);
        if (response.success) {
          showForgotSuccess(response.email);
        }
      } catch (error) {
        resetBtn.innerHTML = originalHTML;
        resetBtn.disabled = false;
        resetBtn.style.opacity = '';
        resetBtn.style.cursor = '';
        const msg = error?.error?.message || 'Could not send reset email. Please try again.';
        showError(emailInput, msg);
        console.error('Reset request failed:', error);
      }
    });

    // ─── Resend link button ─────────────────────────────
    const resendBtn = document.getElementById('resend-btn');
    if (resendBtn) {
      resendBtn.addEventListener('click', async () => {
        resendBtn.textContent = 'Sending…';
        resendBtn.disabled = true;

        try {
          const emailEl = document.getElementById('forgot-success-email');
          const email = emailEl ? emailEl.textContent : '';
          await sendResetRequest({ email });

          resendBtn.textContent = 'Link sent ✓';
          setTimeout(() => {
            resendBtn.textContent = 'resend the link';
            resendBtn.disabled = false;
          }, 3000);
        } catch (error) {
          resendBtn.textContent = 'resend the link';
          resendBtn.disabled = false;
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════
  //  RESET PASSWORD STEP (Step 2 — set new password)
  // ═══════════════════════════════════════════════════════
  function showResetPasswordStep(token) {
    // Hide the email-form panel + header
    const forgotForm = document.getElementById('forgot-form');
    const header = document.querySelector('.form-panel__header');
    const forgotSuccess = document.getElementById('forgot-success');
    if (forgotForm) forgotForm.hidden = true;
    if (forgotSuccess) forgotSuccess.hidden = true;
    if (header) {
      header.querySelector('.form-panel__title').textContent = 'Set a new password';
      header.querySelector('.form-panel__subtitle').textContent =
        'Choose a strong password to secure your BackHouse account.';
    }

    const resetForm = document.getElementById('reset-form');
    const resetSuccess = document.getElementById('reset-success');
    const resetError = document.getElementById('reset-error');
    if (!resetForm) return;

    resetForm.hidden = false;

    const newPwInput = document.getElementById('new-password');
    const confirmInput = document.getElementById('confirm-password');
    const submitBtn = document.getElementById('reset-submit-btn');

    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Clear any old inline errors
      clearError?.(newPwInput);
      clearError?.(confirmInput);

      const pwd = newPwInput.value;
      const confirm = confirmInput.value;

      if (pwd.length < 8) {
        showError?.(newPwInput, 'Password must be at least 8 characters.');
        return;
      }
      if (pwd !== confirm) {
        showError?.(confirmInput, 'Passwords do not match.');
        return;
      }

      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Saving…';
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';

      try {
        const res = await fetch('http://127.0.0.1:8000/api/auth/reset-password/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            password: pwd,
            confirm_password: confirm,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw data;

        // Success → show success card
        resetForm.hidden = true;
        if (header) header.hidden = true;
        if (resetSuccess) resetSuccess.hidden = false;
      } catch (err) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        submitBtn.style.opacity = '';
        const code = err?.error?.code;
        const msg = err?.error?.message
          || Object.values(err?.error?.fields || {}).flat().join(' ')
          || 'Could not reset password. Please try again.';

        // For expired/invalid token, show the dedicated error card instead of inline
        if (code === 'INVALID_TOKEN' || code === 'TOKEN_EXPIRED') {
          resetForm.hidden = true;
          if (header) header.hidden = true;
          const errCard = document.getElementById('reset-error');
          const errMsg = document.getElementById('reset-error-msg');
          if (errCard) errCard.hidden = false;
          if (errMsg) errMsg.textContent = msg;
        } else {
          showError?.(newPwInput, msg);
        }
      }
    });

    // Password visibility toggles are wired globally by app.js (.toggle-password)
  }

});
