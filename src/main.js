import Phaser from 'phaser';
import './style.css';
import { DIRECTIONS, generateDungeon } from './dungeon.js';
import { initializeUI, updateDungeonUI } from './ui.js';
import trainerRedUrl from '../Character/trainer_POKEMONTRAINER_Red.png?url';
import outsideTilesetUrl from '../assets/Outside.png?url';

const MAP_WIDTH = 576;
const MAP_HEIGHT = 320;
const TILE_SIZE = 32;
const PLAYER_FRAME_HEIGHT = 48;
const PLAYER_TILE_ANCHOR_Y = (PLAYER_FRAME_HEIGHT / 2 + (PLAYER_FRAME_HEIGHT - TILE_SIZE) / 2) / PLAYER_FRAME_HEIGHT;
const PLAYER_SPEED = 150;
const WALK_FRAME_RATE = (PLAYER_SPEED / TILE_SIZE) * 4;
const CAMERA_PAN_DURATION = 400;
const START_TILE_X = 8;
const START_TILE_Y = 5;
const PLAYER_TEXTURE = 'trainer-red';
const playerFrames = {
  down: [0, 1, 0, 3],
  left: [4, 5, 4, 7],
  right: [8, 9, 8, 11],
  up: [12, 13, 12, 15]
};

const normalizeName = (name) => name
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]/gi, '')
  .toLowerCase();

const layerNames = {
  up: { normal: ['Normal Oben', 'Normal Hoch'], collision: ['Collision Oben', 'Collision_Oben'] },
  down: { normal: ['Normal Unten', 'Normal Runter'], collision: ['Collision Unten', 'Collision_Unten'] },
  left: { normal: ['Normal Links'], collision: ['Collision Links', 'Collision_Links'] },
  right: { normal: ['Normal Rechts'], collision: ['Collision Rechts', 'Collision_Rechts'] }
};

function matchesLayerName(name, expectedNames) {
  const normalized = normalizeName(name);
  return expectedNames.some((expectedName) => normalized.includes(normalizeName(expectedName)));
}

class RoomScene extends Phaser.Scene {
  constructor() {
    super('RoomScene');
    this.currentRoomId = 0;
  }

  preload() {
    this.load.tilemapTiledJSON('room-map', '/rooms/room_normal.json');
    this.load.image('outside', outsideTilesetUrl);
    this.load.spritesheet(PLAYER_TEXTURE, trainerRedUrl, { frameWidth: 32, frameHeight: 48 });
  }

  create() {
    for (const [direction, frames] of Object.entries(playerFrames)) {
      this.anims.create({
        key: `walk-${direction}`,
        frames: this.anims.generateFrameNumbers(PLAYER_TEXTURE, { frames }),
        frameRate: WALK_FRAME_RATE,
        repeat: -1
      });
    }

    this.player = this.physics.add.sprite(0, 0, PLAYER_TEXTURE, playerFrames.down[0]);
    this.player
      .setOrigin(0.5, PLAYER_TILE_ANCHOR_Y)
      .setDepth(20)
      .setCollideWorldBounds(true);
    this.player.body.setSize(20, 12).setOffset(6, 26);
    this.playerFacing = 'down';
    this.playerMove = null;
    document.querySelector('#game').dataset.facing = this.playerFacing;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-R', () => this.createNewFloor());
    initializeUI();
    this.createNewFloor();

    window.__ROGUE_DEBUG__ = {
      scene: this,
      getState: () => ({ dungeon: this.dungeon, currentRoomId: this.currentRoomId }),
      newFloor: () => this.createNewFloor()
    };
  }

  createNewFloor() {
    this.tweens.killTweensOf(this.cameras.main);
    for (const collider of this.worldColliders ?? []) collider.destroy();
    for (const map of this.roomMaps ?? []) map.destroy();

    this.dungeon = generateDungeon(6, 10);
    this.currentRoomId = this.dungeon.startRoomId;
    this.visitedRoomIds = new Set([this.currentRoomId]);
    this.cameraMoving = false;
    this.playerMove = null;
    this.player.anims.stop();
    this.playerFacing = 'down';
    this.player.setFrame(playerFrames.down[0]);
    document.querySelector('#game').dataset.facing = this.playerFacing;

    this.buildDungeonWorld();
    const startRoom = this.dungeon.rooms[this.currentRoomId];
    this.playerTileX = startRoom.x * (MAP_WIDTH / TILE_SIZE) + START_TILE_X;
    this.playerTileY = startRoom.y * (MAP_HEIGHT / TILE_SIZE) + START_TILE_Y;
    const startX = this.tileToWorld(this.playerTileX);
    const startY = this.tileToWorld(this.playerTileY);
    this.player.setPosition(startX, startY).setVelocity(0);
    this.player.body.reset(startX, startY);

    this.cameras.main.stopFollow();
    this.cameras.main.setScroll(startRoom.x * MAP_WIDTH, startRoom.y * MAP_HEIGHT);
    this.cameras.main.setRoundPixels(true);
    this.updateCurrentRoom();
  }

