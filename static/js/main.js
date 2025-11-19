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
  view: {
    current: "recordings",
    currentComposer: null,
    currentWork: null,
    currentComposition: null,
    playlistId: null,
    searchQuery: null,
  },
  pagination: { currentPage: 1, itemsPerPage: 50, totalPages: 1 },
  displayLanguage: "ru",
};

document.addEventListener("DOMContentLoaded", main);

function main() {
  const token = localStorage.getItem("access_token");
  initAuth(() => {
    ui.showMainApp();
    setupRouter();
    const userEmail = localStorage.getItem("user_email");
    if (userEmail) ui.setUserGreeting(userEmail);
    if (!window.location.hash || window.location.hash === "#/") {
      router.navigate("/");
    }
  });

  if (token) {
    ui.showMainApp();
    const userEmail = localStorage.getItem("user_email");
    if (userEmail) ui.setUserGreeting(userEmail);
    setupRouter();
  } else {
    ui.showAuthView();
  }

  player.initPlayer();
  addEventListeners();
  if (window.lucide) window.lucide.createIcons();
}

function resetViewState() {
  state.view.currentComposer = null;
  state.view.currentWork = null;
  state.view.currentComposition = null;
  state.view.playlistId = null;
  state.currentViewRecordings = [];
}

function setupRouter() {
  router
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

      "/composers/:id": ({ data }) => {
        state.view.current = "composer_detail";
        state.view.currentComposer = { id: data.id };
        loadCurrentView();
      },
      "/works/:id": ({ data }) => {
        state.view.current = "work_detail";
        state.view.currentWork = { id: data.id };
        loadCurrentView();
      },
      "/compositions/:id": ({ data }) => {
        state.view.current = "composition_detail";
        state.view.currentComposition = { id: data.id };
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
    })
    .resolve();

  if (!window.location.hash) router.navigate("/");
}

async function loadCurrentView() {
  // SAFETY CHECK: Если view пустой (например, после удаления), не грузим данные
  if (!state.view.current) return;

  const list = document.getElementById("composition-list");
  if (list)
    list.innerHTML =
      '<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div></div>';

  if (!state.favoritesLoaded) {
    try {
      const f = await apiRequest("/api/users/me/favorites");
      state.favoriteRecordingIds = new Set(f.map((r) => r.id));
      state.favoritesLoaded = true;
    } catch (e) {}
  }
  if (state.playlists.length === 0) {
    try {
      const p = await apiRequest("/api/playlists/");
      state.playlists = p;
      ui.renderPlaylistList(p);
    } catch (e) {}
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
        ui.renderRecordingList(
          s.recordings,
          `Результаты`,
          0,
          {},
          state.favoriteRecordingIds
        );
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
        const c = await apiRequest("/api/recordings/composers");
        ui.renderComposerList(c, state.displayLanguage);
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
    }
  } catch (err) {
    console.error(err);
    // Если мы получили 404 (Not found), это нормально при удалении - игнорируем
    if (!err.message.includes("404")) {
      ui.showNotification("Ошибка загрузки: " + err.message, "error");
    }
  }
  if (window.lucide) window.lucide.createIcons();
}

