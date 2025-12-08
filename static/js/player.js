// static/js/player.js

import * as ui from "./ui.js";

// === ОСНОВНЫЕ ПЕРЕМЕННЫЕ ===
let currentRecordingList = [];
let currentRecordingIndex = -1;
let queueNext = [];
let queueLast = [];
let currentRecordingId = null;
let isPlaying = false;
let fullQueueForUI = [];
let playedWorkIds = new Set();

// === ОСНОВНЫЕ ФУНКЦИИ УПРАВЛЕНИЯ ПЛЕЕРОМ ===

function playRecordingObject(recording) {
  if (!recording) return;
  const audioPlayer = document.getElementById("audio-player");

  currentRecordingId = recording.id;
  audioPlayer.src = `/api/recordings/stream/${recording.id}`;
  audioPlayer.play();

  // УДАЛЕНО: audioPlayer.ontimeupdate = ... (перенесено в единый обработчик updateProgress)

  ui.updatePlayerInfo(recording);
  updateIcons();
  ui.openPlayer();
  updateFullQueueAndRender();
}

function togglePlayPause() {
  const audioPlayer = document.getElementById("audio-player");
  if (!audioPlayer || currentRecordingId === null) return;
  if (audioPlayer.paused) audioPlayer.play();
  else audioPlayer.pause();
}

async function playNext() {
  // 1. ПРИОРИТЕТ: Треки "Играть следующим" (Queue Next)
  // Если они есть, мы ВНЕДРЯЕМ их в текущий список сразу после текущей позиции.
  if (queueNext.length > 0) {
    const nextRecording = queueNext.shift();

    if (currentRecordingIndex === -1) {
        // Если список был пуст
        currentRecordingList = [nextRecording];
        currentRecordingIndex = 0;
    } else {
        // Вставляем трек в currentRecordingList сразу после текущего (index + 1)
        // splice(index, deleteCount, item)
        currentRecordingList.splice(currentRecordingIndex + 1, 0, nextRecording);
        currentRecordingIndex++;
    }

    playRecordingObject(currentRecordingList[currentRecordingIndex]);
    return;
  }

  // 2. ПРИОРИТЕТ: Продолжаем играть текущий список (Основное произведение)
  if (currentRecordingIndex < currentRecordingList.length - 1) {
    currentRecordingIndex++;
    playRecordingObject(currentRecordingList[currentRecordingIndex]);
    return;
  }

  // 3. ПРИОРИТЕТ: Треки "Добавить в очередь" (Queue Last)
  // Если основной список кончился, берем из хвоста очереди и ДОБАВЛЯЕМ в текущий список.
  if (queueLast.length > 0) {
    const nextRecording = queueLast.shift();

    // Добавляем в конец текущего списка истории
    currentRecordingList.push(nextRecording);
    currentRecordingIndex++;

    playRecordingObject(currentRecordingList[currentRecordingIndex]);
    return;
  }

  // 4. ПРИОРИТЕТ: АВТОПЛЕЙ ("Радио")
  console.log("Queue finished, starting autoplay...");
  try {
    const excludeQuery = Array.from(playedWorkIds).map(id => `exclude_ids=${id}`).join('&');
    const url = `/api/recordings/random-playable?${excludeQuery}`;

    const work = await window.apiRequest(url);

    if (work) {
        if (playedWorkIds.has(work.id)) {
            playedWorkIds.clear();
        }
        playedWorkIds.add(work.id);

        const newPlaylist = work.compositions
            .flatMap(comp => comp.recordings
                .filter(r => r.duration > 0)
                .map(rec => ({ ...rec, composition: { ...comp, work } })))
            .sort((a, b) => a.composition.sort_order - b.composition.sort_order);

        if (newPlaylist.length > 0) {
            ui.showNotification(`Далее: ${work.name_ru}`, "info");

            // Здесь мы заменяем список, так как это логическое начало нового "альбома"
            currentRecordingList = newPlaylist;
            currentRecordingIndex = 0;
            playRecordingObject(currentRecordingList[currentRecordingIndex]);
        }
    }
  } catch (e) {
    console.error("Autoplay failed:", e);
    // Останавливаем плеер, но не очищаем UI, чтобы было видно, что играло последним
    const audioPlayer = document.getElementById("audio-player");
    if(audioPlayer) audioPlayer.pause();
    isPlaying = false;
    forceUpdateIcons();
  }
}

function playPrev() {
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

// === EXPORTED FUNCTIONS ===

export function handleTrackClick(recordingId, index, recordingList) {
  if (recordingId === currentRecordingId) {
    togglePlayPause();
  } else {
    queueNext = [];
    queueLast = [];
    playedWorkIds.clear();
    currentRecordingList = [...recordingList];
    currentRecordingIndex = index;
    playRecordingObject(currentRecordingList[currentRecordingIndex]);
  }
}

export function addToQueue(recordings) {
  queueLast.push(...recordings);
  updateFullQueueAndRender();
  ui.showNotification(`${recordings.length} трек(ов) добавлено в очередь`, "success");
  if (currentRecordingId === null) playNext();
}

export function playNextInQueue(recordings) {
  queueNext.unshift(...recordings);
  updateFullQueueAndRender();
  ui.showNotification(`${recordings.length} трек(ов) сыграют следующими`, "success");
  if (currentRecordingId === null) playNext();
}

export function clearFullQueue(stopPlayer = true) {
    queueNext = [];
    queueLast = [];
    currentRecordingList = [];
    currentRecordingIndex = -1;

    if (stopPlayer) {
        const audioPlayer = document.getElementById("audio-player");
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.src = "";
        }
        currentRecordingId = null;
        isPlaying = false;
        ui.updatePlayerInfo(null);

        // Сброс прогресс бара
        const progressBar = document.getElementById("progress-bar");
        if(progressBar) {
            progressBar.value = 0;
            progressBar.style.background = '#e2e8f0'; // Сброс цвета
        }
        document.getElementById("current-time").textContent = "0:00";
        document.getElementById("total-time").textContent = "0:00";
    }
    updateFullQueueAndRender();
    updateIcons();
}

