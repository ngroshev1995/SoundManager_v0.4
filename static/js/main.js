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
    limit: 12,
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
  lastSelectedId: null,
  libraryFilters: {
    page: 1,
    limit: 20,
    mediaType: null,
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

  player.initPlayer();
  addEventListeners();
  setupDuplicateCheckers();
  if (window.lucide) window.lucide.createIcons();

  initAuth(() => {
    ui.showMainApp();
    ui.updateHeaderAuth();
    setupRouter();
    router.navigate("/");
    state.view.current = "dashboard";
    loadCurrentView();
  });

  setupRouter();
  ui.updateHeaderAuth();
  ui.showMainApp();
  if (!window.location.hash || window.location.hash === "#/") {
    state.view.current = "dashboard";
  }

  loadCurrentView();
}

async function fetchUserProfile() {
  try {
    const userEmail = localStorage.getItem("user_email");
    if (userEmail) ui.setUserGreeting(userEmail);
  } catch (e) {
    console.error(e);
  }
}

function resetViewState() {
  document.body.removeAttribute("data-epoch");
  state.view.currentComposer = null;
  state.view.currentWork = null;
  state.view.currentComposition = null;
  state.view.playlistId = null;
  state.currentViewRecordings = [];
  state.selectedRecordingIds.clear();
  ui.updateSelectionBar(0);
}

