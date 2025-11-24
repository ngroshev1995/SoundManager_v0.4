// static/js/ui.js

let selectedRecordingFile = null;

function isAdmin() {
    // Ты не можешь быть админом, если ты не залогинен
    return isLoggedIn() && localStorage.getItem("is_admin") === "true";
}

function isLoggedIn() {
    return !!localStorage.getItem("access_token");
}

// --- HELPERS ---

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
    const favLink = document.getElementById("nav-favorites-link"); // <--- НОВОЕ

    if (!container) return;

    if (!isLoggedIn()) {
        // ГОСТЬ
        container.innerHTML = `
            <button id="show-login-modal-btn" class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-bold">
                Войти
            </button>
        `;
        // Скрываем личные разделы
        if (plLink) plLink.classList.add("hidden");
        if (favLink) favLink.classList.add("hidden");
    } else {
        // ПОЛЬЗОВАТЕЛЬ (АДМИН ИЛИ ОБЫЧНЫЙ)
        const username = localStorage.getItem("user_email")?.split("@")[0] || "User";
        container.innerHTML = `
            <span class="text-sm font-bold opacity-90">Здравствуйте, ${username}! 👋</span>
            <button id="logout-btn" class="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors" title="Выйти">
               <i data-lucide="log-out" class="w-4 h-4"></i>
            </button>
        `;
        // Показываем личные разделы
        if (plLink) plLink.classList.remove("hidden");
        if (favLink) favLink.classList.remove("hidden");
    }
}