export function removeFromQueueByIndex(index) {
    if (index < 0 || index >= fullQueueForUI.length) return;
    const queueNextLength = queueNext.length;
    const remainingInList = currentRecordingIndex > -1 ? currentRecordingList.slice(currentRecordingIndex + 1) : [];
    const remainingLength = remainingInList.length;

    if (index < queueNextLength) {
        queueNext.splice(index, 1);
    } else if (index < queueNextLength + remainingLength) {
        const listIndexToRemove = (index - queueNextLength) + currentRecordingIndex + 1;
        currentRecordingList.splice(listIndexToRemove, 1);
    } else {
        const lastIndexToRemove = index - queueNextLength - remainingLength;
        queueLast.splice(lastIndexToRemove, 1);
    }
    updateFullQueueAndRender();
}

function updateFullQueueAndRender() {
    const nowPlaying = currentRecordingList[currentRecordingIndex];
    const remainingInList = currentRecordingIndex > -1 ? currentRecordingList.slice(currentRecordingIndex + 1) : [];
    fullQueueForUI = [...queueNext, ...remainingInList, ...queueLast];
    ui.renderQueue(nowPlaying, fullQueueForUI);
}

// === ИНИЦИАЛИЗАЦИЯ ===

export function initPlayer() {
  const audioPlayer = document.getElementById("audio-player");
  const playPauseBtn = document.getElementById("play-pause-btn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const progressBar = document.getElementById("progress-bar");

  if (playPauseBtn) playPauseBtn.addEventListener("click", togglePlayPause);
  if (nextBtn) nextBtn.addEventListener("click", playNext);
  if (prevBtn) prevBtn.addEventListener("click", playPrev);

  if (audioPlayer) {
    audioPlayer.addEventListener("timeupdate", updateProgress); // Обновление прогресса
    audioPlayer.addEventListener("loadedmetadata", updateTimeDisplay);
    audioPlayer.addEventListener("ended", playNext);
    audioPlayer.addEventListener("play", () => { isPlaying = true; updateIcons(); });
    audioPlayer.addEventListener("pause", () => { isPlaying = false; updateIcons(); });
  }

  if (progressBar) progressBar.addEventListener("input", seek);
}

export function hasActiveTrack() { return currentRecordingId !== null; }
export function forceUpdateIcons() { updateIcons(); }
export function forceUpdateQueue() { updateFullQueueAndRender(); }

function updateIcons() {
  ui.updatePlayPauseIcon(isPlaying);
  ui.updateTrackRowIcon(currentRecordingId, isPlaying);
  document.querySelectorAll(".recording-item").forEach(item => {
      const isThisItemPlaying = (isPlaying && parseInt(item.dataset.recordingId, 10) === currentRecordingId);
      item.classList.toggle("bg-cyan-50", isThisItemPlaying);
  });
}

// === ЛОГИКА ПРОГРЕСС БАРА ===

function updateProgress() {
  const audioPlayer = document.getElementById("audio-player");
  const progressBar = document.getElementById("progress-bar");
  const currentTimeEl = document.getElementById("current-time");

  if (!audioPlayer || !progressBar || !currentTimeEl) return;

  const { duration, currentTime } = audioPlayer;

  if (duration) {
    // 1. Обновляем значение ползунка
    const percent = (currentTime / duration) * 100;
    progressBar.value = percent;

    // 2. Визуальный трюк для закрашивания левой части (Gradient)
    // #06b6d4 - это цвет cyan-500, #e2e8f0 - серый фон
    progressBar.style.background = `linear-gradient(to right, #06b6d4 ${percent}%, #e2e8f0 ${percent}%)`;

    // 3. Обновляем текст времени
    currentTimeEl.textContent = formatTime(currentTime);
  }
}

function updateTimeDisplay() {
  const audioPlayer = document.getElementById("audio-player");
  const totalTimeEl = document.getElementById("total-time");
  if (!audioPlayer || !totalTimeEl) return;
  totalTimeEl.textContent = formatTime(audioPlayer.duration);
}

function seek() {
  const audioPlayer = document.getElementById("audio-player");
  const progressBar = document.getElementById("progress-bar");
  if (!audioPlayer || !progressBar || isNaN(audioPlayer.duration)) return;

  const { duration } = audioPlayer;
  const seekTime = (progressBar.value / 100) * duration;

  audioPlayer.currentTime = seekTime;

  // Обновляем градиент сразу при перетаскивании (для плавности)
  const percent = progressBar.value;
  progressBar.style.background = `linear-gradient(to right, #06b6d4 ${percent}%, #e2e8f0 ${percent}%)`;
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds === null) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}