/* ═══════════════════════════════════════════════════════
   BackHouse — Forgot Password Page JS (forgot-password.html)
   Extracted from app.js · No logic changes
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ═══════════════════════════════════════════════════════
  //  FORGOT PASSWORD FORM (forgot-password.html)
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

    function mockResetRequest(payload) {
      console.log('[API Mock] POST /api/reset-password', payload);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, email: payload.email });
        }, 1800);
      });
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
        // 3. Send payload
        const response = await mockResetRequest(payload);

        if (response.success) {
          showForgotSuccess(response.email);
        }

      } catch (error) {
        resetBtn.innerHTML = originalHTML;
        resetBtn.disabled = false;
        resetBtn.style.opacity = '';
        resetBtn.style.cursor = '';
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
          await mockResetRequest(email);

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

});
