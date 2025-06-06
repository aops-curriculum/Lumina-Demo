const innerRadius = 4;
const outerRadius = 12;

// POINT CLASSES

// general point that can be dragged
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

// Returns the point on line AB so that AP:AB = t
function interpPoint(A, B, t, label, col, pr) {
  return new GeneralPoint(
    A.x + t * (B.x - A.x),
    A.y + t * (B.y - A.y),
    label,
    col,
    pr
  );
}

// Returns the projection of point C onto line AB
function projectPoint(A, B, C, label, col, pr) {
  const u = createVector(C.x - A.x, C.y - A.y);
  const v = createVector(B.x - A.x, B.y - A.y);
  const p = v.mult(u.dot(v) / v.magSq());
  return new GeneralPoint(A.x + p.x, A.y + p.y, label, col, pr);
}

// Returns the point on line AB so that AP:AB = t
function reflectPoint(A, B, C, label, col, pr) {
  const P = projectPoint(A, B, C, label);
  return new GeneralPoint(2 * P.x - C.x, 2 * P.y - C.y, label, col, pr);
}

// Returns the point when P is rotated around C by an angle of t counter-clockwise
// There is a negative sign in -t, because the y-coordinate is flipped in the canvas
function rotatePoint(C, t, P, label, col, pr) {
  return new GeneralPoint(
    (P.x - C.x) * cos(-t) - (P.y - C.y) * sin(-t) + C.x,
    (P.x - C.x) * sin(-t) + (P.y - C.y) * cos(-t) + C.y,
    label,
    col,
    pr
  );
}

// Returns the area of triangle ABC
function area(A, B, C) {
  return abs(signedArea(A, B, C));
}

// Returns the signed area of triangle ABC
function signedArea(A, B, C) {
  return (
    (A.x * B.y + B.x * C.y + C.x * A.y - A.y * B.x - B.y * C.x - C.y * A.x) / 2
  );
}

// Returns the perimeter of triangle ABC
function perimeter(A, B, C) {
  return (
    dist(A.x, A.y, B.x, B.y) +
    dist(B.x, B.y, C.x, C.y) +
    dist(C.x, C.y, A.x, A.y)
  );
}

// Returns the semi-perimeter of triangle ABC
function semiperimeter(A, B, C) {
  return perimeter(A, B, C) / 2;
}

// Returns angle <ABC
function angle(A, B, C) {
  const u = createVector(A.x - B.x, A.y - B.y);
  const v = createVector(C.x - B.x, C.y - B.y);
  return abs(u.angleBetween(v));
}

// Returns the orthocenter of triangle ABC
function orthocenter(A, B, C, label, col, pr) {
  const D = projectPoint(B, C, A);
  const E = projectPoint(C, A, B);
  return lineLineIntersect(A, D, B, E, label, col, pr);
}

// Returns the circumadius of triangle ABC
function circumradius(A, B, C) {
  return dist(B.x, B.y, C.x, C.y) / (2 * sin(angle(B, A, C)));
}

// Returns the circumcenter of triangle ABC
function circumcenter(A, B, C, label, col, pr) {
  const D = interpPoint(B, C, 1 / 2);
  const E = interpPoint(C, A, 1 / 2);
  const F = interpPoint(A, B, 1 / 2);
  return orthocenter(D, E, F, label, col, pr);
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

// Draw triangle ABC
function drawTriangle(A, B, C, col, weight) {
  drawLineSegment(A, B, col, weight);
  drawLineSegment(A, C, col, weight);
  drawLineSegment(B, C, col, weight);
}

// Draw the circle centered at (x,y) with radius r
function drawCircle(x, y, r, col = 0, weight = 1) {
  noFill();
  stroke(col);
  strokeWeight(weight);
  circle(x, y, 2 * r);
}

// Draw the circumcircle of triangle ABC
function drawCircumcircle(A, B, C, col, weight) {
  const O = circumcenter(A, B, C);
  const R = circumradius(A, B, C);
  drawCircle(O.x, O.y, R, col, weight);
}
