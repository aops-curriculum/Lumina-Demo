let draggablePoints = []; // array of points that can be dragged
let generalPoints = []; // array of all other points
let currentPoint = null; // point being hovered over/dragged
let draggingPoint = false; // a point is being dragged
let A, B, C, D, E, F, H;

function setup() {
  createCanvas(600, 600);

  A = new DraggablePoint(150, 400, "A");
  B = new DraggablePoint(400, 100, "B");
  C = new DraggablePoint(450, 410, "C");

  draggablePoints = [A, B, C];
}

function draw() {
  background(255);

  D = projectPoint(B, C, A);
  E = projectPoint(C, A, B);
  F = projectPoint(A, B, C);
  H = orthocenter(A, B, C, "H");
  generalPoints = [D, E, F, H];

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

  drawLine(A, D, "orange");
  drawLine(B, E, "orange");
  drawLine(C, F, "orange");
  drawLine(A, B);
  drawLine(A, C);
  drawLine(B, C);

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
