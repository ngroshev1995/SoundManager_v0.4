// static/js/ui.js

let selectedRecordingFile = null;

// --- HELPERS ---

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
  document.getElementById("auth-view").classList.add("hidden");
  document.getElementById("main-view").classList.remove("hidden");
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
      <div class="relative text-white overflow-hidden -mt-4 rounded-b-3xl shadow-xl">
        <div class="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1507838153414-b4b713384ebd?w=1600&q=80" class="w-full h-full object-cover transform scale-105">
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-900/40"></div>
        </div>
        <div class="max-w-7xl mx-auto px-6 py-24 relative z-10">
          <h1 class="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight">
            Ваша персональная<br /><span class="text-cyan-400">Филармония</span>
          </h1>
          
          <!-- Поиск -->
          <div class="relative max-w-xl mb-8 group">
             <i data-lucide="search" class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-cyan-500 transition-colors"></i>
             <input type="text" id="hero-search-input" placeholder="Поиск композиторов, произведений..." 
                    class="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/95 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 shadow-2xl text-lg transition-all">
          </div>

          <div class="flex flex-wrap gap-4">
            <a href="/recordings" data-navigo class="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg transition-transform hover:-translate-y-1 flex items-center gap-2">
              <i data-lucide="play-circle" class="w-5 h-5"></i> Медиатека
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
            <a href="/works/${item.id}" data-navigo 
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
    viewTitle.innerHTML = `<h2 class="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3"><i data-lucide="list" class="w-6 h-6 text-gray-400"></i> ${
      title || "Список"
    }</h2>`;
  }

  if (!recordings || !recordings.length) {
    listEl.innerHTML =
      '<div class="text-center py-16 text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed border-gray-200">Список пуст</div>';
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const html = recordings
    .map((r, i) => {
      const isFav = favoriteRecordingIds.has(r.id);
      const compName = getLocalizedText(r.composition, "title", lang);
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

      // ССЫЛКИ ПО ID
      const composerLink = `/composers/${r.composition.work.composer.id}`;
      const workLink = `/works/${r.composition.work.id}`;

      return `
      <div class="recording-item group flex items-center p-3 hover:bg-cyan-50/80 rounded-xl transition-colors cursor-pointer border-b border-gray-100 last:border-0" 
           data-recording-id="${r.id}" data-index="${i}">
           <div class="w-8 text-center text-gray-400 font-medium text-sm group-hover:hidden">${
             startIndex + i + 1
           }</div>
           <div class="w-8 hidden group-hover:flex justify-center text-cyan-600 recording-play-pause-btn"><i data-lucide="play" class="w-4 h-4 fill-current"></i></div>
           
           <img src="${cover}" class="w-10 h-10 rounded-lg object-cover shadow-sm mx-4 border border-gray-100">
           
           <div class="flex-1 min-w-0 mr-4">
               <div class="font-semibold text-gray-800 truncate text-sm">${compName}</div>
               <div class="text-xs text-gray-500 truncate">${
                 r.performers || "Не указан"
               }</div>
           </div>
           
           ${
             !hideComposer
               ? `<div class="hidden md:block w-1/4 text-sm text-gray-600 truncate mr-4"><a href="${composerLink}" data-navigo class="hover:text-cyan-600 hover:underline">${compoName}</a></div>`
               : ""
           }
           ${
             !hideWork
               ? `<div class="hidden lg:block w-1/4 text-sm text-gray-500 truncate mr-4"><a href="${workLink}" data-navigo class="hover:text-cyan-600 hover:underline">${workName}</a></div>`
               : ""
           }
           
           <button class="favorite-btn p-2 ${
             isFav ? "text-red-500" : "text-gray-300 hover:text-red-400"
           } transition-transform active:scale-90" data-recording-id="${r.id}">
               <i data-lucide="heart" class="w-4 h-4 ${
                 isFav ? "fill-current" : ""
               }"></i>
           </button>
           
           <div class="w-12 text-right text-xs text-gray-500 font-mono ml-2">${formatDuration(
             r.duration
           )}</div>
      </div>
      `;
    })
    .join("");

  listEl.innerHTML = `<div class="max-w-7xl mx-auto px-6"><div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">${html}</div></div>`;
  if (window.lucide) window.lucide.createIcons();
}