function getLocalizedText(entity, field, lang) {
  if (!entity) return "";
  const ruField = `${field}_ru`;
  const originalField =
    field === "name" ? "original_name" : `${field}_original`;

  // Приоритет: Русский -> Английский -> Оригинал
  if (lang === "ru" && entity[ruField]) return entity[ruField];
  if (entity[field]) return entity[field];
  if (entity[originalField]) return entity[originalField];

  return entity[ruField] || ""; // Fallback
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

function formatDuration(seconds) {
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

  // ВАЖНО: Убираем инлайн-стиль display, который ставит showAuthView
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
            poster="/static/img/hero.jpg"
            class="w-full h-full object-cover transition-transform duration-[20000ms] ease-linear transform group-hover:scale-105"
          >
            <source src="/static/video/hero.mp4" type="video/mp4">
            <!-- Если видео не поддерживается браузером, покажется картинка (poster) -->
          </video>

          <!-- Затемняющий градиент (ОБЯЗАТЕЛЬНО ОСТАВИТЬ, иначе текст не будет читаться) -->
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-900/40"></div>
        </div>

        <div class="max-w-7xl mx-auto px-6 py-24 relative z-10">
          <!-- ... (весь контент заголовка и поиска остается без изменений) ... -->
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

            <a href="/favorites" data-navigo class="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl font-bold border border-white/20 transition-all flex items-center gap-2">
               <i data-lucide="heart" class="w-5 h-5"></i> Избранное
            </a>

             <a href="/composers" data-navigo class="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl font-bold border border-white/20 transition-all flex items-center gap-2">
              <i data-lucide="users" class="w-5 h-5"></i> Композиторы
            </a>
          </div>
        </div>
      </div>
    `;


  // Stats Strip
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
        // ССЫЛКА ПО ID
        return `
            <a href="/works/${item.slug || item.id}" data-navigo
               class="bg-white rounded-xl p-4 shadow-sm hover:shadow-xl transition-all border border-gray-100 hover:border-cyan-200 group flex flex-col h-full">
                <div class="relative aspect-square mb-4 overflow-hidden rounded-lg bg-gray-100">
                    <img src="${cover}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
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
  const audioRecordings = recordings.filter(r => r.duration > 0);
  const videoRecordings = recordings.filter(r => r.duration === 0);

  let htmlContent = "";

  // 1. БЛОК АУДИО (Если есть)
  if (audioRecordings.length > 0) {
      const audioRows = audioRecordings.map((r, i) => {
          const isFav = favoriteRecordingIds.has(r.id);
          const compName = getLocalizedText(r.composition, "title", lang);
          const compoName = getLocalizedText(r.composition.work.composer, "name", lang);
          const workName = getLocalizedText(r.composition.work, "name", lang);
          const cover = r.composition.cover_art_url || r.composition.work.cover_art_url || "/static/img/placeholder.png";
          const composerLink = `/composers/${r.composition.work.composer.slug || r.composition.work.composer.id}`;
          const workLink = `/works/${r.composition.work.slug || r.composition.work.id}`;
          const isSelected = window.state && window.state.selectedRecordingIds.has(r.id);

          return `
          <div class="recording-item group flex items-center p-3 hover:bg-cyan-50/80 ${isSelected ? "bg-cyan-50 border-cyan-200" : "border-b border-gray-100"} rounded-xl transition-colors cursor-pointer last:border-0"
               data-recording-id="${r.id}" data-index="${i}">

               <div class="w-10 flex justify-center items-center">
                    <input type="checkbox" class="recording-checkbox w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer" data-id="${r.id}" ${isSelected ? "checked" : ""}>
               </div>

               <div class="w-12 flex justify-center items-center text-cyan-600 recording-play-pause-btn hover:scale-110 transition-transform" id="list-play-btn-${r.id}">
                    <i data-lucide="play" class="w-5 h-5 fill-current"></i>
               </div>

               <img src="${cover}" class="w-10 h-10 rounded-lg object-cover shadow-sm mx-4 border border-gray-100">

               <div class="flex-1 min-w-0 mr-4">
                   <div class="font-semibold text-gray-800 truncate text-sm flex items-center">
                        ${compName}
                        ${getYoutubeIcon(r.youtube_url)}
                   </div>
                   <div class="text-xs text-gray-500 truncate">${r.performers || "Исполнитель не указан"}</div>
               </div>

               ${!hideComposer ? `<div class="hidden md:block w-1/4 text-sm text-gray-600 truncate mr-4"><a href="${composerLink}" data-navigo class="hover:text-cyan-600 hover:underline">${compoName}</a></div>` : ""}
               ${!hideWork ? `<div class="hidden lg:block w-1/4 text-sm text-gray-500 truncate mr-4"><a href="${workLink}" data-navigo class="hover:text-cyan-600 hover:underline">${workName}</a></div>` : ""}

               <button class="favorite-btn p-2 ${isFav ? "text-red-500" : "text-gray-300 hover:text-red-400"}" data-recording-id="${r.id}">
                   <i data-lucide="heart" class="w-4 h-4 ${isFav ? "fill-current" : ""}"></i>
               </button>

               <div class="w-12 text-right text-xs text-gray-500 font-mono ml-2">${formatDuration(r.duration)}</div>
          </div>`;
      }).join("");

      htmlContent += `
        <div class="mb-10">
            <h3 class="text-lg font-bold mb-4 text-gray-700 flex items-center gap-2"><i data-lucide="disc" class="w-5 h-5 text-cyan-600"></i> Аудиозаписи</h3>
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">${audioRows}</div>
        </div>`;
  }

  // 2. БЛОК ВИДЕО (Если есть)
  if (videoRecordings.length > 0) {
      const videoRows = videoRecordings.map(r => {
          const compName = getLocalizedText(r.composition, "title", lang);
          const workName = getLocalizedText(r.composition.work, "name", lang);
          const composerName = getLocalizedText(r.composition.work.composer, "name", lang);

          const controls = isAdmin() ? `
            <div class="flex gap-2 ml-2 border-l border-gray-200 pl-2 flex-shrink-0">
                <button class="edit-video-btn p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors" data-recording-id="${r.id}" title="Редактировать">
                    <i data-lucide="edit-2" class="w-4 h-4"></i>
                </button>
                <button class="delete-video-btn p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" data-recording-id="${r.id}" title="Удалить">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
          ` : "";

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
                            ${r.performers || "Исполнитель не указан"} • ${workName}
                       </div>
                   </div>
               </div>

               <!-- ИСПРАВЛЕНИЕ: Добавлен класс ml-6 для отступа слева -->
               <div class="flex items-center flex-shrink-0 ml-6">
                   <a href="${r.youtube_url}" target="_blank" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap">
                       <span>Смотреть</span> <i data-lucide="external-link" class="w-4 h-4"></i>
                   </a>
                   ${controls}
               </div>
          </div>`;
      }).join("");

      htmlContent += `
        <div>
            <h3 class="text-lg font-bold mb-4 text-gray-700 flex items-center gap-2"><i data-lucide="video" class="w-5 h-5 text-red-600"></i> Видеозаписи</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${videoRows}</div>
        </div>`;
  }

  listEl.innerHTML = `<div class="max-w-7xl mx-auto px-6">${htmlContent}</div>`;
  if (window.lucide) window.lucide.createIcons();
}

// --- 3. RENDER COMPOSERS LIST (С ПОДГРУЗКОЙ) ---
export function renderComposerList(composers, isAppend = false, hasMore = true, lang = "ru") {
  const { listEl } = getElements();

  // Если это первая загрузка (не добавление), рисуем каркас страницы
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

      // Рисуем контейнер для сетки и контейнер для кнопки
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

  // Генерируем HTML карточек
  const cardsHtml = composers.map((c) => {
      const years = formatYearRange(c.year_born, c.year_died);
      const yearsBadge = years
        ? `<p class="text-xs text-gray-500 mt-1 font-medium bg-gray-50 inline-block px-2 py-0.5 rounded-full border border-gray-200">${years}</p>`
        : "";

      return `
      <a href="/composers/${c.slug || c.id}" data-navigo
         class="bg-white rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all flex items-center gap-4 border border-gray-100 hover:border-cyan-200 group animate-fade-in">
          <img src="${c.portrait_url || "/static/img/placeholder.png"}" class="w-16 h-16 rounded-full object-cover border-2 border-gray-100 group-hover:border-cyan-100 transition-colors shadow-sm flex-shrink-0">
          <div class="min-w-0">
              <h3 class="font-bold text-gray-800 group-hover:text-cyan-600 transition-colors truncate">${getLocalizedText(c, "name", lang)}</h3>
              ${yearsBadge}
          </div>
      </a>
  `;
  }).join("");

  // Вставляем карточки в сетку
  const grid = document.getElementById("composers-grid");
  if (grid) {
      // Вставляем HTML в конец контейнера (не стирая старое)
      grid.insertAdjacentHTML('beforeend', cardsHtml);
  }

  // Управляем кнопкой "Показать еще"
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

  // 1. СКРЫВАЕМ ВЕРХНИЙ КОНТЕЙНЕР
  document.getElementById("view-title-container").classList.add("hidden");

  const nameRu = composer.name_ru;
  const nameOrig = composer.original_name;
  const swapBtn = nameOrig
    ? `<button class="lang-swap-btn ml-3 p-2 rounded-full text-gray-400 hover:text-cyan-600 hover:bg-gray-50 transition-colors" title="Показать оригинал">
         <i data-lucide="globe" class="w-5 h-5"></i>
       </button>`
    : "";

  // Панель кнопок
  const actionsBar = isAdmin() ? `
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
  ` : "";

  // 2. ФОРМИРУЕМ ШАПКУ
  const header = `
        <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-start mb-8">
            <div class="flex-shrink-0">
                <img src="${composer.portrait_url || "/static/img/placeholder.png"}"
                     class="w-32 h-32 md:w-40 md:h-40 rounded-xl object-cover border border-gray-100 shadow-sm">
            </div>

            <div class="flex-1 w-full text-left">
                <!-- ВЕРНУЛ КЛАСС title-container (нужен для переключения языка) -->
                <div class="title-container flex items-center gap-2 mb-1">
                     <!-- ВЕРНУЛ font-bold вместo font-extrabold -->
                     <h1 class="text-2xl md:text-3xl font-bold text-gray-900 leading-tight main-title-text"
                        data-ru="${nameRu}"
                        data-orig="${nameOrig || ''}">${nameRu}</h1>
                    ${swapBtn}
                </div>

                <p class="text-gray-500 text-lg font-medium">${formatYearRange(composer.year_born, composer.year_died)}</p>

                ${actionsBar}
            </div>
        </div>
    `;

  let bioHtml = "";
  if (composer.notes) {
      // Убираем тег "Биография", так как он есть внутри текста
      // Но если вам нужно общее название блока, можно оставить h3

      // ID для JS
      const contentId = `bio-content-${composer.id}`;
      const btnId = `bio-btn-${composer.id}`;
      const gradientId = `bio-gradient-${composer.id}`;

bioHtml = `
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-10 group/bio">
          <div class="relative">
              <div class="bio-content prose prose-cyan max-w-none text-gray-600 leading-relaxed max-h-60 overflow-hidden transition-all duration-500 ease-in-out" data-expanded="false">
                  ${composer.notes}
              </div>
              <!-- Градиент внутри relative контейнера -->
              <div class="bio-gradient absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"></div>
          </div>

          <!-- Кнопка в обычном потоке (снизу) -->
          <div class="flex justify-center -mt-4 relative z-10">
              <button class="bio-toggle-btn px-6 py-2 bg-white border border-gray-200 text-cyan-600 font-bold rounded-full shadow-sm hover:shadow-md hover:bg-cyan-50 transition-all flex items-center gap-2 text-sm">
                  <span class="btn-text">Читать далее</span> <i data-lucide="chevron-down" class="w-4 h-4 transition-transform duration-300"></i>
              </button>
          </div>
      </div>`;

      // Добавляем скрипт для обработки клика ПОСЛЕ того, как HTML попадет в DOM
      // Поскольку мы в SPA, лучше всего использовать делегирование событий в main.js,
      // но для простоты можно использовать setTimeout здесь же, если мы уверены, что renderWorkList вызывается один раз.
      // ЛУЧШИЙ ВАРИАНТ: Добавить data-атрибуты и обработать в main.js.

      // Давайте перепишем кнопку с data-атрибутами для чистоты:
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
  if (!works || !works.length) {
    content = '<div class="text-left text-gray-500 italic bg-gray-50 p-8 rounded-xl border border-dashed border-gray-300">Произведения пока не добавлены.</div>';
  } else {
    const cards = works.map((w) => {
        if (w.name === "Без сборника") return "";
        const cover = w.cover_art_url || "/static/img/placeholder.png";
        const link = `/works/${w.slug || w.id}`;

        return `
            <a href="${link}" data-navigo
               class="bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-cyan-400 hover:shadow-lg transition-all group flex flex-col h-full"
               title="${w.original_name || ""}">
                <div class="aspect-square bg-gray-100 relative overflow-hidden">
                    <img src="${cover}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span class="text-white text-sm font-bold flex items-center gap-1"><i data-lucide="corner-down-right" class="w-4 h-4"></i> Открыть</span>
                    </div>
                </div>
                <div class="p-4 flex-1 flex flex-col text-left">
                    <h4 class="font-bold text-gray-800 text-sm line-clamp-2 group-hover:text-cyan-600 transition-colors mb-1">${getLocalizedText(w,"name",lang)}</h4>
                    <p class="text-xs text-gray-400 mt-auto pt-2 border-t border-gray-50 flex justify-between">
                        <span>${formatYearRange(w.publication_year, w.publication_year_end)}</span>
                        <span class="text-cyan-600 font-medium">${w.compositions ? w.compositions.length : 0} ч.</span>
                    </p>
                </div>
            </a>
        `;
    }).join("");
    content = `<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">${cards}</div>`;
  }

  // 4. СОБИРАЕМ
  listEl.innerHTML = `
      <div class="max-w-7xl mx-auto px-6 pb-16">
          ${header}
          ${bioHtml} <!-- ВСТАВИЛИ БИОГРАФИЮ СЮДА -->
          <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 text-left">
              <i data-lucide="book-open" class="w-5 h-5 text-cyan-600"></i>
              <span>Произведения</span>
          </h3>
          ${content}
      </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}




// --- 5. RENDER COMPOSITION GRID (СТРАНИЦА ПРОИЗВЕДЕНИЯ) ---
export async function renderCompositionGrid(work, lang = "ru") {
  const { listEl } = getElements();
  document.getElementById("view-title-container").classList.add("hidden");

  // Данные заголовка
  const nameRu = work.name_ru;
  const nameOrig = work.original_name;
  const catalogHtml = work.catalog_number
      ? `<span class="text-gray-500 text-xl font-normal ml-3 px-2 py-0.5 bg-gray-100 rounded-md">${work.catalog_number}</span>`
      : "";

  const swapBtn = nameOrig
    ? `<button class="lang-swap-btn ml-3 p-2 rounded-full text-gray-400 hover:text-cyan-600 hover:bg-gray-50 transition-colors" title="Показать оригинал">
         <i data-lucide="globe" class="w-5 h-5"></i>
       </button>`
    : "";

  const composerLink = `/composers/${work.composer.slug || work.composer.id}`;

  // Кнопки управления
  const adminControls = isAdmin() ? `
    <div class="flex flex-wrap gap-3 mt-4 md:mt-0">
        <button id="direct-upload-btn" class="bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-cyan-700 transition-colors shadow-sm flex items-center gap-2" data-work-id="${work.id}">
            <i data-lucide="upload-cloud" class="w-4 h-4"></i> <span>Загрузить запись</span>
        </button>
        <button id="add-composition-btn" class="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <i data-lucide="plus" class="w-4 h-4"></i> <span>Часть</span>
        </button>
        <button id="edit-work-btn" class="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors" title="Редактировать">
            <i data-lucide="edit-2" class="w-5 h-5"></i>
        </button>
        <button id="delete-work-btn" class="border border-red-200 text-red-500 px-3 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors" title="Удалить">
            <i data-lucide="trash-2" class="w-5 h-5"></i>
        </button>
    </div>` : "";

  // Шапка
  const header = `
        <div class="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-start mb-8">
            <img src="${work.cover_art_url || "/static/img/placeholder.png"}" class="w-32 h-32 md:w-40 md:h-40 rounded-xl shadow-md object-cover flex-shrink-0 border border-gray-100">
            <div class="flex-1 w-full">
                <div class="text-xs text-cyan-600 font-bold uppercase tracking-wider mb-1">Произведение</div>
                <div class="title-container flex items-center flex-wrap mb-2">
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-900 main-title-text"
                        data-ru="${nameRu}" data-orig="${nameOrig || ''}">${nameRu}</h1>
                    ${catalogHtml}
                    ${swapBtn}
                </div>
                <a href="${composerLink}" data-navigo class="text-lg text-gray-600 hover:text-cyan-600 font-medium flex items-center gap-2 mb-6 w-fit">
                    <i data-lucide="user" class="w-4 h-4"></i> ${getLocalizedText(work.composer, "name", lang)}
                </a>
                ${adminControls}
            </div>
        </div>
    `;

  // История
let historyHtml = "";
  if (work.notes) {
      historyHtml = `
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-10 group/bio">
          <!-- Заголовок убран, так как он может быть внутри текста -->
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

  // === ЛОГИКА ОТОБРАЖЕНИЯ КОНТЕНТА ===
  let content = "";
  const compositions = work.compositions || [];

  // Флаг: показывать ли как "Одночастное с записями"
  let showAsSingleWithRecords = false;
  let singlePartRecordings = [];

  // 1. Проверяем: если часть одна, есть ли у нее записи?
  if (compositions.length === 1) {
      const comp = compositions[0];
      try {
         const recs = await window.apiRequest(`/api/recordings/compositions/${comp.id}/recordings`);
         // Если записи ЕСТЬ, включаем режим "Одночастное произведение"
         if (recs.length > 0) {
             showAsSingleWithRecords = true;
             singlePartRecordings = recs;
             // Обновляем плеер (только аудио)
             window.state.currentViewRecordings = recs.filter(r => r.duration > 0);
         }
      } catch (e) { console.error(e); }
  }

  // --- ВЕТВЛЕНИЕ ЛОГИКИ ---

  if (showAsSingleWithRecords) {
      // СЦЕНАРИЙ 1: Одна часть + ЕСТЬ записи -> Показываем плеер и видео
      const audioRecs = singlePartRecordings.filter(r => r.duration > 0);
      const videoRecs = singlePartRecordings.filter(r => r.duration === 0);
      let finalHtml = "";

      // Блок Аудио
      if (audioRecs.length > 0) {
          const rows = audioRecs.map((r, i) => {
            const isFav = window.state.favoriteRecordingIds.has(r.id);
            const isSelected = window.state.selectedRecordingIds.has(r.id);
            return `
            <div class="recording-item group flex items-center p-4 hover:bg-cyan-50 ${isSelected ? "bg-cyan-50 border-cyan-200" : "border-b border-gray-100"} bg-white last:border-0 transition-colors cursor-pointer"
                 data-recording-id="${r.id}" data-index="${i}">
                 <div class="w-10 flex justify-center items-center">
                    <input type="checkbox" class="recording-checkbox w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer" data-id="${r.id}" ${isSelected ? "checked" : ""}>
                 </div>
                 <div class="w-12 flex justify-center items-center text-cyan-600 recording-play-pause-btn hover:scale-110 transition-transform" id="list-play-btn-${r.id}">
                    <i data-lucide="play" class="w-6 h-6 fill-current"></i>
                 </div>
                 <div class="flex-1 ml-4">
                     <div class="font-bold text-gray-800 text-lg flex items-center">
                        ${r.performers || "Неизвестный исполнитель"}
                        ${getYoutubeIcon(r.youtube_url)}
                     </div>
                     <div class="text-xs text-gray-500 font-mono mt-0.5">${r.recording_year || ""}</div>
                 </div>
                 <button class="favorite-btn p-2 mr-4 ${isFav ? "text-red-500" : "text-gray-300 hover:text-red-400"}" data-recording-id="${r.id}">
                     <i data-lucide="heart" class="w-5 h-5 ${isFav ? "fill-current" : ""}"></i>
                 </button>
                 <div class="w-16 text-right text-sm text-gray-500 font-mono">${formatDuration(r.duration)}</div>
            </div>`;
          }).join("");

          finalHtml += `
            <div class="mt-8">
                <h3 class="text-lg font-bold mb-4 px-1 text-gray-700 flex items-center gap-2"><i data-lucide="disc" class="w-5 h-5 text-cyan-600"></i> Аудиозаписи</h3>
                <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">${rows}</div>
            </div>`;
      }

      // Блок Видео
      if (videoRecs.length > 0) {
           const videoRows = videoRecs.map(r => {
               const controls = isAdmin() ? `
                <div class="flex gap-2 ml-2 border-l border-gray-200 pl-2 flex-shrink-0">
                    <button class="edit-video-btn p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors" data-recording-id="${r.id}">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button class="delete-video-btn p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" data-recording-id="${r.id}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>` : "";

               return `
              <div class="bg-white p-4 rounded-xl border border-gray-100 hover:border-red-200 hover:shadow-md transition-all flex items-start justify-between group">
                   <div class="flex items-start gap-4 min-w-0 mr-4">
                       <div class="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 mt-1">
                           <i data-lucide="youtube" class="w-6 h-6"></i>
                       </div>
                       <div class="min-w-0">
                           <div class="font-bold text-gray-800 mb-0.5">${r.performers || "Исполнитель не указан"}</div>
                           <div class="text-xs text-gray-500 font-mono">${r.recording_year || "Год не указан"}</div>
                       </div>
                   </div>
                   <div class="flex items-center flex-shrink-0 ml-6">
                       <a href="${r.youtube_url}" target="_blank" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap">
                           <span>Смотреть</span> <i data-lucide="external-link" class="w-4 h-4"></i>
                       </a>
                       ${controls}
                   </div>
              </div>
           `}).join("");

           finalHtml += `
            <div class="mt-8">
                <h3 class="text-lg font-bold mb-4 px-1 text-gray-700 flex items-center gap-2"><i data-lucide="video" class="w-5 h-5 text-red-600"></i> Видео (${videoRecs.length})</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${videoRows}</div>
            </div>`;
      }
      content = finalHtml;

  } else if (compositions.length > 0) {
      // СЦЕНАРИЙ 2:
      // - Либо частей > 1
      // - Либо часть 1, но она ПУСТАЯ (без записей) <-- ВАШ СЛУЧАЙ
      // Показываем СПИСОК ЧАСТЕЙ, чтобы вы видели свою созданную часть.

      const list = compositions.map(c => `
            <a href="/compositions/${c.slug || c.id}" data-navigo
               class="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-cyan-300 hover:shadow-md transition-all group mb-3"
               title="${c.title_original || ""}">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition-colors font-bold text-sm">
                        ${c.catalog_number || "#"}
                    </div>
                    <span class="font-semibold text-gray-800 group-hover:text-cyan-700 transition-colors">${getLocalizedText(c, "title", lang)}</span>
                </div>
                <i data-lucide="chevron-right" class="w-5 h-5 text-gray-300 group-hover:text-cyan-500"></i>
            </a>
        `).join("");

      content = `<div class="mt-8"><h3 class="text-lg font-bold mb-4 px-1 text-gray-700">Список частей</h3>${list}</div>`;

  } else {
      // СЦЕНАРИЙ 3: Частей вообще нет (0)
      content = `<div class="text-center text-gray-500 italic py-12 bg-gray-50 rounded-xl mt-8 border-2 border-dashed border-gray-200">
        Произведение пустое. <br>Загрузите запись (будет создана основная часть) или добавьте части вручную.
      </div>`;
  }

  listEl.innerHTML = `<div class="max-w-7xl mx-auto px-6 pb-10">${header}${historyHtml}${content}</div>`;
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
  const swapBtn = titleOrig
    ? `<button class="lang-swap-btn ml-2 p-1 rounded-full text-gray-400 hover:text-cyan-600 transition-colors" title="Показать оригинал">
           <i data-lucide="globe" class="w-5 h-5"></i>
       </button>`
    : "";

  const workLink = `/works/${composition.work.slug || composition.work.id}`;

  const header = `
        <div class="max-w-7xl mx-auto px-6 pt-6 pb-8">
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <a href="${workLink}" data-navigo class="text-xs font-bold text-cyan-600 uppercase tracking-wider hover:underline">Произведение</a>
                        <span class="text-gray-300">/</span>
                        <span class="text-gray-400 text-xs">${
                          composition.catalog_number || ""
                        }</span>
                    </div>

                    <div class="title-container flex items-center gap-2 mb-2">
                        <h1 class="text-2xl md:text-3xl font-bold text-gray-900 main-title-text"
                            data-ru="${titleRu}"
                            data-orig="${titleOrig || ""}">${titleRu}</h1>
                        ${swapBtn}
                    </div>

                    <div class="text-gray-500 text-sm flex items-center gap-2">
                        <i data-lucide="disc" class="w-4 h-4"></i>
                        <span>Исполнений: <b>${
                          recordings ? recordings.length : 0
                        }</b></span>
                    </div>
                </div>

                ${isAdmin() ? `
                <div class="flex gap-3 w-full md:w-auto">
                    <button id="delete-composition-btn" class="p-2.5 border border-red-100 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Удалить часть">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                    <button id="edit-composition-btn" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm">
                        Редактировать
                    </button>
                    <button class="add-recording-btn px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-200 transition-all flex items-center justify-center gap-2 text-sm" data-composition-id="${composition.id}">
                        <i data-lucide="upload-cloud" class="w-4 h-4"></i> <span>Загрузить</span>
                    </button>
                </div>` : ""}
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

    // РАЗДЕЛЕНИЕ
    const audioRecs = recordings.filter(r => r.duration > 0);
    const videoRecs = recordings.filter(r => r.duration === 0);

    let finalHtml = "";

    // 1. АУДИО
    if (audioRecs.length > 0) {
        const rows = audioRecs.map((r, i) => {
            const isFav = favs.has(r.id);
            const isSelected = window.state && window.state.selectedRecordingIds.has(r.id);

            return `
            <div class="recording-item group flex items-center p-4 hover:bg-cyan-50 ${isSelected ? "bg-cyan-50 border-cyan-200" : "border-b border-gray-100"} bg-white last:border-0 transition-colors cursor-pointer"
                 data-recording-id="${r.id}" data-index="${i}">

                 <div class="w-10 flex justify-center items-center">
                    <input type="checkbox" class="recording-checkbox w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer" data-id="${r.id}" ${isSelected ? "checked" : ""}>
                 </div>

                 <div class="w-12 flex justify-center items-center text-cyan-600 recording-play-pause-btn hover:scale-110 transition-transform" id="list-play-btn-${r.id}">
                    <i data-lucide="play" class="w-6 h-6 fill-current"></i>
                 </div>

                 <div class="flex-1 ml-4">
                     <div class="font-bold text-gray-800 text-lg flex items-center">
                        ${r.performers || "Исполнитель не указан"}
                        ${getYoutubeIcon(r.youtube_url)}
                     </div>
                     <div class="text-xs text-gray-500 font-mono mt-0.5">${r.recording_year || ""}</div>
                 </div>
                 <button class="favorite-btn p-2 mr-4 ${isFav ? "text-red-500" : "text-gray-300 hover:text-red-400"}" data-recording-id="${r.id}">
                     <i data-lucide="heart" class="w-5 h-5 ${isFav ? "fill-current" : ""}"></i>
                 </button>
                 <div class="w-16 text-right text-sm text-gray-500 font-mono">${formatDuration(r.duration)}</div>
            </div>`;
        }).join("");

        finalHtml += `
         <div class="mb-10">
            <h3 class="text-lg font-bold mb-4 text-gray-700">Аудиозаписи</h3>
            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">${rows}</div>
         </div>`;
    }

    // 2. ВИДЕО
    if (videoRecs.length > 0) {
         const videoRows = videoRecs.map(r => {
            const controls = isAdmin() ? `
                <div class="flex gap-2 ml-3 border-l border-gray-200 pl-3 flex-shrink-0">
                    <button class="edit-video-btn p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors" data-recording-id="${r.id}">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button class="delete-video-btn p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" data-recording-id="${r.id}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>` : "";

            return `
              <div class="bg-white p-5 rounded-xl border border-gray-100 hover:border-red-200 hover:shadow-md transition-all flex items-center justify-between group">
                   <div class="flex items-center gap-5 min-w-0 mr-4">
                       <div class="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                           <i data-lucide="youtube" class="w-6 h-6"></i>
                       </div>
                       <div class="min-w-0">
                           <!-- ИСПРАВЛЕНИЕ: Убрал truncate -->
                           <div class="font-bold text-gray-800 text-lg leading-tight mb-0.5">${r.performers || "Исполнитель не указан"}</div>
                           <div class="text-sm text-gray-500 font-mono">${r.recording_year || "Год не указан"}</div>
                       </div>
                   </div>
                   <div class="flex items-center flex-shrink-0">
                       <a href="${r.youtube_url}" target="_blank" class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap">
                           <span>Смотреть</span> <i data-lucide="external-link" class="w-4 h-4"></i>
                       </a>
                       ${controls}
                   </div>
              </div>
           `}).join("");

         finalHtml += `
         <div>
            <h3 class="text-lg font-bold mb-4 text-gray-700">Видеозаписи</h3>
            <div class="grid grid-cols-1 gap-4">${videoRows}</div>
         </div>`;
    }

    listContainer.innerHTML = `<div class="max-w-7xl mx-auto px-6 pb-16">${finalHtml}</div>`;
  }
  if (window.lucide) window.lucide.createIcons();
}

