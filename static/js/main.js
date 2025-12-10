// static/js/main.js
import { apiRequest } from "./api.js";
import { initAuth } from "./auth.js";
import * as ui from "./ui.js";
import * as player from "./player.js";

window.apiRequest = apiRequest;
window.showNotification = ui.showNotification;
window.player = player;

const router = new Navigo("/", { hash: true });

let state = {
  playlists: [],
  currentViewRecordings: [],
  selectedRecordingIds: new Set(),
  favoriteRecordingIds: new Set(),
  favoritesLoaded: false,
  composersPagination: {
    skip: 0,
    limit: 12, // Сколько грузить за раз
    hasMore: true,
  },
  view: {
    current: "recordings",
    currentComposer: null,
    currentWork: null,
    currentComposition: null,
    playlistId: null,
    searchQuery: null,
  },
  isSelectionMode: false,
  pagination: { currentPage: 1, itemsPerPage: 50, totalPages: 1 },
  displayLanguage: "ru",
  selectedRecordingIds: new Set(), // <--- ДОБАВИТЬ ЭТО
  lastSelectedId: null, // Для Shift+Click
  libraryFilters: {
    page: 1,
    limit: 20,
    mediaType: null, // 'audio' или 'video'
    composerId: "",
    genre: "",
    sortBy: "newest",
    search: "",
    hasMore: true,
  },
  composersList: [],
};

window.state = state;

document.addEventListener("DOMContentLoaded", main);

function main() {
  const token = localStorage.getItem("access_token");

  // 1. Инициализация (всегда)
  player.initPlayer();
  addEventListeners();
  if (window.lucide) window.lucide.createIcons();

  // 2. Логика успешного входа (вызывается из auth.js)
  initAuth(() => {
    ui.showMainApp();

    // Обновляем шапку (показываем логин, плейлисты)
    ui.updateHeaderAuth();

    // Инициализируем роутер, если нужно
    setupRouter();

    // Переходим на главную
    router.navigate("/");
    state.view.current = "dashboard";
    loadCurrentView();
  });

  // 3. Старт приложения
  setupRouter(); // Настраиваем ссылки
  ui.updateHeaderAuth(); // <--- ВАЖНО: Обновляем шапку при старте (гость или юзер)

  // Показываем приложение сразу (даже гостям!)
  ui.showMainApp();

  // Если есть токен, можно дополнительно проверить валидность,
  // но пока просто считаем, что пользователь вошел.
  // Если токена нет - updateHeaderAuth нарисует кнопку "Войти".

  // Если URL пустой - грузим дашборд
  if (!window.location.hash || window.location.hash === "#/") {
    state.view.current = "dashboard";
  }

  // Загружаем контент (для гостей тоже)
  loadCurrentView();
}

// Добавь эту функцию-хелпер:
async function fetchUserProfile() {
  try {
    // Нужно создать эндпоинт /api/users/me который возвращает {id, email, is_admin}
    // Если его нет, используем заглушку или старый способ, но лучше добавить эндпоинт.
    // Пока предположим, что мы сохраняем флаг при логине.

    // ВРЕМЕННОЕ РЕШЕНИЕ:
    const userEmail = localStorage.getItem("user_email");
    if (userEmail) ui.setUserGreeting(userEmail);

    // Лучше всего сохранить роль в localStorage при логине
  } catch (e) {
    console.error(e);
  }
}

function resetViewState() {
  state.view.currentComposer = null;
  state.view.currentWork = null;
  state.view.currentComposition = null;
  state.view.playlistId = null;
  state.currentViewRecordings = [];
  state.selectedRecordingIds.clear(); // Очищаем список ID
  ui.updateSelectionBar(0);
}

