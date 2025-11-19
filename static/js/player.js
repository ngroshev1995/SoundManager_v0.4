import * as ui from "./ui.js";

let currentRecordingList = []; // Раньше: currentCompositionList
let currentRecordingIndex = -1; // Раньше: currentCompositionIndex

let currentRecordingId = null; // Раньше: currentCompositionId
let isPlaying = false;
export let playQueue = [];

/**
 * Инициализирует плеер и назначает обработчики событий элементам управления.
 */
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
    audioPlayer.addEventListener("play", () => {
      isPlaying = true;
      updateIcons();
    });
    audioPlayer.addEventListener("pause", () => {
      isPlaying = false;
      updateIcons();
    });
  }

  if (progressBar) progressBar.addEventListener("input", seek);
}

/**
 * Добавляет массив записей в конец очереди воспроизведения.
 * @param {Array<Object>} recordings - Массив объектов записей.
 */
export function addToQueue(recordings) {
  playQueue.push(...recordings);
  ui.showNotification(
    `${recordings.length} ${
      recordings.length > 1 ? "записей добавлены" : "запись добавлена"
    } в очередь.`,
    "success"
  );
}

/**
 * Добавляет массив записей в начало очереди (для воспроизведения следующими).
 * @param {Array<Object>} recordings - Массив объектов записей.
 */
export function playNextInQueue(recordings) {
  playQueue.unshift(...recordings);
  ui.showNotification(
    `${recordings.length} ${
      recordings.length > 1 ? "записи" : "запись"
    } будут проиграны следующими.`,
    "success"
  );

  const audioPlayer = document.getElementById("audio-player");
  // Если плеер стоит на паузе и ничего не играет, запускаем воспроизведение из очереди
  if (audioPlayer.paused && currentRecordingId === null) {
    playNext();
  }
}

/**
 * Обрабатывает клик по треку в списке.
 * Если трек уже играет - ставит на паузу. Если другой - начинает воспроизведение.
 * @param {number} recordingId - ID записи, по которой кликнули.
 * @param {number} index - Индекс записи в текущем списке.
 * @param {Array<Object>} recordingList - Текущий отображаемый список записей.
 */
export function handleTrackClick(recordingId, index, recordingList) {
  if (recordingId === currentRecordingId) {
    togglePlayPause();
  } else {
    playQueue = []; // При выборе нового трека из списка, очередь очищается
    currentRecordingList = [...recordingList];
    currentRecordingIndex = index;
    playRecordingObject(currentRecordingList[currentRecordingIndex]);
  }
}

/**
 * Воспроизводит конкретный объект записи.
 * @param {Object} recording - Объект записи для воспроизведения.
 */
function playRecordingObject(recording) {
  if (!recording) return;
  const audioPlayer = document.getElementById("audio-player");

  currentRecordingId = recording.id;
  audioPlayer.src = `/api/recordings/stream/${recording.id}`; // URL изменен
  audioPlayer.play();

  ui.updatePlayerInfo(recording);
  updateIcons();

  // Обновляем текущий индекс, если он изменился (например, при переходе из очереди)
  const indexInList = currentRecordingList.findIndex(
    (r) => r.id === recording.id
  );
  if (indexInList !== -1) {
    currentRecordingIndex = indexInList;
  }
}

/**
 * Переключает состояние воспроизведения/паузы для текущего трека.
 */
function togglePlayPause() {
  const audioPlayer = document.getElementById("audio-player");
  if (!audioPlayer || currentRecordingId === null) return;

  if (audioPlayer.paused) {
    audioPlayer.play();
  } else {
    audioPlayer.pause();
  }
}

/**
 * Воспроизводит следующий трек.
 * Сначала проверяет очередь, затем переходит к следующему треку в текущем списке.
 */
function playNext() {
  // Приоритет у очереди
  if (playQueue.length > 0) {
    const nextRecordingFromQueue = playQueue.shift();
    // ui.renderQueue(playQueue); // Обновляем UI очереди, если она видима
    playRecordingObject(nextRecordingFromQueue);
    return;
  }

  if (currentRecordingList.length === 0) return;
  const newIndex = (currentRecordingIndex + 1) % currentRecordingList.length;
  playRecordingObject(currentRecordingList[newIndex]);
}

/**
 * Воспроизводит предыдущий трек.
 * Если текущий трек играет дольше 3 секунд, он начинается заново.
 */
function playPrev() {
  const audioPlayer = document.getElementById("audio-player");
  if (!audioPlayer) return;

  if (audioPlayer.currentTime > 3) {
    audioPlayer.currentTime = 0;
  } else {
    if (currentRecordingList.length === 0) return;
    const newIndex =
      (currentRecordingIndex - 1 + currentRecordingList.length) %
      currentRecordingList.length;
    playRecordingObject(currentRecordingList[newIndex]);
  }
}

/**
 * Обновляет иконки воспроизведения/паузы в плеере и в списке треков.
 */
function updateIcons() {
  ui.updatePlayPauseIcon(isPlaying);

  // Просто добавляем/убираем класс, остальное сделает CSS
  document.querySelectorAll(".recording-item, .recording-item-minimal").forEach(item => {
      const isThisItemPlaying = (isPlaying && parseInt(item.dataset.recordingId, 10) === currentRecordingId);
      item.classList.toggle("playing", isThisItemPlaying);
  });
}

/**
 * Обновляет полосу прогресса и отображение текущего времени.
 */
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

/**
 * Обновляет отображение общего времени трека после загрузки метаданных.
 */
function updateTimeDisplay() {
  const audioPlayer = document.getElementById("audio-player");
  const totalTimeEl = document.getElementById("total-time");
  if (!audioPlayer || !totalTimeEl) return;
  totalTimeEl.textContent = formatTime(audioPlayer.duration);
}

/**
 * Обрабатывает перемотку трека пользователем.
 */
function seek() {
  const audioPlayer = document.getElementById("audio-player");
  const progressBar = document.getElementById("progress-bar");
  if (!audioPlayer || !progressBar || isNaN(audioPlayer.duration)) return;

  const { duration } = audioPlayer;
  audioPlayer.currentTime = (progressBar.value / 100) * duration;
}

/**
 * Вспомогательная функция для форматирования времени.
 * @param {number} seconds - Время в секундах.
 * @returns {string} Время в формате "M:SS".
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds === null) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
