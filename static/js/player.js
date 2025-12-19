import * as ui from "./ui.js";

function pluralize(number, forms) {
  const n = Math.abs(number) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

let currentRecordingList = [];
let currentRecordingIndex = -1;
let originalRecordingList = []; // Исходный контекст (Плейлист или Текущее произведение)

let queueNext = [];
let queueLast = [];

let currentRecordingId = null;
let isPlaying = false;
let fullQueueForUI = [];
let playedWorkIds = new Set();

let isShuffleActive = false;
let repeatMode = "none"; // 'none' | 'all' | 'one'

function playRecordingObject(recording) {
  if (!recording) return;

  const playerEl = document.getElementById("mobile-full-player");
  if (playerEl) {
    const epoch = recording.composition?.work?.composer?.epoch;
    if (epoch) {
      playerEl.setAttribute("data-epoch", epoch);
    } else {
      playerEl.removeAttribute("data-epoch");
    }
  }

  const audioPlayer = document.getElementById("audio-player");
  currentRecordingId = recording.id;
  audioPlayer.src = `/api/recordings/stream/${recording.id}`;
  audioPlayer.play().catch((error) => {
    if (error.name !== "AbortError") console.error("Playback error:", error);
  });
  ui.updatePlayerInfo(recording);
  updateIcons();
  ui.openPlayer();
  updateFullQueueAndRender();
}

export function togglePlayPause() {
  const audioPlayer = document.getElementById("audio-player");
  if (!audioPlayer || currentRecordingId === null) return;
  if (audioPlayer.paused) audioPlayer.play();
  else audioPlayer.pause();
}

// === ЛОГИКА SHUFFLE (С ПОЛНЫМ ПЕРЕСБОРОМ ОЧЕРЕДИ) ===
export function toggleShuffle(forceState = null) {
  if (forceState !== null) {
    isShuffleActive = forceState;
  } else {
    isShuffleActive = !isShuffleActive;
  }

  const currentTrack = currentRecordingList[currentRecordingIndex];
  if (!currentTrack) return;

  if (isShuffleActive) {
    // === ВКЛЮЧАЕМ SHUFFLE ===
    // Цель: Перемешать ВСЁ из оригинала, кроме текущего.
    // Текущий становится первым.

    let listToShuffle = [...originalRecordingList];

    // Убираем текущий (чтобы не дублировать)
    listToShuffle = listToShuffle.filter((r) => r.id !== currentTrack.id);

    // Тасуем
    for (let i = listToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [listToShuffle[i], listToShuffle[j]] = [
        listToShuffle[j],
        listToShuffle[i],
      ];
    }

    currentRecordingList = [currentTrack, ...listToShuffle];

    currentRecordingIndex = 0;
  } else {
    // === ВЫКЛЮЧАЕМ SHUFFLE ===

    const originIndex = originalRecordingList.findIndex(
      (r) => r.id === currentTrack.id
    );

    if (originIndex !== -1) {
      const straightFuture = originalRecordingList.slice(originIndex);

      currentRecordingList = [...straightFuture];

      currentRecordingIndex = 0;
    } else {
    }
  }

  updateShuffleIcon();
  forceUpdateQueue();
}

export function toggleRepeat() {
  if (repeatMode === "none") repeatMode = "all";
  else if (repeatMode === "all") repeatMode = "one";
  else repeatMode = "none";

  updateRepeatIcon();
}

// === PLAY NEXT (С СБРОСОМ ИСТОЧНИКА) ===
export async function playNext() {
  const audioPlayer = document.getElementById("audio-player");

  if (repeatMode === "one") {
    audioPlayer.currentTime = 0;
    audioPlayer.play();
    return;
  }

  // Queue Next (приоритет)
  if (queueNext.length > 0) {
    const nextRecording = queueNext.shift();
    currentRecordingList.splice(currentRecordingIndex + 1, 0, nextRecording);
    currentRecordingIndex++;
    playRecordingObject(currentRecordingList[currentRecordingIndex]);
    return;
  }

  // Обычный переход
  if (currentRecordingIndex < currentRecordingList.length - 1) {
    currentRecordingIndex++;
    playRecordingObject(currentRecordingList[currentRecordingIndex]);
    return;
  }

  // Queue Last
  if (queueLast.length > 0) {
    const nextRecording = queueLast.shift();
    currentRecordingList.push(nextRecording);
    currentRecordingIndex++;
    playRecordingObject(currentRecordingList[currentRecordingIndex]);
    return;
  }

  // REPEAT ALL
  if (repeatMode === "all") {
    let nextBatch = [...originalRecordingList];
    if (isShuffleActive) {
      for (let i = nextBatch.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nextBatch[i], nextBatch[j]] = [nextBatch[j], nextBatch[i]];
      }
    }
    currentRecordingList.push(...nextBatch);
    currentRecordingIndex++;
    playRecordingObject(currentRecordingList[currentRecordingIndex]);
    return;
  }

  // АВТОПЛЕЙ
  console.log("Queue finished, starting autoplay...");
  try {
    const excludeQuery = Array.from(playedWorkIds)
      .map((id) => `exclude_ids=${id}`)
      .join("&");
    const url = `/api/recordings/random-playable?${excludeQuery}`;
    const work = await window.apiRequest(url);

    if (work) {
      if (playedWorkIds.has(work.id)) playedWorkIds.clear();
      playedWorkIds.add(work.id);

      const newPlaylistNatural = work.compositions
        .flatMap((comp) =>
          comp.recordings
            .filter((r) => r.duration > 0)
            .map((rec) => ({ ...rec, composition: { ...comp, work } }))
        )
        .sort((a, b) => a.composition.sort_order - b.composition.sort_order);

      if (newPlaylistNatural.length > 0) {
        ui.showNotification(`Далее: ${work.name_ru}`, "info");

        // === ГЛАВНОЕ: СМЕНА КОНТЕКСТА ===
        originalRecordingList = [...newPlaylistNatural];

        if (isShuffleActive) {
          let shuffledPart = [...newPlaylistNatural];
          for (let i = shuffledPart.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledPart[i], shuffledPart[j]] = [
              shuffledPart[j],
              shuffledPart[i],
            ];
          }
          currentRecordingList.push(...shuffledPart);
        } else {
          currentRecordingList.push(...newPlaylistNatural);
        }

        currentRecordingIndex++;
        playRecordingObject(currentRecordingList[currentRecordingIndex]);
      }
    }
  } catch (e) {
    console.error("Autoplay failed:", e);
    if (audioPlayer) audioPlayer.pause();
    isPlaying = false;
    forceUpdateIcons();
  }
}

