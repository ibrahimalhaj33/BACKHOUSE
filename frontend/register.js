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

    // ─── Password strength: rules + live meter ──────────
    const PW_RULES = [
      { key: 'len',     label: 'At least 8 characters',           test: v => v.length >= 8 },
      { key: 'upper',   label: 'Uppercase letter (A–Z)',          test: v => /[A-Z]/.test(v) },
      { key: 'lower',   label: 'Lowercase letter (a–z)',          test: v => /[a-z]/.test(v) },
      { key: 'digit',   label: 'Number (0–9)',                    test: v => /\d/.test(v) },
      { key: 'special', label: 'Special char (! @ # $ …)',        test: v => /[!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]/.test(v) },
      { key: 'nospace', label: 'No spaces',                       test: v => v.length > 0 && !/\s/.test(v) },
    ];

    function evaluatePassword(value) {
      const passed = PW_RULES.filter(r => r.test(value)).map(r => r.key);
      return { passed, score: passed.length, isStrong: passed.length === PW_RULES.length };
    }

    function updatePasswordUI() {
      const input = document.getElementById('password');
      const wrap  = document.getElementById('pw-strength');
      if (!input || !wrap) return;
      const v = input.value;
      wrap.hidden = v.length === 0;
      if (v.length === 0) return;

      const { passed, score } = evaluatePassword(v);

      // Rules list
      PW_RULES.forEach(r => {
        const li = wrap.querySelector(`li[data-rule="${r.key}"]`);
        if (!li) return;
        const ok = passed.includes(r.key);
        li.style.color = ok ? '#059669' : '#6b7280';
        const ic = li.querySelector('.pw-icon');
        if (ic) ic.textContent = ok ? '✓' : '○';
      });

      // Strength bars: weak < 3, fair 3, good 4-5, strong 6
      const tiers = [
        { upTo: 2, color: '#ef4444', label: 'Weak password' },
        { upTo: 3, color: '#f59e0b', label: 'Fair password' },
        { upTo: 5, color: '#3b82f6', label: 'Good password' },
        { upTo: 6, color: '#10b981', label: 'Strong password' },
      ];
      const tier = tiers.find(t => score <= t.upTo) || tiers[tiers.length - 1];
      const lit = Math.min(5, Math.max(1, Math.ceil((score / 6) * 5)));
      wrap.querySelectorAll('.pw-bar').forEach((b, i) => {
        b.style.background = (i < lit) ? tier.color : '#e5e7eb';
      });
      const lbl = document.getElementById('pw-label');
      if (lbl) { lbl.textContent = tier.label; lbl.style.color = tier.color; }
    }

    const pwField = document.getElementById('password');
    if (pwField) {
      pwField.addEventListener('input', updatePasswordUI);
      pwField.addEventListener('focus', updatePasswordUI);
    }

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
        } else if (input.id === 'zip_code') {
          if (!/^\d{5}$/.test(input.value.trim())) {
            showError(input, 'Jordanian postal codes are 5 digits (e.g. 11183).');
            isValid = false;
          }
        } else if (input.id === 'password') {
          const { isStrong, passed } = evaluatePassword(input.value);
          if (!isStrong) {
            const missing = PW_RULES.filter(r => !passed.includes(r.key)).map(r => r.label);
            showError(input, 'Password is not strong enough: ' + missing.join(', ') + '.');
            isValid = false;
          }
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
            <span class="review-item__label">Street &amp; Building</span>
            <span class="review-item__value">${getValue('street_address')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">District / Area</span>
            <span class="review-item__value">${getValue('city')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Governorate</span>
            <span class="review-item__value">${getValue('state')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Postal Code</span>
            <span class="review-item__value">${getValue('zip_code')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Country</span>
            <span class="review-item__value">${getValue('country') || 'Jordan'}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">GPS Pin</span>
            <span class="review-item__value">${
              (getValue('latitude') !== '—' && getValue('longitude') !== '—')
                ? `${getValue('latitude')}, ${getValue('longitude')}`
                : 'Not set'
            }</span>
          </div>
        </div>

        <div class="review-section">
          <h4 class="review-section__title">
            <span class="material-symbols-outlined" aria-hidden="true">restaurant</span>
            HORECA Operations
          </h4>
          <div class="review-item">
            <span class="review-item__label">Business Type</span>
            <span class="review-item__value">${getValue('industry')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Cuisine / Specialty</span>
            <span class="review-item__value">${getValue('cuisine')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Operating Capacity</span>
            <span class="review-item__value">${getValue('company_size')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Kitchen Staff</span>
            <span class="review-item__value">${getValue('staff_count')}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Weekly Surplus</span>
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
        password:      getValue('password'),

        // Step 2: Address (flat fields — matches backend serializer)
        street_address: getValue('street_address'),
        city:           getValue('city'),
        state:          getValue('state'),
        zip_code:       getValue('zip_code'),
        country:        getValue('country'),

        // Step 3: HORECA operations
        industry:     (() => {
          const ind = getValue('industry') || '';
          const cui = getValue('cuisine') || '';
          return cui ? `${ind} — ${cui}` : ind;
        })(),
        company_size: (() => {
          const cap = getValue('company_size') || '';
          const staff = getValue('staff_count') || '';
          return staff ? `${cap} (${staff} staff)` : cap;
        })(),
        waste_volume: getValue('waste_volume'),

        // Optional GPS pin (used by location-based search/radius)
        latitude:  getValue('latitude')  || null,
        longitude: getValue('longitude') || null,
      };
    }

    // ─── GPS detection (optional) ───────────────────────
    const detectBtn = document.getElementById('detect-location-btn');
    const detectStatus = document.getElementById('detect-location-status');
    if (detectBtn) {
      detectBtn.addEventListener('click', () => {
        if (!('geolocation' in navigator)) {
          detectStatus.textContent = 'Geolocation is not supported by this browser.';
          detectStatus.style.color = '#ef4444';
          return;
        }
        detectStatus.textContent = 'Detecting your location…';
        detectStatus.style.color = '#6b7280';
        detectBtn.disabled = true;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude.toFixed(6);
            const lng = pos.coords.longitude.toFixed(6);
            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lng;
            detectStatus.innerHTML = `✓ Pinned: <strong>${lat}, ${lng}</strong>`;
            detectStatus.style.color = '#059669';
            detectBtn.disabled = false;
          },
          (err) => {
            detectStatus.textContent = 'Could not get location: ' + err.message;
            detectStatus.style.color = '#ef4444';
            detectBtn.disabled = false;
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }

    // ─── Real Registration API ──────────────────────────
    async function mockRegisterRequest(payload) {
      const res = await fetch('http://127.0.0.1:8000/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      // Store JWT tokens for subsequent requests
      localStorage.setItem('access_token', data.data.tokens.access);
      localStorage.setItem('refresh_token', data.data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      return { success: true };
    }

    // ─── Verification Code Step ─────────────────────────
    function showVerifyCodeStep(email) {
        const formPanel = registrationForm.closest('.form-panel');
        const progressIndicator = formPanel.querySelector('.progress-indicator');
        const legalNotice = formPanel.querySelector('.legal-notice');
        const loginPromptEl = document.getElementById('step-login-prompt');

        // Hide registration form + extras
        registrationForm.hidden = true;
        if (progressIndicator) progressIndicator.hidden = true;
        if (legalNotice) legalNotice.hidden = true;
        if (loginPromptEl) loginPromptEl.style.display = 'none';

        // Remove any existing verify panel (in case of retry)
        formPanel.querySelector('.verify-code-step')?.remove();

        const wrap = document.createElement('div');
        wrap.className = 'verify-code-step';
        wrap.innerHTML = `
            <div style="text-align:center; padding:1rem 0;">
                <div style="width:72px; height:72px; border-radius:50%; background:rgba(16,185,129,0.12); color:#10b981; display:inline-flex; align-items:center; justify-content:center; margin-bottom:1rem;">
                    <span class="material-symbols-outlined" style="font-size:36px;">mark_email_read</span>
                </div>
                <h2 style="margin:0 0 0.5rem 0; font-size:1.4rem; font-weight:700; color:#111827;">Check your email</h2>
                <p style="color:#6b7280; margin:0 0 0.25rem 0; font-size:0.9rem;">We've sent a 6-digit verification code to</p>
                <p style="font-weight:600; color:#111827; margin:0 0 1.5rem 0; font-size:0.95rem;">${email}</p>

                <!-- 6 single-digit boxes -->
                <div id="code-inputs" style="display:flex; justify-content:center; gap:0.5rem; margin-bottom:1rem;">
                    ${Array.from({length:6}, (_,i) => `
                        <input type="text" inputmode="numeric" maxlength="1" data-index="${i}" autocomplete="one-time-code"
                               style="width:48px; height:56px; text-align:center; font-size:1.5rem; font-weight:700; border:1.5px solid #e5e7eb; border-radius:10px; outline:none; color:#111827; background:#fff; transition:all 0.15s ease;"
                               onfocus="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 0 3px rgba(16,185,129,0.15)';"
                               onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='';">
                    `).join('')}
                </div>

                <p id="verify-error" style="color:#ef4444; font-size:0.8rem; margin:0.5rem 0 1rem 0; min-height:1rem;"></p>

                <button id="verify-submit-btn" class="btn-primary" style="width:100%; padding:0.85rem; font-size:0.95rem; margin-bottom:1rem;" disabled>
                    Verify Email
                    <span class="material-symbols-outlined btn-primary__icon">arrow_forward</span>
                </button>

                <div style="text-align:center; font-size:0.85rem; color:#6b7280;">
                    Didn't get the code?
                    <button id="verify-resend-btn" type="button" style="background:none; border:none; color:#10b981; font-weight:600; cursor:pointer; padding:0; margin-left:0.25rem;">
                        Resend
                    </button>
                </div>
                <p id="verify-resend-status" style="font-size:0.75rem; color:#10b981; margin:0.5rem 0 0 0; text-align:center; min-height:1rem;"></p>

                <p style="font-size:0.75rem; color:#9ca3af; margin-top:1.5rem;">
                    Wrong email? <a href="register.html" style="color:#10b981; font-weight:600;">Start over</a>
                </p>
            </div>
        `;
        formPanel.insertBefore(wrap, legalNotice);

        const inputs = wrap.querySelectorAll('#code-inputs input');
        const errEl = wrap.querySelector('#verify-error');
        const submitBtnEl = wrap.querySelector('#verify-submit-btn');
        const resendBtnEl = wrap.querySelector('#verify-resend-btn');
        const resendStatus = wrap.querySelector('#verify-resend-status');

        const getCode = () => Array.from(inputs).map(i => i.value).join('');
        const updateSubmitState = () => {
            submitBtnEl.disabled = getCode().length !== 6;
            submitBtnEl.style.opacity = submitBtnEl.disabled ? '0.5' : '1';
            submitBtnEl.style.cursor = submitBtnEl.disabled ? 'not-allowed' : 'pointer';
        };
        updateSubmitState();

        // Auto-focus first input, auto-advance, allow paste, backspace navigation
        setTimeout(() => inputs[0]?.focus(), 100);
        inputs.forEach((input, i) => {
            input.addEventListener('input', (e) => {
                errEl.textContent = '';
                input.value = input.value.replace(/\D/g, '');   // digits only
                if (input.value.length === 1 && i < inputs.length - 1) {
                    inputs[i + 1].focus();
                }
                updateSubmitState();
                if (getCode().length === 6) verifyCode();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && i > 0) {
                    inputs[i - 1].focus();
                }
            });
            // Paste full code into first input
            input.addEventListener('paste', (e) => {
                const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
                if (text.length >= 6) {
                    e.preventDefault();
                    inputs.forEach((inp, idx) => { inp.value = text[idx] || ''; });
                    updateSubmitState();
                    verifyCode();
                }
            });
        });

        submitBtnEl.addEventListener('click', verifyCode);

        resendBtnEl.addEventListener('click', async () => {
            resendBtnEl.disabled = true;
            resendStatus.textContent = 'Sending…';
            resendStatus.style.color = '#6b7280';
            try {
                const res = await fetch('http://127.0.0.1:8000/api/auth/resend-code/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                if (res.ok) {
                    resendStatus.textContent = '✓ New code sent! Check your email.';
                    resendStatus.style.color = '#10b981';
                } else {
                    resendStatus.textContent = 'Could not resend. Try again.';
                    resendStatus.style.color = '#ef4444';
                }
            } catch (_) {
                resendStatus.textContent = 'Network error.';
                resendStatus.style.color = '#ef4444';
            }
            // Cooldown 30 sec
            setTimeout(() => { resendBtnEl.disabled = false; resendStatus.textContent = ''; }, 30000);
        });

        async function verifyCode() {
            const code = getCode();
            if (code.length !== 6) return;
            submitBtnEl.disabled = true;
            submitBtnEl.innerHTML = 'Verifying…';
            errEl.textContent = '';
            try {
                const res = await fetch('http://127.0.0.1:8000/api/auth/verify-email/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, code }),
                });
                const data = await res.json();
                if (!res.ok) throw data;
                // Success → go to dashboard
                submitBtnEl.innerHTML = '✓ Verified';
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
            } catch (err) {
                const msg = err?.error?.message || 'Could not verify the code.';
                errEl.textContent = msg;
                submitBtnEl.innerHTML = `Verify Email <span class="material-symbols-outlined btn-primary__icon">arrow_forward</span>`;
                updateSubmitState();
                // Clear inputs & focus first on error
                inputs.forEach(i => i.value = '');
                inputs[0]?.focus();
            }
        }
    }

    // ─── Show Registration Success (legacy — unused now) ─
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
          // Show the verification-code step instead of jumping to dashboard
          submitBtn.innerHTML = '✓ Account created';
          setTimeout(() => showVerifyCodeStep(payload.email), 600);
        }

      } catch (error) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        submitBtn.style.opacity = '';
        submitBtn.style.cursor = '';
        console.error('Registration failed:', error);

        // Build a clear, readable error message for the user
        const baseMsg = error?.error?.message || 'Registration failed. Please try again.';
        const fields = error?.error?.fields;
        let detail = '';
        if (fields && typeof fields === 'object') {
          detail = '\n\n' + Object.entries(fields)
            .map(([k, v]) => `• ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('\n');

          // Also try to highlight the specific field in the form
          Object.keys(fields).forEach(fieldName => {
            const input = document.querySelector(`[name="${fieldName}"]`);
            if (input) {
              const msg = Array.isArray(fields[fieldName]) ? fields[fieldName][0] : fields[fieldName];
              showError(input, msg);
              // Jump back to the step containing this field
              const stepEl = input.closest('.form-step');
              if (stepEl) {
                const stepNum = parseInt(stepEl.dataset.step);
                if (stepNum && stepNum < currentStep) showStep(stepNum);
              }
            }
          });
        }
        alert(baseMsg + detail);
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