function setupRouter() {
  router

    .hooks({
      before: (done) => {
        const mobileMenuPanel = document.getElementById("mobile-menu-panel");
        if (mobileMenuPanel) {
          mobileMenuPanel.classList.add("hidden");
        }
        done();
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
      "/composers": () => {
        state.view.current = "composers";
        resetViewState();
        loadCurrentView();
      },

      "/composers/:slug": ({ data }) => {
        state.view.current = "composer_detail";
        state.view.currentComposer = { id: data.slug };
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
        state.view.current = "playlists_overview";
        resetViewState();
        loadCurrentView();
      },
      "/recordings": () => {
        state.view.current = "library_hub";
        resetViewState();
        loadCurrentView();
      },
      "/recordings/audio": () => {
        state.view.current = "library_audio";
        resetViewState();
        loadCurrentView();
      },
      "/recordings/video": () => {
        state.view.current = "library_video";
        resetViewState();
        loadCurrentView();
      },
      "/blog": () => {
        state.view.current = "blog_list";
        state.view.blogTagFilter = null;
        resetViewState();
        loadCurrentView();
      },
      "/blog/tag/:tagName": ({ data }) => {
        state.view.current = "blog_list";
        state.view.blogTagFilter = data.tagName;
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
          if (typeof L === "undefined") {
            await import("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
          }

          const composers = await apiRequest(
            "/api/recordings/composers?limit=1000"
          );

          ui.renderComposersMap(composers);

          ui.renderBreadcrumbs();
        } catch (error) {
          console.error("Failed to load map:", error);
          ui.showNotification("Не удалось загрузить карту", "error");
          if (listEl) listEl.innerHTML = "";
        }
      },
    })
    .resolve();

  if (!window.location.hash) router.navigate("/");
}

async function loadCurrentView() {
  document.getElementById("main-view").scrollTop = 0;

  if (!state.view.current) return;

  const protectedViews = ["favorites", "playlist", "playlists_overview"];
  const isLoggedIn = !!localStorage.getItem("access_token");

  if (protectedViews.includes(state.view.current) && !isLoggedIn) {
    console.warn("Доступ запрещен, редирект на главную");
    state.view.current = "dashboard";
    router.navigate("/");
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
        state.currentViewRecordings = s.recordings;

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
        state.composersPagination.skip = 0;
        state.composersPagination.hasMore = true;

        await loadMoreComposers();
        break;

      case "composer_detail":
        const cId = state.view.currentComposer.id;
        const cFull = await apiRequest(`/api/recordings/composers/${cId}`);
        const works = await apiRequest(
          `/api/recordings/composers/${cId}/works`
        );
        state.view.currentComposer = cFull;
        document.body.setAttribute("data-epoch", cFull.epoch);
        ui.renderWorkList(works, cFull, state.displayLanguage);
        break;
      case "work_detail":
        const wId = state.view.currentWork.id;
        const wFull = await apiRequest(`/api/recordings/works/${wId}`);
        state.view.currentWork = wFull;
        state.view.currentComposer = wFull.composer;
        document.body.setAttribute("data-epoch", wFull.composer.epoch);
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
        document.body.setAttribute("data-epoch", cpFull.work.composer.epoch);
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
          { isPlaylist: true },
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
        if (state.composersList.length === 0) {
          state.composersList = await apiRequest(
            "/api/recordings/composers?limit=100"
          );
        }

        state.libraryFilters.mediaType = "audio";
        state.libraryFilters.composerId = "";
        state.libraryFilters.genre = "";
        state.libraryFilters.search = "";

        ui.renderLibraryPageStructure("Аудиоархив", state.composersList);

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
      case "blog_list":
        const activeTag = state.view.blogTagFilter;
        const apiUrl = activeTag
          ? `/api/blog/?tag=${encodeURIComponent(activeTag)}`
          : "/api/blog/";
        const [posts, allTags] = await Promise.all([
          apiRequest(apiUrl),
          apiRequest("/api/blog/tags"),
        ]);
        ui.renderBlogList(posts, allTags, activeTag);
        break;
      case "blog_post":
        const post = await apiRequest(`/api/blog/${state.view.blogSlug}`);
        state.view.currentBlogPost = post;
        ui.renderBlogPost(post);
        break;
    }
  } catch (err) {
    console.error(err);
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
    setTimeout(() => {
      player.forceUpdateIcons();
    }, 50);
  }
}

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

  ui.initPlayerToggle();

  // --- ЛОГИКА МОДАЛЬНОГО ОКНА И ПОДСКАЗКИ ---
  const infoModal = document.getElementById("player-info-modal");
  const infoModalWrapper = document.getElementById(
    "player-info-modal-content-wrapper"
  );
  const openInfoBtn = document.getElementById("player-info-btn-mobile");
  const closeInfoBtn = document.getElementById("player-info-modal-close-btn");
  const infoPopoverContainer = document.getElementById(
    "info-popover-container"
  );
  const infoBtnDesktop = document.getElementById("player-info-btn-desktop");
  const popover = document.getElementById("player-info-popover");

  // --- ЛОГИКА ДЛЯ МОБИЛЬНОГО ОКНА ---
  const openInfoModal = () => {
    const musicPlayer = document.getElementById("music-player");
    const playerHeight =
      musicPlayer && !musicPlayer.classList.contains("player-collapsed")
        ? musicPlayer.offsetHeight
        : 0;
    const availableHeight = window.innerHeight - playerHeight;

    infoModal.classList.remove("hidden");
    infoModalWrapper.style.visibility = "hidden";
    infoModalWrapper.style.transform = "scale(0.95)";

    requestAnimationFrame(() => {
      const modalHeight = infoModalWrapper.offsetHeight;
      const modalWidth = infoModalWrapper.offsetWidth;

      let topPosition = (availableHeight - modalHeight) / 2;
      if (topPosition < 20) topPosition = 20;

      let leftPosition = (window.innerWidth - modalWidth) / 2;

      infoModalWrapper.style.top = `${topPosition}px`;
      infoModalWrapper.style.left = `${leftPosition}px`;

      infoModalWrapper.style.visibility = "visible";
      infoModal.classList.remove("opacity-0");
      infoModalWrapper.style.transform = "scale(1)";
    });
  };

  const closeInfoModal = () => {
    infoModal.classList.add("opacity-0");
    infoModalWrapper.style.transform = "scale(0.95)";
    setTimeout(() => {
      infoModal.classList.add("hidden");
    }, 300);
  };

  if (openInfoBtn) openInfoBtn.addEventListener("click", openInfoModal);
  if (closeInfoBtn) closeInfoBtn.addEventListener("click", closeInfoModal);

  // --- ЛОГИКА ДЛЯ ДЕСКТОПНОЙ ПОДСКАЗКИ ---
  if (infoPopoverContainer && infoBtnDesktop && popover) {
    let hideTimeout;

    const showPopover = () => {
      clearTimeout(hideTimeout);
      const btnRect = infoBtnDesktop.getBoundingClientRect();
      popover.style.bottom = `${window.innerHeight - btnRect.top + 30}px`;
      const popoverWidth = popover.offsetWidth;
      const btnCenter = btnRect.left + btnRect.width / 2;
      let left = btnCenter - popoverWidth / 2;
      if (left < 10) left = 10;
      if (left + popoverWidth > window.innerWidth - 10) {
        left = window.innerWidth - popoverWidth - 10;
      }
      popover.style.left = `${left}px`;
      popover.style.opacity = "1";
      popover.classList.remove("pointer-events-none");
    };

    const hidePopover = () => {
      hideTimeout = setTimeout(() => {
        popover.style.opacity = "0";
        popover.classList.add("pointer-events-none");
      }, 200);
    };

    infoPopoverContainer.addEventListener("mouseenter", showPopover);
    infoPopoverContainer.addEventListener("mouseleave", hidePopover);
    popover.addEventListener("mouseenter", showPopover);
    popover.addEventListener("mouseleave", hidePopover);
  }

  // 2. ОСНОВНОЙ СЛУШАТЕЛЬ КЛИКОВ
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
      ui.showMainApp();
      return;
    }

    // --- ВОСПРОИЗВЕДЕНИЕ ВСЕГО ПРОИЗВЕДЕНИЯ ---
    if (target.closest("#work-play-all-btn")) {
      const work = window.state.view.currentWork;
      if (!work || !work.compositions) return;

      const playlist = work.compositions
        .flatMap((comp) => {
          return comp.recordings
            .filter((r) => r.duration > 0)
            .map((rec) => ({
              ...rec,
              composition: {
                ...comp,
                work: work,
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

      player.handleTrackClick(playlist[0].id, 0, playlist);
      ui.showNotification(
        `Воспроизведение ${playlist.length} треков`,
        "success"
      );
    }

    // === УПРАВЛЕНИЕ ОЧЕРЕДЬЮ ===

    // 1. Полная очистка очереди
    if (target.closest("#clear-queue-btn")) {
      e.preventDefault();
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

      const tagsValue = document.getElementById("blog-tags").value;
      const tags = tagsValue
        ? tagsValue
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

      const data = {
        title: document.getElementById("blog-title").value,
        slug: document.getElementById("blog-slug").value,
        summary: document.getElementById("blog-summary").value,
        meta_description: document.getElementById("blog-meta-desc").value,
        meta_keywords: document.getElementById("blog-keywords").value,
        content: window.quillEditor.root.innerHTML,
        tags: tags,
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

          router.navigate("/blog");

          state.view.current = "blog_list";
          state.view.blogSlug = null;

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

      player.handleTrackClick(list[0].id, 0, list);
      ui.showNotification(`Воспроизведение ${list.length} треков`, "success");
    }

    // 2. Перемешать (Shuffle)
    if (target.closest("#library-shuffle-btn")) {
      let shuffledList = [...state.currentViewRecordings];

      if (!shuffledList || shuffledList.length === 0)
        return ui.showNotification("Список пуст", "info");

      // Алгоритм тасования (мешаем копию)
      for (let i = shuffledList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledList[i], shuffledList[j]] = [shuffledList[j], shuffledList[i]];
      }

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

      const mobileMenuPanel = document.getElementById("mobile-menu-panel");
      if (mobileMenuPanel) {
        mobileMenuPanel.classList.add("hidden");
      }

      return;
    }

    // --- ПЛЕЕР (Кнопка Play в списке) ---
    const playBtn = target.closest(".recording-play-pause-btn");
    if (playBtn) {
      e.stopPropagation();
      const item = playBtn.closest(".recording-item");

      const playableList = state.currentViewRecordings.filter(
        (r) => r.duration > 0
      );

      player.handleTrackClick(
        parseInt(item.dataset.recordingId),
        parseInt(item.dataset.index),
        playableList
      );

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
        handleSelectionToggle(row);
      }
      return;
    }

    // --- МОДАЛЬНЫЕ ОКНА (Открытие) ---
    if (target.closest("#add-composer-btn")) ui.showAddComposerModal();
    if (target.closest("#add-work-btn")) ui.showAddWorkModal();
    if (target.closest("#add-composition-btn")) ui.showAddCompositionModal();

    // Разделяем вызовы
    if (target.closest("#add-audio-btn")) {
      const compId = state.view.currentComposition?.id;
      ui.showAddAudioModal(compId);
    }
    if (target.closest("#add-video-btn")) {
      const compId = state.view.currentComposition?.id;
      ui.showAddVideoModal(compId);
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

    // --- СОЗДАНИЕ СУЩНОСТЕЙ ---
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
        content.style.maxHeight = "15rem";
        content.dataset.expanded = "false";
        gradient.classList.remove("hidden");
        textSpan.textContent = "Читать далее";
        if (icon) icon.style.transform = "rotate(0deg)";
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

      const notesContent = window.quillEditor
        ? window.quillEditor.root.innerHTML
        : "";

      const genreLabel = document.getElementById("add-work-genre").value;
      let genreKey = genreLabel;

      const data = {
        name_ru: nameRu,
        original_name:
          document.getElementById("add-work-name-orig").value.trim() || null,
        tonality:
          document.getElementById("add-work-tonality").value.trim() || null,
        is_no_catalog: document.getElementById("add-work-no-catalog").checked,
        catalog_number:
          document.getElementById("add-work-catalog").value.trim() || null,
        genre: genreLabel || null,
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

    // 4. Загрузка АУДИО Записи
    const createAudioBtn = target.closest("#create-audio-recording-btn");
    if (createAudioBtn) {
      e.preventDefault();
      const compId = document.getElementById(
        "add-recording-composition-id"
      ).value;
      const fileInput = document.getElementById("composition-upload-input");
      const file = fileInput.files[0];

      if (!file) {
        return ui.showNotification("Пожалуйста, выберите аудиофайл", "error");
      }

      const fd = new FormData();
      fd.append(
        "performers",
        document.getElementById("add-recording-performers").value || ""
      );
      fd.append(
        "lead_performer",
        document.getElementById("add-recording-lead-performer").value || ""
      );
      fd.append(
        "conductor",
        document.getElementById("add-recording-conductor").value || ""
      );
      fd.append(
        "recording_year",
        document.getElementById("add-recording-year").value || ""
      );
      fd.append(
        "license",
        document.getElementById("add-recording-license").value || ""
      );
      fd.append(
        "source_text",
        document.getElementById("add-recording-source-text").value || ""
      );
      fd.append(
        "source_url",
        document.getElementById("add-recording-source-url").value || ""
      );
      fd.append("file", file);

      handleCreateEntity(
        createAudioBtn,
        `/api/recordings/compositions/${compId}/upload`,
        fd,
        "add-audio-modal",
        "Аудиозапись добавлена!"
      );
      return;
    }

    // 5. Добавление ВИДЕО Записи
    const createVideoBtn = target.closest("#create-video-recording-btn");
    if (createVideoBtn) {
      e.preventDefault();
      const compId = state.view.currentComposition?.id;
      const url = document.getElementById("add-video-youtube").value.trim();
      const performers = document
        .getElementById("add-video-performers")
        .value.trim();

      if (!url || !performers) {
        return ui.showNotification(
          "Ссылка YouTube и Исполнитель обязательны",
          "error"
        );
      }

      const data = {
        youtube_url: url,
        performers: performers,
        lead_performer:
          document.getElementById("add-video-lead-performer").value.trim() ||
          null,
        conductor:
          document.getElementById("add-video-conductor").value.trim() || null,
        recording_year:
          parseInt(document.getElementById("add-video-year").value) || null,
      };

      handleCreateEntity(
        createVideoBtn,
        `/api/recordings/compositions/${compId}/add-video`,
        data,
        "add-video-modal",
        "Видеозапись добавлена!"
      );
      return;
    }

    // --- ЗАГРУЗКА НА СТРАНИЦЕ ПРОИЗВЕДЕНИЯ (АУДИО И ВИДЕО) ---
    const workAudioBtn = target.closest("#add-work-audio-btn");
    const workVideoBtn = target.closest("#add-work-video-btn");

    if (workAudioBtn || workVideoBtn) {
      const btn = workAudioBtn || workVideoBtn;
      const type = workAudioBtn ? "audio" : "video";

      const w = state.view.currentWork;
      if (!w) return;

      // 1. Ищем подходящую часть для записи
      let targetComp = w.compositions.find((c) => c.sort_order === 0);

      if (
        !targetComp &&
        w.compositions.length === 1 &&
        w.compositions[0].sort_order !== 0
      ) {
        targetComp = w.compositions[0];
      }

      if (!targetComp) {
        try {
          const originalText = btn.innerHTML;
          btn.textContent = "Создание раздела...";
          btn.disabled = true;

          const newComp = await apiRequest(
            `/api/recordings/works/${w.id}/compositions`,
            "POST",
            {
              title_ru: "Полное произведение",
              title_original: "Complete Work",
              sort_order: 0,
              catalog_number: w.catalog_number,
            }
          );

          targetComp = newComp;
          w.compositions.push(newComp);

          btn.innerHTML = originalText;
          btn.disabled = false;
        } catch (err) {
          ui.showNotification(
            "Ошибка создания раздела: " + err.message,
            "error"
          );
          btn.disabled = false;
          return;
        }
      }

      if (targetComp) {
        state.view.currentComposition = targetComp;

        if (type === "audio") {
          ui.showAddAudioModal(targetComp.id);
        } else {
          ui.showAddVideoModal(targetComp.id);
        }
      }
      return;
    }

    // --- УПРАВЛЕНИЕ ВИДЕО (Кнопки на карточке) ---

    // 1. Редактировать видео
    const editVideoBtn = target.closest(".edit-video-btn");
    if (editVideoBtn) {
      e.preventDefault();
      e.stopPropagation();
      const rid = parseInt(editVideoBtn.dataset.recordingId);
      const rec = state.currentViewRecordings.find((r) => r.id === rid);

      if (rec) {
        ui.showEditEntityModal("video_recording", rec, async (data) => {
          await apiRequest(`/api/recordings/${rec.id}`, "PUT", data);
          ui.showNotification("Видеозапись обновлена", "success");
          loadCurrentView();
        });
      }
      return;
    }

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

    // --- МАССОВОЕ РЕДАКТИРОВАНИЕ (В ПАНЕЛИ) ---
    if (target.closest("#bulk-edit-btn")) {
      const iterator = state.selectedRecordingIds.values();
      const id = iterator.next().value;
      if (!id) return;

      const rec = state.currentViewRecordings.find((r) => r.id === id);
      if (rec) {
        state.selectedRecordingIds.clear();
        state.isSelectionMode = false;

        ui.updateSelectionBar(0);
        ui.updateSelectionStyles();

        document
          .querySelectorAll(".selection-checkbox-container")
          .forEach((el) => {
            el.classList.add("hidden");
            el.style.display = "";
          });

        const type = rec.duration > 0 ? "audio_recording" : "video_recording";

        ui.showEditEntityModal(type, rec, async (data) => {
          await apiRequest(`/api/recordings/${rec.id}`, "PUT", data);
          ui.showNotification("Запись обновлена", "success");

          loadCurrentView();
        });
      }
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

            state.selectedRecordingIds.clear();
            ui.updateSelectionBar(0);
            loadCurrentView();
          },
        });
      }
    }

    // --- МОБИЛЬНАЯ СОРТИРОВКА ПЛЕЙЛИСТА ---
    const sortUpBtn = target.closest(".sort-up-btn");
    const sortDownBtn = target.closest(".sort-down-btn");

    if (sortUpBtn || sortDownBtn) {
      // 1. Определяем направление
      const isUp = !!sortUpBtn;
      const btn = isUp ? sortUpBtn : sortDownBtn;
      const index = parseInt(btn.dataset.index);

      // 2. Проверяем границы (нельзя поднять первый и опустить последний)
      const list = window.state.currentViewRecordings;
      if ((isUp && index === 0) || (!isUp && index === list.length - 1)) {
        return; // Ничего не делаем
      }

      // 3. Меняем местами элементы в массиве
      const swapIndex = isUp ? index - 1 : index + 1;
      const temp = list[index];
      list[index] = list[swapIndex];
      list[swapIndex] = temp;

      // 4. Оптимистично перерисовываем интерфейс (мгновенная реакция)
      // Нам нужно знать ID плейлиста и название, берем из стейта или DOM
      const playlistId = window.state.view.playlistId;
      const playlistName =
        document
          .querySelector("#view-title-container h2")
          ?.textContent?.replace("Список", "")
          .trim() || "Плейлист";

      ui.renderRecordingList(
        list,
        playlistName,
        0,
        { isPlaylist: true },
        window.state.favoriteRecordingIds
      );

      // 5. Отправляем новый порядок на сервер (в фоне)
      try {
        const newOrderIds = list.map((r) => r.id);
        await apiRequest(`/api/playlists/${playlistId}/reorder`, "PUT", {
          recording_ids: newOrderIds,
        });
      } catch (err) {
        ui.showNotification("Ошибка сохранения порядка", "error");
        // Если ошибка - лучше перезагрузить страницу, чтобы вернуть как было
        loadCurrentView();
      }
      return;
    }

    // --- МОБИЛЬНАЯ СОРТИРОВКА ЧАСТЕЙ ПРОИЗВЕДЕНИЯ ---
    const compUpBtn = target.closest(".comp-sort-up-btn");
    const compDownBtn = target.closest(".comp-sort-down-btn");

    if (compUpBtn || compDownBtn) {
      // Мы уже не внутри ссылки <a>, но на всякий случай останавливаем всплытие
      e.stopPropagation();

      const isUp = !!compUpBtn;
      const btn = isUp ? compUpBtn : compDownBtn;
      const index = parseInt(btn.dataset.index);

      const work = window.state.view.currentWork;
      if (!work) return;

      // Важно: фильтруем так же, как при рендере, чтобы индексы совпали
      let parts = work.compositions
        .filter((c) => c.sort_order !== 0)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      if ((isUp && index === 0) || (!isUp && index === parts.length - 1))
        return;

      const swapIndex = isUp ? index - 1 : index + 1;
      const temp = parts[index];
      parts[index] = parts[swapIndex];
      parts[swapIndex] = temp;

      // Локальное обновление для мгновенной реакции
      parts.forEach((p, i) => {
        p.sort_order = i + 1;
      });

      ui.renderCompositionGrid(work, window.state.displayLanguage);

      try {
        const newIds = parts.map((c) => c.id);
        await apiRequest(
          `/api/recordings/works/${work.id}/reorder-compositions`,
          "PUT",
          { composition_ids: newIds }
        );
      } catch (err) {
        ui.showNotification("Ошибка сортировки: " + err.message, "error");
        loadCurrentView();
      }
      return;
    }

    // --- ОСТАЛЬНОЕ ---
    if (target.closest("#logout-btn")) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_email");
      localStorage.removeItem("is_admin");

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
    if (window.innerWidth < 768) {
      if (e.target.closest(".recording-item")) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }

    // 2. Логика для ПК
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

  // --- ЛОГИКА DRAG & DROP ДЛЯ ПЛЕЙЛИСТОВ (Идентична странице произведения) ---
  let draggedPlaylistItem = null; // <--- ИМЯ ПЕРЕМЕННОЙ

  // 1. НАЧАЛО ПЕРЕТАСКИВАНИЯ
  document.addEventListener("dragstart", (e) => {
    // Ищем ТОЛЬКО наш спец. класс. Если это не он - выходим.
    const target = e.target.closest(".playlist-sortable-item");
    if (!target) return;

    draggedPlaylistItem = target; // <--- ИСПРАВЛЕНО (было draggedPlaylistRow)
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", ""); // Нужно для Firefox

    // Делаем полупрозрачным с задержкой, чтобы драг-имидж успел создаться
    setTimeout(() => {
      target.classList.add("dragging-active");
    }, 0);
  });

  // 2. КОНЕЦ ПЕРЕТАСКИВАНИЯ
  document.addEventListener("dragend", (e) => {
    if (draggedPlaylistItem) {
      // <--- ИСПРАВЛЕНО
      draggedPlaylistItem.classList.remove("dragging-active"); // <--- ИСПРАВЛЕНО

      // Чистим все синие линии на странице
      document
        .querySelectorAll(".drag-over-top, .drag-over-bottom")
        .forEach((el) => {
          el.classList.remove("drag-over-top", "drag-over-bottom");
        });

      draggedPlaylistItem = null; // <--- ИСПРАВЛЕНО
    }
  });

  // 3. DRAG OVER
  document.addEventListener("dragover", (e) => {
    if (!draggedPlaylistItem) return;

    e.preventDefault();

    const target = e.target.closest(".playlist-sortable-item");

    if (!target || target === draggedPlaylistItem) {
      document.querySelectorAll(".playlist-sortable-item").forEach((el) => {
        el.classList.remove("drag-over-top", "drag-over-bottom");
      });
      return;
    }

    // 2. Очищаем визуальные эффекты ТОЛЬКО с других элементов
    document.querySelectorAll(".playlist-sortable-item").forEach((el) => {
      if (el !== target) {
        el.classList.remove("drag-over-top", "drag-over-bottom");
      }
    });

    // 3. Рисуем линию на текущей цели
    const rect = target.getBoundingClientRect();
    const offset = e.clientY - rect.top;

    target.classList.remove("drag-over-top", "drag-over-bottom");

    if (offset < rect.height / 2) {
      target.classList.add("drag-over-top");
    } else {
      target.classList.add("drag-over-bottom");
    }
  });

  // 4. БРОСОК (DROP)
  document.addEventListener("drop", async (e) => {
    if (!draggedPlaylistItem) return;

    e.preventDefault();
    const target = e.target.closest(".playlist-sortable-item");

    if (!target || target === draggedPlaylistItem) return;

    const parent = target.parentNode;

    if (target.classList.contains("drag-over-top")) {
      parent.insertBefore(draggedPlaylistItem, target);
    } else {
      parent.insertBefore(draggedPlaylistItem, target.nextSibling);
    }

    // Убираем линии
    target.classList.remove("drag-over-top", "drag-over-bottom");

    // Собираем новые ID для сохранения
    const newOrderIds = Array.from(
      parent.querySelectorAll(".playlist-sortable-item")
    ).map((el) => parseInt(el.dataset.recordingId));

    try {
      await apiRequest(
        `/api/playlists/${state.view.playlistId}/reorder`,
        "PUT",
        { recording_ids: newOrderIds }
      );
    } catch (err) {
      ui.showNotification("Ошибка сохранения порядка", "error");
      console.error(err);
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
    if (!draggedComp) return;

    e.preventDefault();

    const target = e.target.closest(".comp-sortable-item");

    if (!target || target === draggedComp) {
      document
        .querySelectorAll(".drag-over-top, .drag-over-bottom")
        .forEach((el) => {
          el.classList.remove("drag-over-top", "drag-over-bottom");
        });
      return;
    }

    document
      .querySelectorAll(".drag-over-top, .drag-over-bottom")
      .forEach((el) => {
        if (el !== target) {
          el.classList.remove("drag-over-top", "drag-over-bottom");
        }
      });

    const rect = target.getBoundingClientRect();
    const offset = e.clientY - rect.top;

    target.classList.remove("drag-over-top", "drag-over-bottom");

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

    const parent = target.parentNode;
    target.classList.remove("drag-over-top", "drag-over-bottom");

    const rect = target.getBoundingClientRect();
    const offset = e.clientY - rect.top;

    if (offset < rect.height / 2) {
      parent.insertBefore(draggedComp, target);
    } else {
      parent.insertBefore(draggedComp, target.nextSibling);
    }

    const allItems = parent.querySelectorAll(".comp-sortable-item");
    const newIds = [];

    allItems.forEach((item, index) => {
      const numberBadge = item.querySelector(".comp-sort-number");
      if (numberBadge) {
        numberBadge.textContent = index + 1;
      }
      newIds.push(parseInt(item.dataset.compId));
    });

    if (state.view.currentWork) {
      try {
        await apiRequest(
          `/api/recordings/works/${state.view.currentWork.id}/reorder-compositions`,
          "PUT",
          {
            composition_ids: newIds,
          }
        );
      } catch (err) {
        ui.showNotification("Ошибка сортировки", "error");
        console.error(err);
      }
    }
  });

  // --- УПРАВЛЕНИЕ ТАПАМИ НА МОБИЛЬНОМ И КЛИКАМИ ---

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
      touchTimer = setTimeout(() => {
        isLongTouch = true;
        if (navigator.vibrate) navigator.vibrate(50);
        handleSelectionToggle(row);
      }, 500);
    },
    { passive: true }
  );

  document.body.addEventListener(
    "touchmove",
    (e) => {
      if (!touchTimer) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      if (Math.abs(x - touchStartX) > 10 || Math.abs(y - touchStartY) > 50) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    },
    { passive: true }
  );

  document.body.addEventListener("touchend", (e) => {
    if (isLongTouch) {
      e.preventDefault();
      isLongTouch = false;
      clearTimeout(touchTimer);
      touchTimer = null;
      return;
    }

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
        e.preventDefault();
        handleSelectionToggle(row);
      }
    }
  });

  document.body.addEventListener("contextmenu", (e) => {
    if (window.innerWidth < 768 && e.target.closest(".recording-item")) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  });
}