function setupRouter() {
  router

    .hooks({
      before: (done) => {
        // Этот код будет выполняться ПЕРЕД КАЖДЫМ переходом по ссылке.
        // Это самое надежное место, чтобы закрыть меню.
        const mobileMenuPanel = document.getElementById("mobile-menu-panel");
        if (mobileMenuPanel) {
          mobileMenuPanel.classList.add("hidden");
        }
        done(); // Разрешаем роутеру продолжить переход.
      },
    })

    .on({
      "/": () => {
        state.view.current = "dashboard";
        resetViewState();
        loadCurrentView();
      },
      "/search/:query": ({ data }) => {
        state.view.current = "search";
        resetViewState();
        state.view.searchQuery = decodeURIComponent(data.query);
        loadCurrentView();
      },
      "/recordings": () => {
        state.view.current = "recordings";
        resetViewState();
        loadCurrentView();
      },
      "/composers": () => {
        state.view.current = "composers";
        resetViewState();
        loadCurrentView();
      },

      "/composers/:slug": ({ data }) => {
        state.view.current = "composer_detail";
        state.view.currentComposer = { id: data.slug }; // Navigo передает это как строку, всё ок
        loadCurrentView();
      },
      "/works/:slug": ({ data }) => {
        state.view.current = "work_detail";
        state.view.currentWork = { id: data.slug };
        loadCurrentView();
      },
      "/compositions/:slug": ({ data }) => {
        state.view.current = "composition_detail";
        state.view.currentComposition = { id: data.slug };
        loadCurrentView();
      },

      "/favorites": () => {
        state.view.current = "favorites";
        resetViewState();
        loadCurrentView();
      },
      "/playlists/:id": ({ data }) => {
        state.view.current = "playlist";
        state.view.playlistId = data.id;
        loadCurrentView();
      },
      "/playlists": () => {
        state.view.current = "playlists_overview"; // Новый вид
        resetViewState();
        loadCurrentView();
      },
      "/recordings": () => {
        state.view.current = "library_hub"; // Главная страница раздела
        resetViewState();
        loadCurrentView();
      },
      "/recordings/audio": () => {
        state.view.current = "library_audio"; // Только аудио
        resetViewState();
        loadCurrentView();
      },
      "/recordings/video": () => {
        state.view.current = "library_video"; // Только видео
        resetViewState();
        loadCurrentView();
      },
      "/blog": () => {
        state.view.current = "blog_list";
        resetViewState();
        loadCurrentView();
      },
      "/blog/:slug": ({ data }) => {
        state.view.current = "blog_post";
        state.view.blogSlug = data.slug;
        loadCurrentView();
      },
      "/map": async () => {
        state.view.current = "map";

        const contentHeader = document.getElementById("content-header");
        if (contentHeader) {
          contentHeader.classList.remove("hidden");
        }

        const listEl = document.getElementById("composition-list");
        if (listEl) {
          listEl.innerHTML =
            '<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div></div>';
        }

        try {
          // Проверяем, загружен ли Leaflet (L)
          if (typeof L === "undefined") {
            // Динамически импортируем скрипт Leaflet, если его еще нет
            await import("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
          }

          // Загружаем данные композиторов
          const composers = await apiRequest(
            "/api/recordings/composers?limit=1000"
          );

          // Рендерим карту
          ui.renderComposersMap(composers);

          ui.renderBreadcrumbs();
        } catch (error) {
          console.error("Failed to load map:", error);
          ui.showNotification("Не удалось загрузить карту", "error");
          if (listEl) listEl.innerHTML = ""; // Очищаем спиннер в случае ошибки
        }
      },
    })
    .resolve();

  if (!window.location.hash) router.navigate("/");
}

async function loadCurrentView() {
  document.getElementById("main-content").scrollTop = 0;

  if (!state.view.current) return;

  // === ЗАЩИТА РОУТОВ (GUARD) ===
  const protectedViews = ["favorites", "playlist", "playlists_overview"];
  const isLoggedIn = !!localStorage.getItem("access_token");

  if (protectedViews.includes(state.view.current) && !isLoggedIn) {
    // Если гость на защищенной странице -> редирект на главную
    console.warn("Доступ запрещен, редирект на главную");
    state.view.current = "dashboard";
    router.navigate("/");
    // Код продолжит выполняться уже для dashboard
  }

  const contentHeader = document.getElementById("content-header");
  if (contentHeader) {
    if (state.view.current === "dashboard") {
      contentHeader.classList.add("hidden");
    } else {
      contentHeader.classList.remove("hidden");
    }
  }

  const list = document.getElementById("composition-list");
  if (list)
    list.innerHTML =
      '<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div></div>';

  // ПРОВЕРКА: Загружаем личные данные ТОЛЬКО если есть токен
  const hasToken = !!localStorage.getItem("access_token");

  if (hasToken && !state.favoritesLoaded) {
    try {
      const f = await apiRequest("/api/users/me/favorites");
      state.favoriteRecordingIds = new Set(f.map((r) => r.id));
      state.favoritesLoaded = true;
    } catch (e) {
      console.warn(e);
    }
  }

  if (hasToken && state.playlists.length === 0) {
    try {
      const p = await apiRequest("/api/playlists/");
      state.playlists = p;
      ui.renderPlaylistList(p);
    } catch (e) {
      console.warn(e);
    }
  }

  try {
    switch (state.view.current) {
      case "dashboard":
        const d = await apiRequest("/api/dashboard/summary");
        ui.renderDashboard(d, state.displayLanguage);
        break;
      case "search":
        const s = await apiRequest(
          `/api/search/?q=${encodeURIComponent(state.view.searchQuery)}`
        );
        // Сохраняем записи в стейт, чтобы плеер мог их играть
        state.currentViewRecordings = s.recordings;

        // ВЫЗЫВАЕМ НОВУЮ ФУНКЦИЮ
        ui.renderSearchResults(s, state.favoriteRecordingIds);
        break;
      case "recordings":
        const r = await apiRequest(`/api/recordings/?skip=0&limit=50`);
        state.currentViewRecordings = r.recordings;
        ui.renderRecordingList(
          r.recordings,
          "Медиатека",
          0,
          {},
          state.favoriteRecordingIds
        );
        break;
      case "composers":
        // Сбрасываем пагинацию при первом заходе на страницу
        state.composersPagination.skip = 0;
        state.composersPagination.hasMore = true;

        // Грузим первую порцию
        await loadMoreComposers();
        break;

      case "composer_detail":
        const cId = state.view.currentComposer.id;
        const cFull = await apiRequest(`/api/recordings/composers/${cId}`);
        const works = await apiRequest(
          `/api/recordings/composers/${cId}/works`
        );
        state.view.currentComposer = cFull;
        ui.renderWorkList(works, cFull, state.displayLanguage);
        break;
      case "work_detail":
        const wId = state.view.currentWork.id;
        const wFull = await apiRequest(`/api/recordings/works/${wId}`);
        state.view.currentWork = wFull;
        state.view.currentComposer = wFull.composer;
        ui.renderCompositionGrid(wFull, state.displayLanguage);
        break;
      case "composition_detail":
        const cpId = state.view.currentComposition.id;
        const cpFull = await apiRequest(`/api/recordings/compositions/${cpId}`);
        const recs = await apiRequest(
          `/api/recordings/compositions/${cpId}/recordings`
        );
        state.view.currentComposition = cpFull;
        state.view.currentWork = cpFull.work;
        state.view.currentComposer = cpFull.work.composer;
        state.currentViewRecordings = recs;
        ui.renderCompositionDetailView(
          cpFull,
          recs,
          state.favoriteRecordingIds,
          state.displayLanguage
        );
        break;
      case "playlist":
        const pl = await apiRequest(`/api/playlists/${state.view.playlistId}`);
        state.currentViewRecordings = pl.recordings;
        ui.renderRecordingList(
          pl.recordings,
          pl.name,
          0,
          {},
          state.favoriteRecordingIds
        );
        break;
      case "favorites":
        const fav = await apiRequest("/api/users/me/favorites");
        state.currentViewRecordings = fav;
        ui.renderRecordingList(
          fav,
          "Избранное",
          0,
          {},
          state.favoriteRecordingIds
        );
        break;
      case "playlists_overview":
        const playlists = await apiRequest("/api/playlists/");
        state.playlists = playlists; // Обновляем глобальный стейт
        ui.renderPlaylistsOverview(playlists);
        break;
      case "library_hub":
        ui.renderLibraryHub();
        break;

      case "library_audio":
        // 1. Получаем список композиторов для фильтра (если еще нет)
        if (state.composersList.length === 0) {
          state.composersList = await apiRequest(
            "/api/recordings/composers?limit=100"
          );
        }

        // 2. Сбрасываем фильтры
        state.libraryFilters.mediaType = "audio";
        state.libraryFilters.composerId = "";
        state.libraryFilters.genre = "";
        state.libraryFilters.search = "";

        // 3. Рисуем каркас страницы (шапку с фильтрами)
        ui.renderLibraryPageStructure("Аудиоархив", state.composersList);

        // 4. Грузим данные
        await loadLibraryWithFilters(true);
        break;

      case "library_video":
        if (state.composersList.length === 0) {
          state.composersList = await apiRequest(
            "/api/recordings/composers?limit=100"
          );
        }
        state.libraryFilters.mediaType = "video";
        state.libraryFilters.composerId = "";
        state.libraryFilters.genre = "";
        state.libraryFilters.search = "";

        ui.renderLibraryPageStructure("Видеозал", state.composersList);
        await loadLibraryWithFilters(true);
        break;
      // === ВСТАВИТЬ ЭТОТ КУСОК ===
      case "blog_list":
        const posts = await apiRequest("/api/blog/");
        ui.renderBlogList(posts);
        break;
      case "blog_post":
        const post = await apiRequest(`/api/blog/${state.view.blogSlug}`);
        ui.renderBlogPost(post);
        break;
    }
  } catch (err) {
    console.error(err);
    // Если мы получили 404 (Not found), это нормально при удалении - игнорируем
    if (!err.message.includes("404")) {
      ui.showNotification("Ошибка загрузки: " + err.message, "error");
    }
  }

  ui.renderBreadcrumbs();

  if (window.lucide) window.lucide.createIcons();

  if (window.ui && window.ui.updateSelectionStyles) {
    window.ui.updateSelectionStyles();
  }

  if (player.hasActiveTrack()) {
    // Нужно немного подождать, пока lucide отрисует иконки Play, чтобы заменить их
    setTimeout(() => {
      // Получаем доступ к приватным переменным плеера сложно,
      // поэтому проще дернуть updateIcons, но она приватная.
      // Сделаем проще: сымитируем обновление через player.js
      // Но так как переменные закрыты, давай экспортируем метод в player.js
      player.forceUpdateIcons();
    }, 50);
  }
}

// static/js/main.js

function addEventListeners() {
  // --- ЛОГИКА МОБИЛЬНОГО МЕНЮ ---
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const mobileMenuPanel = document.getElementById("mobile-menu-panel");
  const mobileMenuCloseBtn = document.getElementById("mobile-menu-close-btn");

  if (mobileMenuBtn && mobileMenuPanel && mobileMenuCloseBtn) {
    mobileMenuBtn.addEventListener("click", () => {
      mobileMenuPanel.classList.remove("hidden");
    });
    mobileMenuCloseBtn.addEventListener("click", () => {
      mobileMenuPanel.classList.add("hidden");
    });
  }

  // 1. Инициализируем кнопку сворачивания плеера
  ui.initPlayerToggle();

  // 2. ОСНОВНОЙ СЛУШАТЕЛЬ КЛИКОВ (Делегирование событий)
  document.body.addEventListener("click", async (e) => {
    const target = e.target;

    if (target.closest("#load-more-composers-btn")) {
      loadMoreComposers();
      return;
    }

    if (target.closest("#show-login-modal-btn")) {
      ui.showAuthView();
    }

    // --- ЗАКРЫТИЕ ОКНА АВТОРИЗАЦИИ ---
    if (target.closest("#auth-close-btn")) {
      ui.showMainApp(); // Эта функция скрывает auth-view и показывает main-view
      return;
    }

    // --- ВОСПРОИЗВЕДЕНИЕ ВСЕГО ПРОИЗВЕДЕНИЯ ---
    if (target.closest("#work-play-all-btn")) {
      const work = window.state.view.currentWork;
      if (!work || !work.compositions) return;

      // ШАГ 1: Собираем плейлист из ВСЕХ аудиозаписей этого произведения.
      const playlist = work.compositions
        .flatMap((comp) => {
          // Для каждой записи добавляем полную информацию о ее "родителях"
          return comp.recordings
            .filter((r) => r.duration > 0)
            .map((rec) => ({
              ...rec,
              composition: {
                ...comp,
                work: work, // <-- ВОТ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ
              },
            }));
        })
        .sort((a, b) => a.composition.sort_order - b.composition.sort_order);

      if (playlist.length === 0) {
        return ui.showNotification(
          "В этом произведении нет аудиозаписей",
          "info"
        );
      }

      // ШАГ 2: Запускаем первый трек, передавая в плеер ПОЛНОСТЬЮ собранный плейлист.
      player.handleTrackClick(playlist[0].id, 0, playlist);
      ui.showNotification(
        `Воспроизведение ${playlist.length} треков`,
        "success"
      );
    }

    // === УПРАВЛЕНИЕ ОЧЕРЕДЬЮ ===

    // 1. Полная очистка очереди
    if (target.closest("#clear-queue-btn")) {
      e.preventDefault(); // <-- ДОБАВЬТЕ ЭТУ СТРОКУ
      player.clearFullQueue();
    }

    // 2. Удаление одного трека из очереди
    const removeBtn = target.closest(".remove-from-queue-btn");
    if (removeBtn) {
      const index = parseInt(removeBtn.dataset.index, 10);
      player.removeFromQueueByIndex(index);
    }

    // --- БЛОГ ---
    if (target.closest("#create-post-btn")) {
      ui.showBlogModal();
    }

    const editPostBtn = target.closest(".edit-post-btn");
    if (editPostBtn) {
      e.preventDefault();
      e.stopPropagation();
      const slug = editPostBtn.dataset.slug;
      const post = await apiRequest(`/api/blog/${slug}`);
      ui.showBlogModal(post);
    }

    if (target.closest("#save-blog-btn")) {
      const id = document.getElementById("blog-post-id").value;

      // === ВАЛИДАЦИЯ ===
      const title = document.getElementById("blog-title").value.trim();
      const slug = document.getElementById("blog-slug").value.trim();

      if (!title)
        return ui.showNotification("Введите заголовок статьи", "error");
      if (!slug) return ui.showNotification("URL (Slug) обязателен", "error");

      const data = {
        title: document.getElementById("blog-title").value,
        slug: document.getElementById("blog-slug").value,
        summary: document.getElementById("blog-summary").value,
        meta_description: document.getElementById("blog-meta-desc").value,
        meta_keywords: document.getElementById("blog-keywords").value,
        content: window.quillEditor.root.innerHTML,
      };

      try {
        let savedPost;
        if (id) {
          savedPost = await apiRequest(`/api/blog/${id}`, "PUT", data);
        } else {
          savedPost = await apiRequest("/api/blog/", "POST", data);
        }

        // Загрузка обложки
        const fileInput = document.getElementById("blog-cover");
        if (fileInput.files.length > 0) {
          const fd = new FormData();
          fd.append("file", fileInput.files[0]);
          await apiRequest(`/api/blog/${savedPost.id}/cover`, "POST", fd);
        }

        document.getElementById("blog-modal").classList.add("hidden");
        ui.showNotification("Сохранено", "success");
        loadCurrentView();
      } catch (e) {
        ui.showNotification(e.message, "error");
      }
    }

    if (target.closest(".delete-post-btn")) {
      e.preventDefault();
      e.stopPropagation();
      const id = target.closest(".delete-post-btn").dataset.id;

      if (confirm("Удалить статью?")) {
        try {
          await apiRequest(`/api/blog/${id}`, "DELETE");
          ui.showNotification("Статья удалена", "success");

          // 1. Меняем URL в адресной строке
          router.navigate("/blog");

          // 2. Принудительно обновляем состояние приложения
          state.view.current = "blog_list";
          state.view.blogSlug = null; // Очищаем слаг удаленной статьи

          // 3. Принудительно загружаем список
          loadCurrentView();
        } catch (e) {
          ui.showNotification("Ошибка удаления: " + e.message, "error");
        }
      }
      return;
    }

    // --- КНОПКИ БИБЛИОТЕКИ (Слушать всё / Перемешать) ---

    // 1. Слушать всё (текущие результаты фильтра)
    if (target.closest("#library-play-all-btn")) {
      const list = state.currentViewRecordings;
      if (!list || list.length === 0)
        return ui.showNotification("Список пуст", "info");

      // Запускаем первый трек, а список передаем плееру
      // (Плеер сам построит очередь из этого списка)
      player.handleTrackClick(list[0].id, 0, list);
      ui.showNotification(`Воспроизведение ${list.length} треков`, "success");
    }

    // 2. Перемешать (Shuffle)
    if (target.closest("#library-shuffle-btn")) {
      // Берем текущие загруженные записи
      // Важно: создаем копию массива, чтобы не ломать порядок в state.currentViewRecordings
      let shuffledList = [...state.currentViewRecordings];

      if (!shuffledList || shuffledList.length === 0)
        return ui.showNotification("Список пуст", "info");

      // Алгоритм тасования (мешаем копию)
      for (let i = shuffledList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledList[i], shuffledList[j]] = [shuffledList[j], shuffledList[i]];
      }

      // МЫ НЕ ПЕРЕРИСОВЫВАЕМ ИНТЕРФЕЙС!
      // Список на экране остается старым (упорядоченным).

      // Но в плеер мы отдаем перемешанную версию.
      // Плеер будет играть треки в порядке из shuffledList.

      // Запускаем первый трек из перемешанного списка
      // 0 - это индекс в shuffledList, а не в визуальном списке
      player.handleTrackClick(shuffledList[0].id, 0, shuffledList);

      ui.showNotification("Воспроизведение в случайном порядке", "success");
    }

    // --- КОНТЕКСТНОЕ МЕНЮ ---
    const ctxMenu = document.getElementById("context-menu");
    if (
      ctxMenu &&
      !ctxMenu.contains(target) &&
      !ctxMenu.classList.contains("hidden")
    ) {
      ui.hideContextMenu(ctxMenu);
    }
    const menuAction = target.closest("li[data-action]");
    if (menuAction && target.closest("#context-menu")) {
      handleContextMenuAction(menuAction);
      return;
    }

    // --- НАВИГАЦИЯ (Navigo) ---
    const navLink = target.closest("a[data-navigo]");
    if (navLink) {
      e.preventDefault();
      router.navigate(navLink.getAttribute("href"));

      // === ГАРАНТИРОВАННОЕ ЗАКРЫТИЕ МЕНЮ ===
      // Прямо здесь, после запуска навигации, мы находим панель и скрываем ее.
      // Это самое надежное место.
      const mobileMenuPanel = document.getElementById("mobile-menu-panel");
      if (mobileMenuPanel) {
        mobileMenuPanel.classList.add("hidden");
      }
      // ======================================

      return;
    }

    // --- ПЛЕЕР (Кнопка Play в списке) ---
    const playBtn = target.closest(".recording-play-pause-btn");
    if (playBtn) {
      e.stopPropagation();
      const item = playBtn.closest(".recording-item");

      // === ИСПРАВЛЕНИЕ START ===
      // UI показывает только аудио (duration > 0), и индексы (data-index)
      // расставлены относительно списка АУДИО.
      // В стейте (state.currentViewRecordings) лежат ВСЕ записи (и видео тоже).
      // Нужно передать плееру ТОЛЬКО аудио, чтобы индексы совпали.

      const playableList = state.currentViewRecordings.filter(
        (r) => r.duration > 0
      );

      player.handleTrackClick(
        parseInt(item.dataset.recordingId),
        parseInt(item.dataset.index),
        playableList // <-- Передаем отфильтрованный список
      );
      // === ИСПРАВЛЕНИЕ END ===

      return;
    }

    // --- ИЗБРАННОЕ ---
    const favBtn = target.closest(".favorite-btn");
    if (favBtn) {
      e.stopPropagation();
      toggleFavorite(parseInt(favBtn.dataset.recordingId), favBtn);
      return;
    }

    // --- ЧЕКБОКС ВЫДЕЛЕНИЯ ---
    if (target.classList.contains("recording-checkbox")) {
      const row = target.closest(".recording-item");
      if (row) {
        // Вызываем единую функцию, которая правильно управляет состоянием и стилями
        handleSelectionToggle(row);
      }
      return;
    }

    // --- МОДАЛЬНЫЕ ОКНА (Открытие) ---
    if (target.closest("#add-composer-btn")) ui.showAddComposerModal();
    if (target.closest("#add-work-btn")) ui.showAddWorkModal();
    if (target.closest("#add-composition-btn")) ui.showAddCompositionModal();

    if (target.closest(".add-recording-btn")) {
      const compId = target.closest(".add-recording-btn").dataset.compositionId;
      ui.showAddRecordingModal(compId);
    }

    // --- МОДАЛЬНЫЕ ОКНА (Закрытие) ---
    const closeBtn = target.closest(".close-button");
    if (closeBtn) {
      const modal = closeBtn.closest(".modal");
      if (modal) {
        if (modal.id === "video-player-modal") {
          closeYouTubeVideo();
        } else {
          modal.classList.add("hidden");
        }
      }
    }

    // --- СОЗДАНИЕ СУЩНОСТЕЙ (Кнопки внутри модалок) ---
    // 1. Композитор (СОЗДАНИЕ)
    const createComposerBtn = target.closest("#create-composer-btn");
    const place = document.getElementById("add-composer-city").value.trim();
    const lat = parseFloat(document.getElementById("add-composer-lat").value);
    const lng = parseFloat(document.getElementById("add-composer-lng").value);
    if (createComposerBtn) {
      e.preventDefault();

      const nameRu = document
        .getElementById("add-composer-name-ru")
        .value.trim();
      if (!nameRu) return ui.showNotification("Имя (RU) обязательно", "error");

      // Получаем биографию из Quill
      const bioContent = window.quillEditor
        ? window.quillEditor.root.innerHTML
        : "";

      const composerData = {
        name_ru: nameRu,
        original_name:
          document.getElementById("add-composer-name-orig").value.trim() ||
          null,
        year_born:
          parseInt(document.getElementById("add-composer-born").value) || null,
        year_died:
          parseInt(document.getElementById("add-composer-died").value) || null,
        notes: bioContent,
        place_of_birth: place || null,
        latitude: isNaN(lat) ? null : lat,
        longitude: isNaN(lng) ? null : lng,
      };

      createComposerBtn.disabled = true;
      createComposerBtn.textContent = "Создание...";

      try {
        const newComposer = await apiRequest(
          "/api/recordings/composers",
          "POST",
          composerData
        );

        const fileInput = document.getElementById("add-composer-portrait");
        if (fileInput && fileInput.files.length > 0) {
          createComposerBtn.textContent = "Загрузка фото...";
          const fd = new FormData();
          fd.append("file", fileInput.files[0]);
          await apiRequest(
            `/api/recordings/composers/${newComposer.id}/cover`,
            "POST",
            fd
          );
        }

        ui.showNotification("Композитор успешно создан!", "success");
        document.getElementById("add-composer-modal").classList.add("hidden");
        loadCurrentView();
      } catch (err) {
        console.error(err);
        ui.showNotification("Ошибка: " + err.message, "error");
      } finally {
        createComposerBtn.disabled = false;
        createComposerBtn.textContent = "Создать";
      }

      return;
    }

    // --- БИОГРАФИЯ (Читать далее) ---
    const bioBtn = target.closest(".bio-toggle-btn");
    if (bioBtn) {
      const container = bioBtn.closest(".group\\/bio"); // Экранируем слэш
      const content = container.querySelector(".bio-content");
      const gradient = container.querySelector(".bio-gradient");
      const icon = bioBtn.querySelector("svg") || bioBtn.querySelector("i");
      const textSpan = bioBtn.querySelector(".btn-text");

      const isExpanded = content.dataset.expanded === "true";

      if (isExpanded) {
        // Сворачиваем
        content.style.maxHeight = "15rem"; // 60 * 0.25rem (Tailwind max-h-60)
        content.dataset.expanded = "false";
        gradient.classList.remove("hidden");
        textSpan.textContent = "Читать далее";
        if (icon) icon.style.transform = "rotate(0deg)";

        // Возвращаем кнопку на место (она абсолютная, но при сворачивании блок уменьшается)
        // На самом деле, для кнопки лучше убрать absolute при разворачивании, чтобы она была в потоке.
        // ДАВАЙТЕ УЛУЧШИМ ВЕРСТКУ В UI.JS (см. ниже)
      } else {
        // Разворачиваем
        content.style.maxHeight = content.scrollHeight + "px";
        content.dataset.expanded = "true";
        gradient.classList.add("hidden");
        textSpan.textContent = "Свернуть";
        if (icon) icon.style.transform = "rotate(180deg)";
      }
      return;
    }

    // 2. Произведение (СОЗДАНИЕ)
    const createWorkBtn = target.closest("#create-work-btn");
    if (createWorkBtn) {
      e.preventDefault();
      const cId = state.view.currentComposer?.id;
      if (!cId) return ui.showNotification("Композитор не определен", "error");

      const nameRu = document.getElementById("add-work-name-ru").value.trim();
      if (!nameRu)
        return ui.showNotification("Название (RU) обязательно", "error");

      // Получаем историю из Quill
      const notesContent = window.quillEditor
        ? window.quillEditor.root.innerHTML
        : "";

      // Получаем жанр и конвертируем (если нужно)
      const genreLabel = document.getElementById("add-work-genre").value;
      // getGenreKeyByLabel должна быть доступна (либо импортирована, либо скопирована)
      // Если она в ui.js и не экспортирована в window, лучше просто найти в массиве здесь
      // Но для простоты, предположим, что ui.js подключен модулем и мы можем вызвать ui.getGenreKeyByLabel
      // или просто продублируем логику поиска здесь для надежности:
      let genreKey = genreLabel;
      // (Простейшая логика: если это не сработает, сервер примет как есть)

      const data = {
        name_ru: nameRu,
        original_name:
          document.getElementById("add-work-name-orig").value.trim() || null,
        tonality:
          document.getElementById("add-work-tonality").value.trim() || null,
        is_no_catalog: document.getElementById("add-work-no-catalog").checked, // <--- НОВОЕ
        catalog_number:
          document.getElementById("add-work-catalog").value.trim() || null,
        genre: genreLabel || null, // Отправляем то, что ввел юзер (или ключ, если он уже ключ)
        nickname:
          document.getElementById("add-work-nickname").value.trim() || null,
        publication_year:
          parseInt(document.getElementById("add-work-year-start").value) ||
          null,
        publication_year_end:
          parseInt(document.getElementById("add-work-year-end").value) || null,
        notes: notesContent,
      };

      createWorkBtn.disabled = true;
      createWorkBtn.textContent = "Создание...";

      try {
        const newWork = await apiRequest(
          `/api/recordings/composers/${cId}/works`,
          "POST",
          data
        );

        const fileInput = document.getElementById("add-work-cover");
        if (fileInput && fileInput.files.length > 0) {
          createWorkBtn.textContent = "Загрузка обложки...";
          const fd = new FormData();
          fd.append("file", fileInput.files[0]);
          await apiRequest(
            `/api/recordings/works/${newWork.id}/cover`,
            "POST",
            fd
          );
        }

        ui.showNotification("Произведение создано!", "success");
        document.getElementById("add-work-modal").classList.add("hidden");
        loadCurrentView();
      } catch (e) {
        ui.showNotification(e.message, "error");
      } finally {
        createWorkBtn.disabled = false;
        createWorkBtn.textContent = "Создать";
      }
      return;
    }

    // 3. Часть (Composition)
    const createCompBtn = target.closest("#create-composition-btn");
    if (createCompBtn) {
      e.preventDefault();
      const wId = state.view.currentWork?.id;
      if (!wId)
        return ui.showNotification("Произведение не определено", "error");

      const titleRu = document
        .getElementById("add-composition-title-ru")
        .value.trim();
      if (!titleRu)
        return ui.showNotification("Название (RU) обязательно", "error");

      const order = parseInt(
        document.getElementById("add-composition-order").value
      );
      if (isNaN(order) || order < 1) {
        return ui.showNotification(
          "Порядковый номер должен быть 1 или больше",
          "error"
        );
      }

      const data = {
        sort_order:
          parseInt(document.getElementById("add-composition-order").value) || 0, // NEW
        title_ru: titleRu,
        title_original:
          document.getElementById("add-composition-title-orig").value.trim() ||
          null,
        tonality:
          document.getElementById("add-composition-tonality").value.trim() ||
          null,
        is_no_catalog: document.getElementById("add-composition-no-catalog")
          .checked, // <--- НОВОЕ
        catalog_number:
          document.getElementById("add-composition-catalog").value.trim() ||
          null,
        composition_year:
          parseInt(document.getElementById("add-composition-year").value) ||
          null,
      };

      createCompBtn.disabled = true;
      createCompBtn.textContent = "Создание...";

      try {
        const newComp = await apiRequest(
          `/api/recordings/works/${wId}/compositions`,
          "POST",
          data
        );

        // Обложка части
        const fileInput = document.getElementById("add-composition-cover");
        if (fileInput && fileInput.files.length > 0) {
          const fd = new FormData();
          fd.append("file", fileInput.files[0]);
          await apiRequest(
            `/api/recordings/compositions/${newComp.id}/cover`,
            "POST",
            fd
          );
        }

        ui.showNotification("Часть добавлена!", "success");
        document
          .getElementById("add-composition-modal")
          .classList.add("hidden");
        loadCurrentView();
      } catch (e) {
        ui.showNotification(e.message, "error");
      } finally {
        createCompBtn.disabled = false;
        createCompBtn.textContent = "Создать";
      }
      return;
    }

    // 4. Загрузка Записи (Или добавление YouTube ссылки)
    const createRecBtn = target.closest("#create-recording-btn");
    if (createRecBtn) {
      e.preventDefault();
      const compId = document.getElementById(
        "add-recording-composition-id"
      ).value;
      const perf = document
        .getElementById("add-recording-performers")
        .value.trim();

      const youtubeInput = document.getElementById("add-recording-youtube");
      const youtubeUrl = youtubeInput ? youtubeInput.value.trim() : null;

      const fileInput = document.getElementById("composition-upload-input");
      const file = fileInput.files[0];

      // === НОВАЯ ВАЛИДАЦИЯ: Файл ИЛИ Ссылка ===
      if (!file && !youtubeUrl) {
        return ui.showNotification(
          "Добавьте аудиофайл ИЛИ ссылку на YouTube",
          "error"
        );
      }
      // ========================================

      const fd = new FormData();
      fd.append("performers", perf || "");

      if (youtubeUrl) fd.append("youtube_url", youtubeUrl);

      if (document.getElementById("add-recording-year").value) {
        fd.append(
          "recording_year",
          document.getElementById("add-recording-year").value
        );
      }

      // Отправляем файл только если он выбран
      if (file) {
        fd.append("file", file);
      }

      handleCreateEntity(
        createRecBtn,
        `/api/recordings/compositions/${compId}/upload`,
        fd,
        "add-recording-modal",
        "Запись добавлена!"
      );
      return;
    }

    // --- ПРЯМАЯ ЗАГРУЗКА (Запись для всего произведения) ---
    const directUploadBtn = target.closest("#direct-upload-btn");
    if (directUploadBtn) {
      const w = state.view.currentWork;
      if (!w) return;

      // Ищем существующую часть для полного произведения (sort_order === 0)
      // Или, если произведение считалось одночастным, берем единственную часть
      let targetComp = w.compositions.find((c) => c.sort_order === 0);

      // Логика для одночастных (старая совместимость): если часть одна и она "обычная" (не 0), грузим в неё
      if (
        !targetComp &&
        w.compositions.length === 1 &&
        w.compositions[0].sort_order !== 0
      ) {
        targetComp = w.compositions[0];
      }

      // Если спец-части нет, создаем её
      if (!targetComp) {
        try {
          const originalText = directUploadBtn.innerHTML;
          directUploadBtn.textContent = "Подготовка...";

          const newComp = await apiRequest(
            `/api/recordings/works/${w.id}/compositions`,
            "POST",
            {
              title_ru: "Полное произведение",
              title_original: "Complete Work",
              sort_order: 0, // <--- ФЛАГ ПОЛНОГО ПРОИЗВЕДЕНИЯ
              catalog_number: w.catalog_number,
            }
          );

          targetComp = newComp;
          w.compositions.push(newComp); // Обновляем стейт

          directUploadBtn.innerHTML = originalText;
        } catch (err) {
          ui.showNotification(
            "Ошибка создания раздела: " + err.message,
            "error"
          );
          return;
        }
      }

      if (targetComp) {
        ui.showAddRecordingModal(targetComp.id);
      }
    }

    // --- УПРАВЛЕНИЕ ВИДЕО (Кнопки на карточке) ---

    // 1. Редактировать видео
    const editVideoBtn = target.closest(".edit-video-btn");
    if (editVideoBtn) {
      e.preventDefault();
      e.stopPropagation(); // Чтобы не срабатывал клик по карточке
      const rid = parseInt(editVideoBtn.dataset.recordingId);
      const rec = state.currentViewRecordings.find((r) => r.id === rid);

      if (rec) {
        ui.showEditEntityModal("recording", rec, async (data) => {
          await apiRequest(`/api/recordings/${rec.id}`, "PUT", data);
          ui.showNotification("Запись обновлена", "success");
          state.selectedRecordingIds.clear();
          ui.updateSelectionBar(0);
          loadCurrentView();
        });
      }
      return;
    }

    // 2. Удалить видео
    const delVideoBtn = target.closest(".delete-video-btn");
    if (delVideoBtn) {
      e.preventDefault();
      e.stopPropagation();
      const rid = parseInt(delVideoBtn.dataset.recordingId);

      ui.showDeleteModal({
        title: "Удалить видео?",
        text: "Вы удаляете ссылку на видео. Это действие необратимо.",
        onConfirm: async () => {
          await apiRequest(`/api/recordings/${rid}`, "DELETE");
          ui.showNotification("Видео удалено", "success");
          document.getElementById("delete-modal").classList.add("hidden");
          loadCurrentView();
        },
      });
      return;
    }

    // --- РЕДАКТИРОВАНИЕ СУЩНОСТЕЙ ---

    if (target.closest("#edit-composer-btn")) {
      const c = state.view.currentComposer;
      if (!c) return;
      ui.showEditEntityModal("composer", c, async (data) => {
        await apiRequest(`/api/recordings/composers/${c.id}`, "PUT", data);
        ui.showNotification("Композитор обновлен", "success");
        Object.assign(state.view.currentComposer, data);
        loadCurrentView();
      });
    }

    if (target.closest("#edit-work-btn")) {
      const w = state.view.currentWork;
      if (!w) return;
      ui.showEditEntityModal("work", w, async (data) => {
        await apiRequest(`/api/recordings/works/${w.id}`, "PUT", data);
        ui.showNotification("Произведение обновлено", "success");
        loadCurrentView();
      });
    }

    if (target.closest("#edit-composition-btn")) {
      const cp = state.view.currentComposition;
      if (!cp) return;
      ui.showEditEntityModal("composition", cp, async (data) => {
        await apiRequest(`/api/recordings/compositions/${cp.id}`, "PUT", data);
        ui.showNotification("Часть обновлена", "success");
        loadCurrentView();
      });
    }

    // --- УДАЛЕНИЕ СУЩНОСТЕЙ (Логика с модалкой) ---

    if (target.closest("#delete-composer-btn")) {
      const c = state.view.currentComposer;
      if (!c) return;
      ui.showDeleteModal({
        title: `Удалить композитора?`,
        text: `Вы удаляете: <b>${c.name_ru}</b>.<br>Будут удалены ВСЕ произведения и записи.`,
        verificationString: c.name_ru,
        onConfirm: async () => {
          await apiRequest(`/api/recordings/composers/${c.id}`, "DELETE");
          ui.showNotification("Композитор удален", "success");
          document.getElementById("delete-modal").classList.add("hidden");
          state.view.current = "composers";
          router.navigate("/composers");
        },
      });
      return;
    }

    if (target.closest("#delete-work-btn")) {
      const w = state.view.currentWork;
      if (!w) return;
      ui.showDeleteModal({
        title: `Удалить произведение?`,
        text: `Удаление: <b>${w.name_ru}</b>.<br>Все части и записи будут удалены.`,
        onConfirm: async () => {
          const parentUrl = `/composers/${
            state.view.currentComposer.slug || state.view.currentComposer.id
          }`;
          await apiRequest(`/api/recordings/works/${w.id}`, "DELETE");
          ui.showNotification("Произведение удалено", "success");
          document.getElementById("delete-modal").classList.add("hidden");
          router.navigate(parentUrl);
        },
      });
      return;
    }

    if (target.closest("#delete-composition-btn")) {
      const cp = state.view.currentComposition;
      if (!cp) return;
      ui.showDeleteModal({
        title: `Удалить часть?`,
        text: `Удаление: <b>${cp.title_ru}</b>.`,
        onConfirm: async () => {
          const parentUrl = `/works/${
            state.view.currentWork.slug || state.view.currentWork.id
          }`;
          await apiRequest(`/api/recordings/compositions/${cp.id}`, "DELETE");
          ui.showNotification("Часть удалена", "success");
          document.getElementById("delete-modal").classList.add("hidden");
          router.navigate(parentUrl);
        },
      });
      return;
    }

    // --- ПЛЕЙЛИСТЫ (CRUD) ---

    if (
      target.closest("#create-new-playlist-btn") ||
      target.closest("#create-playlist-top-btn")
    ) {
      ui.showEditEntityModal("playlist_create", {}, async (data) => {
        await apiRequest("/api/playlists/", "POST", data);
        ui.showNotification("Плейлист создан", "success");
        loadCurrentView();
      });
    }

    const editPlBtn = target.closest(".edit-playlist-btn");
    if (editPlBtn) {
      e.preventDefault();
      const id = editPlBtn.dataset.id;
      const name = editPlBtn.dataset.name;
      ui.showEditEntityModal("playlist_edit", { name }, async (data) => {
        await apiRequest(`/api/playlists/${id}`, "PUT", data);
        ui.showNotification("Плейлист обновлен", "success");
        loadCurrentView();
      });
    }

    const delPlBtn = target.closest(".delete-playlist-btn");
    if (delPlBtn) {
      e.preventDefault();
      const id = delPlBtn.dataset.id;
      const name = delPlBtn.dataset.name;
      ui.showDeleteModal({
        title: "Удалить плейлист?",
        text: `Вы удаляете плейлист <b>"${name}"</b>.<br>Записи внутри него останутся в медиатеке.`,
        onConfirm: async () => {
          await apiRequest(`/api/playlists/${id}`, "DELETE");
          ui.showNotification("Плейлист удален", "success");
          document.getElementById("delete-modal").classList.add("hidden");
          loadCurrentView();
        },
      });
    }

    // --- FLOATING BAR ACTIONS (Массовые действия) ---

    // 1. Отмена выделения (FIXED)
    if (target.closest("#selection-cancel-btn")) {
      // ШАГ 1: Сначала очищаем данные в памяти
      state.selectedRecordingIds.clear();
      state.isSelectionMode = false;

      // ШАГ 2: Скрываем панель и чекбоксы
      ui.updateSelectionBar(0);
      document
        .querySelectorAll(".selection-checkbox-container")
        .forEach((el) => {
          el.classList.add("hidden");
          el.style.display = ""; // Сбрасываем инлайн-стиль на всякий случай
        });

      // ШАГ 3: ВЫЗЫВАЕМ ЕДИНУЮ ФУНКЦИЮ ОБНОВЛЕНИЯ СТИЛЕЙ
      // Она пройдет по всем строкам и ПРАВИЛЬНО снимет фон, так как в state уже нет выделенных ID.
      ui.updateSelectionStyles();
    }

    // --- НОВЫЕ КНОПКИ ОЧЕРЕДИ В ПАНЕЛИ ---

    // 1. Играть следующим (Массово)
    if (target.closest("#bulk-play-next-btn")) {
      const ids = Array.from(state.selectedRecordingIds).map(Number);
      const tracks = state.currentViewRecordings.filter((r) =>
        ids.includes(r.id)
      );

      if (tracks.length > 0) {
        player.playNextInQueue(tracks);

        // Сбрасываем выделение
        state.selectedRecordingIds.clear();
        state.isSelectionMode = false;
        document
          .querySelectorAll(".selection-checkbox-container")
          .forEach((el) => el.classList.add("hidden"));
        document.querySelectorAll(".recording-item").forEach((row) => {
          row.classList.remove("bg-cyan-100/60");
          row.classList.add("bg-white");
          const cb = row.querySelector(".recording-checkbox");
          if (cb) cb.checked = false;
        });
        ui.updateSelectionBar(0);
      }
    }

    // 2. В конец очереди (Массово)
    if (target.closest("#bulk-add-queue-btn")) {
      const ids = Array.from(state.selectedRecordingIds).map(Number);
      const tracks = state.currentViewRecordings.filter((r) =>
        ids.includes(r.id)
      );

      if (tracks.length > 0) {
        player.addToQueue(tracks);

        // Сбрасываем выделение
        state.selectedRecordingIds.clear();
        state.isSelectionMode = false;
        document
          .querySelectorAll(".selection-checkbox-container")
          .forEach((el) => el.classList.add("hidden"));
        document.querySelectorAll(".recording-item").forEach((row) => {
          row.classList.remove("bg-cyan-100/60");
          row.classList.add("bg-white");
          const cb = row.querySelector(".recording-checkbox");
          if (cb) cb.checked = false;
        });
        ui.updateSelectionBar(0);
      }
    }

    // 2. В плейлист
    if (target.closest("#bulk-add-playlist-btn")) {
      ui.showSelectPlaylistModal(state.playlists, async (targetPid) => {
        const ids = Array.from(state.selectedRecordingIds).map(Number);
        let count = 0;
        for (const rid of ids) {
          try {
            await apiRequest(
              `/api/playlists/${targetPid}/recordings/${rid}`,
              "POST"
            );
            count++;
          } catch (e) {}
        }
        ui.showNotification(`Добавлено треков: ${count}`, "success");
        state.selectedRecordingIds.clear();
        ui.updateSelectionBar(0);
        loadCurrentView();
      });
    }

    // 3. Массовое удаление
    if (target.closest("#bulk-delete-btn")) {
      const ids = Array.from(state.selectedRecordingIds).map(Number);

      // Сценарий А: Мы в плейлисте -> Убираем из плейлиста
      if (state.view.current === "playlist") {
        try {
          await apiRequest(
            `/api/playlists/${state.view.playlistId}/recordings-bulk-delete`,
            "POST",
            { recording_ids: ids }
          );
          ui.showNotification("Убрано из плейлиста", "success");

          // Чистим локально и обновляем UI
          state.currentViewRecordings = state.currentViewRecordings.filter(
            (r) => !ids.includes(r.id)
          );
          state.selectedRecordingIds.clear();
          ui.updateSelectionBar(0);

          ui.renderRecordingList(
            state.currentViewRecordings,
            document.getElementById("view-title-container").textContent,
            0,
            {},
            state.favoriteRecordingIds
          );
        } catch (e) {
          ui.showNotification("Ошибка: " + e.message, "error");
        }
      }
      // Сценарий Б: Мы в медиатеке -> Удаляем файлы (МОДАЛКА)
      else {
        ui.showDeleteModal({
          title: `Удалить ${ids.length} записей?`,
          text: "Файлы будут удалены с диска безвозвратно.",
          onConfirm: async () => {
            let count = 0;
            for (const rid of ids) {
              try {
                await apiRequest(`/api/recordings/${rid}`, "DELETE");
                count++;
              } catch (e) {}
            }

            ui.showNotification(`Удалено файлов: ${count}`, "success");
            document.getElementById("delete-modal").classList.add("hidden");

            // ВАЖНО: Обновляем список ТОЛЬКО ПОСЛЕ подтверждения удаления
            state.selectedRecordingIds.clear();
            ui.updateSelectionBar(0);
            loadCurrentView();
          },
        });
      }
      // УДАЛЕНЫ СТРОКИ ОЧИСТКИ ЗДЕСЬ, ОНИ ТЕПЕРЬ ВНУТРИ БЛОКОВ ВЫШЕ
    }

    // --- ОСТАЛЬНОЕ ---
    if (target.closest("#logout-btn")) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_email");
      localStorage.removeItem("is_admin");

      // ВАЖНО: Сначала переходим на корень, потом перезагружаем
      // Это гарантирует, что после перезагрузки мы окажемся на Дашборде
      window.location.hash = "/";
      window.location.reload();
    }
    if (target.closest("#queue-btn"))
      document
        .getElementById("queue-sidebar")
        .classList.toggle("translate-x-full");
    if (target.closest("#close-queue-btn"))
      document
        .getElementById("queue-sidebar")
        .classList.add("translate-x-full");
    if (target.closest("#select-recording-file-btn"))
      document.getElementById("composition-upload-input").click();
  });

  // --- КОНТЕКСТНОЕ МЕНЮ (Правый клик) ---
  document.body.addEventListener("contextmenu", (e) => {
    const item = e.target.closest(".recording-item");
    if (item) {
      e.preventDefault();
      showRecordingContextMenu(
        e.clientX,
        e.clientY,
        parseInt(item.dataset.recordingId)
      );
    }
  });

  // --- ПОИСК (Enter) ---
  document.getElementById("search-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter")
      router.navigate(`/search/${encodeURIComponent(e.target.value)}`);
  });

  // --- ЗАГРУЗКА ФАЙЛА (Input) ---
  document
    .getElementById("composition-upload-input")
    ?.addEventListener("change", (e) =>
      ui.updateSelectedRecordingFile(e.target.files[0])
    );

  // --- DRAG & DROP (Сортировка плейлиста) ---
  let draggedItem = null;

  document.addEventListener("dragstart", (e) => {
    if (
      e.target.classList.contains("recording-item") &&
      state.view.current === "playlist"
    ) {
      draggedItem = e.target;
      e.target.classList.add("opacity-50");
      e.dataTransfer.effectAllowed = "move";
    }
  });

  document.addEventListener("dragend", (e) => {
    if (draggedItem) {
      draggedItem.classList.remove("opacity-50");
      document
        .querySelectorAll(".drag-over-top, .drag-over-bottom")
        .forEach((el) => {
          el.classList.remove("drag-over-top", "drag-over-bottom");
        });
      draggedItem = null;
    }
  });

  document.addEventListener("dragover", (e) => {
    e.preventDefault();
    const targetRow = e.target.closest(".recording-item");
    if (
      !targetRow ||
      targetRow === draggedItem ||
      state.view.current !== "playlist"
    )
      return;

    const rect = targetRow.getBoundingClientRect();
    const offset = e.clientY - rect.top;

    targetRow.classList.remove("drag-over-top", "drag-over-bottom");
    if (offset < rect.height / 2) {
      targetRow.classList.add("drag-over-top");
    } else {
      targetRow.classList.add("drag-over-bottom");
    }
  });

  document.addEventListener("drop", async (e) => {
    e.preventDefault();
    const targetRow = e.target.closest(".recording-item");
    if (!targetRow || !draggedItem || state.view.current !== "playlist") return;

    const list = document
      .getElementById("composition-list")
      .querySelector("div > div");

    if (targetRow.classList.contains("drag-over-top")) {
      list.insertBefore(draggedItem, targetRow);
    } else {
      list.insertBefore(draggedItem, targetRow.nextSibling);
    }

    targetRow.classList.remove("drag-over-top", "drag-over-bottom");

    // Собираем новые ID и сохраняем
    const newOrderIds = Array.from(
      document.querySelectorAll(".recording-item")
    ).map((el) => parseInt(el.dataset.recordingId));

    try {
      await apiRequest(
        `/api/playlists/${state.view.playlistId}/reorder`,
        "PUT",
        { recording_ids: newOrderIds }
      );
    } catch (err) {
      ui.showNotification("Ошибка сохранения порядка", "error");
    }
  });
  // --- ЛОГИКА ЧЕКБОКСА "БЕЗ НОМЕРА" ---
  const setupNoCatalogToggle = (checkId, inputId) => {
    const checkbox = document.getElementById(checkId);
    const input = document.getElementById(inputId);
    if (checkbox && input) {
      checkbox.addEventListener("change", (e) => {
        input.disabled = e.target.checked;
        if (e.target.checked) input.value = "";
      });
    }
  };
  setupNoCatalogToggle("add-work-no-catalog", "add-work-catalog");
  setupNoCatalogToggle("add-composition-no-catalog", "add-composition-catalog");

  // --- DRAG & DROP ДЛЯ ЧАСТЕЙ (Сортировка) ---
  let draggedComp = null;

  document.addEventListener("dragstart", (e) => {
    const item = e.target.closest(".comp-sortable-item");
    if (item) {
      draggedComp = item;
      item.classList.add("opacity-50", "border-cyan-400");
      e.dataTransfer.effectAllowed = "move";
    }
  });

  document.addEventListener("dragend", (e) => {
    if (draggedComp) {
      draggedComp.classList.remove("opacity-50", "border-cyan-400");
      document
        .querySelectorAll(".drag-over-top, .drag-over-bottom")
        .forEach((el) => {
          el.classList.remove("drag-over-top", "drag-over-bottom");
        });
      draggedComp = null;
    }
  });

  document.addEventListener("dragover", (e) => {
    e.preventDefault();

    // Ищем цель (над чем мы сейчас)
    const target = e.target.closest(".comp-sortable-item");

    // Если мы не над элементом списка или навели на самого себя - ничего не делаем
    if (!target || target === draggedComp) {
      // Важно: если мы "ушли" с элемента в пустоту, нужно очистить подсветку
      document
        .querySelectorAll(".drag-over-top, .drag-over-bottom")
        .forEach((el) => {
          el.classList.remove("drag-over-top", "drag-over-bottom");
        });
      return;
    }

    // === ИСПРАВЛЕНИЕ: Сначала убираем подсветку со ВСЕХ элементов ===
    document
      .querySelectorAll(".drag-over-top, .drag-over-bottom")
      .forEach((el) => {
        // Оставляем только текущий target, если мы над ним, но проще очистить всё и нарисовать заново
        if (el !== target) {
          el.classList.remove("drag-over-top", "drag-over-bottom");
        }
      });
    // ===============================================================

    const rect = target.getBoundingClientRect();
    const offset = e.clientY - rect.top;

    // Очищаем текущий (чтобы не было и top и bottom одновременно)
    target.classList.remove("drag-over-top", "drag-over-bottom");

    // Рисуем линию
    if (offset < rect.height / 2) {
      target.classList.add("drag-over-top");
    } else {
      target.classList.add("drag-over-bottom");
    }
  });

  document.addEventListener("drop", async (e) => {
    e.preventDefault();
    const target = e.target.closest(".comp-sortable-item");
    if (!target || !draggedComp || target === draggedComp) return;

    // 1. Перемещаем элемент в DOM
    const parent = target.parentNode; // Контейнер
    target.classList.remove("drag-over-top", "drag-over-bottom");

    // Определяем куда вставлять
    const rect = target.getBoundingClientRect();
    const offset = e.clientY - rect.top;

    if (offset < rect.height / 2) {
      parent.insertBefore(draggedComp, target);
    } else {
      parent.insertBefore(draggedComp, target.nextSibling);
    }

    // 2. === МАГИЯ: ВИЗУАЛЬНЫЙ ПЕРЕСЧЕТ НОМЕРОВ ===
    // Берем все элементы в новом порядке
    const allItems = parent.querySelectorAll(".comp-sortable-item");
    const newIds = [];

    allItems.forEach((item, index) => {
      // Обновляем цифру в кружочке (1, 2, 3...)
      const numberBadge = item.querySelector(".comp-sort-number");
      if (numberBadge) {
        numberBadge.textContent = index + 1;
      }
      // Собираем ID для отправки
      newIds.push(parseInt(item.dataset.compId));
    });

    // 3. Отправляем на сервер
    if (state.view.currentWork) {
      try {
        await apiRequest(
          `/api/recordings/works/${state.view.currentWork.id}/reorder-compositions`,
          "PUT",
          {
            composition_ids: newIds,
          }
        );
        // ui.showNotification("Порядок сохранен", "success"); // Можно не показывать, чтобы не спамить
      } catch (err) {
        ui.showNotification("Ошибка сортировки", "error");
        console.error(err);
      }
    }
  });

  // --- УПРАВЛЕНИЕ ТАПАМИ НА МОБИЛЬНОМ И КЛИКАМИ ---

  // --- ФИНАЛЬНАЯ, ОТЛАЖЕННАЯ ЛОГИКА ТАПОВ И КЛИКОВ ---

  let touchTimer = null;
  let isLongTouch = false;
  let touchStartX = 0;
  let touchStartY = 0;

  // 1. НАЖАЛИ ПАЛЕЦ
  document.body.addEventListener(
    "touchstart",
    (e) => {
      const row = e.target.closest(".recording-item");
      if (
        !row ||
        e.target.closest(".recording-play-pause-btn") ||
        e.target.closest(".favorite-btn")
      ) {
        return;
      }
      isLongTouch = false;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      // Запускаем таймер. Если он сработает -> это долгий тап
      touchTimer = setTimeout(() => {
        isLongTouch = true; // Ставим флаг, что долгий тап СЛУЧИЛСЯ
        if (navigator.vibrate) navigator.vibrate(50);
        handleSelectionToggle(row); // Выделяем
      }, 500);
    },
    { passive: true }
  );

  // 2. СДВИНУЛИ ПАЛЕЦ (Отменяем, если скролл)
  document.body.addEventListener(
    "touchmove",
    (e) => {
      if (!touchTimer) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      if (Math.abs(x - touchStartX) > 10 || Math.abs(y - touchStartY) > 10) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    },
    { passive: true }
  );

  // 3. ОТПУСТИЛИ ПАЛЕЦ (КЛЮЧЕВОЙ ФИКС)
  document.body.addEventListener("touchend", (e) => {
    // Сценарий A: Если это был долгий тап (флаг уже стоит), то мы НИЧЕГО не делаем,
    // кроме сброса флага и отмены стандартного поведения. Выделение уже произошло.
    if (isLongTouch) {
      e.preventDefault();
      isLongTouch = false;
      clearTimeout(touchTimer); // На всякий случай
      touchTimer = null;
      return; // ВАЖНО: Выходим, чтобы не выполнять логику короткого тапа
    }

    // Сценарий B: Если это был НЕ долгий тап, значит таймер еще не сработал.
    // Это короткий тап.
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;

      const row = e.target.closest(".recording-item");
      if (
        !row ||
        e.target.closest(".recording-play-pause-btn") ||
        e.target.closest(".favorite-btn")
      ) {
        return;
      }

      if (window.state.isSelectionMode) {
        // Короткий тап в режиме выделения -> переключаем чекбокс
        e.preventDefault();
        handleSelectionToggle(row);
      } else {
        // Короткий тап в обычном режиме -> ВЫЗЫВАЕМ КОНТЕКСТНОЕ МЕНЮ
        e.preventDefault();
        const touch = e.changedTouches[0];
        showRecordingContextMenu(
          touch.clientX,
          touch.clientY,
          parseInt(row.dataset.recordingId)
        );
      }
    }
  });

  // 4. Блокируем системное меню, чтобы не мешалось
  document.body.addEventListener("contextmenu", (e) => {
    if (window.innerWidth < 768 && e.target.closest(".recording-item")) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  });
}

