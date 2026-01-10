// === CONFIG: список наших игр (placeId + universeId) ===
const DUCK_PLACES_GAMES = [
  {
    placeId: 131146262725992,
    universeId: 8688305922,
    robloxUrl: "https://www.roblox.com/games/131146262725992"
  }, // Don't Wake the Ronaldo ⚽
  {
    placeId: 135429961410565,
    universeId: 8881377191,
    robloxUrl: "https://www.roblox.com/games/135429961410565"
  }, // [🐶] Plants VS Pets!
  {
    placeId: 107547510460716,
    universeId: 9039819466,
    robloxUrl: "https://www.roblox.com/games/107547510460716"
  }, // [⚽] Shoot a Soccer Player
  {
    placeId: 138539043468443,
    universeId: 8054116823,
    robloxUrl: "https://www.roblox.com/games/138539043468443"
  }, // 🍗 Steal a Food
  {
    placeId: 129037710690382,
    universeId: 8706724616,
    robloxUrl: "https://www.roblox.com/games/129037710690382"
  }, // Don't Wake the Memes 😂
  {
    placeId: 71980637800931,
    universeId: 8793655024,
    robloxUrl: "https://www.roblox.com/games/71980637800931"
  },  // [🌻] Plants VS 99 Nights in the Forest
  {
    placeId: 116000696149790,
    universeId: 9111895546,
    robloxUrl: "https://www.roblox.com/games/116000696149790/"
  },  // Don't Steal the Pets 😺
  {
    placeId: 105247140772516,
    universeId: 9077172391,
    robloxUrl: "https://www.roblox.com/games/105247140772516/"
  },  // [😂] Trade a Meme
  {
    placeId: 74841063706561,
    universeId: 9264442606,
    robloxUrl: "https://www.roblox.com/games/74841063706561/"
  },  // Don't Take the Christmas Brainrots! ❄️
  {
    placeId: 117412602469270,
    universeId: 9351526785,
    robloxUrl: "https://www.roblox.com/games/117412602469270/"
  },  // ⚽ Find the Soccer Players!
  {
    placeId: 140362899871634,
    universeId: 9503575520,
    robloxUrl: "https://www.roblox.com/games/140362899871634/"
  },  // ⚡ +1 Speed Brainrot Escape
  {
    placeId: 79098716672556,
    universeId: 9529342993,
    robloxUrl: "https://www.roblox.com/games/79098716672556/"
  },  // 🌊 Escape Tsunami for 67 🧠
];

// ФОРМАТИРОВАНИЕ ТЕКСТА
function formatNumberShort(num) {
    if (num >= 1_000_000_000_000) return (num / 1_000_000_000_000).toFixed(2).replace(/\.00$/, "") + "T";
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2).replace(/\.00$/, "") + "B";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2).replace(/\.00$/, "") + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toString();
}

// Внутренние данные после загрузки с API
let gamesData = [];

// === УТИЛИТЫ ===

function formatNumber(num) {
  if (num == null || isNaN(num)) return "0";
  return Number(num).toLocaleString("en-US");
}

function animateNumber(element, value, duration, formatter) {
  const start = performance.now();
  const startValue = 0;
  const endValue = Number(value) || 0;

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const current = startValue + (endValue - startValue) * progress;
    const intValue = Math.floor(current);

    let display = intValue.toLocaleString("en-US");
    if (typeof formatter === "function") {
      display = formatter(intValue);
    }

    element.textContent = display;

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed ${res.status} for ${url}`);
  }
  return res.json();
}

// === API через твой backend ===

const API_BASE = "https://duck-backend-tqhy.onrender.com";

// 1) Получение информации об играх
async function fetchGamesInfo(universeIds) {
  if (!universeIds.length) return { data: [] };
  const url = `${API_BASE}/api/games?universeIds=${universeIds.join(",")}`;
  return fetchJson(url);
}

// 2) Получение иконок
async function fetchGameIcons(universeIds) {
  if (!universeIds.length) return { data: [] };
  const url = `${API_BASE}/api/game-icons?universeIds=${universeIds.join(",")}`;
  return fetchJson(url);
}


// 3) Основная функция загрузки данных об играх
async function loadGamesData() {
  try {
    const universeIds = DUCK_PLACES_GAMES.map((g) => g.universeId);

    const [gamesInfo, iconsInfo] = await Promise.all([
      fetchGamesInfo(universeIds),
      fetchGameIcons(universeIds)
    ]);

    const universeStatsMap = {};
    (gamesInfo.data || []).forEach((g) => {
      universeStatsMap[g.id] = {
        name: g.name,
        playing: g.playing,
        visits: g.visits
      };
    });

    const iconMap = {};
    (iconsInfo.data || []).forEach((i) => {
      iconMap[i.targetId] = i.imageUrl;
    });

    // Собираем gamesData в том же порядке, что и DUCK_PLACES_GAMES
    gamesData = DUCK_PLACES_GAMES.map((base, index) => {
      const universeId = base.universeId;

      const stats = universeStatsMap[universeId] || {};
      const thumbnail =
        iconMap[universeId] || "assets/game-placeholder.png";

      const name =
        stats.name ||
        `Duck Places Game #${index + 1}`;

      const playing = stats.playing ?? 0;
      const visits = stats.visits ?? 0;

      const robloxUrl =
        base.robloxUrl ||
        `https://www.roblox.com/games/${base.placeId}`;

      return {
        placeId: base.placeId,
        universeId,
        name,
        playing,
        visits,
        thumbnail,
        robloxUrl
      };
    });
  } catch (err) {
    console.error("Failed to load Roblox data, using fallback", err);

    // Fallback, если даже backend не достучался до Roblox
    gamesData = DUCK_PLACES_GAMES.map((g, index) => ({
      placeId: g.placeId,
      universeId: g.universeId,
      name: `Duck Places Game #${index + 1}`,
      playing: 0,
      visits: 0,
      thumbnail: "assets/game-placeholder.png",
      robloxUrl: g.robloxUrl || `https://www.roblox.com/games/${g.placeId}`
    }));
  }

  renderEverything();
}

