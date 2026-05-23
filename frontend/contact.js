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


    // Build payload aligned with the backend serializer
    function collectApiPayload() {
      return {
        full_name: nameField.value.trim(),
        email:     emailField.value.trim(),
        phone:     phoneField.value.trim(),
        subject:   subjectField.value,
        message:   messageField.value.trim(),
      };
    }

    // ─── Submit Handler (real API) ──────────────────────
    contactForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      // 1. Validate
      const errors = validateForm();
      if (errors.length > 0) {
        alert('Please fix the following:\n\n' + errors.join('\n'));
        return;
      }

      // 2. Loading state
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';
      submitBtn.style.pointerEvents = 'none';
      if (btnIcon) btnIcon.textContent = 'hourglass_empty';
      submitBtn.childNodes[0].textContent = 'Sending… ';

      // 3. POST to real API
      try {
        const res = await fetch('http://127.0.0.1:8000/api/contact/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(collectApiPayload()),
        });
        const data = await res.json();
        if (!res.ok) throw data;

        // 4. Success → reset form + show success state
        contactForm.reset();
        if (btnIcon) btnIcon.textContent = 'check_circle';
        submitBtn.childNodes[0].textContent = 'Sent! ';

        if (typeof uiAlert === 'function') {
          await uiAlert({
            type: 'success',
            title: 'Inquiry submitted',
            message: data?.data?.message || `Thank you, ${nameField.value.trim() || 'we'}. We'll get back to you soon.`,
          });
        }

        // 5. Restore button after 2 seconds
        setTimeout(function () {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '';
          submitBtn.style.pointerEvents = '';
          if (btnIcon) btnIcon.textContent = 'arrow_forward';
          submitBtn.childNodes[0].textContent = originalTxt + ' ';
        }, 2000);
      } catch (err) {
        // Restore button
        submitBtn.disabled = false;
        submitBtn.style.opacity = '';
        submitBtn.style.pointerEvents = '';
        if (btnIcon) btnIcon.textContent = 'arrow_forward';
        submitBtn.childNodes[0].textContent = originalTxt + ' ';

        const fields = err?.error?.fields || {};
        const msg = Object.values(fields).flat().join('\n')
          || err?.error?.message
          || 'Could not send your inquiry. Please try again.';
        if (typeof uiAlert === 'function') {
          await uiAlert({ type: 'error', title: 'Could not send', message: msg });
        } else {
          alert(msg);
        }
      }
    });

  }

});
