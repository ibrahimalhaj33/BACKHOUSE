/* ═══════════════════════════════════════════════════════
   BackHouse — Login Page JS (login.html)
   Extracted from app.js · No logic changes
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ═══════════════════════════════════════════════════════
  //  LOGIN FORM (login.html)
  // ═══════════════════════════════════════════════════════
  const loginForm = document.querySelector('.login-form');
  const loginBtn = document.getElementById('login-btn');

  if (loginForm && loginBtn) {
    const emailInput = loginForm.querySelector('#email');
    const passwordInput = loginForm.querySelector('#password');

    /**
     * Collects login credentials into a payload.
     */
    function collectPayload() {
      return {
        email:    emailInput.value.trim(),
        password: passwordInput.value,
        source:   'web_login'
      };
    }

    async function mockLoginRequest(payload) {
      const res = await fetch('http://127.0.0.1:8000/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: payload.email, password: payload.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message || 'Invalid email or password.';
        throw new Error(msg);
      }
      localStorage.setItem('access_token', data.data.tokens.access);
      localStorage.setItem('refresh_token', data.data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      return { success: true };
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const originalText = loginBtn.textContent;
      let isValid = true;

      // Validate email
      if (!emailInput.value.trim()) {
        showError(emailInput, 'Email address is required.');
        isValid = false;
      } else if (!isValidEmail(emailInput.value.trim())) {
        showError(emailInput, 'Please enter a valid email address.');
        isValid = false;
      }

      // Validate password
      if (!passwordInput.value.trim()) {
        showError(passwordInput, 'Password is required.');
        isValid = false;
      }

      if (!isValid) return;

      // 1. Collect payload
      const payload = collectPayload();

      // 2. Loading state
      loginBtn.textContent = 'Authenticating…';
      loginBtn.disabled = true;
      loginBtn.style.opacity = '0.7';
      loginBtn.style.cursor = 'not-allowed';

      try {
        // 3. Send payload
        const response = await mockLoginRequest(payload);

        if (response.success) {
          setTimeout(() => {
              loginBtn.innerHTML = '✓ Success!';
              window.location.href = 'dashboard.html';
          }, 1500);
        }

      } catch (error) {
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
        loginBtn.style.opacity = '';
        loginBtn.style.cursor = '';
        showError(emailInput, error.message || 'Invalid email or password.');
      }
    });
  }

});
