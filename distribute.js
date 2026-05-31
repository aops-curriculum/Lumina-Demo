/* DISTRIBUTE! — p5 port of curriculum-scriptorium/interactives/sandbox/distribute-set-game.ts */

const CANVAS_W = 720;
const CANVAS_H = 480;
const Y_MIN = 60;
const Y_MAX = 520;

const CARD_WIDTH = 44;
const CARD_HEIGHT = 56;
const GRID_COLS = 4;
const GRID_ROWS = 4;
const GRID_SPACING_X = 52;
const GRID_SPACING_Y = 64;
const GRID_LEFT = 220;
const GRID_BOTTOM = 160;

const GRID_LEFT_EDGE = GRID_LEFT - CARD_WIDTH / 2;
const GRID_RIGHT_EDGE =
  GRID_LEFT + (GRID_COLS - 1) * GRID_SPACING_X + CARD_WIDTH / 2;
const GRID_TOP_ROW_CENTER = GRID_BOTTOM + (GRID_ROWS - 1) * GRID_SPACING_Y;
const GRID_SECOND_ROW_CENTER = GRID_BOTTOM + (GRID_ROWS - 2) * GRID_SPACING_Y;
const GRID_THIRD_ROW_CENTER = GRID_BOTTOM + GRID_SPACING_Y;
const GRID_TOP_EDGE = GRID_TOP_ROW_CENTER + CARD_HEIGHT / 2;
const GRID_BOTTOM_ROW_BOTTOM = GRID_BOTTOM - CARD_HEIGHT / 2;

const PLAYER_CARD_X = 100;
const PLAYER1_Y = GRID_TOP_ROW_CENTER;
const PLAYER2_Y = GRID_SECOND_ROW_CENTER;

const NEW_TARGET_HEIGHT = 32;
const HEADER_ROW_Y = GRID_TOP_EDGE + 28;
const GAME_OVER_Y = HEADER_ROW_Y + 40;
const SCORE_Y = GRID_THIRD_ROW_CENTER;
const RESET_BUTTON_WIDTH = 88;
const RESET_BUTTON_HEIGHT = 32;
const NEW_TARGET_WIDTH = 100;
const NEW_TARGET_X = GRID_RIGHT_EDGE - 100;
const RESET_TOP_Y = GRID_BOTTOM_ROW_BOTTOM + RESET_BUTTON_HEIGHT - 32;

/** Right edge of target label — sits just left of the New Target button on the same row. */
const TARGET_LABEL_X = NEW_TARGET_X - NEW_TARGET_WIDTH - 12;
const TARGET_LABEL_Y = HEADER_ROW_Y;

const GRID_CENTER_X = GRID_LEFT + ((GRID_COLS - 1) * GRID_SPACING_X) / 2;
const GRID_CENTER_Y = GRID_BOTTOM + ((GRID_ROWS - 1) * GRID_SPACING_Y) / 2;

const DECK_SIZE = 40;
const INITIAL_DEAL = GRID_COLS * GRID_ROWS;
const WRONG_FEEDBACK_MS = 900;
const SHAKE_DURATION_MS = 320;

const PLAYER_COLORS = {
  1: { fill: [146, 0, 0], stroke: [146, 0, 0], label: "P1" },
  2: { fill: [120, 60, 140], stroke: [120, 60, 140], label: "P2" },
};

let deck = [];
let target = 0;
let selectedPlayer = null;
let selectedSlotIndices = new Set();
let scores = { 1: 0, 2: 0 };
let gameOver = false;
let feedbackLocked = false;
let wrongFeedbackUntil = 0;
let slots = [];
let shake = null;

function toCanvasY(y) {
  return Y_MAX - y;
}

function toInteractiveY(canvasY) {
  return Y_MAX - canvasY;
}

function toInteractiveX(canvasX) {
  return (canvasX / CANVAS_W) * 720;
}

function slotCenter(row, col) {
  return {
    x: GRID_LEFT + col * GRID_SPACING_X,
    y: GRID_BOTTOM + row * GRID_SPACING_Y,
  };
}