// --- STUBS & UTILS ---
export function updatePlayerInfo(rec) {
  const el = document.getElementById("player-title");
  if (el) el.textContent = getLocalizedText(rec.composition, "title", "ru");
  const ar = document.getElementById("player-artist");
  if (ar) ar.textContent = rec.performers || "Исполнитель не указан";
  const im = document.getElementById("player-cover-art");
  if (im)
    im.src =
      rec.composition.cover_art_url ||
      rec.composition.work.cover_art_url ||
      "/static/img/placeholder.png";
}
export function updatePlayPauseIcon(isPlaying) {
  const p = document.getElementById("play-icon");
  const pp = document.getElementById("pause-icon");
  if (isPlaying) {
    p.classList.add("hidden");
    pp.classList.remove("hidden");
  } else {
    p.classList.remove("hidden");
    pp.classList.add("hidden");
  }
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
export function renderBreadcrumbs() {}
export function setUserGreeting(email) {
  // Берем имя до знака @
  const username = email.split("@")[0];
  // Формируем красивое приветствие
  document.getElementById(
    "user-greeting"
  ).textContent = `Здравствуйте, ${username}! 👋`;
}
export function updateSelectedRecordingFile(f) {
  document.getElementById("selected-recording-filename").textContent = f
    ? f.name
    : "Файл не выбран";
}

// MODALS OPEN
export function showAddComposerModal() {
  const modal = document.getElementById("add-composer-modal");
  modal.classList.remove("hidden");

  // Очистка полей
  document.querySelectorAll("#add-composer-modal input").forEach((i) => (i.value = ""));
  document.getElementById("add-composer-bio").value = "";

  // Инициализация редактора (одной строкой)
  initFullTinyMCE('#add-composer-bio');

  // Закрытие
  const closeBtn = modal.querySelector(".close-button");
  const newClose = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newClose, closeBtn);

  newClose.onclick = () => {
      // При закрытии нужно удалять вручную, чтобы не висели в памяти
      if (window.tinymce) tinymce.remove("#add-composer-bio");
      modal.classList.add("hidden");
  };
}
export function showAddWorkModal() {
  const modal = document.getElementById("add-work-modal");
  modal.classList.remove("hidden");

  document.querySelectorAll("#add-work-modal input").forEach(i => i.value = "");
  document.getElementById("add-work-notes").value = "";

  // Инициализация
  initFullTinyMCE('#add-work-notes');

  const closeBtn = modal.querySelector(".close-button");
  const newClose = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newClose, closeBtn);

  newClose.onclick = () => {
      if (window.tinymce) tinymce.remove("#add-work-notes");
      modal.classList.add("hidden");
  };
}

