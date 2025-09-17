let draggablePoints = []; // array of points that can be dragged
let generalPoints = []; // array of all other points
let currentPoint = null; // point being hovered over/dragged
let draggingPoint = false; // a point is being dragged
let A, B, C, F, P, Q, R;
let checkbox;

function setup() {
  createCanvas(600, 600);

  A = new DraggablePoint(200, 150, "A");
  B = new DraggablePoint(150, 250, "B");
  C = new DraggablePoint(450, 260, "C");

  draggablePoints = [A, B, C];

  checkbox = createCheckbox("Draw Circumcircles");
  checkbox.position(0, 600);
}

function draw() {
  background(255);

  P = rotatePoint(C, PI / 3, B, "P");
  Q = rotatePoint(A, PI / 3, C, "Q");
  R = rotatePoint(B, PI / 3, A, "R");
  F = lineLineIntersect(A, P, B, Q, "F");

  generalPoints = [F, P, Q, R];

  // if a point is being dragged, then focus on that point
  // otherwise, identify the current point
  if (!draggingPoint) {
    currentPoint = null;

    for (let p of draggablePoints) {
      if (p.isMouseOver()) {
        currentPoint = p;
        break;
      }
    }
  }

  // change cursor if there is a current point
  if (currentPoint) {
    cursor(MOVE);
  } else {
    cursor(ARROW);
  }

  // draw large light red circle around every draggable point
  for (let p of draggablePoints) {
    p.drawBack();
  }

  if (checkbox.checked()) {
    drawCircumcircle(B, C, P, "orange");
    drawCircumcircle(C, A, Q, "orange");
    drawCircumcircle(A, B, R, "orange");
  }
  drawTriangle(B, C, P);
  drawTriangle(C, A, Q);
  drawTriangle(A, B, R);
  drawLine(A, P, color(0, 0, 255));
  drawLine(B, Q, color(0, 0, 255));
  drawLine(C, R, color(0, 0, 255));

  // draw and label general points
  for (let p of generalPoints) {
    p.drawPoint();
  }

  // draw small dark red circle around every draggable point
  // draw large dark red circle around the current point
  for (let p of draggablePoints) {
    p.drawFront(p === currentPoint);
  }
}

function mousePressed() {
  if (currentPoint) {
    currentPoint.mouseBeingPressed();
  }
}

function mouseDragged() {
  if (currentPoint) {
    draggingPoint = true;
    currentPoint.mouseBeingDragged();
  }
}

function mouseReleased() {
  draggingPoint = false;
}