// --- ИСПРАВЛЕННАЯ ФУНКЦИЯ ВЫДЕЛЕНИЯ ---
function handleSelectionToggle(row) {
  if (!row) return;
  const id = parseInt(row.dataset.recordingId);
  if (isNaN(id)) return;

  const checkbox = row.querySelector(".recording-checkbox");

  // Включаем режим, если это первое выделение
  if (window.state.selectedRecordingIds.size === 0) {
    window.state.isSelectionMode = true;
    // Показываем чекбоксы везде
    document.querySelectorAll(".selection-checkbox-container").forEach((el) => {
      el.classList.remove("hidden");
      el.style.display = "flex"; // Принудительно
    });
  }

  // Переключаем ID в памяти
  let isSelected;
  if (window.state.selectedRecordingIds.has(id)) {
    window.state.selectedRecordingIds.delete(id);
    isSelected = false;
  } else {
    window.state.selectedRecordingIds.add(id);
    isSelected = true;
  }

  // === ВИЗУАЛ (ЖЕСТКАЯ ЗАЧИСТКА) ===
  // Удаляем всё, что может мешать фону
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
    row.classList.add("bg-white"); // Возвращаем белый фон
    if (checkbox) checkbox.checked = false;
  }

  // Если сняли последнее выделение -> Выход из режима
  if (window.state.selectedRecordingIds.size === 0) {
    window.state.isSelectionMode = false;
    document.querySelectorAll(".selection-checkbox-container").forEach((el) => {
      el.classList.add("hidden");
      el.style.display = "";
    });
  }

  ui.updateSelectionBar(
    window.state.selectedRecordingIds.size,
    window.state.view.current
  );
}

