# Phaser 3 + Tiled Raum-Prototyp

## Starten

```bash
npm install
npm run dev
```

Dann die von Vite ausgegebene lokale Adresse öffnen. Bewegung: `WASD` oder Pfeiltasten. Mit `R` wird eine neue zufällige Ebene erzeugt.

## Aufbau

- `src/dungeon.js` erzeugt 6–10 zusammenhängende Räume ab `(0, 0)` und berechnet alle Nachbarn.
- `src/main.js` lädt dieselbe Tiled Map einmal und schaltet pro Raum Türgrafiken, Collision-Layer und Trigger um.
- `src/ui.js` aktualisiert Status und Minimap.
- `Character/` enthält die vier Blickrichtungen des Spielers; sie werden proportional auf maximal 30×30 Pixel skaliert.
- `rooms/room_normal.json` enthält Raumgrafik, Kollisionen und Tür-Trigger.

Der Code versteht sowohl die gewünschten Namen (`Normal Oben/Unten`, `Collision Oben/Unten`) als auch die Namen im aktuellen Export (`Normal Hoch/Runter`, `Collision_Oben/Collision_Unten`).

Jeder Raum besitzt `room.doors.up`, `room.doors.down`, `room.doors.left` und `room.doors.right`. Diese Booleans steuern direkt die jeweilige Normal-Gruppe, die umgekehrt aktive Collision und den Trigger.

Die Raumdarstellung kommt direkt aus `rooms/room_normal.json`. Das dazugehörige echte Tileset liegt unter `assets/Outside.png`; die eingebetteten Tileset-Metadaten entsprechen dem ursprünglichen `Outside.tsx`.
