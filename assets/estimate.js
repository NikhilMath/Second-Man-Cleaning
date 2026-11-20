/* ==========================================================================
   PRICING — edit the numbers in this object to change every price on the
   /estimate page. Nothing below the "END OF PRICING" line needs to change.
   All dollar amounts are in US dollars.
   ========================================================================== */
const PRICING = {
  // Base cleaning rate per square foot, PER VISIT. Tiered, like tax brackets:
  // the first 5,000 sq ft cost `rate` each, the next 15,000 the second rate, etc.
  sqftTiers: [
    { upTo: 5000,     rate: 0.016 },  // first 5,000 sq ft
    { upTo: 20000,    rate: 0.011 },  // 5,001 – 20,000 sq ft
    { upTo: Infinity, rate: 0.008 },  // everything over 20,000 sq ft
  ],

  // Facility-type multipliers (applied to the square-footage cost above).
  facilityTypes: {
    office:     { label: 'Office',                      hint: 'Desks, conference rooms',     multiplier: 1.0  },
    retail:     { label: 'Retail / Storefront',         hint: 'Sales floor, fitting rooms',  multiplier: 1.05 },
    medical:    { label: 'Medical / Dental office',     hint: 'Exam rooms, waiting area',    multiplier: 1.35 },
    gym:        { label: 'Gym / Fitness studio',        hint: 'Equipment, locker rooms',     multiplier: 1.15 },
    church:     { label: 'Church / Event space',        hint: 'Halls, classrooms',           multiplier: 0.9  },
    restaurant: { label: 'Restaurant (front of house)', hint: 'Dining room, entry',          multiplier: 1.3  },
    warehouse:  { label: 'Warehouse / Light industrial',hint: 'Open floor, office area',     multiplier: 0.7  },
    other:      { label: 'Other',                       hint: 'Tell us in the notes',        multiplier: 1.0  },
  },

  // Floor type. `carpetShare` is the share of floor treated as carpet when
  // pricing carpet extraction / strip & wax add-ons.
  floorTypes: {
    carpet: { label: 'Mostly carpet',     multiplier: 1.0,  carpetShare: 0.8 },
    mixed:  { label: 'Mixed',             multiplier: 1.02, carpetShare: 0.5 },
    hard:   { label: 'Mostly hard floor', multiplier: 1.03, carpetShare: 0.1 },
  },

  // Traffic level, from employees + daily visitors. First match wins.
  traffic: [
    { key: 'low',    label: 'Low',    maxPeople: 24,       multiplier: 1.0  },
    { key: 'medium', label: 'Medium', maxPeople: 75,       multiplier: 1.05 },
    { key: 'high',   label: 'High',   maxPeople: Infinity, multiplier: 1.1  },
  ],

  perRestroomPerVisit: 7,   // each restroom, each visit
  perKitchenPerVisit: 5,    // each kitchen / breakroom, each visit

  weeksPerMonth: 4.33,      // visits per week × this = visits per month

  // Frequency options and their volume discount off the per-visit price.
  frequencies: {
    '1x':   { label: '1x / week',                   visitsPerWeek: 1, discount: 0    },
    '2x':   { label: '2x / week',                   visitsPerWeek: 2, discount: 0.10 },
    '3x':   { label: '3x / week',                   visitsPerWeek: 3, discount: 0.20 },
    '5x':   { label: '5x / week (nightly weekdays)',visitsPerWeek: 5, discount: 0.40 },
    'once': { label: 'One-time',                    visitsPerWeek: 0, discount: 0    },
  },

  // A one-time job is a deep clean: standard visit price × this multiplier.
  oneTimeMultiplier: 3,

  // Add-ons. `recurring: true` = part of the monthly price; false = one-time charge.
  // `per` says what `price` is multiplied by:
  //   'visit'          flat amount every visit
  //   'sqft-visit'     per sq ft, every visit
  //   'restroom-month' per restroom, per month
  //   'sqft'           per sq ft, once
  //   'carpet-sqft'    per carpeted sq ft, once (uses floorTypes.carpetShare)
  //   'hard-sqft'      per hard-floor sq ft, once
  //   'flat'           flat amount, once
  addOns: {
    restock:   { label: 'Restroom supply restocking', detail: 'We supply paper & soap', recurring: true,  per: 'restroom-month', price: 25    },
    disinfect: { label: 'Disinfection / sanitizing',  detail: 'Touchpoints every visit', recurring: true, per: 'sqft-visit',     price: 0.003 },
    trash:     { label: 'Trash & recycling to dumpster', detail: 'Every visit',         recurring: true,  per: 'visit',          price: 5     },
    carpet:    { label: 'Carpet extraction / shampoo', detail: 'Deep carpet clean',     recurring: false, per: 'carpet-sqft',    price: 0.25  },
    stripwax:  { label: 'Floor strip & wax',          detail: 'Hard floors',            recurring: false, per: 'hard-sqft',      price: 0.30  },
    windows:   { label: 'Interior window cleaning',   detail: 'All interior glass',     recurring: false, per: 'flat',           price: 150   },
    highdust:  { label: 'High dusting',               detail: 'Vents, fixtures, ledges',recurring: false, per: 'sqft',           price: 0.03  },
    postcon:   { label: 'Post-construction cleanup',  detail: 'Dust, debris, film',     recurring: false, per: 'sqft',           price: 0.20  },
  },

  minimumMonthly: 250,  // smallest monthly contract
  minimumOneTime: 250,  // smallest one-time job

  rangePercent: 0.12,   // show the estimate as ± this percentage
  roundTo: 5,           // round range ends to the nearest $5
};
/* ============================== END OF PRICING ============================= */


