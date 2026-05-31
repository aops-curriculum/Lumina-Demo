/* Fraction Bat — p5 port of curriculum-scriptorium/interactives/sandbox/Frac-Bat2.ts */

const CANVAS_W = 800;
const CANVAS_H = 480;
const Y_MIN = 40;
const Y_MAX = 520;

const CHAMPION_IMAGE_SIZE = 36;
const CHAMPION_SPACING = 50;
const PLAYER_LABEL_X = 72;
const FIRST_CHAMPION_X = 150;
const PLAYER1_ROW_Y = 502;
const PLAYER2_ROW_Y = 465;

const CARD_WIDTH = 44;
const CARD_HEIGHT = 56;
const SNAP_DISTANCE = 55;
const CARD_SPACING = 48;
const CENTER_Y = 265;

const LEFT_BOARD_CENTER_X = 220;
const LEFT_BOARD_LEFT = 80;
const LEFT_BOARD_RIGHT = 360;
const RIGHT_BOARD_CENTER_X = 560;
const RIGHT_BOARD_LEFT = 440;
const RIGHT_BOARD_RIGHT = 720;

const CARD_BANK_Y = 100;
const FRACTION_LABEL_Y = 425;

const DEFAULT_PLAYER1_CHAMPION = 3;
const DEFAULT_PLAYER2_CHAMPION = 0;

const CHAMPION_FILES = [
  "assets/frac-bat/Vector Art_Emojis 1.png",
  "assets/frac-bat/Vector Art_Emojis 2.png",
  "assets/frac-bat/Vector Art_Emojis 3.png",
  "assets/frac-bat/Vector Art_Emojis 4.png",
];

const CHAMPION_COLORS = ["#d19ae8", "#ffb3d1", "#c9ecf0", "#c6dc70"];

const LEFT_SLOT_CENTERS = [
  { x: 140, y: 165 },
  { x: 300, y: 165 },
  { x: 140, y: 365 },
  { x: 300, y: 365 },
];

const RIGHT_SLOT_CENTERS = [
  { x: 480, y: 165 },
  { x: 640, y: 165 },
  { x: 480, y: 365 },
  { x: 640, y: 365 },
];

const ALL_SLOT_CENTERS = [...LEFT_SLOT_CENTERS, ...RIGHT_SLOT_CENTERS];

let championImages = [];
let championStates = [];
let selection = { player1: DEFAULT_PLAYER1_CHAMPION, player2: DEFAULT_PLAYER2_CHAMPION };
let cards = [];
let draggingCardIndex = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let leftFractionText = "";
let rightFractionText = "";

function toCanvasY(y) {
  return Y_MAX - y;
}

function toInteractiveY(canvasY) {
  return Y_MAX - canvasY;
}

