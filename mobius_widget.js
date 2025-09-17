// Mobius Transformation Widget JS

// --- Complex number utilities ---
function parseComplex(str) {
    // Parses a string like '2+3i' or '1-i' into {re, im}
    str = str.replace(/\s+/g, '');
    if (str === 'i') return { re: 0, im: 1 };
    if (str === '-i') return { re: 0, im: -1 };
    let match = str.match(/^([+-]?\d*\.?\d*)([+-]\d*\.?\d*)i$/);
    if (match) {
        return { re: parseFloat(match[1] || '0'), im: parseFloat(match[2] || '1') };
    }
    match = str.match(/^([+-]?\d*\.?\d*)$/);
    if (match) {
        return { re: parseFloat(match[1]), im: 0 };
    }
    match = str.match(/^([+-]?\d*\.?\d*)i$/);
    if (match) {
        return { re: 0, im: parseFloat(match[1]) };
    }
    throw new Error('Invalid complex number: ' + str);
}

function complexEq(z1, z2) {
    return Math.abs(z1.re - z2.re) < 1e-10 && Math.abs(z1.im - z2.im) < 1e-10;
}
function complexAdd(z1, z2) {
    return { re: z1.re + z2.re, im: z1.im + z2.im };
}
function complexSub(z1, z2) {
    return { re: z1.re - z2.re, im: z1.im - z2.im };
}
function complexMul(z1, z2) {
    return { re: z1.re * z2.re - z1.im * z2.im, im: z1.re * z2.im + z1.im * z2.re };
}
function complexDiv(z1, z2) {
    const denom = z2.re * z2.re + z2.im * z2.im;
    if (Math.abs(denom) < 1e-14) {
        // Instead of returning Infinity, signal invalid division
        return { re: NaN, im: NaN, _invalid: true };
    }
    return {
        re: (z1.re * z2.re + z1.im * z2.im) / denom,
        im: (z1.im * z2.re - z1.re * z2.im) / denom
    };
}
function complexAbs(z) {
    return Math.sqrt(z.re * z.re + z.im * z.im);
}
function complexArg(z) {
    return Math.atan2(z.im, z.re);
}
function complexInv(z) {
    const denom = z.re * z.re + z.im * z.im;
    return { re: z.re / denom, im: -z.im / denom };
}

// --- Mobius decomposition stub ---
function decomposeMobius(a, b, c, d) {
    // Returns an array of transformation steps
    // Each step: { type: 'translation'|'inversion'|'rotation'|'dilation', params: {...} }
    // If c == 0, affine: f(z) = (a/d)z + (b/d)
    const zero = { re: 0, im: 0 };
    if (complexEq(c, zero)) {
        // Affine: scale/rotate, then translate
        const scale = complexDiv(a, d);
        const trans = complexDiv(b, d);
        if (scale._invalid || trans._invalid) return [{ type: 'invalid', params: {} }];
        return [
            { type: 'dilation_rotation', params: { lambda: scale } },
            { type: 'translation', params: { t: trans } }
        ];
    } else {
        // General case
        // 1. z -> z + d/c
        const t1 = complexDiv(d, c);
        if (t1._invalid) return [{ type: 'invalid', params: {} }];
        // 2. z -> 1/z
        // 3. z -> (ad-bc)/c^2 * z
        const ad = complexMul(a, d);
        const bc = complexMul(b, c);
        const num = complexSub(ad, bc);
        const c2 = complexMul(c, c);
        const lambda = complexDiv(num, c2);
        if (lambda._invalid) return [{ type: 'invalid', params: {} }];
        // 4. z -> z + a/c
        const t2 = complexDiv(a, c);
        if (t2._invalid) return [{ type: 'invalid', params: {} }];
        return [
            { type: 'translation', params: { t: t1 } },
            { type: 'inversion', params: {} },
            { type: 'dilation_rotation', params: { lambda: lambda } },
            { type: 'translation', params: { t: t2 } }
        ];
    }
}