export function playPrev() {
  const audioPlayer = document.getElementById("audio-player");
  if (!audioPlayer) return;

  if (audioPlayer.currentTime > 3) {
    audioPlayer.currentTime = 0;
  } else {
    if (currentRecordingIndex > 0) {
      currentRecordingIndex--;
      playRecordingObject(currentRecordingList[currentRecordingIndex]);
    }
  }
}

export function handleTrackClick(
  recordingId,
  index,
  recordingList,
  keepShuffleState = false
) {
  if (!keepShuffleState) {
    // Ручной клик: Запоминаем новый оригинал и сбрасываем шаффл
    originalRecordingList = [...recordingList];
    isShuffleActive = false;
    updateShuffleIcon();
  }

  if (recordingId === currentRecordingId && !keepShuffleState) {
    togglePlayPause();
  } else {
    queueNext = [];
    queueLast = [];
    playedWorkIds.clear();

    if (!keepShuffleState) {
      currentRecordingList = [...recordingList];
    }

    currentRecordingIndex = index;
    playRecordingObject(currentRecordingList[currentRecordingIndex]);
  }
}

export function playRandom(recordingList) {
  if (!recordingList || recordingList.length === 0) return;

  // 1. Оригинал = Весь плейлист
  originalRecordingList = [...recordingList];
  isShuffleActive = true;

  // 2. Старт: Всегда первый
  const startTrack = recordingList[0];

  // 3. Остальные мешаем
  let others = recordingList.slice(1);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }

  // 4. Очередь
  currentRecordingList = [startTrack, ...others];
  currentRecordingIndex = 0;

  queueNext = [];
  queueLast = [];
  playedWorkIds.clear();

  updateShuffleIcon();
  playRecordingObject(currentRecordingList[0]);
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function updateShuffleIcon() {
  const desktopBtn = document.getElementById("shuffle-btn-desktop");
  const mobileBtn = document.getElementById("full-player-shuffle-btn");
  const colorClass = "text-cyan-600";
  const defaultClass = "text-gray-400";
  const mobileDefaultClass = "text-gray-300";

  const toggle = (btn, isMobile) => {
    if (!btn) return;
    const def = isMobile ? mobileDefaultClass : defaultClass;
    if (isShuffleActive) {
      btn.classList.add(colorClass);
      btn.classList.remove(def);
    } else {
      btn.classList.remove(colorClass);
      btn.classList.add(def);
    }
  };

  toggle(desktopBtn, false);
  toggle(mobileBtn, true);
}

