const licenses = {
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/deed.ru",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/deed.ru",
  "CC BY-ND 4.0": "https://creativecommons.org/licenses/by-nd/4.0/deed.ru",
  "CC BY-NC 4.0": "https://creativecommons.org/licenses/by-nc/4.0/deed.ru",
  "CC BY-NC-SA 4.0":
    "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ru",
  "CC BY-NC-ND 4.0":
    "https://creativecommons.org/licenses/by-nc-nd/4.0/deed.ru",
};

let selectedRecordingFile = null;
let quillLoadingPromise = null;

async function loadAndInitQuill(selectorId, content) {
  if (!window.Quill && !quillLoadingPromise) {
    quillLoadingPromise = new Promise((resolve) => {
      const check = () => (window.Quill ? resolve() : setTimeout(check, 50));
      check();
    });
  }

  if (quillLoadingPromise) {
    await quillLoadingPromise;
  }

  initQuill(selectorId, content);
}

window.quillEditor = null;
let mapInstance = null;

if (window.Quill) {
  const BlockEmbed = Quill.import("blots/block/embed");

  class AudioBlot extends BlockEmbed {
    static create(value) {
      let node = super.create();
      node.setAttribute("src", value);
      node.setAttribute("controls", "");
      node.setAttribute("preload", "metadata");
      node.setAttribute("class", "w-full my-6 block");

      return node;
    }

    static value(node) {
      return node.getAttribute("src");
    }
  }

  AudioBlot.blotName = "audio";
  AudioBlot.tagName = "audio";

  Quill.register(AudioBlot);
}

function isAdmin() {
  return isLoggedIn() && localStorage.getItem("is_admin") === "true";
}

function isLoggedIn() {
  return !!localStorage.getItem("access_token");
}

// --- HELPERS ---

function pluralize(number, forms) {
  // forms = ['запись', 'записи', 'записей']
  const n = Math.abs(number) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) {
    return forms[2]; // 11-19 записей
  }
  if (n1 > 1 && n1 < 5) {
    return forms[1]; // 2-4 записи
  }
  if (n1 === 1) {
    return forms[0]; // 1 запись
  }
  return forms[2]; // 0, 5-9 записей
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-а-яё]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .replace(/а/g, "a")
    .replace(/б/g, "b")
    .replace(/в/g, "v")
    .replace(/г/g, "g")
    .replace(/д/g, "d")
    .replace(/е/g, "e")
    .replace(/ё/g, "e")
    .replace(/ж/g, "zh")
    .replace(/з/g, "z")
    .replace(/и/g, "i")
    .replace(/й/g, "y")
    .replace(/к/g, "k")
    .replace(/л/g, "l")
    .replace(/м/g, "m")
    .replace(/н/g, "n")
    .replace(/о/g, "o")
    .replace(/п/g, "p")
    .replace(/р/g, "r")
    .replace(/с/g, "s")
    .replace(/т/g, "t")
    .replace(/у/g, "u")
    .replace(/ф/g, "f")
    .replace(/х/g, "h")
    .replace(/ц/g, "c")
    .replace(/ч/g, "ch")
    .replace(/ш/g, "sh")
    .replace(/щ/g, "sch")
    .replace(/ъ/g, "")
    .replace(/ы/g, "y")
    .replace(/ь/g, "")
    .replace(/э/g, "e")
    .replace(/ю/g, "yu")
    .replace(/я/g, "ya");
}

function getYoutubeIcon(url) {
  if (!url) return "";
  return `
      <a href="${url}" target="_blank" onclick="event.stopPropagation();"
         class="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors ml-1"
         title="Смотреть на YouTube">
         <i data-lucide="youtube" class="w-5 h-5"></i>
      </a>
    `;
}

// ui.js

export function updateHeaderAuth() {
  const container = document.getElementById("header-auth-block");
  const plLink = document.getElementById("nav-playlists-link");
  const favLink = document.getElementById("nav-favorites-link");
  const mobilePlLink = document.getElementById("mobile-nav-playlists-link");
  const mobileFavLink = document.getElementById("mobile-nav-favorites-link");

  if (!container) return;

  if (!isLoggedIn()) {
    container.innerHTML = `
            <button id="show-login-modal-btn" class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-bold">
                Войти
            </button>
        `;
    if (plLink) plLink.classList.add("hidden");
    if (favLink) favLink.classList.add("hidden");
    if (mobilePlLink) mobilePlLink.classList.add("hidden");
    if (mobileFavLink) mobileFavLink.classList.add("hidden");
  } else {
    const username =
      localStorage.getItem("display_name") ||
      localStorage.getItem("user_email")?.split("@")[0] ||
      "User";

    // Проверяем текущий маршрут через объект роутера
    const isOnAccountPage =
      window.router &&
      window.router.lastResolvedRoute &&
      window.router.lastResolvedRoute.url === "account";

    container.className = "flex items-center gap-2";

    container.innerHTML = `
        <!-- ТЕКСТОВЫЙ БЛОК -->
        <div class="flex flex-col items-end justify-center">
             <div class="text-xs md:text-sm font-bold opacity-90 text-right leading-tight max-w-[150px] md:max-w-none">
                <span>Здравствуйте, </span>
                ${
                  isOnAccountPage
                    ? `<span class="text-white">${username}</span>`
                    : `<a href="/account" data-navigo class="text-white/90 hover:text-white hover:underline transition-colors">${username}</a>`
                }<span>!  </span>
             </div>
        </div>
        
        <!-- КНОПКА ВЫХОДА -->
        <button id="logout-btn" class="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors flex-shrink-0 self-center" title="Выйти">
           <i data-lucide="log-out" class="w-4 h-4"></i>
        </button>
    `;
    if (plLink) plLink.classList.remove("hidden");
    if (favLink) favLink.classList.remove("hidden");
    if (mobilePlLink) mobilePlLink.classList.remove("hidden");
    if (mobileFavLink) mobileFavLink.classList.remove("hidden");
  }

  if (window.lucide) lucide.createIcons();
}

function getLocalizedText(entity, field, lang) {
  if (!entity) return "";
  const ruField = `${field}_ru`;
  const originalField =
    field === "name" ? "original_name" : `${field}_original`;

  if (lang === "ru" && entity[ruField]) return entity[ruField];
  if (entity[field]) return entity[field];
  if (entity[originalField]) return entity[originalField];

  return entity[ruField] || "";
}

function getElements() {
  return {
    authView: document.getElementById("auth-view"),
    mainView: document.getElementById("main-view"),
    listEl: document.getElementById("composition-list"),
    playerTitleEl: document.getElementById("player-title"),
    playerArtistEl: document.getElementById("player-artist"),
    playerCoverArtEl: document.getElementById("player-cover-art"),
    playPauseBtn: document.getElementById("play-pause-btn"),
    playIcon: document.getElementById("play-icon"),
    pauseIcon: document.getElementById("pause-icon"),
  };
}

export function formatDuration(seconds) {
  if (isNaN(seconds) || seconds === null) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatYearRange(start, end) {
  if (!start) return "";
  if (!end || start === end) return `${start}`;
  return `${start}–${end}`;
}

export function showMainApp() {
  const authView = document.getElementById("auth-view");
  const mainView = document.getElementById("main-view");

  authView.style.display = "none";
  authView.classList.add("hidden");

  mainView.classList.remove("hidden");
}

export function showAuthView() {
  document.getElementById("auth-view").classList.remove("hidden");
  document.getElementById("main-view").classList.add("hidden");
  document.getElementById("auth-view").style.display = "flex";
}

// --- 1. RENDER DASHBOARD (ГЛАВНАЯ) ---
export function renderDashboard(data, lang = "ru") {
  const { listEl } = getElements();
  const titleContainer = document.getElementById("view-title-container");
  if (titleContainer) titleContainer.classList.add("hidden");

  // 1. HERO SECTION (Улучшенная типографика)
  const heroHTML = `
      <div class="relative text-white overflow-hidden rounded-b-[3rem] shadow-2xl group mb-12"
           style="-webkit-mask-image: -webkit-radial-gradient(white, black);">
        
        <div class="absolute inset-0">
          <video autoplay muted loop playsinline preload="metadata" poster="/static/img/hero.jpg"
            class="w-full h-full object-cover transition-transform duration-[20000ms] ease-linear transform group-hover:scale-105">
            <source src="/static/video/hero.mp4" type="video/mp4">
          </video>
          <div class="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900/90"></div>
        </div>

        <div class="max-w-5xl mx-auto px-6 py-28 relative z-10 text-center">
          <h1 class="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight drop-shadow-xl font-serif">
            Величие <span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">Классики</span>
          </h1>
          <p class="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto font-light">
            Ваша персональная библиотека музыкального наследия. Исследуйте эпохи, открывайте шедевры.
          </p>

          <div class="relative max-w-xl mx-auto mb-12 group/search">
             <i data-lucide="search" class="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within/search:text-cyan-400 transition-colors"></i>
             <input type="text" id="hero-search-input" placeholder="Найти симфонию, автора..."
                    class="w-full pl-14 pr-6 py-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:bg-white/20 focus:border-cyan-400/50 shadow-2xl transition-all">
          </div>
        </div>
      </div>
    `;

  // 2. СТАТИСТИКА (Минималистичная)
  const totalHours = Math.floor((data.stats.total_duration || 0) / 3600);

  const statsHTML = `
       <div class="max-w-7xl mx-auto px-6 mb-16">
           <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
               ${[
                 {
                   val: data.stats.total_composers,
                   label: pluralize(data.stats.total_composers, [
                     "Композитор",
                     "Композитора",
                     "Композиторов",
                   ]),
                   icon: "users",
                 },
                 {
                   val: data.stats.total_works,
                   label: pluralize(data.stats.total_works, [
                     "Произведение",
                     "Произведения",
                     "Произведений",
                   ]),
                   icon: "book-open",
                 },
                 {
                   val: data.stats.total_recordings,
                   label: pluralize(data.stats.total_recordings, [
                     "Запись",
                     "Записи",
                     "Записей",
                   ]),
                   icon: "disc",
                 },
                 {
                   val: totalHours,
                   label: pluralize(totalHours, [
                     "Час музыки",
                     "Часа музыки",
                     "Часов музыки",
                   ]),
                   icon: "clock",
                 },
               ]
                 .map(
                   (item) => `
                 <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="${item.icon}" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-gray-800 font-serif">${item.val}</div>
                        <!-- Вставляем правильное склонение -->
                        <div class="text-xs text-gray-400 uppercase tracking-wider font-bold">${item.label}</div>
                    </div>
                 </div>
               `
                 )
                 .join("")}
           </div>
       </div>
    `;

  // 3. НОВАЯ СЕКЦИЯ: ЭПОХИ (Визуальные карточки)
  const epochsHTML = `
    <div class="max-w-7xl mx-auto px-6 mb-20">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 font-serif flex items-center gap-3">
            <span class="w-2 h-8 bg-cyan-600 rounded-full"></span> Путешествие во времени
        </h2>
        
        <!-- ИСПРАВЛЕНИЕ СЕТКИ: 
             grid-cols-1 = мобильный (столбик)
             sm:grid-cols-2 = планшет (по 2)
             lg:grid-cols-5 = десктоп (все 5 в один ряд) 
        -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            ${[
              {
                id: "renaissance",
                name: "Ренессанс",
                dates: "1400–1600",
                img: "/static/img/epoch_renaissance.jpg",
              },
              {
                id: "baroque",
                name: "Барокко",
                dates: "1600–1750",
                img: "/static/img/epoch_baroque.jpg",
              },
              {
                id: "classical",
                name: "Классицизм",
                dates: "1750–1820",
                img: "/static/img/epoch_classical.jpg",
              },
              {
                id: "romantic",
                name: "Романтизм",
                dates: "1820–1900",
                img: "/static/img/epoch_romantic.jpg",
              },
              {
                id: "modern",
                name: "XX Век",
                dates: "1900–...",
                img: "/static/img/epoch_modern.jpg",
              },
            ]
              .map(
                (e) => `
                <button onclick="window.goToEpoch('${e.id}')" 
                   class="relative h-40 rounded-xl overflow-hidden group text-left shadow-md hover:shadow-xl transition-all hover:-translate-y-1">
                    
                    <!-- 1. ЧИСТАЯ КАРТИНКА (Без прозрачности, без смешивания цветов) -->
                    <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" 
                         style="background-image: url('${e.img}');">
                    </div>

                    <!-- 2. ТОЛЬКО ЧЕРНАЯ ТЕНЬ СНИЗУ (чтобы текст читался, картинку не красит) -->
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                    
                    <!-- ТЕКСТ -->
                    <div class="absolute bottom-0 left-0 p-4 z-20 text-white w-full">
                        <div class="flex justify-between items-end">
                            <div>
                                <div class="text-[10px] font-bold opacity-80 mb-0.5 uppercase tracking-wider">${e.dates}</div>
                                <h3 class="text-xl font-serif font-bold text-white leading-tight">${e.name}</h3>
                            </div>
                            <!-- Стрелочка теперь внизу справа, компактно -->
                            <i data-lucide="arrow-right" class="w-4 h-4 text-white/70 group-hover:text-white transition-colors mb-1"></i>
                        </div>
                    </div>
                </button>
            `
              )
              .join("")}
        </div>
    </div>
  `;

  // 4. SPOTLIGHT (ФИНАЛЬНАЯ ВЕРСИЯ: УБРАНА ЛИНИЯ, БЕЛЫЙ ТЕКСТ, БЕЛАЯ КНОПКА)
  let spotlightHTML = "";
  if (data.random_works.length > 0) {
    const spotlightWork = data.random_works[0];
    const comp = spotlightWork.composer;
    const portrait = comp.portrait_url || "/static/img/placeholder.png";

    // Ссылка формируется здесь. Если слага нет, будет ID.
    const compLink = `/composers/${comp.slug || comp.id}`;

    spotlightHTML = `
        <div class="max-w-7xl mx-auto px-6 mb-20">
            <div class="relative h-[500px] rounded-[2.5rem] overflow-hidden shadow-2xl group bg-black">
                
                <!-- 1. ФОН (Осветлили: brightness-75) -->
                <!-- md:opacity-70 = На ПК фон чуть ярче, чтобы цвет был виден -->
                <div class="absolute inset-0 bg-cover bg-center bg-no-repeat blur-3xl opacity-100 brightness-75 transition-transform duration-[20s] ease-linear group-hover:scale-125" 
                     style="background-image: url('${portrait}');">
                </div>

                <!-- 2. ФОТО (МАСКА АДАПТИРОВАНА ДЛЯ ПК) -->
                <!-- transparent 0%, transparent 20%: Левый край прозрачный (безопасная зона) -->
                <!-- black 100%: Полная видимость справа -->
                <!-- Мы используем одну маску для всех экранов, она универсальна -->
                <div class="absolute inset-0 z-10 transition-transform duration-[20s] ease-linear group-hover:scale-105" 
                     style="background-image: url('${portrait}'); 
                            background-repeat: no-repeat; 
                            background-position: right top; 
                            background-size: auto 100%; 
                            -webkit-mask-image: linear-gradient(to right, transparent 0%, transparent 20%, black 100%);
                            mask-image: linear-gradient(to right, transparent 0%, transparent 20%, black 100%);">
                </div>

                <!-- 3. ГРАДИЕНТ (Смягчили черноту) -->
                <!-- from-black/70 (было 80) = Текст читается, но черноты меньше -->
                <div class="absolute inset-0 z-20 bg-gradient-to-r from-black/70 via-black/30 to-transparent"></div>
                
                <!-- 4. КОНТЕНТ (Белоснежный текст) -->
                <div class="absolute bottom-0 left-0 w-full md:w-2/3 p-8 md:p-16 z-30 flex flex-col items-start justify-center h-full">
                    
                    <div class="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-md text-white/90 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-white/20">
                        Композитор дня
                    </div>

                    <!-- text-white = Чистый белый цвет -->
                    <h2 class="text-5xl md:text-7xl font-serif font-bold text-white mb-6 drop-shadow-xl leading-none">
                        ${getLocalizedText(comp, "name", lang)}
                    </h2>
                    
                    <!-- text-gray-100 = Почти белый, очень легко читать -->
                    <p class="text-lg text-gray-100 mb-10 max-w-xl font-light leading-relaxed drop-shadow-md">
                        Вдохновитесь шедевром <span class="font-semibold text-white">"${getLocalizedText(
                          spotlightWork,
                          "name",
                          lang
                        )}"</span> и откройте для себя мир великого мастера.
                    </p>
                    
                    <!-- КНОПКА: Белая (bg-white), текст черный (text-gray-900) -->
                    <a href="${compLink}" data-navigo 
                       class="px-8 py-4 bg-white text-gray-900 hover:bg-cyan-50 rounded-xl font-bold text-base shadow-xl transition-transform hover:-translate-y-1 flex items-center gap-2">
                        Перейти к профилю <i data-lucide="arrow-right" class="w-5 h-5"></i>
                    </a>
                </div>
            </div>
        </div>
      `;
  }

  // Helper for Cards (Улучшенный дизайн карточек)
  const createSection = (title, items, icon) => {
    if (!items || !items.length) return "";
    const cards = items
      .map((item) => {
        const cover = item.cover_art_url || "/static/img/placeholder.png";
        return `
    <a href="/works/${item.slug || item.id}" data-navigo
       class="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full hover:-translate-y-1">
        <div class="relative aspect-square overflow-hidden bg-gray-100">
            <img src="${cover}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-cyan-600 shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300">
                    <i data-lucide="play" class="w-5 h-5 ml-1 fill-current"></i>
                </div>
            </div>
        </div>
        <div class="p-4 flex flex-col flex-1">
            <h4 class="font-bold text-gray-900 text-lg leading-tight mb-1 group-hover:text-cyan-700 transition-colors line-clamp-2 font-serif">${getLocalizedText(
              item,
              "name",
              lang
            )}</h4>
            <p class="text-sm text-gray-500 line-clamp-1">${getLocalizedText(
              item.composer,
              "name",
              lang
            )}</p>
        </div>
    </a>
            `;
      })
      .join("");

    return `
        <div class="max-w-7xl mx-auto px-6 mb-20">
            <div class="flex justify-between items-end mb-8">
                <h2 class="text-3xl font-bold text-gray-900 font-serif flex items-center gap-3">
                    <span class="w-2 h-8 bg-cyan-600 rounded-full"></span> ${title}
                </h2>
                <a href="/recordings" data-navigo class="text-sm font-bold text-gray-400 hover:text-cyan-600 transition-colors flex items-center gap-1">
                    Смотреть все <i data-lucide="arrow-right" class="w-4 h-4"></i>
                </a>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">${cards}</div>
        </div>
        `;
  };

  // СБОРКА
  listEl.innerHTML =
    heroHTML +
    statsHTML +
    epochsHTML + // Новое
    spotlightHTML + // Новое
    createSection(
      "Недавно добавленные",
      data.recently_added_works,
      "sparkles"
    ) +
    createSection("Случайный выбор", data.random_works, "shuffle");

  // Логика поиска
  setTimeout(() => {
    document
      .getElementById("hero-search-input")
      ?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const val = e.target.value;
          if (window.router)
            window.router.navigate(`/search/${encodeURIComponent(val)}`);
          else window.location.href = `/search/${encodeURIComponent(val)}`;
        }
      });
    if (window.lucide) window.lucide.createIcons();
  }, 50);
}

// --- 2. RENDER RECORDING LIST (ТАБЛИЦА) ---
export function renderRecordingList(
  recordings,
  title,
  startIndex = 0,
  options = {},
  favoriteRecordingIds = new Set(),
  lang = "ru"
) {
  const { listEl } = getElements();
  const { hideComposer, hideWork } = options;

  const viewTitle = document.getElementById("view-title-container");
  if (viewTitle) {
    viewTitle.classList.remove("hidden");

    const controlsHtml =
      recordings && recordings.length > 0
        ? `
        <div class="flex gap-3 mt-4 md:mt-0">
            <button id="playlist-play-all-btn" class="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-bold shadow-md transition-all">
                <i data-lucide="play" class="w-4 h-4 fill-current"></i> Слушать всё
            </button>
            <button id="playlist-shuffle-btn" class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-bold shadow-sm transition-all">
                <i data-lucide="shuffle" class="w-4 h-4"></i> Перемешать
            </button>
        </div>
    `
        : "";

    viewTitle.innerHTML = `
        <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h2 class="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <i data-lucide="list-music" class="w-8 h-8 text-cyan-600"></i> ${
                  title || "Список"
                }
            </h2>
            ${controlsHtml}
        </div>
    `;
  }

  if (!recordings || !recordings.length) {
    listEl.innerHTML =
      '<div class="text-center py-16 text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed border-gray-200">Список пуст</div>';
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // --- РАЗДЕЛЕНИЕ НА АУДИО И ВИДЕО ---
  const audioRecordings = recordings.filter((r) => r.duration > 0);
  const videoRecordings = recordings.filter((r) => r.duration === 0);

  let htmlContent = "";

  // 1. БЛОК АУДИО (Если есть)
  if (audioRecordings.length > 0) {
    const audioRows = audioRecordings
      .map((r, i) => {
        const isFav = favoriteRecordingIds.has(r.id);
        const isFullWork = r.composition.sort_order === 0;
        const compName = isFullWork
          ? getLocalizedText(r.composition.work, "name", lang)
          : getLocalizedText(r.composition, "title", lang);
        const compoName = getLocalizedText(
          r.composition.work.composer,
          "name",
          lang
        );
        const workName = getLocalizedText(r.composition.work, "name", lang);
        const cover =
          r.composition.cover_art_url ||
          r.composition.work.cover_art_url ||
          "/static/img/placeholder.png";
        const composerLink = `/composers/${
          r.composition.work.composer.slug || r.composition.work.composer.id
        }`;
        const workLink = `/works/${
          r.composition.work.slug || r.composition.work.id
        }`;
        const isSelected =
          window.state && window.state.selectedRecordingIds.has(r.id);
        const draggableAttr = options.isPlaylist ? 'draggable="true"' : "";
        const sortableClass = options.isPlaylist
          ? "playlist-sortable-item"
          : "";

        return `
          <div class="recording-item ${sortableClass} relative group flex items-center p-3 hover:bg-gray-50 ${
          isSelected ? "bg-cyan-50" : "border-b border-gray-100"
        } bg-white last:border-0 transition-colors cursor-pointer select-none first:rounded-t-xl last:rounded-b-xl" 
               ${draggableAttr}
               data-recording-id="${r.id}" data-index="${i}">
  
               <!-- 1. Чекбокс -->
               <div class="selection-checkbox-container w-10 justify-center items-center flex-shrink-0 transition-all ${
                 window.state?.isSelectionMode ? "flex" : "hidden md:flex"
               }">
                 <input type="checkbox" class="recording-checkbox w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer" data-id="${
                   r.id
                 }" ${isSelected ? "checked" : ""}>
               </div>
               ${!isLoggedIn() ? '<div class="hidden md:block w-2"></div>' : ""}
  
               <!-- 2. Play -->
               <div class="w-12 flex justify-center items-center text-cyan-600 recording-play-pause-btn hover:scale-110 transition-transform flex-shrink-0" id="list-play-btn-${
                 r.id
               }">
                    <i data-lucide="play" class="w-5 h-5 fill-current"></i>
               </div>
  
               <!-- 3. Обложка -->
                <div class="flex-shrink-0 mx-2 md:mx-4">
              <img src="${cover}" class="w-10 h-10 rounded-lg object-cover shadow-sm border border-gray-100" loading="lazy" alt="Обложка">
                </div>
  
               <!-- 4. Информация -->
               <div class="flex-1 min-w-0">
                   <div class="font-bold text-gray-800 text-sm leading-tight break-words">
                        ${compName}
                   </div>
                   <div class="text-xs text-gray-500 mt-0.5 break-words">
                      <span>${r.performers || "Исполнитель не указан"}</span>
                      ${
                        !hideComposer
                          ? `<span class="text-gray-300 mx-1">•</span><span>${compoName}</span>`
                          : ""
                      }
                   </div>
               </div>

               <!-- Колонки для ПК (скрыты на мобильном) -->
               ${
                 !hideComposer
                   ? `<div class="hidden lg:block w-1/4 text-sm text-gray-600 truncate mr-4"><a href="${composerLink}" data-navigo class="hover:text-cyan-600 hover:underline">${compoName}</a></div>`
                   : ""
               }
               ${
                 !hideWork
                   ? `<div class="hidden lg:block w-1/4 text-sm text-gray-500 truncate mr-4"><a href="${workLink}" data-navigo class="hover:text-cyan-600 hover:underline">${workName}</a></div>`
                   : ""
               }
  
               <!-- 5. Правая часть -->
               <div class="flex items-center ml-auto pl-3 flex-shrink-0 gap-3">
                    
                    <!-- === МОБИЛЬНАЯ СОРТИРОВКА (ТОЛЬКО В ПЛЕЙЛИСТЕ) === -->
                    ${
                      options.isPlaylist
                        ? `
                    <div class="flex flex-col gap-1 md:hidden mr-2">
                        <button class="sort-up-btn p-2 bg-gray-50 border border-gray-200 rounded shadow-sm text-gray-400 active:bg-cyan-50 active:text-cyan-600 active:border-cyan-200 transition-all" 
                                data-index="${i}">
                            <i data-lucide="chevron-up" class="w-4 h-4"></i>
                        </button>
                        <button class="sort-down-btn p-2 bg-gray-50 border border-gray-200 rounded shadow-sm text-gray-400 active:bg-cyan-50 active:text-cyan-600 active:border-cyan-200 transition-all" 
                                data-index="${i}">
                            <i data-lucide="chevron-down" class="w-4 h-4"></i>
                        </button>
                    </div>
                    `
                        : ""
                    }
                    <!-- ================================================ -->

                    <div class="hidden md:flex items-center">
                        ${
                          isLoggedIn()
                            ? `
                            <button class="favorite-btn p-2 mr-2 ${
                              isFav
                                ? "text-red-500"
                                : "text-gray-300 hover:text-red-400"
                            }" data-recording-id="${r.id}">
                                <i data-lucide="heart" class="w-4 h-4 ${
                                  isFav ? "fill-current" : ""
                                }"></i>
                            </button>`
                            : '<div class="w-10"></div>'
                        }
                    </div>
                   <div class="text-xs text-gray-500 font-mono w-10 text-right">${formatDuration(
                     r.duration
                   )}</div>
               </div>
          </div>`;
      })
      .join("");

    htmlContent += `
      <div class="mb-10">
          <h3 class="text-lg font-bold mb-4 text-gray-700 flex items-center gap-2"><i data-lucide="disc" class="w-5 h-5 text-cyan-600"></i> Аудиозаписи</h3>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100">${audioRows}</div>
      </div>`;
  }

  // 2. БЛОК ВИДЕО
  if (videoRecordings.length > 0) {
    const videoRows = videoRecordings
      .map((r) => {
        const compName = getLocalizedText(r.composition, "title", lang);
        const workName = getLocalizedText(r.composition.work, "name", lang);
        const composerName = getLocalizedText(
          r.composition.work.composer,
          "name",
          lang
        );

        const controls = isAdmin()
          ? `
          <div class="flex items-center gap-2 ml-2 border-l border-gray-200 pl-2 flex-shrink-0">
              <span class="text-[10px] text-gray-300 font-mono select-all cursor-copy hover:text-cyan-600 transition-colors" title="ID записи">#${r.id}</span>
              <button class="edit-video-btn p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors" data-recording-id="${r.id}" title="Редактировать">
                  <i data-lucide="edit-2" class="w-4 h-4"></i>
              </button>
              <button class="delete-video-btn p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" data-recording-id="${r.id}" title="Удалить">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
          </div>
        `
          : "";

        return `
        <div class="bg-white p-4 rounded-xl border border-gray-100 hover:border-red-200 hover:shadow-md transition-all flex items-start justify-between group">
             <div class="flex items-start gap-4 min-w-0">
                 <div class="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 mt-1">
                     <i data-lucide="youtube" class="w-6 h-6"></i>
                 </div>
                 <div class="min-w-0">
                     <div class="font-bold text-gray-800 mb-0.5">${compName}</div>
                     <div class="text-xs text-gray-500 leading-snug">
                          <span class="font-semibold text-gray-700">${composerName}</span> • 
                          ${
                            r.performers || "Исполнитель не указан"
                          } • ${workName}
                     </div>
                 </div>
             </div>
             
             <div class="flex items-center flex-shrink-0 ml-6">
                 <a href="${
                   r.youtube_url
                 }" target="_blank" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap">
                     <span>Смотреть</span> <i data-lucide="external-link" class="w-4 h-4"></i>
                 </a>
                 ${controls}
             </div>
        </div>`;
      })
      .join("");

    htmlContent += `
      <div>
          <h3 class="text-lg font-bold mb-4 text-gray-700 flex items-center gap-2"><i data-lucide="video" class="w-5 h-5 text-red-600"></i> Видеозаписи</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${videoRows}</div>
      </div>`;
  }

  listEl.innerHTML = `<div class="max-w-7xl mx-auto px-6">${htmlContent}</div>`;
  if (window.lucide) window.lucide.createIcons();
}