// --- Shape generation ---
function generateShape(type) {
    // Returns an array of points {re, im}
    let points = [];
    if (type === 'circle') {
        let N = 400;
        for (let i = 0; i < N; ++i) {
            let theta = 2 * Math.PI * i / N;
            points.push({ re: Math.cos(theta), im: Math.sin(theta) });
        }
    } else if (type === 'square') {
        let N = 400;
        for (let i = 0; i < 4; ++i) {
            let angle = Math.PI/2 * i;
            let nextAngle = Math.PI/2 * (i+1);
            for (let j = 0; j < N; ++j) {
                let t = j / N;
                points.push({
                    re: (1-t)*Math.cos(angle) + t*Math.cos(nextAngle),
                    im: (1-t)*Math.sin(angle) + t*Math.sin(nextAngle)
                });
            }
        }
    } else if (type === 'hexagon') {
        let N = 400;
        let verts = [];
        for (let i = 0; i < 6; ++i) {
            let angle = 2 * Math.PI * i / 6;
            verts.push({ re: Math.cos(angle), im: Math.sin(angle) });
        }
        for (let i = 0; i < 6; ++i) {
            let a = verts[i];
            let b = verts[(i+1)%6];
            for (let j = 0; j < N/6; ++j) {
                let t = j / (N/6);
                points.push({
                    re: (1-t)*a.re + t*b.re,
                    im: (1-t)*a.im + t*b.im
                });
            }
        }
    }
    return points;
}

// --- Apply transformation step ---
function applyStep(points, step) {
    // Applies a single transformation step to all points
    if (!step) return points;
    if (step.type === 'invalid') return points;
    switch (step.type) {
        case 'translation': {
            const t = step.params.t;
            return points.map(p => complexAdd(p, t));
        }
        case 'inversion': {
            // z -> 1/z
            return points.map(p => {
                const denom = p.re * p.re + p.im * p.im;
                if (denom === 0) return { re: Infinity, im: Infinity };
                return { re: p.re / denom, im: -p.im / denom };
            });
        }
        case 'dilation_rotation': {
            const lambda = step.params.lambda;
            return points.map(p => complexMul(lambda, p));
        }
        default:
            return points;
    }
}

// --- Drawing ---
function getShapeBounds(points) {
    // Returns {minRe, maxRe, minIm, maxIm}, clamped to [-10, 10]
    let minRe = Infinity, maxRe = -Infinity, minIm = Infinity, maxIm = -Infinity;
    for (const p of points) {
        if (!isFinite(p.re) || !isFinite(p.im)) continue;
        if (p.re < minRe) minRe = p.re;
        if (p.re > maxRe) maxRe = p.re;
        if (p.im < minIm) minIm = p.im;
        if (p.im > maxIm) maxIm = p.im;
    }
    // Clamp to [-10, 10]
    minRe = Math.max(minRe, -10);
    maxRe = Math.min(maxRe, 10);
    minIm = Math.max(minIm, -10);
    maxIm = Math.min(maxIm, 10);
    return { minRe, maxRe, minIm, maxIm };
}

function getUnionBounds(boundsA, boundsB) {
    return {
        minRe: Math.min(boundsA.minRe, boundsB.minRe),
        maxRe: Math.max(boundsA.maxRe, boundsB.maxRe),
        minIm: Math.min(boundsA.minIm, boundsB.minIm),
        maxIm: Math.max(boundsA.maxIm, boundsB.maxIm)
    };
}

function computeAllStepsBounds(shape, steps) {
    // Returns the union bounding box of the shape at every step
    let pts = shape.slice();
    let bounds = getShapeBounds(pts);
    for (let i = 1; i < steps.length; ++i) {
        if (steps[i].type === 'invalid') break;
        pts = applyStep(pts, steps[i]);
        const b = getShapeBounds(pts);
        bounds = getUnionBounds(bounds, b);
    }
    return bounds;
}

