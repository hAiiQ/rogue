import backgroundMusicUrl from '../assets/audio/title.ogg?url';
import menuOpenUrl from '../assets/audio/menu-open.ogg?url';
import menuCloseUrl from '../assets/audio/menu-close.ogg?url';
import cursorUrl from '../assets/audio/cursor.ogg?url';
import bumpUrl from '../assets/audio/bump.ogg?url';

let music;
let masterVolume = 0.7;
let musicVolume = 0.55;
let sfxVolume = 0.7;
const sfxUrls = {
  menuOpen: menuOpenUrl,
  menuClose: menuCloseUrl,
  cursor: cursorUrl,
  bump: bumpUrl
};

function applyAudioSettings() {
  if (!music) return;
  music.volume = masterVolume * musicVolume;
}

export function playSfx(name) {
  const url = sfxUrls[name];
  if (!url || masterVolume === 0 || sfxVolume === 0) return;
  const sound = new Audio(url);
  sound.volume = masterVolume * sfxVolume;
  sound.play().catch(() => {});
}

export function initializeUI({ onFpsChange, onSettingsChange }) {
  music = new Audio(backgroundMusicUrl);
  music.loop = true;
  music.preload = 'auto';

  masterVolume = Number(localStorage.getItem('rogue-master-volume') ?? 70) / 100;
  musicVolume = Number(localStorage.getItem('rogue-music-volume') ?? 55) / 100;
  sfxVolume = Number(localStorage.getItem('rogue-sfx-volume') ?? 70) / 100;
  const savedFps = Number(localStorage.getItem('rogue-fps') ?? 60);

  const masterSlider = document.querySelector('#master-volume');
  const musicSlider = document.querySelector('#music-volume');
  const sfxSlider = document.querySelector('#sfx-volume');
  const fpsSelect = document.querySelector('#fps-select');
  masterSlider.value = String(Math.round(masterVolume * 100));
  musicSlider.value = String(Math.round(musicVolume * 100));
  sfxSlider.value = String(Math.round(sfxVolume * 100));
  fpsSelect.value = String(savedFps);
  onFpsChange(savedFps);

  const updateOutputs = () => {
    document.querySelector('#master-volume-value').value = `${masterSlider.value}%`;
    document.querySelector('#music-volume-value').value = `${musicSlider.value}%`;
    document.querySelector('#sfx-volume-value').value = `${sfxSlider.value}%`;
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
  sfxSlider.addEventListener('input', () => {
    sfxVolume = Number(sfxSlider.value) / 100;
    localStorage.setItem('rogue-sfx-volume', sfxSlider.value);
    updateOutputs();
  });
  sfxSlider.addEventListener('change', () => playSfx('cursor'));
  fpsSelect.addEventListener('change', () => {
    const fps = Number(fpsSelect.value);
    localStorage.setItem('rogue-fps', String(fps));
    onFpsChange(fps);
    playSfx('cursor');
  });

  const settingsButton = document.querySelector('#settings-button');
  const settingsPanel = document.querySelector('#settings-panel');
  settingsPanel.addEventListener('keydown', (event) => event.stopPropagation());
  const setSettingsOpen = (open) => {
    if (settingsPanel.hidden === !open) return;
    settingsPanel.hidden = !open;
    settingsButton.setAttribute('aria-expanded', String(open));
    onSettingsChange(open);
    playSfx(open ? 'menuOpen' : 'menuClose');
  };
  settingsButton.addEventListener('click', () => setSettingsOpen(settingsPanel.hidden));
  document.querySelector('#settings-close').addEventListener('click', () => setSettingsOpen(false));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setSettingsOpen(false);
  });

  const startMusic = () => {
    music.play().catch(() => {});
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
