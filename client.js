const PLACEHOLDER = '/assets/game-placeholder.svg';
const CACHE_KEY = 'duckplaces:games:thumbnails:v1';
// GitHub Pages serves files only; use our existing Vercel backend for live data.
const API_BASE = ['duckplaces.com', 'www.duckplaces.com', 'bobersus.github.io'].includes(window.location?.hostname) ? 'https://duckplaces.vercel.app' : '';
const snapshot = window.DUCK_PLACES_SNAPSHOT;
let gamesData = DUCK_PLACES_GAMES.map(game => ({ ...game, name: 'Loading experience…', robloxUrl: `https://www.roblox.com/games/${game.placeId}`, created: null, playing: null, visits: null, thumbnail: PLACEHOLDER }));
let lastUpdated = null;
let refreshPending = false;
const numberFormatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const heroCounters = new WeakMap();

function formatNumber(value) {
  if (!Number.isFinite(value)) return '—';
  return numberFormatter.format(value);
}
function animateHeroCounter(el, target) {
  const previous = heroCounters.get(el);
  if (previous?.target === target) return;
  if (previous?.frame) cancelAnimationFrame(previous.frame);
  const state = { value: previous?.value ?? 0, target, frame: null };
  heroCounters.set(el, state);
  el.title = Number.isFinite(target) ? target.toLocaleString('en-US') : '';
  if (!Number.isFinite(target) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || typeof requestAnimationFrame !== 'function') {
    state.value = target;
    el.textContent = formatNumber(target);
    return;
  }
  const from = Number.isFinite(state.value) ? state.value : 0;
  const duration = Number.isFinite(previous?.target) ? 650 : 1700;
  const start = performance.now();
  el.textContent = formatNumber(Math.round(from));
  function tick(now) {
    const progress = Math.min(1, Math.max(0, (now - start) / duration));
    const eased = 1 - Math.pow(1 - progress, 3);
    state.value = progress === 1 ? target : from + (target - from) * eased;
    el.textContent = formatNumber(Math.round(state.value));
    state.frame = progress < 1 ? requestAnimationFrame(tick) : null;
  }
  state.frame = requestAnimationFrame(tick);
}
function applySnapshot(saved) {
  if (!Array.isArray(saved?.games) || !Number.isFinite(Date.parse(saved.updatedAt))) return;
  const byId = new Map(saved.games.map(game => [game.universeId, game]));
  gamesData = gamesData.map(game => {
    const item = byId.get(game.universeId);
    if (!item) return game;
    // Only accept a numeric cached API place ID and always construct the Roblox URL ourselves.
    const placeId = Number.isSafeInteger(item.placeId) && item.placeId > 0 ? item.placeId : game.placeId;
    return { ...game, placeId, robloxUrl: `https://www.roblox.com/games/${placeId}`, name: typeof item.name === 'string' ? item.name : game.name,
      created: typeof item.created === 'string' && Number.isFinite(Date.parse(item.created)) ? item.created : game.created,
      playing: Number.isFinite(item.playing) ? item.playing : game.playing,
      visits: Number.isFinite(item.visits) ? item.visits : game.visits,
      thumbnail: validThumbnail(item.thumbnail) ? item.thumbnail : game.thumbnail };
  });
  lastUpdated = saved.updatedAt;
}
function validThumbnail(url) {
  try { const parsed = new URL(url); return parsed.protocol === 'https:' && (parsed.hostname === 'tr.rbxcdn.com' || parsed.hostname.endsWith('.rbxcdn.com')); }
  catch { return false; }
}
function status(message) {
  document.querySelectorAll('.games-status').forEach(el => { el.textContent = message; });
}
async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body.data)) throw new Error('Invalid game data');
  return body.data;
}
async function refreshGames() {
  if (refreshPending || document.hidden) return;
  refreshPending = true;
  const ids = DUCK_PLACES_GAMES.map(game => game.universeId).join(',');
  const results = await Promise.allSettled([
    fetchJson(`${API_BASE}/api/games?universeIds=${ids}`),
    fetchJson(`${API_BASE}/api/game-thumbnails?universeIds=${ids}`)
  ]);
  const stats = results[0].status === 'fulfilled' ? new Map(results[0].value.map(item => [item.id, item])) : new Map();
  const images = results[1].status === 'fulfilled' ? new Map(results[1].value.map(item => [item.universeId, item.thumbnails?.[0]])) : new Map();
  gamesData = gamesData.map(game => {
    const info = stats.get(game.universeId);
    const image = images.get(game.universeId);
    const placeId = Number.isSafeInteger(info?.rootPlaceId) && info.rootPlaceId > 0 ? info.rootPlaceId : game.placeId;
    return { ...game, placeId, robloxUrl: `https://www.roblox.com/games/${placeId}`, name: info?.name || game.name,
      created: typeof info?.created === 'string' && Number.isFinite(Date.parse(info.created)) ? info.created : game.created,
      playing: Number.isFinite(info?.playing) ? info.playing : game.playing,
      visits: Number.isFinite(info?.visits) ? info.visits : game.visits,
      thumbnail: image?.state === 'Completed' && validThumbnail(image.imageUrl) ? image.imageUrl : game.thumbnail };
  });
  if (results[0].status === 'fulfilled' && stats.size) lastUpdated = new Date().toISOString();
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ games: gamesData, updatedAt: lastUpdated })); } catch { /* Storage is optional. */ }
  renderEverything();
  updateTimestamp();
  refreshPending = false;
}
function updateTimestamp() {
  status('');
}
function element(tag, className, text) {
  const node = document.createElement(tag); node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function createGameCard(game) {
  const link = element('a', 'game-card');
  link.href = game.robloxUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
  link.dataset.placeId = game.placeId;
  link.setAttribute('aria-label', `Play ${game.name} on Roblox (opens in a new tab)`);
  const inner = element('div', 'game-card-inner');
  const media = element('div', 'game-card-media');
  const image = element('img', 'game-card-image');
  image.src = game.thumbnail; image.alt = ''; image.loading = 'lazy'; image.decoding = 'async'; image.width = 768; image.height = 432;
  image.addEventListener('error', () => { image.src = PLACEHOLDER; }, { once: true });
  const play = element('span', 'game-card-play'); play.setAttribute('aria-hidden', 'true');
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  arrow.setAttribute('viewBox', '0 0 24 24'); arrow.setAttribute('fill', 'none');
  arrow.setAttribute('stroke', 'currentColor'); arrow.setAttribute('stroke-width', '2');
  arrow.setAttribute('stroke-linecap', 'round'); arrow.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M7 17 17 7M7 7h10v10'); arrow.append(path); play.append(arrow);
  media.append(image, play);
  const caption = element('div', 'game-card-overlay');
  caption.append(element('h3', 'game-card-title', game.name));
  const stats = element('div', 'game-card-stats');
  for (const [label, value] of [['Online', game.playing], ['Visits', game.visits]]) {
    const pill = element('div', 'game-stat-pill');
    if (label === 'Online') pill.append(element('span', 'online-dot'));
    pill.append(element('span', 'game-stat-value', formatNumber(value)), element('span', 'game-stat-label', label));
    stats.append(pill);
  }
  caption.append(stats); inner.append(media, caption); link.append(inner);
  return link;
}
function renderTopGames() {
  const grid = document.getElementById('topGamesGrid'); if (!grid) return;
  const sorted = [...gamesData].sort((a, b) => (b.playing ?? -1) - (a.playing ?? -1));
  grid.replaceChildren(...sorted.slice(0, 8).map(createGameCard));
}
function renderAllGames() {
  const grid = document.getElementById('allGamesGrid'); if (!grid) return;
  const query = document.getElementById('gameSearch')?.value.trim().toLowerCase() || '';
  const sort = document.getElementById('gameSort')?.value || 'online';
  const list = gamesData.filter(game => game.name.toLowerCase().includes(query));
  list.sort(sort === 'newest' || sort === 'oldest' ? (a, b) => compareGamesByCreated(a, b, sort === 'newest') : sort === 'name' ? (a, b) => a.name.localeCompare(b.name) : sort === 'visits' ? (a, b) => (b.visits ?? -1) - (a.visits ?? -1) : (a, b) => (b.playing ?? -1) - (a.playing ?? -1));
  grid.replaceChildren(...list.map(createGameCard));
  if (!list.length) grid.append(element('p', 'empty-state', 'No games found. Try a different name.'));
  const count = document.getElementById('gameCount');
  if (count) count.textContent = `${list.length} ${list.length === 1 ? 'experience' : 'experiences'}`;
}
function compareGamesByCreated(a, b, newestFirst) {
  const first = Date.parse(a.created);
  const second = Date.parse(b.created);
  if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0;
  if (!Number.isFinite(second)) return -1;
  return newestFirst ? second - first : first - second;
}
function renderEverything() {
  for (const [id, key] of [['statCurrentPlayers', 'playing'], ['statTotalVisits', 'visits']]) {
    const el = document.getElementById(id);
    if (el) animateHeroCounter(el, gamesData.some(game => Number.isFinite(game[key])) ? gamesData.reduce((sum, game) => sum + (game[key] || 0), 0) : null);
  }
  renderTopGames(); renderAllGames();
}
document.addEventListener('DOMContentLoaded', () => {
  setupSortPicker();
  const gameCount = document.querySelector('.board-number');
  if (gameCount) gameCount.textContent = DUCK_PLACES_GAMES.length;
  const nav = document.getElementById('mainNav');
  const toggle = document.getElementById('navToggle');
  function closeNav() { document.body.classList.remove('nav-open'); toggle?.setAttribute('aria-expanded', 'false'); }
  toggle?.setAttribute('aria-expanded', 'false'); toggle?.setAttribute('aria-controls', 'mainNav');
  toggle?.addEventListener('click', () => { const open = document.body.classList.toggle('nav-open'); toggle.setAttribute('aria-expanded', String(open)); });
  nav?.addEventListener('click', event => { if (event.target.closest('a')) closeNav(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeNav(); });
  document.getElementById('copyDiscordBtn')?.addEventListener('click', async () => {
    const feedback = document.getElementById('copyFeedback');
    try { await navigator.clipboard.writeText(document.getElementById('discordTag').textContent.trim()); feedback.textContent = 'Copied!'; }
    catch { feedback.textContent = 'Copy the username above'; }
    feedback.classList.add('visible'); setTimeout(() => feedback.classList.remove('visible'), 2000);
  });
  if (!document.querySelector('#topGamesGrid, #allGamesGrid')) return;
  applySnapshot(snapshot);
  try { const saved = JSON.parse(localStorage.getItem(CACHE_KEY)); if (Date.parse(saved?.updatedAt) > Date.parse(lastUpdated || 0)) applySnapshot(saved); } catch { /* Storage is optional. */ }
  renderEverything(); updateTimestamp();
  document.getElementById('gameSearch')?.addEventListener('input', renderAllGames);
  document.getElementById('gameSort')?.addEventListener('change', renderAllGames);
  refreshGames(); setInterval(refreshGames, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshGames(); });
});

function setupSortPicker() {
  const select = document.getElementById('gameSort');
  if (!select) return;
  // Retain the native control as the data source and no-JS fallback.
  const label = select.closest('label');
  label.classList.add('sr-only'); select.tabIndex = -1; select.setAttribute('aria-hidden', 'true');
  const picker = element('div', 'sort-picker');
  const trigger = element('button', 'sort-trigger'); trigger.type = 'button';
  trigger.id = 'sortTrigger'; trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-controls', 'sortOptions');
  const caption = element('span', 'sort-caption', select.selectedOptions[0].textContent);
  const chevron = element('span', 'sort-chevron'); chevron.setAttribute('aria-hidden', 'true');
  trigger.append(caption, chevron);
  const menu = element('div', 'sort-menu'); menu.id = 'sortOptions';
  menu.setAttribute('role', 'listbox'); menu.setAttribute('aria-label', 'Sort games'); menu.inert = true;
  const options = [...select.options].map(option => {
    const button = element('button', 'sort-option', option.textContent); button.type = 'button';
    button.setAttribute('role', 'option'); button.tabIndex = -1;
    button.dataset.value = option.value; button.setAttribute('aria-selected', String(option.selected));
    if (option.title) button.title = option.title;
    button.addEventListener('click', () => {
      select.value = option.value; caption.textContent = option.textContent;
      options.forEach(item => item.setAttribute('aria-selected', String(item === button)));
      select.dispatchEvent(new Event('change', { bubbles: true })); close(true);
    });
    menu.append(button); return button;
  });
  picker.append(trigger, menu); label.after(picker);
  function open(index = select.selectedIndex) {
    picker.classList.add('is-open'); trigger.setAttribute('aria-expanded', 'true'); menu.inert = false;
    options[index].focus({ preventScroll: true });
  }
  function close(returnFocus = false) {
    picker.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); menu.inert = true;
    if (returnFocus) trigger.focus({ preventScroll: true });
  }
  trigger.addEventListener('click', () => picker.classList.contains('is-open') ? close() : open());
  picker.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(true); }
    else if (event.key === 'Tab') close();
    else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const current = options.indexOf(document.activeElement);
      let index = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : current < 0 ? select.selectedIndex : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      open(index);
    } else if (event.key.length === 1 && /[a-z]/i.test(event.key)) {
      const index = options.findIndex(option => option.textContent.toLowerCase().startsWith(event.key.toLowerCase()));
      if (index >= 0) { event.preventDefault(); open(index); }
    }
  });
  document.addEventListener('pointerdown', event => { if (!picker.contains(event.target)) close(); });
  picker.addEventListener('focusout', event => { if (!picker.contains(event.relatedTarget)) close(); });
}