function computeAutoScaleFromBounds(bounds, width, height, margin=0.2) {
    let reSpan = bounds.maxRe - bounds.minRe;
    let imSpan = bounds.maxIm - bounds.minIm;
    reSpan = Math.max(reSpan, 1e-3);
    imSpan = Math.max(imSpan, 1e-3);
    reSpan *= 1 + margin;
    imSpan *= 1 + margin;
    const scaleX = (width * 0.9) / (reSpan * 100);
    const scaleY = (height * 0.9) / (imSpan * 100);
    const scale = Math.min(scaleX, scaleY);
    const centerRe = (bounds.minRe + bounds.maxRe) / 2;
    const centerIm = (bounds.minIm + bounds.maxIm) / 2;
    return { scale, centerRe, centerIm, bounds };
}

function drawGrid(ctx, opts = {}) {
    // Draws grid lines and axes on the complex plane, with axis labels and numbers
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const scale = opts.scale || 1;
    const centerRe = opts.centerRe || 0;
    const centerIm = opts.centerIm || 0;
    ctx.save();
    ctx.translate(width/2, height/2);
    ctx.scale(100 * scale, -100 * scale); // scale and flip y
    ctx.translate(-centerRe, -centerIm);
    // Draw grid lines
    ctx.lineWidth = 0.005 / scale;
    ctx.strokeStyle = opts.color || '#ccc';
    ctx.beginPath();
    const reStart = Math.floor(centerRe-2/scale);
    const reEnd = Math.ceil(centerRe+2/scale);
    const imStart = Math.floor(centerIm-2/scale);
    const imEnd = Math.ceil(centerIm+2/scale);
    for (let x = reStart; x <= reEnd; x += 0.5) {
        if (Math.abs(x) < 1e-8) continue;
        ctx.moveTo(x, centerIm-2/scale);
        ctx.lineTo(x, centerIm+2/scale);
    }
    for (let y = imStart; y <= imEnd; y += 0.5) {
        if (Math.abs(y) < 1e-8) continue;
        ctx.moveTo(centerRe-2/scale, y);
        ctx.lineTo(centerRe+2/scale, y);
    }
    ctx.stroke();
    // Draw bold axes
    ctx.lineWidth = 0.025 / scale;
    ctx.strokeStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(-width/200/scale + centerRe, 0);
    ctx.lineTo(width/200/scale + centerRe, 0);
    ctx.moveTo(0, -height/200/scale + centerIm);
    ctx.lineTo(0, height/200/scale + centerIm);
    ctx.stroke();
    // Axis labels (Re, Im) and numbers
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0); // reset transform
    ctx.font = '16px Arial';
    ctx.fillStyle = '#222';
    // Compute axis positions in canvas coordinates
    const xAxisY = height/2 - (0 - centerIm) * 100 * scale;
    const yAxisX = width/2 + (0 - centerRe) * 100 * scale;
    // Draw axis labels near the axes
    ctx.textAlign = 'right';
    ctx.fillText('Re', width - 10, xAxisY - 8);
    ctx.textAlign = 'left';
    ctx.fillText('Im', yAxisX + 8, 18);
    // Draw numbers on axes
    ctx.font = '13px Menlo, monospace';
    ctx.textAlign = 'center';
    // Real axis numbers
    for (let x = reStart; x <= reEnd; x++) {
        if (Math.abs(x) < 1e-8) continue;
        // Convert (x,0) to canvas coords
        const px = width/2 + (x - centerRe) * 100 * scale;
        const py = xAxisY;
        ctx.fillText(x.toString(), px, py + 18);
    }
    // Imaginary axis numbers
    ctx.textAlign = 'right';
    for (let y = imStart; y <= imEnd; y++) {
        if (Math.abs(y) < 1e-8) continue;
        const px = yAxisX;
        const py = height/2 - (y - centerIm) * 100 * scale;
        ctx.fillText(y.toString(), px - 8, py + 4);
    }
    // Draw origin label
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#111';
    ctx.fillText('0', yAxisX + 6, xAxisY + 16);
    ctx.restore();
    ctx.restore();
}