async function handleCreateEntity(btn, url, data, modalId, successMsg) {
  if (btn.disabled) return;
  const txt = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Сохранение...";
  btn.classList.add("opacity-50");
  try {
    await apiRequest(url, "POST", data);
    ui.showNotification(successMsg, "success");
    document.getElementById(modalId).classList.add("hidden");
    loadCurrentView();
  } catch (e) {
    console.error(e);
    ui.showNotification(e.message || "Ошибка", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = txt;
    btn.classList.remove("opacity-50");
  }
}

function showRecordingContextMenu(x, y, rid) {
  const m = document.getElementById("context-menu");
  const isLoggedIn = !!localStorage.getItem("access_token");
  const isAdmin = localStorage.getItem("is_admin") === "true";

  // Логика: если кликнули на невыделенный трек в обычном режиме -> сброс выделения
  if (!state.selectedRecordingIds.has(rid)) {
    if (!state.isSelectionMode) {
      state.selectedRecordingIds.clear();
      ui.updateSelectionBar(0);
    }
    state.selectedRecordingIds.add(rid);
  }

  const count = state.selectedRecordingIds.size;
  m.dataset.recordingId = rid;

  // === ГЕНЕРАЦИЯ МЕНЮ ===
  let html = `<div class="py-1 min-w-[220px] bg-white rounded-lg shadow-xl border border-gray-100 font-medium text-sm text-gray-700">`;

  // 1. ПУНКТЫ ДЛЯ ВСЕХ (ГОСТИ +)
  html += `
    <li data-action="play-next" class="px-4 py-3 hover:bg-cyan-50 cursor-pointer flex gap-3 items-center border-b border-gray-50">
        <i data-lucide="corner-down-right" class="w-4 h-4 text-cyan-600"></i> Играть следующим
    </li>
    <li data-action="add-to-queue" class="px-4 py-3 hover:bg-cyan-50 cursor-pointer flex gap-3 items-center">
        <i data-lucide="list-plus" class="w-4 h-4 text-cyan-600"></i> В конец очереди
    </li>
  `;

  // 2. ПУНКТЫ ДЛЯ ЗАРЕГИСТРИРОВАННЫХ
  if (isLoggedIn) {
    html += `<div class="border-t border-gray-100 my-1"></div>`;

    // Список плейлистов
    let playlistsItems = "";
    if (state.playlists.length) {
      state.playlists.forEach((p) => {
        playlistsItems += `
             <li data-action="add-to-playlist" data-pid="${p.id}"
                 class="px-4 py-2 hover:bg-cyan-50 cursor-pointer truncate flex items-center gap-2">
                 <i data-lucide="list-music" class="w-3 h-3 opacity-70"></i> ${p.name}
             </li>`;
      });
    } else {
      playlistsItems = `<li class="px-4 py-2 text-gray-400 italic text-xs">Нет плейлистов</li>`;
    }

    html += `
          <li class="relative group px-4 py-3 hover:bg-cyan-50 cursor-pointer flex justify-between items-center">
              <div class="flex gap-3 items-center"><i data-lucide="plus-square" class="w-4 h-4 text-blue-600"></i> В плейлист</div>
              <i data-lucide="chevron-right" class="w-4 h-4 text-gray-400"></i>
              
              <!-- ИЗМЕНЕНИЯ ЗДЕСЬ: убрали ml-2 и добавили pl-3, чтобы создать "мост" для курсора -->
              <ul class="absolute left-full top-0 mt-[-4px] w-48 bg-white shadow-xl rounded-xl border border-gray-100 hidden group-hover:block z-50 py-2 pl-3 -ml-1">
                  ${playlistsItems}
              </ul>
          </li>
      `;
  }

  // 3. ПУНКТЫ ДЛЯ АДМИНОВ
  if (isAdmin) {
    html += `<div class="border-t border-gray-100 my-1"></div>`;
    // Редактировать можно только 1 трек за раз
    if (count === 1) {
      html += `
           <li data-action="edit-recording" class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex gap-3 items-center">
               <i data-lucide="edit-2" class="w-4 h-4 text-gray-500"></i> Редактировать
           </li>
        `;
    }
    html += `
        <li data-action="delete-recording" class="px-4 py-3 hover:bg-red-50 text-red-600 cursor-pointer flex gap-3 items-center">
            <i data-lucide="trash-2" class="w-4 h-4"></i> Удалить ${
              count > 1 ? `(${count})` : ""
            }
        </li>
      `;
  }

  html += `</div>`;
  m.innerHTML = html;

  ui.showContextMenu(x, y, m);
  if (window.lucide) window.lucide.createIcons();
}

async function handleContextMenuAction(li) {
  const m = document.getElementById("context-menu");

  // 1. Скрываем меню сразу
  ui.hideContextMenu(m);

  const act = li.dataset.action;

  const unselectItems = () => {
    // 1. Проходимся по ID, которые были выделены (это источник правды)
    for (const id of state.selectedRecordingIds) {
      // 2. Находим соответствующий элемент на странице
      const row = document.querySelector(
        `.recording-item[data-recording-id="${id}"]`
      );
      if (row) {
        // 3. Убираем стили выделения
        row.classList.remove("bg-cyan-50", "border-cyan-200");
        row.classList.add("border-gray-100"); // Возвращаем стандартную границу

        // 4. Снимаем галочку с чекбокса
        const checkbox = row.querySelector(
          `.recording-checkbox[data-id="${id}"]`
        );
        if (checkbox) {
          checkbox.checked = false;
        }
      }
    }
    // 5. Очищаем сам массив ID
    state.selectedRecordingIds.clear();
    // 6. Скрываем панель
    ui.updateSelectionBar(0);
  };

  // Преобразуем ID записи и плейлиста в числа сразу
  const contextRid = parseInt(m.dataset.recordingId);
  const contextPid = parseInt(m.dataset.playlistId);

  // Определяем, над какими записями производим действие.
  let targetIds = [];

  // Если клик произошел по выделенной записи -> берем все выделенные
  if (state.selectedRecordingIds.has(contextRid)) {
    // ВАЖНО: Array.from создает массив, map(Number) превращает строки в числа
    targetIds = Array.from(state.selectedRecordingIds).map((id) =>
      parseInt(id)
    );
  } else {
    // Иначе берем только ту, по которой кликнули
    targetIds = [contextRid];
  }

  // Получаем объекты записей (для плеера)
  const targetRecordings = state.currentViewRecordings.filter((r) =>
    targetIds.includes(r.id)
  );

  // --- ДЕЙСТВИЯ ---

  if (act === "play-next") {
    player.playNextInQueue(targetRecordings);
    unselectItems(); // <-- ИСПРАВЛЕНИЕ
  }

  if (act === "add-to-queue") {
    player.addToQueue(targetRecordings);
    unselectItems(); // <-- ИСПРАВЛЕНИЕ
  }

  if (act === "edit-recording") {
    if (targetIds.length > 1) {
      ui.showNotification("Редактируйте записи по одной", "info");
    } else {
      // Для редактирования берем объект
      const rec = state.currentViewRecordings.find((r) => r.id === contextRid);
      if (rec) {
        ui.showEditEntityModal("recording", rec, async (data) => {
          await apiRequest(`/api/recordings/${rec.id}`, "PUT", data);
          ui.showNotification("Запись обновлена", "success");
          state.selectedRecordingIds.clear();
          ui.updateSelectionBar(0);
          loadCurrentView();
        });
      }
    }
  }

  // ДОБАВИТЬ В ПЛЕЙЛИСТ
  if (act === "add-to-playlist") {
    const targetPid = parseInt(li.dataset.pid); // ID целевого плейлиста
    let successCount = 0;

    // Цикл добавления
    for (const rid of targetIds) {
      try {
        await apiRequest(
          `/api/playlists/${targetPid}/recordings/${rid}`,
          "POST"
        );
        successCount++;
      } catch (e) {
        console.warn(`Skip ${rid}`, e);
      }
    }

    if (successCount > 0) {
      ui.showNotification(`Добавлено треков: ${successCount}`, "success");
    }

    unselectItems();
  }

  // УБРАТЬ ИЗ ТЕКУЩЕГО ПЛЕЙЛИСТА
  if (act === "remove-from-playlist") {
    if (!contextPid) {
      ui.showNotification("Ошибка ID плейлиста", "error");
      return;
    }

    try {
      // Отправляем массив чисел
      await apiRequest(
        `/api/playlists/${contextPid}/recordings-bulk-delete`,
        "POST",
        {
          recording_ids: targetIds,
        }
      );

      ui.showNotification(`Удалено треков: ${targetIds.length}`, "success");

      // Обновляем локальный список (фильтруем удаленные)
      state.currentViewRecordings = state.currentViewRecordings.filter(
        (r) => !targetIds.includes(r.id)
      );

      unselectItems();

      // Перерисовываем список
      ui.renderRecordingList(
        state.currentViewRecordings,
        document.getElementById("view-title-container").textContent,
        0,
        {},
        state.favoriteRecordingIds
      );
    } catch (e) {
      ui.showNotification("Ошибка при удалении: " + e.message, "error");
    }
  }

  // УДАЛИТЬ ФАЙЛ (Навсегда)
  if (act === "delete-recording") {
    const count = targetIds.length;
    const title = count === 1 ? "Удалить запись?" : `Удалить ${count} записей?`;
    const text =
      count === 1
        ? `Вы удаляете: <b>${
            targetRecordings[0]?.performers || "запись"
          }</b>.<br>Файл будет стерт.`
        : `Вы собираетесь удалить <b>${count}</b> файлов.<br>Это действие необратимо.`;

    ui.showDeleteModal({
      title: title,
      text: text,
      onConfirm: async () => {
        let deletedCount = 0;
        for (const rid of targetIds) {
          try {
            await apiRequest(`/api/recordings/${rid}`, "DELETE");
            deletedCount++;
          } catch (e) {
            console.error(e);
          }
        }
        ui.showNotification(`Удалено файлов: ${deletedCount}`, "success");
        document.getElementById("delete-modal").classList.add("hidden");
        unselectItems();
        loadCurrentView();
      },
    });
  }
}

async function toggleFavorite(id, btn) {
  const isFav = state.favoriteRecordingIds.has(id);
  try {
    await apiRequest(
      `/api/recordings/${id}/favorite`,
      isFav ? "DELETE" : "POST"
    );
    const icon = btn.querySelector("svg") || btn.querySelector("i");
    if (isFav) {
      state.favoriteRecordingIds.delete(id);
      btn.classList.remove("text-red-500");
      btn.classList.add("text-gray-300");
      if (icon) icon.classList.remove("fill-current");
    } else {
      state.favoriteRecordingIds.add(id);
      btn.classList.add("text-red-500");
      btn.classList.remove("text-gray-300");
      if (icon) icon.classList.add("fill-current");
    }
  } catch (e) {
    console.error(e);
  }
}
async function loadMoreComposers() {
  const { skip, limit } = state.composersPagination;

  // Показываем спиннер на кнопке (опционально, для красоты)
  const btn = document.getElementById("load-more-composers-btn");
  if (btn) {
    btn.innerHTML = `<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div> Загрузка...`;
    btn.disabled = true;
  }

  try {
    const newComposers = await apiRequest(
      `/api/recordings/composers?skip=${skip}&limit=${limit}`
    );

    // Если вернулось меньше, чем лимит, значит это конец списка
    if (newComposers.length < limit) {
      state.composersPagination.hasMore = false;
    }

    // Увеличиваем отступ для следующего раза
    state.composersPagination.skip += limit;

    // Рендерим (isAppend = true, если skip > limit, т.е. это не первая загрузка)
    // Но проще проверять по skip: если skip == limit (после первого сложения), значит это была первая загрузка
    const isAppend = skip > 0;
    ui.renderComposerList(
      newComposers,
      isAppend,
      state.composersPagination.hasMore,
      state.displayLanguage
    );

    // Возвращаем кнопку в норму (renderComposerList пересоздает/скрывает её, но на всякий случай)
    if (btn && state.composersPagination.hasMore) {
      btn.innerHTML = `<span>Показать ещё</span> <i data-lucide="chevron-down" class="w-4 h-4"></i>`;
      btn.disabled = false;
      if (window.lucide) window.lucide.createIcons();
    }
  } catch (e) {
    console.error(e);
    ui.showNotification("Ошибка загрузки: " + e.message, "error");
  }
}
// Функция для загрузки библиотеки с учетом фильтров
async function loadLibraryWithFilters(reset = false) {
  if (reset) {
    state.libraryFilters.page = 1;
    state.currentViewRecordings = [];
    state.libraryFilters.hasMore = true;
    // Очищаем список визуально
    const list = document.getElementById("library-results-container");
    if (list)
      list.innerHTML =
        '<div class="flex justify-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div></div>';
  }

  const { page, limit, mediaType, composerId, genre, sortBy, search } =
    state.libraryFilters;
  const skip = (page - 1) * limit;

  // Строим URL
  let url = `/api/recordings/?skip=${skip}&limit=${limit}`;
  if (mediaType) url += `&media_type=${mediaType}`;
  if (composerId) url += `&composer_id=${composerId}`;
  if (genre) url += `&genre=${genre}`;
  if (sortBy) url += `&sort_by=${sortBy}`;
  if (search) url += `&q=${encodeURIComponent(search)}`;

  try {
    const data = await apiRequest(url);

    if (data.recordings.length < limit) {
      state.libraryFilters.hasMore = false;
    }

    if (reset) {
      state.currentViewRecordings = data.recordings;
    } else {
      state.currentViewRecordings = [
        ...state.currentViewRecordings,
        ...data.recordings,
      ];
    }

    // Рендерим результат
    ui.renderLibraryContent(
      state.currentViewRecordings,
      mediaType === "audio" ? "list" : "grid", // Аудио списком, Видео сеткой
      state.favoriteRecordingIds,
      reset
    );

    // Обновляем кнопку "Показать еще"
    ui.updateLoadMoreButton(state.libraryFilters.hasMore);
  } catch (e) {
    console.error(e);
    ui.showNotification("Ошибка загрузки: " + e.message, "error");
  }
}

// Экспортируем функцию в window, чтобы вызывать из ui.js (onchange)
window.applyLibraryFilter = (key, value) => {
  state.libraryFilters[key] = value;
  loadLibraryWithFilters(true); // true = сброс и новая загрузка
};

window.loadMoreLibrary = () => {
  state.libraryFilters.page += 1;
  loadLibraryWithFilters(false); // false = дозагрузка
};

// main.js

// === ЛОГИКА YOUTUBE ПЛЕЕРА ===

window.playYouTubeVideo = (videoId) => {
  if (!videoId) return;

  const modal = document.getElementById("video-player-modal");
  const container = document.getElementById("youtube-player-container");

  // Встраиваем iframe с видео
  container.innerHTML = `
        <iframe class="w-full h-full"
                src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
        </iframe>`;

  // Показываем модалку с анимацией
  modal.classList.remove("hidden");
  setTimeout(() => {
    modal.classList.remove("opacity-0");
    document.getElementById("video-modal-content").classList.remove("scale-95");
  }, 10); // Небольшая задержка для CSS-анимации
};

function closeYouTubeVideo() {
  const modal = document.getElementById("video-player-modal");
  const container = document.getElementById("youtube-player-container");

  // Прячем модалку
  modal.classList.add("opacity-0");
  document.getElementById("video-modal-content").classList.add("scale-95");

  setTimeout(() => {
    modal.classList.add("hidden");
    // Очищаем iframe, чтобы остановить воспроизведение
    container.innerHTML = "";
  }, 200); // Ждем завершения анимации
}
