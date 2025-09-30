// js/faq.js
// Carga FAQs desde /api/faqs y renderiza un acordeón accesible con búsqueda/filtros.

const byId   = (id) => document.getElementById(id);
const $list  = byId('faq-list');
const $empty = byId('faq-empty');
const $error = byId('faq-error');
const $search = byId('faq-search');
const $filters = byId('faq-filters');
const $toggleAll = byId('btn-toggle-all');

// Config: si no dan ENDPOINT, usar por defecto el de Django
const { FAQ_CONFIG = {} } = window;
const ENDPOINT = FAQ_CONFIG.ENDPOINT || "/api/faqs?published=true";
const PAGE_SIZE = FAQ_CONFIG.PAGE_SIZE ?? 200;

// Sanitizador básico
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => (
  {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]
));

// Estado
let RAW = [];
let FILTER = { q: "", cats: new Set() };
let ALL_OPEN = false;

// Utils DOM
function el(tag, attrs = {}, html){
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if (k === 'dataset') Object.entries(v).forEach(([dk,dv])=> node.dataset[dk] = dv);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  });
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function stripHTML(html){
  const tmp = document.createElement('div');
  tmp.innerHTML = String(html ?? '');
  return tmp.textContent || tmp.innerText || '';
}
function renderAnswerHTML(html){
  return String(html ?? '').trim() || '<p>—</p>';
}
function formatDate(iso){
  try{
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('es-CO', { year:'numeric', month:'short', day:'2-digit' });
  }catch{ return ''; }
}

// Item del acordeón
function buildItem(faq){
  const id = faq.slug || `faq-${faq.id}`;
  const open = (location.hash.replace('#','') === id);

  const $item = el('article', { class: 'faq-item', ...(open ? { open: '' } : {}) });
  const controlsId = `panel-${id}`;

  const $btn = el('button', {
    class: 'faq-toggle',
    type: 'button',
    'aria-expanded': open ? 'true' : 'false',
    'aria-controls': controlsId,
    id: `btn-${id}`
  });

  const metaBits = [];
  if (faq.category) metaBits.push(`<span class="badge">${esc(faq.category)}</span>`);
  if (faq.updated_at) metaBits.push(`<span>Actualizado: ${esc(formatDate(faq.updated_at))}</span>`);

  $btn.innerHTML = `
    <div class="faq-header">
      <div class="faq-q-text">${esc(faq.question ?? faq.title)}</div>
      <div class="faq-meta">${metaBits.join('')}</div>
    </div>
    <svg class="faq-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 15.5a1 1 0 0 1-.7-.3l-6-6a1 1 0 1 1 1.4-1.4L12 13.1l5.3-5.3a1 1 0 1 1 1.4 1.4l-6 6a1 1 0 0 1-.7.3z"/>
    </svg>
  `;

  const $panel = el('div', {
    class: 'faq-panel',
    id: controlsId,
    role: 'region',
    'aria-labelledby': `btn-${id}`,
    hidden: open ? null : ''
  });
  $panel.innerHTML = `<div class="faq-a">${renderAnswerHTML(faq.answer)}</div>`;

  // Toggle
  $btn.addEventListener('click', () => {
    const isOpen = $btn.getAttribute('aria-expanded') === 'true';
    $btn.setAttribute('aria-expanded', String(!isOpen));
    if (isOpen) {
      $panel.hidden = true;
      $item.removeAttribute('open');
      if (location.hash.replace('#','') === id) history.replaceState(null, '', ' ');
    } else {
      $panel.hidden = false;
      $item.setAttribute('open','');
      location.hash = id;
    }
    updateToggleAllState();
  });

  if (open) {
    $panel.hidden = false;
    $btn.setAttribute('aria-expanded','true');
    $item.setAttribute('open','');
  }

  $item.appendChild($btn);
  $item.appendChild($panel);
  return $item;
}