function drawShape(ctx, points, opts = {}) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    drawGrid(ctx, opts);
    ctx.save();
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const scale = opts.scale || 1;
    const centerRe = opts.centerRe || 0;
    const centerIm = opts.centerIm || 0;
    ctx.translate(width/2, height/2);
    ctx.scale(100 * scale, -100 * scale);
    ctx.translate(-centerRe, -centerIm);
    ctx.beginPath();
    let prevFinite = false;
    let prevP = null;
    const DIST_THRESHOLD = 100; // break if distance > 100 units
    for (let i = 0; i < points.length; ++i) {
        let p = points[i];
        if (!isFinite(p.re) || !isFinite(p.im)) {
            prevFinite = false;
            prevP = null;
            continue;
        }
        if (!prevFinite) {
            ctx.moveTo(p.re, p.im);
        } else {
            // Only connect if distance is not too large
            const dx = p.re - prevP.re;
            const dy = p.im - prevP.im;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > DIST_THRESHOLD) {
                ctx.moveTo(p.re, p.im);
            } else {
                ctx.lineTo(p.re, p.im);
            }
        }
        prevFinite = true;
        prevP = p;
    }
    // Never close the path
    ctx.strokeStyle = '#0074D9';
    ctx.lineWidth = 0.02 / scale;
    ctx.stroke();
    ctx.restore();
}

function formatComplex(z, digits=2) {
    if (!z || typeof z.re !== 'number' || typeof z.im !== 'number') return 'undefined';
    if (isNaN(z.re) || isNaN(z.im)) return 'undefined';
    if (!isFinite(z.re) || !isFinite(z.im)) return '∞';
    const re = z.re.toFixed(digits);
    const im = z.im.toFixed(digits);
    if (Math.abs(z.im) < 1e-10) return `${re}`;
    if (Math.abs(z.re) < 1e-10) return `${im}i`;
    return `${re}${z.im >= 0 ? '+' : ''}${im}i`;
}

function stepHasInfinityOrNaN(step) {
    if (step.type === 'translation') {
        const t = step.params.t;
        return !isFinite(t.re) || !isFinite(t.im) || isNaN(t.re) || isNaN(t.im);
    }
    if (step.type === 'dilation_rotation') {
        const l = step.params.lambda;
        return !isFinite(l.re) || !isFinite(l.im) || isNaN(l.re) || isNaN(l.im);
    }
    return false;
}

function stepsHaveInfinityOrNaN(steps) {
    return steps.some(stepHasInfinityOrNaN);
}

function showWarning(msg) {
    let warnDiv = document.getElementById('mobius-warning');
    if (!warnDiv) {
        warnDiv = document.createElement('div');
        warnDiv.id = 'mobius-warning';
        warnDiv.style.color = 'red';
        warnDiv.style.fontWeight = 'bold';
        warnDiv.style.marginBottom = '10px';
        warnDiv.style.fontSize = '1.1em';
        const parent = document.querySelector('.inputs') || document.body;
        parent.parentNode.insertBefore(warnDiv, parent.nextSibling);
    }
    warnDiv.textContent = msg;
}
function clearWarning() {
    let warnDiv = document.getElementById('mobius-warning');
    if (warnDiv) warnDiv.textContent = '';
}

// --- Step-through logic ---
let steps = [];
let currentStep = 0;
let originalShape = [];
let currentShape = [];
let fixedScaleParams = null; // Store scale/center for the whole step-through

function updateStepInfo() {
    const info = document.getElementById('step-info');
    if (steps.length === 0) {
        info.textContent = 'Step: -';
    } else if (steps[currentStep] && steps[currentStep].type === 'invalid') {
        info.textContent = 'Step: Invalid Mobius transformation (division by zero or undefined).';
    } else if (currentStep === 0) {
        info.textContent = `Step 0 / ${steps.length-1}: Original shape`;
    } else {
        const step = steps[currentStep];
        let desc = '';
        if (step.type === 'translation') {
            desc = `Translation: z → z + (${formatComplex(step.params.t)})`;
        } else if (step.type === 'inversion') {
            desc = 'Inversion: z → 1/z';
        } else if (step.type === 'dilation_rotation') {
            const lambda = step.params.lambda;
            const r = complexAbs(lambda).toFixed(2);
            const theta = complexArg(lambda);
            const deg = (theta * 180 / Math.PI).toFixed(1);
            desc = `Dilation/Rotation: z → (${formatComplex(lambda)})·z  (|λ|=${r}, arg=${deg}°)`;
        } else {
            desc = step.type;
        }
        // Check for infinity in current shape
        if (anyInfinity(currentShape)) {
            desc += '  [Some points sent to infinity]';
        }
        info.textContent = `Step ${currentStep} / ${steps.length-1}: ${desc}`;
    }
}

