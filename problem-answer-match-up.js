/* Problem–Answer Match-Up — p5/html port of
   curriculum-scriptorium/interactives/sandbox/problem-answer-match-up.ts */

const PROBLEM_COUNT = 16;
const MIN_STUDENTS = 2;
const MAX_STUDENTS = PROBLEM_COUNT;

const CANVAS_W = 780;
const CANVAS_H_MIN = 120;

const DEFAULT_STUDENT_NAMES = [
  "Alex",
  "Bri",
  "Cam",
  "Dee",
  "Eli",
  "Finn",
  "Gia",
  "Hugo",
  "Ivy",
  "Jae",
  "Kai",
  "Luz",
  "Max",
  "Nia",
  "Omar",
  "Paz",
].join("\n");

const DEFAULT_ANSWERS = [
  "56",
  "38",
  "8",
  "81",
  "63",
  "15",
  "6",
  "8",
  "120",
  "12",
  "36",
  "7",
  "28",
  "1/2",
  "180",
  "132",
].join("\n");

const COLORS = {
  cardFill: [248, 254, 255],
  cardStroke: [156, 219, 225],
  name: [21, 126, 151],
  text: [23, 23, 23],
  muted: [69, 69, 69],
  hint: [69, 69, 69],
};

let state = {
  assignments: [],
  answers: [],
  generated: false,
  showKey: false,
};

let namesInput;
let answersInput;
let errorEl;
let showKeyCheckbox;
let canvasHeight = CANVAS_H_MIN;

function parseStudentNames(raw) {
  return raw
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, MAX_STUDENTS);
}

function parseAnswers(raw) {
  const lines = raw
    .split("\n")
    .map((part) => part.trim())
    .slice(0, PROBLEM_COUNT);
  while (lines.length < PROBLEM_COUNT) {
    lines.push("");
  }
  return lines;
}

function shuffle(array) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function fixAnswerFixedPoints(problemIndices, answerIndices) {
  const n = problemIndices.length;
  for (let i = 0; i < n; i++) {
    if (answerIndices[i] === problemIndices[i]) {
      let swapped = false;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const ai = answerIndices[i];
        const aj = answerIndices[j];
        const pi = problemIndices[i];
        const pj = problemIndices[j];
        if (aj !== pi && ai !== pj) {
          answerIndices[i] = aj;
          answerIndices[j] = ai;
          swapped = true;
          break;
        }
      }
      if (!swapped) {
        throw new Error("Could not assign distinct problem/answer pairs.");
      }
    }
  }
}

function assignStudents(names) {
  const n = names.length;
  const activeProblems = shuffle(
    Array.from({ length: PROBLEM_COUNT }, (_, i) => i),
  ).slice(0, n);
  const problemIndices = shuffle(activeProblems);
  const answerIndices = shuffle(activeProblems.slice());
  fixAnswerFixedPoints(problemIndices, answerIndices);

  return problemIndices.map((problemIdx, i) => ({
    name: names[i],
    problemIdx,
    answerIdx: answerIndices[i],
  }));
}

function findAnswerHolder(assignments, problemIdx) {
  const match = assignments.find((a) => a.answerIdx === problemIdx);
  return match ? match.name : null;
}

function findProblemHolder(assignments, answerIdx) {
  const match = assignments.find((a) => a.problemIdx === answerIdx);
  return match ? match.name : null;
}

function problemNumber(problemIdx) {
  return problemIdx + 1;
}

function computeCanvasHeight() {
  if (!state.generated) {
    return CANVAS_H_MIN;
  }

  const margin = 12;
  const cardW = 170;
  const cardH = state.showKey ? 118 : 96;
  const gap = 10;
  const cols = Math.max(1, Math.floor((CANVAS_W - margin * 2) / (cardW + gap)));
  const rows = Math.ceil(state.assignments.length / cols);
  const gridH = rows * cardH + Math.max(0, rows - 1) * gap;
  const keyH = state.showKey
    ? 34 + state.assignments.length * 18 + 20
    : 0;
  return Math.max(CANVAS_H_MIN, margin + gridH + keyH + margin);
}

function resizeCanvasToContent() {
  const nextH = computeCanvasHeight();
  if (Math.abs(nextH - canvasHeight) > 1) {
    canvasHeight = nextH;
    resizeCanvas(CANVAS_W, canvasHeight);
  }
}

function setError(message) {
  errorEl.textContent = message;
}

function renderCardsArea() {
  background(255);

  if (!state.generated) {
    fill(...COLORS.hint);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    text(
      "Student cards will appear here after you generate assignments.",
      CANVAS_W / 2,
      canvasHeight / 2,
    );
    return;
  }

  const margin = 12;
  const cardW = 170;
  const cardH = state.showKey ? 118 : 96;
  const gap = 10;
  const cols = Math.max(1, Math.floor((CANVAS_W - margin * 2) / (cardW + gap)));

  let x = margin;
  let y = margin;
  let col = 0;

  for (const assignment of state.assignments) {
    drawStudentCard(x, y, cardW, cardH, assignment);

    col++;
    if (col >= cols) {
      col = 0;
      x = margin;
      y += cardH + gap;
    } else {
      x += cardW + gap;
    }
  }

  if (state.showKey) {
    const keyTop = y + (col > 0 ? cardH + 20 : 8);
    drawAnswerKey(margin, keyTop, CANVAS_W - margin * 2);
  }
}

