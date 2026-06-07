(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initHeaderState() {
    const header = document.querySelector('.hdr');
    if (!header) return;
    const sync = () => header.classList.toggle('scrolled', window.scrollY > 32);
    sync();
    window.addEventListener('scroll', sync, { passive: true });
  }

  function initReveal() {
    const items = Array.from(document.querySelectorAll('.reveal'));
    if (!items.length) return;

    if (reducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

    items.forEach((el) => observer.observe(el));

    // Fallback: nada deve ficar invisível se o observer não disparar.
    window.setTimeout(() => {
      items
        .filter((el) => !el.classList.contains('is-visible'))
        .forEach((el) => el.classList.add('is-visible'));
    }, 4000);
  }

  function initCurrentYear() {
    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function initCapacityForm() {
    const form = document.getElementById('capacity-form');
    if (!form) return;

    const success = document.getElementById('form-success');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let errorEl = null;

    function setFieldState(field, isInvalid) {
      field.classList.toggle('invalid', isInvalid);
      if (isInvalid) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const fields = Array.from(form.querySelectorAll('input, select'));
      let firstInvalid = null;

      fields.forEach((field) => {
        const value = (field.value || '').trim();
        let invalid = field.hasAttribute('required') && value === '';
        if (!invalid && field.type === 'email' && value !== '' && !emailPattern.test(value)) {
          invalid = true;
        }
        setFieldState(field, invalid);
        if (invalid && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        if (!errorEl) {
          errorEl = document.createElement('p');
          errorEl.className = 'form-error';
          errorEl.setAttribute('role', 'alert');
          (form.querySelector('.form-foot') || form).appendChild(errorEl);
        }
        errorEl.textContent = 'Preencha os campos destacados para enviar.';
        firstInvalid.focus();
        return;
      }

      if (errorEl) errorEl.textContent = '';
      form.hidden = true;

      if (success) {
        success.hidden = false;
        success.setAttribute('tabindex', '-1');
        success.focus();
      }
    });

    form.addEventListener('input', (event) => {
      const field = event.target;
      if (field.classList && field.classList.contains('invalid')) {
        setFieldState(field, false);
      }
    });
  }

  initHeaderState();
  initReveal();
  initCurrentYear();
  initCapacityForm();
})();
