import * as ui from "./ui.js";

let currentRecordingList = [];
let currentRecordingIndex = -1;
let queueNext = [];
let queueLast = [];
let currentRecordingId = null;
let isPlaying = false;
let fullQueueForUI = [];
let playedWorkIds = new Set();


function playRecordingObject(recording) {
  if (!recording) return;
  const audioPlayer = document.getElementById("audio-player");

  currentRecordingId = recording.id;
  audioPlayer.src = `/api/recordings/stream/${recording.id}`;
  audioPlayer.play();
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
  if (queueNext.length > 0) {
    const nextRecording = queueNext.shift();

    if (currentRecordingIndex === -1) {
        currentRecordingList = [nextRecording];
        currentRecordingIndex = 0;
    } else {
        currentRecordingList.splice(currentRecordingIndex + 1, 0, nextRecording);
        currentRecordingIndex++;
    }

    playRecordingObject(currentRecordingList[currentRecordingIndex]);
    return;
  }

  if (currentRecordingIndex < currentRecordingList.length - 1) {
    currentRecordingIndex++;
    playRecordingObject(currentRecordingList[currentRecordingIndex]);
    return;
  }

  if (queueLast.length > 0) {
    const nextRecording = queueLast.shift();

    currentRecordingList.push(nextRecording);
    currentRecordingIndex++;

    playRecordingObject(currentRecordingList[currentRecordingIndex]);
    return;
  }

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

            currentRecordingList = newPlaylist;
            currentRecordingIndex = 0;
            playRecordingObject(currentRecordingList[currentRecordingIndex]);
        }
    }
  } catch (e) {
    console.error("Autoplay failed:", e);
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

        const timeElements = [
            'current-time-mobile', 'total-time-mobile',
            'current-time-desktop', 'total-time-desktop'
        ];

        timeElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = "0:00";
        });

        ['progress-bar-mobile', 'progress-bar-desktop'].forEach(id => {
            const bar = document.getElementById(id);
            if(bar) {
                bar.value = 0;
                bar.style.background = '';
            }
        });

        ['progress-fill-mobile', 'progress-fill-desktop'].forEach(id => {
            const fill = document.getElementById(id);
            if(fill) fill.style.width = '0%';
        });
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

export function initPlayer() {
  const audioPlayer = document.getElementById("audio-player");

  const controls = [
      { play: 'play-pause-btn-mobile', prev: 'prev-btn-mobile', next: 'next-btn-mobile', progress: 'progress-bar-mobile' },
      { play: 'play-pause-btn-desktop', prev: 'prev-btn-desktop', next: 'next-btn-desktop', progress: 'progress-bar-desktop' }
  ];

  controls.forEach(ids => {
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

  const toggleQueue = () => {
      sidebar.classList.toggle("translate-x-full");
  };

  if (queueMobile) queueMobile.addEventListener("click", toggleQueue);
  if (queueDesktop) queueDesktop.addEventListener("click", toggleQueue);


  if (audioPlayer) {
    audioPlayer.addEventListener("timeupdate", updateProgress);
    audioPlayer.addEventListener("loadedmetadata", updateTimeDisplay);
    audioPlayer.addEventListener("ended", playNext);
    audioPlayer.addEventListener("play", () => { isPlaying = true; updateIcons(); });
    audioPlayer.addEventListener("pause", () => { isPlaying = false; updateIcons(); });
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
  if (!audioPlayer) return;

  const { duration, currentTime } = audioPlayer;
  const percent = duration ? (currentTime / duration) * 100 : 0;
  const timeStr = formatTime(currentTime);

  const mobBar = document.getElementById("progress-bar-mobile");
  const mobFill = document.getElementById("progress-fill-mobile");
  const mobTime = document.getElementById("current-time-mobile");

  if (mobBar) mobBar.value = percent;
  if (mobFill) mobFill.style.width = `${percent}%`;
  if (mobTime) mobTime.textContent = timeStr;

  const deskBar = document.getElementById("progress-bar-desktop");
  const deskFill = document.getElementById("progress-fill-desktop");
  const deskThumb = document.getElementById("progress-thumb-desktop");
  const deskTime = document.getElementById("current-time-desktop");

  if (deskBar) deskBar.value = percent;
  if (deskFill) deskFill.style.width = `${percent}%`;
  if (deskThumb) deskThumb.style.left = `${percent}%`;
  if (deskTime) deskTime.textContent = timeStr;
}


function updateTimeDisplay() {
    const audioPlayer = document.getElementById("audio-player");
    if (!audioPlayer) return;

    const timeStr = formatTime(audioPlayer.duration);

    const mobileTimeEl = document.getElementById("total-time-mobile");
    if (mobileTimeEl) {
        mobileTimeEl.textContent = timeStr;
    }

    const desktopTimeEl = document.getElementById("total-time-desktop");
    if (desktopTimeEl) {
        desktopTimeEl.textContent = timeStr;
    }
}


function seek(e) {
  const audioPlayer = document.getElementById("audio-player");
  if (!audioPlayer || isNaN(audioPlayer.duration)) return;

  const percent = e.target.value;
  const seekTime = (percent / 100) * audioPlayer.duration;
  audioPlayer.currentTime = seekTime;

  const isDesktop = e.target.id === "progress-bar-desktop";

  if (isDesktop) {
      const deskFill = document.getElementById("progress-fill-desktop");
      const deskThumb = document.getElementById("progress-thumb-desktop");
      if (deskFill) deskFill.style.width = `${percent}%`;
      if (deskThumb) deskThumb.style.left = `${percent}%`;
  } else {
      const mobFill = document.getElementById("progress-fill-mobile");
      if (mobFill) mobFill.style.width = `${percent}%`;
  }
}


function formatTime(seconds) {
  if (isNaN(seconds) || seconds === null) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function updateVolumeIcon(vol) {
      const icon = muteBtn.querySelector("i") || muteBtn.querySelector("svg");
      if (!icon) return;

      if (vol === 0) {
          muteBtn.innerHTML = '<i data-lucide="volume-x" class="w-5 h-5"></i>';
      } else if (vol < 0.5) {
          muteBtn.innerHTML = '<i data-lucide="volume-1" class="w-5 h-5"></i>';
      } else {
          muteBtn.innerHTML = '<i data-lucide="volume-2" class="w-5 h-5"></i>';
      }
      if (window.lucide) window.lucide.createIcons();
  }