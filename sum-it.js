/* Sum-It! — p5 port of curriculum-scriptorium/interactives/sandbox/Sum-It.ts */

const CANVAS_W = 720;
const CANVAS_H = 480;
const Y_MIN = 60;
const Y_MAX = 500;

const CARD_WIDTH = 44;
const CARD_HEIGHT = 56;
const FACE_UP_COUNT = 5;
const DECK_SIZE = 40;
const CARD_SPACING = 52;
const ROW_CENTER_X = 360;
const ROW_Y = 280;
const HEADER_Y = 460;
const STATUS_Y = 400;
const CLAIM_BUTTON_Y = 200;
const DISCARD_X = 80;
const DISCARD_Y = 280;
const WRONG_FEEDBACK_MS = 900;
const SHAKE_DURATION_MS = 320;

const CLAIM_BUTTON_WIDTH = 88;
const CLAIM_BUTTON_HEIGHT = 32;
const RESET_BUTTON_WIDTH = 88;
const RESET_BUTTON_HEIGHT = 32;
const RESET_X = 640;
const RESET_Y = 460;
const SHOW_USED_BUTTON_WIDTH = 100;
const SHOW_USED_BUTTON_HEIGHT = 32;
const SHOW_USED_X = DISCARD_X;
const SHOW_USED_Y = 160;
const USED_CARDS_PANEL_CY = 90;
const USED_CARDS_PANEL_W = 170;
const USED_CARDS_PANEL_H = 104;
const INSTRUCTIONS_BUTTON_WIDTH = 100;
const INSTRUCTIONS_BUTTON_HEIGHT = 32;
const INSTRUCTIONS_X = 640;
const INSTRUCTIONS_Y = SHOW_USED_Y;
const INSTRUCTIONS_PANEL_CX = 560;
const INSTRUCTIONS_PANEL_CY = 90;
const INSTRUCTIONS_PANEL_W = 310;
const INSTRUCTIONS_PANEL_H = 104;
const OVERLAY_PANEL_EDGE_MARGIN =
  CANVAS_W - (INSTRUCTIONS_PANEL_CX + INSTRUCTIONS_PANEL_W / 2);
const USED_CARDS_PANEL_CX = OVERLAY_PANEL_EDGE_MARGIN + USED_CARDS_PANEL_W / 2;

const INSTRUCTIONS_TEXT = [
  "How to Play",
  "",
  "• Five cards (values 1–10) are dealt face up from a shuffled deck of 40.",
  "• Select a subset whose values combine with + and − (any order, parentheses allowed) to equal the Target.",
  "• Click cards to select them, then press Claim.",
  "• Correct claims discard those cards and deal replacements. The Target then increases by 1.",
  "• If no subset can make the Target, the game ends. Score = (highest target completed) × (cards used).",
  "• Sum-it! win: complete Target 10 using all 40 cards (score 400).",
  "• You may continue past Target 10 if cards remain.",
].join("\n");

let deck = [];
let discardPile = [];
let showUsedCards = false;
let showInstructions = false;
let target = 1;
let cardsUsed = 0;
let gameOver = false;
let won = false;
let score = 0;
let feedbackLocked = false;
let wrongFeedbackUntil = 0;
let selectedSlotIndices = new Set();
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