function dist(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function buildDeck() {
  const deck = [];
  for (let n = 1; n <= 10; n++) {
    for (let c = 0; c < 4; c++) {
      deck.push(n);
    }
  }
  return deck;
}

function shuffle(array) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function simplifyFraction(num, den) {
  if (den === 0) {
    return { num: 0, den: 1 };
  }
  const g = gcd(num, den);
  let n = num / g;
  let d = den / g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  return { num: n, den: d };
}

function formatFraction(num, den) {
  const { num: n, den: d } = simplifyFraction(num, den);
  if (d === 1) {
    return String(n);
  }
  return `${n}/${d}`;
}

function initChampionStates() {
  championStates = CHAMPION_FILES.map(() => [
    { selected: false, disabled: false },
    { selected: false, disabled: false },
  ]);
  refreshChampionStates();
}

function refreshChampionStates() {
  for (let i = 0; i < CHAMPION_FILES.length; i++) {
    championStates[i][0].selected = i === selection.player1;
    championStates[i][0].disabled = i === selection.player2;
    championStates[i][1].selected = i === selection.player2;
    championStates[i][1].disabled = i === selection.player1;
  }
}

function getPlayerColor(player) {
  const idx = player === 1 ? selection.player1 : selection.player2;
  return CHAMPION_COLORS[idx];
}

function getSlotValue(slotIndex) {
  const slot = ALL_SLOT_CENTERS[slotIndex];
  for (const card of cards) {
    if (dist(card.x, card.y, slot.x, slot.y) < 0.01) {
      return card.value;
    }
  }
  return null;
}

function updateFractionLabels() {
  const leftNum =
    getSlotValue(2) !== null && getSlotValue(3) !== null
      ? getSlotValue(2) + getSlotValue(3)
      : null;
  const leftDen =
    getSlotValue(0) !== null && getSlotValue(1) !== null
      ? getSlotValue(0) + getSlotValue(1)
      : null;
  const rightNum =
    getSlotValue(6) !== null && getSlotValue(7) !== null
      ? getSlotValue(6) + getSlotValue(7)
      : null;
  const rightDen =
    getSlotValue(4) !== null && getSlotValue(5) !== null
      ? getSlotValue(4) + getSlotValue(5)
      : null;

  leftFractionText =
    leftNum !== null && leftDen !== null
      ? leftDen === 0
        ? "—"
        : formatFraction(leftNum, leftDen)
      : "";
  rightFractionText =
    rightNum !== null && rightDen !== null
      ? rightDen === 0
        ? "—"
        : formatFraction(rightNum, rightDen)
      : "";
}

function snapCard(cardIndex) {
  const card = cards[cardIndex];
  const occupied = new Set();
  for (let i = 0; i < cards.length; i++) {
    if (i === cardIndex) {
      continue;
    }
    for (let s = 0; s < ALL_SLOT_CENTERS.length; s++) {
      const slot = ALL_SLOT_CENTERS[s];
      if (dist(cards[i].x, cards[i].y, slot.x, slot.y) < 0.01) {
        occupied.add(s);
      }
    }
  }

  let bestSlot = -1;
  let bestDist = Infinity;
  for (let s = 0; s < ALL_SLOT_CENTERS.length; s++) {
    if (occupied.has(s)) {
      continue;
    }
    const slot = ALL_SLOT_CENTERS[s];
    const d = dist(card.x, card.y, slot.x, slot.y);
    if (d < SNAP_DISTANCE && d < bestDist) {
      bestDist = d;
      bestSlot = s;
    }
  }

  if (bestSlot >= 0) {
    const slot = ALL_SLOT_CENTERS[bestSlot];
    card.x = slot.x;
    card.y = slot.y;
  }
}

function selectChampion(player, championIndex) {
  const row = player === 1 ? 0 : 1;
  if (championStates[championIndex][row].disabled) {
    return;
  }
  if (player === 1) {
    selection.player1 = championIndex;
  } else {
    selection.player2 = championIndex;
  }
  refreshChampionStates();
}

function championHitTest(player, mx, my) {
  const rowY = player === 1 ? PLAYER1_ROW_Y : PLAYER2_ROW_Y;
  const row = player === 1 ? 0 : 1;
  const half = CHAMPION_IMAGE_SIZE / 2;
  for (let i = 0; i < CHAMPION_FILES.length; i++) {
    const cx = FIRST_CHAMPION_X + i * CHAMPION_SPACING;
    if (
      mx >= cx - half &&
      mx <= cx + half &&
      my >= rowY - half &&
      my <= rowY + half
    ) {
      if (!championStates[i][row].disabled) {
        selectChampion(player, i);
      }
      return true;
    }
  }
  return false;
}

function cardHitTest(mx, my) {
  for (let i = cards.length - 1; i >= 0; i--) {
    const card = cards[i];
    const halfW = CARD_WIDTH / 2;
    const halfH = CARD_HEIGHT / 2;
    if (
      mx >= card.x - halfW &&
      mx <= card.x + halfW &&
      my >= card.y - halfH &&
      my <= card.y + halfH
    ) {
      return i;
    }
  }
  return null;
}

function resetGame() {
  selection = {
    player1: DEFAULT_PLAYER1_CHAMPION,
    player2: DEFAULT_PLAYER2_CHAMPION,
  };
  refreshChampionStates();

  const deck = shuffle(buildDeck());
  const leftBoardCards = deck.slice(0, 5);
  const rightBoardCards = deck.slice(5, 10);
  cards = [];

  const setups = [
    { centerX: LEFT_BOARD_CENTER_X, boardCards: leftBoardCards, player: 1 },
    { centerX: RIGHT_BOARD_CENTER_X, boardCards: rightBoardCards, player: 2 },
  ];

  for (const { centerX, boardCards, player } of setups) {
    const bankStartX = centerX - ((boardCards.length - 1) * CARD_SPACING) / 2;
    for (let i = 0; i < boardCards.length; i++) {
      const x = bankStartX + i * CARD_SPACING;
      const y = CARD_BANK_Y;
      cards.push({
        value: boardCards[i],
        x,
        y,
        homeX: x,
        homeY: y,
        player,
      });
    }
  }

  draggingCardIndex = null;
  leftFractionText = "";
  rightFractionText = "";
}

function drawPlusSign(cx, cy, size) {
  const half = size / 2;
  stroke(60);
  strokeWeight(2);
  line(cx - half, toCanvasY(cy), cx + half, toCanvasY(cy));
  line(cx, toCanvasY(cy - half), cx, toCanvasY(cy + half));
}

function drawBoard(slotCenters, boardLeft, boardRight) {
  stroke(60);
  strokeWeight(2);
  line(boardLeft, toCanvasY(CENTER_Y), boardRight, toCanvasY(CENTER_Y));

  for (const slot of slotCenters) {
    noFill();
    rectMode(CENTER);
    rect(slot.x, toCanvasY(slot.y), CARD_WIDTH, CARD_HEIGHT, 2);
  }

  drawPlusSign(
    (slotCenters[0].x + slotCenters[1].x) / 2,
    slotCenters[0].y,
    36,
  );
  drawPlusSign(
    (slotCenters[2].x + slotCenters[3].x) / 2,
    slotCenters[2].y,
    36,
  );
}

function drawCard(card) {
  const color = getPlayerColor(card.player);
  noTint();
  rectMode(CENTER);
  fill(color);
  stroke(60);
  strokeWeight(1.5);
  rect(card.x, toCanvasY(card.y), CARD_WIDTH, CARD_HEIGHT, 4);
  fill(30);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(18);
  textStyle(BOLD);
  text(card.value, card.x, toCanvasY(card.y));
}

function drawChampionRow(player) {
  const rowY = player === 1 ? PLAYER1_ROW_Y : PLAYER2_ROW_Y;
  const row = player === 1 ? 0 : 1;
  const label = player === 1 ? "Player 1:" : "Player 2:";

  fill(30);
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(14);
  textStyle(NORMAL);
  text(label, PLAYER_LABEL_X, toCanvasY(rowY));

  const half = CHAMPION_IMAGE_SIZE / 2;
  for (let i = 0; i < championImages.length; i++) {
    const cx = FIRST_CHAMPION_X + i * CHAMPION_SPACING;
    const cy = toCanvasY(rowY);
    const state = championStates[i][row];
    const img = championImages[i];

    if (state.selected) {
      noFill();
      stroke("#157e97");
      strokeWeight(3);
      rectMode(CENTER);
      rect(cx, cy, CHAMPION_IMAGE_SIZE + 6, CHAMPION_IMAGE_SIZE + 6, 8);
    }

    push();
    if (state.disabled) {
      tint(150, 150, 150, 120);
    } else {
      noTint();
    }
    imageMode(CENTER);
    image(img, cx, cy, CHAMPION_IMAGE_SIZE, CHAMPION_IMAGE_SIZE);
    pop();
    noTint();
  }
}

function preload() {
  championImages = CHAMPION_FILES.map((file) => loadImage(file));
}

function setup() {
  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  canvas.parent("game-container");
  initChampionStates();
  resetGame();
  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", resetGame);
  }
}

