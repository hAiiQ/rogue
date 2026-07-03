export const DIRECTIONS = Object.freeze({
  up:    { dx: 0,  dy: -1, opposite: 'down',  label: 'Oben' },
  down:  { dx: 0,  dy: 1,  opposite: 'up',    label: 'Unten' },
  left:  { dx: -1, dy: 0,  opposite: 'right', label: 'Links' },
  right: { dx: 1,  dy: 0,  opposite: 'left',  label: 'Rechts' }
});

const directionNames = Object.keys(DIRECTIONS);
const keyOf = (x, y) => `${x},${y}`;

export function generateDungeon(minRooms = 6, maxRooms = 10) {
  const targetCount = minRooms + Math.floor(Math.random() * (maxRooms - minRooms + 1));
  const positions = [{ x: 0, y: 0 }];
  const occupied = new Set([keyOf(0, 0)]);

  while (positions.length < targetCount) {
    const origin = positions[Math.floor(Math.random() * positions.length)];
    const shuffledDirections = [...directionNames].sort(() => Math.random() - 0.5);
    const freeDirection = shuffledDirections.find((name) => {
      const direction = DIRECTIONS[name];
      return !occupied.has(keyOf(origin.x + direction.dx, origin.y + direction.dy));
    });

    if (!freeDirection) continue;

    const direction = DIRECTIONS[freeDirection];
    const next = { x: origin.x + direction.dx, y: origin.y + direction.dy };
    occupied.add(keyOf(next.x, next.y));
    positions.push(next);
  }

  const roomByPosition = new Map();
  const rooms = positions.map((position, index) => {
    const room = {
      id: index,
      ...position,
      neighbors: {},
      doors: { up: false, down: false, left: false, right: false }
    };
    roomByPosition.set(keyOf(room.x, room.y), room);
    return room;
  });

  for (const room of rooms) {
    for (const [name, direction] of Object.entries(DIRECTIONS)) {
      const neighbor = roomByPosition.get(keyOf(room.x + direction.dx, room.y + direction.dy));
      if (neighbor) {
        room.neighbors[name] = neighbor.id;
        room.doors[name] = true;
      }
    }
  }

  return { rooms, startRoomId: 0 };
}
