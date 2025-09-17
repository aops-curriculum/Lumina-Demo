// Epsilon-Delta Continuity Learning Tool
// For f(x) = x² at the point (1,1)

let canvas;
let epsilon = 0.5;
let delta = 0.5 / 4; // Fixed at epsilon/4 for continuous, variable for discontinuous
let selectedFunction = 'continuous'; // 'continuous' or 'discontinuous'

// Canvas dimensions and scaling
let canvasWidth = 800;
let canvasHeight = 500;
let margin = 60;
let plotWidth, plotHeight;
let xMin = 0, xMax = 2;
let yMin = 0, yMax = 2; // Make y-scale match x-scale for better visualization

// Colors
let colors = {
    background: [248, 249, 250],
    grid: [220, 220, 220],
    axis: [100, 100, 100],
    function: [25, 118, 210],
    point: [244, 67, 54],
    epsilonStrip: [255, 193, 7, 100],
    deltaStrip: [156, 39, 176, 100],
    intersection: [76, 175, 80, 150],
    text: [33, 33, 33]
};

function setup() {
    canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('p5-canvas');
    
    plotWidth = canvasWidth - 2 * margin;
    plotHeight = canvasHeight - 2 * margin;
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize with correct delta
    updateDelta();
}

function draw() {
    background(colors.background);
    
    // Draw title
    drawTitle();
    
    // Draw coordinate system
    drawCoordinateSystem();
    
    // Draw function
    drawFunction();
    
    // Draw epsilon strip (horizontal)
    drawEpsilonStrip();
    
    // Draw delta strip (vertical)
    drawDeltaStrip();
    
    // Draw intersection rectangle
    drawIntersection();
    
    // Draw point at x=1
    let pointY = evaluateFunction(1);
    drawPoint(1, pointY);
    
    // Draw labels and annotations
    drawLabels();
    

}

function drawTitle() {
    fill(colors.text);
    textAlign(CENTER, CENTER);
    textSize(18);
    if (selectedFunction === 'continuous') {
        text("f(x) = x² at (1,1)", width/2, 25);
    } else {
        text("f(x) = x² + step function", width/2, 25);
    }
    textSize(14);
    text(`ε = ${epsilon.toFixed(3)}, δ = ${delta.toFixed(3)}`, width/2, 45);
}

function drawCoordinateSystem() {
    // Draw grid
    stroke(colors.grid);
    strokeWeight(1);
    
    // Vertical grid lines
    for (let x = xMin; x <= xMax; x += 0.2) {
        let screenX = mapX(x);
        line(screenX, margin, screenX, height - margin);
    }
    
    // Horizontal grid lines
    for (let y = yMin; y <= yMax; y += 0.2) {
        let screenY = mapY(y);
        line(margin, screenY, width - margin, screenY);
    }
    
    // Draw axes
    stroke(colors.axis);
    strokeWeight(2);
    
    // X-axis
    let yAxisScreen = mapY(0);
    line(margin, yAxisScreen, width - margin, yAxisScreen);
    
    // Y-axis
    let xAxisScreen = mapX(0);
    line(xAxisScreen, margin, xAxisScreen, height - margin);
    
    // Draw axis labels
    fill(colors.text);
    textAlign(CENTER, CENTER);
    textSize(12);
    
    // X-axis labels
    for (let x = 0; x <= 2; x += 0.5) {
        let screenX = mapX(x);
        text(x.toString(), screenX, height - margin + 20);
    }
    
    // Y-axis labels
    for (let y = 0; y <= 2; y += 0.5) {
        let screenY = mapY(y);
        text(y.toString(), margin - 20, screenY);
    }
}