// --- 3. RENDER COMPOSERS LIST (СЕТКА) ---
export function renderComposerList(composers, lang = "ru") {
  const { listEl } = getElements();
  const viewTitle = document.getElementById("view-title-container");
  viewTitle.classList.remove("hidden");

  viewTitle.innerHTML = `
        <div class="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2"><i data-lucide="users" class="w-6 h-6 text-cyan-600"></i> Композиторы</h2>
            <button id="add-composer-btn" class="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2 transition-colors text-sm font-bold">
                <i data-lucide="plus" class="w-4 h-4"></i> <span class="hidden sm:inline">Добавить</span>
            </button>
        </div>
    `;

  const html = composers
    .map((c) => {
      // Формируем годы
      const years = formatYearRange(c.year_born, c.year_died);
      // Рисуем блок с годами ТОЛЬКО если они есть
      const yearsBadge = years
        ? `<p class="text-xs text-gray-500 mt-1 font-medium bg-gray-50 inline-block px-2 py-0.5 rounded-full border border-gray-200">${years}</p>`
        : "";

      return `
      <a href="/composers/${c.id}" data-navigo 
         class="bg-white rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all flex items-center gap-4 border border-gray-100 hover:border-cyan-200 group">
          <img src="${
            c.portrait_url || "/static/img/placeholder.png"
          }" class="w-16 h-16 rounded-full object-cover border-2 border-gray-100 group-hover:border-cyan-100 transition-colors shadow-sm">
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
  listEl.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto px-6 pb-10">${html}</div>`;
  if (window.lucide) window.lucide.createIcons();
}

// --- 4. RENDER WORK LIST (ПРОФИЛЬ КОМПОЗИТОРА) ---
export function renderWorkList(works, composer, lang = "ru") {
  const { listEl } = getElements();
  const viewTitle = document.getElementById("view-title-container");
  viewTitle.classList.remove("hidden");

  // Шапка Композитора + КНОПКИ УПРАВЛЕНИЯ
  viewTitle.innerHTML = `
        <div class="flex flex-col md:flex-row items-start md:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
            <img src="${
              composer.portrait_url || "/static/img/placeholder.png"
            }" class="w-32 h-32 rounded-full object-cover border-4 border-cyan-50 shadow-md flex-shrink-0">
            <div class="flex-1 min-w-0">
                <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-1 truncate">${getLocalizedText(
                  composer,
                  "name",
                  lang
                )}</h1>
                <p class="text-gray-500 text-lg font-medium mb-4">${formatYearRange(
                  composer.year_born,
                  composer.year_died
                )}</p>
                <div class="flex flex-wrap gap-3">
                     <button id="add-work-btn" class="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm flex items-center gap-2">
                        <i data-lucide="plus" class="w-4 h-4"></i> Произведение
                     </button>
                     <button id="edit-composer-btn" class="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2">
                        <i data-lucide="edit-2" class="w-4 h-4"></i> Ред.
                     </button>
                     <div class="w-px bg-gray-300 h-8 mx-1 self-center"></div>
                     <button id="delete-composer-btn" class="border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 px-3 py-2 rounded-lg transition-colors" title="Удалить">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                     </button>
                </div>
            </div>
        </div>
        <h3 class="text-xl font-bold text-gray-800 px-2 mb-4 flex items-center gap-2"><i data-lucide="book-open" class="w-5 h-5 text-cyan-600"></i> Произведения</h3>
    `;

  if (!works || !works.length) {
    listEl.innerHTML =
      '<div class="max-w-7xl mx-auto px-6 py-8 text-center text-gray-500 italic bg-gray-50 rounded-xl border border-dashed border-gray-300">Произведения пока не добавлены.</div>';
  } else {
    const cards = works
      .map((w) => {
        if (w.name === "Без сборника") return "";
        const cover = w.cover_art_url || "/static/img/placeholder.png";
        // ССЫЛКА ПО ID
        return `
            <a href="/works/${w.id}" data-navigo
               class="bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-cyan-400 hover:shadow-lg transition-all group flex flex-col h-full">
                <div class="aspect-square bg-gray-100 relative overflow-hidden">
                    <img src="${cover}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span class="text-white text-sm font-bold flex items-center gap-1"><i data-lucide="corner-down-right" class="w-4 h-4"></i> Открыть</span>
                    </div>
                </div>
                <div class="p-4 flex-1 flex flex-col">
                    <h4 class="font-bold text-gray-800 text-sm line-clamp-2 group-hover:text-cyan-600 transition-colors mb-1">${getLocalizedText(
                      w,
                      "name",
                      lang
                    )}</h4>
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
    listEl.innerHTML = `<div class="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 pb-16 px-6">${cards}</div>`;
  }
  if (window.lucide) window.lucide.createIcons();
}

// --- 5. RENDER COMPOSITION GRID (СТРАНИЦА ПРОИЗВЕДЕНИЯ) ---
export function renderCompositionGrid(work, lang = "ru") {
  const { listEl } = getElements();
  document.getElementById("view-title-container").classList.add("hidden");

  // Шапка Произведения + КНОПКИ
  const header = `
        <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-start mb-8">
            <img src="${
              work.cover_art_url || "/static/img/placeholder.png"
            }" class="w-40 h-40 rounded-lg shadow-lg object-cover flex-shrink-0">
            <div class="flex-1 w-full">
                <div class="text-xs text-cyan-600 font-bold uppercase tracking-wider mb-1">Произведение</div>
                <h1 class="text-3xl font-bold text-gray-900 mb-2">${getLocalizedText(
                  work,
                  "name",
                  lang
                )}</h1>
                <a href="/composers/${
                  work.composer.id
                }" data-navigo class="text-lg text-gray-600 hover:text-cyan-600 font-medium flex items-center gap-2 mb-6 w-fit">
                    <i data-lucide="user" class="w-4 h-4"></i> ${getLocalizedText(
                      work.composer,
                      "name",
                      lang
                    )}
                </a>
                
                <div class="flex flex-wrap gap-3">
                    <button id="add-composition-btn" class="bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-cyan-700 transition-colors shadow-sm flex items-center gap-2">
                        <i data-lucide="plus" class="w-4 h-4"></i> Часть
                    </button>
                    <button id="edit-work-btn" class="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors">Редактировать</button>
                    <button id="delete-work-btn" class="border border-red-200 text-red-500 px-3 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors" title="Удалить произведение">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

  let content = "";
  if (work.compositions && work.compositions.length > 0) {
    content = work.compositions
      .map(
        (c) => `
            <a href="/compositions/${c.id}" data-navigo
               class="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-cyan-300 hover:shadow-md transition-all group mb-3">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition-colors font-bold text-sm">
                        ${c.catalog_number || "#"}
                    </div>
                    <span class="font-semibold text-gray-800 group-hover:text-cyan-700 transition-colors">${getLocalizedText(
                      c,
                      "title",
                      lang
                    )}</span>
                </div>
                <i data-lucide="chevron-right" class="w-5 h-5 text-gray-300 group-hover:text-cyan-500"></i>
            </a>
        `
      )
      .join("");
  } else {
    content =
      '<div class="text-center text-gray-500 italic py-8 bg-gray-50 rounded-xl">Части еще не добавлены.</div>';
  }

  listEl.innerHTML = `<div class="max-w-7xl mx-auto px-6 pb-10">${header}<h3 class="text-lg font-bold mb-4 px-1 text-gray-700">Список частей</h3>${content}</div>`;
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
  document.getElementById("view-title-container").classList.add("hidden"); // Скрываем, т.к. рисуем свой

  const header = `
        <div class="max-w-7xl mx-auto px-6 pt-6 pb-8">
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <a href="/works/${
                          composition.work.id
                        }" data-navigo class="text-xs font-bold text-cyan-600 uppercase tracking-wider hover:underline">Произведение</a>
                        <span class="text-gray-300">/</span>
                        <span class="text-gray-400 text-xs">${
                          composition.catalog_number || ""
                        }</span>
                    </div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2">${getLocalizedText(
                      composition,
                      "title",
                      lang
                    )}</h1>
                    <div class="text-gray-500 text-sm flex items-center gap-2">
                        <i data-lucide="disc" class="w-4 h-4"></i>
                        <span>Исполнений: <b>${
                          recordings ? recordings.length : 0
                        }</b></span>
                    </div>
                </div>
                
                <div class="flex gap-3 w-full md:w-auto">
                    <button id="delete-composition-btn" class="p-2.5 border border-red-100 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Удалить часть">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                    <button id="edit-composition-btn" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm">
                        Редактировать
                    </button>
                    <button class="add-recording-btn px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-200 transition-all flex items-center justify-center gap-2 text-sm" data-composition-id="${
                      composition.id
                    }">
                        <i data-lucide="upload-cloud" class="w-4 h-4"></i> <span>Загрузить</span>
                    </button>
                </div>
            </div>
        </div>
    `;

  // Рисуем
  listEl.innerHTML = header;
  const listContainer = document.createElement("div");
  listEl.appendChild(listContainer);

  if (!recordings || recordings.length === 0) {
    listContainer.innerHTML = `
            <div class="max-w-7xl mx-auto px-6">
                <div class="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <i data-lucide="music" class="w-12 h-12 text-gray-300 mx-auto mb-3"></i>
                    <h3 class="text-lg font-medium text-gray-900">Нет записей</h3>
                    <p class="text-gray-500 mb-6">Загрузите первое исполнение</p>
                </div>
            </div>`;
  } else {
    // Встраиваем таблицу записей
    const rows = recordings
      .map((r, i) => {
        const isFav = favs.has(r.id);
        return `
            <div class="recording-item group flex items-center p-4 hover:bg-cyan-50 bg-white border-b border-gray-100 last:border-0 transition-colors cursor-pointer" 
                 data-recording-id="${r.id}" data-index="${i}">
                 <div class="w-10 text-center text-gray-400 font-bold text-sm group-hover:hidden">${
                   i + 1
                 }</div>
                 <div class="w-10 hidden group-hover:flex justify-center text-cyan-600 recording-play-pause-btn"><i data-lucide="play" class="w-5 h-5 fill-current"></i></div>
                 <div class="flex-1 ml-4">
                     <div class="font-bold text-gray-800 text-lg">${
                       r.performers || "Неизвестный исполнитель"
                     }</div>
                     <div class="text-xs text-gray-500 font-mono mt-0.5">${
                       r.recording_year || ""
                     }</div>
                 </div>
                 <button class="favorite-btn p-2 mr-4 ${
                   isFav ? "text-red-500" : "text-gray-300 hover:text-red-400"
                 }" data-recording-id="${r.id}">
                     <i data-lucide="heart" class="w-5 h-5 ${
                       isFav ? "fill-current" : ""
                     }"></i>
                 </button>
                 <div class="w-16 text-right text-sm text-gray-500 font-mono">${formatDuration(
                   r.duration
                 )}</div>
            </div>
            `;
      })
      .join("");
    listContainer.innerHTML = `<div class="max-w-7xl mx-auto px-6 pb-16"><div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">${rows}</div></div>`;
  }
  if (window.lucide) window.lucide.createIcons();
}

// --- STUBS & UTILS ---
export function updatePlayerInfo(rec) {
  const el = document.getElementById("player-title");
  if (el) el.textContent = getLocalizedText(rec.composition, "title", "ru");
  const ar = document.getElementById("player-artist");
  if (ar) ar.textContent = rec.performers;
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
export function setUserGreeting(e) {
  document.getElementById("user-greeting").textContent = e.split("@")[0];
}
export function updateSelectedRecordingFile(f) {
  document.getElementById("selected-recording-filename").textContent = f
    ? f.name
    : "Файл не выбран";
}

// MODALS OPEN
export function showAddComposerModal() {
  document.getElementById("add-composer-modal").classList.remove("hidden");
  document
    .querySelectorAll("#add-composer-modal input")
    .forEach((i) => (i.value = ""));
}
export function showAddWorkModal() {
  document.getElementById("add-work-modal").classList.remove("hidden");
  document
    .querySelectorAll("#add-work-modal input")
    .forEach((i) => (i.value = ""));
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
export function showDeleteModal({ title, text, verificationString = null, onConfirm }) {
  const modal = document.getElementById("delete-modal");
  if (!modal) return;

  // 1. Клонируем кнопку, чтобы сбросить все старые слушатели (защита от двойных кликов)
  const oldBtn = document.getElementById("confirm-delete-btn");
  const btn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(btn, oldBtn);

  document.getElementById("delete-modal-title").textContent = title;
  document.getElementById("delete-modal-text").innerHTML = text;

  const input = document.getElementById("delete-verification-input");
  const cont = document.getElementById("delete-verification-container");

  // Настройка инпута
  if (verificationString) {
    cont.classList.remove("hidden");
    document.getElementById("delete-verification-target").textContent = verificationString;
    input.value = "";
    btn.disabled = true;
    btn.classList.add("opacity-50", "cursor-not-allowed");

    input.oninput = (e) => {
      const match = e.target.value === verificationString;
      btn.disabled = !match;
      if (match) btn.classList.remove("opacity-50", "cursor-not-allowed");
      else btn.classList.add("opacity-50", "cursor-not-allowed");
    };
  } else {
    cont.classList.add("hidden");
    input.oninput = null;
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
      btn.classList.add("opacity-75");

      try {
          // Вызываем функцию из main.js
          await onConfirm();
          // Если успешно - main.js сам закроет окно и перенаправит
      } catch (err) {
          // Если ошибка - возвращаем кнопку в исходное состояние
          console.error("Delete failed:", err);
          btn.textContent = originalText;
          btn.disabled = false;
          btn.classList.remove("opacity-75");
          // Показываем ошибку пользователю (функция showNotification глобальная или импортированная)
          if (window.showNotification) window.showNotification(err.message, "error");
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
  menu.classList.add("hidden");
}
