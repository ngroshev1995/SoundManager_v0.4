// static/js/player.js

import * as ui from "./ui.js";

// === ОСНОВНЫЕ ПЕРЕМЕННЫЕ ===
let currentRecordingList = []; // Основной плейлист (например, из произведения)
let currentRecordingIndex = -1;  // Индекс текущего трека в `currentRecordingList`

let queueNext = []; // Треки для "Играть следующим"
let queueLast = []; // Треки для "Добавить в очередь"

let currentRecordingId = null; // ID трека, который играет сейчас
let isPlaying = false;
let fullQueueForUI = []; // Единый массив для отрисовки в UI
let playedWorkIds = new Set();

// === ОСНОВНЫЕ ФУНКЦИИ УПРАВЛЕНИЯ ПЛЕЕРОМ ===

/**
 * Главная функция запуска трека. 
 * @param {object} recording - Полный объект записи для воспроизведения.
 */
function playRecordingObject(recording) {
  if (!recording) {
    console.error("playRecordingObject called with null recording");
    return;
  }
  const audioPlayer = document.getElementById("audio-player");
  
  currentRecordingId = recording.id;
  audioPlayer.src = `/api/recordings/stream/${recording.id}`;
  audioPlayer.play();

  ui.updatePlayerInfo(recording);
  updateIcons();
  ui.openPlayer();
  updateFullQueueAndRender(); // Перерисовываем очередь с новым "текущим" треком
}

/**
 * Переключает Play/Pause
 */
function togglePlayPause() {
  const audioPlayer = document.getElementById("audio-player");
  if (!audioPlayer || currentRecordingId === null) return;
  if (audioPlayer.paused) audioPlayer.play();
  else audioPlayer.pause();
}

/**
 * Основная логика перехода к следующему треку.
 */
