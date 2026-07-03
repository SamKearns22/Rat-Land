// map.js — tile grid, overworld layout, interior layouts, and collision lookups.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

RatLand.TILE_SIZE = 32;

RatLand.TILE = {
  GROUND: 0,
  PATH: 1,
  WATER: 2,
  BRIDGE: 3,
  WALL: 4,
  DOOR: 5,
  PROP: 6,
  PATH_WORN: 7,
};

RatLand.TILE_COLORS = {
  0: '#6f7d4a', // GROUND — trampled sewer-bank muck
  1: '#9c9c8c', // PATH — worn stone walkway
  2: '#2f5049', // WATER — the Sewer River
  3: '#8a6240', // BRIDGE — timber crossing
  4: '#242424', // WALL — tunnel brick
  5: '#c9a227', // DOOR — exit
  6: '#5a3a22', // PROP — furniture / fixtures
  7: '#6b5f4e', // PATH_WORN — grimy, heavily-trodden stone
};

RatLand.OVERWORLD_COLS = 32;
RatLand.OVERWORLD_ROWS = 24;
RatLand.RIVER_COL_START = 14;
RatLand.RIVER_COL_END = 16;
RatLand.BRIDGE_ROWS = [3, 11, 19];

// Locations from WORLD.md. Only townhall and rustypipe have working interiors;
// the rest are visually distinct but solid (walkable-up-to) placeholders.
RatLand.LOCATIONS = [
  { id: 'townhall', name: 'Rat Town Hall', col: 6, row: 3, color: '#c9a227', hasInterior: true, interiorId: 'townhall' },
  { id: 'church', name: 'Church of the Rat God', col: 3, row: 9, color: '#7a4fae', hasInterior: false },
  { id: 'gildedrat', name: 'The Gilded Rat', col: 9, row: 7, color: '#d4af37', hasInterior: false },
  { id: 'park', name: 'Rat Park', col: 4, row: 15, color: '#4f9e4f', hasInterior: false },
  { id: 'beach', name: 'Rat Beach', col: 11, row: 20, color: '#e0c880', hasInterior: false },
  { id: 'cafe', name: 'Rat Café', col: 19, row: 4, color: '#c47a3d', hasInterior: false },
  { id: 'shopping', name: 'Rat Shopping District', col: 24, row: 6, color: '#d9534f', hasInterior: false },
  { id: 'school', name: 'Rat School', col: 18, row: 12, color: '#4f83c9', hasInterior: false },
  { id: 'gym', name: 'Rat Gymnasium', col: 23, row: 12, color: '#e07b39', hasInterior: false },
  { id: 'rustypipe', name: 'The Rusty Pipe', col: 20, row: 19, color: '#8b5a2b', hasInterior: true, interiorId: 'rustypipe' },
];

RatLand._locationLookup = {};
RatLand.LOCATIONS.forEach(function (loc) {
  RatLand._locationLookup[loc.col + ',' + loc.row] = loc;
});

RatLand.locationAt = function (col, row) {
  return RatLand._locationLookup[col + ',' + row] || null;
};

// --- Overworld generation ---

