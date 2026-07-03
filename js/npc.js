// npc.js — the Town Crier, a static NPC posted outside Rat Town Hall.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

RatLand.townCrier = {
  name: 'Town Crier',
  col: 7,
  row: 4,
  color: '#b0463c',
  lines: [
    'Hear ye, hear ye! Twenty glorious years of Rat Land!',
    "The Mayor says the mouse situation is 'under control.'",
    'Cheese rations for all citizens... eventually.',
    "Don't mind the bridge tolls, friend — progress isn't free.",
    'Anniversary parade at sundown! Mind the potholes.',
  ],
  lineIndex: 0,
};

RatLand.getCrierLine = function () {
  var crier = RatLand.townCrier;
  var line = crier.lines[crier.lineIndex];
  crier.lineIndex = (crier.lineIndex + 1) % crier.lines.length;
  return line;
};

// Chebyshev (tile) distance from the player's current tile to the crier.
RatLand.distanceToCrier = function (playerCol, playerRow) {
  var crier = RatLand.townCrier;
  return Math.max(Math.abs(playerCol - crier.col), Math.abs(playerRow - crier.row));
};