function updateRepeatIcon() {
  const desktopBtn = document.getElementById("repeat-btn-desktop");
  const mobileBtn = document.getElementById("full-player-repeat-btn");

  let iconHtml = '<i data-lucide="repeat" class="w-4 h-4"></i>';
  if (repeatMode === "one")
    iconHtml = '<i data-lucide="repeat-1" class="w-4 h-4"></i>';
  let mobileIconHtml = iconHtml.replace("w-4 h-4", "w-6 h-6");

  const colorClass = "text-cyan-600";
  const defaultClass = "text-gray-400";
  const mobileDefaultClass = "text-gray-300";

  const updateBtn = (btn, html, isMobile) => {
    if (!btn) return;
    const def = isMobile ? mobileDefaultClass : defaultClass;
    btn.innerHTML = html;
    if (repeatMode !== "none") {
      btn.classList.add(colorClass);
      btn.classList.remove(def);
    } else {
      btn.classList.remove(colorClass);
      btn.classList.add(def);
    }
  };

  updateBtn(desktopBtn, iconHtml, false);
  updateBtn(mobileBtn, mobileIconHtml, true);

  if (window.lucide) window.lucide.createIcons();
}

export function addToQueue(recordings) {
  queueLast.push(...recordings);
  updateFullQueueAndRender();
  const count = recordings.length;
  const notificationText = pluralize(count, [
    `${count} запись добавлена`,
    `${count} записи добавлены`,
    `${count} записей добавлено`,
  ]);
  ui.showNotification(`${notificationText} в очередь`, "success");
  if (currentRecordingId === null) playNext();
}

export function playNextInQueue(recordings) {
  queueNext.unshift(...recordings);
  updateFullQueueAndRender();
  const count = recordings.length;
  const notificationText = pluralize(count, [
    `${count} запись сыграет`,
    `${count} записи сыграют`,
    `${count} записей сыграют`,
  ]);
  ui.showNotification(`${notificationText} следующими`, "success");
  if (currentRecordingId === null) playNext();
}

export function clearFullQueue(stopPlayer = true) {
  const playerEl = document.getElementById("mobile-full-player");
  if (playerEl) playerEl.removeAttribute("data-epoch");

  queueNext = [];
  queueLast = [];

  if (stopPlayer) {
    currentRecordingList = [];
    currentRecordingIndex = -1;
    const audioPlayer = document.getElementById("audio-player");
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.src = "";
    }
    currentRecordingId = null;
    isPlaying = false;
    ui.updatePlayerInfo(null);

    [
      "current-time-desktop",
      "total-time-desktop",
      "full-player-current-time",
      "full-player-duration",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "0:00";
    });
    ["mini-progress-bar", "progress-fill-desktop"].forEach((id) => {
      const fill = document.getElementById(id);
      if (fill) fill.style.width = "0%";
    });
    ["progress-bar-desktop", "full-player-seekbar"].forEach((id) => {
      const range = document.getElementById(id);
      if (range) range.value = 0;
    });
    const fullFill = document.getElementById("full-player-fill");
    if (fullFill) fullFill.style.width = "0%";
  }
  updateFullQueueAndRender();
  updateIcons();
}

