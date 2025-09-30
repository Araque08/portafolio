// guard.js
// Utilidades comunes para frontends con Django (mismo dominio).
// - Detecta BASE para APIs
// - Helper para CSRF (solo necesario en POST/PUT/PATCH/DELETE)
// - fetchJSON con manejo simple de errores

(function () {
  // Si tu backend está en el mismo dominio, lo dejamos vacío.
  // Si tu API vive en otro host, reemplaza por "https://tu-backend.com"
  const API_BASE = "";

  // --- CSRF helpers (Django) ---
  function getCookie(name) {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith(name + "="));
    return cookieValue ? decodeURIComponent(cookieValue.split("=")[1]) : null;
  }

  function withCSRF(init = {}) {
    const method = (init.method || "GET").toUpperCase();
    const needsCSRF = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    const headers = new Headers(init.headers || {});
    if (needsCSRF && !headers.has("X-CSRFToken")) {
      const token = getCookie("csrftoken");
      if (token) headers.set("X-CSRFToken", token);
    }
    return { ...init, headers };
  }

  async function fetchJSON(url, init = {}) {
    const res = await fetch(url, withCSRF(init));
    const ct = res.headers.get("content-type") || "";
    if (!res.ok) {
      let detail = "";
      if (ct.includes("application/json")) {
        try {
          const j = await res.json();
          detail = j.detail || JSON.stringify(j);
        } catch {}
      } else {
        detail = await res.text().catch(() => "");
      }
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${detail}`.trim());
    }
    if (ct.includes("application/json")) return res.json();
    return res.text();
  }

  // Si algún día manejas sesión en front, resuélvela aquí:
  const SESION_PROMISE = Promise.resolve(null);

  // Exponer en window para otros scripts
  window.API_BASE = API_BASE;
  window.fetchJSON = fetchJSON;
  window.SESION_PROMISE = SESION_PROMISE;
})();