function addEventListeners() {
  document.body.addEventListener("click", async (e) => {
    const target = e.target;

    // === УДАЛЕНИЕ (ИСПРАВЛЕНО) ===

    // А) Удалить Композитора
    if (target.closest("#delete-composer-btn")) {
      const c = state.view.currentComposer;
      if (!c) return;

      ui.showDeleteModal({
        title: `Удалить композитора?`,
        text: `Вы удаляете: <b>${c.name_ru}</b>.<br>Будут удалены ВСЕ произведения и записи.`,
        verificationString: c.name_ru,
        onConfirm: async () => {
          // БЕЗ TRY/CATCH здесь! Пусть ошибка летит в ui.js, чтобы кнопка разблокировалась
          await apiRequest(`/api/recordings/composers/${c.id}`, "DELETE");

          ui.showNotification("Композитор удален", "success");
          document.getElementById("delete-modal").classList.add("hidden");

          // Важно: сбрасываем вид, чтобы loadCurrentView не пытался грузить удаленное
          state.view.current = "composers";
          router.navigate("/composers");
        },
      });
      return;
    }

    // Б) Удалить Произведение
    if (target.closest("#delete-work-btn")) {
      const w = state.view.currentWork;
      if (!w) return;

      ui.showDeleteModal({
        title: `Удалить произведение?`,
        text: `Удаление: <b>${w.name_ru || w.name}</b>.<br>Все части и записи будут удалены.`,
        onConfirm: async () => {
          const parentUrl = `/composers/${state.view.currentComposer.id}`;
          await apiRequest(`/api/recordings/works/${w.id}`, "DELETE");

          ui.showNotification("Произведение удалено", "success");
          document.getElementById("delete-modal").classList.add("hidden");

          state.view.current = null; // Блокируем текущий вид
          router.navigate(parentUrl);
        },
      });
      return;
    }

    // В) Удалить Часть
    if (target.closest("#delete-composition-btn")) {
      const cp = state.view.currentComposition;
      if (!cp) return;

      ui.showDeleteModal({
        title: `Удалить часть?`,
        text: `Удаление: <b>${cp.title_ru || cp.title}</b>.`,
        onConfirm: async () => {
          const parentUrl = `/works/${state.view.currentWork.id}`;
          await apiRequest(`/api/recordings/compositions/${cp.id}`, "DELETE");

          ui.showNotification("Часть удалена", "success");
          document.getElementById("delete-modal").classList.add("hidden");

          state.view.current = null; // Блокируем текущий вид
          router.navigate(parentUrl);
        },
      });
      return;
    }

    // === ОСТАЛЬНОЕ (КОНТЕКСТ, НАВИГАЦИЯ, ПЛЕЕР) ===
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

    const navLink = target.closest("a[data-navigo]");
    if (navLink) {
      e.preventDefault();
      router.navigate(navLink.getAttribute("href"));
      return;
    }

    const playBtn = target.closest(".recording-play-pause-btn");
    if (playBtn) {
      e.stopPropagation();
      const item = playBtn.closest(".recording-item");
      player.handleTrackClick(
        parseInt(item.dataset.recordingId),
        parseInt(item.dataset.index),
        state.currentViewRecordings
      );
      return;
    }
    const favBtn = target.closest(".favorite-btn");
    if (favBtn) {
      e.stopPropagation();
      toggleFavorite(parseInt(favBtn.dataset.recordingId), favBtn);
      return;
    }

    // МОДАЛКИ
    if (target.closest("#add-composer-btn")) ui.showAddComposerModal();
    if (target.closest("#add-work-btn")) ui.showAddWorkModal();
    if (target.closest("#add-composition-btn")) ui.showAddCompositionModal();
    if (target.closest(".add-recording-btn")) {
      ui.showAddRecordingModal(
        target.closest(".add-recording-btn").dataset.compositionId
      );
    }
    if (target.closest(".close-button") || target.classList.contains("modal")) {
      document
        .querySelectorAll(".modal")
        .forEach((m) => m.classList.add("hidden"));
    }

    // СОЗДАНИЕ
    const createComposerBtn = target.closest("#create-composer-btn");
    if (createComposerBtn) {
      e.preventDefault();
      const nameRu = document
        .getElementById("add-composer-name-ru")
        .value.trim();
      if (!nameRu) return ui.showNotification("Имя (RU) обязательно", "error");
      const data = {
        name_ru: nameRu,
        name:
          document.getElementById("add-composer-name-en").value.trim() || null,
        original_name:
          document.getElementById("add-composer-name-orig").value.trim() ||
          null,
        year_born:
          parseInt(document.getElementById("add-composer-born").value) || null,
        year_died:
          parseInt(document.getElementById("add-composer-died").value) || null,
        notes: document.getElementById("add-composer-bio").value,
      };
      handleCreateEntity(
        createComposerBtn,
        "/api/recordings/composers",
        data,
        "add-composer-modal",
        "Композитор создан!"
      );
      return;
    }

    const createWorkBtn = target.closest("#create-work-btn");
    if (createWorkBtn) {
      e.preventDefault();
      const cId = state.view.currentComposer?.id;
      if (!cId) return ui.showNotification("Композитор не определен", "error");
      const nameRu = document.getElementById("add-work-name-ru").value.trim();
      if (!nameRu)
        return ui.showNotification("Название (RU) обязательно", "error");
      const data = {
        name_ru: nameRu,
        name: document.getElementById("add-work-name-en").value.trim() || null,
        original_name:
          document.getElementById("add-work-name-orig").value.trim() || null,
        publication_year:
          parseInt(document.getElementById("add-work-year-start").value) ||
          null,
        publication_year_end:
          parseInt(document.getElementById("add-work-year-end").value) || null,
      };
      handleCreateEntity(
        createWorkBtn,
        `/api/recordings/composers/${cId}/works`,
        data,
        "add-work-modal",
        "Произведение создано!"
      );
      return;
    }

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
      const data = {
        title_ru: titleRu,
        title:
          document.getElementById("add-composition-title-en").value.trim() ||
          null,
        title_original:
          document.getElementById("add-composition-title-orig").value.trim() ||
          null,
        composition_year:
          parseInt(document.getElementById("add-composition-year").value) ||
          null,
        catalog_number:
          document.getElementById("add-composition-catalog").value.trim() ||
          null,
      };
      handleCreateEntity(
        createCompBtn,
        `/api/recordings/works/${wId}/compositions`,
        data,
        "add-composition-modal",
        "Часть добавлена!"
      );
      return;
    }

    const createRecBtn = target.closest("#create-recording-btn");
    if (createRecBtn) {
      e.preventDefault();
      const compId = document.getElementById(
        "add-recording-composition-id"
      ).value;
      const perf = document.getElementById("add-recording-performers").value;
      const file = document.getElementById("composition-upload-input").files[0];
      if (!file || !perf)
        return ui.showNotification("Файл и исполнитель обязательны", "error");
      const fd = new FormData();
      fd.append("performers", perf);
      if (document.getElementById("add-recording-year").value)
        fd.append(
          "recording_year",
          document.getElementById("add-recording-year").value
        );
      fd.append("file", file);
      handleCreateEntity(
        createRecBtn,
        `/api/recordings/compositions/${compId}/upload`,
        fd,
        "add-recording-modal",
        "Загружено!"
      );
      return;
    }

    if (target.closest("#logout-btn")) {
      localStorage.removeItem("access_token");
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

  document.getElementById("search-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter")
      router.navigate(`/search/${encodeURIComponent(e.target.value)}`);
  });

  document
    .getElementById("composition-upload-input")
    ?.addEventListener("change", (e) =>
      ui.updateSelectedRecordingFile(e.target.files[0])
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
  const rec = state.currentViewRecordings.find((r) => r.id === rid);
  if (!rec) return;
  m.dataset.recordingId = rid;
  const isPl = state.view.current === "playlist";

  let html = `<ul class="text-sm text-gray-700 py-1">
       <li data-action="play-next" class="px-4 py-2 hover:bg-gray-100 cursor-pointer flex gap-2"><i data-lucide="list-start" class="w-4"></i> Далее</li>
       <li data-action="add-to-queue" class="px-4 py-2 hover:bg-gray-100 cursor-pointer flex gap-2"><i data-lucide="list-plus" class="w-4"></i> В очередь</li>
       <li data-action="edit-recording" class="px-4 py-2 hover:bg-gray-100 cursor-pointer flex gap-2 border-t"><i data-lucide="edit" class="w-4"></i> Редактировать</li>`;

  if (isPl) {
    m.dataset.playlistId = state.view.playlistId;
    html += `<li data-action="remove-from-playlist" class="px-4 py-2 hover:bg-red-50 text-red-600 cursor-pointer flex gap-2"><i data-lucide="minus" class="w-4"></i> Убрать из плейлиста</li>`;
  } else {
    html += `<li data-action="delete-recording" class="px-4 py-2 hover:bg-red-50 text-red-600 cursor-pointer flex gap-2"><i data-lucide="trash-2" class="w-4"></i> Удалить файл</li>`;
  }

  html += `<li class="px-4 py-1 text-xs text-gray-400 font-bold mt-1 border-t">В плейлист</li>`;
  if (state.playlists.length) {
    state.playlists.forEach((p) => {
      if (isPl && p.id == state.view.playlistId) return;
      html += `<li data-action="add-to-playlist" data-pid="${p.id}" class="px-4 py-2 hover:bg-gray-100 cursor-pointer truncate">${p.name}</li>`;
    });
  } else
    html += `<li class="px-4 py-1 text-gray-400 italic">Нет плейлистов</li>`;

  html += `</ul>`;
  m.innerHTML = html;
  ui.showContextMenu(x, y, m);
  if (window.lucide) window.lucide.createIcons();
}

async function handleContextMenuAction(li) {
  const m = document.getElementById("context-menu");
  const act = li.dataset.action;
  const rid = parseInt(m.dataset.recordingId);
  const rec = state.currentViewRecordings.find((r) => r.id === rid);
  ui.hideContextMenu(m);
  if (!rec) return;

  if (act === "play-next") player.playNextInQueue([rec]);
  if (act === "add-to-queue") player.addToQueue([rec]);
  if (act === "edit-recording") ui.showNotification("Скоро будет", "info");

  if (act === "delete-recording") {
    if (confirm("Удалить запись навсегда?")) {
      try {
        await apiRequest(`/api/recordings/${rid}`, "DELETE");
        ui.showNotification("Удалено", "success");
        loadCurrentView();
      } catch (e) {
        ui.showNotification("Ошибка", "error");
      }
    }
  }
  if (act === "remove-from-playlist") {
    const pid = m.dataset.playlistId;
    try {
      await apiRequest(`/api/playlists/${pid}/recordings/${rid}`, "DELETE");
      ui.showNotification("Убрано", "success");
      state.currentViewRecordings = state.currentViewRecordings.filter(
        (r) => r.id !== rid
      );
      ui.renderRecordingList(
        state.currentViewRecordings,
        "Плейлист",
        0,
        {},
        state.favoriteRecordingIds
      );
    } catch (e) {
      ui.showNotification("Ошибка", "error");
    }
  }
  if (act === "add-to-playlist") {
    const pid = li.dataset.pid;
    try {
      await apiRequest(`/api/playlists/${pid}/recordings/${rid}`, "POST");
      ui.showNotification("Добавлено", "success");
    } catch (e) {
      ui.showNotification("Ошибка", "error");
    }
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