  buildDungeonWorld() {
    this.roomMaps = [];
    this.worldColliders = [];
    this.blockingCollisionLayers = [];

    const xs = this.dungeon.rooms.map((room) => room.x);
    const ys = this.dungeon.rooms.map((room) => room.y);
    this.worldBounds = {
      left: Math.min(...xs) * MAP_WIDTH,
      top: Math.min(...ys) * MAP_HEIGHT,
      right: (Math.max(...xs) + 1) * MAP_WIDTH,
      bottom: (Math.max(...ys) + 1) * MAP_HEIGHT
    };
    const width = this.worldBounds.right - this.worldBounds.left;
    const height = this.worldBounds.bottom - this.worldBounds.top;
    this.physics.world.setBounds(this.worldBounds.left, this.worldBounds.top, width, height);
    this.cameras.main.setBounds(this.worldBounds.left, this.worldBounds.top, width, height);

    for (const room of this.dungeon.rooms) this.buildRoom(room);
  }

  buildRoom(room) {
    const map = this.make.tilemap({ key: 'room-map' });
    const tileset = map.addTilesetImage('Outside', 'outside');
    if (!tileset) throw new Error('Tileset "Outside" konnte nicht verbunden werden.');

    const originX = room.x * MAP_WIDTH;
    const originY = room.y * MAP_HEIGHT;
    const layers = map.layers.map((data) => map.createLayer(data.name, tileset, originX, originY));
    const baseLayers = layers.filter((layer) => {
      const name = normalizeName(layer.layer.name);
      return name.startsWith('base') || name.startsWith('mitte');
    });
    const treeLayers = baseLayers.filter((layer) => (
      normalizeName(layer.layer.name.split('/').at(-1)) === 'baume'
    ));
    const normalLayers = Object.fromEntries(Object.keys(DIRECTIONS).map((direction) => [
      direction,
      layers.filter((layer) => matchesLayerName(layer.layer.name, layerNames[direction].normal))
    ]));
    const collisionBase = layers.filter((layer) => normalizeName(layer.layer.name).includes('collisionbase'));
    const collisionLayers = Object.fromEntries(Object.keys(DIRECTIONS).map((direction) => [
      direction,
      layers.filter((layer) => {
        const name = normalizeName(layer.layer.name);
        return name.startsWith('collisions') && !name.includes('collisionbase')
          && matchesLayerName(layer.layer.name, layerNames[direction].collision);
      })
    ]));

    for (const layer of layers) layer.setVisible(false);
    for (const layer of baseLayers) layer.setVisible(true);
    for (const layer of treeLayers) layer.setDepth(30);
    for (const layer of collisionBase) {
      layer.setCollisionByExclusion([-1], true, true);
      this.blockingCollisionLayers.push(layer);
    }

    for (const direction of Object.keys(DIRECTIONS)) {
      const doorIsOpen = room.doors[direction] === true;
      for (const layer of normalLayers[direction]) layer.setVisible(doorIsOpen);
      for (const layer of collisionLayers[direction]) {
        layer.setCollisionByExclusion([-1], !doorIsOpen, true);
        if (!doorIsOpen) this.blockingCollisionLayers.push(layer);
      }
    }

    if (room.doors.down) {
      const cutout = new Set();
      for (const layer of normalLayers.down) {
        layer.forEachTile((tile) => {
          if (tile.index !== -1) cutout.add(`${tile.x},${tile.y}`);
        });
      }
      for (const layer of treeLayers) {
        layer.forEachTile((tile) => {
          if (tile.index !== -1 && cutout.has(`${tile.x},${tile.y}`)) tile.visible = false;
        });
      }
    }

    for (const layer of [...collisionBase, ...Object.values(collisionLayers).flat()]) layer.setVisible(false);
    this.roomMaps.push(map);
  }

  setPlayerFacing(direction) {
    if (this.playerFacing === direction) return;
    this.playerFacing = direction;
    this.player.setFrame(playerFrames[direction][0]);
    document.querySelector('#game').dataset.facing = direction;
  }