// --- 3. RENDER COMPOSERS LIST ---
export function renderComposerList(
  allComposers,
  activeLetter = "Все",
  lang = "ru"
) {
  const { listEl } = getElements();

  // --- ШАПКА СТРАНИЦЫ (без изменений) ---
  const viewTitle = document.getElementById("view-title-container");
  viewTitle.classList.remove("hidden");

  const addBtn = isAdmin()
    ? `<button id="add-composer-btn" class="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 transition-all text-sm font-bold whitespace-nowrap">
               <i data-lucide="plus" class="w-4 h-4"></i> <span>Добавить</span>
           </button>`
    : "";

  viewTitle.innerHTML = `
      <div class="w-full mb-8 border-b border-gray-200 pb-4 flex items-center justify-between gap-4">
          <h2 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <i data-lucide="users" class="w-8 h-8 text-cyan-600"></i>
              <span>Композиторы</span>
          </h2>
          <div>${addBtn}</div>
      </div>
  `;

  // --- НОВЫЙ БЛОК: АЛФАВИТНЫЙ УКАЗАТЕЛЬ ---
  const alphabet = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ".split("");

  const alphabetHtml = `
    <div class="mb-8 flex flex-wrap gap-2 justify-center">
      <button data-letter="Все" class="alphabet-btn px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
        activeLetter === "Все"
          ? "bg-cyan-600 text-white shadow-sm"
          : "bg-white text-gray-700 hover:bg-gray-100 border"
      }">
        Все
      </button>
      ${alphabet
        .map(
          (letter) => `
        <button data-letter="${letter}" class="alphabet-btn w-10 h-10 rounded-lg text-sm font-bold transition-colors ${
            activeLetter === letter
              ? "bg-cyan-600 text-white shadow-sm"
              : "bg-white text-gray-700 hover:bg-gray-100 border"
          }">
          ${letter}
        </button>
      `
        )
        .join("")}
    </div>
  `;

  // --- ФИЛЬТРАЦИЯ И РЕНДЕР КАРТОЧЕК ---
  const filteredComposers =
    activeLetter === "Все"
      ? allComposers
      : allComposers.filter((c) =>
          c.name_ru.toUpperCase().startsWith(activeLetter)
        );

  let cardsHtml = "";
  if (filteredComposers.length > 0) {
    cardsHtml = filteredComposers
      .map((c) => {
        const years = formatYearRange(c.year_born, c.year_died);
        const yearsBadge = years
          ? `<p class="text-xs text-gray-500 mt-1 font-medium bg-gray-100 inline-block px-2 py-0.5 rounded-full border border-gray-200">${years}</p>`
          : "";

        return `
          <a href="/composers/${c.slug || c.id}" data-navigo
             class="bg-white rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all flex items-center gap-4 border border-gray-100 hover:border-cyan-200 group animate-fade-in">
              <img src="${
                c.portrait_url || "/static/img/placeholder.png"
              }" class="w-16 h-16 rounded-full object-cover border-2 border-gray-100 group-hover:border-cyan-100 transition-colors shadow-sm flex-shrink-0" loading="lazy" alt="Портрет ${getLocalizedText(
          c,
          "name",
          lang
        )}">
              <div class="min-w-0">
                <h3 class="font-bold text-gray-800 group-hover:text-cyan-600 transition-colors truncate">${getLocalizedText(
                  c,
                  "name",
                  lang
                )}</h3>
                ${yearsBadge}
            </div>
        </a>
    `;
      })
      .join("");
  } else {
    cardsHtml = `<div class="md:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-10 text-gray-500">Композиторы на букву "${activeLetter}" не найдены.</div>`;
  }

  // --- СБОРКА ИТОГОВОГО HTML ---
  listEl.innerHTML = `
      <div class="max-w-7xl mx-auto px-6 pb-10">
          ${alphabetHtml}
          <div id="composers-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              ${cardsHtml}
          </div>
      </div>
    `;

  if (window.lucide) window.lucide.createIcons();
}

// --- 4. RENDER WORK LIST (ПРОФИЛЬ КОМПОЗИТОРА) ---
export function renderWorkList(works, composer, lang = "ru") {
  const { listEl } = getElements();
  document.getElementById("view-title-container").classList.add("hidden");

  const nameRu = composer.name_ru;
  const nameOrig = composer.original_name;

  const originalNameHtml = nameOrig
    ? `<div class="text-gray-400 text-lg font-medium mt-1">${nameOrig}</div>`
    : "";

  const actionsBar = isAdmin()
    ? `
      <div class="mt-6 flex flex-wrap gap-3">
           <button id="add-work-btn" class="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm flex items-center gap-2">
              <i data-lucide="plus" class="w-4 h-4"></i> <span>Произведение</span>
           </button>
           <button id="edit-composer-btn" class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2">
              <i data-lucide="edit-2" class="w-4 h-4"></i> <span>Редактировать</span>
           </button>
           <button id="delete-composer-btn" class="bg-white border border-red-200 text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors" title="Удалить">
              <i data-lucide="trash-2" class="w-5 h-5"></i>
           </button>
      </div>
  `
    : "";

  // 2. ФОРМИРУЕМ ШАПКУ
  const bgImage = composer.portrait_url || "/static/img/placeholder.png";

  const header = `
        <div class="relative overflow-hidden rounded-3xl shadow-xl border border-gray-100 mb-8 group">
            <div class="absolute inset-0 z-0 pointer-events-none">
                <div class="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-125 transition-transform duration-[2000ms] group-hover:scale-110"
                     style="background-image: url('${bgImage}')"></div>
                <div class="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/20"></div>
            </div>

            <div class="relative z-10 p-8 flex flex-col md:flex-row gap-8 items-start">
            <div class="flex-shrink-0">
                <img src="${bgImage}"
                     class="w-40 h-40 md:w-48 md:h-48 rounded-2xl object-cover shadow-2xl transform group-hover:scale-105 transition-transform duration-500" loading="lazy" alt="Портрет ${getLocalizedText(
                       composer,
                       "name",
                       lang
                     )}">
            </div>

                <div class="flex-1 w-full text-left pt-2">
                    <div>
                         <h1 class="text-4xl md:text-5xl font-black text-gray-900 leading-tight tracking-tight mb-1">${nameRu}</h1>
                         ${originalNameHtml}
                    </div>

                    <p class="text-gray-600 text-xl font-medium mt-3 flex items-center gap-2">
                        <span class="bg-white/50 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/20">
                            ${formatYearRange(
                              composer.year_born,
                              composer.year_died
                            )}
                        </span>
                    </p>

                    ${actionsBar}
                </div>
            </div>
        </div>
    `;

  // БИОГРАФИЯ
  let bioHtml = "";
  const hasBio =
    composer.notes && composer.notes.replace(/<[^>]*>/g, "").trim().length > 0;

  if (hasBio) {
    bioHtml = `
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-10 relative group/bio">
          <div class="bio-content prose prose-cyan max-w-none text-gray-600 leading-relaxed max-h-60 overflow-hidden transition-[max-height] duration-500 ease-in-out" data-expanded="false">
              ${composer.notes}
          </div>
          <div class="bio-gradient absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/90 to-transparent rounded-b-2xl pointer-events-none"></div>

          <div class="flex justify-center mt-4 absolute bottom-4 left-0 right-0 z-10">
              <button class="bio-toggle-btn px-6 py-2 bg-white border border-gray-200 text-cyan-600 font-bold rounded-full shadow-sm hover:shadow-md hover:bg-cyan-50 transition-all flex items-center gap-2 text-sm">
                  <span class="btn-text">Читать далее</span> <i data-lucide="chevron-down" class="w-4 h-4 transition-transform duration-300"></i>
              </button>
          </div>
      </div>`;
  }

  // 3. ФОРМИРУЕМ СПИСОК
  let content = "";

  if (!works || works.length === 0) {
    content =
      '<div class="text-left text-gray-500 italic bg-gray-50 p-8 rounded-xl border border-dashed border-gray-300">Произведения пока не добавлены.</div>';
  } else {
    // --- ШАГ A: Группируем произведения ---
    const groups = {};
    const uncategorizedKey = "OTHER";

    works.forEach((w) => {
      if (w.name === "Без сборника") return;

      const key = w.genre ? w.genre.name : uncategorizedKey;

      if (!groups[key]) groups[key] = [];
      groups[key].push(w);
    });

    // --- ШАГ B: Определяем порядок вывода групп ---
    const priorityOrder = [
      "Symphony",
      "Opera",
      "Ballet",
      "Concerto",
      "Sonata",
      "Suite",
      "Chamber",
      "Vocal",
    ];

    let sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === uncategorizedKey) return 1;
      if (b === uncategorizedKey) return -1;
      const idxA = priorityOrder.indexOf(a);
      const idxB = priorityOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    // --- ШАГ C: Генерируем HTML для каждой группы ---
    sortedKeys.forEach((genreKey) => {
      const groupWorks = groups[genreKey];

      let groupTitle = "";
      if (genreKey === uncategorizedKey) {
        if (sortedKeys.length > 1) groupTitle = "Другие произведения";
      } else {
        groupTitle = genreKey;
      }

      const cardsHtml = groupWorks
        .map((w) => {
          const cover = w.cover_art_url || "/static/img/placeholder.png";
          const link = `/works/${w.slug || w.id}`;
          const metaText = [w.tonality, w.catalog_number]
            .filter(Boolean)
            .join(" • ");

          return `
            <a href="${link}" data-navigo
               class="bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-cyan-400 hover:shadow-lg transition-all group flex flex-col h-full"
               title="${w.original_name || ""}">
                <div class="aspect-square bg-gray-100 relative overflow-hidden">
                    <img src="${cover}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" alt="Обложка ${getLocalizedText(
            w,
            "name",
            lang
          )}">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                            <span class="text-white text-sm font-bold flex items-center gap-1"><i data-lucide="corner-down-right" class="w-4 h-4"></i> Открыть</span>
                        </div>
                    </div>
                    <div class="p-4 flex-1 flex flex-col text-left">
                        <h4 class="font-bold text-gray-800 text-sm line-clamp-2 group-hover:text-cyan-600 transition-colors mb-1">${getLocalizedText(
                          w,
                          "name",
                          lang
                        )}</h4>
                        ${
                          metaText
                            ? `<p class="text-xs text-gray-500 mb-2 font-medium">${metaText}</p>`
                            : ""
                        }
                        <p class="text-xs text-gray-400 mt-auto pt-2 border-t border-gray-50 flex justify-between">
                            <span>${formatYearRange(
                              w.publication_year,
                              w.publication_year_end
                            )}</span>
                            <span class="text-cyan-600 font-medium">${
                              w.compositions ? w.compositions.length : 0
                            } ${pluralize(
            w.compositions ? w.compositions.length : 0,
            ["часть", "части", "частей"]
          )}</span>
                        </p>
                    </div>
                </a>
            `;
        })
        .join("");

      content += `
            <div class="mb-10 last:mb-0">
                ${
                  groupTitle
                    ? `<h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 px-1"><span class="bg-cyan-100 text-cyan-700 px-3 py-1 rounded-lg text-sm uppercase tracking-wider">${groupTitle}</span> <span class="text-gray-400 text-sm font-normal ml-auto">${groupWorks.length}</span></h3>`
                    : ""
                }
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                    ${cardsHtml}
                </div>
            </div>
        `;
    });
  }

  // 4. СОБИРАЕМ ВСЁ ВМЕСТЕ
  listEl.innerHTML = `
      <div class="max-w-7xl mx-auto px-6 pb-16">
          ${header}
          ${bioHtml}

          <!-- Общий заголовок раздела (если нужен) -->
          <div class="border-b border-gray-200 pb-4 mb-6 mt-8">
              <h3 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <i data-lucide="book-open" class="w-6 h-6 text-cyan-600"></i>
                  <span>Каталог произведений</span>
              </h3>
          </div>

          ${content}
      </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

// --- 5. RENDER COMPOSITION GRID (СТРАНИЦА ПРОИЗВЕДЕНИЯ) ---
export async function renderCompositionGrid(work, lang = "ru") {
  const { listEl } = getElements();
  document.getElementById("view-title-container").classList.add("hidden");

  // --- 1. ШАПКА ---
  const nameRu = work.name_ru;
  const nameOrig = work.original_name;

  let catalogHtml = "";
  if (work.is_no_catalog) {
    catalogHtml = `<span class="text-gray-400 text-lg font-normal ml-3 px-2 py-0.5 bg-gray-50 rounded-md border border-gray-100" title="Без номера по каталогу">б/н</span>`;
  } else if (work.catalog_number) {
    catalogHtml = `<span class="text-gray-500 text-lg font-normal ml-3 px-2 py-0.5 bg-gray-100 rounded-md border border-gray-200">${work.catalog_number}</span>`;
  }

  const genreName = work.genre ? work.genre.name : null;
  const genreBadge = genreName
    ? `<span class="text-xs font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-1 rounded border border-cyan-100 align-middle">${genreName}</span>`
    : `<span class="text-xs text-cyan-600 font-bold uppercase tracking-wider mb-1">Произведение</span>`;

  let subInfo = [];
  if (work.nickname)
    subInfo.push(
      `<span class="font-bold text-gray-700">${work.nickname}</span>`
    );
  if (work.tonality)
    subInfo.push(`<span class="text-gray-600">${work.tonality}</span>`);
  const subInfoHtml =
    subInfo.length > 0
      ? `<div class="mt-2 text-lg">${subInfo.join(
          " <span class='text-gray-300 mx-2'>|</span> "
        )}</div>`
      : "";

  const originalNameHtml = nameOrig
    ? `<div class="text-gray-400 text-sm font-medium mt-1">${nameOrig}</div>`
    : "";

  const composerLink = `/composers/${work.composer.slug || work.composer.id}`;

  // === 1. Проверяем, есть ли что играть ===
  const hasPlayableRecordings = work.compositions.some(
    (comp) => comp.recordings && comp.recordings.some((r) => r.duration > 0)
  );

  // === 2. Создаем HTML для кнопки, если есть что играть ===
  const playButton = hasPlayableRecordings
    ? `
    <button id="work-play-all-btn" class="bg-cyan-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-cyan-700 transition-colors shadow-sm flex items-center gap-2">
        <i data-lucide="play" class="w-5 h-5"></i> <span>Слушать всё</span>
    </button>
  `
    : "";

  // === 3. Собираем все кнопки вместе ===
  const allControls = `
    <div class="flex flex-wrap gap-3 mt-6 md:mt-0 w-full md:w-auto">
        ${playButton}
        ${
          isAdmin()
            ? `
            <button id="add-work-video-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2 text-sm">
                <i data-lucide="youtube" class="w-5 h-5"></i> <span>Видео</span>
            </button>
            <button id="add-work-audio-btn" class="bg-cyan-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-cyan-700 transition-colors shadow-sm flex items-center gap-2 text-sm">
                <i data-lucide="upload-cloud" class="w-5 h-5"></i> <span>Аудио</span>
            </button>
            
            <div class="w-px h-8 bg-gray-300 mx-1"></div>

            <button id="add-composition-btn" class="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> <span>Часть</span>
            </button>
            <button id="edit-work-btn" class="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors" title="Редактировать">
                <i data-lucide="edit-2" class="w-5 h-5"></i>
            </button>
            <button id="delete-work-btn" class="border border-red-200 text-red-500 px-3 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors" title="Удалить">
                <i data-lucide="trash-2" class="w-5 h-5"></i>
            </button>
        `
            : ""
        }
    </div>`;

  const bgImage = work.cover_art_url || "/static/img/placeholder.png";

  const header = `
        <div class="relative overflow-hidden rounded-3xl shadow-xl border border-gray-100 mb-8 group">
            <div class="absolute inset-0 z-0 pointer-events-none">
                <div class="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-125 transition-transform duration-[2000ms] group-hover:scale-110"
                     style="background-image: url('${bgImage}')"></div>
                <div class="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-white/30"></div>
            </div>

            <div class="relative z-10 p-8 flex flex-col md:flex-row gap-8 items-start">
                <div class="flex-shrink-0 relative">
                    <img src="${bgImage}" class="w-40 h-40 md:w-48 md:h-48 rounded-2xl shadow-2xl object-cover transform group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 rounded-2xl ring-1 ring-black/5"></div>
                </div>

                <div class="flex-1 w-full pt-1 flex flex-col">
                    <div class="mb-3 flex items-center gap-2">
                        ${genreBadge}
                    </div>

                    <div class="flex flex-wrap items-baseline gap-2 mb-1">
                        <h1 class="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight">${nameRu}</h1>
                        ${catalogHtml}
                    </div>

                    ${originalNameHtml}
                    ${subInfoHtml}

                    <div class="mt-5 mb-2">
                        <a href="${composerLink}" data-navigo class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 hover:bg-white hover:shadow-md border border-gray-100 transition-all text-gray-700 font-bold group/link">
                            <div class="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                                <img src="${
                                  work.composer.portrait_url ||
                                  "/static/img/placeholder.png"
                                }" class="w-full h-full object-cover">
                            </div>
                            <span>${getLocalizedText(
                              work.composer,
                              "name",
                              lang
                            )}</span>
                            <i data-lucide="chevron-right" class="w-4 h-4 text-gray-400 group-hover/link:text-cyan-600"></i>
                        </a>
                    </div>

                    <div class="mt-4">
                        ${allControls}
                    </div>
                </div>
            </div>
        </div>
    `;

  let historyHtml = "";
  const hasNotes =
    work.notes && work.notes.replace(/<[^>]*>/g, "").trim().length > 0;

  if (hasNotes) {
    historyHtml = `
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-10 group/bio">
          <div class="relative">
              <div class="bio-content prose prose-cyan max-w-none text-gray-600 leading-relaxed max-h-60 overflow-hidden transition-all duration-500 ease-in-out" data-expanded="false">
                  ${work.notes}
              </div>
              <div class="bio-gradient absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"></div>
          </div>
          <div class="flex justify-center -mt-4 relative z-10">
              <button class="bio-toggle-btn px-6 py-2 bg-white border border-gray-200 text-cyan-600 font-bold rounded-full shadow-sm hover:shadow-md hover:bg-cyan-50 transition-all flex items-center gap-2 text-sm">
                  <span class="btn-text">Читать далее</span> <i data-lucide="chevron-down" class="w-4 h-4 transition-transform duration-300"></i>
              </button>
          </div>
      </div>`;
  }

  // === 2. РАЗДЕЛЕНИЕ КОНТЕНТА ===
  const allComps = work.compositions || [];

  let fullWorkComp = allComps.find((c) => c.sort_order === 0);

  let showPlayerBlock = false;
  let recs = [];

  let candidateForSingle =
    !fullWorkComp && allComps.length === 1 ? allComps[0] : null;

  const targetComp = fullWorkComp || candidateForSingle;

  if (targetComp) {
    try {
      recs = await window.apiRequest(
        `/api/recordings/compositions/${targetComp.id}/recordings`
      );
      if (recs.length > 0) {
        showPlayerBlock = true;
        window.state.currentViewRecordings = recs;
      }
    } catch (e) {
      console.error(e);
    }
  }

  const hidePartsList = candidateForSingle && showPlayerBlock;

  const movementParts = hidePartsList
    ? []
    : allComps
        .filter((c) => c.sort_order !== 0)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  let audioHtml = "";
  let videoHtml = "";

  // --- БЛОК "ИСПОЛНЕНИЯ ЦЕЛИКОМ" ---
  if (showPlayerBlock) {
    const audioRecs = recs.filter((r) => r.duration > 0);
    const videoRecs = recs.filter((r) => r.duration === 0);

    // 1. БЛОК АУДИО
    if (audioRecs.length > 0) {
      const rows = audioRecs
        .map((r, i) => {
          const isFav = window.state.favoriteRecordingIds.has(r.id);
          const isSelected = window.state.selectedRecordingIds.has(r.id);

          return `
              <div class="recording-item group flex items-center p-3 hover:bg-cyan-50 ${
                isSelected ? "bg-cyan-50" : "border-b border-gray-100"
              } bg-white last:border-0 transition-colors cursor-pointer select-none"
                  data-recording-id="${r.id}" data-index="${i}">
                  
                  <div class="selection-checkbox-container w-10 justify-center items-center flex-shrink-0 transition-all ${
                    window.state?.isSelectionMode ? "flex" : "hidden md:flex"
                  }">
                    <input type="checkbox" class="recording-checkbox w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer" data-id="${
                      r.id
                    }" ${isSelected ? "checked" : ""}>
                  </div>
                  ${
                    !isLoggedIn()
                      ? '<div class="hidden md:block w-2"></div>'
                      : ""
                  }
    
                  <div class="w-12 flex justify-center items-center text-cyan-600 recording-play-pause-btn hover:scale-110 transition-transform flex-shrink-0" id="list-play-btn-${
                    r.id
                  }">
                     <i data-lucide="play" class="w-5 h-5 fill-current"></i>
                  </div>

                  <div class="flex-1 min-w-0 ml-4">
                      <div class="font-bold text-gray-800 text-sm leading-tight break-words">
                         ${r.performers || "Исполнитель не указан"}
                      </div>
                      <div class="text-xs text-gray-500 mt-0.5 break-words">
                         ${r.recording_year || "Год не указан"}
                      </div>
                  </div>
    
                  <div class="flex items-center ml-auto pl-3 flex-shrink-0">
                    <div class="hidden md:flex items-center">
                      ${
                        isLoggedIn()
                          ? `
                        <button class="favorite-btn p-2 mr-2 ${
                          isFav
                            ? "text-red-500"
                            : "text-gray-300 hover:text-red-400"
                        }" data-recording-id="${r.id}">
                           <i data-lucide="heart" class="w-5 h-5 ${
                             isFav ? "fill-current" : ""
                           }"></i>
                       </button>`
                          : '<div class="w-10"></div>'
                      }
                    </div>
                    <div class="text-xs text-gray-500 font-mono w-10 text-right">${formatDuration(
                      r.duration
                    )}</div>
                  </div>
              </div>`;
        })
        .join("");

      audioHtml = `
         <div class="mb-10">
             <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><i data-lucide="disc" class="w-5 h-5 text-cyan-600"></i> Аудиозаписи ${
               hidePartsList ? "" : "(Целиком)"
             }</h3>
             <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                 ${rows}
             </div>
         </div>`;
    }

    // 2. БЛОК ВИДЕО
    if (videoRecs.length > 0) {
      const rows = videoRecs
        .map((r) => {
          const controls = isAdmin()
            ? `
             <div class="flex items-center gap-2 border-l border-gray-200 pl-2 ml-2 sm:ml-0 flex-shrink-0">
                 <button class="edit-video-btn p-2 text-gray-400 hover:text-cyan-600 bg-gray-50 rounded-lg" data-recording-id="${r.id}"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                 <button class="delete-video-btn p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg" data-recording-id="${r.id}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
             </div>`
            : "";

          return `
          <div class="bg-white p-3 rounded-xl border border-gray-100 mb-3 shadow-sm hover:shadow-md transition-all">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                  <div class="flex items-start gap-3 min-w-0 w-full">
                      <div class="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 mt-1 sm:mt-0">
                          <i data-lucide="youtube" class="w-5 h-5"></i>
                      </div>
                      <div class="min-w-0 flex-1">
                          <div class="font-bold text-gray-800 text-sm sm:text-lg leading-snug break-words">${
                            r.performers || "Исполнитель не указан"
                          }</div>
                          <div class="text-xs text-gray-400 mt-0.5">${
                            r.recording_year || "Год не указан"
                          }</div>
                      </div>
                  </div>

                  <div class="flex items-center w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-gray-100 mt-1 sm:mt-0">
                      <a href="${r.youtube_url}" target="_blank"
                         class="flex-1 sm:flex-none justify-center px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm whitespace-nowrap">
                          <span>Смотреть</span> <i data-lucide="external-link" class="w-4 h-4"></i>
                      </a>
                      ${controls}
                  </div>
              </div>
          </div>`;
        })
        .join("");

      videoHtml = `
         <div class="mb-10">
             <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i data-lucide="video" class="w-5 h-5 text-red-600"></i>
                Видеозаписи ${hidePartsList ? "" : "(Целиком)"}
             </h3>
             <div class="space-y-2">
                 ${rows}
             </div>
         </div>`;
    }
  }

  // --- БЛОК "СПИСОК ЧАСТЕЙ" ---
  let partsListHtml = "";
  if (movementParts.length > 0) {
    const list = movementParts
      .map((c, index) => {
        // <--- Важно: добавлен index
        const metaParts = [];
        if (c.tonality)
          metaParts.push(
            `<span class="font-medium text-gray-600">${c.tonality}</span>`
          );
        if (c.is_no_catalog) {
          metaParts.push(`<span class="text-gray-400">б/н</span>`);
        } else if (c.catalog_number) {
          metaParts.push(`<span>${c.catalog_number}</span>`);
        }
        if (c.composition_year)
          metaParts.push(`<span>${c.composition_year}</span>`);

        const metaHtml =
          metaParts.length > 0
            ? `<div class="text-xs text-gray-400 mt-1 flex gap-2 items-center">${metaParts.join(
                '<span class="text-gray-300">•</span>'
              )}</div>`
            : "";

        let iconsHtml = "";
        if (c.has_audio)
          iconsHtml += `<i data-lucide="disc" class="w-5 h-5 text-cyan-500" title="Есть аудиозаписи"></i>`;
        if (c.has_video)
          iconsHtml += `<i data-lucide="youtube" class="w-5 h-5 text-red-500" title="Есть видеозаписи"></i>`;

        const iconsContainer = iconsHtml
          ? `<div class="flex items-center gap-2 ml-4">${iconsHtml}</div>`
          : "";

        const isUserAdmin = isAdmin();
        const draggableAttr = isUserAdmin ? 'draggable="true"' : "";
        const cursorClass = "cursor-pointer"; // Палец для всех

        // !!! ИСПРАВЛЕНИЕ 1: Скрываем шесть точек на мобильных (hidden md:block)
        const gripIcon = isUserAdmin
          ? `<i data-lucide="grip-vertical" class="w-5 h-5 text-gray-300 group-hover:text-cyan-500 ml-4 hidden md:block"></i>`
          : ``;

        // Кнопки для мобильной сортировки
        const sortButtons = isUserAdmin
          ? `
          <div class="flex flex-col gap-1 md:hidden ml-3 border-l border-gray-100 pl-3">
              <button class="comp-sort-up-btn p-2 bg-gray-50 border border-gray-200 rounded shadow-sm text-gray-400 active:bg-cyan-50 active:text-cyan-600 active:border-cyan-200 transition-all" 
                      data-index="${index}">
                  <i data-lucide="chevron-up" class="w-4 h-4"></i>
              </button>
              <button class="comp-sort-down-btn p-2 bg-gray-50 border border-gray-200 rounded shadow-sm text-gray-400 active:bg-cyan-50 active:text-cyan-600 active:border-cyan-200 transition-all" 
                      data-index="${index}">
                  <i data-lucide="chevron-down" class="w-4 h-4"></i>
              </button>
          </div>
      `
          : "";

        // !!! ИСПРАВЛЕНИЕ 2: Меняем структуру. Главный тег - DIV, ссылка только на тексте.
        return `
        <div ${draggableAttr} data-comp-id="${c.id}"
           class="comp-sortable-item flex items-center p-3 bg-white border border-gray-100 rounded-xl hover:border-cyan-300 hover:shadow-md transition-all group mb-3 ${cursorClass}">

            <!-- Номер (часть ссылки) -->
            <a href="/compositions/${
              c.slug || c.id
            }" data-navigo class="comp-sort-number w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition-colors font-bold text-sm flex-shrink-0 mr-3 block">
                ${c.sort_order || "#"}
            </a>

            <!-- Текст (Основная ссылка) -->
            <a href="/compositions/${
              c.slug || c.id
            }" data-navigo class="flex-1 min-w-0 mr-2 block">
                <div class="font-semibold text-gray-800 group-hover:text-cyan-700 transition-colors break-words leading-tight">
                    ${getLocalizedText(c, "title", lang)}
                </div>
                <div class="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-2 gap-y-1 items-center">
                    ${metaHtml}
                </div>
            </a>

            <!-- Иконки и действия (Вне ссылки!) -->
            <div class="flex items-center flex-shrink-0">
                ${iconsContainer}
                ${gripIcon} <!-- Теперь скрыт на мобильных -->
                ${sortButtons} <!-- Кнопки теперь работают корректно -->
            </div>
        </div>
    `;
      })
      .join("");

    partsListHtml = `<div class="mb-10"><h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><i data-lucide="list-music" class="w-5 h-5 text-cyan-600"></i> Части произведения</h3>${list}</div>`;
  }

  // Если совсем пусто
  let emptyHtml = "";
  if (!showPlayerBlock && movementParts.length === 0) {
    emptyHtml = `<div class="text-center text-gray-500 italic py-12 bg-gray-50 rounded-xl mt-8 border-2 border-dashed border-gray-200">
        Произведение пустое. <br>Загрузите запись (будет создана запись целиком) или добавьте части вручную.
      </div>`;
  }

  listEl.innerHTML = `<div class="max-w-7xl mx-auto px-6 pb-10">${header}${historyHtml}${audioHtml}${videoHtml}${partsListHtml}${emptyHtml}</div>`;
  if (window.lucide) window.lucide.createIcons();
}

