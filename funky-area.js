let square;
let attachedSemis = [];
let draggingShape = null;
let offsetX, offsetY;
let rotating = false;
let rotateStart;
let snappedSemis = [];
let confettiParticles = [];
let confettiTimer = 0;
let confettiDuration = 240;
let confettiActive = false;
let confettiAlreadyTriggered = false;
let snapDistance = 25;
let snapAngleThreshold = 20;

function setup() {
  createCanvas(600, 600);
  angleMode(DEGREES);
  square = new Shape(width / 2, height / 2, 0, true);
  let side = 220;
  let x = width / 2;
  let y = height / 2;
  attachedSemis.push(new Shape(x, y - side / 2, 180, false));
  attachedSemis.push(new Shape(x, y + side / 2, 0, false));
}

function draw() {
  background(255);
  square.displaySquareWithCutouts();

  for (let s of attachedSemis) {
    s.displaySemicircle();
  }
  let bothSnapped = attachedSemis.every((semi) => semi.snapped);
  if (bothSnapped && !confettiActive && !confettiAlreadyTriggered) {
    triggerConfetti();
    confettiAlreadyTriggered = true;
  }
  if (confettiActive) {
    drawConfetti();
    confettiTimer--;
    if (confettiTimer <= 0) {
      confettiActive = false;
      confettiParticles = [];
    }
  }

}
function triggerConfetti() {
  confettiActive = true;
  confettiTimer = confettiDuration;
  for (let i = 0; i < 100; i++) {
    confettiParticles.push({
      x: random(width),
      y: random(-200, 0),
      vx: random(-1, 1),
      vy: random(2, 5),
      size: random(4, 8),
      color: color(random(255), random(255), random(255)),
      angle: random(TWO_PI),
      spin: random(-0.1, 0.1)
    });
  }
}

function drawConfetti() {
  for (let p of confettiParticles) {
    p.x += p.vx;
    p.y += p.vy;
    p.angle += p.spin;

    push();
    translate(p.x, p.y);
    rotate(p.angle);
    noStroke();
    fill(p.color);
    rectMode(CENTER);
    rect(0, 0, p.size, p.size * 0.6);
    pop();
  }
}

function mousePressed() {
  for (let s of attachedSemis) {
    if (s.contains(mouseX, mouseY)) {
      draggingShape = s;
      offsetX = mouseX - s.x;
      offsetY = mouseY - s.y;
      rotateStart = atan2(mouseY - s.y, mouseX - s.x) - s.rotation;
      return;
    }
  }
  if (square.contains(mouseX, mouseY)) {
    draggingShape = square;
    offsetX = mouseX - square.x;
    offsetY = mouseY - square.y;
    rotateStart = atan2(mouseY - square.y, mouseX - square.x) - square.rotation;
  }
}

function mouseDragged() {
  if (draggingShape) {
    if (keyIsDown(SHIFT)) {
      let angle = atan2(mouseY - draggingShape.y, mouseX - draggingShape.x);
      draggingShape.rotation = angle - rotateStart;
    } else {
      draggingShape.x = mouseX - offsetX;
      draggingShape.y = mouseY - offsetY;
    }
  }
}

function mouseReleased() {
  if (draggingShape && !draggingShape.isSquare) {
    checkSnapping(draggingShape);
  }
  draggingShape = null;
}

function checkSnapping(semi) {
  let squareRotRad = radians(square.rotation);
  let cosR = cos(squareRotRad);
  let sinR = sin(squareRotRad);
  let leftWorldX = square.x + (-square.side / 2) * cosR - 0 * sinR;
  let leftWorldY = square.y + (-square.side / 2) * sinR + 0 * cosR;
  let rightWorldX = square.x + (square.side / 2) * cosR - 0 * sinR;
  let rightWorldY = square.y + (square.side / 2) * sinR + 0 * cosR;
  let distToLeft = dist(semi.x, semi.y, leftWorldX, leftWorldY);
  let distToRight = dist(semi.x, semi.y, rightWorldX, rightWorldY);
  let leftTargetRotation = square.rotation - 90;
  let rightTargetRotation = square.rotation - 270;
  if (
    distToLeft < snapDistance &&
    angleDifference(semi.rotation, leftTargetRotation) < snapAngleThreshold
  ) {
    semi.x = leftWorldX;
    semi.y = leftWorldY;
    semi.rotation = leftTargetRotation;
    semi.snapped = true;
    semi.snapTarget = "left";
  }
  else if (
    distToRight < snapDistance &&
    angleDifference(semi.rotation, rightTargetRotation) < snapAngleThreshold
  ) {
    semi.x = rightWorldX;
    semi.y = rightWorldY;
    semi.rotation = rightTargetRotation;
    semi.snapped = true;
    semi.snapTarget = "right";
  } else {
    semi.snapped = false;
    semi.snapTarget = null;
  }
}

function angleDifference(angle1, angle2) {
  let diff = abs(angle1 - angle2);
  return min(diff, 360 - diff);
}

class Shape {
  constructor(x, y, rotation, isSquare) {
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.isSquare = isSquare;
    this.side = 220;
    this.radius = this.side / 2;
    this.snapped = false;
    this.snapTarget = null;
  }

  contains(px, py) {
    let dx = px - this.x;
    let dy = py - this.y;
    let angle = -this.rotation;
    let localX = dx * cos(angle) - dy * sin(angle);
    let localY = dx * sin(angle) + dy * cos(angle);
    if (this.isSquare) {
      return abs(localX) <= this.side / 2 && abs(localY) <= this.side / 2;
    } else {
      let r = this.side / 2;
      return localY >= 0 && localX * localX + localY * localY <= r * r;
    }
  }

  displaySquareWithCutouts() {
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    rectMode(CENTER);
    let bothSnapped = attachedSemis.every((semi) => semi.snapped);

    if (bothSnapped) {
      fill(100, 220, 100, 150);
    } else {
      fill(220, 150, 100, 150);
    }

    noStroke();
    rect(0, 0, this.side, this.side);
    fill(255);
    noStroke();
    arc(-this.side / 2, 0, this.side, this.side, 270, 90, PIE);
    arc(this.side / 2, 0, this.side, this.side, 90, 270, PIE);
    pop();
  }

  displaySemicircle() {
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    let bothSnapped = attachedSemis.every((semi) => semi.snapped);
    if (bothSnapped) {
      fill(100, 220, 100, 150);
    } else {
      fill(100, 150, 220, 150);
    }

    noStroke();
    arc(0, 0, this.side, this.side, 0, 180, PIE);
    pop();
  }
}