function slotCenterX(index) {
  const startX = ROW_CENTER_X - ((FACE_UP_COUNT - 1) * CARD_SPACING) / 2;
  return startX + index * CARD_SPACING;
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

function formatUsedCardsList(values) {
  return [...values].sort((a, b) => b - a).join(", ");
}

function overlayPanelBoundsCanvas(cx, cy, width, height) {
  const cyCanvas = toCanvasY(cy);
  return {
    left: cx - width / 2,
    top: cyCanvas - height / 2,
    width,
    height,
  };
}

function syncOverlayPanel(elementId, visible, text, resetScroll) {
  const panel = document.getElementById(elementId);
  if (!panel) {
    return;
  }

  panel.style.display = visible ? "block" : "none";
  panel.setAttribute("aria-hidden", visible ? "false" : "true");

  if (!visible) {
    return;
  }

  if (panel.textContent !== text) {
    panel.textContent = text;
    if (resetScroll) {
      panel.scrollTop = 0;
    }
  }
}

function syncUsedCardsPanel(resetScroll = false) {
  const bounds = overlayPanelBoundsCanvas(
    USED_CARDS_PANEL_CX,
    USED_CARDS_PANEL_CY,
    USED_CARDS_PANEL_W,
    USED_CARDS_PANEL_H,
  );
  const panel = document.getElementById("used-cards-panel");
  if (!panel) {
    return;
  }

  panel.style.left = `${bounds.left}px`;
  panel.style.top = `${bounds.top}px`;
  panel.style.width = `${bounds.width}px`;
  panel.style.height = `${bounds.height}px`;

  const visible = showUsedCards && discardPile.length > 0;
  syncOverlayPanel(
    "used-cards-panel",
    visible,
    visible ? formatUsedCardsList(discardPile) : "",
    resetScroll,
  );
}

function setShowUsedCards(next) {
  const wasOpen = showUsedCards;
  showUsedCards = next;
  syncUsedCardsPanel(!wasOpen && next);
}

function syncInstructionsPanel(resetScroll = false) {
  const bounds = overlayPanelBoundsCanvas(
    INSTRUCTIONS_PANEL_CX,
    INSTRUCTIONS_PANEL_CY,
    INSTRUCTIONS_PANEL_W,
    INSTRUCTIONS_PANEL_H,
  );
  const panel = document.getElementById("instructions-panel");
  if (!panel) {
    return;
  }

  panel.style.left = `${bounds.left}px`;
  panel.style.top = `${bounds.top}px`;
  panel.style.width = `${bounds.width}px`;
  panel.style.height = `${bounds.height}px`;

  syncOverlayPanel(
    "instructions-panel",
    showInstructions,
    showInstructions ? INSTRUCTIONS_TEXT : "",
    resetScroll,
  );
}

function setShowInstructions(next) {
  const wasOpen = showInstructions;
  showInstructions = next;
  syncInstructionsPanel(!wasOpen && next);
}

function allExpressionValues(nums) {
  const n = nums.length;
  if (n === 0) return new Set();
  if (n === 1) return new Set([nums[0]]);
  const results = new Set();
  for (let split = 1; split < n; split++) {
    const left = allExpressionValues(nums.slice(0, split));
    const right = allExpressionValues(nums.slice(split));
    for (const l of left) {
      for (const r of right) {
        results.add(l + r);
        results.add(l - r);
      }
    }
  }
  return results;
}

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) {
      result.push([arr[i], ...p]);
    }
  }
  return result;
}

function subsetCanMakeTarget(values, targetValue) {
  for (const perm of permutations(values)) {
    if (allExpressionValues(perm).has(targetValue)) return true;
  }
  return false;
}

function boardCanMakeTarget(values, targetValue) {
  const n = values.length;
  if (n === 0) return false;
  for (let mask = 1; mask < 1 << n; mask++) {
    const subset = values.filter((_, i) => mask & (1 << i));
    if (subsetCanMakeTarget(subset, targetValue)) return true;
  }
  return false;
}

function makeSlots() {
  slots = [];
  for (let i = 0; i < FACE_UP_COUNT; i++) {
    slots.push({
      centerX: slotCenterX(i),
      centerY: ROW_Y,
      value: null,
      shakeX: 0,
    });
  }
}

function faceUpValues() {
  return slots.filter((s) => s.value !== null).map((s) => s.value);
}

function clearSelection() {
  selectedSlotIndices = new Set();
}

function endGame(completedTarget) {
  gameOver = true;
  score = completedTarget * cardsUsed;
  clearSelection();
}

function checkBlocked() {
  if (gameOver || won) return;
  if (boardCanMakeTarget(faceUpValues(), target)) return;
  endGame(target - 1);
}

function dealIntoSlot(index) {
  if (deck.length === 0) return false;
  const slot = slots[index];
  if (slot.value !== null) return false;
  slot.value = deck.shift();
  return true;
}

