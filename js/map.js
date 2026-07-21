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
  { id: 'townhall', name: 'Rat Town Hall', col: 4, row: 3, color: '#c9a227', hasInterior: true, interiorId: 'townhall' },
  { id: 'church', name: 'Church of the Rat God', col: 3, row: 9, color: '#7a4fae', hasInterior: false },
  { id: 'gildedrat', name: 'The Gilded Rat', col: 11, row: 7, color: '#d4af37', hasInterior: false },
  { id: 'park', name: 'Mouse Quarter', col: 4, row: 15, color: '#4f9e4f', hasInterior: false },
  { id: 'cafe', name: 'Rat Café', col: 20, row: 3, color: '#c47a3d', hasInterior: false },
  // Row 4, not 6: brought up 2 tiles.
  { id: 'shopping', name: 'Rat Shopping District', col: 24, row: 4, color: '#d9534f', hasInterior: false },
  // col 18, not 17: at col 17 the sprite's own visual width (88px,
  // wider than its 2-tile footprint) crept left into the river/bridge
  // tiles at col 16. Shifted one tile east to clear it -- footprint is
  // now (18,10)-(19,10), one tile off Sam's original (17,10)-(18,10).
  { id: 'school', name: 'Rat School', col: 18, row: 10, color: '#4f83c9', hasInterior: false },
  // Moved from (27,12) to (28,9) per the user's hand-marked map (yellow
  // circle, north of its old spot, wrapping over the top of the building).
  { id: 'gym', name: 'Rat Gymnasium', col: 28, row: 9, color: '#e07b39', hasInterior: false },
  { id: 'rustypipe', name: 'The Rusty Pipe', col: 24, row: 19, color: '#8b5a2b', hasInterior: true, interiorId: 'rustypipe' },
  // Moved from its old bottom-right-corner spot (29,21) to sit just east
  // of Rat Park, on the same row-15 branch off the west-bank spine --
  // connected to the path network like every other building, instead of
  // isolated in an empty corner of the map.
  { id: 'mousque', name: 'Mousque', col: 8, row: 15, color: '#7a8a9a', hasInterior: false },
];

RatLand._locationLookup = {};
RatLand.LOCATIONS.forEach(function (loc) {
  RatLand._locationLookup[loc.col + ',' + loc.row] = loc;
});

RatLand.locationAt = function (col, row) {
  return RatLand._locationLookup[col + ',' + row] || null;
};

// Custom building sprites (js/rendering.js) stand much taller than the
// single tile they're anchored to, but only their bottom row of tiles is
// made physically solid -- not their full visual height or, as of this
// pass, even their full base width in some cases. The tall decorative
// upper portion (roof, upper floors) stays walkable-into on purpose:
// that's exactly the "player occluded behind a tall building" case
// rendering.js's white outline handles, and making the whole visual
// footprint solid would turn every tall sprite into a much bigger dead
// zone than its actual footprint on the ground.
//
// colOffsets/rowOffsets are relative to the location's own col/row (0 =
// the anchor tile); rowOffsets is [0] for every building now -- solidity
// wraps only the bottom row, not the row above it too. For a hasInterior
// location the anchor tile (offset 0) is deliberately excluded from the
// solid set even if listed, since that's the door tile checkTransitions
// expects to stay walkable.
//
// keepEntranceWalkable does the same anchor-tile exclusion hasInterior
// locations get, but for a location that ISN'T hasInterior yet: Rat
// Shopping District's stall cluster flanks the anchor tile with a
// visible gap (see building-shopping.png) reserved for a future
// vendor-area doorway. Solidity already treats that gap tile as open
// ground today, so wiring up a real entrance later is just flipping
// hasInterior + adding an INTERIORS entry -- no art or footprint rework.
//
// colOffsets for the 6 relocated buildings are derived from the new
// bottom-row tile ranges Sam gave (in (col,row) form): townhall
// (4,3)-(5,3), gildedrat (11,7)-(12,7), rustypipe (24,19)-(25,19), gym
// (26,12)-(29,12), cafe (20,3)-(21,3), school (17,10)-(18,10). Anchor
// col is chosen as close to the true center of that range as an
// integer allows (leftCol + floor((width-1)/2)), so the sprite's
// existing center-on-anchor draw math lands as close to centered over
// the new footprint as possible -- same convention already used for
// gildedrat's asymmetric [0,1] footprint before this pass.
RatLand.BUILDING_FOOTPRINTS = {
  townhall: { colOffsets: [0, 1], rowOffsets: [0] },
  gildedrat: { colOffsets: [0, 1], rowOffsets: [0] },
  rustypipe: { colOffsets: [0, 1], rowOffsets: [0] },
  church: { colOffsets: [-1, 0, 1], rowOffsets: [0] },
  school: { colOffsets: [0, 1], rowOffsets: [0] },
  gym: { colOffsets: [-1, 0, 1, 2], rowOffsets: [0] },
  cafe: { colOffsets: [0, 1], rowOffsets: [0] },
  mousque: { colOffsets: [-1, 0, 1], rowOffsets: [0] },
  shopping: { colOffsets: [-1, 0, 1], rowOffsets: [0], keepEntranceWalkable: true },
};