/* ---------- Pricing math (pure functions, no page code) ---------- */

function tieredSqftCost(sqft, tiers) {
  let cost = 0, prev = 0;
  for (const t of tiers) {
    if (sqft <= prev) break;
    cost += (Math.min(sqft, t.upTo) - prev) * t.rate;
    prev = t.upTo;
  }
  return cost;
}

function trafficFor(people, P) {
  const n = people == null ? 0 : people;
  return P.traffic.find(t => n <= t.maxPeople) || P.traffic[P.traffic.length - 1];
}

function priceRange(value, minimum, P) {
  const r = P.roundTo;
  const low = Math.max(minimum, Math.round(value * (1 - P.rangePercent) / r) * r);
  const high = Math.max(minimum, Math.round(value * (1 + P.rangePercent) / r) * r);
  return [low, high];
}

// s = { type, sqft, restrooms, kitchens, floor, people, freq, addons: [] }
// Returns null until there is enough to price (facility type + square footage).
function calcEstimate(s, P) {
  P = P || PRICING;
  const type = P.facilityTypes[s.type];
  const sqft = Number(s.sqft);
  if (!type || !(sqft > 0)) return null;

  const floor = P.floorTypes[s.floor] || P.floorTypes.mixed;
  const traffic = trafficFor(s.people, P);
  const freqAssumed = !P.frequencies[s.freq];
  const freqKey = freqAssumed ? '1x' : s.freq;
  const freq = P.frequencies[freqKey];
  const rr = Math.max(0, Math.round(s.restrooms || 0));
  const kit = Math.max(0, Math.round(s.kitchens || 0));

  const sqftBase = tieredSqftCost(sqft, P.sqftTiers);
  const cleaning = sqftBase * type.multiplier * floor.multiplier * traffic.multiplier;
  const restroomCost = rr * P.perRestroomPerVisit;
  const kitchenCost = kit * P.perKitchenPerVisit;

  const carpetSqft = sqft * floor.carpetShare;
  const qty = { 'visit': 1, 'sqft-visit': sqft, 'restroom-month': rr, 'sqft': sqft,
                'carpet-sqft': carpetSqft, 'hard-sqft': sqft - carpetSqft, 'flat': 1 };
  const addons = (s.addons || []).filter(k => P.addOns[k]).map(k => {
    const a = P.addOns[k];
    return { key: k, label: a.label, recurring: a.recurring, per: a.per, amount: a.price * (qty[a.per] || 0) };
  });
  const sum = arr => arr.reduce((t, a) => t + a.amount, 0);
  const perVisitAddons = addons.filter(a => a.per === 'visit' || a.per === 'sqft-visit');
  const monthlyAddons = addons.filter(a => a.per === 'restroom-month');
  const oneTimeAddons = addons.filter(a => !a.recurring);

  const base = { type, floor, traffic, freq, freqKey, freqAssumed, sqft, restrooms: rr, kitchens: kit, addons };
  const lines = [];

  if (freq.visitsPerWeek === 0) {
    const visit = cleaning + restroomCost + kitchenCost;
    const deep = visit * P.oneTimeMultiplier;
    lines.push([`Deep clean (standard visit $${visit.toFixed(2)} × ${P.oneTimeMultiplier})`, deep]);
    // Recurring add-ons are done once on a one-time job.
    perVisitAddons.concat(monthlyAddons, oneTimeAddons).forEach(a => lines.push([a.label, a.amount]));
    const raw = deep + sum(perVisitAddons) + sum(monthlyAddons) + sum(oneTimeAddons);
    const total = Math.max(raw, P.minimumOneTime);
    if (raw < P.minimumOneTime) lines.push([`One-time minimum ($${P.minimumOneTime})`, P.minimumOneTime - raw]);
    return Object.assign(base, { mode: 'once', total, minApplied: raw < P.minimumOneTime,
      range: priceRange(total, P.minimumOneTime, P), lines });
  }

  const visits = freq.visitsPerWeek * P.weeksPerMonth;
  const listPerVisit = cleaning + restroomCost + kitchenCost + sum(perVisitAddons);
  const perVisit = listPerVisit * (1 - freq.discount);
  const raw = perVisit * visits + sum(monthlyAddons);
  const monthly = Math.max(raw, P.minimumMonthly);
  const savingsMonthly = listPerVisit * freq.discount * visits;
  const oneTime = sum(oneTimeAddons);

  lines.push([`Cleaning, ${Math.round(sqft).toLocaleString('en-US')} sq ft (per visit)`, cleaning]);
  if (rr) lines.push([`Restrooms: ${rr} × $${P.perRestroomPerVisit} (per visit)`, restroomCost]);
  if (kit) lines.push([`Kitchens/breakrooms: ${kit} × $${P.perKitchenPerVisit} (per visit)`, kitchenCost]);
  perVisitAddons.forEach(a => lines.push([`${a.label} (per visit)`, a.amount]));
  if (freq.discount) lines.push([`Volume discount ${Math.round(freq.discount * 100)}% (per visit)`, -listPerVisit * freq.discount]);
  lines.push([`Per visit × ${+visits.toFixed(2)} visits/month`, perVisit * visits]);
  monthlyAddons.forEach(a => lines.push([`${a.label} (per month)`, a.amount]));
  if (raw < P.minimumMonthly) lines.push([`Monthly minimum ($${P.minimumMonthly})`, P.minimumMonthly - raw]);

  return Object.assign(base, { mode: 'recurring', visits, listPerVisit, perVisit, monthly,
    minApplied: raw < P.minimumMonthly, savingsMonthly, range: priceRange(monthly, P.minimumMonthly, P),
    oneTime, oneTimeAddons, oneTimeRange: oneTime > 0 ? priceRange(oneTime, 0, P) : null, lines });
}