  startPlayerMove(direction) {
    if (this.playerMove || this.cameraMoving) return;
    const vector = DIRECTIONS[direction];
    const targetTileX = this.playerTileX + vector.dx;
    const targetTileY = this.playerTileY + vector.dy;

    this.setPlayerFacing(direction);
    if (!this.canPlayerMove(targetTileX, targetTileY)) {
      this.snapPlayerToGrid();
      return;
    }

    this.player.play(`walk-${direction}`);
    this.playerMove = {
      direction,
      startX: this.tileToWorld(this.playerTileX),
      startY: this.tileToWorld(this.playerTileY),
      targetTileX,
      targetTileY,
      targetX: this.tileToWorld(targetTileX),
      targetY: this.tileToWorld(targetTileY)
    };
    this.player.setVelocity(vector.dx * PLAYER_SPEED, vector.dy * PLAYER_SPEED);
  }

  tileToWorld(tile) {
    return tile * TILE_SIZE + TILE_SIZE / 2;
  }

  snapPlayerToGrid() {
    this.player.body.reset(this.tileToWorld(this.playerTileX), this.tileToWorld(this.playerTileY));
  }

  canPlayerMove(targetTileX, targetTileY) {
    const targetX = this.tileToWorld(targetTileX);
    const targetY = this.tileToWorld(targetTileY);
    const probeSize = 8;
    const probeLeft = targetX - probeSize / 2;
    const probeTop = targetY - probeSize / 2;

    if (
      probeLeft < this.worldBounds.left
      || probeTop < this.worldBounds.top
      || probeLeft + probeSize > this.worldBounds.right
      || probeTop + probeSize > this.worldBounds.bottom
    ) return false;

    return !this.blockingCollisionLayers.some((layer) => (
      layer.getTilesWithinWorldXY(
        probeLeft,
        probeTop,
        probeSize,
        probeSize,
        { isNotEmpty: true }
      ).length > 0
    ));
  }

  updatePlayerMove() {
    const move = this.playerMove;
    if (!move) return;

    if (this.player.body.blocked[move.direction]) {
      this.finishPlayerMove(move, false);
      return;
    }

    const reached = move.direction === 'left'
      ? this.player.x <= move.targetX
      : move.direction === 'right'
        ? this.player.x >= move.targetX
        : move.direction === 'up'
          ? this.player.y <= move.targetY
          : this.player.y >= move.targetY;
    if (reached) this.finishPlayerMove(move, true);
  }

  finishPlayerMove(move, reachedTarget) {
    if (reachedTarget) {
      this.playerTileX = move.targetTileX;
      this.playerTileY = move.targetTileY;
    }
    this.player.anims.stop();
    this.player.setFrame(playerFrames[move.direction][0]);
    this.player
      .setPosition(this.tileToWorld(this.playerTileX), this.tileToWorld(this.playerTileY))
      .setVelocity(0);
    this.playerMove = null;
    this.updateCurrentRoom(move.direction);
  }

  updateCurrentRoom(moveDirection = null) {
    const direction = moveDirection ? DIRECTIONS[moveDirection] : { dx: 0, dy: 0 };
    const probeX = this.player.x + direction.dx * 0.5;
    const probeY = this.player.y + direction.dy * 0.5;
    const room = this.dungeon.rooms.find((candidate) => {
      const left = candidate.x * MAP_WIDTH;
      const top = candidate.y * MAP_HEIGHT;
      return probeX >= left && probeX < left + MAP_WIDTH
        && probeY >= top && probeY < top + MAP_HEIGHT;
    });
    if (!room) return;

    const roomChanged = room.id !== this.currentRoomId;
    this.currentRoomId = room.id;
    this.visitedRoomIds.add(room.id);
    const game = document.querySelector('#game');
    game.dataset.currentRoom = String(room.id);
    game.dataset.doors = Object.entries(room.doors)
      .map(([direction, open]) => `${direction}:${open}`)
      .join(',');
    updateDungeonUI(this.dungeon, room.id, this.visitedRoomIds);

    if (roomChanged) {
      this.cameraMoving = true;
      this.tweens.add({
        targets: this.cameras.main,
        scrollX: room.x * MAP_WIDTH,
        scrollY: room.y * MAP_HEIGHT,
        duration: CAMERA_PAN_DURATION,
        ease: 'Sine.easeInOut',
        onComplete: () => { this.cameraMoving = false; }
      });
    }
  }

  update() {
    if (!this.player) return;
    if (this.playerMove) {
      this.updatePlayerMove();
      return;
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) this.startPlayerMove('up');
    else if (this.cursors.down.isDown || this.wasd.S.isDown) this.startPlayerMove('down');
    else if (this.cursors.left.isDown || this.wasd.A.isDown) this.startPlayerMove('left');
    else if (this.cursors.right.isDown || this.wasd.D.isDown) this.startPlayerMove('right');
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  backgroundColor: '#101710',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false }
  },
  scale: {
    mode: Phaser.Scale.NONE,
    autoRound: true,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: RoomScene
});
