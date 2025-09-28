document.addEventListener('DOMContentLoaded', () => {
  console.log('[contact] DOM listo');

  const $ = (sel) => document.querySelector(sel);
  const form = $('#contactForm');
  const errors = $('#formErrors');
  const submitBtn = $('#submitBtn');
  const toast = $('#toast');

  if (!form) {
    console.error('[contact] No se encontró #contactForm. ¿El script carga antes del form? Mueve <script src="app.js"></script> al final del <body> o usa defer.');
    return;
  }

  // Utils
  const escapeHTML = (str) =>
    str.replace(/[&<>"'/]/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' }[c])
    );
  const trimAndCollapse = (s) => s.trim().replace(/\s+/g, ' ');
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const showErrors = (list) => {
    console.log('[contact] errores:', list);
    errors.textContent = list.join(' ');
    errors.classList.toggle('show', list.length > 0);
  };

  console.log('[contact] action:', form.action);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[contact] submit disparado');

    // 0) reCAPTCHA
    let greToken = '';
    if (typeof grecaptcha === 'undefined') {
      console.warn('[contact] grecaptcha no está definido. ¿Cargaste https://www.google.com/recaptcha/api.js ?');
      showErrors(['• No se pudo cargar reCAPTCHA. Revisa la consola.']);
      return;
    } else {
      greToken = grecaptcha.getResponse();
      if (!greToken) {
        showErrors(['• Por favor completa el reCAPTCHA.']);
        return;
      }
    }

    // 1) Campos
    const name = trimAndCollapse($('#name').value);
    const email = trimAndCollapse($('#email').value.toLowerCase());
    const phone = trimAndCollapse($('#phone').value || '');
    const subject = trimAndCollapse($('#subject').value);
    const message = $('#message').value.trim();
    const accepted = $('#terms').checked;

    const problems = [];
    if (name.length < 2) problems.push('• El nombre es demasiado corto.');
    if (!emailRx.test(email)) problems.push('• El correo no es válido.');
    if (phone && !/^[+0-9\s\-()]{7,20}$/.test(phone)) problems.push('• El teléfono contiene caracteres no permitidos.');
    if (subject.length < 3) problems.push('• El asunto es demasiado corto.');
    if (message.length < 10) problems.push('• El mensaje es demasiado corto.');
    if (!accepted) problems.push('• Debes aceptar los términos.');

    showErrors(problems);
    if (problems.length) return;

    // 2) Envío
    submitBtn && (submitBtn.disabled = true);
    try {
      const fd = new FormData(form);
      fd.set('name', escapeHTML(name));
      fd.set('email', escapeHTML(email));
      fd.set('phone', escapeHTML(phone));
      fd.set('subject', escapeHTML(subject));
      fd.set('message', escapeHTML(message.slice(0, 2000)));
      fd.set('terms', accepted ? 'on' : '');
      fd.set('g-recaptcha-response', greToken);

      console.log('[contact] enviando a:', form.action);
      const res = await fetch(  form.action, {
        method: 'POST',
        body: fd,
      });

      console.log('[contact] status:', res.status);
      if (!res.ok) {
        let msg = 'Error al enviar.';
        try {
          const data = await res.json();
          msg = data?.detail || data?.message || msg;
        } catch {
          msg = (await res.text()) || msg;
        }
        throw new Error(msg);
      }

      // Éxito
      form.reset();
      showErrors([]);
      grecaptcha.reset();
      if (toast) {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
      } else {
        alert('Mensaje enviado ✅');
      }
    } catch (err) {
      console.error('[contact] fallo fetch:', err);
      showErrors(['• ' + (err.message || 'No se pudo enviar. Revisa consola y CORS.')]);
    } finally {
      submitBtn && (submitBtn.disabled = false);
    }
  });
});