// --- 6. RENDER COMPOSITION DETAIL (СТРАНИЦА ЧАСТИ + ЗАПИСИ) ---
export function renderCompositionDetailView(
  composition,
  recordings,
  favs,
  lang = "ru"
) {
  const { listEl } = getElements();
  document.getElementById("view-title-container").classList.add("hidden");

  const titleRu = composition.title_ru;
  const titleOrig = composition.title_original;
  const work = composition.work;

  let effectiveCatalog = "";
  if (composition.is_no_catalog) {
    effectiveCatalog = "б/н";
  } else if (composition.catalog_number) {
    effectiveCatalog = composition.catalog_number;
  } else {
    effectiveCatalog = work.is_no_catalog ? "б/н" : work.catalog_number;
  }

  let metaParts = [];

  if (composition.tonality) {
    metaParts.push(
      `<span class="font-medium text-gray-700">${composition.tonality}</span>`
    );
  }

  if (effectiveCatalog) {
    metaParts.push(`<span>${effectiveCatalog}</span>`);
  }

  if (composition.composition_year) {
    metaParts.push(`<span>${composition.composition_year}</span>`);
  }

  const metaHtml =
    metaParts.length > 0
      ? `<div class="text-lg text-gray-500 mt-2 flex items-center gap-2">${metaParts.join(
          '<span class="text-gray-300 mx-1">•</span>'
        )}</div>`
      : "";

  const originalNameHtml = titleOrig
    ? `<div class="text-gray-400 text-sm font-medium mt-1">${titleOrig}</div>`
    : "";

  const workLink = `/works/${work.slug || work.id}`;

  const bgImage =
    composition.cover_art_url ||
    work.cover_art_url ||
    "/static/img/placeholder.png";

  const header = `
        <div class="max-w-7xl mx-auto px-6 pt-6 pb-8">
            <div class="relative overflow-hidden rounded-3xl shadow-xl border border-gray-100 mb-8 group">
                <!-- === ФОН === -->
                <div class="absolute inset-0 z-0 pointer-events-none">
                    <div class="absolute inset-0 bg-cover bg-center blur-2xl opacity-30 scale-125"
                         style="background-image: url('${bgImage}')"></div>
                    <div class="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/40"></div>
                </div>

                <!-- === КОНТЕНТ === -->
                <div class="relative z-10 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <div class="flex-1">
                        <div class="mb-4">
                            <a href="${workLink}" data-navigo class="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/50 hover:bg-white text-xs font-bold text-cyan-700 uppercase tracking-wider transition-all shadow-sm hover:shadow border border-cyan-100/50">
                                <i data-lucide="arrow-left" class="w-3 h-3"></i>
                                ${getLocalizedText(work, "name", lang)}
                            </a>
                        </div>

                        <div>
                            <h1 class="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-1">${titleRu}</h1>
                            ${originalNameHtml}
                        </div>

                        ${metaHtml}

                        <div class="inline-flex items-center gap-2 mt-5 px-4 py-2 bg-white/60 backdrop-blur-md rounded-xl border border-white/20 text-gray-600 text-sm font-medium shadow-sm">
                            <i data-lucide="disc" class="w-4 h-4 text-cyan-600"></i>
                            <span>Исполнений: <b class="text-gray-900">${
                              recordings ? recordings.length : 0
                            }</b></span>
                        </div>

                        ${
                          isAdmin()
                            ? `
                          <div class="mt-4">
    <div class="inline-flex gap-2 bg-white/50 p-2 rounded-2xl backdrop-blur-sm border border-white/20 shadow-inner">
        <button id="delete-composition-btn" class="p-3 bg-white border border-red-100 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shadow-sm" title="Удалить часть">
            <i data-lucide="trash-2" class="w-5 h-5"></i>
        </button>
        <button id="edit-composition-btn" class="p-3 md:px-5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-bold rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2">
            <i data-lucide="edit-2" class="w-5 h-5"></i> <span class="hidden md:inline">Редактировать</span>
        </button>
        <button id="add-video-btn" class="p-3 md:px-5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200/50 transition-all flex items-center justify-center gap-2 text-sm">
            <i data-lucide="youtube" class="w-5 h-5"></i> <span class="hidden md:inline">Видео</span>
        </button>
        <button id="add-audio-btn" class="p-3 md:px-5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 text-sm">
            <i data-lucide="upload-cloud" class="w-5 h-5"></i> <span class="hidden md:inline">Аудио</span>
        </button>
    </div>
</div>`
                            : ""
                        }
                    </div>
                </div>
        </div>
    `;

  listEl.innerHTML = header;
  const listContainer = document.createElement("div");
  listEl.appendChild(listContainer);

  if (!recordings || recordings.length === 0) {
    listContainer.innerHTML = `
            <div class="max-w-7xl mx-auto px-6">
                <div class="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <i data-lucide="music" class="w-12 h-12 text-gray-300 mx-auto mb-3"></i>
                    <h3 class="text-lg font-medium text-gray-900">Нет записей</h3>
                    <p class="text-gray-500 mb-6">Загрузите первое исполнение (аудио или видео)</p>
                </div>
            </div>`;
  } else {
    const audioRecs = recordings.filter((r) => r.duration > 0);
    const videoRecs = recordings.filter((r) => r.duration === 0);
    let finalHtml = "";

    // 1. АУДИО
    if (audioRecs.length > 0) {
      const rows = audioRecs
        .map((r, i) => {
          const isFav = favs.has(r.id);
          const isSelected =
            window.state && window.state.selectedRecordingIds.has(r.id);

          return `
            <div class="recording-item group flex items-center p-3 hover:bg-gray-50 ${
              isSelected ? "bg-cyan-50" : "border-b border-gray-100"
            } bg-white last:border-0 transition-colors cursor-pointer relative select-none"
                 data-recording-id="${r.id}" data-index="${i}">

                 <!-- 1. Чекбокс -->
                 <div class="selection-checkbox-container w-10 justify-center items-center flex-shrink-0 transition-all ${
                   window.state?.isSelectionMode ? "flex" : "hidden md:flex"
                 }">
                      <input type="checkbox" class="recording-checkbox w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer" data-id="${
                        r.id
                      }" ${isSelected ? "checked" : ""}>
                 </div>
                 ${
                   !isLoggedIn()
                     ? '<div class="hidden md:block w-2"></div>'
                     : ""
                 }
  
                 <!-- 2. Play -->
                 <div class="w-12 flex justify-center items-center text-cyan-600 recording-play-pause-btn flex-shrink-0 hover:scale-110 transition-transform" id="list-play-btn-${
                   r.id
                 }">
                    <i data-lucide="play" class="w-5 h-5 fill-current"></i>
                 </div>
  
                 <!-- 3. ИНФОРМАЦИЯ (Без обложки) -->
                 <div class="flex-1 min-w-0 ml-4">
                     <div class="font-bold text-gray-800 text-sm leading-tight break-words">
                        ${r.performers || "Исполнитель не указан"}
                     </div>
                     <div class="text-xs text-gray-500 mt-0.5 break-words">
                       ${r.recording_year || "Год не указан"}
                     </div>
                 </div>
                 
                 <!-- 4. Правая часть -->
                 <div class="flex items-center ml-auto pl-3 flex-shrink-0">
                    <div class="hidden md:flex items-center">
                     ${
                       isLoggedIn()
                         ? `
                        <button class="favorite-btn p-2 mr-2 ${
                          isFav
                            ? "text-red-500"
                            : "text-gray-300 hover:text-red-400"
                        }" data-recording-id="${r.id}">
                               <i data-lucide="heart" class="w-5 h-5 ${
                                 isFav ? "fill-current" : ""
                               }"></i>
                        </button>`
                         : '<div class="w-10"></div>'
                     }
                    </div>
                    <div class="text-xs text-gray-500 font-mono w-10 text-right">${formatDuration(
                      r.duration
                    )}</div>
                 </div>
            </div>`;
        })
        .join("");

      finalHtml += `
       <div class="mb-10">
          <h3 class="text-lg font-bold mb-4 text-gray-700">Аудиозаписи</h3>
          <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">${rows}</div>
       </div>`;
    }

    // 2. ВИДЕО (ДЛЯ СТРАНИЦЫ КОМПОЗИЦИИ)
    if (videoRecs.length > 0) {
      const videoRows = videoRecs
        .map((r) => {
          const controls = isAdmin()
            ? `
             <div class="flex items-center gap-2 ml-2 border-l border-gray-200 pl-2">
                 <button class="edit-video-btn p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors" data-recording-id="${r.id}"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                 <button class="delete-video-btn p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" data-recording-id="${r.id}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
             </div>`
            : "";

          return `
           <div class="bg-white p-4 rounded-xl border border-gray-100 hover:border-red-200 hover:shadow-md transition-all mb-3 shadow-sm">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                    <!-- Левая часть: Иконка и Текст -->
                    <div class="flex items-start gap-4 min-w-0 w-full">
                        <div class="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 mt-1 sm:mt-0">
                            <i data-lucide="youtube" class="w-6 h-6"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="font-bold text-gray-800 text-lg leading-snug break-words">${
                              r.performers || "Исполнитель не указан"
                            }</div>
                            <div class="text-sm text-gray-500 font-mono mt-1">${
                              r.recording_year || "Год не указан"
                            }</div>
                        </div>
                    </div>

                    <!-- Правая часть: Кнопка (на мобиле снизу и на всю ширину) -->
                    <div class="flex items-center w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-gray-100 mt-1 sm:mt-0">
                        <a href="${
                          r.youtube_url
                        }" target="_blank" class="flex-1 sm:flex-none justify-center px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm active:scale-95">
                            <span>Смотреть</span> <i data-lucide="external-link" class="w-4 h-4"></i>
                        </a>
                        ${controls}
                    </div>
                </div>
           </div>
        `;
        })
        .join("");

      finalHtml += `
      <div class="mt-8">
         <h3 class="text-lg font-bold mb-4 text-gray-700 flex items-center gap-2">
            <i data-lucide="video" class="w-5 h-5 text-red-600"></i> Видеозаписи
         </h3>
         <div class="space-y-3">${videoRows}</div>
      </div>`;
    }

    listContainer.innerHTML = `<div class="max-w-7xl mx-auto px-6 pb-16">${finalHtml}</div>`;
  }
  if (window.lucide) window.lucide.createIcons();
}

