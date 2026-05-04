/* ═══════════════════════════════════════════════════════
   BackHouse — Contact Page JS (contact.html)
   Extracted from app.js · No logic changes
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ═══════════════════════════════════════════════════════
  //  CONTACT PAGE (contact.html)
  // ═══════════════════════════════════════════════════════
  const contactForm = document.querySelector('.contact-form');

  if (contactForm) {

    const submitBtn   = contactForm.querySelector('.btn-primary');
    const btnIcon     = submitBtn ? submitBtn.querySelector('.btn-primary__icon') : null;
    const originalTxt = 'Submit Inquiry';

    // Field references
    const nameField    = document.getElementById('contact-name');
    const emailField   = document.getElementById('contact-email');
    const phoneField   = document.getElementById('contact-phone');
    const subjectField = document.getElementById('contact-subject');
    const messageField = document.getElementById('contact-message');


    /**
     * Basic email format check (contains @ and a dot after it)
     */
    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }


    /**
     * Validates required fields and email format.
     * Returns an array of error messages (empty = valid).
     */
    function validateForm() {
      const errors = [];

      if (!nameField.value.trim()) {
        errors.push('Full Name is required.');
      }

      if (!emailField.value.trim()) {
        errors.push('Email Address is required.');
      } else if (!isValidEmail(emailField.value.trim())) {
        errors.push('Please enter a valid email address (e.g. name@domain.com).');
      }

      if (!messageField.value.trim()) {
        errors.push('Message cannot be empty.');
      }

      return errors;
    }


    /**
     * Collects all form values into a clean payload object.
     */
    function collectPayload() {
      return {
        fullName: nameField.value.trim(),
        email:    emailField.value.trim(),
        phone:    phoneField.value.trim() || '—',
        subject:  subjectField.value,
        message:  messageField.value.trim()
      };
    }


    // ─── Submit Handler ────────────────────────────────
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      // 1. Validate
      const errors = validateForm();

      if (errors.length > 0) {
        console.warn('[BackHouse] Contact form validation failed:');
        errors.forEach(err => console.warn('  •', err));
        alert('Please fix the following:\n\n' + errors.join('\n'));
        return;
      }

      // 2. Collect payload
      const payload = collectPayload();

      // 3. Disable button & show "Sending..."
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';
      submitBtn.style.pointerEvents = 'none';
      if (btnIcon) btnIcon.textContent = 'hourglass_empty';
      submitBtn.childNodes[0].textContent = 'Sending… ';

      // 4. Simulate async API call (1 second delay)
      setTimeout(function () {

        // ╔═══════════════════════════════════════════════════════╗
        // ║  BACKEND DEVS:                                       ║
        // ║  Replace this console.log with your actual POST      ║
        // ║  request to the /api/contact endpoint.               ║
        // ║                                                       ║
        // ║  Example:                                             ║
        // ║  const res = await fetch('/api/contact', {            ║
        // ║    method: 'POST',                                    ║
        // ║    headers: { 'Content-Type': 'application/json' },   ║
        // ║    body: JSON.stringify(payload)                       ║
        // ║  });                                                  ║
        // ╚═══════════════════════════════════════════════════════╝

        console.log('[BackHouse API] POST /api/contact');
        console.log('[BackHouse API] Inquiry payload:', payload);

        // 5. Reset form & show success state
        contactForm.reset();

        if (btnIcon) btnIcon.textContent = 'check_circle';
        submitBtn.childNodes[0].textContent = 'Sent! ';

        // 6. Restore button to original state after 2 seconds
        setTimeout(function () {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '';
          submitBtn.style.pointerEvents = '';
          if (btnIcon) btnIcon.textContent = 'arrow_forward';
          submitBtn.childNodes[0].textContent = originalTxt + ' ';
        }, 2000);

      }, 1000);
    });

  }

});