RatLand._buildingSolidTiles = {};
RatLand.LOCATIONS.forEach(function (loc) {
  var fp = RatLand.BUILDING_FOOTPRINTS[loc.id];
  if (!fp) return;
  var keepAnchorWalkable = loc.hasInterior || fp.keepEntranceWalkable;
  fp.colOffsets.forEach(function (co) {
    fp.rowOffsets.forEach(function (ro) {
      if (keepAnchorWalkable && co === 0 && ro === 0) return; // keep the door/entrance tile walkable
      RatLand._buildingSolidTiles[(loc.col + co) + ',' + (loc.row + ro)] = true;
    });
  });
});

RatLand.isBuildingSolidTile = function (col, row) {
  return !!RatLand._buildingSolidTiles[col + ',' + row];
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

  // Bridges crossing the river. Each is three rows deep (not just one) so
  // there's a lane to step into if someone's standing on the crossing —
  // NPCs are physically solid, and a single-file bridge would be a dead end.
  RatLand.BRIDGE_ROWS.forEach(function (r3) {
    for (var r4 = r3 - 1; r4 <= r3 + 1; r4++) {
      for (var c3 = RatLand.RIVER_COL_START; c3 <= RatLand.RIVER_COL_END; c3++) {
        grid[r4][c3] = TILE.BRIDGE;
      }
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
  // Reverts a paved tile back to bare ground. Used only for the removals
  // marked in blue on the user's hand-marked map revision, below.
  function eraseTile(row, col) {
    var cur = grid[row][col];
    if (cur === TILE.PATH || cur === TILE.PATH_WORN) grid[row][col] = TILE.GROUND;
  }

  // West-bank spine, rooted at Town Hall's column (the hub), running the
  // length of the west bank down to the south bridge's row.
  carveV(6, 3, 19);
  // Town Hall's own row, running east across the top bridge to Rat Café.
  // Extended west from col 6 to col 4 to reach Town Hall's relocated door.
  carveH(3, 4, 19);

  // Branches off the west spine to each west-bank location.
  carveH(9, 3, 6);    // Church of the Rat God
  // Extended east from col 9 to col 12 to reach The Gilded Rat's relocated door.
  carveH(7, 6, 12);   // The Gilded Rat
  carveH(15, 4, 8);   // Mouse Quarter <-> Mousque

  // South bridge crossing, linking the bridge itself to The Rusty Pipe's
  // approach on the east bank. Extended east from col 20 to col 25 to
  // reach The Rusty Pipe's relocated door.
  carveH(19, 14, 25);

  // East-bank spine, running past Rat School and Rat Gymnasium down to
  // The Rusty Pipe.
  carveV(20, 4, 19);
  carveH(4, 19, 20);   // East-spine connector (Rat Café moved to row 3, see below)
  carveH(3, 19, 21);   // Connects to Rat Café's relocated door at row 3
  carveH(4, 20, 25);   // Rat Shopping District (brought up 2 tiles, from row 6 to row 4)
  carveH(6, 20, 24);   // Old Rat Shopping District row -- left in place as a cross-link between the east spine and Rat Gymnasium's approach
  // Extended east from col 23 to col 29 to reach Rat Gymnasium's relocated door.
  carveH(12, 18, 29);  // Rat School <-> Rat Gymnasium
  carveV(18, 10, 11);  // Connects Rat School's relocated door down to Main Street

  // Centre-front door stubs: a one-tile path segment running straight
  // south from each relocated building's own anchor column, into the
  // tile directly in front of its (future) door -- not just an approach
  // from the side. Matters most for Rat Town Hall and The Rusty Pipe,
  // whose hasInterior door-exit logic (transitions.js's returnTile,
  // `{col: loc.col, row: loc.row + 1}`) already assumes that exact tile
  // is where the player reappears leaving the building, so it needs to
  // read as "in front of the door," not just adjacent open ground.
  // Rat Café and Rat School already had a centre-front connection as a
  // side effect of their other carves above, so they're not repeated here.
  carveV(4, 3, 4);    // Rat Town Hall
  carveV(27, 12, 13); // Rat Gymnasium

  // The stubs above only connect vertically, through the door tile --
  // fine topologically, but Town Hall's and The Gilded Rat's stubs sat
  // one tile short of visibly joining the nearest established road at
  // their own row (a stray gap at col 5 / cols 8-10), reading as
  // slightly detached islands rather than a continuous street. Closed
  // both so the stub runs straight into the nearest existing path
  // instead of only linking up through the door above it. (The Rusty
  // Pipe's and Rat Gymnasium's stubs don't have this issue -- there's
  // no other path at their own row to connect to in the first place,
  // so the vertical link through the door is already the shortest route.)
  carveH(4, 4, 7);               // Rat Town Hall's stub -> the west spine
  carveH(8, 7, 11, TILE.PATH_WORN); // The Gilded Rat's stub -> the second lane

  // Main Street: the middle-bridge crossing, tying the two spines together.
  carveH(RatLand.BRIDGE_ROWS[1], 1, COLS - 2);

  // Civic widening: the roads that lead straight to Town Hall get a second
  // lane, reflecting its importance. The spine narrows back to a single
  // lane south of Main Street, on its way out to the quieter Mouse Quarter
  // and Mousque.
  carveV(7, 3, 11);  // second lane alongside the Town Hall spine
  carveH(2, 6, 19);  // second lane alongside Town Hall's frontage road

  // Foot traffic: the routes to The Gilded Rat and The Rusty Pipe get worn
  // down and grimy from heavy use, in contrast to the cleaner stone leading
  // to the Church and the School.
  carveH(7, 6, 12, TILE.PATH_WORN);   // approach to The Gilded Rat (extended for its new door)
  carveV(20, 12, 19, TILE.PATH_WORN); // approach to The Rusty Pipe
  carveH(19, 20, 25, TILE.PATH_WORN); // final grimy stretch to The Rusty Pipe's relocated door
  carveV(11, 7, 8, TILE.PATH_WORN);   // centre-front door stub, The Gilded Rat
  carveV(24, 19, 20, TILE.PATH_WORN); // centre-front door stub, The Rusty Pipe

  // --- Hand-marked map revision ---
  // Interpreted from the user's marked-up screenshot: blue = remove the
  // path at that tile, red = pave a new path tile there.

  // Blue: Rat Shopping District's row-4 connector, west half only.
  eraseTile(4, 22); eraseTile(4, 23); eraseTile(4, 24); eraseTile(4, 25);
  // Blue: The Gilded Rat's approach, easternmost tile.
  eraseTile(7, 12);
  // Blue: west-bank river path, near Fen Wicket's usual spot.
  eraseTile(11, 1); eraseTile(11, 2); eraseTile(11, 3);
  // Blue: Rat Gymnasium's old south-side path stub (building has moved away).
  eraseTile(13, 27);

  // Red: north-west plaza -- a 6-tile rectangular path space one tile in
  // from the map's top-left corner, linked down to Rat Town Hall's frontage.
  carveH(1, 1, 2);
  carveH(2, 1, 2);
  carveH(3, 1, 2);
  carveV(2, 1, 4);
  carveH(4, 2, 4);
  // Red: small extension south of Rat Shopping District.
  carveV(24, 5, 6);
  // Red: small extension west of Rat Café.
  carveV(18, 4, 5);
  // Red: small nub west of Rat School's south-east corner.
  carveH(12, 17, 18);
  // Red: reroute around The Rusty Pipe's bottom-left instead of clipping
  // straight across the building's frontage.
  carveV(22, 17, 20);
  carveH(20, 22, 23);
  // Red: long west stretch tying Mouse Quarter's neighbourhood into the
  // south bridge crossing.
  carveH(19, 6, 14);

  // --- Second hand-marked map revision ---
  // Blue: partially undoes The Rusty Pipe's bottom-left reroute -- the
  // north half of that detour (col 22, rows 17-18) is removed again.
  eraseTile(17, 22); eraseTile(18, 22);
  // Blue: a stray tile of The Rusty Pipe's original approach.
  eraseTile(19, 25);

  // Red: new path linking Rat Gymnasium's relocated east side down to the
  // existing east-spine path below it.
  carveH(10, 28, 29);
  carveH(11, 28, 29);

  // --- Third hand-marked map revision ---
  // Yellow: (20,12) sat as a lone PATH_WORN tile breaking up the clean
  // grey crossing where the east-bank spine meets the Rat School <->
  // Rat Gymnasium road -- re-laid as plain PATH to match its surroundings.
  // The rest of the PATH_WORN approach south of it (rows 13-19) is
  // untouched, since that's meant to read as grimy the whole way to
  // The Rusty Pipe's door.
  carveH(12, 20, 20, TILE.PATH);

  // --- Fourth hand-marked map revision ---
  // Red: connects the north-west plaza down to open ground near the
  // Church neighbourhood.
  carveV(1, 4, 5);
  carveH(5, 1, 2);
  // Red: Church of the Rat God's frontage, east to Annabelle Drodd.
  carveH(10, 3, 5);
  // Red: Mousque's south side, out to the path spine.
  carveH(16, 7, 9);

  // --- Fifth hand-marked map revision ---
  // Yellow: three lone PATH_WORN tiles re-laid as plain grey PATH, to
  // match the surrounding style.
  carveH(7, 6, 6, TILE.PATH);    // west end of The Gilded Rat's approach
  carveH(19, 23, 23, TILE.PATH); // beside The Rusty Pipe's south-west corner
  carveH(20, 24, 24, TILE.PATH); // The Rusty Pipe's centre-front door stub

  // --- Sixth hand-marked map revision ---
  // Yellow (follow-up): one more lone PATH_WORN tile, the single-tile
  // notch sticking out past the west edge of The Gilded Rat's worn plaza.
  carveH(7, 7, 7, TILE.PATH);

  // --- Seventh revision: east-side back route ---
  // New path linking Rat Gymnasium's south side down to The Rusty
  // Pipe's north side, through the open ground east of the river --
  // Sam's requested (28,12)-ish to (25,17)-ish route. A single-tile-wide
  // stair-step (south, west, south) through open ground, same shape as
  // the existing reroute around The Rusty Pipe's bottom-left above, so
  // it reads as a real secondary route rather than a straight-line
  // shortcut. Starts on the existing Rat School <-> Rat Gymnasium road
  // (row 12 already spans this column). The building's own sprite (see
  // js/rendering.js's buildingOccupied) is drawn well past its 2-tile
  // footprint -- its visual bounding box covers cols 23-25 at rows
  // 17-19 -- so the final descent runs down col 22, not col 24 (col 24
  // was tried first and disappeared straight into the brick wall,
  // reading as a dead end instead of an approach), landing exactly on
  // the existing reroute path at (22,19)-(22,20) instead of stopping
  // short in open ground.
  carveV(28, 12, 14);
  carveH(14, 22, 28);
  carveV(22, 14, 19);

  return grid;
};

RatLand.overworldGrid = RatLand.buildOverworldMap();

RatLand.isSolidOverworldTile = function (col, row) {
  if (col < 0 || row < 0 || col >= RatLand.OVERWORLD_COLS || row >= RatLand.OVERWORLD_ROWS) return true;
  var tile = RatLand.overworldGrid[row][col];
  if (tile === RatLand.TILE.WALL || tile === RatLand.TILE.WATER) return true;
  if (RatLand.isBuildingSolidTile(col, row)) return true;
  var loc = RatLand.locationAt(col, row);
  // Still-flat-color placeholder buildings (no BUILDING_FOOTPRINTS entry)
  // block their whole single tile, same as always. Locations with a real
  // footprint (custom sprite) rely on that footprint alone for solidity
  // instead -- for most of them the footprint already covers the anchor
  // tile too, but Rat Shopping District's keepEntranceWalkable footprint
  // deliberately doesn't, and this blanket rule would silently override
  // that and reseal the entrance gap.
  if (loc && !loc.hasInterior && !RatLand.BUILDING_FOOTPRINTS[loc.id]) return true;
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