export function updatePlayerInfo(rec) {
  let title = "Выберите запись";
  let artist = "ClassicaLib";
  let cover = "/static/img/placeholder.png";
  let recId = null;

  if (rec) {
    recId = rec.id;
    title = getLocalizedText(rec.composition, "title", "ru");
    const composer = getLocalizedText(
      rec.composition.work.composer,
      "name",
      "ru"
    );
    const work = getLocalizedText(rec.composition.work, "name", "ru");
    const performer = rec.performers || "Неизвестный исполнитель";
    const year = rec.recording_year ? ` (${rec.recording_year})` : "";
    artist = `${composer} • ${work} • ${performer}${year}`;
    cover =
      rec.composition.cover_art_url ||
      rec.composition.work.cover_art_url ||
      cover;
  }

  window.state.currentCoverUrl = cover;

  // --- ОБНОВЛЕНИЕ МИНИ-ПЛЕЕРА И ДЕСКТОП-ПЛЕЕРА ---
  const mobTitleEl = document.getElementById("player-title-mobile");
  const mobArtistEl = document.getElementById("player-artist-mobile");
  const mobCover = document.getElementById("player-cover-art-mobile");
  const mobFavContainer = document.getElementById(
    "player-favorite-btn-container-mobile"
  );
  if (mobTitleEl && mobArtistEl && mobCover) {
    // Добавлена проверка
    mobTitleEl.textContent = title;
    mobArtistEl.textContent = artist;
    mobCover.src = cover;
    checkMarquee(document.getElementById("marquee-title-mobile"), mobTitleEl);
    checkMarquee(document.getElementById("marquee-artist-mobile"), mobArtistEl);
    renderLikeButton(mobFavContainer, recId);
  }

  const deskTitleEl = document.getElementById("player-title-desktop");
  const deskArtistEl = document.getElementById("player-artist-desktop");
  const deskCover = document.getElementById("player-cover-art-desktop");
  const deskFavContainer = document.getElementById(
    "player-favorite-btn-container-desktop"
  );
  if (deskTitleEl && deskArtistEl && deskCover) {
    // Добавлена проверка
    deskTitleEl.textContent = title;
    deskTitleEl.title = title;
    deskArtistEl.textContent = artist;
    deskArtistEl.title = artist;
    deskCover.src = cover;
    renderLikeButton(deskFavContainer, recId);
  }

  // --- ОБНОВЛЕНИЕ FULL PLAYER (MOBILE) ---
  const fullBg = document.getElementById("full-player-bg");
  const fullTitle = document.getElementById("full-player-title");
  const fullArtist = document.getElementById("full-player-artist");
  const fullLikeContainer = document.getElementById(
    "full-player-like-container"
  );
  const fullVersionsContainer = document.getElementById(
    "full-player-versions-container"
  );

  if (fullTitle && fullArtist) {
    // Добавлена проверка
    fullTitle.textContent = title;
    fullArtist.textContent = artist;
    checkMarquee(
      document.getElementById("marquee-full-player-title"),
      fullTitle
    );
    checkMarquee(
      document.getElementById("marquee-full-player-artist"),
      fullArtist
    );
    if (fullBg) fullBg.src = cover;

    document.getElementById("mobile-full-player").dataset.trackId = recId;
    renderLikeButton(fullLikeContainer, recId);

    updateSwipeableCovers();

    if (fullVersionsContainer) {
      fullVersionsContainer.innerHTML = "";
      if (rec && rec.composition && rec.composition.work) {
        const vBtn = document.createElement("button");
        vBtn.className =
          "p-3 bg-gray-50 rounded-xl text-gray-500 hover:text-cyan-600 transition-colors border border-gray-200 active:scale-95";
        vBtn.title = "Другие исполнения";
        vBtn.innerHTML = `<i data-lucide="layers" class="w-6 h-6"></i>`;
        vBtn.onclick = () =>
          window.openVersionsModal(rec.composition.work.id, rec.id, true);
        fullVersionsContainer.appendChild(vBtn);
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  const infoBtnDesktop = document.getElementById("player-info-btn-desktop");
  const popoverContent = document.getElementById("player-info-popover");
  const modalContent = document.getElementById("player-info-modal-content");

  if (!infoBtnDesktop || !popoverContent || !modalContent) return; // Убрал infoBtnMobile, т.к. его нет

  if (rec) {
    const licenseUrl = licenses[rec.license];
    const licenseHtml = licenseUrl
      ? `<a href="${licenseUrl}" target="_blank" class="text-cyan-400 hover:underline">${rec.license}</a>`
      : rec.license || "Не указана";

    const sourceHtml =
      rec.source_url && rec.source_text
        ? `<a href="${rec.source_url}" target="_blank" class="text-cyan-400 hover:underline">${rec.source_text}</a>`
        : "Не указан";

    // ... остальная часть функции без изменений
    const infoHtml = `
        <div class="space-y-3 text-sm">
            <div>
                <strong class="block text-gray-400 font-medium">Название:</strong>
                <span class="font-semibold">${title}</span>
            </div>
            <div>
                <strong class="block text-gray-400 font-medium">Композитор:</strong>
                <span>${getLocalizedText(
                  rec.composition.work.composer,
                  "name",
                  "ru"
                )}</span>
            </div>
            <div>
                <strong class="block text-gray-400 font-medium">Исполнитель:</strong>
                <span>${rec.performers || "Не указан"}</span>
            </div>


            ${
              rec.lead_performer
                ? `
              <div>
                  <strong class="block text-gray-400 font-medium">Ведущий исполнитель:</strong>
                  <span>${rec.lead_performer}</span>
              </div>`
                : ""
            }



            ${
              rec.conductor
                ? `
            <div>
                <strong class="block text-gray-400 font-medium">Дирижёр:</strong>
                <span>${rec.conductor}</span>
            </div>`
                : ""
            }
            <div>
                <strong class="block text-gray-400 font-medium">Лицензия:</strong>
                <span>${licenseHtml}</span>
            </div>
            <div>
                <strong class="block text-gray-400 font-medium">Источник:</strong>
                <span>${sourceHtml}</span>
            </div>
        </div>
    `;

    popoverContent.innerHTML = infoHtml;
    modalContent.innerHTML = infoHtml
      .replace(/text-gray-400/g, "text-gray-500")
      .replace(/text-cyan-400/g, "text-cyan-600");

    infoBtnDesktop.classList.remove("hidden");
    const fullPlayerInfoBtn = document.getElementById("full-player-info-btn");
    if (fullPlayerInfoBtn) fullPlayerInfoBtn.classList.remove("hidden");

    document.getElementById("dynamic-versions-btn-desktop")?.remove();
    document.getElementById("dynamic-versions-btn-mobile")?.remove();
    document.getElementById("dynamic-versions-btn")?.remove();

    if (rec && rec.composition && rec.composition.work) {
      const workId = rec.composition.work.id;

      const createBtn = (idSuffix) => {
        const btn = document.createElement("button");
        btn.id = `dynamic-versions-btn-${idSuffix}`;
        btn.className =
          "p-2 text-gray-400 hover:text-cyan-600 transition-colors flex-shrink-0";
        btn.title = "Другие исполнения этого произведения";
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>`;

        btn.onclick = (e) => {
          e.stopPropagation();
          window.openVersionsModal(workId, rec.id, false);
        };
        return btn;
      };

      const deskContainer = document.getElementById(
        "player-favorite-btn-container-desktop"
      )?.parentNode;
      if (deskContainer) {
        const btn = createBtn("desktop");
        deskContainer.insertBefore(btn, deskContainer.firstChild);
      }

      const mobContainer = document.getElementById(
        "player-favorite-btn-container-mobile"
      )?.parentNode;
      if (mobContainer) {
        const btn = createBtn("mobile");
        mobContainer.insertBefore(btn, mobContainer.firstChild);
      }
    }
  }
}

function updateSwipeableCovers() {
  const coverPrev = document.getElementById("full-player-cover-prev");
  const coverCurrent = document.getElementById("full-player-cover-current");
  const coverNext = document.getElementById("full-player-cover-next");

  if (!coverPrev || !coverCurrent || !coverNext) {
    return;
  }

  const { getNeighboringTracks } = window.player;
  if (!getNeighboringTracks) return;

  const { prev, current, next } = getNeighboringTracks();

  const placeholder = "/static/img/placeholder.png";

  const getCoverUrl = (track) => {
    if (!track) return placeholder;
    return (
      track.composition.cover_art_url ||
      track.composition.work.cover_art_url ||
      placeholder
    );
  };

  if (coverPrev) coverPrev.src = getCoverUrl(prev);
  if (coverCurrent) coverCurrent.src = getCoverUrl(current);
  if (coverNext) coverNext.src = getCoverUrl(next);
}

export function updatePlayPauseIcon(isPlaying) {
  const sets = [
    { play: "play-icon-mobile", pause: "pause-icon-mobile" },
    { play: "play-icon-desktop", pause: "pause-icon-desktop" },
    { play: "full-play-icon", pause: "full-pause-icon" },
  ];

  sets.forEach((set) => {
    const playEl = document.getElementById(set.play);
    const pauseEl = document.getElementById(set.pause);

    if (playEl && pauseEl) {
      if (isPlaying) {
        playEl.classList.add("hidden");
        pauseEl.classList.remove("hidden");
      } else {
        playEl.classList.remove("hidden");
        pauseEl.classList.add("hidden");
      }
    }
  });
}

export function renderPlaylistList(playlists) {
  const m = document.getElementById("playlists-dropdown-menu");
  if (!m) return;
  const btn = document.getElementById("create-playlist-top-btn").parentElement;
  m.innerHTML = "";
  m.appendChild(btn);
  if (playlists)
    playlists.forEach((p) => {
      const d = document.createElement("div");
      d.className =
        "px-4 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0";
      d.innerHTML = `<a href="/playlists/${p.id}" data-navigo class="text-sm text-gray-700 block font-medium">${p.name}</a>`;
      m.insertBefore(d, btn);
    });
}
export function renderPagination(curr, total) {
  const c = document.getElementById("pagination-container");
  if (!c || total <= 1) {
    c.innerHTML = "";
    return;
  }
  let h = "";
  for (let i = 1; i <= total; i++) {
    const active =
      i === curr
        ? "bg-cyan-600 text-white shadow-md"
        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200";
    h += `<button data-page="${i}" class="px-4 py-2 rounded-lg text-sm font-bold transition-all ${active}">${i}</button>`;
  }
  c.innerHTML = h;
}
export function renderBreadcrumbs() {
  const container = document.getElementById("breadcrumbs-container");
  if (!container) return;

  const view = window.state.view.current;

  if (view === "dashboard") {
    container.innerHTML = "";
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");

  let crumbs = [{ label: "ClassicaLib", link: "/" }];

  switch (view) {
    // --- КОМПОЗИТОРЫ ---
    case "composers":
      crumbs.push({ label: "Композиторы" });
      break;

    case "composer_detail":
      crumbs.push({ label: "Композиторы", link: "/composers" });
      if (window.state.view.currentComposer) {
        crumbs.push({
          label: getLocalizedText(
            window.state.view.currentComposer,
            "name",
            "ru"
          ),
        });
      }
      break;

    case "work_detail":
      crumbs.push({ label: "Композиторы", link: "/composers" });
      const w = window.state.view.currentWork;
      if (w && w.composer) {
        const compLink = `/composers/${w.composer.slug || w.composer.id}`;
        crumbs.push({
          label: getLocalizedText(w.composer, "name", "ru"),
          link: compLink,
        });
        crumbs.push({ label: getLocalizedText(w, "name", "ru") });
      }
      break;

    case "composition_detail":
      crumbs.push({ label: "Композиторы", link: "/composers" });
      const c = window.state.view.currentComposition;
      if (c && c.work && c.work.composer) {
        const compLink = `/composers/${
          c.work.composer.slug || c.work.composer.id
        }`;
        const workLink = `/works/${c.work.slug || c.work.id}`;

        crumbs.push({
          label: getLocalizedText(c.work.composer, "name", "ru"),
          link: compLink,
        });
        crumbs.push({
          label: getLocalizedText(c.work, "name", "ru"),
          link: workLink,
        });
        crumbs.push({ label: getLocalizedText(c, "title", "ru") });
      }
      break;

    // --- МЕДИАТЕКА ---
    case "library_hub":
      crumbs.push({ label: "Медиатека" });
      break;
    case "library_audio":
      crumbs.push({ label: "Медиатека", link: "/recordings" });
      crumbs.push({ label: "Аудиозаписи" });
      break;
    case "library_video":
      crumbs.push({ label: "Медиатека", link: "/recordings" });
      crumbs.push({ label: "Видеозал" });
      break;
    case "recordings": // Старый роут, на всякий случай
      crumbs.push({ label: "Медиатека" });
      break;

    // --- ПЛЕЙЛИСТЫ ---
    case "playlists_overview":
      crumbs.push({ label: "Мои плейлисты" });
      break;
    case "playlist":
      crumbs.push({ label: "Мои плейлисты", link: "/playlists" });
      const plTitle = document.querySelector("#view-title-container h2");
      const plName = plTitle
        ? plTitle.textContent.replace("Список", "").trim()
        : "Плейлист";
      crumbs.push({ label: plName });
      break;

    // --- ИЗБРАННОЕ ---
    case "favorites":
      crumbs.push({ label: "Избранное" });
      break;

    // --- ПОИСК ---
    case "search":
      crumbs.push({ label: "Поиск" });
      crumbs.push({ label: `"${window.state.view.searchQuery}"` });
      break;

    // --- БЛОГ (СПИСОК) ---
    case "blog_list":
      if (window.state.view.blogTagFilter) {
        crumbs.push({ label: "Блог", link: "/blog" });
        crumbs.push({ label: `#${window.state.view.blogTagFilter}` });
      } else {
        crumbs.push({ label: "Блог" });
      }
      break;

    // --- БЛОГ (СТАТЬЯ) ---
    case "blog_post":
      crumbs.push({ label: "Блог", link: "/blog" });
      if (window.state.view.currentBlogPost) {
        crumbs.push({ label: window.state.view.currentBlogPost.title });
      }
      break;

    case "map":
      crumbs.push({ label: "Карта" });
      break;

    case "account":
      crumbs.push({ label: "Личный кабинет" });
      break;
  }

  const html = crumbs
    .map((crumb, index) => {
      const isLast = index === crumbs.length - 1;
      const textStyle = "text-sm font-medium leading-snug break-words";

      if (isLast) {
        return `<span class="font-bold text-gray-900 ${textStyle}">${crumb.label}</span>`;
      } else {
        return `
            <a href="${crumb.link}" data-navigo class="hover:text-cyan-600 hover:underline transition-colors ${textStyle} text-gray-600">
                ${crumb.label}
            </a>
            <i data-lucide="chevron-right" class="w-4 h-4 text-gray-400 flex-shrink-0"></i>
          `;
      }
    })
    .join("");

  container.innerHTML = `<div class="flex flex-wrap items-center gap-x-2 gap-y-1 w-full">${html}</div>`;

  if (window.lucide) window.lucide.createIcons();
}

export function setUserGreeting(email) {
  const username = email.split("@")[0];
  document.getElementById(
    "user-greeting"
  ).textContent = `Здравствуйте, ${username}!`;
}
export function updateSelectedRecordingFile(f) {
  document.getElementById("selected-recording-filename").textContent = f
    ? f.name
    : "Файл не выбран";
}

export async function showAddComposerModal() {
  const modal = document.getElementById("add-composer-modal");
  modal.classList.remove("hidden");

  document
    .querySelectorAll("#add-composer-modal input")
    .forEach((i) => (i.value = ""));

  await loadAndInitQuill("#add-composer-bio", "");

  const closeBtn = modal.querySelector(".close-button");
  const newClose = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newClose, closeBtn);

  newClose.onclick = () => {
    modal.classList.add("hidden");
  };
}

export function showAddWorkModal() {
  const modal = document.getElementById("add-work-modal");
  modal.classList.remove("hidden");

  // Очистка старых полей
  document
    .querySelectorAll("#add-work-modal input")
    .forEach((i) => (i.value = ""));
  document.getElementById("add-work-no-catalog").checked = false;
  document.getElementById("add-work-catalog").disabled = false;

  // --- НОВАЯ ЛОГИКА КАСТОМНОГО ЖАНРА С ПРОВЕРКОЙ ---
  const genreInput = document.getElementById("add-work-genre-input");
  const suggestionsContainer = document.getElementById(
    "add-work-genre-suggestions"
  );
  const typoWarning = document.getElementById("add-work-genre-typo-warning"); // Контейнер для предупреждения
  let debounceTimer;

  genreInput.oninput = () => {
    clearTimeout(debounceTimer);
    const query = genreInput.value.trim();
    typoWarning.classList.add("hidden"); // Скрываем старое предупреждение

    // 1. Поиск по локальному списку (подсказки)
    suggestionsContainer.innerHTML = "";
    if (query.length > 0) {
      const matches = window.state.allGenres.filter((g) =>
        g.name.toLowerCase().includes(query.toLowerCase())
      );
      if (matches.length > 0) {
        matches.forEach((genre) => {
          const item = document.createElement("div");
          item.className = "px-4 py-2 cursor-pointer hover:bg-cyan-50";
          item.textContent = genre.name;
          item.onclick = () => {
            genreInput.value = genre.name;
            suggestionsContainer.classList.add("hidden");
          };
          suggestionsContainer.appendChild(item);
        });
        suggestionsContainer.classList.remove("hidden");
      } else {
        suggestionsContainer.classList.add("hidden");
      }
    } else {
      suggestionsContainer.classList.add("hidden");
    }

    // 2. Проверка на опечатки через API (с задержкой)
    debounceTimer = setTimeout(async () => {
      if (query.length < 3) return;

      try {
        const response = await apiRequest("/api/genres/check-typo", "POST", {
          name: query,
        });
        if (response.similar) {
          typoWarning.innerHTML = `Возможно, вы имели в виду: <strong>${response.similar}</strong>?`;
          typoWarning.classList.remove("hidden");
        }
      } catch (e) {
        console.error("Typo check failed:", e);
      }
    }, 500); // Задержка в полсекунды
  };

  document.addEventListener(
    "click",
    (e) => {
      if (
        !genreInput.contains(e.target) &&
        !suggestionsContainer.contains(e.target)
      ) {
        suggestionsContainer.classList.add("hidden");
      }
    },
    { once: true }
  );
  // --- КОНЕЦ ЛОГИКИ ---

  loadAndInitQuill("#add-work-notes", "");

  // ... (код с closeBtn без изменений) ...
  const closeBtn = modal.querySelector(".close-button");
  const newClose = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newClose, closeBtn);
  newClose.onclick = () => modal.classList.add("hidden");
}

export function showAddCompositionModal() {
  const modal = document.getElementById("add-composition-modal");
  modal.classList.remove("hidden");

  modal.querySelectorAll("input").forEach((i) => (i.value = ""));

  const currentWork = window.state?.view?.currentWork;
  const noCatalogCheck = document.getElementById("add-composition-no-catalog");
  const catalogInput = document.getElementById("add-composition-catalog");

  if (noCatalogCheck && catalogInput) {
    if (currentWork && currentWork.is_no_catalog) {
      noCatalogCheck.checked = true;
      catalogInput.disabled = true;
      catalogInput.value = "";
    } else {
      noCatalogCheck.checked = false;
      catalogInput.disabled = false;
    }
  }

  let nextOrder = 1;

  if (
    currentWork &&
    currentWork.compositions &&
    currentWork.compositions.length > 0
  ) {
    const maxOrder = Math.max(
      ...currentWork.compositions.map((c) => c.sort_order || 0)
    );
    nextOrder = maxOrder + 1;
  }

  document.getElementById("add-composition-order").value = nextOrder;
}

export function showAddAudioModal(id) {
  document.getElementById("add-recording-composition-id").value = id;
  const modal = document.getElementById("add-audio-modal");
  modal.classList.remove("hidden");
  modal
    .querySelectorAll("input:not([type=hidden])")
    .forEach((i) => (i.value = ""));
  modal.querySelector("select").value = "";
  document.getElementById("selected-recording-filename").textContent =
    "Выберите файл...";
}

export function showAddVideoModal(id) {
  const modal = document.getElementById("add-video-modal");
  modal.classList.remove("hidden");
  modal.querySelectorAll("input").forEach((i) => (i.value = ""));
}

export async function showEditEntityModal(type, data, onSave) {
  const modal = document.getElementById("edit-modal");
  const content = document.getElementById("edit-modal-content");
  const titleEl = document.getElementById("edit-modal-title");
  const confirmBtn = document.getElementById("confirm-edit-btn");

  let modalTitle = "Редактировать";
  let fields = "";
  let confirmBtnClass =
    "px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg shadow-lg shadow-cyan-200 transition-all";
  let confirmBtnText = "Сохранить";

  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  modal.querySelectorAll(".close-button").forEach((btn) => {
    const newClose = btn.cloneNode(true);
    btn.parentNode.replaceChild(newClose, btn);
    newClose.onclick = () => {
      modal.classList.add("hidden");
    };
  });

  // --- ГЕНЕРАЦИЯ ПОЛЕЙ ---

  if (type === "composer") {
    modalTitle = "Редактировать композитора";
    fields = `
        <!-- Портрет -->
        <div class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Портрет</label>
            <input type="file" id="edit-cover-file" accept="image/*" class="text-sm w-full">
        </div>

        <!-- Имена -->
        <div class="mb-3">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Имя (RU)</label>
            <input id="edit-name-ru" class="w-full border border-gray-300 p-2 rounded-lg" value="${
              data.name_ru || ""
            }">
        </div>
        <div class="mb-3">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Имя на родном языке</label>
            <input id="edit-name-orig" class="w-full border border-gray-300 p-2 rounded-lg" value="${
              data.original_name || ""
            }">
        </div>

        <!-- Даты -->
        <div class="grid grid-cols-2 gap-4 mb-3">
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Родился</label>
                <input type="number" id="edit-year-born" class="w-full border border-gray-300 p-2 rounded-lg" value="${
                  data.year_born || ""
                }">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Умер</label>
                <input type="number" id="edit-year-died" class="w-full border border-gray-300 p-2 rounded-lg" value="${
                  data.year_died || ""
                }">
            </div>
        </div>

        <!-- ГЕОГРАФИЯ -->
        <div class="mt-4 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Место рождения</label>
            <input id="edit-place" class="w-full border border-gray-300 p-2 rounded-lg mb-2" value="${
              data.place_of_birth || ""
            }" placeholder="Например: Зальцбург, Австрия">

            <div class="grid grid-cols-2 gap-2">
                <div>
                     <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Широта (Lat)</label>
                     <input type="number" step="any" id="edit-lat" class="w-full border p-2 rounded-lg" value="${
                       data.latitude || ""
                     }" placeholder="47.8095">
                </div>
                <div>
                     <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Долгота (Lng)</label>
                     <input type="number" step="any" id="edit-lng" class="w-full border p-2 rounded-lg" value="${
                       data.longitude || ""
                     }" placeholder="13.0550">
                </div>
            </div>
            <p class="text-[10px] text-gray-400 mt-1">
                Данные можно взять в Google Maps (клик правой кнопкой мыши по точке).
            </p>
        </div>

        <!-- Биография (Quill) -->
        <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Биография</label>
            <div>
                <div id="edit-notes" class="h-64"></div>
            </div>
        </div>
      `;
  } else if (type === "work") {
    modalTitle = "Редактировать произведение";

    // Получаем текущее имя жанра, если он есть
    const currentGenreName = data.genre ? data.genre.name : "";

    fields = `
          <div class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Обложка</label>
              <input type="file" id="edit-cover-file" accept="image/*" class="text-sm w-full">
          </div>
  
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div class="md:col-span-2">
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Название (RU)</label>
                  <input id="edit-name-ru" class="w-full border border-gray-300 p-2 rounded-lg" value="${
                    data.name_ru || ""
                  }">
              </div>
  
              <div>
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Оригинальное название</label>
                  <input id="edit-name-orig" class="w-full border border-gray-300 p-2 rounded-lg" value="${
                    data.original_name || ""
                  }">
              </div>
  
              <div>
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Тональность</label>
                  <input id="edit-work-tonality" class="w-full border border-gray-300 p-2 rounded-lg" value="${
                    data.tonality || ""
                  }">
              </div>
  
              <!-- КАТАЛОГ -->
              <div>
                  <div class="flex justify-between items-end mb-1">
                      <label class="block text-xs font-bold text-gray-500 uppercase">Каталог (Op.)</label>
                      <label class="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" id="edit-work-no-catalog" ${
                            data.is_no_catalog ? "checked" : ""
                          }
                                 onchange="document.getElementById('edit-work-catalog').disabled = this.checked; if(this.checked) document.getElementById('edit-work-catalog').value = '';"
                                 class="w-4 h-4 text-cyan-600 rounded border-gray-300">
                          <span class="text-xs text-gray-500">Б/Н</span>
                      </label>
                  </div>
                  <input id="edit-work-catalog" class="w-full border border-gray-300 p-2 rounded-lg disabled:bg-gray-100 disabled:text-gray-400"
                         value="${data.catalog_number || ""}" ${
      data.is_no_catalog ? "disabled" : ""
    }>
              </div>
  
              <!-- ЖАНР (КАСТОМНЫЙ) -->
            <div class="relative">
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Жанр</label>
              <input type="text" id="edit-work-genre-input"
                     class="w-full border border-gray-300 p-2 rounded-lg"
                     value="${currentGenreName}" placeholder="Начните вводить...">
              <div id="edit-work-genre-suggestions" class="hidden absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"></div>
              
              <!-- ВОТ ЭТОТ DIV НУЖЕН -->
              <div id="edit-work-genre-typo-warning" class="hidden mt-2 text-sm text-orange-600 bg-orange-50 p-2 rounded-lg"></div>
            </div>
  
              <div class="md:col-span-2">
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Популярное название</label>
                  <input id="edit-work-nickname" class="w-full border border-gray-300 p-2 rounded-lg" value="${
                    data.nickname || ""
                  }">
              </div>
  
              <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Год начала</label>
              <input type="number" id="edit-year-start" class="w-full border border-gray-300 p-2 rounded-lg" value="${
                data.publication_year || ""
              }"></div>
  
              <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Год конца</label>
              <input type="number" id="edit-year-end" class="w-full border border-gray-300 p-2 rounded-lg" value="${
                data.publication_year_end || ""
              }"></div>
          </div>
  
          <!-- Quill Container -->
          <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">История и факты</label>
          <div>
              <div id="edit-work-notes" class="h-64"></div>
          </div></div>
        `;
    // === ЛОГИКА ДЛЯ КАСТОМНОГО ЖАНРА (ПОДСКАЗКИ + ПРОВЕРКА ОПЕЧАТОК) ===
    (async () => {
      await new Promise((resolve) => setTimeout(resolve, 50)); // Ждем, пока DOM обновится

      const genreInput = document.getElementById("edit-work-genre-input");
      const suggestionsContainer = document.getElementById(
        "edit-work-genre-suggestions"
      );
      const typoWarning = document.getElementById(
        "edit-work-genre-typo-warning"
      ); // Находим новый div
      let debounceTimer;

      if (!genreInput || !suggestionsContainer || !typoWarning) return;

      genreInput.oninput = () => {
        clearTimeout(debounceTimer);
        const query = genreInput.value.trim();
        typoWarning.classList.add("hidden"); // Скрываем старое предупреждение

        // 1. Поиск по локальному списку (подсказки)
        suggestionsContainer.innerHTML = "";
        if (query.length > 0) {
          const matches = window.state.allGenres.filter((g) =>
            g.name.toLowerCase().includes(query.toLowerCase())
          );
          if (matches.length > 0) {
            matches.forEach((genre) => {
              const item = document.createElement("div");
              item.className = "px-4 py-2 cursor-pointer hover:bg-cyan-50";
              item.textContent = genre.name;
              item.onclick = () => {
                genreInput.value = genre.name;
                suggestionsContainer.classList.add("hidden");
                typoWarning.classList.add("hidden"); // Прячем предупреждение, если выбрали из списка
              };
              suggestionsContainer.appendChild(item);
            });
            suggestionsContainer.classList.remove("hidden");
          } else {
            suggestionsContainer.classList.add("hidden");
          }
        } else {
          suggestionsContainer.classList.add("hidden");
        }

        // 2. Проверка на опечатки через API (с задержкой)
        debounceTimer = setTimeout(async () => {
          if (query.length < 3) return;

          // Не проверяем, если выбрали из списка
          if (
            window.state.allGenres.some(
              (g) => g.name.toLowerCase() === query.toLowerCase()
            )
          ) {
            return;
          }

          try {
            const response = await apiRequest(
              "/api/genres/check-typo",
              "POST",
              { name: query }
            );
            if (response.similar) {
              typoWarning.innerHTML = `Возможно, вы имели в виду: <strong>${response.similar}</strong>?`;
              typoWarning.classList.remove("hidden");
            }
          } catch (e) {
            console.error("Typo check failed:", e);
          }
        }, 500); // Задержка
      };

      const closeSuggestions = (e) => {
        if (
          !genreInput.contains(e.target) &&
          !suggestionsContainer.contains(e.target)
        ) {
          suggestionsContainer.classList.add("hidden");
          document.removeEventListener("click", closeSuggestions);
        }
      };
      genreInput.onfocus = () => {
        document.addEventListener("click", closeSuggestions);
      };
    })();
  } else if (type === "composition") {
    modalTitle = "Редактировать часть";
    fields = `
        <div class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Обложка части</label>
            <input type="file" id="edit-cover-file" accept="image/*" class="text-sm w-full">
        </div>
        <div class="grid grid-cols-4 gap-4 mb-3">
            <div class="col-span-1">
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">№</label>
                <input type="number" id="edit-comp-order" min="1" class="w-full border border-gray-300 p-2 rounded-lg text-center font-bold" value="${
                  data.sort_order || 0
                }">
            </div>
            <div class="col-span-3">
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Название (RU)</label>
                <input id="edit-title-ru" class="w-full border border-gray-300 p-2 rounded-lg" value="${
                  data.title_ru || ""
                }">
            </div>
        </div>
        <div class="mb-3"><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Оригинальное название</label>
        <input id="edit-title-orig" class="w-full border border-gray-300 p-2 rounded-lg" value="${
          data.title_original || ""
        }"></div>
        <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Тональность</label>
            <input id="edit-comp-tonality" class="w-full border border-gray-300 p-2 rounded-lg" value="${
              data.tonality || ""
            }"></div>

            <div>
                <div class="flex justify-between items-end mb-1">
                    <label class="block text-xs font-bold text-gray-500 uppercase">Каталог (Op.)</label>
                    <label class="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" id="edit-comp-no-catalog" ${
                          data.is_no_catalog ? "checked" : ""
                        }
                               onchange="document.getElementById('edit-catalog').disabled = this.checked; if(this.checked) document.getElementById('edit-catalog').value = '';"
                               class="w-3 h-3 text-cyan-600 rounded border-gray-300">
                        <span class="text-[10px] text-gray-500">Б/Н</span>
                    </label>
                </div>
                <input id="edit-catalog" class="w-full border border-gray-300 p-2 rounded-lg disabled:bg-gray-100 disabled:text-gray-400"
                       value="${data.catalog_number || ""}" ${
      data.is_no_catalog ? "disabled" : ""
    }>
            </div>
        </div>
        <div class="mt-3"><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Год</label>
        <input type="number" id="edit-year" class="w-full border border-gray-300 p-2 rounded-lg" value="${
          data.composition_year || ""
        }"></div>
      `;
  } else if (type === "audio_recording") {
    modalTitle = `<i data-lucide="disc" class="w-5 h-5 text-cyan-600"></i> Редактировать аудиозапись`;
    const licenseOptions = Object.keys(licenses)
      .map(
        (key) =>
          `<option value="${key}" ${
            data.license === key ? "selected" : ""
          }>${key}</option>`
      )
      .join("");

    fields = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2"><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Исполнители</label><input type="text" id="edit-performers" class="w-full px-3 py-2 border rounded-lg outline-none" value="${
              data.performers || ""
            }"></div>
            <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Ведущий исполнитель</label><input type="text" id="edit-lead-performer" class="w-full px-3 py-2 border rounded-lg outline-none" value="${
              data.lead_performer || ""
            }"></div>
            <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Дирижёр</label><input type="text" id="edit-conductor" class="w-full px-3 py-2 border rounded-lg outline-none" value="${
              data.conductor || ""
            }"></div>
            <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Год записи</label><input type="number" id="edit-rec-year" class="w-full px-3 py-2 border rounded-lg outline-none" value="${
              data.recording_year || ""
            }"></div>
            <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Лицензия</label><select id="edit-license" class="w-full px-3 py-2 border rounded-lg bg-white outline-none"><option value="">Не указана</option>${licenseOptions}</select></div>
            <div class="md:col-span-2"><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Источник (анкор)</label><input type="text" id="edit-source-text" class="w-full px-3 py-2 border rounded-lg" value="${
              data.source_text || ""
            }"></div>
            <div class="md:col-span-2"><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Источник (URL)</label><input type="url" id="edit-source-url" class="w-full px-3 py-2 border rounded-lg" value="${
              data.source_url || ""
            }"></div>
        </div>
    `;
  } else if (type === "video_recording") {
    modalTitle = `<i data-lucide="youtube" class="w-5 h-5 text-red-600"></i> Редактировать видеозапись`;
    confirmBtnClass =
      "px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg shadow-red-200/50 transition-all";

    fields = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2"><label class="block text-xs font-bold text-gray-700 uppercase mb-1">Ссылка на YouTube <span class="text-red-500">*</span></label><input type="text" id="edit-youtube-url" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-400 outline-none" value="${
              data.youtube_url || ""
            }"></div>
            <div class="md:col-span-2"><label class="block text-xs font-bold text-gray-700 uppercase mb-1">Исполнитель <span class="text-red-500">*</span></label><input type="text" id="edit-performers" class="w-full px-3 py-2 border rounded-lg outline-none" value="${
              data.performers || ""
            }"></div>
            <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Ведущий исполнитель</label><input type="text" id="edit-lead-performer" class="w-full px-3 py-2 border rounded-lg outline-none" value="${
              data.lead_performer || ""
            }"></div>
            <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Дирижёр</label><input type="text" id="edit-conductor" class="w-full px-3 py-2 border rounded-lg outline-none" value="${
              data.conductor || ""
            }"></div>
            <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Год записи</label><input type="number" id="edit-rec-year" class="w-full px-3 py-2 border rounded-lg outline-none" value="${
              data.recording_year || ""
            }"></div>
        </div>
    `;
  } else if (type === "profile") {
    modalTitle = "Редактировать профиль";
    fields = `
      <div class="space-y-4">
        <!-- БЛОК СМЕНЫ ФОТО -->
        <div class="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div class="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 border border-gray-300">
                 ${
                   data.avatar_url
                     ? `<img src="${data.avatar_url}" class="w-full h-full object-cover">`
                     : `<div class="w-full h-full flex items-center justify-center text-gray-400"><i data-lucide="user" class="w-8 h-8"></i></div>`
                 }
            </div>
            <div class="flex-1 min-w-0">
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Фото профиля</label>
                <input type="file" id="edit-profile-avatar" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-cyan-100 file:text-cyan-700 hover:file:bg-cyan-200 transition-all cursor-pointer">
                
                ${
                  data.avatar_url
                    ? `<button type="button" id="delete-avatar-btn" class="mt-2 text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"><i data-lucide="trash-2" class="w-3 h-3"></i> Удалить фото</button>`
                    : ""
                }
            </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Отображаемое имя</label>
          <input id="edit-display-name" class="w-full border border-gray-300 p-2 rounded-lg" value="${
            data.display_name || ""
          }">
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Email</label>
          <input class="w-full border bg-gray-100 text-gray-400 p-2 rounded-lg" value="${
            data.email
          }" disabled>
        </div>
      </div>
    `;
  }

  titleEl.innerHTML = modalTitle;
  content.innerHTML = fields;
  newBtn.className = confirmBtnClass;
  newBtn.textContent = confirmBtnText;
  if (window.lucide) window.lucide.createIcons();

  // Обработчик удаления фото
  const delAvatarBtn = document.getElementById("delete-avatar-btn");
  if (delAvatarBtn) {
    delAvatarBtn.onclick = async () => {
      if (!confirm("Удалить фото профиля?")) return;
      const originalText = delAvatarBtn.textContent;
      delAvatarBtn.textContent = "Удаление...";
      try {
        await window.apiRequest("/api/users/me/avatar", "DELETE");
        modal.classList.add("hidden");
        window.showNotification("Фото удалено", "success");
        // Полная перезагрузка для обновления UI
        window.location.reload();
      } catch (e) {
        window.showNotification("Ошибка: " + e.message, "error");
        delAvatarBtn.textContent = originalText;
      }
    };
  }

  // --- ИНИЦИАЛИЗАЦИЯ QUILL ---
  if (type === "composer" || type === "work") {
    const selectorId = type === "work" ? "#edit-work-notes" : "#edit-notes";
    await loadAndInitQuill(selectorId, data.notes);
  }

  // --- СОХРАНЕНИЕ ---
  newBtn.onclick = async () => {
    const originalText = newBtn.textContent;

    newBtn.disabled = true;
    newBtn.textContent = "Сохранение...";

    try {
      let payload = {};

      if (type === "composer") {
        const bioContent = window.quillEditor
          ? window.quillEditor.root.innerHTML
          : "";

        const lat = parseFloat(document.getElementById("edit-lat").value);
        const lng = parseFloat(document.getElementById("edit-lng").value);

        payload = {
          name_ru: document.getElementById("edit-name-ru").value,
          original_name: document.getElementById("edit-name-orig").value,
          year_born:
            parseInt(document.getElementById("edit-year-born").value) || null,
          year_died:
            parseInt(document.getElementById("edit-year-died").value) || null,
          notes: bioContent,
          place_of_birth: document.getElementById("edit-place").value,
          latitude: isNaN(lat) ? null : lat,
          longitude: isNaN(lng) ? null : lng,
        };
      } else if (type === "work") {
        const notesContent = window.quillEditor
          ? window.quillEditor.root.innerHTML
          : "";
        const genreName = document
          .getElementById("edit-work-genre-input")
          .value.trim();

        // Сначала проверяем/создаем жанр, потом сохраняем произведение
        let genreId = null;
        if (genreName) {
          newBtn.textContent = "Проверка жанра...";
          try {
            const genre = await apiRequest("/api/genres/check-create", "POST", {
              name: genreName,
            });
            genreId = genre.id;
            if (!state.allGenres.find((g) => g.id === genre.id)) {
              state.allGenres.push(genre);
              state.allGenres.sort((a, b) => a.name.localeCompare(b.name));
            }
          } catch (genreError) {
            // Если API вернуло ошибку (опечатка), показываем её и останавливаем сохранение
            window.showNotification(genreError.message, "error");
            throw genreError; // Прерываем выполнение
          }
        }

        newBtn.textContent = "Сохранение...";

        payload = {
          name_ru: document.getElementById("edit-name-ru").value,
          original_name: document.getElementById("edit-name-orig").value,
          tonality: document.getElementById("edit-work-tonality").value,
          genre_id: genreId,
          nickname: document.getElementById("edit-work-nickname").value,
          is_no_catalog: document.getElementById("edit-work-no-catalog")
            .checked,
          catalog_number: document.getElementById("edit-work-catalog").value,
          publication_year:
            parseInt(document.getElementById("edit-year-start").value) || null,
          publication_year_end:
            parseInt(document.getElementById("edit-year-end").value) || null,
          notes: notesContent,
        };
      } else if (type === "composition") {
        const order = parseInt(
          document.getElementById("edit-comp-order").value
        );
        if (isNaN(order) || order < 1) {
          throw new Error("Порядковый номер должен быть положительным числом");
        }
        payload = {
          sort_order: order,
          title_ru: document.getElementById("edit-title-ru").value,
          title_original: document.getElementById("edit-title-orig").value,
          tonality: document.getElementById("edit-comp-tonality").value,
          is_no_catalog: document.getElementById("edit-comp-no-catalog")
            .checked,
          catalog_number: document.getElementById("edit-catalog").value,
          composition_year:
            parseInt(document.getElementById("edit-year").value) || null,
        };
      } else if (type === "audio_recording") {
        payload = {
          performers: document.getElementById("edit-performers").value,
          lead_performer: document.getElementById("edit-lead-performer").value,
          conductor: document.getElementById("edit-conductor").value,
          recording_year:
            parseInt(document.getElementById("edit-rec-year").value) || null,
          license: document.getElementById("edit-license").value,
          source_text: document.getElementById("edit-source-text").value,
          source_url: document.getElementById("edit-source-url").value,
        };
      } else if (type === "video_recording") {
        const url = document.getElementById("edit-youtube-url").value.trim();
        const performers = document
          .getElementById("edit-performers")
          .value.trim();
        if (!url || !performers) {
          throw new Error("Ссылка YouTube и Исполнитель обязательны");
        }
        payload = {
          youtube_url: url,
          performers: performers,
          lead_performer: document.getElementById("edit-lead-performer").value,
          conductor: document.getElementById("edit-conductor").value,
          recording_year:
            parseInt(document.getElementById("edit-rec-year").value) || null,
        };
      } else if (type === "playlist_create" || type === "playlist_edit") {
        payload = { name: document.getElementById("edit-playlist-name").value };
      } else if (type === "profile") {
        // НОВЫЙ БЛОК
        payload = {
          display_name: document.getElementById("edit-display-name").value,
        };
      }

      await onSave(payload);

      // ЛОГИКА ДЛЯ ЗАГРУЗКИ АВАТАРА
      const avatarInput = document.getElementById("edit-profile-avatar");
      if (type === "profile" && avatarInput && avatarInput.files.length > 0) {
        newBtn.textContent = "Загрузка фото...";
        const fd = new FormData();
        fd.append("file", avatarInput.files[0]);

        // Добавляем timestamp к URL, чтобы избежать кэширования на клиенте
        await window.apiRequest("/api/users/me/avatar", "POST", fd);

        window.showNotification("Фото профиля обновлено", "success");

        // Даем небольшую задержку перед перезагрузкой
        setTimeout(() => window.location.reload(), 300);
        return;
      }

      const fileInput = document.getElementById("edit-cover-file");
      if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fd = new FormData();
        fd.append("file", file);

        let uploadUrl = "";
        if (type === "composer")
          uploadUrl = `/api/recordings/composers/${data.id}/cover`;
        if (type === "work")
          uploadUrl = `/api/recordings/works/${data.id}/cover`;
        if (type === "composition")
          uploadUrl = `/api/recordings/compositions/${data.id}/cover`;

        if (uploadUrl) {
          newBtn.textContent = "Загрузка обложки...";
          await window.apiRequest(uploadUrl, "POST", fd);
        }
      }

      modal.classList.add("hidden");
      window.showNotification("Успешно сохранено!", "success");

      if (type === "composer" || type === "work" || type === "composition") {
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (e) {
      window.showNotification("Ошибка: " + e.message, "error");
    } finally {
      newBtn.disabled = false;
      newBtn.textContent = originalText;
    }
  };

  modal.classList.remove("hidden");
}