function handleSelectionToggle(row) {
  if (!row) return;
  const id = parseInt(row.dataset.recordingId);
  if (isNaN(id)) return;

  const checkbox = row.querySelector(".recording-checkbox");

  if (window.state.selectedRecordingIds.size === 0) {
    window.state.isSelectionMode = true;
    document.querySelectorAll(".selection-checkbox-container").forEach((el) => {
      el.classList.remove("hidden");
      el.style.display = "flex";
    });
  }

  let isSelected;
  if (window.state.selectedRecordingIds.has(id)) {
    window.state.selectedRecordingIds.delete(id);
    isSelected = false;
  } else {
    window.state.selectedRecordingIds.add(id);
    isSelected = true;
  }

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
    row.classList.add("bg-white");
    if (checkbox) checkbox.checked = false;
  }

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

  if (!state.selectedRecordingIds.has(rid)) {
    if (!state.isSelectionMode) {
      state.selectedRecordingIds.clear();
      ui.updateSelectionBar(0);
    }
    state.selectedRecordingIds.add(rid);
  }

  const count = state.selectedRecordingIds.size;
  m.dataset.recordingId = rid;

  let html = `<div class="py-1 min-w-[220px] bg-white rounded-lg shadow-xl border border-gray-100 font-medium text-sm text-gray-700">`;

  html += `
    <li data-action="play-next" class="px-4 py-3 hover:bg-cyan-50 cursor-pointer flex gap-3 items-center border-b border-gray-50">
        <i data-lucide="corner-down-right" class="w-4 h-4 text-cyan-600"></i> Играть следующим
    </li>
    <li data-action="add-to-queue" class="px-4 py-3 hover:bg-cyan-50 cursor-pointer flex gap-3 items-center">
        <i data-lucide="list-plus" class="w-4 h-4 text-cyan-600"></i> В конец очереди
    </li>
  `;

  if (isLoggedIn) {
    html += `<div class="border-t border-gray-100 my-1"></div>`;

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

              <ul class="absolute left-full top-0 mt-[-4px] w-48 bg-white shadow-xl rounded-xl border border-gray-100 hidden group-hover:block z-50 py-2 pl-3 -ml-1">
                  ${playlistsItems}
              </ul>
          </li>
      `;
  }

  if (isAdmin) {
    html += `<div class="border-t border-gray-100 my-1"></div>`;
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

  ui.hideContextMenu(m);

  const act = li.dataset.action;

  const unselectItems = () => {
    for (const id of state.selectedRecordingIds) {
      const row = document.querySelector(
        `.recording-item[data-recording-id="${id}"]`
      );
      if (row) {
        row.classList.remove("bg-cyan-50", "border-cyan-200");
        row.classList.add("border-gray-100");

        const checkbox = row.querySelector(
          `.recording-checkbox[data-id="${id}"]`
        );
        if (checkbox) {
          checkbox.checked = false;
        }
      }
    }
    state.selectedRecordingIds.clear();
    ui.updateSelectionBar(0);
  };

  const contextRid = parseInt(m.dataset.recordingId);
  const contextPid = parseInt(m.dataset.playlistId);

  let targetIds = [];

  if (state.selectedRecordingIds.has(contextRid)) {
    targetIds = Array.from(state.selectedRecordingIds).map((id) =>
      parseInt(id)
    );
  } else {
    targetIds = [contextRid];
  }

  const targetRecordings = state.currentViewRecordings.filter((r) =>
    targetIds.includes(r.id)
  );

  if (act === "play-next") {
    player.playNextInQueue(targetRecordings);
    unselectItems();
  }

  if (act === "add-to-queue") {
    player.addToQueue(targetRecordings);
    unselectItems();
  }

  if (act === "edit-recording") {
    if (targetIds.length > 1) {
      ui.showNotification("Редактируйте записи по одной", "info");
    } else {
      const rec = state.currentViewRecordings.find((r) => r.id === contextRid);
      if (rec) {
        const recordingType =
          rec.duration > 0 ? "audio_recording" : "video_recording";
        ui.showEditEntityModal(recordingType, rec, async (data) => {
          await apiRequest(`/api/recordings/${rec.id}`, "PUT", data);
          ui.showNotification("Запись обновлена", "success");
          state.selectedRecordingIds.clear();
          ui.updateSelectionBar(0);
          loadCurrentView();
        });
      }
    }
  }

  if (act === "add-to-playlist") {
    const targetPid = parseInt(li.dataset.pid);
    let successCount = 0;

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

  if (act === "remove-from-playlist") {
    if (!contextPid) {
      ui.showNotification("Ошибка ID плейлиста", "error");
      return;
    }

    try {
      await apiRequest(
        `/api/playlists/${contextPid}/recordings-bulk-delete`,
        "POST",
        {
          recording_ids: targetIds,
        }
      );

      ui.showNotification(`Удалено треков: ${targetIds.length}`, "success");

      state.currentViewRecordings = state.currentViewRecordings.filter(
        (r) => !targetIds.includes(r.id)
      );

      unselectItems();

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

  const btn = document.getElementById("load-more-composers-btn");
  if (btn) {
    btn.innerHTML = `<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div> Загрузка...`;
    btn.disabled = true;
  }

  try {
    const newComposers = await apiRequest(
      `/api/recordings/composers?skip=${skip}&limit=${limit}`
    );

    if (newComposers.length < limit) {
      state.composersPagination.hasMore = false;
    }

    state.composersPagination.skip += limit;

    const isAppend = skip > 0;
    ui.renderComposerList(
      newComposers,
      isAppend,
      state.composersPagination.hasMore,
      state.displayLanguage
    );

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

async function loadLibraryWithFilters(reset = false) {
  if (reset) {
    state.libraryFilters.page = 1;
    state.currentViewRecordings = [];
    state.libraryFilters.hasMore = true;
    const list = document.getElementById("library-results-container");
    if (list)
      list.innerHTML =
        '<div class="flex justify-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div></div>';
  }

  const { page, limit, mediaType, composerId, genre, sortBy, search } =
    state.libraryFilters;
  const skip = (page - 1) * limit;

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

    ui.renderLibraryContent(
      state.currentViewRecordings,
      mediaType === "audio" ? "list" : "grid",
      state.favoriteRecordingIds,
      reset
    );

    ui.updateLoadMoreButton(state.libraryFilters.hasMore);
  } catch (e) {
    console.error(e);
    ui.showNotification("Ошибка загрузки: " + e.message, "error");
  }
}

window.applyLibraryFilter = (key, value) => {
  state.libraryFilters[key] = value;
  loadLibraryWithFilters(true);
};

window.loadMoreLibrary = () => {
  state.libraryFilters.page += 1;
  loadLibraryWithFilters(false);
};

window.playYouTubeVideo = (videoId) => {
  if (!videoId) return;

  const modal = document.getElementById("video-player-modal");
  const container = document.getElementById("youtube-player-container");

  container.innerHTML = `
        <iframe class="w-full h-full"
                src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
        </iframe>`;

  modal.classList.remove("hidden");
  setTimeout(() => {
    modal.classList.remove("opacity-0");
    document.getElementById("video-modal-content").classList.remove("scale-95");
  }, 10);
};

function closeYouTubeVideo() {
  const modal = document.getElementById("video-player-modal");
  const container = document.getElementById("youtube-player-container");

  modal.classList.add("opacity-0");
  document.getElementById("video-modal-content").classList.add("scale-95");

  setTimeout(() => {
    modal.classList.add("hidden");
    container.innerHTML = "";
  }, 200);
}
function setupDuplicateCheckers() {
  let debounceTimer;

  const check = async (entityType, query, warningElId, params = {}) => {
    const warningEl = document.getElementById(warningElId);
    if (!query || query.length < 3) {
      warningEl.classList.add("hidden");
      return;
    }

    try {
      let url = `/api/search/check-duplicates?entity_type=${entityType}&query=${encodeURIComponent(
        query
      )}`;
      if (params.composerId) url += `&composer_id=${params.composerId}`;
      if (params.workId) url += `&work_id=${params.workId}`;

      const duplicates = await apiRequest(url);

      if (duplicates.length > 0) {
        const list = duplicates
          .map(
            (item) => `
                    <li>
                        <a href="#/works/${
                          item.slug || item.id
                        }" target="_blank" class="font-bold text-red-700 hover:underline">
                            ${item.name_ru}
                        </a>
                    </li>
                `
          )
          .join("");
        warningEl.innerHTML = `<strong>Внимание!</strong> Возможно, такая запись уже существует: <ul class="list-disc pl-5 mt-1">${list}</ul>`;
        warningEl.classList.remove("hidden");
      } else {
        warningEl.classList.add("hidden");
      }
    } catch (e) {
      console.error("Duplicate check failed:", e);
      warningEl.classList.add("hidden");
    }
  };

  const composerInput = document.getElementById("add-composer-name-ru");
  if (composerInput) {
    composerInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        check("composer", e.target.value, "composer-duplicates-warning");
      }, 500);
    });
  }

  const workInput = document.getElementById("add-work-name-ru");
  if (workInput) {
    workInput.addEventListener("input", (e) => {
      console.log("Сработал input для произведения!");
      const composerId = window.state.view.currentComposer?.id;
      if (!composerId) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log("Вызов check() для произведения:", e.target.value); // Проверяем вызов
        check("work", e.target.value, "work-duplicates-warning", {
          composerId,
        });
      }, 500);
    });
  } else {
    console.error(
      "КРИТИЧЕСКАЯ ОШИБКА: Элемент #add-work-name-ru не найден в DOM!"
    );
  }

  const compInput = document.getElementById("add-composition-title-ru");
  if (compInput) {
    compInput.addEventListener("input", (e) => {
      const workId = window.state.view.currentWork?.id;
      if (!workId) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        check("composition", e.target.value, "composition-duplicates-warning", {
          workId,
        });
      }, 500);
    });
  }
}