function renderMobiusFormula(a, b, c, d) {
    const formulaDiv = document.getElementById('mobius-formula');
    if (!a || !b || !c || !d) {
        formulaDiv.textContent = '';
        return;
    }
    // Format as (az+b)/(cz+d) with improved HTML/CSS
    const aStr = formatComplex(a);
    const bStr = formatComplex(b);
    const cStr = formatComplex(c);
    const dStr = formatComplex(d);
    formulaDiv.innerHTML = `
      <div style="display: inline-block; text-align: center; font-family: 'Menlo', 'Consolas', monospace; font-size: 1.25em; font-weight: 600; letter-spacing: 0.5px;">
        <div style="padding-bottom: 2px; min-width: 180px;">
          (<span>${aStr}</span>)·z + (<span>${bStr}</span>)
        </div>
        <div style="border-top: 3px solid #222; margin: 0 0 0 0; height: 0; width: 100%;"></div>
        <div style="padding-top: 2px;">
          (<span>${cStr}</span>)·z + (<span>${dStr}</span>)
        </div>
      </div>
    `;
}

function renderStepList(a, b, c, d) {
    renderMobiusFormula(a, b, c, d);
    const listDiv = document.getElementById('step-list');
    if (!steps || steps.length === 0) {
        listDiv.innerHTML += '<b>Transformations:</b><br><i>None</i>';
        return;
    }
    let html = '<b>Transformations:</b><div style="padding-left: 20px">';
    for (let i = 0; i < steps.length; ++i) {
        let desc = '';
        if (i === 0) {
            desc = 'Original shape';
        } else {
            const step = steps[i];
            if (step.type === 'invalid') {
                desc = '<span style="color:red">Invalid Mobius transformation (division by zero or undefined)</span>';
            } else if (step.type === 'translation') {
                desc = 'Translation: z → z + (' + formatComplex(step.params.t) + ')';
            } else if (step.type === 'inversion') {
                desc = 'Inversion: z → 1/z';
            } else if (step.type === 'dilation_rotation') {
                const lambda = step.params.lambda;
                const r = complexAbs(lambda).toFixed(2);
                const theta = complexArg(lambda);
                const deg = (theta * 180 / Math.PI).toFixed(1);
                desc = 'Dilation/Rotation: z → (' + formatComplex(lambda) + ')·z  (|λ|=' + r + ', arg=' + deg + '°)';
            } else {
                desc = step.type;
            }
        }
        html += `<div style="margin-bottom: 6px;">${i}. ${desc}</div>`;
    }
    html += '</div>';
    // Only update the transformation list, not the formula
    const mobiusFormula = document.getElementById('mobius-formula');
    listDiv.innerHTML = mobiusFormula.outerHTML + html;
}

function redraw() {
    const canvas = document.getElementById('mobius-canvas');
    const ctx = canvas.getContext('2d');
    // Use fixed scale/center for all steps
    let scaleParams = fixedScaleParams;
    if (!scaleParams) {
        // fallback: compute from current shape (should only happen on first load)
        scaleParams = computeAutoScale(currentShape, canvas.width, canvas.height);
    }
    drawShape(ctx, currentShape, scaleParams);
    updateStepInfo();
}

function goToStep(n) {
    currentStep = Math.max(0, Math.min(n, steps.length-1));
    currentShape = originalShape.slice();
    // Step 0: show original shape, no transformation
    if (currentStep > 0) {
        for (let i = 1; i <= currentStep; ++i) {
            currentShape = applyStep(currentShape, steps[i]);
        }
    }
    redraw();
}