export function removeFromQueueByIndex(index) {
  if (index < 0 || index >= fullQueueForUI.length) return;
  const queueNextLength = queueNext.length;
  const remainingInList =
    currentRecordingIndex > -1
      ? currentRecordingList.slice(currentRecordingIndex + 1)
      : [];
  const remainingLength = remainingInList.length;

  if (index < queueNextLength) {
    queueNext.splice(index, 1);
  } else if (index < queueNextLength + remainingLength) {
    const listIndexToRemove =
      index - queueNextLength + currentRecordingIndex + 1;
    currentRecordingList.splice(listIndexToRemove, 1);
  } else {
    const lastIndexToRemove = index - queueNextLength - remainingLength;
    queueLast.splice(lastIndexToRemove, 1);
  }
  updateFullQueueAndRender();
}

function updateFullQueueAndRender() {
  const nowPlaying = currentRecordingList[currentRecordingIndex];
  const remainingInList =
    currentRecordingIndex > -1
      ? currentRecordingList.slice(currentRecordingIndex + 1)
      : [];
  fullQueueForUI = [...queueNext, ...remainingInList, ...queueLast];
  ui.renderQueue(nowPlaying, fullQueueForUI);
}

export function initPlayer() {
  const audioPlayer = document.getElementById("audio-player");
  const controls = [
    {
      play: "play-pause-btn-mobile",
      prev: "prev-btn-mobile",
      next: "next-btn-mobile",
      progress: "progress-bar-mobile",
    },
    {
      play: "play-pause-btn-desktop",
      prev: "prev-btn-desktop",
      next: "next-btn-desktop",
      progress: "progress-bar-desktop",
    },
  ];

  controls.forEach((ids) => {
    const playBtn = document.getElementById(ids.play);
    const prevBtn = document.getElementById(ids.prev);
    const nextBtn = document.getElementById(ids.next);
    const progress = document.getElementById(ids.progress);
    if (playBtn) playBtn.addEventListener("click", togglePlayPause);
    if (prevBtn) prevBtn.addEventListener("click", playPrev);
    if (nextBtn) nextBtn.addEventListener("click", playNext);
    if (progress) progress.addEventListener("input", seek);
  });

  const queueMobile = document.getElementById("queue-btn-mobile");
  const queueDesktop = document.getElementById("queue-btn-desktop");
  const sidebar = document.getElementById("queue-sidebar");
  const toggleQueue = () => sidebar.classList.toggle("translate-x-full");
  if (queueMobile) queueMobile.addEventListener("click", toggleQueue);
  if (queueDesktop) queueDesktop.addEventListener("click", toggleQueue);

  if (audioPlayer) {
    audioPlayer.addEventListener("timeupdate", updateProgress);
    audioPlayer.addEventListener("loadedmetadata", updateTimeDisplay);
    audioPlayer.addEventListener("ended", playNext);
    audioPlayer.addEventListener("play", () => {
      isPlaying = true;
      updateIcons();
    });
    audioPlayer.addEventListener("pause", () => {
      isPlaying = false;
      updateIcons();
    });
  }

  const volumeSlider = document.getElementById("volume-slider");
  const volumeFill = document.getElementById("volume-fill");
  const muteBtn = document.getElementById("mute-btn");
  let lastVolume = 1;

  if (volumeSlider && audioPlayer) {
    audioPlayer.volume = 1;
    volumeSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      audioPlayer.volume = val;
      if (volumeFill) volumeFill.style.width = `${val * 100}%`;
      updateVolumeIcon(val);
      if (val > 0) lastVolume = val;
    });
  }

  if (muteBtn && audioPlayer) {
    muteBtn.addEventListener("click", () => {
      if (audioPlayer.volume > 0) {
        audioPlayer.volume = 0;
        volumeSlider.value = 0;
        if (volumeFill) volumeFill.style.width = "0%";
      } else {
        audioPlayer.volume = lastVolume || 1;
        volumeSlider.value = lastVolume || 1;
        if (volumeFill) volumeFill.style.width = `${(lastVolume || 1) * 100}%`;
      }
      updateVolumeIcon(audioPlayer.volume);
    });
  }
}