function drawFunction() {
    stroke(colors.function);
    strokeWeight(3);
    noFill();
    
    if (selectedFunction === 'continuous') {
        // Draw continuous function as a single curve
        beginShape();
        for (let x = xMin; x <= xMax; x += 0.01) {
            let y = evaluateFunction(x);
            let screenX = mapX(x);
            let screenY = mapY(y);
            vertex(screenX, screenY);
        }
        endShape();
    } else {
        // Draw discontinuous function as two separate curves
        // Left side: x < 1
        beginShape();
        for (let x = xMin; x < 1; x += 0.01) {
            let y = evaluateFunction(x);
            let screenX = mapX(x);
            let screenY = mapY(y);
            vertex(screenX, screenY);
        }
        endShape();
        
        // Right side: x > 1
        beginShape();
        for (let x = 1.01; x <= xMax; x += 0.01) {
            let y = evaluateFunction(x);
            let screenX = mapX(x);
            let screenY = mapY(y);
            vertex(screenX, screenY);
        }
        endShape();
        
        // Draw open circle at the left-hand limit (1, 1)
        let leftLimitX = mapX(1);
        let leftLimitY = mapY(1);
        
        // Draw white circle (background)
        fill(colors.background);
        stroke(colors.function);
        strokeWeight(3);
        ellipse(leftLimitX, leftLimitY, 12, 12);
    }
}

function evaluateFunction(x) {
    if (selectedFunction === 'continuous') {
        return x * x; // f(x) = x²
    } else {
        // f(x) = x² + step function (discontinuous at x=1)
        if (x < 1) {
            return x * x; // f(x) = x² for x < 1
        } else {
            return x * x + 0.5; // f(x) = x² + 0.5 for x ≥ 1
        }
    }
}

function drawEpsilonStrip() {
    // Horizontal strip around the function value at x = 1
    let centerY = evaluateFunction(1);
    let y1 = centerY - epsilon;
    let y2 = centerY + epsilon;
    
    fill(colors.epsilonStrip);
    noStroke();
    
    let screenY1 = mapY(y1);
    let screenY2 = mapY(y2);
    
    rect(margin, screenY2, plotWidth, screenY1 - screenY2);
    
    // Draw epsilon lines
    stroke(colors.epsilonStrip);
    strokeWeight(2);
    line(margin, screenY1, width - margin, screenY1);
    line(margin, screenY2, width - margin, screenY2);
    
    // Label epsilon
    fill(colors.text);
    textAlign(LEFT, CENTER);
    textSize(12);
    text(`ε = ${epsilon.toFixed(3)}`, width - margin + 10, (screenY1 + screenY2) / 2);
}

function drawDeltaStrip() {
    // Vertical strip around x = 1
    let x1 = 1 - delta;
    let x2 = 1 + delta;
    
    fill(colors.deltaStrip);
    noStroke();
    
    let screenX1 = mapX(x1);
    let screenX2 = mapX(x2);
    
    rect(screenX1, margin, screenX2 - screenX1, plotHeight);
    
    // Draw delta lines
    stroke(colors.deltaStrip);
    strokeWeight(2);
    line(screenX1, margin, screenX1, height - margin);
    line(screenX2, margin, screenX2, height - margin);
    

}

function drawIntersection() {
    // Draw the intersection rectangle
    let x1 = 1 - delta;
    let x2 = 1 + delta;
    let centerY = evaluateFunction(1);
    let y1 = centerY - epsilon;
    let y2 = centerY + epsilon;
    
    let screenX1 = mapX(x1);
    let screenX2 = mapX(x2);
    let screenY1 = mapY(y1);
    let screenY2 = mapY(y2);
    
    fill(colors.intersection);
    noStroke();
    rect(screenX1, screenY2, screenX2 - screenX1, screenY1 - screenY2);
    
    // Draw border
    stroke(colors.intersection);
    strokeWeight(2);
    noFill();
    rect(screenX1, screenY2, screenX2 - screenX1, screenY1 - screenY2);
}

