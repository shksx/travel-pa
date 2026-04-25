/* ====================== Helpers ====================== */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
function esc(s){return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* ====================== Navigation ====================== */
function setPage(id){
  $$('.page').forEach(p => p.classList.toggle('active', p.id === 'page-'+id));
  $$('.nav-item[data-page]').forEach(n => n.classList.toggle('active', n.dataset.page === id));
  $$('.mob-tab[data-page]').forEach(n => n.classList.toggle('active', n.dataset.page === id));
  const crumbs = {
    dash:'WORKSPACE · <span>TODAY</span>',
    cal:'WORKSPACE · <span>CALENDAR</span>',
    chat:'WORKSPACE · <span>ASSISTANT</span>',
    prof:'WORKSPACE · <span>PREFERENCES</span>'
  };
  $('#crumb').innerHTML = crumbs[id];
  try { localStorage.setItem('nomad.page', id); } catch(e){}
  if (id === 'cal' && typeof renderCalendar === 'function') renderCalendar();
}
$$('[data-page]').forEach(el => el.addEventListener('click', () => setPage(el.dataset.page)));
try {
  const persisted = localStorage.getItem('nomad.page');
  if (persisted && ['dash','cal','chat','prof'].includes(persisted)) setPage(persisted);
} catch(e){}

/* Dashboard kicker — live datetime */
function updateKicker(){
  const k = $('#dash-kicker'); if (!k) return;
  const now = new Date();
  const opts = { weekday:'long', day:'numeric', month:'short', year:'numeric' };
  k.textContent = `${now.toLocaleDateString('en-GB', opts)} · ${now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;
}
updateKicker(); setInterval(updateKicker, 60000);

/* "Find stays" nudge → jump to chat with seeded prompt */
$$('[data-nudge="find-stays"]').forEach(b => b.addEventListener('click', e => {
  e.stopPropagation();
  setPage('chat');
  const inp = $('#chat-inp');
  inp.value = 'Find me 3 stays in Bangkok for May 20–26, under €400 total, with kitchen and good rating.';
  inp.focus();
  autoResize(inp);
}));

/* Suggestion chips → fill input */
$$('.sug-chip').forEach(c => c.addEventListener('click', () => {
  const inp = $('#chat-inp');
  inp.value = c.textContent;
  inp.focus();
  autoResize(inp);
}));

/* ====================== Map render ====================== */
function drawMap(){
  const stage = $('#map-stage'); if (!stage) return;
  const W = stage.clientWidth || 800, H = stage.clientHeight || 260;
  const continents = `
    <g fill="#E8E3D6" stroke="rgba(20,22,28,0.14)" stroke-width="0.7">
      <path d="M60 ${H*0.25} Q 140 ${H*0.15} 230 ${H*0.25} Q 280 ${H*0.4} 230 ${H*0.5} Q 140 ${H*0.55} 80 ${H*0.5} Q 40 ${H*0.4} 60 ${H*0.25} Z"/>
      <path d="M320 ${H*0.2} Q 500 ${H*0.1} 680 ${H*0.25} Q 760 ${H*0.45} 680 ${H*0.6} Q 520 ${H*0.6} 420 ${H*0.55} Q 320 ${H*0.5} 300 ${H*0.4} Z"/>
      <path d="M500 ${H*0.55} Q 560 ${H*0.7} 540 ${H*0.85} Q 500 ${H*0.9} 490 ${H*0.7} Z"/>
      <path d="M610 ${H*0.55} Q 650 ${H*0.7} 635 ${H*0.88} Q 610 ${H*0.95} 605 ${H*0.72} Z"/>
      <path d="M180 ${H*0.55} Q 250 ${H*0.6} 260 ${H*0.8} Q 230 ${H*0.95} 180 ${H*0.92} Q 145 ${H*0.75} 180 ${H*0.55} Z"/>
    </g>`;
  const grid = `<g stroke="rgba(20,22,28,0.05)" stroke-width="0.5">${
    Array.from({length:10},(_,i)=>`<line x1="0" y1="${H*(i/10)}" x2="${W}" y2="${H*(i/10)}"/>`).join('')
    + Array.from({length:16},(_,i)=>`<line x1="${W*(i/16)}" y1="0" x2="${W*(i/16)}" y2="${H}"/>`).join('')
  }</g>`;
  const lisbonX = W*0.14, lisbonY = H*0.35;
  const bkkX = W*0.72, bkkY = H*0.55;
  const route = `<path d="M ${lisbonX} ${lisbonY} Q ${(lisbonX+bkkX)/2} ${-H*0.05} ${bkkX} ${bkkY}" stroke="#14161C" stroke-width="1.3" fill="none" stroke-dasharray="4 5" opacity="0.85"/>`;
  stage.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" style="display:block;">
      ${grid}
      ${continents}
      ${route}
      <circle cx="${lisbonX}" cy="${lisbonY}" r="16" fill="rgba(20,22,28,0.08)">
        <animate attributeName="r" from="10" to="22" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="${lisbonX}" cy="${lisbonY}" r="5" fill="#14161C"/>
      <text x="${lisbonX+12}" y="${lisbonY-6}" font-family="JetBrains Mono,monospace" font-size="10" fill="#14161C" letter-spacing="1">LISBON · NOW</text>
      <text x="${lisbonX+12}" y="${lisbonY+7}" font-family="JetBrains Mono,monospace" font-size="9" fill="#6B6F78">Day 42</text>
      <circle cx="${bkkX}" cy="${bkkY}" r="5" fill="#14161C" opacity="0.9"/>
      <circle cx="${bkkX}" cy="${bkkY}" r="11" fill="none" stroke="#14161C" stroke-width="1" opacity="0.4"/>
      <text x="${bkkX-56}" y="${bkkY-14}" font-family="JetBrains Mono,monospace" font-size="10" fill="#14161C" letter-spacing="1">BANGKOK</text>
      <text x="${bkkX-56}" y="${bkkY-2}" font-family="JetBrains Mono,monospace" font-size="9" fill="#c44536">+28d · gap</text>
    </svg>
    <div class="map-overlay-top">
      <div class="map-now">
        <div class="map-now-label">You are here</div>
        <div class="map-now-city">Estrela, Lisbon</div>
        <div class="map-now-meta">38.71°N · 9.15°W · 18° rain</div>
      </div>
      <div class="map-ctl"><button>+</button><button>−</button></div>
    </div>`;
}
drawMap();
let resizeT;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(drawMap, 120); });

