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

const GENRE_OPTIONS = [
  { value: "Symphony", label: "Симфония" },
  { value: "Sonata", label: "Соната" },
  { value: "Concerto", label: "Концерт" },
  { value: "Opera", label: "Опера" },
  { value: "Chamber", label: "Камерная музыка" },
  { value: "Vocal", label: "Вокальная музыка" },
  { value: "Ballet", label: "Балет" },
  { value: "Suite", label: "Сюита" },
  { value: "Preludes", label: "Прелюдии" },
  { value: "Etudes", label: "Этюды" },
  { value: "Waltz", label: "Вальс" },
  { value: "Polonaise", label: "Полонез" },
  { value: "Mazurka", label: "Мазурка" },
  { value: "Nocturne", label: "Ноктюрн" },
  { value: "Rhapsody", label: "Рапсодия" },
  { value: "Oratorio", label: "Оратория" },
  { value: "Mass", label: "Месса" },
  { value: "Requiem", label: "Реквием" },
  { value: "Miniature", label: "Миниатюра" },
  { value: "String Quartet", label: "Струнный квартет" },
  { value: "Serenade", label: "Серенада" },
  { value: "Overture", label: "Увертюра" },
  { value: "Motet", label: "Мотет" },
  { value: "Fanfare", label: "Фанфары" },
  { value: "Cantata", label: "Кантата" },
];

const GENRE_TRANSLATIONS = GENRE_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

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

