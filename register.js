/* ═══════════════════════════════════════════════════════
   BackHouse — Registration Page JS (register.html)
   Extracted from app.js · No logic changes
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ═══════════════════════════════════════════════════════
  //  REGISTRATION FORM — Multi-Step (register.html)
  // ═══════════════════════════════════════════════════════
  const registrationForm = document.getElementById('registration-form');
  const nextBtn = document.getElementById('next-btn');
  const prevBtn = document.getElementById('prev-btn');
  const submitBtn = document.getElementById('submit-btn');

  if (registrationForm && nextBtn && prevBtn) {

    let currentStep = 1;
    const totalSteps = 4;

    // UI Elements
    const stepLabel = document.getElementById('step-label');
    const stepTitle = document.getElementById('step-title');
    const stepPercent = document.getElementById('step-percent');
    const progressFill = document.getElementById('progress-fill');
    const loginPrompt = document.getElementById('step-login-prompt');
    const reviewSummary = document.getElementById('review-summary');

    // Step metadata
    const stepData = {
      1: { title: 'Business Information' },
      2: { title: 'Business Address' },
      3: { title: 'Operations Details' },
      4: { title: 'Review & Submit' }
    };

    // ─── Show a given step ──────────────────────────────
    function showStep(step) {
      // Hide all steps
      document.querySelectorAll('.form-step').forEach(el => {
        el.hidden = true;
      });

      // Show target step
      const target = document.querySelector(`.form-step[data-step="${step}"]`);
      if (target) {
        target.hidden = false;
        // Re-trigger animation
        target.style.animation = 'none';
        target.offsetHeight; // force reflow
        target.style.animation = '';
      }

      // Update progress indicator
      const percent = Math.round((step / totalSteps) * 100);
      stepLabel.textContent = `Step ${String(step).padStart(2, '0')} of ${String(totalSteps).padStart(2, '0')}`;
      stepTitle.textContent = stepData[step].title;
      stepPercent.textContent = `${percent}%`;
      progressFill.style.width = `${percent}%`;
      progressFill.setAttribute('aria-valuenow', percent);

      // Show/hide nav buttons
      prevBtn.hidden = (step === 1);
      nextBtn.hidden = (step === totalSteps);
      submitBtn.hidden = (step !== totalSteps);

      // Hide login prompt after step 1
      if (loginPrompt) {
        loginPrompt.style.display = (step === 1) ? '' : 'none';
      }

      // Populate review on step 4
      if (step === totalSteps) {
        buildReviewSummary();
      }

      currentStep = step;
    }

    // ─── Validate current step fields ───────────────────
    function validateStep(step) {
      const stepEl = document.querySelector(`.form-step[data-step="${step}"]`);
      const requiredInputs = stepEl.querySelectorAll('[required]');
      let isValid = true;

      requiredInputs.forEach(input => {
        clearError(input);

        if (input.type === 'checkbox') {
          if (!input.checked) {
            isValid = false;
            // Highlight the checkbox label
            const label = input.closest('.form-checkbox-group');
            if (label) label.style.color = 'var(--color-error)';
          }
          return;
        }

        if (!input.value.trim()) {
          showError(input, 'This field is required.');
          isValid = false;
        } else if (input.type === 'email' && !isValidEmail(input.value.trim())) {
          showError(input, 'Please enter a valid email address.');
          isValid = false;
        }
      });

      return isValid;
    }

    // ─── Build Review Summary (Step 4) ──────────────────
    function buildReviewSummary() {
      if (!reviewSummary) return;

      const getValue = (id) => {
        const el = document.getElementById(id);
        return el ? (el.value.trim() || '—') : '—';
      };

      reviewSummary.innerHTML = `
        <div class="review-section">
          <h4 class="review-section__title">
            <span class="material-symbols-outlined" aria-hidden="true">domain</span>
            Business Information
          </h4>
          <div class="review-item">
            <span class="review-item__label">Business Name</span>
            <span class="review-item__value">${getValue('business_name')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Email</span>
            <span class="review-item__value">${getValue('email')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Phone</span>
            <span class="review-item__value">${getValue('phone')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Password</span>
            <span class="review-item__value review-item__value--masked">••••••••</span>
          </div>
        </div>

        <div class="review-section">
          <h4 class="review-section__title">
            <span class="material-symbols-outlined" aria-hidden="true">location_on</span>
            Business Address
          </h4>
          <div class="review-item">
            <span class="review-item__label">Street</span>
            <span class="review-item__value">${getValue('street_address')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">City</span>
            <span class="review-item__value">${getValue('city')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">State</span>
            <span class="review-item__value">${getValue('state')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">ZIP Code</span>
            <span class="review-item__value">${getValue('zip_code')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Country</span>
            <span class="review-item__value">${getValue('country')}</span>
          </div>
        </div>

        <div class="review-section">
          <h4 class="review-section__title">
            <span class="material-symbols-outlined" aria-hidden="true">factory</span>
            Operations Details
          </h4>
          <div class="review-item">
            <span class="review-item__label">Industry</span>
            <span class="review-item__value">${getValue('industry')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Company Size</span>
            <span class="review-item__value">${getValue('company_size')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Waste Volume</span>
            <span class="review-item__value">${getValue('waste_volume')}</span>
          </div>
        </div>
      `;
    }

    /**
     * Collects all registration fields into a clean JSON payload.
     * This defines the "API Contract" for the backend team.
     */
    function collectPayload() {
      const getValue = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : null;
      };

      return {
        // Step 1: Business Info
        business_name: getValue('business_name'),
        email:         getValue('email'),
        phone:         getValue('phone'),
        password:      getValue('password'), // In real life, backend handles hashing

        // Step 2: Address
        address: {
          street:  getValue('street_address'),
          city:    getValue('city'),
          state:   getValue('state'),
          zip:     getValue('zip_code'),
          country: getValue('country')
        },

        // Step 3: Operations
        industry:     getValue('industry'),
        company_size: getValue('company_size'),
        waste_volume: getValue('waste_volume'),

        // Metadata
        registration_date: new Date().toISOString(),
        source:            'web_frontend'
      };
    }

    // ─── Mock Registration API ──────────────────────────
    function mockRegisterRequest(payload) {
      console.log('[API Mock] POST /api/register', payload);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 2000);
      });
    }

    // ─── Show Registration Success ──────────────────────
    function showRegistrationSuccess() {
      const formPanel = registrationForm.closest('.form-panel');
      const progressIndicator = formPanel.querySelector('.progress-indicator');
      const legalNotice = formPanel.querySelector('.legal-notice');

      // Hide form, progress, and legal
      registrationForm.hidden = true;
      if (progressIndicator) progressIndicator.hidden = true;
      if (legalNotice) legalNotice.hidden = true;

      // Create and show success message
      const success = document.createElement('div');
      success.className = 'registration-success';
      success.innerHTML = `
        <span class="material-symbols-outlined registration-success__icon" aria-hidden="true">verified</span>
        <h3 class="registration-success__title">Registration Submitted!</h3>
        <p class="registration-success__text">
          Welcome to the BackHouse network. We've sent a verification email to
          <strong>${document.getElementById('email').value.trim()}</strong>.
          Please verify your account to get started.
        </p>
        <a href="login.html" class="btn-primary" style="margin-top: var(--space-lg);">
          Go to Login
          <span class="material-symbols-outlined btn-primary__icon" aria-hidden="true">arrow_forward</span>
        </a>
      `;

      // Insert before legal notice or at end of panel
      formPanel.insertBefore(success, legalNotice);
    }

    // ─── Next button ────────────────────────────────────
    nextBtn.addEventListener('click', () => {
      if (!validateStep(currentStep)) return;
      if (currentStep < totalSteps) {
        showStep(currentStep + 1);
      }
    });

    // ─── Previous button ────────────────────────────────
    prevBtn.addEventListener('click', () => {
      if (currentStep > 1) {
        showStep(currentStep - 1);
      }
    });

    // ─── Prevent native form submission ───────────────────
    registrationForm.addEventListener('submit', (e) => {
      e.preventDefault();
    });

    // ─── Submit button click (final step) ────────────────
    submitBtn.addEventListener('click', async () => {
      if (!validateStep(currentStep)) return;

      // Check the terms checkbox specifically
      const termsCheck = document.getElementById('agree_terms');
      if (termsCheck && !termsCheck.checked) {
        const group = termsCheck.closest('.form-checkbox-group');
        if (group) group.style.color = 'var(--color-error)';
        return;
      }

      // 1. Collect the professional payload
      const payload = collectPayload();

      // 2. Loading state
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = `
        Submitting…
        <span class="material-symbols-outlined btn-primary__icon" aria-hidden="true">progress_activity</span>
      `;
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';
      submitBtn.style.cursor = 'not-allowed';

      try {
        // 3. Send payload to mock API
        const response = await mockRegisterRequest(payload);

        if (response.success) {
          setTimeout(() => {
              submitBtn.innerHTML = '✓ Success!';
              window.location.href = 'dashboard.html';
          }, 1500);
        }

      } catch (error) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        submitBtn.style.opacity = '';
        submitBtn.style.cursor = '';
        console.error('Registration failed:', error);
      }
    });

    // Clear checkbox error on change
    const termsCheckbox = document.getElementById('agree_terms');
    if (termsCheckbox) {
      termsCheckbox.addEventListener('change', () => {
        const group = termsCheckbox.closest('.form-checkbox-group');
        if (group) group.style.color = '';
      });
    }

    // Initialize step 1
    showStep(1);
  }

});
