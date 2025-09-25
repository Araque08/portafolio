// Utilidades de sanitización (escape básico)
        const escapeHTML = (str) =>
            str.replace(/[&<>"'/]/g, (c) =>
                ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' }[c]));

        const trimAndCollapse = (s) => s.trim().replace(/\s+/g, ' ');

        const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

        const $ = (sel) => document.querySelector(sel);

        const form = $('#contactForm');
        const errors = $('#formErrors');
        const submitBtn = $('#submitBtn');
        const toast = $('#toast');

        const showErrors = (list) => {
            errors.textContent = list.join(' ');
            errors.classList.toggle('show', list.length > 0);
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Honeypot: si el campo oculto viene con valor, abortar
            if ($('#empresa').value) return;

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

            // Evitar doble envío
            submitBtn.disabled = true;

            // “Sanear” para salida/registro o envío
            const payload = {
                name: escapeHTML(name),
                email: escapeHTML(email),
                phone: escapeHTML(phone),
                subject: escapeHTML(subject),
                message: escapeHTML(message.slice(0, 2000)),
                ts: Date.now()
            };

            // Aquí harías fetch a tu backend (POST /contact) con CSRF en server.
            // Demo: simulamos éxito.
            await new Promise(r => setTimeout(r, 700));

            form.reset();
            showErrors([]);
            submitBtn.disabled = false;

            // Toast
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2500);
        });

        // UX: impedir pegado de HTML malicioso (no bloquea, pero limpia al soltar foco)
        ['name', 'subject', 'message'].forEach(id => {
            const el = document.getElementById(id);
            el.addEventListener('blur', () => el.value = el.value.replace(/<[^>]*>/g, ''));
        });