export function showAddCompositionModal() {
  document.getElementById("add-composition-modal").classList.remove("hidden");
  document
    .querySelectorAll("#add-composition-modal input")
    .forEach((i) => (i.value = ""));
}
export function showAddRecordingModal(id) {
  document.getElementById("add-recording-composition-id").value = id;
  document.getElementById("add-recording-modal").classList.remove("hidden");
  document
    .querySelectorAll("#add-recording-modal input:not([type=hidden])")
    .forEach((i) => (i.value = ""));
  document.getElementById("selected-recording-filename").textContent =
    "Выберите файл...";
}

export function showEditEntityModal(type, data, onSave) {
  const modal = document.getElementById("edit-modal");
  const content = document.getElementById("edit-modal-content");
  const title = document.getElementById("edit-modal-title");
  const confirmBtn = document.getElementById("confirm-edit-btn");

  // Сброс кнопки (клонирование для удаления старых event listeners)
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  // Функция очистки TinyMCE
  const cleanupTinyMCE = () => {
      if (window.tinymce) {
          if (tinymce.get("edit-notes")) tinymce.remove("#edit-notes");
          if (tinymce.get("edit-work-notes")) tinymce.remove("#edit-work-notes");
      }
  };

  // Настройка закрытия модалки с очисткой
  modal.querySelectorAll(".close-button").forEach(btn => {
      // Клонируем, чтобы убрать старые слушатели
      const newClose = btn.cloneNode(true);
      btn.parentNode.replaceChild(newClose, btn);

      newClose.onclick = () => {
          cleanupTinyMCE();
          modal.classList.add("hidden");
      };
  });

  let fields = "";
  let modalTitle = "";

  // Генерация полей в зависимости от типа
  if (type === "composer") {
    modalTitle = "Редактировать композитора";
    fields = `
        <div class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Портрет</label>
            <input type="file" id="edit-cover-file" accept="image/*" class="text-sm w-full">
        </div>

        <div class="mb-3"><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Имя (RU)</label>
        <input id="edit-name-ru" class="w-full border border-gray-300 p-2 rounded-lg" value="${
          data.name_ru || ""
        }"></div>

        <div class="mb-3"><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Имя на родном языке</label>
        <input id="edit-name-orig" class="w-full border border-gray-300 p-2 rounded-lg" value="${
          data.original_name || ""
        }" placeholder="Например: Johann Sebastian Bach"></div>

        <div class="grid grid-cols-2 gap-4 mb-3">
            <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Родился</label>
            <input type="number" id="edit-year-born" class="w-full border border-gray-300 p-2 rounded-lg" value="${
              data.year_born || ""
            }"></div>
            <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Умер</label>
            <input type="number" id="edit-year-died" class="w-full border border-gray-300 p-2 rounded-lg" value="${
              data.year_died || ""
            }"></div>
        </div>

        <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Биография</label>
        <textarea id="edit-notes" class="w-full border border-gray-300 p-2 rounded-lg h-64 resize-none">${
          data.notes || ""
        }</textarea></div>
      `;
  } else if (type === "work") {
    modalTitle = "Редактировать произведение";
    fields = `
        <div class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Обложка (применится ко всем частям)</label>
            <input type="file" id="edit-cover-file" accept="image/*" class="text-sm w-full">
        </div>

        <div class="mb-3"><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Название (RU)</label>
        <input id="edit-name-ru" class="w-full border border-gray-300 p-2 rounded-lg" value="${
          data.name_ru || ""
        }"></div>

        <div class="mb-3"><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Оригинальное название</label>
        <input id="edit-name-orig" class="w-full border border-gray-300 p-2 rounded-lg" value="${
          data.original_name || ""
        }"></div>

        <div class="mb-3"><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Каталог (Op.)</label>
        <input id="edit-work-catalog" class="w-full border border-gray-300 p-2 rounded-lg" value="${
          data.catalog_number || ""
        }"></div>

        <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Год начала</label>
            <input type="number" id="edit-year-start" class="w-full border border-gray-300 p-2 rounded-lg" value="${
              data.publication_year || ""
            }"></div>
            <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Год конца</label>
            <input type="number" id="edit-year-end" class="w-full border border-gray-300 p-2 rounded-lg" value="${
              data.publication_year_end || ""
            }"></div>
        </div>

        <div class="mt-4"><label class="block text-xs font-bold text-gray-500 uppercase mb-1">История и факты</label>
        <textarea id="edit-work-notes" class="w-full border border-gray-300 p-2 rounded-lg h-64 resize-none">${
          data.notes || ""
        }</textarea></div>
      `;
  } else if (type === "composition") {
    modalTitle = "Редактировать часть";
    fields = `
        <div class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Обложка части</label>
            <input type="file" id="edit-cover-file" accept="image/*" class="text-sm w-full">
        </div>

        <div class="mb-3"><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Название (RU)</label>
        <input id="edit-title-ru" class="w-full border border-gray-300 p-2 rounded-lg" value="${
          data.title_ru || ""
        }"></div>

        <div class="mb-3"><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Оригинальное название</label>
        <input id="edit-title-orig" class="w-full border border-gray-300 p-2 rounded-lg" value="${
          data.title_original || ""
        }"></div>

        <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Каталог (Op.)</label>
            <input id="edit-catalog" class="w-full border border-gray-300 p-2 rounded-lg" value="${
              data.catalog_number || ""
            }"></div>
            <div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Год</label>
            <input type="number" id="edit-year" class="w-full border border-gray-300 p-2 rounded-lg" value="${
              data.composition_year || ""
            }"></div>
        </div>
      `;
  } else if (type === "recording") {
    modalTitle = "Редактировать запись";
    fields = `
        <div><label class="text-xs font-bold text-gray-500 uppercase">Исполнители</label>
        <input id="edit-performers" class="w-full border p-2 rounded" value="${
          data.performers || ""
        }"></div>

        <div class="mt-2"><label class="text-xs font-bold text-gray-500 uppercase">Год записи</label>
        <input type="number" id="edit-rec-year" class="w-full border p-2 rounded" value="${
          data.recording_year || ""
        }"></div>

        <div class="mt-2"><label class="text-xs font-bold text-gray-500 uppercase">YouTube URL</label>
        <input type="text" id="edit-youtube-url" class="w-full border p-2 rounded" value="${
          data.youtube_url || ""
        }" placeholder="https://..."></div>
      `;
  } else if (type === "playlist_create" || type === "playlist_edit") {
    modalTitle = type === "playlist_create" ? "Новый плейлист" : "Переименовать плейлист";
    fields = `
        <div class="mb-3"><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Название</label>
        <input id="edit-playlist-name" class="w-full border border-gray-300 p-2 rounded-lg" value="${
          data.name || ""
        }" placeholder="Мой плейлист"></div>
      `;
  }

  title.textContent = modalTitle;
  content.innerHTML = fields;

  // Инициализация TinyMCE
  if (type === "composer" || type === "work") {
      const selectorId = (type === 'work') ? '#edit-work-notes' : '#edit-notes';
      initFullTinyMCE(selectorId);
  }


  // Обработчик сохранения
  newBtn.onclick = async () => {
    newBtn.disabled = true;
    newBtn.textContent = "Сохранение...";

    try {
      // 1. Собираем текстовые данные
      let payload = {};
      if (type === "composer") {
        let bioContent = "";
        if (window.tinymce && tinymce.get("edit-notes")) {
            bioContent = tinymce.get("edit-notes").getContent();
        } else {
            bioContent = document.getElementById("edit-notes").value;
        }

        payload = {
          name_ru: document.getElementById("edit-name-ru").value,
          original_name: document.getElementById("edit-name-orig").value,
          year_born:
            parseInt(document.getElementById("edit-year-born").value) || null,
          year_died:
            parseInt(document.getElementById("edit-year-died").value) || null,
          notes: bioContent,
        };
      } else if (type === "work") {
        // === ПОЛУЧЕНИЕ ДАННЫХ ===
        let notesContent = "";
        if (window.tinymce && tinymce.get("edit-work-notes")) {
            notesContent = tinymce.get("edit-work-notes").getContent();
        } else {
            notesContent = document.getElementById("edit-work-notes")?.value || "";
        }
        // ========================

        payload = {
          name_ru: document.getElementById("edit-name-ru").value,
          original_name: document.getElementById("edit-name-orig").value,
          catalog_number: document.getElementById("edit-work-catalog").value,
          publication_year: parseInt(document.getElementById("edit-year-start").value) || null,
          publication_year_end: parseInt(document.getElementById("edit-year-end").value) || null,
          notes: notesContent, // <-- Передаем
        };
      } else if (type === "composition") {
        payload = {
          title_ru: document.getElementById("edit-title-ru").value,
          title_original: document.getElementById("edit-title-orig").value,
          catalog_number: document.getElementById("edit-catalog").value,
          composition_year:
            parseInt(document.getElementById("edit-year").value) || null,
        };
      } else if (type === "recording") {
        payload = {
          performers: document.getElementById("edit-performers").value,
          recording_year:
            parseInt(document.getElementById("edit-rec-year").value) || null,
          youtube_url: document.getElementById("edit-youtube-url").value.trim() || null,
        };
      } else if (type === "playlist_create" || type === "playlist_edit") {
        payload = {
          name: document.getElementById("edit-playlist-name").value,
        };
      }

      // 2. Отправляем текстовые данные
      await onSave(payload);

      // 3. Проверяем и загружаем файл (если выбран)
      const fileInput = document.getElementById("edit-cover-file");
      if (fileInput && fileInput.files.length > 0) {
          const file = fileInput.files[0];
          const fd = new FormData();
          fd.append("file", file);

          let uploadUrl = "";
          if (type === "composer") uploadUrl = `/api/recordings/composers/${data.id}/cover`;
          if (type === "work") uploadUrl = `/api/recordings/works/${data.id}/cover`;
          if (type === "composition") uploadUrl = `/api/recordings/compositions/${data.id}/cover`;

          if (uploadUrl) {
              newBtn.textContent = "Загрузка обложки...";
              await window.apiRequest(uploadUrl, "POST", fd);
          }
      }

      cleanupTinyMCE();
      modal.classList.add("hidden");

      // Обновляем страницу для отображения новой обложки/текста
      window.showNotification("Успешно сохранено!", "success");
      if (type === "composer" || type === "work" || type === "composition") {
          setTimeout(() => window.location.reload(), 500);
      }

    } catch (e) {
      window.showNotification("Ошибка: " + e.message, "error");
      newBtn.disabled = false;
      newBtn.textContent = "Сохранить";
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

  // 1. Клонируем кнопку, чтобы сбросить старые слушатели
  const oldBtn = document.getElementById("confirm-delete-btn");
  const btn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(btn, oldBtn);

  btn.textContent = "Удалить навсегда"; // Возвращаем исходный текст
  btn.classList.remove("opacity-75", "cursor-wait"); // Убираем крутящийся курсор
  btn.disabled = false;

  document.getElementById("delete-modal-title").textContent = title;
  document.getElementById("delete-modal-text").innerHTML = text;

  const input = document.getElementById("delete-verification-input");
  const cont = document.getElementById("delete-verification-container");

  // Настройка инпута
  if (verificationString) {
    cont.classList.remove("hidden");
    document.getElementById("delete-verification-target").textContent =
      verificationString;
    input.value = "";
    btn.disabled = true;
    btn.classList.add("opacity-50", "cursor-not-allowed");

    // Также клонируем инпут, чтобы сбросить старые oninput
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

  // 2. Вешаем обработчик
  btn.onclick = async (e) => {
    e.preventDefault();

    // Блокируем интерфейс
    const originalText = btn.textContent;
    btn.textContent = "Удаление...";
    btn.disabled = true;
    btn.classList.add("opacity-75", "cursor-wait");

    try {
      // Вызываем функцию подтверждения (API запрос)
      await onConfirm();
      // При успехе main.js сам закроет модалку
    } catch (err) {
      console.error("Delete failed:", err);

      // ВАЖНО: Если ошибка, возвращаем кнопку в исходное состояние!
      btn.textContent = originalText;
      btn.disabled = false;
      btn.classList.remove("opacity-75", "cursor-wait");

      // Показываем ошибку
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
  // ВАЖНО: Сначала убираем инлайн-стиль, который перекрывает класс
  menu.style.display = "none";
  menu.classList.add("hidden");
}
export function initPlayerToggle() {
    const footer = document.getElementById("music-player");
    const btn = document.getElementById("player-toggle-btn");
    const icon = document.getElementById("player-toggle-icon");
    const mainContent = document.getElementById("main-content"); // <--- Находим контейнер

    if (!footer || !btn) return;

    // Проверяем сохраненное состояние
    const isCollapsed = localStorage.getItem("player_collapsed") === "true";

    if (isCollapsed) {
        footer.classList.add("translate-y-full");
        icon.classList.add("rotate-180");
        mainContent?.classList.remove("pb-24"); // <--- Убираем отступ, если свернут
    } else {
        mainContent?.classList.add("pb-24"); // <--- Добавляем, если развернут
    }

    btn.onclick = () => {
        const collapsed = footer.classList.toggle("translate-y-full");

        if (collapsed) {
            icon.classList.add("rotate-180");
            mainContent?.classList.remove("pb-24"); // <--- Убираем отступ
        } else {
            icon.classList.remove("rotate-180");
            mainContent?.classList.add("pb-24"); // <--- Возвращаем отступ
        }

        localStorage.setItem("player_collapsed", collapsed);
    };
}


// Вспомогательная функция: принудительно открыть плеер (например, при старте трека)
export function openPlayer() {
    const footer = document.getElementById("music-player");
    const icon = document.getElementById("player-toggle-icon");
    const mainContent = document.getElementById("main-content");

    if (!footer) return;

    footer.classList.remove("translate-y-full");
    if (icon) icon.classList.remove("rotate-180");

    // Возвращаем отступ, чтобы плеер не перекрывал контент
    mainContent?.classList.add("pb-24");

    localStorage.setItem("player_collapsed", "false");
}

export function updateTrackRowIcon(recordingId, isPlaying) {
  // 1. Сначала сбрасываем ВСЕ иконки на Play
  document.querySelectorAll(".recording-play-pause-btn").forEach((btn) => {
    // Проверяем размер иконки (в списке композиций она больше)
    const size =
      btn.querySelector("svg")?.getAttribute("width") === "24"
        ? "w-6 h-6"
        : "w-5 h-5";
    btn.innerHTML = `<i data-lucide="play" class="${size} fill-current"></i>`;
  });

  // 2. Если ничего не играет, просто обновляем иконки и уходим
  if (!recordingId) {
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // 3. Находим кнопку текущего трека
  const currentBtn = document.getElementById(`list-play-btn-${recordingId}`);

  if (currentBtn) {
    const size = currentBtn.closest(".recording-item").querySelector(".text-lg")
      ? "w-6 h-6"
      : "w-5 h-5"; // Хак для определения размера

    if (isPlaying) {
      currentBtn.innerHTML = `<i data-lucide="pause" class="${size} fill-current"></i>`;
    } else {
      currentBtn.innerHTML = `<i data-lucide="play" class="${size} fill-current"></i>`;
    }
  }

  // Перерисовываем иконки
  if (window.lucide) window.lucide.createIcons();
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
                <h3 class="font-bold text-gray-800 text-lg truncate group-hover:text-cyan-600 transition-colors">${p.name}</h3>
                <p class="text-xs text-gray-400 font-medium">${p.recordings ? p.recordings.length : 0} треков</p>
            </a>

            <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button class="edit-playlist-btn p-2 bg-white rounded-lg shadow-md text-gray-600 hover:text-cyan-600" data-id="${p.id}" data-name="${p.name}" title="Переименовать">
                    <i data-lucide="edit-2" class="w-4 h-4"></i>
                </button>
                <button class="delete-playlist-btn p-2 bg-white rounded-lg shadow-md text-red-400 hover:text-red-600" data-id="${p.id}" data-name="${p.name}" title="Удалить">
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

// Управление панелью массовых действий
export function updateSelectionBar(count, context) {
  const bar = document.getElementById("selection-bar");
  const countEl = document.getElementById("selection-count");
  const delText = document.getElementById("bulk-delete-text");

  if (!bar) return;

  if (count > 0) {
    bar.classList.remove("translate-y-full");
    countEl.textContent = `${count} выбрано`;

    // Меняем текст кнопки удаления в зависимости от того, где мы
    if (context === "playlist") {
      delText.textContent = "Убрать из плейлиста";
    } else {
      delText.textContent = "Удалить файлы";
    }
  } else {
    bar.classList.add("translate-y-full");
  }
}

// Модалка выбора плейлиста (для массового добавления)
export function showSelectPlaylistModal(playlists, onSelect) {
  const modal = document.getElementById("edit-modal"); // Используем то же окно
  const content = document.getElementById("edit-modal-content");
  const title = document.getElementById("edit-modal-title");
  const confirmBtn = document.getElementById("confirm-edit-btn");

  // Скрываем кнопку "Сохранить", она тут не нужна, выбор по клику
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

    // Вешаем обработчики на строки
    content.querySelectorAll(".playlist-option").forEach((el) => {
      el.onclick = () => {
        onSelect(el.dataset.pid);
        modal.classList.add("hidden");
        confirmBtn.classList.remove("hidden"); // Возвращаем кнопку для других модалок
      };
    });
  }

  // Обработчик закрытия (крестик)
  const closeBtn = modal.querySelector(".close-button");
  const tempClose = () => {
    confirmBtn.classList.remove("hidden"); // Возвращаем кнопку
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
        const items = data.composers.map(c => `
            <a href="/composers/${c.slug || c.id}" data-navigo
               class="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-cyan-300 hover:shadow-md transition-all group">
                <img src="${c.portrait_url || '/static/img/placeholder.png'}" class="w-16 h-16 rounded-full object-cover">
                <div>
                    <h4 class="font-bold text-gray-800 group-hover:text-cyan-600 transition-colors">${c.name_ru}</h4>
                    <p class="text-xs text-gray-500">${c.original_name || ''}</p>
                </div>
            </a>
        `).join("");

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
        const items = data.works.map(w => `
            <a href="/works/${w.slug || w.id}" data-navigo
               class="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-cyan-300 hover:shadow-md transition-all group">
                <div class="w-12 h-12 bg-cyan-50 rounded-lg flex items-center justify-center text-cyan-600 flex-shrink-0">
                    <i data-lucide="book-open" class="w-6 h-6"></i>
                </div>
                <div>
                    <h4 class="font-bold text-gray-800 group-hover:text-cyan-600 transition-colors">${w.name_ru}</h4>
                    <p class="text-sm text-gray-500">${w.composer.name_ru}</p>
                </div>
            </a>
        `).join("");

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
        const items = data.compositions.map(c => `
            <a href="/compositions/${c.slug || c.id}" data-navigo
               class="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-cyan-300 transition-all group">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">${c.catalog_number || '#'}</div>
                    <div class="truncate">
                        <div class="font-semibold text-gray-800 group-hover:text-cyan-600 truncate">${c.title_ru}</div>
                        <div class="text-xs text-gray-400 truncate">${c.work.composer.name_ru} — ${c.work.name_ru}</div>
                    </div>
                </div>
                <i data-lucide="chevron-right" class="w-4 h-4 text-gray-300"></i>
            </a>
        `).join("");

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
        // Используем логику генерации строк из renderRecordingList, но упрощенно
        // Чтобы не дублировать код, можно вызвать renderRecordingList в отдельный div,
        // но здесь мы соберем вручную для контроля верстки.
        const items = data.recordings.map((r, i) => {
            const isFav = favoriteIds.has(r.id);
            return `
            <div class="recording-item group flex items-center p-3 hover:bg-cyan-50 bg-white border-b border-gray-100 last:border-0 transition-colors cursor-pointer"
                 data-recording-id="${r.id}" data-index="${i}">
                 <div class="w-10 flex justify-center items-center text-cyan-600 recording-play-pause-btn hover:scale-110 transition-transform" id="list-play-btn-${r.id}">
                    <i data-lucide="play" class="w-5 h-5 fill-current"></i>
                 </div>
                 <div class="flex-1 ml-4 min-w-0">
                     <div class="font-bold text-gray-800 text-sm truncate">${r.performers}</div>
                     <div class="text-xs text-gray-500 truncate">${r.composition.title_ru} (${r.composition.work.composer.name_ru})</div>
                 </div>
                 <button class="favorite-btn p-2 ${isFav ? "text-red-500" : "text-gray-300 hover:text-red-400"}" data-recording-id="${r.id}">
                     <i data-lucide="heart" class="w-4 h-4 ${isFav ? "fill-current" : ""}"></i>
                 </button>
            </div>
            `;
        }).join("");

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
  // 1. ВОТ ЭТА СТРОКА БЫЛА ПОТЕРЯНА. ОНА ОБЯЗАТЕЛЬНА:
  const { listEl } = getElements();

  const viewTitle = document.getElementById("view-title-container");
  if (viewTitle) {
      viewTitle.classList.remove("hidden");
      // Центрируем заголовок
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
// Вспомогательная функция для инициализации мощного редактора
function initFullTinyMCE(selectorId) {
    if (!window.tinymce) return;

    // Удаляем старый экземпляр, если был
    // (selectorId приходит в формате '#id', для remove нужен id без решетки или селектор)
    const idWithoutHash = selectorId.replace('#', '');
    if (tinymce.get(idWithoutHash)) {
        tinymce.remove(selectorId);
    }

    tinymce.init({
        selector: selectorId,
        height: 400, // Сделали повыше
        menubar: true, // Включили верхнее меню (Файл, Правка...)
        promotion: false, // Убрали кнопку "Upgrade"
        branding: false, // Убрали логотип TinyMCE

        // === ПОЛНЫЙ НАБОР ПЛАГИНОВ ===
        plugins: 'preview importcss searchreplace autolink autosave save directionality code visualblocks visualchars fullscreen image link media template codesample table charmap pagebreak nonbreaking anchor insertdatetime advlist lists wordcount help charmap quickbars emoticons',

        // === ПОЛНЫЙ ТУЛБАР ===
        toolbar: 'undo redo | bold italic underline strikethrough | fontfamily fontsize blocks | alignleft aligncenter alignright alignjustify | outdent indent |  numlist bullist | forecolor backcolor removeformat | pagebreak | charmap emoticons | fullscreen  preview save print | insertfile image media template link anchor codesample | ltr rtl',

        // === ВАЖНО: СКРЫВАЕМ СКРОЛЛБАР ===
        // 'sliding' создает кнопку "...", куда прячутся лишние инструменты
        toolbar_mode: 'sliding',

        contextmenu: 'link image table',
        language: 'ru', // Если у вас подключен языковой пакет (иначе будет англ)
    });
}