export function showDeleteModal({
  title,
  text,
  verificationString = null,
  onConfirm,
}) {
  const modal = document.getElementById("delete-modal");
  if (!modal) return;

  const oldBtn = document.getElementById("confirm-delete-btn");
  const btn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(btn, oldBtn);

  btn.textContent = "Удалить навсегда";
  btn.classList.remove("opacity-75", "cursor-wait");
  btn.disabled = false;

  document.getElementById("delete-modal-title").textContent = title;
  document.getElementById("delete-modal-text").innerHTML = text;

  const input = document.getElementById("delete-verification-input");
  const cont = document.getElementById("delete-verification-container");

  if (verificationString) {
    cont.classList.remove("hidden");
    document.getElementById("delete-verification-target").textContent =
      verificationString;
    input.value = "";
    btn.disabled = true;
    btn.classList.add("opacity-50", "cursor-not-allowed");

    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    newInput.oninput = (e) => {
      const match = e.target.value === verificationString;
      btn.disabled = !match;
      if (match) btn.classList.remove("opacity-50", "cursor-not-allowed");
      else btn.classList.add("opacity-50", "cursor-not-allowed");
    };
  } else {
    cont.classList.add("hidden");
    btn.disabled = false;
    btn.classList.remove("opacity-50", "cursor-not-allowed");
  }

  btn.onclick = async (e) => {
    e.preventDefault();

    const originalText = btn.textContent;
    btn.textContent = "Удаление...";
    btn.disabled = true;
    btn.classList.add("opacity-75", "cursor-wait");

    try {
      await onConfirm();
    } catch (err) {
      console.error("Delete failed:", err);

      btn.textContent = originalText;
      btn.disabled = false;
      btn.classList.remove("opacity-75", "cursor-wait");

      if (window.showNotification) {
        window.showNotification(err.message || "Ошибка удаления", "error");
      } else {
        alert(err.message);
      }
    }
  };

  modal.classList.remove("hidden");
  modal.classList.remove("opacity-0");
}

export function showNotification(m, t) {
  // 1. Проверяем, виден ли полноэкранный мобильный плеер
  const mobilePlayer = document.getElementById("mobile-full-player");
  const isMobilePlayerVisible =
    mobilePlayer && !mobilePlayer.classList.contains("translate-y-full");

  // 2. Выбираем правильный контейнер
  const containerId = isMobilePlayerVisible
    ? "full-player-notification-container"
    : "notification-container";

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Notification container #${containerId} not found!`);
    return;
  }

  // 3. Создаем и добавляем уведомление (остальная логика та же)
  const notificationDiv = document.createElement("div");

  // Добавляем pointer-events-auto, чтобы на само уведомление можно было нажать (если понадобится)
  notificationDiv.className = `${
    t === "error" ? "bg-red-500" : "bg-slate-800"
  } text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce mb-2 pointer-events-auto`;

  notificationDiv.innerHTML = `<span>${m}</span>`;

  container.appendChild(notificationDiv);

  setTimeout(() => {
    notificationDiv.remove();
  }, 3000);
}

export function showContextMenu(x, y, menu) {
  if (!menu) return;
  menu.style.left = "-9999px";
  menu.style.top = "-9999px";
  menu.style.display = "block";
  menu.classList.remove("hidden");

  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    let newX, newY;

    newX = x - rect.width;
    if (newX < 10) {
      newX = 10;
    }
    newY = y;
    if (y + rect.height > winHeight) {
      newY = y - rect.height - 10; // 10 - отступ
    }

    menu.style.left = `${newX}px`;
    menu.style.top = `${newY}px`;
  });
}

export function hideContextMenu(menu) {
  if (!menu) return;
  menu.style.display = "none";
  menu.classList.add("hidden");
}

export function initPlayerToggle() {
  const player = document.getElementById("music-player");
  const closeBtnDesktop = document.getElementById("player-toggle-btn");
  const closeBtnMobile = document.getElementById("player-toggle-btn-mobile");

  const restoreBtn = document.getElementById("restore-player-btn");
  const mainContent = document.getElementById("main-content");

  if (!player) return;

  const closePlayer = () => {
    player.classList.remove("player-expanded");
    player.classList.add("player-collapsed");

    if (mainContent) mainContent.classList.remove("pb-98");

    if (restoreBtn) {
      restoreBtn.classList.remove(
        "opacity-0",
        "translate-y-20",
        "pointer-events-none"
      );
      if (window.lucide) window.lucide.createIcons();
    }
  };

  if (closeBtnDesktop) closeBtnDesktop.onclick = closePlayer;
  if (closeBtnMobile) closeBtnMobile.onclick = closePlayer;

  if (restoreBtn) {
    restoreBtn.onclick = () => {
      openPlayer();
    };
  }
}

export function openPlayer() {
  const player = document.getElementById("music-player");
  const mainContent = document.getElementById("main-content");
  const restoreBtn = document.getElementById("restore-player-btn");

  if (!player) return;

  player.classList.remove("player-collapsed");
  player.classList.add("player-expanded");

  if (mainContent) {
    mainContent.classList.add("pb-[98px]");
  }

  if (restoreBtn) {
    restoreBtn.classList.add(
      "opacity-0",
      "translate-y-20",
      "pointer-events-none"
    );
  }
}

export function renderPlaylistsOverview(playlists) {
  const { listEl } = getElements();
  const viewTitle = document.getElementById("view-title-container");
  viewTitle.classList.remove("hidden");

  viewTitle.innerHTML = `
        <div class="w-full mb-8 border-b border-gray-200 pb-4 flex items-center justify-between gap-4">
            <h2 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <i data-lucide="list-music" class="w-8 h-8 text-cyan-600"></i>
                <span>Мои плейлисты</span>
            </h2>

            <button id="create-new-playlist-btn" class="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 transition-all text-sm font-bold whitespace-nowrap">
                <i data-lucide="plus" class="w-4 h-4"></i> <span>Создать</span>
            </button>
        </div>
    `;

  if (!playlists || !playlists.length) {
    listEl.innerHTML =
      '<div class="max-w-7xl mx-auto px-6 py-12 text-center text-gray-500 italic bg-gray-50 rounded-xl border border-dashed border-gray-300">У вас пока нет плейлистов.</div>';
  } else {
    const cards = playlists
      .map(
        (p) => `
        <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group relative">
            <a href="/playlists/${p.id}" data-navigo class="block mb-4">
                <div class="aspect-square bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-inner mb-4 group-hover:scale-105 transition-transform duration-300">
                    <i data-lucide="music" class="w-12 h-12 opacity-50"></i>
                </div>
                <h3 class="font-bold text-gray-800 text-lg truncate group-hover:text-cyan-600 transition-colors">${
                  p.name
                }</h3>
                <p class="text-xs text-gray-400 font-medium">${
                  p.recordings ? p.recordings.length : 0
                } ${pluralize(p.recordings ? p.recordings.length : 0, [
          "запись",
          "записи",
          "записей",
        ])}</p>
            </a>

            <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button class="edit-playlist-btn p-2 bg-white rounded-lg shadow-md text-gray-600 hover:text-cyan-600" data-id="${
                  p.id
                }" data-name="${p.name}" title="Переименовать">
                    <i data-lucide="edit-2" class="w-4 h-4"></i>
                </button>
                <button class="delete-playlist-btn p-2 bg-white rounded-lg shadow-md text-red-400 hover:text-red-600" data-id="${
                  p.id
                }" data-name="${p.name}" title="Удалить">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `
      )
      .join("");

    listEl.innerHTML = `<div class="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 px-6 pb-10">${cards}</div>`;
  }
  if (window.lucide) window.lucide.createIcons();
}

export function updateSelectionBar(count, context) {
  const bar = document.getElementById("selection-bar");
  const countEl = document.getElementById("selection-count");
  const queueNextBtn = document.getElementById("bulk-play-next-btn"); // Играть следующим
  const queueEndBtn = document.getElementById("bulk-add-queue-btn"); // В конец
  const playlistBtn = document.getElementById("bulk-add-playlist-btn");
  const editBtn = document.getElementById("bulk-edit-btn");
  const delBtn = document.getElementById("bulk-delete-btn");
  const delText = document.getElementById("bulk-delete-text");

  if (!bar) return;

  const isLoggedIn = !!localStorage.getItem("access_token");
  const isAdmin = localStorage.getItem("is_admin") === "true";

  if (count > 0) {
    bar.classList.remove("translate-y-full");
    countEl.textContent = `${count}`;
    queueNextBtn.classList.remove("hidden");
    queueEndBtn.classList.remove("hidden");

    if (isLoggedIn) {
      playlistBtn.classList.remove("hidden");
    } else {
      playlistBtn.classList.add("hidden");
    }

    if (isAdmin && count === 1) {
      editBtn.classList.remove("hidden");
    } else {
      editBtn.classList.add("hidden");
    }

    if (context === "playlist") {
      delBtn.classList.remove("hidden");
      if (delText) delText.textContent = "Убрать";
    } else {
      if (isAdmin) {
        delBtn.classList.remove("hidden");
        if (delText) delText.textContent = "Удалить";
      } else {
        delBtn.classList.add("hidden");
      }
    }

    if (window.lucide) window.lucide.createIcons();
  } else {
    bar.classList.add("translate-y-full");
  }
}