function drawPoint(x, y) {
    let screenX = mapX(x);
    let screenY = mapY(y);
    
    // Draw point
    fill(colors.point);
    noStroke();
    ellipse(screenX, screenY, 8, 8);
    
    // Draw point label
    fill(colors.text);
    textAlign(LEFT, BOTTOM);
    textSize(12);
    if (selectedFunction === 'continuous') {
        text(`(1,1)`, screenX + 10, screenY - 5);
    } else {
        text(`(1,1.5)`, screenX + 10, screenY - 5);
    }
}

function drawLabels() {
    fill(colors.text);
    textAlign(CENTER, CENTER);
    textSize(14);
    
    // X-axis label
    text("x", width/2, height - 10);
    
    // Y-axis label
    text("y", 10, height/2);
}



function mapX(x) {
    return margin + (x - xMin) / (xMax - xMin) * plotWidth;
}

function mapY(y) {
    return height - margin - (y - yMin) / (yMax - yMin) * plotHeight;
}

function setupEventListeners() {
    // Function dropdown
    const functionDropdown = document.getElementById('function-dropdown');
    functionDropdown.addEventListener('change', function() {
        selectedFunction = this.value;
        updateUIForFunction();
    });
    
    // Epsilon slider
    const epsilonSlider = document.getElementById('epsilon-slider');
    const epsilonValue = document.getElementById('epsilon-value');
    
    epsilonSlider.addEventListener('input', function() {
        epsilon = parseFloat(this.value);
        epsilonValue.textContent = epsilon.toFixed(3);
        updateDelta();
    });
    
    // Delta slider
    const deltaSlider = document.getElementById('delta-slider');
    const deltaValue = document.getElementById('delta-value');
    
    deltaSlider.addEventListener('input', function() {
        delta = parseFloat(this.value);
        deltaValue.textContent = delta.toFixed(3);
    });
    
    // Initialize UI
    updateUIForFunction();
}

function updateUIForFunction() {
    const epsilonSlider = document.getElementById('epsilon-slider');
    const deltaSlider = document.getElementById('delta-slider');
    const deltaSection = document.getElementById('delta-section');
    
    if (selectedFunction === 'continuous') {
        // For continuous function: epsilon is variable, delta is fixed at epsilon/4
        epsilonSlider.disabled = false;
        deltaSlider.disabled = true;
        deltaSection.querySelector('h3').textContent = 'Delta (δ) Information';
        deltaSection.querySelector('.value-display').textContent = 'Fixed at ε/4 for continuous function';
    } else {
        // For discontinuous function: epsilon is fixed at 0.25, delta is variable
        epsilonSlider.disabled = true;
        deltaSlider.disabled = false;
        epsilon = 0.25; // Fix epsilon at 0.25
        document.getElementById('epsilon-value').textContent = '0.250';
        deltaSection.querySelector('h3').textContent = 'Delta (δ) Control';
        deltaSection.querySelector('.value-display').textContent = 'Adjust to change the width of the vertical strip';
    }
}

function updateDelta() {
    if (selectedFunction === 'continuous') {
        // Fixed relationship: delta = epsilon/4
        delta = epsilon / 4;
        
        // Ensure delta doesn't exceed 1/2 (as per requirement)
        if (delta > 0.5) {
            delta = 0.5;
        }
    }
    // For discontinuous function, delta is controlled by the slider
}

// Mathematical verification function
function verifyContinuity() {
    // For f(x) = x² at x = 1, we need to show that |x² - 1| < ε when |x - 1| < δ
    
    // We can factor: |x² - 1| = |(x-1)(x+1)| = |x-1| * |x+1|
    // When |x-1| < δ, we have |x+1| < 2 + δ (since x < 1 + δ)
    // So |x² - 1| < δ * (2 + δ)
    
    // For δ = ε/4 and ε ≤ 1/2, we have δ ≤ 1/8
    // So |x+1| < 2 + 1/8 = 17/8
    // Therefore |x² - 1| < (ε/4) * (17/8) = 17ε/32 < ε
    
    // This shows that δ = ε/4 works for ε ≤ 1/2
    return true;
} 