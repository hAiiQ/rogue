export function updateRoomUI(dungeon, currentRoom) {
  const status = document.querySelector('#room-status');
  status.textContent = `Raum ${currentRoom.id + 1} von ${dungeon.rooms.length} · Koordinate (${currentRoom.x}, ${currentRoom.y})`;

  const minimap = document.querySelector('#minimap');
  minimap.replaceChildren();
  minimap.dataset.currentRoom = String(currentRoom.id);
  minimap.dataset.neighbors = Object.keys(currentRoom.neighbors).join(',');
  minimap.dataset.doors = Object.entries(currentRoom.doors)
    .map(([direction, open]) => `${direction}:${open}`)
    .join(',');

  const xs = dungeon.rooms.map((room) => room.x);
  const ys = dungeon.rooms.map((room) => room.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = Math.max(1, maxX - minX);
  const rangeY = Math.max(1, maxY - minY);
  const point = (room) => ({
    x: 12 + ((room.x - minX) / rangeX) * 76,
    y: 12 + ((room.y - minY) / rangeY) * 76
  });

  for (const room of dungeon.rooms) {
    for (const neighborId of Object.values(room.neighbors)) {
      if (neighborId < room.id) continue;
      const from = point(room);
      const to = point(dungeon.rooms[neighborId]);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const edge = document.createElement('span');
      edge.className = 'map-edge';
      edge.style.left = `${from.x}%`;
      edge.style.top = `${from.y}%`;
      edge.style.width = `${Math.hypot(dx, dy)}%`;
      edge.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      minimap.append(edge);
    }
  }

  for (const room of dungeon.rooms) {
    const position = point(room);
    const node = document.createElement('span');
    node.className = `map-room${room.id === currentRoom.id ? ' current' : ''}`;
    node.style.left = `${position.x}%`;
    node.style.top = `${position.y}%`;
    node.title = `Raum ${room.id + 1} (${room.x}, ${room.y})`;
    minimap.append(node);
  }
}