function draw() {
  background(255);
  noTint();

  drawBoard(LEFT_SLOT_CENTERS, LEFT_BOARD_LEFT, LEFT_BOARD_RIGHT);
  drawBoard(RIGHT_SLOT_CENTERS, RIGHT_BOARD_LEFT, RIGHT_BOARD_RIGHT);

  for (const card of cards) {
    drawCard(card);
  }

  drawChampionRow(1);
  drawChampionRow(2);

  fill(30);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(20);
  textStyle(NORMAL);
  if (leftFractionText) {
    text(leftFractionText, LEFT_BOARD_CENTER_X, toCanvasY(FRACTION_LABEL_Y));
  }
  if (rightFractionText) {
    text(rightFractionText, RIGHT_BOARD_CENTER_X, toCanvasY(FRACTION_LABEL_Y));
  }

  updateFractionLabels();
}

function mousePressed() {
  const mx = mouseX;
  const my = toInteractiveY(mouseY);

  if (championHitTest(1, mx, my) || championHitTest(2, mx, my)) {
    return;
  }

  const hit = cardHitTest(mx, my);
  if (hit !== null) {
    draggingCardIndex = hit;
    dragOffsetX = cards[hit].x - mx;
    dragOffsetY = cards[hit].y - my;
  }
}

function mouseDragged() {
  if (draggingCardIndex === null) {
    return;
  }
  const card = cards[draggingCardIndex];
  card.x = mouseX + dragOffsetX;
  card.y = toInteractiveY(mouseY) + dragOffsetY;
}

function mouseReleased() {
  if (draggingCardIndex !== null) {
    snapCard(draggingCardIndex);
    draggingCardIndex = null;
    updateFractionLabels();
  }
}