function getGenreKeyByLabel(label) {
  if (!label) return null;
  const option = GENRE_OPTIONS.find((g) => g.label === label);
  return option ? option.value : label;
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
      localStorage.getItem("user_email")?.split("@")[0] || "User";

    // flex items-center: выравнивает кнопку выхода и текст по вертикали
    container.className = "flex items-center gap-2";

    container.innerHTML = `
            <!-- ТЕКСТОВОЙ БЛОК -->
            <div class="flex flex-col items-end justify-center">
                 
                 <!-- МОБИЛЬНАЯ ВЕРСИЯ: -->
                 <!-- break-words: разрешает перенос слов -->
                 <!-- max-w-[100px]: ограничивает ширину, чтобы вызвать перенос, а не сдвиг кнопок -->
                 <!-- leading-tight: уменьшает расстояние между строками -->
                 <span class="md:hidden text-xs font-bold opacity-90 text-right break-words max-w-[100px] leading-tight">
                    Здравствуйте, ${username}! 👋
                 </span>
                 
                 <!-- ПК ВЕРСИЯ (без изменений) -->
                 <span class="hidden md:inline text-sm font-bold opacity-90 whitespace-nowrap">
                    Здравствуйте, ${username}! 👋
                 </span>
            </div>
            
            <!-- КНОПКА ВЫХОДА -->
            <!-- self-center гарантирует, что кнопка останется по центру, даже если текст станет в 3 строки -->
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

  // Hero Section
  const heroHTML = `
      <div class="relative text-white overflow-hidden rounded-b-3xl shadow-2xl group"
           style="-webkit-mask-image: -webkit-radial-gradient(white, black);">

        <!-- ФОНОВОЕ ВИДЕО -->
        <div class="absolute inset-0">
          <video
            autoplay
            muted
            loop
            playsinline
            preload="metadata"
            poster="/static/img/hero.jpg"
            class="w-full h-full object-cover transition-transform duration-[20000ms] ease-linear transform group-hover:scale-105"
          >
            <source src="/static/video/hero.mp4" type="video/mp4">
          </video>

          <div class="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-900/40"></div>
        </div>

        <div class="max-w-7xl mx-auto px-6 py-24 relative z-10">
          <h1 class="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight drop-shadow-lg">
            Ваша персональная<br /><span class="text-cyan-400">Филармония</span>
          </h1>

          <div class="relative max-w-xl mb-8 group/search">
             <i data-lucide="search" class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within/search:text-cyan-500 transition-colors"></i>
             <input type="text" id="hero-search-input" placeholder="Поиск композиторов, произведений..."
                    class="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/95 backdrop-blur text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 shadow-2xl text-lg transition-all">
          </div>

          <div class="flex flex-wrap gap-4">
            <a href="/recordings" data-navigo class="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg hover:shadow-cyan-500/30 transition-all hover:-translate-y-1 flex items-center gap-2">
              <i data-lucide="play-circle" class="w-5 h-5"></i> Медиатека
            </a>

            ${
              isLoggedIn()
                ? `
            <a href="/favorites" data-navigo class="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl font-bold border border-white/20 transition-all flex items-center gap-2">
               <i data-lucide="heart" class="w-5 h-5"></i> Избранное
            </a>`
                : ""
            }

             <a href="/composers" data-navigo class="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl font-bold border border-white/20 transition-all flex items-center gap-2">
              <i data-lucide="users" class="w-5 h-5"></i> Композиторы
            </a>
          </div>
        </div>
      </div>
    `;

  const statsHTML = `
       <div class="max-w-7xl mx-auto px-6 -mt-10 relative z-20 mb-12">
           <div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 grid grid-cols-2 md:grid-cols-4 gap-8">
               <div class="text-center">
                   <div class="text-3xl font-bold text-cyan-600">${
                     data.stats.total_composers
                   }</div>
                   <div class="text-xs text-gray-400 uppercase font-bold tracking-wider">Композиторов</div>
               </div>
               <div class="text-center border-l border-gray-100">
                   <div class="text-3xl font-bold text-cyan-600">${
                     data.stats.total_works
                   }</div>
                   <div class="text-xs text-gray-400 uppercase font-bold tracking-wider">Произведений</div>
               </div>
               <div class="text-center border-l border-gray-100">
                   <div class="text-3xl font-bold text-cyan-600">${
                     data.stats.total_recordings
                   }</div>
                   <div class="text-xs text-gray-400 uppercase font-bold tracking-wider">Записей</div>
               </div>
               <div class="text-center border-l border-gray-100">
                    <div class="text-3xl font-bold text-cyan-600">${Math.floor(
                      data.stats.total_recordings / 10
                    )} ч.</div>
                    <div class="text-xs text-gray-400 uppercase font-bold tracking-wider">Музыки</div>
               </div>
           </div>
       </div>
    `;

  // Helper for Cards
  const createSection = (title, items) => {
    if (!items || !items.length) return "";
    const cards = items
      .map((item) => {
        const cover = item.cover_art_url || "/static/img/placeholder.png";
        return `
    <a href="/works/${item.slug || item.id}" data-navigo
       class="bg-white rounded-xl p-4 shadow-sm hover:shadow-xl transition-all border border-gray-100 hover:border-cyan-200 group flex flex-col h-full">
        <div class="relative aspect-square mb-4 overflow-hidden rounded-lg bg-gray-100">
            <img src="${cover}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" alt="${getLocalizedText(
          item,
          "name",
          lang
        )}">
            <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div class="bg-white p-3 rounded-full shadow-lg text-cyan-600"><i data-lucide="arrow-right" class="w-5 h-5"></i></div>
            </div>
        </div>
                <h4 class="font-bold text-gray-800 group-hover:text-cyan-600 transition-colors line-clamp-1">${getLocalizedText(
                  item,
                  "name",
                  lang
                )}</h4>
                <p class="text-sm text-gray-500 mb-2 line-clamp-1">${getLocalizedText(
                  item.composer,
                  "name",
                  lang
                )}</p>
            </a>
            `;
      })
      .join("");

    return `
        <div class="max-w-7xl mx-auto px-6 mb-16">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><i data-lucide="sparkles" class="w-5 h-5 text-cyan-500"></i> ${title}</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">${cards}</div>
        </div>
        `;
  };

  listEl.innerHTML =
    heroHTML +
    statsHTML +
    createSection("Недавно добавленные", data.recently_added_works) +
    createSection("Случайный выбор", data.random_works);

  setTimeout(() => {
    document
      .getElementById("hero-search-input")
      ?.addEventListener("keydown", (e) => {
        if (e.key === "Enter")
          window.location.hash = `/search/${encodeURIComponent(
            e.target.value
          )}`;
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
    viewTitle.innerHTML = `<h2 class="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3"><i data-lucide="library" class="w-6 h-6 text-gray-400"></i> ${
      title || "Список"
    }</h2>`;
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
  composers,
  isAppend = false,
  hasMore = true,
  lang = "ru"
) {
  const { listEl } = getElements();

  if (!isAppend) {
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

    listEl.innerHTML = `
        <div class="max-w-7xl mx-auto px-6 pb-10">
            <div id="composers-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <!-- Сюда будут добавляться карточки -->
            </div>

            <div id="composers-load-more-container" class="mt-12 flex justify-center hidden">
                <button id="load-more-composers-btn" class="px-8 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-full shadow-sm hover:bg-gray-50 hover:shadow-md transition-all flex items-center gap-2">
                    <span>Показать ещё</span> <i data-lucide="chevron-down" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
      `;
  }

  const cardsHtml = composers
    .map((c) => {
      const years = formatYearRange(c.year_born, c.year_died);
      const yearsBadge = years
        ? `<p class="text-xs text-gray-500 mt-1 font-medium bg-gray-50 inline-block px-2 py-0.5 rounded-full border border-gray-200">${years}</p>`
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

  const grid = document.getElementById("composers-grid");
  if (grid) {
    grid.insertAdjacentHTML("beforeend", cardsHtml);
  }

  const btnContainer = document.getElementById("composers-load-more-container");
  if (btnContainer) {
    if (hasMore) {
      btnContainer.classList.remove("hidden");
    } else {
      btnContainer.classList.add("hidden");
    }
  }

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

      let key = w.genre || uncategorizedKey;

      if (key !== uncategorizedKey) {
        key = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
        const entry = GENRE_OPTIONS.find(
          (opt) => opt.label === key || opt.value === key
        );
        if (entry) key = entry.value;
      }

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
        let translation = GENRE_TRANSLATIONS[genreKey];

        if (!translation) {
          const lowerKey = genreKey.toLowerCase();
          const foundKey = Object.keys(GENRE_TRANSLATIONS).find(
            (k) => k.toLowerCase() === lowerKey
          );
          if (foundKey) {
            translation = GENRE_TRANSLATIONS[foundKey];
          }
        }

        groupTitle = translation || genreKey;
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
                            } ч.</span>
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

  const genreRu = GENRE_TRANSLATIONS[work.genre] || work.genre;
  const genreBadge = work.genre
    ? `<span class="text-xs font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-1 rounded border border-cyan-100 align-middle">${genreRu}</span>`
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
  let title = "Выберите трек";
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

  const mobTitleEl = document.getElementById("player-title-mobile");
  const mobArtistEl = document.getElementById("player-artist-mobile");
  const mobCover = document.getElementById("player-cover-art-mobile");
  const mobFavContainer = document.getElementById(
    "player-favorite-btn-container-mobile"
  );

  if (mobTitleEl) {
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

  if (deskTitleEl) {
    deskTitleEl.textContent = title;
    deskTitleEl.title = title;
    deskArtistEl.textContent = artist;
    deskArtistEl.title = artist;
    deskCover.src = cover;

    renderLikeButton(deskFavContainer, recId);
  }

  const infoBtnMobile = document.getElementById("player-info-btn-mobile");
  const infoBtnDesktop = document.getElementById("player-info-btn-desktop");
  const popoverContent = document.getElementById("player-info-popover");
  const modalContent = document.getElementById("player-info-modal-content");

  if (!infoBtnMobile || !infoBtnDesktop || !popoverContent || !modalContent)
    return;

  if (rec) {
    const licenseUrl = licenses[rec.license];
    const licenseHtml = licenseUrl
      ? `<a href="${licenseUrl}" target="_blank" class="text-cyan-400 hover:underline">${rec.license}</a>`
      : rec.license || "Не указана";

    const sourceHtml =
      rec.source_url && rec.source_text
        ? `<a href="${rec.source_url}" target="_blank" class="text-cyan-400 hover:underline">${rec.source_text}</a>`
        : "Не указан";

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

    infoBtnMobile.classList.remove("hidden");
    infoBtnDesktop.classList.remove("hidden");
  } else {
    infoBtnMobile.classList.add("hidden");
    infoBtnDesktop.classList.add("hidden");
  }
}

export function updatePlayPauseIcon(isPlaying) {
  ["-mobile", "-desktop"].forEach((suffix) => {
    const playIcon = document.getElementById("play-icon" + suffix);
    const pauseIcon = document.getElementById("pause-icon" + suffix);

    if (playIcon && pauseIcon) {
      if (isPlaying) {
        playIcon.classList.add("hidden");
        pauseIcon.classList.remove("hidden");
      } else {
        playIcon.classList.remove("hidden");
        pauseIcon.classList.add("hidden");
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
  ).textContent = `Здравствуйте, ${username}! 👋`;
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
export async function showAddWorkModal() {
  const modal = document.getElementById("add-work-modal");
  modal.classList.remove("hidden");

  document
    .querySelectorAll("#add-work-modal input")
    .forEach((i) => (i.value = ""));

  const noCatalogCheck = document.getElementById("add-work-no-catalog");
  const catalogInput = document.getElementById("add-work-catalog");

  if (noCatalogCheck) {
    noCatalogCheck.checked = false;
  }
  if (catalogInput) {
    catalogInput.disabled = false;
  }

  const genreInput = document.getElementById("add-work-genre");
  if (genreInput) genreInput.value = "";

  const datalist = document.getElementById("genre-options");
  if (datalist) {
    datalist.innerHTML = "";
    GENRE_OPTIONS.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.label;
      datalist.appendChild(opt);
    });
  }

  await loadAndInitQuill("#add-work-notes", "");

  const closeBtn = modal.querySelector(".close-button");
  const newClose = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newClose, closeBtn);

  newClose.onclick = () => {
    modal.classList.add("hidden");
  };
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

    const displayGenre = GENRE_TRANSLATIONS[data.genre] || data.genre;
    const genreOptionsHtml = GENRE_OPTIONS.map(
      (g) => `<option value="${g.label}"></option>`
    ).join("");

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

            <!-- ЖАНР -->
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Жанр</label>
                <input type="text" id="edit-work-genre" list="edit-genre-options"
                       class="w-full border border-gray-300 p-2 rounded-lg"
                       value="${
                         displayGenre || ""
                       }" placeholder="Начните вводить...">
                <datalist id="edit-genre-options">
                    ${genreOptionsHtml}
                </datalist>
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
  }

  titleEl.innerHTML = modalTitle;
  content.innerHTML = fields;
  newBtn.className = confirmBtnClass;
  newBtn.textContent = confirmBtnText;
  if (window.lucide) window.lucide.createIcons();

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

        const genreInputValue =
          document.getElementById("edit-work-genre").value;
        const genreKey = getGenreKeyByLabel(genreInputValue);

        payload = {
          name_ru: document.getElementById("edit-name-ru").value,
          original_name: document.getElementById("edit-name-orig").value,
          tonality: document.getElementById("edit-work-tonality").value,
          genre: genreKey,
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
      }

      await onSave(payload);

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
  const c = document.getElementById("notification-container");
  const d = document.createElement("div");
  d.className = `${
    t === "error" ? "bg-red-500" : "bg-slate-800"
  } text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce mb-2`;
  d.innerHTML = `<span>${m}</span>`;
  c.appendChild(d);
  setTimeout(() => d.remove(), 3000);
}

export function showContextMenu(x, y, menu) {
  if (!menu) return;
  menu.style.display = "block";
  menu.classList.remove("hidden");
  const rect = menu.getBoundingClientRect();
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;
  let newX = x;
  let newY = y;
  if (x + rect.width > winWidth) newX = x - rect.width;
  if (y + rect.height > winHeight) newY = y - rect.height;
  menu.style.left = `${newX}px`;
  menu.style.top = `${newY}px`;
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
                } треков</p>
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

  const composerOptions = composers
    .map((c) => `<option value="${c.id}">${c.name_ru}</option>`)
    .join("");

  const quickGenres = [
    { label: "Симфонии", value: "Symphony", icon: "music-2" },
    { label: "Концерты", value: "Concerto", icon: "mic-2" }, // mic используем как метафору солиста
    { label: "Сонаты", value: "Sonata", icon: "book-open" },
    { label: "Опера", value: "Opera", icon: "mic" },
    { label: "Камерная", value: "Chamber", icon: "users" },
    { label: "Фортепиано", value: "Piano", icon: "music" },
    { label: "Духовная", value: "Mass", icon: "church" },
  ];

  const sidebarGenresHtml = quickGenres
    .map(
      (g) => `
        <button onclick="window.applyLibraryFilter('genre', '${g.value}')"
                class="w-full text-left px-3 py-2 rounded-lg text-gray-600 hover:bg-cyan-50 hover:text-cyan-700 transition-colors flex items-center gap-3 text-sm font-medium">
            <i data-lucide="${g.icon}" class="w-4 h-4"></i>
            ${g.label}
        </button>
    `
    )
    .join("");

  const sidebarComposersHtml = composers
    .slice(0, 8)
    .map(
      (c) => `
        <button onclick="window.applyLibraryFilter('composerId', '${c.id}')"
                class="w-full text-left px-3 py-2 rounded-lg text-gray-600 hover:bg-cyan-50 hover:text-cyan-700 transition-colors flex items-center gap-3 text-sm font-medium group">
            <div class="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                <img src="${
                  c.portrait_url || "/static/img/placeholder.png"
                }" class="w-full h-full object-cover opacity-70 group-hover:opacity-100">
            </div>
            <span class="truncate">${c.name_ru}</span>
        </button>
    `
    )
    .join("");

  // === ГЛАВНЫЙ МАКЕТ ===
  const layoutHtml = `
    <div class="max-w-[1600px] mx-auto px-6 pb-20"> <!-- Увеличили max-w для десктопа -->

        <div class="flex flex-col lg:flex-row gap-8 items-start">

            <!-- === ЛЕВЫЙ САЙДБАР (Навигация) === -->
            <aside class="hidden lg:block w-64 flex-shrink-0 sticky top-4 space-y-8">

                <!-- Заголовок раздела -->
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

                <!-- Блок: Жанры -->
                <div>
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Категории</h3>
                    <div class="space-y-1">
                        <button onclick="window.applyLibraryFilter('genre', '')"
                                class="w-full text-left px-3 py-2 rounded-lg bg-gray-100 text-gray-900 font-bold flex items-center gap-3 text-sm">
                            <i data-lucide="layout-grid" class="w-4 h-4"></i>
                            Все записи
                        </button>
                        ${sidebarGenresHtml}
                    </div>
                </div>

                <!-- Блок: Композиторы -->
                <div>
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Композиторы</h3>
                    <div class="space-y-1">
                        ${sidebarComposersHtml}
                        <a href="/composers" data-navigo class="w-full text-left px-3 py-2 rounded-lg text-cyan-600 hover:underline transition-colors flex items-center gap-3 text-xs font-bold mt-2">
                            Все композиторы...
                        </a>
                    </div>
                </div>
            </aside>

            <!-- === ЦЕНТРАЛЬНАЯ ЧАСТЬ === -->
            <div class="flex-1 w-full min-w-0">

                <!-- 1. Верхняя панель (Поиск и сортировка) -->
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 sticky top-0 z-20 mb-6">
                    <div class="flex flex-col md:flex-row gap-4">
                        <!-- Поиск (Широкий) -->
                        <div class="relative flex-1">
                            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"></i>
                            <input type="text" placeholder="Поиск произведения, исполнителя..."
                                   class="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-400 outline-none transition-all"
                                   onchange="window.applyLibraryFilter('search', this.value)">
                        </div>

                        <!-- Фильтры -->
                        <div class="flex flex-wrap gap-2 pb-1 md:pb-0">
                            <select class="flex-1 min-w-0 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer lg:hidden"
                                    onchange="window.applyLibraryFilter('composerId', this.value)">
                                <option value="">Все композиторы</option>
                                ${composerOptions}
                            </select>

                            <select class="flex-1 min-w-0 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
                                    onchange="window.applyLibraryFilter('sortBy', this.value)">
                                <option value="newest">Сначала новые</option>
                                <option value="oldest">Сначала старые</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- 2. Панель действий (Play All / Shuffle / Count) -->
                <div id="library-action-bar" class="flex items-center justify-between mb-4 px-2 hidden">
                    <div class="text-sm text-gray-500">
                        <span id="library-total-count" class="text-gray-900 font-bold text-lg">0</span> записей
                    </div>
                    <div class="flex gap-2">
                        ${
                          title !== "Видеозал"
                            ? `
                        <button id="library-play-all-btn" class="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95">
                            <i data-lucide="play" class="w-4 h-4 fill-current"></i> <span class="hidden sm:inline">Слушать всё</span>
                        </button>
                        <button id="library-shuffle-btn" class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-bold shadow-sm hover:shadow transition-all active:scale-95">
                            <i data-lucide="shuffle" class="w-4 h-4"></i> <span class="hidden sm:inline">Перемешать</span>
                        </button>
                        `
                            : ""
                        }
                    </div>
                </div>

                <!-- 3. Список результатов -->
                <div id="library-results-container" class="min-h-[200px]"></div>

                <!-- 4. Кнопка загрузки -->
                <div id="library-load-more" class="mt-8 text-center hidden">
                    <button onclick="window.loadMoreLibrary()" class="px-8 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-full hover:bg-gray-50 hover:shadow-md transition-all">
                        Загрузить ещё
                    </button>
                </div>

            </div>
        </div>
    </div>
    `;

  listEl.innerHTML = layoutHtml;
  if (window.lucide) window.lucide.createIcons();
}

export function renderLibraryContent(
  recordings,
  type = "list",
  favs,
  reset = false
) {
  const actionBar = document.getElementById("library-action-bar");
  const totalCountEl = document.getElementById("library-total-count");

  if (actionBar && totalCountEl) {
    if (recordings.length > 0) {
      actionBar.classList.remove("hidden");
      totalCountEl.textContent =
        recordings.length + (window.state.libraryFilters.hasMore ? "+" : "");
    } else {
      actionBar.classList.add("hidden");
    }
  }

  const container = document.getElementById("library-results-container");
  if (!container) return;

  if (recordings.length === 0) {
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

  // --- ЛОГИКА ДЛЯ СПИСКА (АУДИО) ---
  if (type === "list") {
    const rows = recordings.map((r, i) => {
        const isFav = favs.has(r.id);
        const compTitle = r.composition.title_ru || r.composition.title;
        const composerName = r.composition.work.composer.name_ru;
        const performerText = r.performers || "Исполнитель не указан";
        const isSelected = window.state && window.state.selectedRecordingIds.has(r.id);
        const cover = r.composition.cover_art_url || r.composition.work.cover_art_url || "/static/img/placeholder.png";
        const yearHtml = r.recording_year ? `<span class="text-gray-300 mx-1">•</span><span>${r.recording_year}</span>` : "";

        // === НОВАЯ ЛОГИКА ===
        const isSingleMovement = r.composition.sort_order === 0;

        let mainTitleLink, mainTitleText, subtitleHtml;

        const composerLink = `<a href="/composers/${r.composition.work.composer.slug || r.composition.work.composer.id}" data-navigo class="hover:underline hover:text-cyan-600">${composerName}</a>`;
        const workLink = `<a href="/works/${r.composition.work.slug || r.composition.work.id}" data-navigo class="hover:underline hover:text-cyan-600">${r.composition.work.name_ru}</a>`;

        if (isSingleMovement) {
            // Если это одночастное произведение (как Багатель)
            mainTitleLink = `/works/${r.composition.work.slug || r.composition.work.id}`;
            mainTitleText = r.composition.work.name_ru; // Главный заголовок - название произведения
            // В подписи убираем дублирование названия произведения
            subtitleHtml = `
                ${composerLink}
                <span class="text-gray-300 mx-1">•</span>
                <span>${performerText}</span>
                ${yearHtml}
            `;
        } else {
            // Если это часть большого произведения (как часть сонаты)
            mainTitleLink = `/compositions/${r.composition.slug || r.composition.id}`;
            mainTitleText = compTitle; // Главный заголовок - название части
            // В подписи оставляем все как было
            subtitleHtml = `
                ${composerLink}
                <span class="text-gray-300 mx-1">•</span>
                ${workLink}
                <span class="text-gray-300 mx-1">•</span>
                <span>${performerText}</span>
                ${yearHtml}
            `;
        }
        // === КОНЕЦ НОВОЙ ЛОГИКИ ===

        return `
          <div class="recording-item group flex items-center p-3 hover:bg-cyan-50 select-none ${ isSelected ? "bg-cyan-50" : "border-b border-gray-100" } bg-white last:border-0 transition-colors cursor-pointer"
               data-recording-id="${r.id}" data-index="${i}">

               <div class="selection-checkbox-container w-10 justify-center items-center flex-shrink-0 transition-all ${ window.state?.isSelectionMode ? "flex" : "hidden md:flex" }">
                 <input type="checkbox" class="recording-checkbox w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer" data-id="${r.id}" ${isSelected ? "checked" : ""}>
               </div>

               ${!isLoggedIn() ? '<div class="hidden md:block w-2"></div>' : ""}

               <div class="w-12 flex justify-center items-center text-cyan-600 recording-play-pause-btn hover:scale-110 transition-transform flex-shrink-0" id="list-play-btn-${r.id}">
                  <i data-lucide="play" class="w-5 h-5 fill-current"></i>
               </div>

               <div class="flex-shrink-0 mx-2 md:mx-4">
                  <img src="${cover}" class="w-10 h-10 rounded-lg object-cover shadow-sm border border-gray-100" loading="lazy">
               </div>

               <div class="flex-1 min-w-0">
                   <div class="font-bold text-gray-800 text-sm leading-tight break-words">
                      <a href="${mainTitleLink}" data-navigo class="hover:underline hover:text-cyan-600">${mainTitleText}</a>
                   </div>
                   <div class="text-xs text-gray-500 mt-0.5 break-words">
                      ${subtitleHtml}
                   </div>
               </div>

               <div class="flex items-center ml-auto pl-3 flex-shrink-0">
                    <div class="hidden md:flex items-center">
                        ${ isLoggedIn() ? `
                            <button class="favorite-btn p-2 mr-2 ${ isFav ? "text-red-500" : "text-gray-300 hover:text-red-400" }" data-recording-id="${r.id}">
                                <i data-lucide="heart" class="w-4 h-4 ${ isFav ? "fill-current" : "" }"></i>
                            </button>` : '<div class="w-10"></div>'
                        }
                    </div>

                    <div class="text-xs text-gray-500 font-mono w-10 text-right">${formatDuration(r.duration)}</div>
               </div>
          </div>`;
      })
      .join("");

    html = `<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">${rows}</div>`;
  }
  // --- ЛОГИКА ДЛЯ СЕТКИ (ВИДЕО) ---
  else {
    const cards = recordings
      .map((r) => {
        const compTitle = r.composition.title_ru;
        const workTitle = r.composition.work.name_ru;
        const composerName = r.composition.work.composer.name_ru;
        const youtubeId = r.youtube_url.split("v=")[1]?.split("&")[0];

        let extraInfoHtml = "";

        if (r.lead_performer) {
          extraInfoHtml += `<div class="truncate" title="Солист: ${r.lead_performer}"><span class="font-semibold text-gray-400 text-[10px] uppercase">Солист:</span> ${r.lead_performer}</div>`;
        }

        if (r.conductor) {
          extraInfoHtml += `<div class="truncate" title="Дирижер: ${r.conductor}"><span class="font-semibold text-gray-400 text-[10px] uppercase">Дирижёр:</span> ${r.conductor}</div>`;
        }

        const controls = isAdmin()
          ? `
                <div class="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1.5 rounded-lg shadow-md z-10">
                    <span class="text-[10px] text-gray-400 font-mono select-all cursor-copy hover:text-cyan-600 transition-colors px-1">#${r.id}</span>
                    <button class="edit-video-btn p-1.5 text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-md transition-colors" data-recording-id="${r.id}" title="Редактировать">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button class="delete-video-btn p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" data-recording-id="${r.id}" title="Удалить">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
                `
          : "";

        return `
             <div class="relative bg-white rounded-xl border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all p-4 flex flex-col h-full group">
                 ${controls}
                 <div class="relative aspect-video rounded-lg bg-gray-100 mb-4 overflow-hidden cursor-pointer"
                      onclick="window.playYouTubeVideo('${youtubeId}')">

                     <img src="https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy">

                     <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div class="bg-white/80 backdrop-blur-sm p-4 rounded-full text-red-600 shadow-lg">
                            <i data-lucide="play" class="w-8 h-8 fill-current"></i>
                        </div>
                     </div>
                 </div>

                 <div class="mb-2">
                    <h3 class="font-bold text-gray-800 line-clamp-2 text-sm">${compTitle}</h3>
                    <p class="text-xs text-gray-500 mt-1">${workTitle} • ${composerName}</p>
                 </div>
                 
                 <!-- Блок с доп. информацией (Солист/Дирижер) -->
                 <div class="mb-3 text-xs text-gray-600 space-y-1">
                    ${extraInfoHtml}
                 </div>

                 <div class="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400">
                    <span class="pr-2 truncate max-w-[70%]">${
                      r.performers || "Unknown"
                    }</span>
                    <span class="flex-shrink-0 font-mono">${
                      r.recording_year || ""
                    }</span>
                 </div>
             </div>
             `;
      })
      .join("");

    html = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">${cards}</div>`;
  }

  if (reset) {
    container.innerHTML = html;
  } else {
    container.innerHTML = html;
  }

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
          <p>Далее начнётся воспроизведение случайного произведения.</p>
      </div>
    `;
  } else {
    queueHtml =
      '<p class="text-center text-sm text-gray-400 mt-8">Начните воспроизведение, чтобы увидеть очередь</p>';
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