export function showSelectPlaylistModal(playlists, onSelect) {
  const modal = document.getElementById("edit-modal");
  const content = document.getElementById("edit-modal-content");
  const title = document.getElementById("edit-modal-title");
  const confirmBtn = document.getElementById("confirm-edit-btn");

  confirmBtn.classList.add("hidden");

  title.textContent = "Добавить в плейлист";

  if (!playlists || playlists.length === 0) {
    content.innerHTML =
      '<p class="text-center text-gray-500">Нет доступных плейлистов</p>';
  } else {
    const list = playlists
      .map(
        (p) => `
            <div class="playlist-option p-3 hover:bg-cyan-50 border-b border-gray-100 last:border-0 cursor-pointer flex items-center gap-3 transition-colors" data-pid="${p.id}">
                <div class="bg-cyan-100 p-2 rounded-lg text-cyan-600"><i data-lucide="list-music" class="w-5 h-5"></i></div>
                <span class="font-bold text-gray-700">${p.name}</span>
            </div>
        `
      )
      .join("");
    content.innerHTML = `<div class="border rounded-xl overflow-hidden">${list}</div>`;

    content.querySelectorAll(".playlist-option").forEach((el) => {
      el.onclick = () => {
        onSelect(el.dataset.pid);
        modal.classList.add("hidden");
        confirmBtn.classList.remove("hidden");
      };
    });
  }

  const closeBtn = modal.querySelector(".close-button");
  const tempClose = () => {
    confirmBtn.classList.remove("hidden");
  };
  closeBtn.addEventListener("click", tempClose, { once: true });

  modal.classList.remove("hidden");
}

export function showFullPlayerPlaylistModal(playlists, onSelect) {
  const modal = document.getElementById("full-player-playlist-modal");
  const content = document.getElementById("full-player-playlist-content");
  const closeBtn = modal.querySelector(".close-button");

  if (!modal || !content || !closeBtn) return;

  const closeModal = () => {
    modal.classList.add("opacity-0");
    setTimeout(() => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }, 300);
  };

  // Важно: создаем клон кнопки, чтобы очистить старые обработчики
  const newCloseBtn = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
  newCloseBtn.onclick = closeModal;

  if (!playlists || playlists.length === 0) {
    content.innerHTML =
      '<p class="text-center text-gray-500 p-8">У вас нет плейлистов.</p>';
  } else {
    const list = playlists
      .map(
        (p) => `
            <div class="playlist-option-fp p-3 hover:bg-cyan-50 rounded-lg cursor-pointer flex items-center gap-3 transition-colors" data-pid="${p.id}">
                <div class="bg-cyan-100 p-2 rounded-lg text-cyan-600"><i data-lucide="list-music" class="w-5 h-5"></i></div>
                <span class="font-bold text-gray-700">${p.name}</span>
            </div>
        `
      )
      .join("");
    content.innerHTML = `<div class="space-y-1">${list}</div>`;

    content.querySelectorAll(".playlist-option-fp").forEach((el) => {
      el.onclick = () => {
        onSelect(el.dataset.pid);
        closeModal();
      };
    });
  }

  modal.classList.remove("hidden", "opacity-0");
  modal.classList.add("flex"); // Используем flex для выравнивания

  if (window.lucide) window.lucide.createIcons();
}

export function renderSearchResults(data, favoriteIds = new Set()) {
  const { listEl } = getElements();
  const viewTitle = document.getElementById("view-title-container");

  // Шапка
  viewTitle.classList.remove("hidden");
  viewTitle.innerHTML = `
        <div class="w-full mb-8 border-b border-gray-200 pb-4">
            <h2 class="text-3xl font-bold text-gray-900">
                Результаты поиска: <span class="text-cyan-600">"${data.query}"</span>
            </h2>
        </div>
    `;

  let htmlContent = "";
  let hasResults = false;

  // 1. Композиторы
  if (data.composers.length > 0) {
    hasResults = true;
    const items = data.composers
      .map(
        (c) => `
            <a href="/composers/${c.slug || c.id}" data-navigo
               class="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-cyan-300 hover:shadow-md transition-all group">
                <img src="${
                  c.portrait_url || "/static/img/placeholder.png"
                }" class="w-16 h-16 rounded-full object-cover">
                <div>
                    <h4 class="font-bold text-gray-800 group-hover:text-cyan-600 transition-colors">${
                      c.name_ru
                    }</h4>
                    <p class="text-xs text-gray-500">${
                      c.original_name || ""
                    }</p>
                </div>
            </a>
        `
      )
      .join("");

    htmlContent += `
            <div class="mb-10">
                <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><i data-lucide="users" class="w-5 h-5 text-cyan-600"></i> Композиторы</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${items}</div>
            </div>
        `;
  }

  // 2. Произведения
  if (data.works.length > 0) {
    hasResults = true;
    const items = data.works
      .map(
        (w) => `
            <a href="/works/${w.slug || w.id}" data-navigo
               class="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-cyan-300 hover:shadow-md transition-all group">
                <div class="w-12 h-12 bg-cyan-50 rounded-lg flex items-center justify-center text-cyan-600 flex-shrink-0">
                    <i data-lucide="book-open" class="w-6 h-6"></i>
                </div>
                <div>
                    <h4 class="font-bold text-gray-800 group-hover:text-cyan-600 transition-colors">${
                      w.name_ru
                    }</h4>
                    <p class="text-sm text-gray-500">${w.composer.name_ru}</p>
                </div>
            </a>
        `
      )
      .join("");

    htmlContent += `
            <div class="mb-10">
                <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><i data-lucide="book" class="w-5 h-5 text-cyan-600"></i> Произведения</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${items}</div>
            </div>
        `;
  }

  // 3. Части (Compositions)
  if (data.compositions.length > 0) {
    hasResults = true;
    const items = data.compositions
      .map(
        (c) => `
            <a href="/compositions/${c.slug || c.id}" data-navigo
               class="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-cyan-300 transition-all group">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">${
                      c.catalog_number || "#"
                    }</div>
                    <div class="truncate">
                        <div class="font-semibold text-gray-800 group-hover:text-cyan-600 truncate">${
                          c.title_ru
                        }</div>
                        <div class="text-xs text-gray-400 truncate">${
                          c.work.composer.name_ru
                        } — ${c.work.name_ru}</div>
                    </div>
                </div>
                <i data-lucide="chevron-right" class="w-4 h-4 text-gray-300"></i>
            </a>
        `
      )
      .join("");

    htmlContent += `
            <div class="mb-10">
                <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><i data-lucide="music" class="w-5 h-5 text-cyan-600"></i> Части</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${items}</div>
            </div>
        `;
  }

  // 4. Записи (Recordings)
  if (data.recordings.length > 0) {
    hasResults = true;
    const items = data.recordings
      .map((r, i) => {
        const isFav = favoriteIds.has(r.id);
        return `
            <div class="recording-item group flex items-center p-3 hover:bg-cyan-50 bg-white border-b border-gray-100 last:border-0 transition-colors cursor-pointer"
                 data-recording-id="${r.id}" data-index="${i}">
                 <div class="w-10 flex justify-center items-center text-cyan-600 recording-play-pause-btn hover:scale-110 transition-transform" id="list-play-btn-${
                   r.id
                 }">
                    <i data-lucide="play" class="w-5 h-5 fill-current"></i>
                 </div>
                 <div class="flex-1 ml-4 min-w-0">
                     <div class="font-bold text-gray-800 text-sm truncate">${
                       r.performers
                     }</div>
                     <div class="text-xs text-gray-500 truncate">${
                       r.composition.title_ru
                     } (${r.composition.work.composer.name_ru})</div>
                 </div>
                 <button class="favorite-btn p-2 ${
                   isFav ? "text-red-500" : "text-gray-300 hover:text-red-400"
                 }" data-recording-id="${r.id}">
                     <i data-lucide="heart" class="w-4 h-4 ${
                       isFav ? "fill-current" : ""
                     }"></i>
                 </button>
            </div>
            `;
      })
      .join("");

    htmlContent += `
            <div class="mb-10">
                <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><i data-lucide="disc" class="w-5 h-5 text-cyan-600"></i> Исполнения</h3>
                <div class="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">${items}</div>
            </div>
        `;
  }

  if (!hasResults) {
    listEl.innerHTML = `<div class="text-center py-20 text-gray-500 text-lg">Ничего не найдено по запросу "${data.query}"</div>`;
  } else {
    listEl.innerHTML = `<div class="max-w-7xl mx-auto px-6">${htmlContent}</div>`;
  }

  if (window.lucide) window.lucide.createIcons();
}
export function renderLibraryHub() {
  const { listEl } = getElements();
  const viewTitle = document.getElementById("view-title-container");
  if (viewTitle) {
    viewTitle.classList.remove("hidden");
    viewTitle.innerHTML = `
        <div class="text-center">
            <h2 class="text-3xl font-bold text-gray-800 mb-2">Медиатека</h2>
            <p class="text-gray-500">Выберите формат материалов</p>
        </div>`;
  }

  const html = `
    <div class="max-w-5xl mx-auto px-6 py-10">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- КАРТОЧКА АУДИО -->
            <a href="/recordings/audio" data-navigo
               class="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all p-8 h-64 flex flex-col justify-between">
                <div class="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

                <div>
                    <div class="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                        <i data-lucide="disc" class="w-6 h-6 text-white"></i>
                    </div>
                    <h3 class="text-3xl font-bold mb-2">Аудиозаписи</h3>
                    <p class="text-blue-100 font-medium">Коллекция аудиофайлов. Слушайте в плеере.</p>
                </div>

                <div class="flex items-center gap-2 font-bold text-sm uppercase tracking-wider opacity-80 group-hover:opacity-100">
                    Перейти <i data-lucide="arrow-right" class="w-4 h-4"></i>
                </div>
            </a>

            <!-- КАРТОЧКА ВИДЕО -->
            <a href="/recordings/video" data-navigo
               class="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all p-8 h-64 flex flex-col justify-between">
                <div class="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

                <div>
                    <div class="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                        <i data-lucide="youtube" class="w-6 h-6 text-white"></i>
                    </div>
                    <h3 class="text-3xl font-bold mb-2">Видеозал</h3>
                    <p class="text-red-100 font-medium">Живые исполнения и видеозаписи концертов.</p>
                </div>

                <div class="flex items-center gap-2 font-bold text-sm uppercase tracking-wider opacity-80 group-hover:opacity-100">
                    Смотреть <i data-lucide="arrow-right" class="w-4 h-4"></i>
                </div>
            </a>
        </div>

        <div class="mt-12 text-center">
            <p class="text-gray-400 text-sm">Или перейдите к своим <a href="/playlists" data-navigo class="text-cyan-600 hover:underline font-bold">плейлистам</a></p>
        </div>
    </div>
  `;

  listEl.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}
function initQuill(selectorId, content) {
  const container = document.querySelector(selectorId);
  if (!container) return;

  if (container.classList.contains("ql-container")) {
    const parent = container.parentNode;
    const oldToolbar = parent.querySelector(".ql-toolbar");
    if (oldToolbar) {
      oldToolbar.remove();
    }

    const newDiv = document.createElement("div");
    newDiv.id = selectorId.replace("#", "");

    let originalClasses = container.className
      .replace("ql-container", "")
      .replace("ql-snow", "")
      .trim();
    if (!originalClasses) {
      originalClasses = selectorId.includes("work") ? "h-48" : "h-64";
    }
    newDiv.className = originalClasses;

    parent.innerHTML = "";
    parent.appendChild(newDiv);
  }

  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await window.apiRequest(
          "/api/blog/upload-image",
          "POST",
          fd
        );
        const range = window.quillEditor.getSelection(true);
        window.quillEditor.insertEmbed(range.index, "image", res.url);
        window.quillEditor.setSelection(range.index + 1);
      } catch (e) {
        alert("Ошибка: " + e.message);
      }
    };
  };

  const audioHandler = () => {
    const id = prompt("Введите ID записи (число):");
    if (id && !isNaN(parseInt(id))) {
      const range = window.quillEditor.getSelection(true);
      const url = `/api/recordings/stream/${id}`;
      window.quillEditor.insertEmbed(range.index, "audio", url);
      window.quillEditor.setSelection(range.index + 1);
    } else if (id) {
      alert("Нужно ввести числовой ID записи");
    }
  };

  window.quillEditor = new Quill(selectorId, {
    theme: "snow",
    placeholder: "Введите текст...",
    modules: {
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ align: [] }],
          ["link", "image", "video", "audio"],
          ["clean"],
        ],
        handlers: {
          image: imageHandler,
          audio: audioHandler,
        },
      },
    },
  });

  const wrapper = document.querySelector(selectorId).parentElement;
  const toolbar = wrapper.querySelector(".ql-toolbar");

  if (toolbar) {
    const audioBtn = toolbar.querySelector(".ql-audio");
    if (audioBtn) {
      audioBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #444;">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
            </svg>
          `;
      audioBtn.onmouseenter = () =>
        (audioBtn.querySelector("svg").style.color = "#06b6d4");
      audioBtn.onmouseleave = () =>
        (audioBtn.querySelector("svg").style.color = "#444");
    }
  }

  if (content && content !== "null" && content !== "undefined") {
    window.quillEditor.clipboard.dangerouslyPasteHTML(0, content);
  }
}

// --- БЛОГ ---

export async function renderBlogList(posts, allTags = [], activeTag = null) {
  const { listEl } = getElements();
  const viewTitle = document.getElementById("view-title-container");
  viewTitle.classList.remove("hidden");

  const addBtn = isAdmin()
    ? `<button id="create-post-btn" class="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all"><i data-lucide="plus" class="w-4 h-4"></i> Написать</button>`
    : "";

  let tagsHtml = `
    <a href="/blog" data-navigo
       class="px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
         !activeTag
           ? "bg-cyan-600 text-white shadow-sm"
           : "bg-gray-100 text-gray-700 hover:bg-gray-200"
       }">
       Все статьи
    </a>`;

  if (allTags.length > 0) {
    tagsHtml += allTags
      .map(
        (tag) => `
      <a href="/blog/tag/${tag.name}" data-navigo
         class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
           activeTag === tag.name
             ? "bg-cyan-600 text-white shadow-sm"
             : "bg-gray-100 text-gray-700 hover:bg-gray-200"
         }">
         ${tag.name}
      </a>
    `
      )
      .join("");
  }
  const tagsFilterBar = `<div class="flex flex-wrap gap-2 mb-8">${tagsHtml}</div>`;

  viewTitle.innerHTML = `
        <div class="w-full mb-8 border-b border-gray-200 pb-4 flex items-center justify-between gap-4">
            <h2 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <i data-lucide="newspaper" class="w-8 h-8 text-cyan-600"></i>
                <span>Блог</span>
            </h2>
            ${addBtn}
        </div>
        ${tagsFilterBar}
    `;

  if (!posts || posts.length === 0) {
    listEl.innerHTML =
      '<div class="max-w-4xl mx-auto px-6 text-center py-20 text-gray-400">Статей пока нет</div>';
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  const featuredDate = new Date(featuredPost.created_at).toLocaleDateString(
    "ru-RU",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
  const featuredCover =
    featuredPost.cover_image_url || "/static/img/placeholder.png";

  const featuredTagsHtml =
    featuredPost.tags && featuredPost.tags.length > 0
      ? `<div class="flex flex-wrap gap-2 mb-3 relative z-10">
         ${featuredPost.tags
           .map(
             (tag) =>
               `<span class="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-bold border border-white/10 transition-colors shadow-sm">${tag.name}</span>`
           )
           .join("")}
       </div>`
      : "";

  const featuredControls = isAdmin()
    ? `
    <div class="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <button class="edit-post-btn bg-white/90 p-3 rounded-xl shadow-lg text-gray-700 hover:text-cyan-600 backdrop-blur-sm" data-slug="${featuredPost.slug}" title="Редактировать">
            <i data-lucide="edit-2" class="w-5 h-5"></i>
        </button>
        <button class="delete-post-btn bg-white/90 p-3 rounded-xl shadow-lg text-red-500 hover:text-red-700 backdrop-blur-sm" data-id="${featuredPost.id}" title="Удалить">
            <i data-lucide="trash-2" class="w-5 h-5"></i>
        </button>
    </div>
  `
    : "";

  const featuredHtml = `
    <!-- aspect-square (квадрат) для мобильных, md:aspect-[2.4/1] (широкий) для ПК -->
    <div class="group relative mb-12 w-full aspect-square md:aspect-[2.4/1] rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 transform translate-z-0">
        <a href="/blog/${
          featuredPost.slug
        }" data-navigo class="block absolute inset-0">
            
            <!-- Фон -->
            <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style="background-image: url('${featuredCover}')"></div>
            
            <!-- Градиент -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
            
            <!-- Контент -->
            <div class="absolute inset-0 p-5 md:p-10 flex flex-col justify-end text-white">
                
                <!-- Дата -->
                <div class="text-xs font-bold uppercase tracking-wider opacity-80 mb-2 flex items-center gap-2">
                    <i data-lucide="calendar" class="w-3 h-3"></i> ${featuredDate}
                </div>
                
                <!-- Теги -->
                ${featuredTagsHtml}

                <!-- Заголовок -->
                <h2 class="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight drop-shadow-lg mb-2 line-clamp-4 md:line-clamp-none">
                    ${featuredPost.title}
                </h2>
                
                <!-- Описание -->
                <p class="text-sm md:text-lg opacity-90 leading-relaxed line-clamp-2 max-w-3xl font-medium text-gray-200">
                  ${featuredPost.summary || ""}
                </p>
            </div>
        </a>
        ${featuredControls}
    </div>
  `;

  let otherPostsHtml = "";
  if (otherPosts.length > 0) {
    const cards = otherPosts
      .map((post) => {
        const date = new Date(post.created_at).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const cover = post.cover_image_url || "/static/img/placeholder.png";
        const controls = isAdmin()
          ? `
              <div class="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button class="edit-post-btn bg-white p-2 rounded-lg shadow-md text-gray-600 hover:text-cyan-600" data-slug="${post.slug}"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                  <button class="delete-post-btn bg-white p-2 rounded-lg shadow-md text-red-400 hover:text-red-600" data-id="${post.id}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
              </div>`
          : "";

        const postTagsHtml =
          post.tags.length > 0
            ? `<div class="flex flex-wrap gap-1.5 mb-3">${post.tags
                .map(
                  (tag) =>
                    `<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">${tag.name}</span>`
                )
                .join("")}</div>`
            : "";

        return `
            <a href="/blog/${
              post.slug
            }" data-navigo class="group relative flex flex-col bg-white p-4 rounded-2xl shadow-sm hover:shadow-lg transition-all border border-gray-100 h-full">
                <!-- Картинка -->
                <div class="aspect-video rounded-xl overflow-hidden bg-gray-100 mb-4 flex-shrink-0">
                    <img src="${cover}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                </div>
                
                <div class="flex-1 flex flex-col">
                    <!-- Дата -->
                    <div class="text-xs text-cyan-600 font-bold uppercase tracking-wider mb-2">${date}</div>
                    
                    <!-- Теги -->
                    ${postTagsHtml}
                    
                    <!-- ЗАГОЛОВОК -->
                    <h3 class="text-lg md:text-xl font-bold text-gray-900 mb-2 group-hover:text-cyan-700 transition-colors line-clamp-3 leading-tight">
                      ${post.title}
                    </h3>
                    
                    <!-- ОПИСАНИЕ -->
                    <p class="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2 flex-1">
                      ${post.summary || ""}
                    </p>
                    
                    <!-- Кнопка "Читать далее" -->
                    <div class="mt-auto text-cyan-600 font-bold text-sm flex items-center gap-1">
                        Читать далее <i data-lucide="arrow-right" class="w-4 h-4"></i>
                    </div>
                </div>
                ${controls}
            </a>`;
      })
      .join("");

    otherPostsHtml = `<div class="grid grid-cols-1 md:grid-cols-2 gap-8">${cards}</div>`;
  }

  listEl.innerHTML = `<div class="max-w-5xl mx-auto px-6 pb-10">${featuredHtml}${otherPostsHtml}</div>`;
  if (window.lucide) window.lucide.createIcons();
}

export async function renderBlogPost(post) {
  const { listEl } = getElements();
  document.getElementById("view-title-container").classList.add("hidden");

  const date = new Date(post.created_at).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // 1. ШАПКА
  const header = `
        <div class="max-w-4xl mx-auto px-6 pt-10">
            <div class="text-center mb-8">
                <div class="text-sm font-bold text-cyan-600 uppercase tracking-wider mb-3">${date}</div>
                <h1 class="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-6">${post.title}</h1>
            </div>
        </div>
    `;

  // 2. КОНТЕНТ
  const content = `
        <div class="max-w-4xl mx-auto px-6 pb-20">
            <div class="prose prose-lg prose-cyan max-w-none text-gray-800 leading-relaxed
                        [&_img]:rounded-3xl [&_img]:shadow-xl [&_img]:border [&_img]:border-gray-100 [&_img]:w-full [&_img]:mx-auto [&_img]:my-8
                        [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-2xl [&_iframe]:shadow-lg [&_iframe]:mx-auto [&_iframe]:my-8">
                ${post.content}
            </div>
        </div>
    `;

  listEl.innerHTML = header + content;

  const audioElements = Array.from(document.querySelectorAll(".prose audio"));

  if (audioElements.length > 0) {
    if (typeof Plyr === "undefined") {
      await new Promise((resolve) => {
        const check = () => (window.Plyr ? resolve() : setTimeout(check, 50));
        check();
      });
    }

    audioElements.map(
      (p) =>
        new Plyr(p, {
          controls: ["play", "progress", "current-time", "mute", "volume"],
          seekTime: 10,
        })
    );
  }

  if (window.lucide) window.lucide.createIcons();
}

export async function showBlogModal(post = null) {
  const modal = document.getElementById("blog-modal");
  modal.classList.remove("hidden");

  document.getElementById("blog-post-id").value = post ? post.id : "";
  const titleInput = document.getElementById("blog-title");
  const slugInput = document.getElementById("blog-slug");

  titleInput.value = post ? post.title : "";
  slugInput.value = post ? post.slug : "";
  document.getElementById("blog-summary").value = post ? post.summary : "";
  document.getElementById("blog-cover").value = "";
  document.getElementById("blog-modal-title").textContent = post
    ? "Редактировать статью"
    : "Новая статья";
  document.getElementById("blog-meta-desc").value = post
    ? post.meta_description
    : "";
  document.getElementById("blog-keywords").value = post
    ? post.meta_keywords
    : "";

  const tagsInput = document.getElementById("blog-tags");
  tagsInput.value =
    post && post.tags ? post.tags.map((t) => t.name).join(", ") : "";

  await loadAndInitQuill("#blog-content", post ? post.content : "");

  titleInput.oninput = (e) => {
    if (!post) {
      slugInput.value = slugify(e.target.value);
    }
  };

  const closeBtn = modal.querySelector(".close-button");
  const newClose = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newClose, closeBtn);
  newClose.onclick = () => modal.classList.add("hidden");
}

export function renderLibraryPageStructure(title, composers) {
  const { listEl } = getElements();
  const viewTitle = document.getElementById("view-title-container");
  viewTitle.classList.add("hidden");

  // ГЕНЕРАЦИЯ ЖАНРОВ
  const sidebarGenresHtml = [
    { label: "Симфонии", value: "Symphony", icon: "music-2" },
    { label: "Концерты", value: "Concerto", icon: "mic-2" },
    { label: "Сонаты", value: "Sonata", icon: "book-open" },
    { label: "Опера", value: "Opera", icon: "mic" },
    { label: "Камерная", value: "Chamber", icon: "users" },
    { label: "Фортепиано", value: "Piano", icon: "music" },
    { label: "Духовная", value: "Mass", icon: "church" },
  ]
    .map(
      (g) => `
        <button onclick="window.applyLibraryFilter('genre', '${g.value}')"
                data-filter-type="genre" 
                data-filter-value="${g.value}"
                class="w-full text-left px-3 py-2 rounded-lg text-gray-600 hover:bg-cyan-50 hover:text-cyan-700 transition-colors flex items-center gap-3 text-sm font-medium">
            <i data-lucide="${g.icon}" class="w-4 h-4 text-gray-400 group-hover:text-cyan-600"></i>
            ${g.label}
        </button>
    `
    )
    .join("");

  // ГЕНЕРАЦИЯ ЭПОХ
  const sidebarEpochsHtml = [
    { label: "Ренессанс", value: "renaissance", icon: "scroll" },
    { label: "Барокко", value: "baroque", icon: "landmark" },
    { label: "Классицизм", value: "classical", icon: "columns-2" },
    { label: "Романтизм", value: "romantic", icon: "flame" },
    { label: "XX век / Модерн", value: "modern", icon: "radio-tower" },
  ]
    .map(
      (e) => `
        <button onclick="window.applyLibraryFilter('epoch', '${e.value}')"
                data-filter-type="epoch" 
                data-filter-value="${e.value}"
                class="w-full text-left px-3 py-2 rounded-lg text-gray-600 hover:bg-cyan-50 hover:text-cyan-700 transition-colors flex items-center gap-3 text-sm font-medium group">
            <i data-lucide="${e.icon}" class="w-4 h-4 text-gray-400 group-hover:text-cyan-600"></i>
            <span>${e.label}</span>
        </button>
    `
    )
    .join("");

  const viewToggleHtml =
    title === "Аудиоархив"
      ? `
    <div class="flex bg-gray-50 p-1 rounded-xl border border-gray-200 flex-shrink-0">
        <button class="view-mode-btn p-2 rounded-lg transition-colors ${
          window.state.libraryFilters.viewMode === "list"
            ? "bg-cyan-100 text-cyan-700"
            : "text-gray-500 hover:bg-gray-100"
        }" data-mode="list" onclick="window.setLibraryViewMode('list')" title="Список">
            <i data-lucide="list" class="w-4 h-4"></i>
        </button>
        <button class="view-mode-btn p-2 rounded-lg transition-colors ${
          window.state.libraryFilters.viewMode === "grid"
            ? "bg-cyan-100 text-cyan-700"
            : "text-gray-500 hover:bg-gray-100"
        }" data-mode="grid" onclick="window.setLibraryViewMode('grid')" title="Сетка">
            <i data-lucide="layout-grid" class="w-4 h-4"></i>
        </button>
    </div>`
      : "";

  const layoutHtml = `
    <div class="max-w-[1600px] mx-auto px-6 pb-20">
        <div class="flex flex-col lg:flex-row gap-8 items-start">

            <!-- === ЛЕВЫЙ САЙДБАР === -->
            <aside class="hidden lg:block w-64 flex-shrink-0 sticky top-4 space-y-8">
                <div class="px-2">
                    <h2 class="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
                        <i data-lucide="${
                          title === "Видеозал" ? "youtube" : "disc"
                        }" class="w-6 h-6 ${
    title === "Видеозал" ? "text-red-600" : "text-cyan-600"
  }"></i>
                        <span>${title}</span>
                    </h2>
                    <p class="text-xs text-gray-400 font-medium uppercase tracking-wider">Библиотека</p>
                </div>

                <!-- КАТЕГОРИИ (ЖАНРЫ) -->
                <div>
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Категории</h3>
                    <div class="space-y-1">
                        <button onclick="window.applyLibraryFilter('genre', '')" 
                                data-filter-type="genre" 
                                data-filter-value=""
                                class="w-full text-left px-3 py-2 rounded-lg bg-gray-100 text-gray-900 font-bold flex items-center gap-3 text-sm">
                            <i data-lucide="layout-grid" class="w-4 h-4 text-cyan-600"></i> Все записи
                        </button>
                        ${sidebarGenresHtml}
                    </div>
                </div>

                <!-- ЭПОХИ -->
                <div>
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Эпохи</h3>
                    <div class="space-y-1">
                        <button onclick="window.applyLibraryFilter('epoch', '')" 
                                data-filter-type="epoch" 
                                data-filter-value=""
                                class="w-full text-left px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-3 text-sm font-medium">
                            <i data-lucide="infinity" class="w-4 h-4"></i> Все эпохи
                        </button>
                        ${sidebarEpochsHtml}
                    </div>
                </div>
            </aside>

            <!-- === ЦЕНТРАЛЬНАЯ ЧАСТЬ === -->
            <div class="flex-1 w-full min-w-0">
                <!-- ВЕРХНЯЯ ПАНЕЛЬ -->
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 sticky top-0 z-20 mb-6">
                    <div class="flex flex-col md:flex-row gap-3 justify-between items-center">
                        <div class="flex gap-2 w-full md:flex-1">
    <!-- Поиск -->
    <div class="relative flex-1 w-full">
        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"></i>
        <input type="text" placeholder="Поиск..." class="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-400 outline-none transition-all" onchange="window.applyLibraryFilter('search', this.value)">
    </div>
    
    <!-- Инструменты для мобильных (в одном блоке) -->
    <div class="md:hidden flex items-center flex-shrink-0 bg-gray-50 p-1 rounded-xl border border-gray-200">
        <!-- Кнопка Фильтры -->
        <button id="open-mobile-filters-btn" class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <i data-lucide="sliders-horizontal" class="w-4 h-4"></i>
        </button>
        <!-- Переключатель вида -->
        ${viewToggleHtml.replace(
          "bg-gray-50 p-1 rounded-xl border border-gray-200 flex-shrink-0",
          ""
        )}
    </div>
