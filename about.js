document.addEventListener('DOMContentLoaded', () => {
  /* 
   * 1. Number Counter Animation (Impact Stats)
   */
  const statElements = document.querySelectorAll('.about-stat__value, .about-stats__highlight-value');
  const statsSection = document.querySelector('.about-stats');

  if (statElements.length > 0 && statsSection) {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    let animated = false;

    const statsObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !animated) {
          animated = true;

          statElements.forEach(el => {
            const originalText = el.innerText;
            // Math regex to separate digits from text like 'K+', '%', '+'
            const match = originalText.trim().match(/^([0-9,.]+)(.*)$/);

            if (match) {
              // Remove commas in case they exist, though currently '12k+' and '450+'
              const targetValue = parseInt(match[1].replace(/,/g, ''), 10);
              const suffix = match[2];

              const duration = 2000; // 2 seconds animation
              const frameRate = 1000 / 60; // 60 FPS
              const totalFrames = Math.round(duration / frameRate);
              let frame = 0;

              const counter = setInterval(() => {
                frame++;
                const progress = frame / totalFrames;

                // Ease out quad formula for smooth deceleration
                const easeOutProgress = progress * (2 - progress);
                const currentValue = Math.floor(targetValue * easeOutProgress);

                el.innerText = `${currentValue}${suffix}`;

                if (frame === totalFrames) {
                  clearInterval(counter);
                  // Ensure we end on the exact exact target value to avoid rounding artifacts
                  el.innerText = originalText;
                }
              }, frameRate);
            }
          });

          // Only animate once
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    statsObserver.observe(statsSection);
  }

  /* 
   * 2. Inquiry Form Handling & Validation
   */
  const form = document.querySelector('.contact-form-card .contact-form');

  if (form) {
    const inputs = form.querySelectorAll('.contact-form__input');
    const submitBtn = form.querySelector('.contact-form__actions button');

    // Standard Global Window Helper fallback
    const isValidEmail = window.isValidEmail || ((email) => {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(String(email).toLowerCase());
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      let isValid = true;
      let firstErrorInput = null;

      // Reset styles and error states on submit
      inputs.forEach(input => {
        input.style.borderBottomColor = '';
      });

      // Validate all fields are not empty
      inputs.forEach(input => {
        if (!input.value.trim()) {
          isValid = false;
          input.style.borderBottomColor = 'var(--color-error, #d32f2f)';
          if (!firstErrorInput) firstErrorInput = input;
        }
      });

      // Special check for Email format (assuming it's the 3rd input in about.html)
      // Or we can find by type
      const emailInput = document.querySelector('input[type="email"]');
      if (emailInput && emailInput.value.trim() && !isValidEmail(emailInput.value.trim())) {
        isValid = false;
        emailInput.style.borderBottomColor = 'var(--color-error, #d32f2f)';
        if (!firstErrorInput) firstErrorInput = emailInput;
      }

      if (!isValid) {
        if (firstErrorInput) firstErrorInput.focus();
        return; // Halt if invalid
      }

      // 1. Collect Payload (Backend Ready)
      const payload = {
        full_name: document.getElementById('name')?.value || 'Guest',
        email: emailInput?.value || 'N/A',
        message: form.querySelector('textarea')?.value || '',
        source: 'about_page_inquiry',
        timestamp: new Date().toISOString()
      };
      console.log('>>> [BACKEND READY] Sending Inquiry Payload:', payload);

      // Valid State - Submitting
      const originalBtnText = submitBtn.innerText;
      submitBtn.innerText = 'Sending...';
      submitBtn.disabled = true;

      // Simulate network request
      setTimeout(() => {
        // Success State
        form.reset();

        submitBtn.innerText = 'Message Sent!';
        submitBtn.classList.add('btn-primary--success'); // Assuming success styling logic

        // A visual success feedback directly applied
        submitBtn.style.backgroundColor = 'var(--color-primary-container, #d9f3d0)';
        submitBtn.style.color = 'var(--color-on-primary-container, #072104)';

        // Revert back after a bit
        setTimeout(() => {
          submitBtn.innerText = originalBtnText;
          submitBtn.disabled = false;
          submitBtn.classList.remove('btn-primary--success');
          submitBtn.style.backgroundColor = '';
          submitBtn.style.color = '';
        }, 3000);
      }, 1500);
    });
  }
});
// 333