function drawStudentCard(x, y, w, h, assignment) {
  fill(...COLORS.cardFill);
  stroke(...COLORS.cardStroke);
  strokeWeight(1);
  rect(x, y, w, h, 8);

  const cx = x + w / 2;
  let ty = y + 14;

  fill(...COLORS.name);
  noStroke();
  textAlign(CENTER, TOP);
  textStyle(BOLD);
  textSize(16);
  text(assignment.name, cx, ty);

  ty += 28;
  fill(...COLORS.text);
  textStyle(NORMAL);
  textSize(15);
  text(`Problem #${problemNumber(assignment.problemIdx)}`, cx, ty);

  ty += 22;
  textStyle(BOLD);
  const answerText =
    state.answers[assignment.answerIdx]?.trim() || "(no answer)";
  text(`Answer: ${answerText}`, cx, ty);

  if (state.showKey) {
    ty += 24;
    textStyle(NORMAL);
    textSize(12);
    fill(...COLORS.muted);
    const answerHolder = findAnswerHolder(
      state.assignments,
      assignment.problemIdx,
    );
    const problemHolder = findProblemHolder(
      state.assignments,
      assignment.answerIdx,
    );
    text(
      `Find: ${answerHolder ?? "?"} & ${problemHolder ?? "?"}`,
      cx,
      ty,
    );
  }
}

function drawAnswerKey(x, y, w) {
  stroke(225, 226, 228);
  strokeWeight(1);
  line(x, y, x + w, y);

  fill(...COLORS.text);
  noStroke();
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(15);
  text("Teacher answer key", x, y + 10);

  textStyle(NORMAL);
  textSize(13);
  let lineY = y + 34;
  for (const assignment of state.assignments) {
    const answerHolder = findAnswerHolder(
      state.assignments,
      assignment.problemIdx,
    );
    const problemHolder = findProblemHolder(
      state.assignments,
      assignment.answerIdx,
    );
    const line =
      `${assignment.name}: find ${answerHolder ?? "?"} ` +
      `(answer to problem #${problemNumber(assignment.problemIdx)}) and ` +
      `${problemHolder ?? "?"} ` +
      `(problem #${problemNumber(assignment.answerIdx)}).`;
    text(line, x + 8, lineY, w - 16, 36);
    lineY += 18;
  }
}

function tryGenerate() {
  const names = parseStudentNames(namesInput.value);
  const answers = parseAnswers(answersInput.value);
  const missingAnswers = answers
    .map((answer, index) => (answer.length === 0 ? index + 1 : null))
    .filter((n) => n !== null);

  if (names.length < MIN_STUDENTS) {
    state.generated = false;
    state.assignments = [];
    setError(`Enter at least ${MIN_STUDENTS} student names or initials.`);
    resizeCanvasToContent();
    return;
  }

  if (missingAnswers.length > 0) {
    state.generated = false;
    state.assignments = [];
    setError(
      `Enter an answer for problem${missingAnswers.length === 1 ? "" : "s"} ${missingAnswers.join(", ")}.`,
    );
    resizeCanvasToContent();
    return;
  }

  state = {
    assignments: assignStudents(names),
    answers,
    generated: true,
    showKey: showKeyCheckbox.checked,
  };
  setError("");
  resizeCanvasToContent();
}

function resetApp() {
  namesInput.value = DEFAULT_STUDENT_NAMES;
  answersInput.value = DEFAULT_ANSWERS;
  showKeyCheckbox.checked = false;
  state = {
    assignments: [],
    answers: parseAnswers(DEFAULT_ANSWERS),
    generated: false,
    showKey: false,
  };
  setError("");
  resizeCanvasToContent();
}

function setup() {
  const canvas = createCanvas(CANVAS_W, canvasHeight);
  canvas.parent("game-container");

  namesInput = document.getElementById("names-input");
  answersInput = document.getElementById("answers-input");
  errorEl = document.getElementById("error");
  showKeyCheckbox = document.getElementById("show-key");

  namesInput.value = DEFAULT_STUDENT_NAMES;
  answersInput.value = DEFAULT_ANSWERS;

  document.getElementById("generate-btn").addEventListener("click", tryGenerate);
  document.getElementById("reset-btn").addEventListener("click", resetApp);
  showKeyCheckbox.addEventListener("change", () => {
    state.showKey = showKeyCheckbox.checked;
    resizeCanvasToContent();
  });
}

function draw() {
  renderCardsArea();
}