// === РЕНДЕР ===

function createGameCard(game) {
  const a = document.createElement("a");
  a.href = game.robloxUrl;
  a.target = "_blank";
  a.className = "game-card";
  a.setAttribute("data-place-id", game.placeId);

  a.innerHTML = `
    <div class="game-card-inner">
      <img
        src="${game.thumbnail}"
        alt="${game.name}"
        class="game-card-image"
        loading="lazy"
      />
      <div class="game-card-overlay">
        <h3 class="game-card-title">${game.name}</h3>
        <div class="game-card-stats">
          <div class="game-stat-pill">
            <span class="game-stat-label">Online</span>
            <span class="game-stat-value">${formatNumber(game.playing)}</span>
          </div>
          <div class="game-stat-pill">
            <span class="game-stat-label">Visits</span>
            <span class="game-stat-value">${formatNumber(game.visits)}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  return a;
}

function renderHeroStats() {
  const playersTotal = gamesData.reduce(
    (sum, g) => sum + (g.playing || 0),
    0
  );
  const visitsTotal = gamesData.reduce(
    (sum, g) => sum + (g.visits || 0),
    0
  );

    const playersEl = document.getElementById("statCurrentPlayers");
    const visitsEl  = document.getElementById("statTotalVisits");

    if (playersEl) animateNumber(playersEl, playersTotal, 1000);                 // обычная анимация
    if (visitsEl)  animateNumber(visitsEl,  visitsTotal, 1200, formatNumberShort); // с K/M/B
}

function renderTopGames() {
  const grid = document.getElementById("topGamesGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const sorted = [...gamesData].sort(
    (a, b) => (b.playing || 0) - (a.playing || 0)
  );

  const top6 = sorted.slice(0, 8);
  top6.forEach((game) => {
    grid.appendChild(createGameCard(game));
  });
}

function renderAllGames() {
  const grid = document.getElementById("allGamesGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const sorted = [...gamesData].sort(
    (a, b) => (b.playing || 0) - (a.playing || 0)
  );

  sorted.forEach((game) => {
    grid.appendChild(createGameCard(game));
  });
}

function renderEverything() {
  renderHeroStats();
  renderTopGames();
  renderAllGames();
}

// === UI: навигация, скролл, копирование Discord ===

function setupNavToggle() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");

  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    document.body.classList.toggle("nav-open");
  });

  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      document.body.classList.remove("nav-open");
    }
  });
}

function setupScrollDown() {
  const btn = document.getElementById("scrollDown");
  const target = document.getElementById("our-games");
  if (!btn || !target) return;

  btn.addEventListener("click", () => {
    target.scrollIntoView({ behavior: "smooth" });
  });
}

function setupDiscordCopy() {
  const btn = document.getElementById("copyDiscordBtn");
  const tagEl = document.getElementById("discordTag");
  const feedback = document.getElementById("copyFeedback");

  if (!btn || !tagEl) return;

  btn.addEventListener("click", async () => {
    const text = tagEl.textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
      if (feedback) {
        feedback.classList.add("visible");
        setTimeout(() => feedback.classList.remove("visible"), 1600);
      }
    } catch (err) {
      console.error("Clipboard error", err);
    }
  });
}

function setupScrollReveal() {
  const elements = document.querySelectorAll(".reveal-on-scroll");
  if (!elements.length) return;

  // Фоллбек для старых браузеров
  if (!("IntersectionObserver" in window)) {
    elements.forEach(el => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target); // анимируем только один раз
        }
      });
    },
    {
      threshold: 0.2 // секция считается видимой, когда 20% в зоне экрана
    }
  );

  elements.forEach(el => observer.observe(el));
}

// === ИНИЦИАЛИЗАЦИЯ ===

document.addEventListener("DOMContentLoaded", () => {
  setupNavToggle();
  setupScrollDown();
  setupDiscordCopy();
  setupScrollReveal();   // ← добавили
  loadGamesData();
});