/* ====================== Push demo toasts ====================== */
const pushDemos = [
  {title:'Flight check-in opens in 48h', body:'TP 162 · seat 27A on hold for you'},
  {title:'EUR/THB just moved +0.3%', body:'Best rate on Wise in the last 7 days'},
  {title:'New match for Bangkok gap', body:'Ari Residences — 94% fit · €52/night'},
];
let pushIx = 0;
$('#push-demo-btn').addEventListener('click', () => {
  const p = pushDemos[pushIx++ % pushDemos.length];
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="toast-ic">N</div>
    <div class="toast-body">
      <div class="toast-row"><span class="toast-app">Nomad</span><span class="toast-time">now</span></div>
      <div class="toast-title">${esc(p.title)}</div>
      <div class="toast-desc">${esc(p.body)}</div>
    </div>`;
  $('#toast-stack').appendChild(el);
  setTimeout(() => { el.style.transition='opacity .4s, transform .4s'; el.style.opacity='0'; el.style.transform='translateX(16px)'; setTimeout(()=>el.remove(), 500); }, 4800);
});

/* ====================== Preferences (Profile screen) ====================== */
// Source of truth: Firestore (users/{uid}.prefs). localStorage is an offline cache
// keyed per-uid so two accounts on the same browser don't bleed prefs into each other.
function getPrefsCacheKey(){
  const uid = window.__nomadCloud?.uid;
  return uid ? `nomad.prefs.${uid}` : 'nomad.prefs';
}
function loadPrefs(){
  try { return JSON.parse(localStorage.getItem(getPrefsCacheKey()) || '{}'); } catch(e) { return {}; }
}
let cloudSaveTimer = null;
function savePrefs(p){
  try { localStorage.setItem(getPrefsCacheKey(), JSON.stringify(p)); } catch(e){}
  updatePrefsSummary(p);
  // Debounced cloud save — coalesces rapid input changes into one write.
  if (window.__nomadCloud) {
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => {
      window.__nomadCloud.savePrefs(p).catch(e => console.warn('[savePrefs cloud]', e));
    }, 600);
  }
}
// Pull prefs from Firestore once auth is ready, then re-paint the UI.
function hydrateFromCloud(){
  if (!window.__nomadCloud) return;
  window.__nomadCloud.loadPrefs().then(cloud => {
    if (!cloud || !Object.keys(cloud).length) return;
    try { localStorage.setItem(getPrefsCacheKey(), JSON.stringify(cloud)); } catch(e){}
    applyPrefsToUI();
  }).catch(e => console.warn('[loadPrefs cloud]', e));
}
if (window.__nomadCloud) hydrateFromCloud();
else window.addEventListener('nomad:ready', hydrateFromCloud, { once: true });
function applyPrefsToUI(){
  const p = loadPrefs();
  // Toggles
  $$('.tog[data-prefkey]').forEach(t => {
    const k = t.dataset.prefkey;
    if (p[k] === true) t.classList.add('on');
    else if (p[k] === false) t.classList.remove('on');
  });
  // Chip groups
  $$('.chips[data-prefkey]').forEach(group => {
    const k = group.dataset.prefkey;
    const v = p[k];
    if (v === undefined) return;
    $$('.chip', group).forEach(c => c.classList.toggle('sel', c.dataset.v === v));
  });
  // Inputs
  $$('input.p-inp[data-prefkey]').forEach(inp => {
    const k = inp.dataset.prefkey;
    if (typeof p[k] === 'string') inp.value = p[k];
  });
  updatePrefsSummary(p);
}
function snapshotPrefs(){
  const p = {};
  $$('.tog[data-prefkey]').forEach(t => p[t.dataset.prefkey] = t.classList.contains('on'));
  $$('.chips[data-prefkey]').forEach(group => {
    const sel = $('.chip.sel', group);
    if (sel) p[group.dataset.prefkey] = sel.dataset.v;
  });
  $$('input.p-inp[data-prefkey]').forEach(inp => p[inp.dataset.prefkey] = inp.value);
  return p;
}
function updatePrefsSummary(p){
  p = p || snapshotPrefs();
  const parts = [];
  if (p.direct_flights) parts.push('Direct flights');
  if (p.seat === 'window') parts.push('window seat');
  else if (p.seat === 'aisle') parts.push('aisle seat');
  if (p.cabin && p.cabin !== 'economy') parts.push(p.cabin.replace('_',' '));
  if (p.kitchen_required) parts.push('kitchen required');
  if (p.ac_required) parts.push('AC always');
  if (p.quiet_area) parts.push('quiet area');
  if (p.long_stay) parts.push('long-stay mode');
  if (p.no_overnight) parts.push('no overnight flights');
  if (p.airlines) parts.push(p.airlines.split(',')[0].trim() + ' preferred');
  const sum = $('#prefs-summary');
  if (sum) sum.textContent = parts.length ? parts.join(' · ') : 'No preferences set yet — open the Profile tab to add some.';
  const cnt = $('#prefs-count');
  if (cnt) cnt.textContent = Object.values(p).filter(v => v === true || (typeof v === 'string' && v && v !== 'none')).length;
}
// Wire toggles
$$('.tog[data-prefkey]').forEach(t => t.addEventListener('click', () => {
  t.classList.toggle('on');
  savePrefs(snapshotPrefs());
}));
// Wire chip groups (single-select)
$$('.chips[data-prefkey]').forEach(group => {
  $$('.chip', group).forEach(c => c.addEventListener('click', () => {
    if (group.dataset.mode === 'single') {
      $$('.chip', group).forEach(x => x.classList.remove('sel'));
      c.classList.add('sel');
    } else {
      c.classList.toggle('sel');
    }
    savePrefs(snapshotPrefs());
  }));
});
// Wire inputs
$$('input.p-inp[data-prefkey]').forEach(inp => inp.addEventListener('input', () => savePrefs(snapshotPrefs())));
// Profile sub-nav (visual only — single-page card list)
$$('.prof-nav-item').forEach(it => it.addEventListener('click', () => {
  $$('.prof-nav-item').forEach(x => x.classList.remove('active'));
  it.classList.add('active');
}));
applyPrefsToUI();

// Reset-all button — wipes saved prefs and resets every UI control to its default empty state.
const resetBtn = document.getElementById('reset-prefs-btn');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    if (!confirm('Reset all preferences? This clears every toggle, chip, and input.')) return;
    try { localStorage.removeItem(getPrefsCacheKey()); } catch(e){}
    $$('.tog[data-prefkey]').forEach(t => t.classList.remove('on'));
    $$('.chips[data-prefkey] .chip').forEach(c => c.classList.remove('sel'));
    $$('input.p-inp[data-prefkey]').forEach(inp => inp.value = '');
    updatePrefsSummary({});
    if (window.__nomadCloud) window.__nomadCloud.savePrefs({}).catch(e => console.warn('[reset cloud]', e));
  });
}

/* ====================== Saved trips (localStorage) ====================== */
const TRIPS_KEY = 'nomad.trips';
function getTrips(){ try { return JSON.parse(localStorage.getItem(TRIPS_KEY) || '[]'); } catch(e) { return []; } }
function setTrips(t){ try { localStorage.setItem(TRIPS_KEY, JSON.stringify(t)); } catch(e){} updateSavedBadge(); }
function updateSavedBadge(){
  const c = $('#saved-count');
  const n = getTrips().length;
  if (c) c.textContent = n;
}
function saveTripFromFlight(input, offer){
  const trips = getTrips();
  const id = 't_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
  trips.unshift({
    id, type:'flight', status:'researched', saved_at:new Date().toISOString(),
    origin:input.origin, destination:input.destination,
    departure_date:input.departure_date, return_date:input.return_date || null,
    price:offer.price, source:offer.source || 'Google Flights',
    segments:offer.segments || [], total_duration_min:offer.total_duration_min,
    layovers:offer.layovers || [], booking_links:offer.booking_links || {},
  });
  setTrips(trips);
}
updateSavedBadge();

/* ====================== Chat → /api/chat ====================== */
const conversation = [];
let typing = false;
const msgs = () => $('#chat-msgs');

function autoResize(el){ el.style.height='auto'; el.style.height = Math.min(el.scrollHeight, 120)+'px'; }
function scrollChat(){ const m = msgs(); setTimeout(() => { m.scrollTop = m.scrollHeight; }, 30); }

function addAI(node){
  const wrap = document.createElement('div'); wrap.className = 'msg ai';
  const av = document.createElement('div'); av.className = 'msg-av'; av.textContent = 'N';
  const col = document.createElement('div'); col.className = 'msg-col';
  if (typeof node === 'string') {
    const b = document.createElement('div'); b.className = 'msg-bubble'; b.textContent = node;
    col.appendChild(b);
  } else {
    col.appendChild(node);
  }
  wrap.appendChild(av); wrap.appendChild(col);
  msgs().appendChild(wrap); scrollChat();
  return col;
}
function addUser(text){
  const wrap = document.createElement('div'); wrap.className = 'msg you';
  const av = document.createElement('div'); av.className = 'msg-av'; av.textContent = 'A';
  const b = document.createElement('div'); b.className = 'msg-bubble'; b.textContent = text;
  wrap.appendChild(av); wrap.appendChild(b);
  msgs().appendChild(wrap); scrollChat();
}

let typingEl = null;
function showTyping(){
  typing = true;
  const wrap = document.createElement('div'); wrap.className = 'msg ai';
  const av = document.createElement('div'); av.className = 'msg-av'; av.textContent = 'N';
  const t = document.createElement('div'); t.className = 'typing';
  t.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
  wrap.appendChild(av); wrap.appendChild(t);
  typingEl = wrap;
  msgs().appendChild(wrap); scrollChat();
  $('#chat-send').disabled = true;
}
function hideTyping(){
  typing = false;
  if (typingEl) { typingEl.remove(); typingEl = null; }
  $('#chat-send').disabled = false;
}

function fmtTime(iso){
  if (!iso) return '';
  const m = String(iso).match(/[T ](\d{2}:\d{2})/);
  if (m) return m[1];
  return String(iso).length >= 5 ? String(iso).slice(-5) : iso;
}

function renderFlightCard(input, offer, badge){
  const card = document.createElement('div'); card.className = 'tool-card';

  if (badge) {
    const b = document.createElement('div');
    b.className = `badge ${badge === 'best' ? 'badge-best' : 'badge-cheap'}`;
    b.textContent = badge === 'best' ? 'Best match' : 'Cheapest';
    card.appendChild(b);
  }

  const carriers = [...new Set((offer.segments || []).map(s => s.airline).filter(Boolean))].join(' / ') || 'Flight';
  const src = offer.source || 'Google Flights';

  const head = document.createElement('div'); head.className = 'tool-head';
  head.innerHTML = `<span>${esc(carriers.toUpperCase())}</span><span class="src">${esc(src)}</span>`;
  card.appendChild(head);

  const first = (offer.segments || [])[0];
  const last = (offer.segments || [])[(offer.segments || []).length - 1];
  if (first && last) {
    const route = document.createElement('div'); route.className = 'tool-route';
    route.innerHTML = `
      <div><div class="tool-iata">${esc(first.from || input.origin || '')}</div></div>
      <div class="tool-arr"></div>
      <div style="text-align:right;"><div class="tool-iata">${esc(last.to || input.destination || '')}</div></div>`;
    card.appendChild(route);
    const times = document.createElement('div'); times.className = 'tool-times';
    times.innerHTML = `<span>${esc(input.departure_date || '')} · ${esc(fmtTime(first.depart))}</span><span>${esc(fmtTime(last.arrive))}</span>`;
    card.appendChild(times);
  }

  const totalDur = offer.total_duration_min ? `${Math.floor(offer.total_duration_min/60)}h ${offer.total_duration_min%60}m` : '';
  const stops = offer.layovers && offer.layovers.length
    ? `${offer.layovers.length} stop${offer.layovers.length === 1 ? '' : 's'}`
    : 'Direct';
  const meta = document.createElement('div'); meta.className = 'tool-meta';
  meta.innerHTML = `<span>${esc([totalDur, stops].filter(Boolean).join(' · '))}</span><span class="price">${esc(offer.price || '')}</span>`;
  card.appendChild(meta);

  const disc = document.createElement('div'); disc.className = 'tool-disclaimer';
  disc.textContent = '⚠ Indicative price — verify on the booking platform before purchasing.';
  card.appendChild(disc);

  const acts = document.createElement('div'); acts.className = 'tool-actions';
  const save = document.createElement('button'); save.className = 'save'; save.textContent = 'Save trip';
  save.onclick = () => {
    saveTripFromFlight(input, offer);
    save.classList.add('saved'); save.textContent = '✓ Saved'; save.disabled = true;
  };
  acts.appendChild(save);

  const bl = offer.booking_links || {};
  const primaryUrl = bl.google_flights || '#';
  if (primaryUrl !== '#') {
    const view = document.createElement('a'); view.className = 'view'; view.target = '_blank'; view.rel = 'noopener noreferrer';
    view.href = primaryUrl; view.textContent = (offer.has_direct_link ? 'View on '+(src) : 'Search Google') + ' ↗';
    acts.appendChild(view);
  }
  card.appendChild(acts);

  const otherPlatforms = [
    {key:'skyscanner', label:'Skyscanner'},
    {key:'kayak', label:'Kayak'},
    {key:'expedia', label:'Expedia'},
  ].filter(p => bl[p.key]);
  if (otherPlatforms.length) {
    const cmp = document.createElement('div'); cmp.className = 'tool-compare';
    cmp.appendChild(Object.assign(document.createElement('span'), {textContent:'Also:'}));
    otherPlatforms.forEach(p => {
      const a = document.createElement('a'); a.href = bl[p.key]; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = p.label + ' ↗';
      cmp.appendChild(a);
    });
    card.appendChild(cmp);
  }

  return card;
}

function renderToolError(out){
  const card = document.createElement('div'); card.className = 'tool-error';
  const t = document.createElement('div'); t.className = 'tool-error-title'; t.textContent = 'Flight search error';
  card.appendChild(t);
  const m = document.createElement('div'); m.className = 'tool-error-msg'; m.textContent = out.error || 'Unknown error';
  card.appendChild(m);
  const bl = out.search_links || {};
  const platforms = [
    {key:'google_flights', label:'Google Flights'},
    {key:'skyscanner', label:'Skyscanner'},
    {key:'kayak', label:'Kayak'},
    {key:'expedia', label:'Expedia'},
  ].filter(p => bl[p.key]);
  if (platforms.length) {
    const links = document.createElement('div'); links.className = 'tool-compare'; links.style.marginTop = '8px';
    links.appendChild(Object.assign(document.createElement('span'), {textContent:'Search manually:'}));
    platforms.forEach(p => {
      const a = document.createElement('a'); a.href = bl[p.key]; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = p.label + ' ↗';
      links.appendChild(a);
    });
    card.appendChild(links);
  }
  return card;
}

function renderInsight(pi){
  const lvl = pi.price_level;
  const lvlText = lvl === 'low' ? 'Prices lower than usual' : lvl === 'high' ? 'Prices higher than usual' : 'Prices typical for this route';
  const range = pi.typical_price_range && pi.typical_price_range.length === 2
    ? ` · typical $${pi.typical_price_range[0]}–$${pi.typical_price_range[1]} AUD` : '';
  const el = document.createElement('div'); el.className = 'tool-insight';
  el.textContent = lvlText + range;
  return el;
}

function renderAIReply(text, toolCalls){
  const col = document.createElement('div'); col.className = 'msg-col';
  const wrap = document.createElement('div'); wrap.className = 'msg ai';
  const av = document.createElement('div'); av.className = 'msg-av'; av.textContent = 'N';
  if (text) {
    const b = document.createElement('div'); b.className = 'msg-bubble'; b.textContent = text;
    col.appendChild(b);
  }
  for (const call of (toolCalls || [])) {
    if (call.tool === 'search_flights' && call.output) {
      if (!call.output.error && Array.isArray(call.output.offers)) {
        const head = document.createElement('div'); head.style.cssText = 'font-family:var(--mono);font-size:10px;color:var(--muted);letter-spacing:0.08em;padding:2px 2px 4px;';
        head.textContent = `${call.input.origin} → ${call.input.destination} · ${call.input.departure_date}${call.input.return_date ? ' → '+call.input.return_date : ''} · ${call.output.offers.length} match${call.output.offers.length === 1 ? '' : 'es'}`;
        col.appendChild(head);
        if (call.output.offers.length === 0) {
          const b = document.createElement('div'); b.className = 'msg-bubble'; b.textContent = 'No flights found for that route and date. Try different dates or a nearby airport.';
          col.appendChild(b);
        } else {
          // Preferences banner
          const banner = document.createElement('div'); banner.className = 'prefs-banner';
          banner.textContent = 'Results ranked to your flight preferences — direct flights, preferred airlines, and travel style.';
          col.appendChild(banner);

          // Cheapest pinned at top, best-match labelled
          const offers = call.output.offers;
          const cheapestIdx = offers.reduce((best, o, i) => o.price_num < offers[best].price_num ? i : best, 0);
          const cheapest = offers[cheapestIdx];
          const bestMatch = offers[0];
          const sameOffer = cheapestIdx === 0;

          if (sameOffer) {
            const card = renderFlightCard(call.input, bestMatch, 'best');
            const cheapBadge = document.createElement('div');
            cheapBadge.className = 'badge badge-cheap'; cheapBadge.textContent = 'Cheapest';
            card.insertBefore(cheapBadge, card.querySelector('.badge').nextSibling);
            col.appendChild(card);
            offers.slice(1).forEach(o => col.appendChild(renderFlightCard(call.input, o)));
          } else {
            col.appendChild(renderFlightCard(call.input, cheapest, 'cheap'));
            offers.forEach((o, i) => {
              if (i === cheapestIdx) return;
              col.appendChild(renderFlightCard(call.input, o, i === 0 ? 'best' : null));
            });
          }
          if (call.output.price_insights) col.appendChild(renderInsight(call.output.price_insights));
        }
      } else if (call.output.error) {
        col.appendChild(renderToolError(call.output));
      }
    }
  }
  wrap.appendChild(av); wrap.appendChild(col);
  msgs().appendChild(wrap); scrollChat();
}

async function send(){
  const inp = $('#chat-inp');
  const t = inp.value.trim();
  if (!t || typing) return;
  inp.value = ''; autoResize(inp);
  addUser(t);
  conversation.push({role:'user', content:t});
  showTyping();

  let prefs = snapshotPrefs();
  try {
    const resp = await fetch('/api/chat', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({messages:conversation, prefs})
    });
    const data = await resp.json().catch(() => ({error:'Invalid response from server.'}));
    hideTyping();
    if (!resp.ok || data.error) {
      addAI('⚠ ' + (data.error || ('Error '+resp.status)));
      conversation.pop();
      return;
    }
    conversation.push({role:'assistant', content:data.reply});
    renderAIReply(data.reply, data.tool_calls || []);
  } catch (e) {
    hideTyping();
    addAI('⚠ Network error: ' + e.message);
    conversation.pop();
  }
}

const ci = $('#chat-inp');
ci.addEventListener('input', () => autoResize(ci));
ci.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});
$('#chat-send').addEventListener('click', send);

/* Welcome message */
addAI("Hi — ask me anything about your trip. I can search live flights for you (try \u201CFind flights from Sydney to Tokyo on 1 June 2026\u201D). Set your preferences in the Profile tab so I tailor every search to you.");

/* ====================== PWA install ====================== */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  $('#install-btn').style.display = 'inline-flex';
});
$('#install-btn').addEventListener('click', async () => {
  if (deferredInstall) {
    deferredInstall.prompt();
    await deferredInstall.userChoice.catch(()=>{});
    deferredInstall = null;
  }
});

/* Service worker — minimal stub for PWA installability */
if ('serviceWorker' in navigator) {
  const swCode = `self.addEventListener('install', e => self.skipWaiting()); self.addEventListener('activate', e => self.clients.claim()); self.addEventListener('fetch', e => {});`;
  const blob = new Blob([swCode], {type:'application/javascript'});
  const swUrl = URL.createObjectURL(blob);
  try { navigator.serviceWorker.register(swUrl).catch(()=>{}); } catch(e){}
}

/* ====================== CALENDAR ====================== */
// Per-user trip calendar. Source of truth: Firestore (users/{uid}.calendar). localStorage cache keyed per uid.
// Optional Google Calendar overlay — read-only events shown alongside Nomad events. Token lives in sessionStorage.
const CAL = {
  view: new Date(),       // arbitrary date inside the currently displayed month
  selected: null,         // YYYY-MM-DD or null
  events: [],             // user's Nomad events (writable, persisted)
  gcalEvents: [],         // Google Calendar events for the visible month (read-only overlay)
  editingId: null,
  gcalToken: null,        // OAuth access token for Google Calendar
  gcalConnected: false,
  gcalError: null,
};
const CAL_TYPES = ['flight','stay','transfer','activity','note'];
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';

function calCacheKey(){
  const uid = window.__nomadCloud?.uid;
  return uid ? `nomad.cal.${uid}` : 'nomad.cal';
}
function ymd(d){
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function parseYmd(s){
  if (!s) return null;
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}
function eventsForDay(date){
  const key = ymd(date);
  const ours = CAL.events.filter(e => dateInRange(key, e.date, e.endDate));
  const theirs = CAL.gcalEvents.filter(e => dateInRange(key, e.date, e.endDate));
  return ours.concat(theirs);
}
function dateInRange(target, start, end){
  if (!start) return false;
  if (!end || end === start) return target === start;
  return target >= start && target <= end;
}
function loadCalEvents(){
  try { CAL.events = JSON.parse(localStorage.getItem(calCacheKey()) || '[]'); } catch(e) { CAL.events = []; }
  if (!Array.isArray(CAL.events)) CAL.events = [];
  updateCalBadge();
}
let calCloudSaveTimer = null;
function persistCalEvents(){
  try { localStorage.setItem(calCacheKey(), JSON.stringify(CAL.events)); } catch(e){}
  updateCalBadge();
  if (window.__nomadCloud) {
    clearTimeout(calCloudSaveTimer);
    calCloudSaveTimer = setTimeout(() => {
      window.__nomadCloud.saveCalendar(CAL.events).catch(e => console.warn('[saveCalendar]', e));
    }, 500);
  }
}
function hydrateCalFromCloud(){
  if (!window.__nomadCloud) return;
  window.__nomadCloud.loadCalendar().then(events => {
    if (Array.isArray(events) && events.length) {
      CAL.events = events;
      try { localStorage.setItem(calCacheKey(), JSON.stringify(events)); } catch(e){}
      renderCalendar();
    }
  }).catch(e => console.warn('[loadCalendar]', e));
}
function updateCalBadge(){
  const el = $('#cal-count');
  if (el) el.textContent = CAL.events.length;
}

function renderCalendar(){
  const grid = $('#cal-grid');
  if (!grid) return;
  const view = CAL.view;
  const year = view.getFullYear(), month = view.getMonth();
  const monthName = view.toLocaleDateString('en-GB', { month:'long', year:'numeric' });
  $('#cal-month').textContent = monthName;

  // Build 6 weeks starting Monday before/on the 1st.
  const first = new Date(year, month, 1);
  // JS getDay: Sun=0..Sat=6. We want Mon=0..Sun=6.
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const todayKey = ymd(new Date());

  grid.innerHTML = '';
  for (let i = 0; i < 42; i++){
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = ymd(d);
    const inMonth = d.getMonth() === month;
    const evts = eventsForDay(d);
    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (inMonth ? '' : ' dim') + (key === todayKey ? ' today' : '') + (key === CAL.selected ? ' selected' : '');
    cell.dataset.date = key;
    cell.innerHTML = `<div class="cal-cell-num">${d.getDate()}</div>`;
    const list = document.createElement('div'); list.className = 'cal-cell-events';
    const max = 3;
    evts.slice(0, max).forEach(e => {
      const chip = document.createElement('div');
      chip.className = `cal-evt type-${e.type}` + (e.source === 'gcal' ? ' source-google' : '');
      const t = e.startTime ? `${e.startTime} ` : '';
      chip.textContent = t + (e.title || '(untitled)');
      chip.title = (e.source === 'gcal' ? '[Google] ' : '') + (e.title || '');
      list.appendChild(chip);
    });
    if (evts.length > max){
      const more = document.createElement('div'); more.className = 'cal-evt-more';
      more.textContent = `+${evts.length - max} more`;
      list.appendChild(more);
    }
    cell.appendChild(list);
    cell.addEventListener('click', () => selectDay(key));
    grid.appendChild(cell);
  }
  renderCalAside();
}

function renderCalAside(){
  const aside = $('#cal-aside');
  if (!aside) return;
  // Insert / refresh the Google Calendar card at the top of the aside.
  let gcalCard = aside.querySelector('.cal-gcal-card');
  if (!gcalCard) {
    gcalCard = document.createElement('div');
    gcalCard.className = 'cal-gcal-card';
    aside.insertBefore(gcalCard, aside.firstChild);
  }
  gcalCard.innerHTML = renderGcalCardHTML();
  wireGcalCard(gcalCard);

  const titleEl = $('#cal-day-title');
  const kickEl = $('#cal-day-kicker');
  const list = $('#cal-day-events');
  if (!CAL.selected) {
    titleEl.textContent = 'No day selected';
    kickEl.textContent = 'Pick a day';
    list.innerHTML = '<div class="cal-day-empty">Tap a day to view events or add a flight, stay, or activity.</div>';
    return;
  }
  const d = parseYmd(CAL.selected);
  titleEl.textContent = d.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  kickEl.textContent = 'Selected day';
  const evts = eventsForDay(d);
  list.innerHTML = '';
  if (!evts.length) {
    const empty = document.createElement('div');
    empty.className = 'cal-day-empty';
    empty.textContent = 'Nothing on this day yet. Use “Add event” to add a flight, stay, transfer, activity, or note.';
    list.appendChild(empty);
  } else {
    evts.forEach(e => list.appendChild(renderDayRow(e)));
  }
}

function renderDayRow(e){
  const row = document.createElement('div');
  row.className = `cal-day-row type-${e.type}`;
  const bar = document.createElement('div'); bar.className = 'bar';
  const body = document.createElement('div'); body.className = 'body';
  const title = document.createElement('div'); title.className = 'title';
  title.textContent = e.title || '(untitled)';
  body.appendChild(title);
  const metaParts = [];
  metaParts.push(e.type.toUpperCase());
  if (e.startTime || e.endTime) metaParts.push([e.startTime, e.endTime].filter(Boolean).join(' – '));
  if (e.endDate && e.endDate !== e.date) metaParts.push(`${e.date} → ${e.endDate}`);
  if (e.location) metaParts.push(e.location);
  const meta = document.createElement('div'); meta.className = 'meta';
  meta.textContent = metaParts.join(' · ');
  body.appendChild(meta);
  if (e.notes) {
    const n = document.createElement('div'); n.className = 'notes';
    n.textContent = e.notes;
    body.appendChild(n);
  }
  if (e.source === 'gcal') {
    const src = document.createElement('div'); src.className = 'src';
    src.textContent = '↗ Google Calendar';
    body.appendChild(src);
  }
  row.appendChild(bar); row.appendChild(body);
  if (e.source !== 'gcal') {
    const acts = document.createElement('div'); acts.className = 'acts';
    const edit = document.createElement('button'); edit.textContent = 'Edit';
    edit.onclick = (ev) => { ev.stopPropagation(); openCalForm(e.id); };
    const del = document.createElement('button'); del.className = 'del'; del.textContent = 'Delete';
    del.onclick = (ev) => {
      ev.stopPropagation();
      if (!confirm('Delete this event?')) return;
      CAL.events = CAL.events.filter(x => x.id !== e.id);
      persistCalEvents();
      renderCalendar();
    };
    acts.appendChild(edit); acts.appendChild(del);
    row.appendChild(acts);
  }
  return row;
}

function selectDay(key){
  CAL.selected = (CAL.selected === key) ? null : key;
  renderCalendar();
}

/* Form */
function openCalForm(id){
  CAL.editingId = id || null;
  const form = $('#cal-form');
  $('#cal-form-title').textContent = id ? 'Edit event' : 'New event';
  // Reset
  setChipGroupValue('#cal-type-chips', 'flight');
  $('#cal-title-inp').value = '';
  $('#cal-date-inp').value = CAL.selected || ymd(new Date());
  $('#cal-end-inp').value = '';
  $('#cal-time-inp').value = '';
  $('#cal-end-time-inp').value = '';
  $('#cal-loc-inp').value = '';
  $('#cal-notes-inp').value = '';
  if (id) {
    const e = CAL.events.find(x => x.id === id);
    if (e) {
      setChipGroupValue('#cal-type-chips', e.type || 'flight');
      $('#cal-title-inp').value = e.title || '';
      $('#cal-date-inp').value = e.date || '';
      $('#cal-end-inp').value = e.endDate || '';
      $('#cal-time-inp').value = e.startTime || '';
      $('#cal-end-time-inp').value = e.endTime || '';
      $('#cal-loc-inp').value = e.location || '';
      $('#cal-notes-inp').value = e.notes || '';
    }
  }
  form.style.display = 'flex';
  $('#cal-title-inp').focus();
}
function closeCalForm(){
  $('#cal-form').style.display = 'none';
  CAL.editingId = null;
}
function setChipGroupValue(sel, value){
  const group = $(sel);
  if (!group) return;
  $$('.chip', group).forEach(c => c.classList.toggle('sel', c.dataset.v === value));
}
function getChipGroupValue(sel){
  const c = $(sel + ' .chip.sel');
  return c ? c.dataset.v : null;
}
function saveCalForm(ev){
  ev.preventDefault();
  const date = $('#cal-date-inp').value;
  if (!date) { alert('Pick a start date.'); return; }
  const type = getChipGroupValue('#cal-type-chips') || 'note';
  const title = $('#cal-title-inp').value.trim();
  if (!title) { alert('Add a title.'); return; }
  const endDate = $('#cal-end-inp').value || null;
  if (endDate && endDate < date) { alert('End date is before start date.'); return; }
  const evt = {
    id: CAL.editingId || ('e_' + Date.now() + '_' + Math.random().toString(36).slice(2,7)),
    type, title, date,
    endDate: endDate || null,
    startTime: $('#cal-time-inp').value || null,
    endTime: $('#cal-end-time-inp').value || null,
    location: $('#cal-loc-inp').value.trim() || null,
    notes: $('#cal-notes-inp').value.trim() || null,
    updatedAt: new Date().toISOString(),
  };
  if (CAL.editingId) {
    CAL.events = CAL.events.map(x => x.id === CAL.editingId ? { ...x, ...evt } : x);
  } else {
    evt.createdAt = evt.updatedAt;
    CAL.events.push(evt);
  }
  CAL.selected = date;
  persistCalEvents();
  closeCalForm();
  renderCalendar();
}

/* ===== Google Calendar integration =====
 * Uses Firebase reauth with the calendar.events.readonly scope to obtain a Google
 * OAuth access token, then queries the v3 Calendar API directly. Token kept in
 * sessionStorage (short-lived) — never written to localStorage or Firestore.
 */
function gcalTokenKey(){
  const uid = window.__nomadCloud?.uid;
  return uid ? `nomad.gcal.token.${uid}` : 'nomad.gcal.token';
}
function loadGcalToken(){
  try {
    const raw = sessionStorage.getItem(gcalTokenKey());
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o.access_token || !o.expires_at) return null;
    if (Date.now() >= o.expires_at) return null;
    return o;
  } catch(e) { return null; }
}
function saveGcalToken(tok){
  try { sessionStorage.setItem(gcalTokenKey(), JSON.stringify(tok)); } catch(e){}
}
function clearGcalToken(){
  try { sessionStorage.removeItem(gcalTokenKey()); } catch(e){}
  CAL.gcalToken = null; CAL.gcalConnected = false; CAL.gcalEvents = [];
}

async function connectGoogleCalendar(){
  CAL.gcalError = null;
  try {
    const mod = await import('./auth.js');
    const fbAuthMod = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js');
    const { GoogleAuthProvider, signInWithPopup, reauthenticateWithPopup } = fbAuthMod;
    const provider = new GoogleAuthProvider();
    provider.addScope(GCAL_SCOPE);
    // Hint Google to surface the same account that's already signed in.
    if (mod.auth.currentUser?.email) {
      provider.setCustomParameters({ login_hint: mod.auth.currentUser.email, prompt: 'consent' });
    }
    let result;
    try {
      result = await reauthenticateWithPopup(mod.auth.currentUser, provider);
    } catch (re) {
      // If reauth isn't possible (e.g. provider mismatch), fall back to a fresh popup.
      result = await signInWithPopup(mod.auth, provider);
    }
    const cred = GoogleAuthProvider.credentialFromResult(result);
    if (!cred?.accessToken) throw new Error('No access token returned by Google.');
    const tok = {
      access_token: cred.accessToken,
      // Google access tokens are typically 1 hour. We don't get expires_in here,
      // so be conservative and assume 50 minutes.
      expires_at: Date.now() + 50 * 60 * 1000,
    };
    saveGcalToken(tok);
    CAL.gcalToken = tok;
    CAL.gcalConnected = true;
    await fetchGcalEventsForView();
    renderCalendar();
  } catch (e) {
    console.warn('[gcal connect]', e);
    CAL.gcalError = e?.message || 'Could not connect to Google Calendar.';
    CAL.gcalConnected = false;
    renderCalAside();
  }
}

function disconnectGoogleCalendar(){
  clearGcalToken();
  renderCalendar();
}

async function fetchGcalEventsForView(){
  const tok = CAL.gcalToken || loadGcalToken();
  if (!tok) { CAL.gcalEvents = []; return; }
  CAL.gcalToken = tok;
  // Fetch all events that overlap the visible 6-week window.
  const view = CAL.view;
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(view.getFullYear(), view.getMonth(), 1 - offset);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 42);
  const params = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  try {
    const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    if (resp.status === 401 || resp.status === 403) {
      clearGcalToken();
      CAL.gcalError = 'Google Calendar access expired — reconnect.';
      return;
    }
    if (!resp.ok) throw new Error('Google Calendar API error ' + resp.status);
    const data = await resp.json();
    CAL.gcalEvents = (data.items || []).map(it => normaliseGcalEvent(it)).filter(Boolean);
    CAL.gcalConnected = true;
    CAL.gcalError = null;
  } catch (e) {
    console.warn('[gcal fetch]', e);
    CAL.gcalError = e?.message || 'Failed to load Google Calendar events.';
  }
}

function normaliseGcalEvent(it){
  if (!it || !it.start) return null;
  // All-day events: start/end have `date` (YYYY-MM-DD), end is exclusive.
  // Timed events: start/end have `dateTime` (ISO with TZ).
  let date, endDate, startTime = null, endTime = null;
  if (it.start.date) {
    date = it.start.date;
    if (it.end?.date) {
      const ed = parseYmd(it.end.date);
      ed.setDate(ed.getDate() - 1); // Google end-date for all-day is exclusive.
      endDate = ymd(ed);
    }
  } else if (it.start.dateTime) {
    const sd = new Date(it.start.dateTime);
    date = ymd(sd);
    startTime = sd.toTimeString().slice(0,5);
    if (it.end?.dateTime) {
      const ed = new Date(it.end.dateTime);
      endDate = ymd(ed);
      endTime = ed.toTimeString().slice(0,5);
      if (endDate === date) endDate = null;
    }
  } else {
    return null;
  }
  return {
    id: 'g_' + it.id,
    source: 'gcal',
    type: 'note',
    title: it.summary || '(untitled)',
    date, endDate,
    startTime, endTime,
    location: it.location || null,
    notes: it.description || null,
  };
}

function renderGcalCardHTML(){
  if (CAL.gcalConnected) {
    return `
      <div class="cal-gcal-row">
        <div class="cal-gcal-ic">${gcalIconSvg()}</div>
        <div class="cal-gcal-meta">
          <div class="cal-gcal-title">Google Calendar</div>
          <span class="cal-gcal-status">Connected</span>
        </div>
        <button class="cal-gcal-btn disconnect" data-act="disconnect">Disconnect</button>
      </div>
      <div class="cal-gcal-sub">Events from your primary Google calendar appear with a dashed border. They're read-only here.</div>
    `;
  }
  const errLine = CAL.gcalError ? `<span class="cal-gcal-status error">${esc(CAL.gcalError)}</span>` : '';
  return `
    <div class="cal-gcal-row">
      <div class="cal-gcal-ic">${gcalIconSvg()}</div>
      <div class="cal-gcal-meta">
        <div class="cal-gcal-title">Google Calendar</div>
        <div class="cal-gcal-sub">Show your existing Google events alongside Nomad trips.</div>
      </div>
      <button class="cal-gcal-btn connect" data-act="connect">Connect</button>
    </div>
    ${errLine}
  `;
}
function gcalIconSvg(){
  // Simple monochrome calendar mark — matches the rest of the icon set.
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="12" cy="15" r="2"/></svg>`;
}
function wireGcalCard(card){
  const btn = card.querySelector('button[data-act]');
  if (!btn) return;
  btn.onclick = () => {
    if (btn.dataset.act === 'connect') connectGoogleCalendar();
    else disconnectGoogleCalendar();
  };
}

/* Wire calendar UI once the DOM is ready */
function initCalendar(){
  if (!$('#cal-grid')) return;
  loadCalEvents();

  $('#cal-prev').addEventListener('click', () => { CAL.view = new Date(CAL.view.getFullYear(), CAL.view.getMonth()-1, 1); fetchGcalEventsForView().then(renderCalendar); });
  $('#cal-next').addEventListener('click', () => { CAL.view = new Date(CAL.view.getFullYear(), CAL.view.getMonth()+1, 1); fetchGcalEventsForView().then(renderCalendar); });
  $('#cal-today').addEventListener('click', () => { CAL.view = new Date(); CAL.selected = ymd(new Date()); fetchGcalEventsForView().then(renderCalendar); });
  $('#cal-add-btn').addEventListener('click', () => {
    if (!CAL.selected) CAL.selected = ymd(new Date());
    openCalForm(null);
    renderCalAside();
  });
  $('#cal-form').addEventListener('submit', saveCalForm);
  $('#cal-form-close').addEventListener('click', closeCalForm);
  $('#cal-cancel').addEventListener('click', closeCalForm);
  $$('#cal-type-chips .chip').forEach(c => c.addEventListener('click', () => {
    $$('#cal-type-chips .chip').forEach(x => x.classList.remove('sel'));
    c.classList.add('sel');
  }));

  // Restore Google Calendar connection if we still have a valid token in this session.
  const tok = loadGcalToken();
  if (tok) {
    CAL.gcalToken = tok;
    CAL.gcalConnected = true;
    fetchGcalEventsForView().then(renderCalendar);
  }

  // Pull Nomad events from Firestore once auth is ready.
  if (window.__nomadCloud) hydrateCalFromCloud();
  else window.addEventListener('nomad:ready', hydrateCalFromCloud, { once: true });

  renderCalendar();
}
initCalendar();