function refillFaceUp() {
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

function handleCorrect(indices) {
  discardPile.push(...indices.map((i) => slots[i].value));
  cardsUsed += indices.length;
  removeCardsFromSlots(indices);
  clearSelection();
  refillFaceUp();

  const completedTarget = target;
  target++;

  if (completedTarget === 10 && cardsUsed === DECK_SIZE) {
    won = true;
    score = completedTarget * cardsUsed;
    gameOver = true;
    syncUsedCardsPanel();
    return;
  }

  checkBlocked();
  syncUsedCardsPanel();
}

function handleIncorrect(indices) {
  feedbackLocked = true;
  wrongFeedbackUntil = millis() + WRONG_FEEDBACK_MS;
  startShake(indices, () => {
    clearSelection();
    feedbackLocked = false;
  });
}

function toggleSlotSelection(index) {
  if (gameOver || won || feedbackLocked || showInstructions) return;
  if (slots[index].value === null) return;

  if (selectedSlotIndices.has(index)) {
    selectedSlotIndices.delete(index);
  } else {
    selectedSlotIndices.add(index);
  }
}

function handleClaim() {
  if (
    gameOver ||
    won ||
    feedbackLocked ||
    showInstructions ||
    selectedSlotIndices.size === 0
  )
    return;

  const indices = [...selectedSlotIndices];
  const values = indices.map((i) => slots[i].value);

  if (subsetCanMakeTarget(values, target)) {
    handleCorrect(indices);
  } else {
    handleIncorrect(indices);
  }
}

function resetGame() {
  deck = shuffle(buildDeck());
  discardPile = [];
  setShowUsedCards(false);
  setShowInstructions(false);
  target = 1;
  cardsUsed = 0;
  gameOver = false;
  won = false;
  score = 0;
  feedbackLocked = false;
  wrongFeedbackUntil = 0;
  selectedSlotIndices = new Set();
  shake = null;
  makeSlots();
  for (let i = 0; i < FACE_UP_COUNT; i++) {
    dealIntoSlot(i);
  }
  checkBlocked();
}

function claimButtonBounds() {
  return {
    left: ROW_CENTER_X - CLAIM_BUTTON_WIDTH / 2,
    right: ROW_CENTER_X + CLAIM_BUTTON_WIDTH / 2,
    bottom: CLAIM_BUTTON_Y - CLAIM_BUTTON_HEIGHT / 2,
    top: CLAIM_BUTTON_Y + CLAIM_BUTTON_HEIGHT / 2,
  };
}

function resetButtonBounds() {
  return {
    left: RESET_X - RESET_BUTTON_WIDTH / 2,
    right: RESET_X + RESET_BUTTON_WIDTH / 2,
    bottom: RESET_Y - RESET_BUTTON_HEIGHT / 2,
    top: RESET_Y + RESET_BUTTON_HEIGHT / 2,
  };
}

function showUsedButtonBounds() {
  return {
    left: SHOW_USED_X - SHOW_USED_BUTTON_WIDTH / 2,
    right: SHOW_USED_X + SHOW_USED_BUTTON_WIDTH / 2,
    bottom: SHOW_USED_Y - SHOW_USED_BUTTON_HEIGHT / 2,
    top: SHOW_USED_Y + SHOW_USED_BUTTON_HEIGHT / 2,
  };
}

function instructionsButtonBounds() {
  return {
    left: INSTRUCTIONS_X - INSTRUCTIONS_BUTTON_WIDTH / 2,
    right: INSTRUCTIONS_X + INSTRUCTIONS_BUTTON_WIDTH / 2,
    bottom: INSTRUCTIONS_Y - INSTRUCTIONS_BUTTON_HEIGHT / 2,
    top: INSTRUCTIONS_Y + INSTRUCTIONS_BUTTON_HEIGHT / 2,
  };
}

function pointInRect(x, y, rect) {
  return (
    x >= rect.left && x <= rect.right && y >= rect.bottom && y <= rect.top
  );
}

function faceUpCardHit(mx, my) {
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

function statusText() {
  if (won) return `Sum-it! Score: ${score}`;
  if (gameOver) return `Game over — Score: ${score}`;
  return "";
}

function setup() {
  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  canvas.parent("game-stage");
  syncUsedCardsPanel();
  syncInstructionsPanel();
  resetGame();
}

function draw() {
  background(255);
  updateShake();

  fill(30);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(22);
  textStyle(BOLD);
  text(
    `Target: ${target}    Cards Used: ${cardsUsed}/${DECK_SIZE}`,
    ROW_CENTER_X,
    toCanvasY(HEADER_Y),
  );

  const status = statusText();
  if (status) {
    textSize(20);
    textStyle(BOLD);
    text(status, ROW_CENTER_X, toCanvasY(STATUS_Y));
  }

  fill(30);
  textSize(16);
  textStyle(NORMAL);
  text(`Discard\n(${cardsUsed}/${DECK_SIZE})`, DISCARD_X, toCanvasY(DISCARD_Y + 40));

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
      String(slot.value),
    );
  }

  if (millis() < wrongFeedbackUntil) {
    fill(200, 0, 0);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(72);
    textStyle(BOLD);
    text("✕", ROW_CENTER_X, toCanvasY(ROW_Y));
  }

  drawButton(
    "Claim",
    claimButtonBounds(),
    gameOver ||
      won ||
      feedbackLocked ||
      showInstructions ||
      selectedSlotIndices.size === 0,
  );
  drawButton("Reset", resetButtonBounds(), false);
  drawButton(
    showInstructions ? "Hide Rules" : "Instructions",
    instructionsButtonBounds(),
    false,
  );
  drawButton(
    showUsedCards ? "Hide Used" : "Show Used",
    showUsedButtonBounds(),
    showInstructions,
  );
}

function mousePressed() {
  const mx = toInteractiveX(mouseX);
  const my = toInteractiveY(mouseY);

  if (pointInRect(mx, my, resetButtonBounds())) {
    resetGame();
    return;
  }

  if (pointInRect(mx, my, instructionsButtonBounds())) {
    setShowInstructions(!showInstructions);
    return;
  }

  if (showInstructions) {
    return;
  }

  if (pointInRect(mx, my, showUsedButtonBounds())) {
    setShowUsedCards(!showUsedCards);
    return;
  }

  if (pointInRect(mx, my, claimButtonBounds())) {
    handleClaim();
    return;
  }

  if (gameOver || won || feedbackLocked) return;

  const hit = faceUpCardHit(mx, my);
  if (hit !== null) {
    toggleSlotSelection(hit);
  }
}
