const innerRadius = 4;
const outerRadius = 12;

// POINT CLASSES

class DraggablePoint {
  constructor(x, y, label = "") {
    this.x = x;
    this.y = y;
    this.label = label;

    this.offsetX = 0;
    this.offsetY = 0;
  }

  isMouseOver() {
    return dist(mouseX, mouseY, this.x, this.y) < outerRadius;
  }

  drawBack() {
    noStroke();
    fill(255, 191, 191);
    circle(this.x, this.y, outerRadius * 2);
  }

  drawFront(isCurrentPoint) {
    noStroke();
    fill(255, 0, 0);
    if (isCurrentPoint) {
      circle(this.x, this.y, 2 * outerRadius);
    } else {
      circle(this.x, this.y, 2 * innerRadius);
    }

    textSize(16);
    textStyle(ITALIC);
    text(this.label, this.x + 15, this.y + 20);
  }

  mouseBeingPressed() {
    this.offsetX = mouseX - this.x;
    this.offsetY = mouseY - this.y;
  }

  mouseBeingDragged() {
    this.x = mouseX - this.offsetX;
    this.y = mouseY - this.offsetY;
  }
}

// point that is a function of other points, so cannot be dragged
// pr = radius of point
// col = color
class GeneralPoint {
  constructor(x, y, label = "", col = 0, pr = 2) {
    this.x = x;
    this.y = y;
    this.label = label;
    this.col = col;
    this.pr = pr;
  }

  drawPoint() {
    noStroke();
    fill(this.col);
    circle(this.x, this.y, 2 * this.pr);

    textSize(16);
    textStyle(ITALIC);
    text(this.label, this.x + 5, this.y + 15);
  }
}

// GENERAL FUNCTIONS

// Returns slope of line AB
function slope(A, B) {
  return (A.y - B.y) / (A.x - B.x);
}

// Returns y-intercept of line AB
function yintercept(A, B) {
  return (A.x * B.y - A.y * B.x) / (A.x - B.x);
}

// Returns the intersection of lines AB and CD
function lineLineIntersect(A, B, C, D, label, col, pr) {
  const mab = slope(A, B);
  const kab = yintercept(A, B);
  const mcd = slope(C, D);
  const kcd = yintercept(C, D);
  const px = -(kab - kcd) / (mab - mcd);
  const py = mab * px + kab;
  return new GeneralPoint(px, py, label, col, pr);
}

// Returns the projection of point C onto line AB
function projectPoint(A, B, C, label, col, pr) {
  const u = createVector(C.x - A.x, C.y - A.y);
  const v = createVector(B.x - A.x, B.y - A.y);
  const p = v.mult(u.dot(v) / v.magSq());
  return new GeneralPoint(A.x + p.x, A.y + p.y, label, col, pr);
}

// Returns the orthocenter of triangle ABC
function orthocenter(A, B, C, label, col, pr) {
  const D = projectPoint(B, C, A);
  const E = projectPoint(C, A, B);
  return lineLineIntersect(A, D, B, E, label, col, pr);
}

// DRAWING FUNCTIONS

// Draw line segment AB
function drawLineSegment(A, B, col = 0, weight = 1) {
  stroke(col);
  strokeWeight(weight);
  line(A.x, A.y, B.x, B.y);
}

// Draw line AB
function drawLine(A, B, col = 0, weight = 1) {
  stroke(col);
  strokeWeight(weight);

  if (A.x !== B.x) {
    line(0, yintercept(A, B), width, slope(A, B) * width + yintercept(A, B));
  } else {
    line(A.x, 0, A.x, height);
  }
}