function buildDeck() {
  const d = [];
  for (let n = 1; n <= 10; n++) {
    for (let c = 0; c < 4; c++) {
      d.push(n);
    }
  }
  return d;
}

function shuffle(array) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function isPrime(n) {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

function randomCompositeTwoDigit() {
  const candidates = [];
  for (let n = 10; n <= 99; n++) {
    if (!isPrime(n)) candidates.push(n);
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function isValidDistribution(values, targetValue) {
  const perms = [
    [values[0], values[1], values[2]],
    [values[0], values[2], values[1]],
    [values[1], values[0], values[2]],
    [values[1], values[2], values[0]],
    [values[2], values[0], values[1]],
    [values[2], values[1], values[0]],
  ];
  for (const [x, y, z] of perms) {
    if (x * (y + z) === targetValue) return true;
    if (x * (y - z) === targetValue) return true;
    if (x * (z - y) === targetValue) return true;
  }
  return false;
}

function boardHasValidTriple(values, targetValue) {
  if (values.length < 3) return false;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      for (let k = j + 1; k < values.length; k++) {
        if (
          isValidDistribution([values[i], values[j], values[k]], targetValue)
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function boardValues() {
  return slots.filter((s) => s.value !== null).map((s) => s.value);
}

function cardsDealtFromDeck() {
  return DECK_SIZE - deck.length;
}

function makeSlots() {
  slots = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const { x, y } = slotCenter(row, col);
      slots.push({
        row,
        col,
        centerX: x,
        centerY: y,
        value: null,
        shakeX: 0,
      });
    }
  }
}

function clearSelection() {
  selectedSlotIndices = new Set();
  selectedPlayer = null;
}

function checkGameOver() {
  if (gameOver || cardsDealtFromDeck() < DECK_SIZE) return;
  if (boardHasValidTriple(boardValues(), target)) return;
  gameOver = true;
  clearSelection();
}

function dealIntoSlot(index) {
  if (deck.length === 0) return false;
  const slot = slots[index];
  if (slot.value !== null) return false;
  slot.value = deck.shift();
  checkGameOver();
  return true;
}

function refillEmptySlots() {
  for (let i = 0; i < slots.length; i++) {
    if (deck.length === 0) break;
    dealIntoSlot(i);
  }
}

function removeCardsFromSlots(indices) {
  for (const i of indices) {
    slots[i].value = null;
    slots[i].shakeX = 0;
  }
}

function startShake(indices, onComplete) {
  shake = {
    indices,
    startMs: millis(),
    onComplete,
  };
}

function updateShake() {
  if (!shake) return;
  const t = millis() - shake.startMs;
  if (t >= SHAKE_DURATION_MS) {
    for (const i of shake.indices) {
      slots[i].shakeX = 0;
    }
    const done = shake.onComplete;
    shake = null;
    done();
    return;
  }
  const progress = t / SHAKE_DURATION_MS;
  const amp = 8 * (1 - progress);
  const offset = amp * Math.sin(t * 0.08);
  for (const i of shake.indices) {
    slots[i].shakeX = offset;
  }
}

function handleCorrect(player, indices) {
  scores[player]++;
  removeCardsFromSlots(indices);
  clearSelection();
  checkGameOver();
}

function handleIncorrect(indices) {
  feedbackLocked = true;
  wrongFeedbackUntil = millis() + WRONG_FEEDBACK_MS;
  startShake(indices, () => {
    clearSelection();
    feedbackLocked = false;
  });
}

function maybeEvaluate() {
  if (gameOver || feedbackLocked) return;
  if (selectedSlotIndices.size !== 3 || selectedPlayer === null) return;

  const indices = [...selectedSlotIndices];
  const values = indices.map((i) => slots[i].value);
  if (isValidDistribution(values, target)) {
    handleCorrect(selectedPlayer, indices);
  } else {
    handleIncorrect(indices);
  }
}

function toggleSlotSelection(index) {
  if (gameOver || feedbackLocked) return;
  if (slots[index].value === null) return;

  if (selectedSlotIndices.has(index)) {
    selectedSlotIndices.delete(index);
  } else if (selectedSlotIndices.size < 3) {
    selectedSlotIndices.add(index);
  }
  maybeEvaluate();
}

function selectPlayer(player) {
  if (gameOver || feedbackLocked) return;
  selectedPlayer = player;
  maybeEvaluate();
}

function newTarget() {
  if (gameOver || feedbackLocked) return;
  target = randomCompositeTwoDigit();
  refillEmptySlots();
  clearSelection();
  checkGameOver();
}

function resetGame() {
  deck = shuffle(buildDeck());
  target = randomCompositeTwoDigit();
  selectedPlayer = null;
  selectedSlotIndices = new Set();
  scores = { 1: 0, 2: 0 };
  gameOver = false;
  feedbackLocked = false;
  wrongFeedbackUntil = 0;
  shake = null;
  makeSlots();
  for (let i = 0; i < INITIAL_DEAL; i++) {
    dealIntoSlot(i);
  }
}

function newTargetButtonBounds() {
  return {
    left: NEW_TARGET_X - NEW_TARGET_WIDTH,
    right: NEW_TARGET_X,
    bottom: HEADER_ROW_Y - NEW_TARGET_HEIGHT / 2,
    top: HEADER_ROW_Y + NEW_TARGET_HEIGHT / 2,
  };
}

function resetButtonBounds() {
  return {
    left: PLAYER_CARD_X - RESET_BUTTON_WIDTH / 2,
    right: PLAYER_CARD_X + RESET_BUTTON_WIDTH / 2,
    bottom: RESET_TOP_Y - RESET_BUTTON_HEIGHT,
    top: RESET_TOP_Y,
  };
}

function playerCardBounds(playerY) {
  return {
    left: PLAYER_CARD_X - CARD_WIDTH / 2,
    right: PLAYER_CARD_X + CARD_WIDTH / 2,
    bottom: playerY - CARD_HEIGHT / 2,
    top: playerY + CARD_HEIGHT / 2,
  };
}

function pointInRect(x, y, rect) {
  return (
    x >= rect.left && x <= rect.right && y >= rect.bottom && y <= rect.top
  );
}

function gridCardHit(mx, my) {
  for (let i = slots.length - 1; i >= 0; i--) {
    const slot = slots[i];
    if (slot.value === null) continue;
    const cx = slot.centerX + slot.shakeX;
    const rect = {
      left: cx - CARD_WIDTH / 2,
      right: cx + CARD_WIDTH / 2,
      bottom: slot.centerY - CARD_HEIGHT / 2,
      top: slot.centerY + CARD_HEIGHT / 2,
    };
    if (pointInRect(mx, my, rect)) return i;
  }
  return null;
}

function drawCardRect(cx, cy, fillColor, strokeColor, strokeWeightVal, label) {
  const cyCanvas = toCanvasY(cy);
  rectMode(CENTER);
  fill(...fillColor);
  stroke(...strokeColor);
  strokeWeight(strokeWeightVal);
  rect(cx, cyCanvas, CARD_WIDTH, CARD_HEIGHT, 4);
  if (label !== undefined) {
    fill(30);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(18);
    textStyle(BOLD);
    text(label, cx, cyCanvas);
  }
}

function drawButton(label, bounds, disabled) {
  const cx = (bounds.left + bounds.right) / 2;
  const cy = (bounds.bottom + bounds.top) / 2;
  const w = bounds.right - bounds.left;
  const h = bounds.top - bounds.bottom;
  const cyCanvas = toCanvasY(cy);

  rectMode(CENTER);
  if (disabled) {
    fill(150, 170, 190);
  } else {
    fill(41, 93, 128);
  }
  stroke(255);
  strokeWeight(2);
  rect(cx, cyCanvas, w, h, 6);

  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(14);
  textStyle(NORMAL);
  text(label, cx, cyCanvas);
}

function drawSelectionRing(cx, cy, color) {
  const pad = 5;
  const cyCanvas = toCanvasY(cy);
  noFill();
  stroke(...color);
  strokeWeight(3);
  rectMode(CENTER);
  rect(cx, cyCanvas, CARD_WIDTH + pad * 2, CARD_HEIGHT + pad * 2, 6);
}

function gameOverText() {
  if (!gameOver) return "";
  if (scores[1] > scores[2]) return "Game over — P1 wins!";
  if (scores[2] > scores[1]) return "Game over — P2 wins!";
  return "Game over — tie!";
}

function setup() {
  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  canvas.parent("game-container");
  resetGame();
}

function draw() {
  background(255);
  updateShake();

  fill(30);
  noStroke();
  textAlign(CENTER, CENTER);

  const overText = gameOverText();
  if (overText) {
    textSize(20);
    textStyle(BOLD);
    text(overText, GRID_CENTER_X, toCanvasY(GAME_OVER_Y));
  }

  fill(30);
  textAlign(RIGHT, CENTER);
  textSize(22);
  textStyle(BOLD);
  text(`Target: ${target}`, TARGET_LABEL_X, toCanvasY(TARGET_LABEL_Y));

  drawButton("New Target", newTargetButtonBounds(), gameOver || feedbackLocked);

  if (selectedPlayer === 1) {
    drawSelectionRing(PLAYER_CARD_X, PLAYER1_Y, PLAYER_COLORS[1].stroke);
  }
  if (selectedPlayer === 2) {
    drawSelectionRing(PLAYER_CARD_X, PLAYER2_Y, PLAYER_COLORS[2].stroke);
  }

  for (const player of [1, 2]) {
    const py = player === 1 ? PLAYER1_Y : PLAYER2_Y;
    const colors = PLAYER_COLORS[player];
    const selected = selectedPlayer === player;
    drawCardRect(
      PLAYER_CARD_X,
      py,
      selected ? colors.fill : [255, 255, 255],
      colors.stroke,
      selected ? 3 : 1.5,
      colors.label,
    );
  }

  drawButton("Reset", resetButtonBounds(), false);

  fill(30);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  textStyle(NORMAL);
  text(`P1: ${scores[1]}\nP2: ${scores[2]}`, PLAYER_CARD_X, toCanvasY(SCORE_Y));

  for (const slot of slots) {
    noFill();
    stroke(180);
    strokeWeight(1);
    rectMode(CENTER);
    rect(slot.centerX, toCanvasY(slot.centerY), CARD_WIDTH, CARD_HEIGHT, 4);
  }

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (slot.value === null) continue;
    const cx = slot.centerX + slot.shakeX;
    const selected = selectedSlotIndices.has(i);
    drawCardRect(
      cx,
      slot.centerY,
      selected ? [255, 180, 80] : [201, 236, 240],
      selected ? [200, 100, 0] : [60, 60, 60],
      selected ? 3 : 1.5,
      slot.value,
    );
  }

  if (millis() < wrongFeedbackUntil) {
    fill(200, 0, 0);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(72);
    textStyle(BOLD);
    text("✕", GRID_CENTER_X, toCanvasY(GRID_CENTER_Y));
  }
}

function mousePressed() {
  const mx = toInteractiveX(mouseX);
  const my = toInteractiveY(mouseY);

  if (pointInRect(mx, my, resetButtonBounds())) {
    resetGame();
    return;
  }

  if (pointInRect(mx, my, newTargetButtonBounds())) {
    newTarget();
    return;
  }

  if (gameOver || feedbackLocked) return;

  if (pointInRect(mx, my, playerCardBounds(PLAYER1_Y))) {
    selectPlayer(1);
    return;
  }
  if (pointInRect(mx, my, playerCardBounds(PLAYER2_Y))) {
    selectPlayer(2);
    return;
  }

  const hit = gridCardHit(mx, my);
  if (hit !== null) {
    toggleSlotSelection(hit);
  }
}