export function hasActiveTrack() {
  return currentRecordingId !== null;
}
export function forceUpdateIcons() {
  updateIcons();
}
export function forceUpdateQueue() {
  updateFullQueueAndRender();
}

function updateIcons() {
  ui.updatePlayPauseIcon(isPlaying);
  ui.updateTrackRowIcon(currentRecordingId, isPlaying);
  document.querySelectorAll(".recording-item").forEach((item) => {
    const isThisItemPlaying =
      isPlaying &&
      parseInt(item.dataset.recordingId, 10) === currentRecordingId;
    item.classList.toggle("bg-cyan-50", isThisItemPlaying);
  });
}

function updateProgress() {
  const audioPlayer = document.getElementById("audio-player");
  if (!audioPlayer) return;
  const { duration, currentTime } = audioPlayer;
  const percent = duration ? (currentTime / duration) * 100 : 0;
  const timeStr = formatTime(currentTime);

  const mobBar = document.getElementById("progress-bar-mobile");
  const mobTime = document.getElementById("current-time-mobile");
  const miniProgress = document.getElementById("mini-progress-bar");
  if (mobBar) mobBar.value = percent;
  if (mobTime) mobTime.textContent = timeStr;
  if (miniProgress) miniProgress.style.width = `${percent}%`;

  const deskBar = document.getElementById("progress-bar-desktop");
  const deskFill = document.getElementById("progress-fill-desktop");
  const deskTime = document.getElementById("current-time-desktop");
  if (deskBar) deskBar.value = percent;
  if (deskFill) deskFill.style.width = `${percent}%`;
  if (deskTime) deskTime.textContent = timeStr;

  const fullSeek = document.getElementById("full-player-seekbar");
  const fullFill = document.getElementById("full-player-fill");
  const fullThumb = document.getElementById("full-player-thumb");
  const fullCurTime = document.getElementById("full-player-current-time");
  if (fullSeek) fullSeek.value = percent;
  if (fullFill) fullFill.style.width = `${percent}%`;
  if (fullThumb) fullThumb.style.left = `${percent}%`;
  if (fullCurTime) fullCurTime.textContent = timeStr;
}

function updateTimeDisplay() {
  const audioPlayer = document.getElementById("audio-player");
  if (!audioPlayer) return;
  const timeStr = formatTime(audioPlayer.duration);
  const mobileTimeEl = document.getElementById("total-time-mobile");
  if (mobileTimeEl) mobileTimeEl.textContent = timeStr;
  const desktopTimeEl = document.getElementById("total-time-desktop");
  if (desktopTimeEl) desktopTimeEl.textContent = timeStr;
  const fullDur = document.getElementById("full-player-duration");
  if (fullDur) fullDur.textContent = timeStr;
}

export function seekTo(percent) {
  const audioPlayer = document.getElementById("audio-player");
  if (!audioPlayer || isNaN(audioPlayer.duration)) return;
  const seekTime = (percent / 100) * audioPlayer.duration;
  audioPlayer.currentTime = seekTime;
}

function seek(e) {
  const percent = e.target.value;
  seekTo(percent);
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds === null) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function updateVolumeIcon(vol) {
  const icon = document.getElementById("mute-btn")?.querySelector("svg");
  if (!icon) return;
  const btn = document.getElementById("mute-btn");
  if (vol === 0)
    btn.innerHTML = '<i data-lucide="volume-x" class="w-5 h-5"></i>';
  else if (vol < 0.5)
    btn.innerHTML = '<i data-lucide="volume-1" class="w-5 h-5"></i>';
  else btn.innerHTML = '<i data-lucide="volume-2" class="w-5 h-5"></i>';
  if (window.lucide) window.lucide.createIcons();
}

export function getNeighboringTracks() {
  if (currentRecordingIndex === -1 || currentRecordingList.length === 0) {
    return { prev: null, current: null, next: null };
  }
  const current = currentRecordingList[currentRecordingIndex];
  const prev =
    currentRecordingIndex > 0
      ? currentRecordingList[currentRecordingIndex - 1]
      : null;
  const next =
    currentRecordingIndex < currentRecordingList.length - 1
      ? currentRecordingList[currentRecordingIndex + 1]
      : null;
  return { prev, current, next };
}