</div>

                        <div class="flex gap-2 w-full md:w-auto">
                            <div class="hidden md:block flex-shrink-0">${viewToggleHtml}</div>
                            
                            <!-- ВЫПАДАЮЩИЙ СПИСОК КОМПОЗИТОРОВ -->
                            <div class="relative w-full min-w-[200px]">
                                <button onclick="window.toggleComposerDropdown(event)" 
                                        class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm flex items-center justify-between hover:border-cyan-300 transition-all focus:ring-2 focus:ring-cyan-100 group">
                                    <span id="composer-filter-label" class="truncate font-medium text-gray-700">
                                        ${(() => {
                                          const selectedId =
                                            window.state.libraryFilters
                                              .composerId;
                                          if (!selectedId)
                                            return "Все композиторы";
                                          const found = composers.find(
                                            (c) => c.id == selectedId
                                          );
                                          return found
                                            ? found.name_ru
                                            : "Все композиторы";
                                        })()}
                                    </span>
                                    <i data-lucide="chevron-down" class="w-4 h-4 text-gray-400 group-hover:text-cyan-600 transition-colors"></i>
                                </button>

                                <div id="composer-custom-dropdown" class="hidden absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden animate-scale-in origin-top">
                                    <div class="max-h-64 overflow-y-auto p-1 custom-scrollbar">
                                        <div onclick="window.selectLibraryComposer('')" class="px-3 py-2 rounded-lg cursor-pointer hover:bg-cyan-50 hover:text-cyan-700 text-sm font-bold text-gray-500 mb-1">Все композиторы</div>
                                        ${composers
                                          .map((c) => {
                                            const isSelected =
                                              window.state.libraryFilters
                                                .composerId == c.id;
                                            return `<div onclick="window.selectLibraryComposer('${
                                              c.id
                                            }')" class="px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm flex justify-between items-center ${
                                              isSelected
                                                ? "bg-cyan-50 text-cyan-700 font-bold"
                                                : "text-gray-700 hover:bg-gray-50"
                                            }">
                                                <span>${c.name_ru}</span>
                                                ${
                                                  isSelected
                                                    ? '<i data-lucide="check" class="w-3 h-3"></i>'
                                                    : ""
                                                }
                                            </div>`;
                                          })
                                          .join("")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ПАНЕЛЬ ДЕЙСТВИЙ -->
                <div id="library-action-bar" class="flex items-center justify-between mb-4 px-2 hidden">
                    <div id="library-counter-container" class="text-sm text-gray-500">
                      <span id="library-total-count" class="text-gray-900 font-bold text-lg">0</span> записей
                    </div>
                    <div class="flex gap-2">
                        ${
                          title !== "Видеозал"
                            ? `
                        <button id="library-play-all-btn" class="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95"><i data-lucide="play" class="w-4 h-4 fill-current"></i> <span class="hidden sm:inline">Слушать всё</span></button>
                        `
                            : ""
                        }
                    </div>
                </div>

                <!-- СПИСОК -->
                <div id="library-results-container" class="min-h-[200px]"></div>

                <!-- ЗАГРУЗИТЬ ЕЩЕ -->
                <div id="library-load-more" class="mt-8 text-center hidden">
                    <button onclick="window.loadMoreLibrary()" class="px-8 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-full hover:bg-gray-50 hover:shadow-md transition-all">Загрузить ещё</button>
                </div>
            </div>
        </div>
    </div>`;

  listEl.innerHTML = layoutHtml;

  // ВАЖНО: Сразу вызываем обновление классов, чтобы подсветить текущее состояние
  updateSidebarActiveStates();
  populateMobileFilters();

  if (window.lucide) window.lucide.createIcons();
}

function populateMobileFilters() {
  // Находим сайдбар и контейнер в модалке
  const sidebar = document.querySelector("aside");
  const mobileContent = document.getElementById("mobile-filters-content");

  if (sidebar && mobileContent) {
    // Просто копируем HTML из сайдбара в модальное окно
    mobileContent.innerHTML = sidebar.innerHTML;

    // Удаляем лишние элементы, если они есть (например, заголовок)
    const title = mobileContent.querySelector("h2");
    if (title) title.parentElement.remove();
  }
}

export function renderLibraryContent(data, type = "list", favs, reset = false) {
  let items = [];
  let isWorkGrouped = false;

  if (Array.isArray(data)) {
    items = data;
    if (items.length > 0 && items[0].recordings) {
      isWorkGrouped = true;
    }
  } else if (data.items && data.items.length > 0 && data.items[0].recordings) {
    items = data.items;
    isWorkGrouped = true;
  } else if (data.recordings) {
    items = data.recordings;
  } else if (data.items) {
    items = data.items;
  }

  // === БЛОК СЧЕТЧIKA (ИСПРАВЛЕННЫЙ) ===
  const actionBar = document.getElementById("library-action-bar");
  // Ищем новый, стабильный контейнер
  const counterContainer = document.getElementById("library-counter-container");

  if (actionBar && counterContainer) {
    // Всегда считаем по ПОЛНОМУ списку из window.state
    const currentItems = window.state.currentViewRecordings;

    if (currentItems.length > 0) {
      actionBar.classList.remove("hidden");

      const isGrouped = currentItems[0] && currentItems[0].recordings;
      const workCount = isGrouped ? currentItems.length : 0;
      const recCount = isGrouped
        ? currentItems.reduce(
            (sum, work) => sum + (work.recordings ? work.recordings.length : 0),
            0
          )
        : currentItems.length;

      const workForms = ["произведение", "произведения", "произведений"];
      const recForms = ["запись", "записи", "записей"];

      let text = "";
      if (workCount > 0) {
        text += `<span class="text-gray-900 font-bold text-lg">${workCount} ${pluralize(
          workCount,
          workForms
        )}</span>`;
        if (recCount > 0) {
          text += `<span class="text-gray-500 text-sm ml-2">(${recCount} ${pluralize(
            recCount,
            recForms
          )})</span>`;
        }
      } else if (recCount > 0) {
        text = `<span class="text-gray-900 font-bold text-lg">${recCount} ${pluralize(
          recCount,
          recForms
        )}</span>`;
      }

      // Обновляем содержимое контейнера
      counterContainer.innerHTML = text;
    } else {
      actionBar.classList.add("hidden");
    }
  }

  const container = document.getElementById("library-results-container");
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
          <div class="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <i data-lucide="filter" class="w-12 h-12 text-gray-300 mx-auto mb-3"></i>
              <h3 class="text-lg font-medium text-gray-900">Ничего не найдено</h3>
              <p class="text-gray-500">Попробуйте изменить параметры фильтрации</p>
          </div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  let html = "";

  // === 1. АУДИОАРХИВ (Группировка по произведениям) ===
  if (isWorkGrouped) {
    if (window.state.libraryFilters.viewMode === "grid") {
      // СЕТКА АЛЬБОМОВ
      const gridCards = items
        .map((work) => {
          const cover = work.cover_art_url || "/static/img/placeholder.png";
          const recordingsCount = work.recordings ? work.recordings.length : 0;
          const uniquePerformers = new Set(
            work.recordings.map((r) => r.performers)
          ).size;

          return `
              <div class="group relative bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full overflow-hidden">
                  <div class="relative aspect-square overflow-hidden bg-gray-100">
                      <img src="${cover}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy">
                      <div class="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
    <button class="grid-work-play-btn w-12 h-12 bg-white/80 hover:bg-white text-cyan-600 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-all"
            title="Выбрать исполнение"
            onclick="window.openVersionsModal(${work.id}, null, true)">
        <i data-lucide="play" class="w-6 h-6 fill-current ml-1"></i>
    </button>
                      </div>
                      <div class="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg">
    ${recordingsCount} ${pluralize(recordingsCount, [
            "запись",
            "записи",
            "записей",
          ])}
</div>
                  </div>
                  <div class="p-4 flex flex-col flex-1">
                      <div class="mb-2">
                          <h3 class="font-bold text-gray-900 text-base leading-tight line-clamp-2">
                            <a href="/works/${
                              work.slug || work.id
                            }" data-navigo class="group-hover:text-cyan-600 transition-colors hover:underline">
                                ${getLocalizedText(work, "name", "ru")}
                            </a>
                          </h3>
                          <p class="text-xs text-gray-500 mt-1 font-medium">
                            <a href="/composers/${
                              work.composer.slug || work.composer.id
                            }" data-navigo class="hover:underline">
                                ${getLocalizedText(work.composer, "name", "ru")}
                            </a>
                          </p>
                      </div>
                      <div class="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                           <span>${uniquePerformers} исполн.</span>
                           <i data-lucide="music-2" class="w-3 h-3"></i>
                      </div>
                  </div>
              </div>
              `;
        })
        .join("");
      html = `<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-fade-in">${gridCards}</div>`;
    } else {
      // СПИСОК (АККОРДЕОН)
      html = items
        .map((work) => {
          const performances = {};
          work.recordings.forEach((rec) => {
            const key =
              (rec.performers || "Неизвестный исполнитель") +
              (rec.recording_year || "");
            if (!performances[key]) {
              performances[key] = {
                performers: rec.performers || "Неизвестный исполнитель",
                year: rec.recording_year,
                conductor: rec.conductor,
                tracks: [],
              };
            }
            performances[key].tracks.push(rec);
          });

          Object.values(performances).forEach((perf) => {
            perf.tracks.sort(
              (a, b) => a.composition.sort_order - b.composition.sort_order
            );
          });

          const cover = work.cover_art_url || "/static/img/placeholder.png";

          const performancesHtml = Object.values(performances)
            .map((perf) => {
              const yearBadge = perf.year ? `(${perf.year})` : "";

              const tracksList = perf.tracks
                .map((t) => {
                  const isFav = favs.has(t.id);
                  const isSelected =
                    window.state &&
                    window.state.selectedRecordingIds &&
                    window.state.selectedRecordingIds.has(t.id);

                  return `
                          <div class="recording-item flex items-center py-2 px-3 hover:bg-cyan-50 transition-colors group/track cursor-pointer border-b border-gray-50 last:border-0 ${
                            isSelected ? "bg-cyan-50" : ""
                          }"
                               data-recording-id="${t.id}">
                               <div class="selection-checkbox-container w-8 justify-center items-center flex-shrink-0 mr-2 transition-all ${
                                 window.state?.isSelectionMode
                                   ? "flex"
                                   : "hidden md:flex"
                               }">
        <input type="checkbox" 
               class="recording-checkbox w-4 h-4 text-cyan-600 rounded border-gray-300 focus:ring-cyan-500 cursor-pointer" 
               data-id="${t.id}" 
               ${isSelected ? "checked" : ""}>
    </div>
    ${
      isAdmin()
        ? `<div class="text-[10px] text-gray-300 font-mono w-8 text-center flex-shrink-0 select-all cursor-text mr-1">#${t.id}</div>`
        : ""
    }
                              <div class="w-8 flex justify-center text-cyan-600 recording-play-pause-btn hover:scale-110 transition-transform" id="list-play-btn-${
                                t.id
                              }">
                                  <i data-lucide="play" class="w-4 h-4 fill-current"></i>
                              </div>
                              <div class="flex-1 text-sm text-gray-700 font-medium ml-3 break-words">
                                  ${
                                    t.composition.sort_order === 0
                                      ? getLocalizedText(work, "name", "ru")
                                      : getLocalizedText(
                                          t.composition,
                                          "title",
                                          "ru"
                                        )
                                  }
                              </div>
                              <div class="flex items-center gap-3">
                                  ${
                                    isLoggedIn()
                                      ? `
                                  <button class="favorite-btn text-gray-300 hover:text-red-500" data-recording-id="${
                                    t.id
                                  }">
                                      <i data-lucide="heart" class="w-4 h-4 ${
                                        isFav ? "fill-current text-red-500" : ""
                                      }"></i>
                                  </button>`
                                      : ""
                                  }
                                  <span class="text-xs text-gray-400 font-mono">${formatDuration(
                                    t.duration
                                  )}</span>
                              </div>
                          </div>
                      `;
                })
                .join("");

              const trackIds = JSON.stringify(perf.tracks.map((t) => t.id));

              return `
                      <div class="mb-6 last:mb-0">
                          <div class="flex justify-between items-center mb-2 px-1">
                              <div>
                                  <div class="font-bold text-gray-800 text-sm flex items-start gap-2">
                                      <i data-lucide="music-4" class="w-4 h-4 text-cyan-600 flex-shrink-0 mt-1"></i>
                                      <span class="break-words">${
                                        perf.performers
                                      } ${yearBadge}</span>
                                  </div>
                                  ${
                                    perf.conductor
                                      ? `<div class="text-xs text-gray-500 ml-6">Дирижер: ${perf.conductor}</div>`
                                      : ""
                                  }
                              </div>
                              <button class="text-xs font-bold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 border border-cyan-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all active:scale-95"
                                      onclick="event.stopPropagation(); window.playPerformanceByIds(${trackIds})">
                                  <i data-lucide="play-circle" class="w-3 h-3"></i> Слушать
                              </button>
                          </div>
                          <div class="pl-2 border-l-2 border-gray-100 space-y-0.5 ml-2">
                              ${tracksList}
                          </div>
                      </div>
                  `;
            })
            .join("");

          return `
                  <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 overflow-hidden group hover:shadow-md transition-shadow">
                      <div class="p-4 bg-white cursor-pointer select-none flex items-center gap-4 relative z-10"
                           onclick="window.toggleWorkAccordion(${work.id})">
                          <img src="${cover}" class="w-14 h-14 rounded-lg object-cover shadow-sm flex-shrink-0 border border-gray-100">
                          <div class="flex-1 min-w-0">
                              <h3 class="font-bold text-gray-900 text-lg leading-tight">
                                  <a href="/works/${
                                    work.slug || work.id
                                  }" data-navigo class="hover:underline group-hover:text-cyan-600 transition-colors">
                                    ${getLocalizedText(work, "name", "ru")}
                                  </a>
                              </h3>
                              <p class="text-sm text-gray-500 mt-0.5">
                                  <a href="/composers/${
                                    work.composer.slug || work.composer.id
                                  }" data-navigo class="hover:underline">
                                    ${getLocalizedText(
                                      work.composer,
                                      "name",
                                      "ru"
                                    )}
                                  </a>
                              </p>
                          </div>
                          <div class="hidden sm:flex flex-col items-end text-right mr-4">
                             <span class="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-md">
                                  ${Object.keys(performances).length} исполн.
                             </span>
                          </div>
                          <div id="work-chevron-wrapper-${
                            work.id
                          }" class="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition-all duration-300">
                              <i data-lucide="chevron-down" class="w-5 h-5"></i>
                          </div>
                      </div>
                      <div id="work-content-${
                        work.id
                      }" class="hidden border-t border-gray-100 bg-gray-50/30 p-4 sm:p-6 animate-fade-in">
                          ${performancesHtml}
                      </div>
                  </div>
              `;
        })
        .join("");
    }
  }
  // === 2. ОБЫЧНЫЙ СПИСОК (Плейлисты, Избранное, Поиск) ===
  else if (type === "list") {
    html = `<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
          ${items
            .map((r, i) => {
              const isFav = favs.has(r.id);
              const cover =
                r.composition.cover_art_url ||
                r.composition.work.cover_art_url ||
                "/static/img/placeholder.png";
              const isSelected =
                window.state &&
                window.state.selectedRecordingIds &&
                window.state.selectedRecordingIds.has(r.id);

              return `
              <div class="recording-item group flex items-center p-3 hover:bg-cyan-50 transition-colors cursor-pointer ${
                isSelected ? "bg-cyan-50" : ""
              }"
                   data-recording-id="${r.id}" data-index="${i}">
                  <div class="selection-checkbox-container w-8 justify-center items-center flex-shrink-0 ${
                    window.state?.isSelectionMode ? "flex" : "hidden md:flex"
                  }">
                       <input type="checkbox" class="recording-checkbox w-4 h-4 text-cyan-600 rounded border-gray-300 focus:ring-cyan-500" data-id="${
                         r.id
                       }" ${isSelected ? "checked" : ""}>
                  </div>
                  <div class="w-10 flex justify-center items-center text-cyan-600 recording-play-pause-btn hover:scale-110 transition-transform flex-shrink-0" id="list-play-btn-${
                    r.id
                  }">
                      <i data-lucide="play" class="w-5 h-5 fill-current"></i>
                  </div>
                  <div class="flex-shrink-0 mx-3">
                       <img src="${cover}" class="w-10 h-10 rounded-lg object-cover shadow-sm" loading="lazy">
                  </div>
                  <div class="flex-1 min-w-0">
                      <div class="font-bold text-gray-800 text-sm truncate">
                           ${getLocalizedText(r.composition, "title", "ru")}
                      </div>
                      <div class="text-xs text-gray-500 truncate">
                           ${r.performers} • ${
                r.composition.work.composer.name_ru
              }
                      </div>
                  </div>
                  <div class="ml-auto pl-2 flex items-center gap-3">
                       ${
                         isLoggedIn()
                           ? `
                       <button class="favorite-btn text-gray-300 hover:text-red-500 hidden sm:block" data-recording-id="${
                         r.id
                       }">
                           <i data-lucide="heart" class="w-4 h-4 ${
                             isFav ? "fill-current text-red-500" : ""
                           }"></i>
                       </button>`
                           : ""
                       }
                       <span class="text-xs text-gray-400 font-mono w-10 text-right">${formatDuration(
                         r.duration
                       )}</span>
                  </div>
              </div>`;
            })
            .join("")}
      </div>`;
  }
  // === 3. ВИДЕОЗАЛ (Сетка видео) ===
  else {
    const cards = items
      .map((r) => {
        const youtubeId = r.youtube_url
          ? r.youtube_url.split("v=")[1]?.split("&")[0] || ""
          : "";
        const compTitle = getLocalizedText(r.composition, "title", "ru");

        // АДМИНСКИЕ КНОПКИ: СТРОГО СПРАВА (absolute right-3) И С ID
        const controls = isAdmin()
          ? `
                <div class="absolute top-3 right-3 z-30 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-sm p-1.5 rounded-lg shadow-md">
                    <span class="text-[10px] font-mono text-gray-400 border-r border-gray-200 pr-2 mr-1">#${r.id}</span>
                    <button class="edit-video-btn text-gray-500 hover:text-cyan-600 transition-colors" data-recording-id="${r.id}" title="Редактировать">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button class="delete-video-btn text-gray-500 hover:text-red-600 transition-colors" data-recording-id="${r.id}" title="Удалить">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
             `
          : "";

        return `
          <div class="group bg-white rounded-xl border border-gray-100 hover:border-cyan-200 hover:shadow-lg transition-all p-4 flex flex-col h-full relative">
              ${controls}
              <div class="relative aspect-video rounded-lg bg-gray-100 mb-3 overflow-hidden cursor-pointer" onclick="window.playYouTubeVideo('${youtubeId}')">
                  <img src="https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                  <div class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div class="bg-white/80 backdrop-blur-sm p-3 rounded-full text-red-600 shadow-lg">
                          <i data-lucide="play" class="w-8 h-8 fill-current"></i>
                      </div>
                  </div>
              </div>
              <div class="flex-1 flex flex-col">
                  <h3 class="font-bold text-sm mb-1 group-hover:text-cyan-700 transition-colors">${compTitle}</h3>
                  
                  <p class="text-xs text-gray-600 mb-2">
                    ${getLocalizedText(r.composition.work, "name", "ru")}
                  </p>

                  <div class="mt-auto pt-2 border-t border-gray-100">
                    <p class="text-xs text-gray-500 font-medium">
                      ${getLocalizedText(
                        r.composition.work.composer,
                        "name",
                        "ru"
                      )}
                    </p>
                    <p class="text-xs text-gray-400">
                      ${r.performers} ${
          r.recording_year ? `(${r.recording_year})` : ""
        }
                    </p>
                  </div>
              </div>
          </div>
       `;
      })
      .join("");

    // ВОССТАНОВЛЕНА СЕТКА: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
    html = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">${cards}</div>`;
  }

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

export function updateLoadMoreButton(hasMore) {
  const btn = document.getElementById("library-load-more");
  if (btn) {
    if (hasMore) btn.classList.remove("hidden");
    else btn.classList.add("hidden");
  }
}