if (typeof module !== 'undefined') module.exports = { PRICING, calcEstimate, tieredSqftCost };


/* ---------- Page code ---------- */

if (typeof document !== 'undefined') (function () {
  'use strict';
  const P = PRICING;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const moneyRange = r => r[0] === r[1] ? money(r[0]) : `${money(r[0])} – ${money(r[1])}`;
  const num = v => { const n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : null; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const visitsText = v => (Math.round(v * 10) / 10).toString();

  const calc = $('#calc');
  const book = $('#book');
  const summary = $('#summary');
  const panels = $$('.step-panel');
  const TOTAL = panels.length;
  const STEP_NAMES = ['Facility type', 'Size & details', 'Frequency', 'Add-ons', 'Book a walkthrough'];
  let current = 1;

  /* --- build option lists from PRICING so labels stay in one place --- */
  const optHTML = (type, name, value, title, small, extra) =>
    `<label class="opt"><input type="${type}" name="${name}" value="${value}"${extra || ''}>` +
    `<span>${esc(title)}${small ? `<small>${small}</small>` : ''}</span></label>`;

  $('#opts-type').innerHTML = Object.entries(P.facilityTypes)
    .map(([k, t]) => optHTML('radio', 'type', k, t.label, esc(t.hint))).join('');
  $('#opts-floor').innerHTML = Object.entries(P.floorTypes)
    .map(([k, f]) => optHTML('radio', 'floor', k, f.label)).join('');
  $('#opts-freq').innerHTML = Object.entries(P.frequencies).map(([k, f]) => {
    const note = f.visitsPerWeek === 0 ? 'Deep clean, single visit'
      : f.discount ? `Save ${Math.round(f.discount * 100)}% per visit` : 'Standard rate';
    return optHTML('radio', 'freq', k, f.label, note);
  }).join('');

  function addonPrice(a) {
    const p = a.price < 1 ? `$${a.price.toFixed(a.price < 0.01 ? 3 : 2)}` : `$${a.price.toLocaleString('en-US')}`;
    return ({ 'visit': `${p} per visit`, 'sqft-visit': `${p}/sq ft per visit`, 'restroom-month': `${p} per restroom/month`,
      'sqft': `${p}/sq ft`, 'carpet-sqft': `${p}/carpeted sq ft`, 'hard-sqft': `${p}/hard-floor sq ft`, 'flat': `${p} flat` })[a.per];
  }
  const addonOpt = ([k, a]) => optHTML('checkbox', 'addon', k, a.label,
    `${esc(a.detail)} · ${addonPrice(a)} <em class="tag ${a.recurring ? 'tag-rec' : 'tag-once'}">${a.recurring ? 'Recurring' : 'One-time'}</em>`);
  $('#opts-addon-rec').innerHTML = Object.entries(P.addOns).filter(([, a]) => a.recurring).map(addonOpt).join('');
  $('#opts-addon-once').innerHTML = Object.entries(P.addOns).filter(([, a]) => !a.recurring).map(addonOpt).join('');

  /* --- read / write state --- */
  const checked = name => { const el = $(`input[name="${name}"]:checked`, calc); return el ? el.value : ''; };
  function readState() {
    return {
      type: checked('type'), sqft: num($('#sqft').value), restrooms: num($('#restrooms').value),
      kitchens: num($('#kitchens').value), floor: checked('floor'), people: num($('#people').value),
      freq: checked('freq'), time: checked('time'),
      addons: $$('input[name="addon"]:checked', calc).map(i => i.value),
    };
  }

  const PARAMS = { type: 'type', sqft: 'sqft', restrooms: 'rr', kitchens: 'kit', floor: 'floor', people: 'ppl', freq: 'freq', time: 'time' };
  function writeURL(s) {
    const q = new URLSearchParams();
    Object.entries(PARAMS).forEach(([k, p]) => { if (s[k] !== '' && s[k] != null) q.set(p, s[k]); });
    if (s.addons.length) q.set('add', s.addons.join(','));
    const qs = q.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* ignore */ }
  }
  function readURL() {
    const q = new URLSearchParams(location.search);
    let any = false;
    const setRadio = (name, v) => { const el = v && $(`input[name="${name}"][value="${CSS.escape(v)}"]`, calc); if (el) { el.checked = true; any = true; } };
    const setNum = (id, v) => { const n = num(v); if (n != null && n >= 0) { $('#' + id).value = n; any = true; } };
    setRadio('type', q.get('type')); setRadio('floor', q.get('floor')); setRadio('freq', q.get('freq')); setRadio('time', q.get('time'));
    setNum('sqft', q.get('sqft')); setNum('restrooms', q.get('rr')); setNum('kitchens', q.get('kit')); setNum('people', q.get('ppl'));
    (q.get('add') || '').split(',').forEach(k => setRadio('addon', k));
    return any;
  }

  /* --- quick-pick square footage --- */
  const BUCKETS = [[0, 2000], [2000, 5000], [5000, 10000], [10000, 20000], [20000, Infinity]];
  function syncQuick() {
    const v = num($('#sqft').value);
    $$('#quick-sqft button').forEach((b, i) => {
      const [lo, hi] = BUCKETS[i];
      b.setAttribute('aria-pressed', String(v != null && v >= lo && v < hi));
    });
  }
  $$('#quick-sqft button').forEach(b => b.addEventListener('click', () => {
    $('#sqft').value = b.dataset.sqft;
    $('#sqft').dispatchEvent(new Event('input', { bubbles: true }));
  }));

  /* --- live summary --- */
  let srTimer;
  function render() {
    const s = readState();
    writeURL(s);
    syncQuick();
    const tr = trafficFor(s.people, P);
    $('#traffic-out').textContent = s.people == null ? '' : `Traffic level: ${tr.label}`;

    const e = calcEstimate(s, P);
    const label = $('#sum-label'), rangeEl = $('#sum-range'), unit = $('#sum-unit'), body = $('#sum-details');
    summary.classList.toggle('empty', !e);
    if (!e) {
      label.textContent = 'Your estimate';
      rangeEl.textContent = '—';
      unit.textContent = 'Choose a facility type and size to see a price';
      body.innerHTML = '';
      return;
    }
    const rows = [];
    let html = '';
    if (e.mode === 'once') {
      label.textContent = 'Estimated one-time job';
      rangeEl.textContent = moneyRange(e.range);
      unit.textContent = 'one-time';
      rows.push(['Frequency', 'One-time deep clean']);
    } else {
      label.textContent = 'Estimated monthly';
      rangeEl.textContent = moneyRange(e.range);
      unit.textContent = '/ month';
      rows.push(['Per visit', '≈ ' + money(e.perVisit)]);
      rows.push(['Visits per month', visitsText(e.visits)]);
      rows.push(['Frequency', e.freq.label + (e.freqAssumed ? ' (assumed)' : '')]);
    }
    rows.push(['Facility', `${e.type.label}, ${Math.round(e.sqft).toLocaleString('en-US')} sq ft`]);
    html += `<ul class="sum-rows">${rows.map(r => `<li><span>${esc(r[0])}</span><span>${esc(r[1])}</span></li>`).join('')}</ul>`;

    if (e.addons.length) {
      html += `<p class="sum-sub">Add-ons</p><ul class="sum-addons">${e.addons.map(a =>
        `<li>${esc(a.label)} <em class="tag ${a.recurring ? 'tag-rec' : 'tag-once'}">${a.recurring ? 'Recurring' : 'One-time'}</em></li>`).join('')}</ul>`;
    }
    if (e.mode === 'recurring' && e.oneTimeRange) {
      html += `<p class="sum-onetime">Plus one-time projects: <b>${moneyRange(e.oneTimeRange)}</b></p>`;
    }
    if (e.mode === 'recurring' && e.savingsMonthly > 0 && !e.minApplied) {
      html += `<p class="sum-save">${esc(e.freq.label.split(' (')[0])} saves you about <b>${money(e.savingsMonthly)}/month</b> with our ${Math.round(e.freq.discount * 100)}% volume discount.</p>`;
    } else if (e.mode === 'recurring' && e.freqKey === '1x' && !e.freqAssumed) {
      html += `<p class="sum-tip">Tip: 2x/week takes ${Math.round(P.frequencies['2x'].discount * 100)}% off every visit.</p>`;
    }
    if (e.minApplied) {
      html += `<p class="sum-tip">Includes our ${money(e.mode === 'once' ? P.minimumOneTime : P.minimumMonthly)} ${e.mode === 'once' ? 'one-time job' : 'monthly'} minimum.</p>`;
    }
    body.innerHTML = html;

    clearTimeout(srTimer);
    srTimer = setTimeout(() => {
      $('#sum-sr').textContent = `Estimate updated: ${moneyRange(e.range)} ${e.mode === 'once' ? 'one-time' : 'per month'}.`;
    }, 900);
  }
  calc.addEventListener('input', render);
  calc.addEventListener('change', render);
  calc.addEventListener('submit', ev => { ev.preventDefault(); next(); });

  // Mobile: expand / collapse the bottom bar
  $('#sum-toggle').addEventListener('click', () => {
    const open = summary.classList.toggle('open');
    $('#sum-toggle').setAttribute('aria-expanded', String(open));
    $('#sum-toggle').textContent = open ? 'Hide' : 'Details';
  });

  // Share link
  $('#share-btn').addEventListener('click', () => {
    const url = location.href, status = $('#share-status');
    const done = () => { status.textContent = 'Link copied. Paste it in an email or text.'; setTimeout(() => { status.textContent = ''; }, 4000); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => window.prompt('Copy this link:', url));
    else window.prompt('Copy this link:', url);
  });

  /* --- validation --- */
  function setErr(key, msg) {
    const err = $('#err-' + key);
    const field = $('#' + key);
    if (err) err.textContent = msg || '';
    if (field && field.tagName !== 'FIELDSET') {
      if (msg) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    }
    return msg ? key : null;
  }
  const focusTarget = key => {
    const el = $('#' + key);
    if (!el) return null;
    if (el.tagName === 'FIELDSET') return $('input:checked', el) || $('input', el);
    return el;
  };

  function isoLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function parseLocal(v) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  $('#walk_date').min = isoLocal(tomorrow);
  $('#start_date').min = isoLocal(today);

  const intIn = (v, lo, hi) => v != null && Number.isInteger(v) && v >= lo && v <= hi;
  const CHECKS = {
    'fs-type': () => checked('type') ? '' : 'Please choose the type of facility.',
    sqft: () => { const v = num($('#sqft').value); return v != null && v >= 100 && v <= 1000000 ? '' : 'Enter your cleanable square footage, for example 3500. A rough number is fine.'; },
    restrooms: () => intIn(num($('#restrooms').value), 0, 200) ? '' : 'Enter the number of restrooms (0 or more, whole number).',
    kitchens: () => intIn(num($('#kitchens').value), 0, 100) ? '' : 'Enter the number of kitchens or breakrooms (0 or more, whole number).',
    'fs-floor': () => checked('floor') ? '' : 'Please choose your floor type.',
    people: () => intIn(num($('#people').value), 0, 100000) ? '' : 'Enter an approximate number of people per day. A rough guess is fine.',
    'fs-freq': () => checked('freq') ? '' : 'Please choose how often you need cleaning.',
    'fs-time': () => checked('time') ? '' : 'Please choose a preferred time.',
    business: () => $('#business').value.trim() ? '' : 'Enter your business name.',
    contact: () => $('#contact').value.trim() ? '' : 'Enter your name.',
    phone: () => { const d = $('#phone').value.replace(/\D/g, ''); return d.length === 10 || (d.length === 11 && d[0] === '1') ? '' : 'Enter a 10-digit phone number, like (435) 555-0123.'; },
    email: () => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test($('#email').value.trim()) ? '' : 'Enter a valid email address, like name@company.com.',
    address: () => $('#address').value.trim().length >= 5 ? '' : 'Enter the facility address.',
    walk_date: () => {
      const d = parseLocal($('#walk_date').value);
      if (!d) return 'Choose a date for your walkthrough.';
      if (d < tomorrow) return 'Please choose a date from tomorrow onward.';
      if (d.getDay() === 0) return 'We don’t do walkthroughs on Sundays. Please pick Monday through Saturday.';
      return '';
    },
    'fs-window': () => $('input[name="walkthrough_window"]:checked', book) ? '' : 'Please choose morning or afternoon.',
    start_date: () => {
      const d = parseLocal($('#start_date').value);
      if (!d) return 'Choose when you would like service to start.';
      return d < today ? 'The start date can’t be in the past.' : '';
    },
    'fs-current': () => $('input[name="has_cleaning_company"]:checked', book) ? '' : 'Please choose yes or no.',
  };
  const STEP_FIELDS = {
    1: ['fs-type'], 2: ['sqft', 'restrooms', 'kitchens', 'fs-floor', 'people'], 3: ['fs-freq', 'fs-time'], 4: [],
    5: ['business', 'contact', 'phone', 'email', 'address', 'walk_date', 'fs-window', 'start_date', 'fs-current'],
  };
  function validateStep(n) {
    const bad = STEP_FIELDS[n].map(k => setErr(k, CHECKS[k]())).filter(Boolean);
    if (bad.length) { const t = focusTarget(bad[0]); if (t) t.focus(); }
    return !bad.length;
  }
  // Re-check a field as soon as the person fixes it (only if it was showing an error).
  function recheck(ev) {
    const t = ev.target;
    const key = t.type === 'radio' ? (t.closest('fieldset') || {}).id : t.id;
    const err = key && $('#err-' + key);
    if (err && err.textContent && CHECKS[key]) setErr(key, CHECKS[key]());
  }
  calc.addEventListener('input', recheck); calc.addEventListener('change', recheck);
  book.addEventListener('input', recheck); book.addEventListener('change', recheck);
  // Sunday check as soon as a date is picked
  $('#walk_date').addEventListener('change', () => setErr('walk_date', CHECKS.walk_date()));

  // Show "what's not working" only if they already have a cleaner
  function syncCurrent() {
    const yes = ($('input[name="has_cleaning_company"]:checked', book) || {}).value === 'Yes';
    $('#issues-wrap').hidden = !yes;
  }
  book.addEventListener('change', syncCurrent);

  /* --- steps --- */
  function go(n, focus) {
    current = n;
    panels.forEach((p, i) => { p.hidden = i + 1 !== n; });
    $('#progress-text').textContent = `Step ${n} of ${TOTAL}`;
    $('#progress-name').textContent = STEP_NAMES[n - 1];
    $('#progress-fill').style.width = (n / TOTAL * 100) + '%';
    if (focus !== false) {
      const h = $('h2', panels[n - 1]);
      h.focus({ preventScroll: true });
      const top = $('#wizard').getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.4) $('#wizard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  function next() { if (validateStep(current) && current < TOTAL) go(current + 1); }
  $$('[data-next]').forEach(b => b.addEventListener('click', next));
  $$('[data-back]').forEach(b => b.addEventListener('click', () => go(Math.max(1, current - 1))));
  $('#skip-to-book').addEventListener('click', () => {
    for (let n = 1; n < TOTAL; n++) if (!validateStep(n)) { go(n); validateStep(n); return; }
    $('#shared-note').hidden = true;
    go(TOTAL);
  });

  /* --- submit to Netlify Forms --- */
  function fillHidden(s, e) {
    const set = (name, v) => { book.elements[name].value = v; };
    set('facility_type', e.type.label);
    set('square_feet', Math.round(e.sqft));
    set('restrooms', e.restrooms);
    set('kitchens_breakrooms', e.kitchens);
    set('floor_type', e.floor.label);
    set('daily_people', s.people);
    set('traffic_level', e.traffic.label);
    set('frequency', e.freq.label);
    set('preferred_time', s.time);
    set('add_ons', e.addons.length ? e.addons.map(a => `${a.label}: ${money(a.amount)} ${!a.recurring ? 'one-time' : a.per === 'restroom-month' ? 'per month' : 'per visit'}`).join('; ') : 'None');
    if (e.mode === 'once') {
      set('estimate_range', moneyRange(e.range) + ' one-time');
      set('estimate_per_visit', 'n/a (one-time job)');
      set('visits_per_month', '0 (one-time)');
      set('one_time_charges', 'Included above');
    } else {
      set('estimate_range', moneyRange(e.range) + ' / month');
      set('estimate_per_visit', money(e.perVisit));
      set('visits_per_month', visitsText(e.visits));
      set('one_time_charges', e.oneTimeRange ? moneyRange(e.oneTimeRange) : 'None');
    }
    set('estimate_breakdown', e.lines.map(([l, a]) => `${l}: ${a < 0 ? '-' : ''}${money(Math.abs(a))}`).join(' | ') +
      ` | ESTIMATE: ${e.mode === 'once' ? money(e.total) : money(e.monthly) + '/month'}`);
    set('share_link', location.href);
    set('subject', `Walkthrough request: ${$('#business').value.trim()} (${book.elements.estimate_range.value})`);
  }

  book.addEventListener('submit', ev => {
    ev.preventDefault();
    for (let n = 1; n < TOTAL; n++) if (!validateStep(n)) { go(n); validateStep(n); return; }
    if (!validateStep(TOTAL)) return;
    const s = readState(), e = calcEstimate(s, P);
    fillHidden(s, e);
    const btn = $('#submit-btn'), msg = $('#submit-error');
    msg.textContent = '';
    // Honeypot: real people never fill this hidden field.
    if (book.elements['bot-field'].value) { showDone(s, e); return; }
    btn.disabled = true; btn.textContent = 'Sending…';
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(book)).toString(),
    }).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      showDone(s, e);
    }).catch(() => {
      msg.textContent = 'Sorry, your request didn’t go through. Please try again, or call us at (435) 232-8058.';
      btn.disabled = false; btn.textContent = 'Book my free walkthrough';
      msg.focus();
    });
  });

  function showDone(s, e) {
    const d = parseLocal($('#walk_date').value);
    const win = $('input[name="walkthrough_window"]:checked', book).value;
    const rows = [
      [e.mode === 'once' ? 'Estimated one-time job' : 'Estimated monthly', moneyRange(e.range) + (e.mode === 'once' ? '' : ' / month')],
    ];
    if (e.mode === 'recurring') rows.push(['Frequency', `${e.freq.label} (${visitsText(e.visits)} visits/month, ≈ ${money(e.perVisit)} per visit)`]);
    rows.push(['Facility', `${e.type.label}, ${Math.round(e.sqft).toLocaleString('en-US')} sq ft`]);
    if (e.addons.length) rows.push(['Add-ons', e.addons.map(a => a.label).join(', ')]);
    if (e.mode === 'recurring' && e.oneTimeRange) rows.push(['One-time projects', moneyRange(e.oneTimeRange)]);
    rows.push(['Requested walkthrough', `${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}, ${win.toLowerCase()}`]);
    $('#done-rows').innerHTML = rows.map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('');
    $('#done-name').textContent = $('#contact').value.trim().split(/\s+/)[0];
    $('#est-app').hidden = true;
    $('#done').hidden = false;
    document.body.classList.add('est-done');
    $('#done h2').focus({ preventScroll: true });
    $('#done').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* --- start --- */
  if (readURL()) $('#shared-note').hidden = false;
  render();
  go(1, false);
})();