function isValidComplex(z) {
    return z && isFinite(z.re) && isFinite(z.im);
}

function validateMobiusCoeffs(a, b, c, d) {
    if (!isValidComplex(a) || !isValidComplex(b) || !isValidComplex(c) || !isValidComplex(d)) {
        throw new Error('One or more Mobius coefficients are invalid (NaN or undefined).');
    }
}

function validateSteps(steps) {
    for (const step of steps) {
        if (step.type === 'invalid') {
            throw new Error('Mobius transformation is not defined for these coefficients (division by zero or invalid step).');
        }
        if (step.type === 'translation' && !isValidComplex(step.params.t)) {
            throw new Error('Mobius transformation step (translation) is invalid (NaN or undefined).');
        }
        if (step.type === 'dilation_rotation' && !isValidComplex(step.params.lambda)) {
            throw new Error('Mobius transformation step (dilation/rotation) is invalid (NaN or undefined).');
        }
    }
    return true;
}

function anyInfinity(points) {
    return points.some(p => !isFinite(p.re) || !isFinite(p.im));
}

window.onload = function() {
    document.getElementById('decompose-btn').onclick = function() {
        try {
            clearWarning();
            let a = parseComplex(document.getElementById('input-a').value);
            let b = parseComplex(document.getElementById('input-b').value);
            let c = parseComplex(document.getElementById('input-c').value);
            let d = parseComplex(document.getElementById('input-d').value);
            validateMobiusCoeffs(a, b, c, d);
            let mobiusSteps = decomposeMobius(a, b, c, d);
            if (mobiusSteps.length > 0 && mobiusSteps[0].type === 'invalid') {
                showWarning('Error: Mobius transformation is not defined for these coefficients (division by zero or invalid step).');
                steps = [{ type: 'original' }, { type: 'invalid', params: {} }];
                originalShape = generateShape(document.getElementById('shape-select').value);
                fixedScaleParams = null;
                goToStep(1); // Show the invalid step
                renderStepList(a, b, c, d);
                return;
            }
            if (stepsHaveInfinityOrNaN(mobiusSteps)) {
                showWarning('Warning: This Mobius transformation sends some points to infinity or is degenerate. The result may be a line, a point, or undefined.');
            } else {
                clearWarning();
            }
            steps = [{ type: 'original' }, ...mobiusSteps]; // Add Step 0
            originalShape = generateShape(document.getElementById('shape-select').value);
            // Compute bounds for all steps
            const allBounds = computeAllStepsBounds(originalShape, steps);
            const canvas = document.getElementById('mobius-canvas');
            fixedScaleParams = computeAutoScaleFromBounds(allBounds, canvas.width, canvas.height);
            goToStep(0);
            renderStepList(a, b, c, d);
        } catch (e) {
            showWarning('Error: ' + e.message);
        }
    };
    document.getElementById('next-step').onclick = function() {
        if (currentStep < steps.length-1) goToStep(currentStep+1);
    };
    document.getElementById('prev-step').onclick = function() {
        if (currentStep > 0) goToStep(currentStep-1);
    };
    document.getElementById('reset-step').onclick = function() {
        goToStep(0);
    };
    document.getElementById('randomize-btn').onclick = function() {
        function randInt() { return Math.floor(Math.random() * 21) - 10; }
        function randComplex() {
            const re = randInt();
            const im = randInt();
            if (im === 0) return `${re}`;
            if (re === 0) return `${im}i`;
            return `${re}${im >= 0 ? '+' : ''}${im}i`;
        }
        document.getElementById('input-a').value = randComplex();
        document.getElementById('input-b').value = randComplex();
        document.getElementById('input-c').value = randComplex();
        document.getElementById('input-d').value = randComplex();
        document.getElementById('decompose-btn').click();
    };
    // Initial draw: compute scale for initial shape
    const canvas = document.getElementById('mobius-canvas');
    fixedScaleParams = computeAutoScale(currentShape, canvas.width, canvas.height);
    redraw();
}; 