export function renderQueue(nowPlaying, queue) {
  const container = document.getElementById("queue-list");
  if (!container) return;
  let nowPlayingHtml = "";
  if (nowPlaying) {
    const comp = nowPlaying.composition;
    const work = comp.work;
    const composer = work.composer;
    const partTitle = getLocalizedText(comp, "title", "ru");
    const workTitle = getLocalizedText(work, "name", "ru");
    const composerName = getLocalizedText(composer, "name", "ru");

    nowPlayingHtml = `
      <div class="mb-4 flex-shrink-0">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Сейчас играет</h3>
          <div class="flex items-center gap-3 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
              <img src="${
                comp.cover_art_url ||
                work.cover_art_url ||
                "/static/img/placeholder.png"
              }" class="w-10 h-10 rounded-md object-cover flex-shrink-0">
              <div class="min-w-0">
                  <div class="font-bold text-cyan-800 text-sm leading-tight">${partTitle}</div>
                  <div class="text-xs text-gray-500 mt-1">${workTitle} • ${composerName}</div>
              </div>
          </div>
      </div>
    `;
  }

  let queueHtml = "";
  if (queue && queue.length > 0) {
    const queueItems = queue
      .map((rec, index) => {
        const comp = rec.composition;
        const work = comp.work;
        const composer = work.composer;
        const partTitle = getLocalizedText(comp, "title", "ru");
        const workTitle = getLocalizedText(work, "name", "ru");
        const composerName = getLocalizedText(composer, "name", "ru");
        const cover =
          comp.cover_art_url ||
          work.cover_art_url ||
          "/static/img/placeholder.png";
        return `
    <div class="flex items-center gap-3 p-2 border-b border-gray-100 last:border-0 group hover:bg-gray-50 transition-colors">
        <img src="${cover}" class="w-10 h-10 rounded-md object-cover flex-shrink-0">
        
        <div class="min-w-0 flex-1">
            <div class="font-medium text-gray-800 text-sm leading-tight truncate">${partTitle}</div>
            <div class="text-xs text-gray-500 mt-0.5 truncate">${workTitle} • ${composerName}</div>
        </div>
        <button class="remove-from-queue-btn p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" data-index="${index}" title="Удалить из очереди">
            <i data-lucide="x" class="w-4 h-4"></i>
        </button>
    </div>
`;
      })
      .join("");

    queueHtml = `
      <div class="flex justify-between items-center mb-2 flex-shrink-0">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Далее</h3>
          <button id="clear-queue-btn" class="text-xs text-cyan-600 hover:underline font-bold">Очистить</button>
      </div>
      <div class="flex-1 overflow-y-auto border border-gray-200 rounded-lg bg-white pr-1">
        ${queueItems}
      </div>
    `;
  } else if (nowPlaying) {
    queueHtml = `
      <div class="text-center text-xs text-gray-400 mt-2 p-4 bg-gray-50 rounded-lg flex-shrink-0">
          <p class="font-bold mb-1">Очередь пуста</p>
          <p>Далее начнётся воспроизведение случайной записи.</p>
      </div>
    `;
  } else {
    queueHtml =
      '<p class="text-center text-sm text-gray-400 mt-8">Начните воспроизведение, чтобы увидеть очередь</p>';
  }

  // --- РЕНДЕРИНГ ОЧЕРЕДИ В МОБИЛЬНЫЙ ФУЛЛ-ПЛЕЕР (НОВЫЙ БЛОК) ---
  const mobQueueContainer = document.getElementById("mobile-queue-list");
  if (mobQueueContainer) {
    if (queue && queue.length > 0) {
      const mobHtml = queue
        .map((rec, index) => {
          const title = getLocalizedText(rec.composition, "title", "ru");
          const artist = rec.performers || "Исполнитель не указан";

          return `
                  <div class="flex items-center justify-between p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                      <div class="min-w-0 flex-1 mr-3">
                          <div class="text-sm font-bold text-gray-900 truncate">${title}</div>
                          <div class="text-xs text-gray-500 truncate mt-0.5">${artist}</div>
                      </div>
                      <button class="remove-from-queue-btn p-2 text-gray-400 hover:text-red-600 active:bg-red-50 rounded-full transition-colors" data-index="${index}">
                          <i data-lucide="x" class="w-5 h-5"></i>
                      </button>
                  </div>
               `;
        })
        .join("");
      mobQueueContainer.innerHTML = mobHtml;
    } else {
      mobQueueContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-gray-400">
                <i data-lucide="list-music" class="w-12 h-12 mb-3 opacity-20"></i>
                <span class="text-sm font-medium">Очередь пуста</span>
            </div>`;
    }
  }

  container.innerHTML = `
    <div class="flex flex-col h-full">
      ${nowPlayingHtml}
      ${queueHtml}
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

export function renderComposersMap(composers) {
  const { listEl } = getElements();
  const viewTitle = document.getElementById("view-title-container");

  viewTitle.classList.remove("hidden");
  viewTitle.innerHTML = `
        <div class="w-full mb-6 border-b border-gray-200 pb-4 flex flex-col items-center text-center">
            <h2 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <i data-lucide="map-pin" class="w-8 h-8 text-cyan-600"></i>
                <span>География классики</span>
            </h2>
            <p class="text-gray-500 mt-1">Где родились великие композиторы.</p>
        </div>
    `;

  listEl.innerHTML = `
        <div class="max-w-7xl mx-auto px-6 pb-10">
            <div id="composers-map" class="w-full h-[70vh] rounded-2xl shadow-xl border-4 border-white z-0 relative"></div>
        </div>
    `;

  setTimeout(() => {
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
    }

    mapInstance = L.map("composers-map").setView([48.5, 15.0], 5);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }
    ).addTo(mapInstance);

    const grouped = {};

    composers.forEach((c) => {
      if (c.latitude && c.longitude) {
        const key = `${c.latitude.toFixed(4)},${c.longitude.toFixed(4)}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(c);
      }
    });

    Object.keys(grouped).forEach((key) => {
      const group = grouped[key];
      const [lat, lng] = key.split(",");
      const first = group[0];

      let popupContent = `<div class="text-center min-w-[150px]">`;

      if (first.place_of_birth) {
        popupContent += `<div class="font-bold text-sm text-gray-500 mb-2 uppercase tracking-wide border-b pb-1">${first.place_of_birth}</div>`;
      }

      group.forEach((c) => {
        const portrait = c.portrait_url || "/static/img/placeholder.png";
        popupContent += `
                    <a href="/composers/${
                      c.slug || c.id
                    }" data-navigo class="flex items-center gap-3 p-2 hover:bg-cyan-50 rounded-lg transition-colors text-left group mb-1">
                        <img src="${portrait}" class="w-8 h-8 rounded-full object-cover border border-gray-200">
                        <div>
                            <div class="font-bold text-gray-800 text-sm group-hover:text-cyan-700">${
                              c.name_ru
                            }</div>
                            <div class="text-[10px] text-gray-400">${
                              c.year_born || "?"
                            }</div>
                        </div>
                    </a>
                `;
      });
      popupContent += `</div>`;

      L.marker([lat, lng]).addTo(mapInstance).bindPopup(popupContent);
    });

    if (window.lucide) window.lucide.createIcons();
  }, 100);
}
export function updateSelectionStyles() {
  document.querySelectorAll(".recording-item").forEach((row) => {
    const id = parseInt(row.dataset.recordingId);
    if (isNaN(id)) return;

    const checkbox = row.querySelector(".recording-checkbox");
    const isSelected =
      window.state && window.state.selectedRecordingIds.has(id);

    row.classList.remove(
      "bg-white",
      "bg-cyan-50",
      "hover:bg-gray-50",
      "bg-cyan-100/60"
    );

    if (isSelected) {
      row.classList.add("bg-cyan-50");
      if (checkbox) checkbox.checked = true;
    } else {
      row.classList.add("bg-white", "hover:bg-gray-50");
      if (checkbox) checkbox.checked = false;
    }
  });
}
function renderLikeButton(container, recId) {
  if (!container) return;

  if (recId && isLoggedIn() && window.state && window.state.favoritesLoaded) {
    const isFav = window.state.favoriteRecordingIds.has(recId);
    container.innerHTML = `
        <button class="favorite-btn p-1.5 rounded-full hover:bg-gray-100 transition-colors ${
          isFav ? "text-red-500" : "text-gray-400 hover:text-red-500"
        }" data-recording-id="${recId}">
            <i data-lucide="heart" class="w-5 h-5 ${
              isFav ? "fill-current" : ""
            }"></i>
        </button>
      `;
  } else {
    container.innerHTML = "";
  }
  if (window.lucide) lucide.createIcons();
}

function checkMarquee(wrapper, contentSpan) {
  if (!wrapper || !contentSpan) return;

  const existingClone = wrapper.querySelector(".marquee-clone");
  if (existingClone) existingClone.remove();
  wrapper.classList.remove("is-long");

  setTimeout(() => {
    if (contentSpan.scrollWidth > wrapper.clientWidth) {
      wrapper.classList.add("is-long");

      const clone = contentSpan.cloneNode(true);
      clone.classList.add("marquee-clone");
      clone.removeAttribute("id");
      wrapper.appendChild(clone);
    }
  }, 50);
}

export function updateTrackRowIcon(recordingId, isPlaying) {
  document.querySelectorAll(".recording-play-pause-btn").forEach((btn) => {
    const size =
      btn.querySelector("svg")?.getAttribute("width") === "24"
        ? "w-6 h-6"
        : "w-5 h-5";
    btn.innerHTML = `<i data-lucide="play" class="${size} fill-current"></i>`;
  });

  if (!recordingId) {
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const currentBtn = document.getElementById(`list-play-btn-${recordingId}`);

  if (currentBtn) {
    const size = currentBtn
      .closest(".recording-item")
      ?.querySelector(".text-lg")
      ? "w-6 h-6"
      : "w-5 h-5";

    if (isPlaying) {
      currentBtn.innerHTML = `<i data-lucide="pause" class="${size} fill-current"></i>`;
    } else {
      currentBtn.innerHTML = `<i data-lucide="play" class="${size} fill-current"></i>`;
    }
  }

  if (window.lucide) window.lucide.createIcons();
}

window.toggleWorkAccordion = (workId) => {
  const content = document.getElementById(`work-content-${workId}`);
  const chevronWrapper = document.getElementById(
    `work-chevron-wrapper-${workId}`
  );

  if (!content || !chevronWrapper) {
    console.warn(`Elements for work ${workId} not found`);
    return;
  }

  if (content.classList.contains("hidden")) {
    // Открыть
    content.classList.remove("hidden");
    chevronWrapper.classList.add("rotate-180");
  } else {
    // Закрыть
    content.classList.add("hidden");
    chevronWrapper.classList.remove("rotate-180");
  }
};

window.openVersionsModal = async (
  workId,
  currentRecordingId,
  isFullScreen = false
) => {
  const modal = document.getElementById("versions-modal");
  const container = document.getElementById("versions-list-container");

  if (!modal || !container) {
    console.error("Modal elements not found");
    return;
  }

  // === НОВАЯ ЛОГИКА Z-INDEX ===
  // Если открываем из полноэкранного плеера, ставим z-200 (выше плеера).
  // Иначе возвращаем z-60 (стандартный уровень).
  if (isFullScreen) {
    modal.classList.remove("z-[60]");
    modal.classList.add("z-[200]");
  } else {
    modal.classList.remove("z-[200]");
    modal.classList.add("z-[60]");
  }

  modal.classList.remove("hidden");
  // Анимация открытия
  setTimeout(() => {
    const overlay = modal.querySelector(".modal-overlay");
    const content = modal.querySelector(".modal-content");
    if (overlay) overlay.classList.remove("opacity-0");
    if (content) content.classList.remove("opacity-0", "scale-95");
  }, 10);

  // Закрытие
  const closeBtn = modal.querySelector(".close-button");
  if (closeBtn) {
    closeBtn.onclick = () => {
      const overlay = modal.querySelector(".modal-overlay");
      const content = modal.querySelector(".modal-content");
      if (overlay) overlay.classList.add("opacity-0");
      if (content) content.classList.add("opacity-0", "scale-95");
      setTimeout(() => modal.classList.add("hidden"), 300);
    };
  }

  container.innerHTML =
    '<div class="flex justify-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div></div>';

  try {
    // 1. Загружаем данные о произведении
    const work = await window.apiRequest(`/api/recordings/works/${workId}`);

    // 2. Группируем (ТОЧНО ТАК ЖЕ, КАК В БИБЛИОТЕКЕ)
    const performances = {};

    // Извлекаем записи. Если структура Work -> Compositions -> Recordings
    const allRecordings = [];
    if (work.compositions) {
      work.compositions.forEach((comp) => {
        if (comp.recordings) {
          comp.recordings.forEach((r) => {
            if (r.duration > 0) {
              r.composition = comp; // Важно для контекста
              r.composition.work = work; // Важно для плеера
              allRecordings.push(r);
            }
          });
        }
      });
    }

    if (allRecordings.length === 0) {
      container.innerHTML =
        '<div class="text-center text-gray-500 py-10">Нет других исполнений</div>';
      return;
    }

    allRecordings.forEach((rec) => {
      const key =
        (rec.performers || "Неизвестный") + (rec.recording_year || "");
      if (!performances[key]) {
        performances[key] = {
          id: rec.id,
          performers: rec.performers || "Неизвестный исполнитель",
          year: rec.recording_year,
          conductor: rec.conductor,
          tracks: [],
        };
      }
      performances[key].tracks.push(rec);
    });

    const performanceCount = Object.keys(performances).length;

    // Если исполнение всего одно (или нет вообще), показываем сообщение
    if (
      performanceCount <= 1 &&
      allRecordings.some((r) => r.id === currentRecordingId)
    ) {
      container.innerHTML =
        '<div class="text-center text-gray-500 py-10">Других исполнений этого произведения пока нет.</div>';
      return; // Завершаем функцию
    }

    // 3. Рисуем список
    const html = Object.values(performances)
      .map((perf) => {
        const isCurrent = perf.tracks.some((t) => t.id === currentRecordingId);

        const activeClass = isCurrent
          ? "border-cyan-500 ring-1 ring-cyan-500 bg-cyan-50"
          : "border-gray-200 hover:border-cyan-300 hover:shadow-md";
        const btnText = isCurrent ? "Сейчас играет" : "Слушать";
        const btnClass = isCurrent
          ? "text-cyan-700 font-bold bg-white border border-cyan-200 cursor-default opacity-70"
          : "bg-cyan-600 text-white hover:bg-cyan-700 shadow-sm cursor-pointer";
        const trackIds = JSON.stringify(perf.tracks.map((t) => t.id));
        const btnAction = isCurrent
          ? ""
          : `onclick="window.playPerformanceByIds(${trackIds})"`;

        return `
              <div class="bg-white rounded-xl border p-4 mb-3 transition-all flex flex-col sm:flex-row sm:items-center justify-between group ${activeClass}">
                  <div class="flex-1 min-w-0 pr-0 sm:pr-4 mb-3 sm:mb-0">
                      <div class="font-bold text-gray-900 text-base leading-tight mb-1">
                          ${perf.performers}
                      </div>
                      <div class="text-xs text-gray-500 flex flex-wrap gap-2 items-center">
                          ${
                            perf.year
                              ? `<span class="bg-gray-100 px-1.5 py-0.5 rounded font-mono border border-gray-200">${perf.year}</span>`
                              : ""
                          }
                          ${
                            perf.conductor
                              ? `<span>Дир. ${perf.conductor}</span>`
                              : ""
                          }
                          <span class="text-gray-300">•</span>
                          <span>${perf.tracks.length} ч.</span>
                      </div>
                  </div>

                  <button ${btnAction} 
                          class="px-4 py-2 rounded-lg text-sm font-bold transition-all flex-shrink-0 w-full sm:w-auto text-center ${btnClass}">
                      ${btnText}
                  </button>
              </div>
          `;
      })
      .join("");

    container.innerHTML = `
          <div class="mb-4 text-xs uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100 pb-2">
              Произведение: <span class="text-gray-800 ml-1 normal-case tracking-normal text-sm">${getLocalizedText(
                work,
                "name",
                "ru"
              )}</span>
          </div>
          ${html}
      `;
    window.state.tempWorkForModal = work;
  } catch (e) {
    console.error(e);
    container.innerHTML = `<div class="text-red-500 text-center py-10 text-sm">Ошибка загрузки: ${e.message}</div>`;
  }
};

window.openMobileFullPlayer = () => {
  const player = document.getElementById("mobile-full-player");
  if (player) {
    const fullCover = document.getElementById("full-player-cover");
    const fullBg = document.getElementById("full-player-bg");
    if (window.state && window.state.currentCoverUrl) {
      if (fullCover) fullCover.src = window.state.currentCoverUrl;
      if (fullBg) fullBg.src = window.state.currentCoverUrl;
    }

    player.classList.remove("translate-y-full");
    document.body.style.overflow = "hidden";
  }
};

window.closeMobileFullPlayer = () => {
  const player = document.getElementById("mobile-full-player");
  if (player) {
    player.classList.add("translate-y-full");
    document.body.style.overflow = "";
  }
};

window.toggleMobileQueue = () => {
  const artView = document.getElementById("full-player-art-view");
  const queueView = document.getElementById("full-player-queue-view");
  const btn = document.getElementById("full-player-toggle-queue-btn");

  if (!artView || !queueView) return;

  if (queueView.classList.contains("hidden")) {
    queueView.classList.remove("hidden");
    artView.classList.add("opacity-0", "scale-95");
    btn.classList.add("text-cyan-400");
  } else {
    queueView.classList.add("hidden");
    artView.classList.remove("opacity-0", "scale-95");
    btn.classList.remove("text-cyan-400");
  }
};

window.openMobileInfo = () => {
  const modal = document.getElementById("player-info-modal");
  if (modal) {
    document.getElementById("player-info-btn-mobile")?.click();
  }
};

export function updateSidebarActiveStates() {
  // 1. Получаем текущие значения из стейта. Если null/undefined -> пустая строка
  const currentGenre = window.state.libraryFilters.genre || "";
  const currentEpoch = window.state.libraryFilters.epoch || "";

  // 2. Ищем ВСЕ кнопки, у которых есть атрибут data-filter-type
  const buttons = document.querySelectorAll("button[data-filter-type]");

  buttons.forEach((btn) => {
    const type = btn.dataset.filterType; // "genre" или "epoch"
    const value = btn.dataset.filterValue; // "Symphony", "baroque" или ""

    // Определяем, должна ли кнопка быть активной
    let isActive = false;
    if (type === "genre") isActive = value === currentGenre;
    if (type === "epoch") isActive = value === currentEpoch;

    const icon = btn.querySelector("svg, i");

    if (isActive) {
      // === АКТИВНЫЙ СТИЛЬ ===
      // Серый фон, жирный темный текст, цветная иконка
      btn.className =
        "w-full text-left px-3 py-2 rounded-lg bg-gray-100 text-gray-900 font-bold flex items-center gap-3 text-sm transition-colors shadow-sm ring-1 ring-gray-200";
      if (icon) {
        // Иконка становится синей (cyan-600)
        icon.classList.remove("text-gray-400", "group-hover:text-cyan-600");
        icon.classList.add("text-cyan-600");
      }
    } else {
      // === НЕАКТИВНЫЙ СТИЛЬ ===
      // Прозрачный фон, серый текст, при наведении подсвечивается
      btn.className =
        "w-full text-left px-3 py-2 rounded-lg text-gray-600 hover:bg-cyan-50 hover:text-cyan-700 transition-colors flex items-center gap-3 text-sm font-medium group";
      if (icon) {
        // Иконка серая, при наведении синеет
        icon.classList.remove("text-cyan-600");
        icon.classList.add("text-gray-400", "group-hover:text-cyan-600");
      }
    }
  });
}

export function renderAccountPage(userData) {
  const { listEl } = getElements();
  const contentHeader = document.getElementById("content-header");
  const breadcrumbs = document.getElementById("breadcrumbs-container");
  const viewTitle = document.getElementById("view-title-container");

  // Показываем шапку контента
  contentHeader.classList.remove("hidden");

  // Очищаем хлебные крошки и добавляем заголовок
  breadcrumbs.innerHTML = "";
  viewTitle.classList.remove("hidden");
  viewTitle.innerHTML = `
    <h2 class="text-3xl font-bold text-gray-800 flex items-center gap-3">
        <i data-lucide="user-cog" class="w-8 h-8 text-cyan-600"></i>
        <span>Личный кабинет</span>
    </h2>
  `;

  // Прячем пагинацию, так как она не нужна
  document.getElementById("pagination-container").innerHTML = "";

  const creationDate = new Date(userData.created_at).toLocaleDateString(
    "ru-RU",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  const adminBadge = userData.is_admin
    ? `
    <span class="bg-cyan-100 text-cyan-700 text-xs font-bold px-2 py-1 rounded-full border border-cyan-200 flex items-center gap-1">
      <i data-lucide="shield-check" class="w-3 h-3"></i> Администратор
    </span>`
    : "";

  const html = `
    <div class="max-w-4xl mx-auto px-6 pb-20 animate-fade-in">
      
      <!-- Карточка профиля -->
      <div class="bg-white/50 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div class="flex flex-col sm:flex-row items-center gap-6">
          <div class="w-24 h-24 rounded-full shadow-xl overflow-hidden bg-gray-100 flex-shrink-0 border-4 border-white relative">
            ${
              userData.avatar_url
                ? `<img src="${userData.avatar_url}" class="w-full h-full object-cover" alt="Avatar">`
                : `<div class="w-full h-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white">
                     <i data-lucide="user" class="w-10 h-10"></i>
                   </div>`
            }
          </div>
          <div class="flex-1 text-center sm:text-left">
            <!-- ИЗМЕНЕНИЯ ЗДЕСЬ: flex-col для мобильных, flex-row для ПК -->
            <div class="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 justify-center sm:justify-start">
              <!-- ИЗМЕНЕНИЯ ЗДЕСЬ: text-2xl для мобильных (чтобы влезло в строку), text-3xl для ПК -->
              <h2 class="text-2xl sm:text-3xl font-bold text-gray-800 whitespace-nowrap">${
                userData.display_name || userData.email.split("@")[0]
              }</h2>
              ${adminBadge}
            </div>
            <p class="text-gray-500 mt-1 sm:mt-0">${userData.email}</p>
            <p class="text-xs text-gray-400 mt-2">На сайте с ${creationDate}</p>
          </div>
          <button id="edit-profile-btn" class="px-4 py-2 bg-white border border-gray-200 text-sm font-bold text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Редактировать
          </button>
        </div>
      </div>

      <!-- Статистика и быстрые ссылки -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 class="text-lg font-bold text-gray-700 mb-4">Статистика</h3>
          <div class="space-y-3">
            <div class="flex justify-between items-center text-sm">
              <span class="text-gray-500">Избранные записи:</span>
              <span class="font-bold text-cyan-600">${
                userData.stats.favorites_count
              }</span>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-gray-500">Мои плейлисты:</span>
              <span class="font-bold text-cyan-600">${
                userData.stats.playlists_count
              }</span>
            </div>
          </div>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 class="text-lg font-bold text-gray-700 mb-4">Быстрый доступ</h3>
          <div class="flex gap-4">
            <a href="/favorites" data-navigo class="flex-1 text-center px-4 py-3 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-colors">Избранное</a>
            <a href="/playlists" data-navigo class="flex-1 text-center px-4 py-3 bg-cyan-50 text-cyan-600 font-bold rounded-lg hover:bg-cyan-100 transition-colors">Плейлисты</a>
          </div>
        </div>
      </div>

      <!-- Безопасность -->
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 class="text-lg font-bold text-gray-700 mb-4">Безопасность</h3>
        <button id="show-password-form-btn" class="text-cyan-600 hover:underline font-medium">Изменить пароль</button>
        <div id="password-form" class="hidden mt-4 space-y-4 max-w-sm">
          <input type="password" id="current-password" placeholder="Текущий пароль" class="w-full px-4 py-2 border rounded-lg">
          <input type="password" id="new-password" placeholder="Новый пароль" class="w-full px-4 py-2 border rounded-lg">
          <button id="change-password-btn" class="px-6 py-2 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition-colors">Сохранить пароль</button>
        </div>
      </div>

    </div>
  `;
  // Просто рендерим в основной контейнер
  listEl.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}