RatLand.buildOverworldMap = function () {
  var COLS = RatLand.OVERWORLD_COLS;
  var ROWS = RatLand.OVERWORLD_ROWS;
  var TILE = RatLand.TILE;
  var grid = [];

  for (var r = 0; r < ROWS; r++) {
    var row = [];
    for (var c = 0; c < COLS; c++) {
      var isBorder = r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1;
      row.push(isBorder ? TILE.WALL : TILE.GROUND);
    }
    grid.push(row);
  }

  // Sewer River running north-south through the middle of town.
  for (var r2 = 1; r2 < ROWS - 1; r2++) {
    for (var c2 = RatLand.RIVER_COL_START; c2 <= RatLand.RIVER_COL_END; c2++) {
      grid[r2][c2] = TILE.WATER;
    }
  }

  // Bridges crossing the river.
  RatLand.BRIDGE_ROWS.forEach(function (r3) {
    for (var c3 = RatLand.RIVER_COL_START; c3 <= RatLand.RIVER_COL_END; c3++) {
      grid[r3][c3] = TILE.BRIDGE;
    }
  });

  // Walkways connecting every building entrance, radiating outward from
  // Rat Town Hall as the town's central hub. These only ever cross the
  // river at the three bridges — a straight carve never touches water,
  // since carveH/carveV only ever pave over ground or an existing path.
  // A tileType can be passed to lay (or re-lay) a segment as worn/grimy
  // instead of the default clean stone.
  function carveH(row, colA, colB, tileType) {
    var t = tileType || TILE.PATH;
    var lo = Math.min(colA, colB), hi = Math.max(colA, colB);
    for (var c = lo; c <= hi; c++) {
      var cur = grid[row][c];
      if (cur === TILE.GROUND || cur === TILE.PATH || cur === TILE.PATH_WORN) grid[row][c] = t;
    }
  }
  function carveV(col, rowA, rowB, tileType) {
    var t = tileType || TILE.PATH;
    var lo = Math.min(rowA, rowB), hi = Math.max(rowA, rowB);
    for (var r = lo; r <= hi; r++) {
      var cur = grid[r][col];
      if (cur === TILE.GROUND || cur === TILE.PATH || cur === TILE.PATH_WORN) grid[r][col] = t;
    }
  }

  // West-bank spine, rooted at Town Hall's column (the hub), running the
  // length of the west bank down to Rat Beach.
  carveV(6, 3, 20);
  // Town Hall's own row, running east across the top bridge to Rat Café.
  carveH(3, 6, 19);

  // Branches off the west spine to each west-bank location.
  carveH(9, 3, 6);    // Church of the Rat God
  carveH(7, 6, 9);    // The Gilded Rat
  carveH(15, 4, 6);   // Rat Park
  carveH(20, 6, 11);  // Rat Beach

  // Beach connector up to the bottom bridge, then across to the east bank.
  carveV(11, 19, 20);
  carveH(19, 11, 20);

  // East-bank spine, running past Rat School and Rat Gymnasium down to
  // The Rusty Pipe.
  carveV(20, 4, 19);
  carveH(4, 19, 20);   // Rat Café
  carveH(6, 20, 24);   // Rat Shopping District
  carveH(12, 18, 23);  // Rat School <-> Rat Gymnasium

  // Main Street: the middle-bridge crossing, tying the two spines together.
  carveH(RatLand.BRIDGE_ROWS[1], 1, COLS - 2);

  // Civic widening: the roads that lead straight to Town Hall get a second
  // lane, reflecting its importance. The spine narrows back to a single
  // lane south of Main Street, on its way out to the quieter Rat Park and
  // Rat Beach.
  carveV(7, 3, 11);  // second lane alongside the Town Hall spine
  carveH(2, 6, 19);  // second lane alongside Town Hall's frontage road

  // Foot traffic: the routes to The Gilded Rat and The Rusty Pipe get worn
  // down and grimy from heavy use, in contrast to the cleaner stone leading
  // to the Church and the School.
  carveH(7, 6, 9, TILE.PATH_WORN);    // approach to The Gilded Rat
  carveV(20, 12, 19, TILE.PATH_WORN); // approach to The Rusty Pipe

  return grid;
};

RatLand.overworldGrid = RatLand.buildOverworldMap();

RatLand.isSolidOverworldTile = function (col, row) {
  if (col < 0 || row < 0 || col >= RatLand.OVERWORLD_COLS || row >= RatLand.OVERWORLD_ROWS) return true;
  var tile = RatLand.overworldGrid[row][col];
  if (tile === RatLand.TILE.WALL || tile === RatLand.TILE.WATER) return true;
  var loc = RatLand.locationAt(col, row);
  if (loc && !loc.hasInterior) return true; // placeholder buildings block entry
  return false;
};

// --- Interiors ---

RatLand.buildInterior = function (opts) {
  var cols = opts.cols, rows = opts.rows;
  var TILE = RatLand.TILE;
  var grid = [];
  for (var r = 0; r < rows; r++) {
    var row = [];
    for (var c = 0; c < cols; c++) {
      var isBorder = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
      row.push(isBorder ? TILE.WALL : TILE.PATH);
    }
    grid.push(row);
  }
  var doorCol = Math.floor(cols / 2);
  var doorRow = rows - 1;
  grid[doorRow][doorCol] = TILE.DOOR;
  if (opts.propCol != null && opts.propRow != null) {
    grid[opts.propRow][opts.propCol] = TILE.PROP;
  }
  return {
    grid: grid,
    cols: cols,
    rows: rows,
    doorCol: doorCol,
    doorRow: doorRow,
    title: opts.title,
    propColor: opts.propColor,
    propLabel: opts.propLabel,
    propCol: opts.propCol,
    propRow: opts.propRow,
  };
};

RatLand.INTERIORS = {
  townhall: RatLand.buildInterior({
    cols: 9,
    rows: 7,
    title: 'Rat Town Hall',
    propCol: 4,
    propRow: 2,
    propColor: '#3a2a12',
    propLabel: "Mayor's Desk",
  }),
  rustypipe: RatLand.buildInterior({
    cols: 9,
    rows: 7,
    title: 'The Rusty Pipe',
    propCol: 4,
    propRow: 2,
    propColor: '#3a2a1a',
    propLabel: 'Bar Counter',
  }),
};

RatLand.isSolidInteriorTile = function (interior, col, row) {
  if (col < 0 || row < 0 || col >= interior.cols || row >= interior.rows) return true;
  var tile = interior.grid[row][col];
  if (tile === RatLand.TILE.WALL || tile === RatLand.TILE.PROP) return true;
  return false;
};