// Render principal
function render(){
  $error.classList.add('hidden');

  const q = FILTER.q.trim().toLowerCase();
  const cats = FILTER.cats;

  const results = RAW.filter(f => {
    const matchCat = cats.size === 0 || (f.category && cats.has(f.category));
    const hay = (String(f.question ?? f.title) + ' ' + stripHTML(f.answer)).toLowerCase();
    const matchQ = q === '' || hay.includes(q);
    return matchCat && matchQ;
  });

  $list.innerHTML = '';

  if (!results.length){
    $empty.classList.remove('hidden');
    return;
  }
  $empty.classList.add('hidden');

  for (const faq of results) $list.appendChild(buildItem(faq));
  updateToggleAllState();
}

// Filtros por categoría
function renderFilters(){
  const cats = Array.from(new Set(RAW.map(f => f.category).filter(Boolean))).sort();
  $filters.innerHTML = '';
  if (!cats.length) return;

  for (const c of cats){
    const pressed = FILTER.cats.has(c);
    const chip = el('button', {
      class: 'filter-chip',
      type: 'button',
      'aria-pressed': pressed ? 'true' : 'false',
      'data-cat': c
    }, esc(c));
    chip.addEventListener('click', () => {
      if (FILTER.cats.has(c)) FILTER.cats.delete(c);
      else FILTER.cats.add(c);
      renderFilters();
      render();
    });
    $filters.appendChild(chip);
  }
}

// Estado botón “Expandir todo”
function updateToggleAllState(){
  const items = $list.querySelectorAll('.faq-item');
  if (!items.length){
    $toggleAll.setAttribute('aria-expanded','false');
    $toggleAll.textContent = 'Expandir todo';
    ALL_OPEN = false;
    return;
  }
  const openCount = [...items].filter(n => n.hasAttribute('open')).length;
  const allOpen = openCount === items.length;
  ALL_OPEN = allOpen;
  $toggleAll.setAttribute('aria-expanded', String(allOpen));
  $toggleAll.textContent = allOpen ? 'Contraer todo' : 'Expandir todo';
}

// Eventos
$toggleAll?.addEventListener('click', () => {
  const items = $list.querySelectorAll('.faq-item');
  const toOpen = !ALL_OPEN;
  items.forEach($item => {
    const $btn = $item.querySelector('.faq-toggle');
    const $panel = $item.querySelector('.faq-panel');
    if (toOpen){
      $item.setAttribute('open','');
      $btn.setAttribute('aria-expanded','true');
      $panel.hidden = false;
    } else {
      $item.removeAttribute('open');
      $btn.setAttribute('aria-expanded','false');
      $panel.hidden = true;
    }
  });
  updateToggleAllState();
});
$search?.addEventListener('input', (e) => {
  FILTER.q = e.target.value;
  render();
});
window.addEventListener('hashchange', render);

// Carga desde API
async function loadFAQs(){
  try{
    const url = new URL(ENDPOINT, location.origin);
    try { url.searchParams.set('limit', PAGE_SIZE); } catch {}
    // fetchJSON viene de guard.js; si no existe, usa fetch normal
    const data = window.fetchJSON
      ? await window.fetchJSON(url.toString(), { headers: { Accept: "application/json" } })
      : await (await fetch(url.toString(), { headers: { Accept: "application/json" } })).json();

    const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
    RAW = items.map(x => ({
      id: x.id ?? x._id ?? crypto.randomUUID(),
      slug: x.slug ?? null,
      question: x.title ?? x.question ?? x.pregunta ?? '',
      answer: x.answer ?? x.respuesta ?? '',
      category: x.category ?? x.categoria ?? null,
      updated_at: x.updated_at ?? x.updatedAt ?? x.fecha_actualizacion ?? null,
      published: x.published ?? x.publicado ?? true
    })).filter(x => x.published);

    renderFilters();
    render();
  } catch (err){
    console.error('Error cargando FAQs:', err);
    $error.classList.remove('hidden');
    $list.innerHTML = '';
  }
}

loadFAQs();