async function playNext() {
  // Приоритет 1: треки "Играть следующим"
  if (queueNext.length > 0) {
    const nextRecording = queueNext.shift();
    // Этот трек становится "основным"
    currentRecordingList = [nextRecording];
    currentRecordingIndex = 0;
    playRecordingObject(nextRecording);
    return;
  }

  // Приоритет 2: треки из основного плейлиста
  if (currentRecordingIndex < currentRecordingList.length - 1) {
    currentRecordingIndex++;
    playRecordingObject(currentRecordingList[currentRecordingIndex]);
    return;
  }

  // Приоритет 3: треки "Добавить в очередь"
  if (queueLast.length > 0) {
    const nextRecording = queueLast.shift();
    // Этот трек становится "основным"
    currentRecordingList = [nextRecording];
    currentRecordingIndex = 0;
    playRecordingObject(nextRecording);
    return;
  }

  // Приоритет 4: АВТОПЛЕЙ ("Радио")
  console.log("Queue finished, starting autoplay...");
  try {
    // Собираем ID для исключения в строку, понятную FastAPI
    const excludeQuery = Array.from(playedWorkIds).map(id => `exclude_ids=${id}`).join('&');
    const url = `/api/recordings/random-playable?${excludeQuery}`;

    const work = await window.apiRequest(url);

    // Если сервер вернул произведение (даже если оно уже было, потому что других нет)
    if (work) {
        // Если это произведение уже было, значит, мы начали круг заново, очищаем историю
        if (playedWorkIds.has(work.id)) {
            console.log("Autoplay cycle finished. Restarting history.");
            playedWorkIds.clear();
        }

        // Добавляем ID нового произведения в историю
        playedWorkIds.add(work.id);

        const newPlaylist = work.compositions
            .flatMap(comp => comp.recordings
                .filter(r => r.duration > 0)
                .map(rec => ({ ...rec, composition: { ...comp, work } })))
            .sort((a, b) => a.composition.sort_order - b.composition.sort_order);

        if (newPlaylist.length > 0) {
            ui.showNotification(`Далее: ${work.name_ru}`, "info");
            currentRecordingList = newPlaylist;
            currentRecordingIndex = 0;
            playRecordingObject(currentRecordingList[currentRecordingIndex]);
        }
    }
  } catch (e) {
    console.error("Autoplay failed:", e);
    clearFullQueue(false);
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


// === ФУНКЦИИ УПРАВЛЕНИЯ ОЧЕРЕДЬЮ ===

/**
 * Обрабатывает клик по треку. Запускает новый плейлист.
 */
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

/**
 * Добавляет треки в КОНЕЦ очереди.
 */
export function addToQueue(recordings) {
  queueLast.push(...recordings);
  updateFullQueueAndRender();
  ui.showNotification(`${recordings.length} ${recordings.length > 1 ? "треков добавлены" : "трек добавлен"} в конец очереди.`, "success");
  
  // РЕШЕНИЕ ПРОБЛЕМЫ 3: Если плеер был пуст, запускаем воспроизведение
  if (currentRecordingId === null) {
      playNext();
  }
}

/**
 * Добавляет треки в НАЧАЛО очереди ("Играть следующим").
 */
export function playNextInQueue(recordings) {
  queueNext.unshift(...recordings);
  updateFullQueueAndRender();
  ui.showNotification(`${recordings.length} ${recordings.length > 1 ? "трека" : "трек"} будут сыграны следующими.`, "success");
  
  // РЕШЕНИЕ ПРОБЛЕМЫ 1 и 2: Если плеер был пуст, запускаем воспроизведение
  if (currentRecordingId === null) {
      playNext();
  }
}

/**
 * Полностью очищает все очереди и останавливает плеер.
 */
export function clearFullQueue(stopPlayer = true) {
    console.log("Clearing full queue..."); // Добавим лог для отладки
    queueNext = [];
    queueLast = [];
    currentRecordingList = [];
    currentRecordingIndex = -1;

    if (stopPlayer) {
        const audioPlayer = document.getElementById("audio-player");
        if (audioPlayer) {
            if (!audioPlayer.paused) {
                audioPlayer.pause();
            }
            audioPlayer.src = ""; // Сбрасываем источник в любом случае
        }
        currentRecordingId = null; // Сбрасываем ID
        isPlaying = false; // Устанавливаем флаг проигрывания в false

        // Очищаем информацию в самом плеере
        ui.updatePlayerInfo(null);

        // Сбрасываем полосу прогресса
        const progressBar = document.getElementById("progress-bar");
        const currentTimeEl = document.getElementById("current-time");
        const totalTimeEl = document.getElementById("total-time");
        if(progressBar) progressBar.value = 0;
        if(currentTimeEl) currentTimeEl.textContent = "0:00";
        if(totalTimeEl) totalTimeEl.textContent = "0:00";
    }

    updateFullQueueAndRender(); // Перерисовываем (теперь пустую) очередь
    updateIcons(); // <-- ВОТ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: ПРИНУДИТЕЛЬНО ОБНОВЛЯЕМ ВСЕ ИКОНКИ
}

/**
 * Удаляет один трек из очереди по его индексу в UI.
 */
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


// === ВСПОМОГАТЕЛЬНЫЕ И UI ФУНКЦИИ ===

/**
 * Собирает единый массив для отображения и вызывает отрисовку.
 */
function updateFullQueueAndRender() {
    const nowPlaying = currentRecordingList[currentRecordingIndex];
    const remainingInList = currentRecordingIndex > -1 ? currentRecordingList.slice(currentRecordingIndex + 1) : [];
    
    fullQueueForUI = [
        ...queueNext,
        ...remainingInList,
        ...queueLast
    ];
    
    ui.renderQueue(nowPlaying, fullQueueForUI);
}

// Функции ниже остаются без изменений, просто копируем их
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
    audioPlayer.addEventListener("timeupdate", updateProgress);
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

function updateProgress() {
  const audioPlayer = document.getElementById("audio-player");
  const progressBar = document.getElementById("progress-bar");
  const currentTimeEl = document.getElementById("current-time");
  if (!audioPlayer || !progressBar || !currentTimeEl) return;
  const { duration, currentTime } = audioPlayer;
  if (duration) {
    progressBar.value = (currentTime / duration) * 100;
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
  audioPlayer.currentTime = (progressBar.value / 100) * duration;
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds === null) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}