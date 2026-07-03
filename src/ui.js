import backgroundMusicUrl from '../assets/audio/title.ogg?url';

let music;
let musicEnabled = true;
let masterVolume = 0.7;
let musicVolume = 0.55;

function applyAudioSettings() {
  if (!music) return;
  music.volume = musicEnabled ? masterVolume * musicVolume : 0;
  document.querySelector('#music-toggle').textContent = `Musik: ${musicEnabled ? 'AN' : 'AUS'}`;
}

export function initializeUI() {
  music = new Audio(backgroundMusicUrl);
  music.loop = true;
  music.preload = 'auto';

  masterVolume = Number(localStorage.getItem('rogue-master-volume') ?? 70) / 100;
  musicVolume = Number(localStorage.getItem('rogue-music-volume') ?? 55) / 100;
  musicEnabled = localStorage.getItem('rogue-music-enabled') !== 'false';

  const masterSlider = document.querySelector('#master-volume');
  const musicSlider = document.querySelector('#music-volume');
  masterSlider.value = String(Math.round(masterVolume * 100));
  musicSlider.value = String(Math.round(musicVolume * 100));

  const updateOutputs = () => {
    document.querySelector('#master-volume-value').value = `${masterSlider.value}%`;
    document.querySelector('#music-volume-value').value = `${musicSlider.value}%`;
  };
  updateOutputs();
  applyAudioSettings();

  masterSlider.addEventListener('input', () => {
    masterVolume = Number(masterSlider.value) / 100;
    localStorage.setItem('rogue-master-volume', masterSlider.value);
    updateOutputs();
    applyAudioSettings();
  });
  musicSlider.addEventListener('input', () => {
    musicVolume = Number(musicSlider.value) / 100;
    localStorage.setItem('rogue-music-volume', musicSlider.value);
    updateOutputs();
    applyAudioSettings();
  });

  document.querySelector('#music-toggle').addEventListener('click', () => {
    musicEnabled = !musicEnabled;
    localStorage.setItem('rogue-music-enabled', String(musicEnabled));
    applyAudioSettings();
    if (musicEnabled) music.play().catch(() => {});
  });

  const settingsButton = document.querySelector('#settings-button');
  const settingsPanel = document.querySelector('#settings-panel');
  settingsPanel.addEventListener('keydown', (event) => event.stopPropagation());
  const setSettingsOpen = (open) => {
    settingsPanel.hidden = !open;
    settingsButton.setAttribute('aria-expanded', String(open));
  };
  settingsButton.addEventListener('click', () => setSettingsOpen(settingsPanel.hidden));
  document.querySelector('#settings-close').addEventListener('click', () => setSettingsOpen(false));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setSettingsOpen(false);
  });

  const startMusic = () => {
    if (musicEnabled) music.play().catch(() => {});
    window.removeEventListener('pointerdown', startMusic);
    window.removeEventListener('keydown', startMusic);
  };
  window.addEventListener('pointerdown', startMusic);
  window.addEventListener('keydown', startMusic);
}

export function updateDungeonUI(dungeon, currentRoomId, visitedRoomIds) {
  const minimap = document.querySelector('#minimap');
  const rooms = dungeon.rooms;
  const xs = rooms.map((room) => room.x);
  const ys = rooms.map((room) => room.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const columns = maxX - minX + 1;
  const rows = maxY - minY + 1;
  const cell = Math.min(34, Math.floor(190 / Math.max(columns, rows)));
  const roomSize = Math.max(14, Math.floor(cell * 0.62));
  const width = (columns - 1) * cell + roomSize;
  const height = (rows - 1) * cell + roomSize;

  minimap.replaceChildren();
  minimap.dataset.currentRoom = String(currentRoomId);
  const content = document.createElement('div');
  content.className = 'map-content';
  content.style.width = `${width}px`;
  content.style.height = `${height}px`;
  minimap.append(content);

  for (const room of rooms) {
    for (const neighborId of Object.values(room.neighbors)) {
      if (neighborId < room.id) continue;
      const neighbor = rooms[neighborId];
      const edge = document.createElement('span');
      const bothVisited = visitedRoomIds.has(room.id) && visitedRoomIds.has(neighbor.id);
      edge.className = `map-edge${bothVisited ? ' visited' : ''}`;
      const fromX = (room.x - minX) * cell + roomSize / 2;
      const fromY = (room.y - minY) * cell + roomSize / 2;
      const toX = (neighbor.x - minX) * cell + roomSize / 2;
      const toY = (neighbor.y - minY) * cell + roomSize / 2;
      edge.style.left = `${Math.min(fromX, toX)}px`;
      edge.style.top = `${Math.min(fromY, toY)}px`;
      edge.style.width = `${Math.max(4, Math.abs(toX - fromX) || 4)}px`;
      edge.style.height = `${Math.max(4, Math.abs(toY - fromY) || 4)}px`;
      content.append(edge);
    }
  }

  for (const room of rooms) {
    const node = document.createElement('span');
    const visited = visitedRoomIds.has(room.id);
    node.className = `map-room${visited ? ' visited' : ' hidden-room'}${room.id === currentRoomId ? ' current' : ''}`;
    node.style.left = `${(room.x - minX) * cell}px`;
    node.style.top = `${(room.y - minY) * cell}px`;
    node.style.width = `${roomSize}px`;
    node.style.height = `${roomSize}px`;
    node.title = visited ? `Raum ${room.id + 1} – besucht` : 'Unentdeckter Raum';
    content.append(node);
  }

  document.querySelector('#room-counter').textContent = `${visitedRoomIds.size} / ${rooms.length}`;
  minimap.setAttribute('aria-label', `${visitedRoomIds.size} von ${rooms.length} Räumen besucht`);
}
