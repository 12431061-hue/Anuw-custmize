const state = {
  shoulder: 460,
  sleeve: 220,
  body: 520,
  length: 700,
  linked: true,
  min: { shoulder: 340, sleeve: 0, body: 300, length: 400 },
  max: { shoulder: 5000, sleeve: 5000, body: 5000, length: 5000 },
};

const svg = document.querySelector('.shirt-svg');
const grid = document.getElementById('grid-background');
const pathEl = document.getElementById('shirt-path');
const clipPathEl = document.getElementById('shirt-clip-path');
const paths = {
  neckLeft: document.getElementById('shirt-neck-left'),
  neckRight: document.getElementById('shirt-neck-right'),
  neckInnerLeft: document.getElementById('shirt-neck-inner-left'),
  neckInnerRight: document.getElementById('shirt-neck-inner-right'),
  stitchTop: document.getElementById('shirt-stitch-top'),
  stitchBottom: document.getElementById('shirt-stitch-bottom'),
  sleeveSeamLeft: document.getElementById('shirt-sleeve-seam-left'),
  sleeveSeamRight: document.getElementById('shirt-sleeve-seam-right'),
};
const values = Object.fromEntries(['shoulder', 'sleeve', 'body', 'length'].map((key) => [key, document.getElementById(`value-${key}`)]));
const ranges = Object.fromEntries(['shoulder', 'sleeve', 'body', 'length'].map((key) => [key, document.getElementById(`range-${key}`)]));
const handles = {
  shoulderLeft: document.getElementById('handle-shoulder-left'),
  shoulderRight: document.getElementById('handle-shoulder-right'),
  sleeveLeft: document.getElementById('handle-sleeve-left'),
  sleeveRight: document.getElementById('handle-sleeve-right'),
  bodyLeft: document.getElementById('handle-body-left'),
  bodyRight: document.getElementById('handle-body-right'),
  hem: document.getElementById('handle-hem'),
};
const measurements = {
  shoulderLine: document.getElementById('measure-shoulder-line'),
  bodyLine: document.getElementById('measure-body-line'),
  lengthLine: document.getElementById('measure-length-line'),
  sleeveLine: document.getElementById('measure-sleeve-line'),
  shoulderLabel: document.getElementById('measure-shoulder-label'),
  bodyLabel: document.getElementById('measure-body-label'),
  lengthLabel: document.getElementById('measure-length-label'),
  sleeveLabel: document.getElementById('measure-sleeve-label'),
  shoulderStart: document.getElementById('measure-shoulder-start'),
  shoulderEnd: document.getElementById('measure-shoulder-end'),
  bodyStart: document.getElementById('measure-body-start'),
  bodyEnd: document.getElementById('measure-body-end'),
  lengthStart: document.getElementById('measure-length-start'),
  lengthEnd: document.getElementById('measure-length-end'),
  sleeveStart: document.getElementById('measure-sleeve-start'),
  sleeveEnd: document.getElementById('measure-sleeve-end'),
};
const dynamicStrokeTargets = [
  [pathEl, 1.25],
  [paths.neckLeft, 1.25], [paths.neckRight, 1.25],
  [paths.neckInnerLeft, 1], [paths.neckInnerRight, 1],
  [paths.stitchTop, 1.25], [paths.stitchBottom, 1.25],
  [paths.sleeveSeamLeft, 1.25], [paths.sleeveSeamRight, 1.25],
  [document.querySelector('.measurements'), 1.25],
];
const linkButton = document.getElementById('toggle-link');
const sourcePath = 'M344.74,196.94l95.28,22.62,130.24,57.24-38.73,88.43-80.54-9.25-27.11,156.97,7.63,159.04H151.07s7.63-159.04,7.63-159.04l-27.11-156.97-80.54,9.25-38.73-88.43,130.24-57.24,95.28-22.62s53.57,17.81,106.89,0Z';
const baseSize = { length: 700, body: 520, shoulder: 460, sleeve: 220 };
const linkedBodyOffset = baseSize.body - baseSize.shoulder;
const collar = { left: 227.06, right: 356.37 };
const dimensionVisualScale = 0.6;
const garmentCenterX = 291.29;
const geometryScale = { shoulder: dimensionVisualScale / 2, body: dimensionVisualScale / 2, sleeveY: 0.32 * 0.22, hemY: (671.99 - 196.94) / 700 };
const sliderMain = { length: 800, body: 600, shoulder: 600, sleeve: 300 };
const negativeShare = 0.25;
const mainShare = 2 / 3;
const mainEnd = negativeShare + mainShare;

let activeHandle = null;
let pointerId = null;
let startPoint = null;
let dragStartValues = null;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundStep(value) {
  return Math.round(value / 10) * 10;
}

function sliderToValue(key, position) {
  const ratio = Number(position) / 1000;
  const main = sliderMain[key];
  if (ratio <= negativeShare) {
    return roundStep(state.min[key] + (baseSize[key] - state.min[key]) * (ratio / negativeShare));
  }
  if (ratio <= mainEnd) {
    return roundStep(baseSize[key] + ((ratio - negativeShare) / mainShare) * main);
  }
  const tailRatio = (ratio - mainEnd) / (1 - mainEnd);
  return roundStep(baseSize[key] + main + (state.max[key] - baseSize[key] - main) * tailRatio * tailRatio);
}

function valueToSlider(key, value) {
  const main = sliderMain[key];
  if (value <= baseSize[key]) {
    return Math.round(((value - state.min[key]) / (baseSize[key] - state.min[key])) * negativeShare * 1000);
  }
  if (value <= baseSize[key] + main) {
    return Math.round((negativeShare + ((value - baseSize[key]) / main) * mainShare) * 1000);
  }
  const tailRatio = Math.sqrt((value - baseSize[key] - main) / (state.max[key] - baseSize[key] - main));
  return Math.round((mainEnd + (1 - mainEnd) * tailRatio) * 1000);
}

function getGeometry() {
  const xLeftShoulder = garmentCenterX - (state.shoulder * dimensionVisualScale) / 2;
  const xRightShoulder = garmentCenterX + (state.shoulder * dimensionVisualScale) / 2;
  const xLeftBody = garmentCenterX - (state.body * dimensionVisualScale) / 2;
  const xRightBody = garmentCenterX + (state.body * dimensionVisualScale) / 2;
  const shoulderOffset = 142.56 - xLeftShoulder;
  const sleeveOffset = (state.sleeve - 220) * 0.32;
  const bodyOffset = 158.7 - xLeftBody;
  const lengthRatio = state.length / 700;
  const collarGap = 95.28;
  const collarExpansion = Math.max(0, shoulderOffset);
  const collarLeftOuter = 237.84 - collarExpansion;
  const collarRightOuter = 344.74 + collarExpansion;
  const collarScale = (collarRightOuter - collarLeftOuter) / (344.74 - 237.84);
  const xLeftHem = 151.07 - bodyOffset;
  const xRightHem = 431.51 + bodyOffset;
  const yBody = 196.94 + (512.95 - 196.94) * lengthRatio;
  const yHem = 196.94 + (671.99 - 196.94) * lengthRatio;
  const hasSleeve = state.sleeve > 0;
  // 肩幅の変化には袖全体を同量追従させ、袖丈の相対長を保つ。
  const leftSleeveTop = hasSleeve ? { x: 12.32 - shoulderOffset - sleeveOffset, y: 276.8 + sleeveOffset * 0.22 } : { x: xLeftBody, y: yBody };
  const rightSleeveTop = hasSleeve ? { x: 570.26 + shoulderOffset + sleeveOffset, y: 276.8 + sleeveOffset * 0.22 } : { x: xRightBody, y: yBody };
  const leftCuff = hasSleeve ? { x: 51.05 - shoulderOffset - sleeveOffset, y: 365.23 + sleeveOffset * 0.22 } : { x: xLeftBody, y: yBody };
  const rightCuff = hasSleeve ? { x: 531.53 + shoulderOffset + sleeveOffset, y: 365.23 + sleeveOffset * 0.22 } : { x: xRightBody, y: yBody };
  return { shoulderOffset, xLeftShoulder, xRightShoulder, collarLeftOuter, collarRightOuter, collarScale, xLeftBody, xRightBody, xLeftHem, xRightHem, yBody, yHem, leftSleeveTop, rightSleeveTop, leftCuff, rightCuff, hasSleeve };
}

function getLengthMinimum() {
  const cuffBottom = 365.23 + (state.sleeve - baseSize.sleeve) * geometryScale.sleeveY;
  const lengthForCuffClearance = ((cuffBottom + 14 - 196.94) / (512.95 - 196.94)) * baseSize.length;
  return Math.ceil(Math.max(state.min.length, lengthForCuffClearance) / 10) * 10;
}

function enforceGarmentBounds() {
  // The shoulder seam must always remain wider than the fixed double collar.
  const minimumShoulder = Math.ceil(Math.max(
    state.min.shoulder,
    baseSize.shoulder + ((collar.right - collar.left + 28 - (440.02 - 142.56)) / (2 * geometryScale.shoulder)),
  ) / 10) * 10;
  state.shoulder = clamp(state.shoulder, minimumShoulder, state.max.shoulder);
  state.sleeve = clamp(state.sleeve, state.min.sleeve, state.max.sleeve);
  state.body = clamp(state.body, Math.max(state.min.body, state.shoulder * 0.72), state.max.body);
  state.length = clamp(state.length, getLengthMinimum(), state.max.length);
}

function updateValues() {
  Object.keys(values).forEach((key) => {
    values[key].value = state[key];
    ranges[key].value = valueToSlider(key, state[key]);
  });
}

function setPathGeometry(g) {
  const collarOffset = g.collarRightOuter - 344.74;
  const collarPaths = [paths.neckLeft, paths.neckRight, paths.neckInnerLeft, paths.neckInnerRight, paths.stitchTop, paths.stitchBottom];
  collarPaths.forEach((path) => path.removeAttribute('transform'));

  paths.neckLeft.setAttribute('d', `M ${236.74 - collarOffset} 196.94 s 1.89 74.36 54.64 73.96 H ${291.38 + collarOffset}`);
  paths.neckRight.setAttribute('d', `M ${346.03 + collarOffset} 196.94 s -1.89 74.36 -54.64 73.96`);
  paths.neckInnerLeft.setAttribute('d', `M ${227.06 - collarOffset} 199.47 s 2.23 82.33 64.65 81.89 H ${291.71 + collarOffset}`);
  paths.neckInnerRight.setAttribute('d', `M ${356.37 + collarOffset} 199.47 s -2.23 82.33 -64.65 81.89`);
  paths.stitchTop.setAttribute('d', `M ${238 - collarOffset} 209.75 H ${343.94 + collarOffset}`);
  paths.stitchBottom.setAttribute('d', `M ${238.74 - collarOffset} 214.97 H ${344.68 + collarOffset}`);

  const outerPath = g.hasSleeve
    ? `M ${g.collarRightOuter} 196.94 L ${g.xRightShoulder} 219.56 L ${g.rightSleeveTop.x} ${g.rightSleeveTop.y} L ${g.rightCuff.x} ${g.rightCuff.y} L ${g.xRightBody + 27.11} 355.98 L ${g.xRightBody} ${g.yBody} L ${g.xRightHem} ${g.yHem} H ${g.xLeftHem} L ${g.xLeftBody} ${g.yBody} L ${g.xLeftBody - 27.11} 355.98 L ${g.leftCuff.x} ${g.leftCuff.y} L ${g.leftSleeveTop.x} ${g.leftSleeveTop.y} L ${g.xLeftShoulder} 219.56 L ${g.collarLeftOuter} 196.94 Q ${g.collarLeftOuter + 26.78} 205.84 ${g.collarLeftOuter + 53.45} 205.84 H ${g.collarRightOuter - 53.33} Q ${g.collarRightOuter - 26.66} 205.84 ${g.collarRightOuter} 196.94 Z`
    : `M ${g.collarRightOuter} 196.94 L ${g.xRightShoulder} 219.56 L ${g.xRightBody} ${g.yBody} L ${g.xRightHem} ${g.yHem} H ${g.xLeftHem} L ${g.xLeftBody} ${g.yBody} L ${g.xLeftShoulder} 219.56 L ${g.collarLeftOuter} 196.94 Q ${g.collarLeftOuter + 26.78} 205.84 ${g.collarLeftOuter + 53.45} 205.84 H ${g.collarRightOuter - 53.33} Q ${g.collarRightOuter - 26.66} 205.84 ${g.collarRightOuter} 196.94 Z`;
  pathEl.setAttribute('d', outerPath);
  clipPathEl.setAttribute('d', outerPath);
  paths.sleeveSeamLeft.setAttribute('d', g.hasSleeve ? `M ${g.xLeftShoulder} 219.56 C ${g.xLeftShoulder + 4.07} 290 ${g.xLeftBody - 27.11} 335 ${g.xLeftBody - 27.11} 355.98` : '');
  paths.sleeveSeamRight.setAttribute('d', g.hasSleeve ? `M ${g.xRightShoulder} 219.56 C ${g.xRightShoulder - 4.07} 290 ${g.xRightBody + 27.11} 335 ${g.xRightBody + 27.11} 355.98` : '');
}

function getHandlePositions(g) {
  return {
    shoulderLeft: { x: g.xLeftShoulder, y: 219.56 },
    shoulderRight: { x: g.xRightShoulder, y: 219.56 },
    sleeveLeft: g.leftSleeveTop,
    sleeveRight: g.rightSleeveTop,
    bodyLeft: { x: g.xLeftBody, y: g.yBody },
    bodyRight: { x: g.xRightBody, y: g.yBody },
    hem: { x: (g.xLeftHem + g.xRightHem) / 2, y: g.yHem },
  };
}

function setHandlePositions(positions) {
  Object.entries(positions).forEach(([key, point]) => {
    handles[key].setAttribute('cx', point.x);
    handles[key].setAttribute('cy', point.y);
  });
}

function setLine(line, x1, y1, x2, y2) {
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
}

function setPoint(point, x, y) {
  point.setAttribute('cx', x);
  point.setAttribute('cy', y);
}

function setLabel(label, text, x, y, anchor = 'start') {
  label.textContent = text;
  label.setAttribute('x', x);
  label.setAttribute('y', y);
  label.setAttribute('text-anchor', anchor);
}

function updateMeasurements(g) {
  const shoulderY = 175.2;
  const sleeveMidX = (g.xRightShoulder + g.rightSleeveTop.x) / 2;
  const sleeveMidY = (219.56 + g.rightSleeveTop.y) / 2;
  const lengthX = (g.xLeftBody + g.xRightBody) / 2;
  const bodyLabelX = g.xLeftBody + (g.xRightBody - g.xLeftBody) * 0.25;

  setLine(measurements.shoulderLine, g.xLeftShoulder, shoulderY, g.xRightShoulder, shoulderY);
  setLine(measurements.bodyLine, g.xLeftBody, g.yBody, g.xRightBody, g.yBody);
  setLine(measurements.lengthLine, lengthX, 196.94, lengthX, g.yHem);
  setLine(measurements.sleeveLine, g.hasSleeve ? g.xRightShoulder : g.xLeftBody, g.hasSleeve ? 219.56 : g.yBody, g.hasSleeve ? g.rightSleeveTop.x : g.xRightBody, g.hasSleeve ? g.rightSleeveTop.y : g.yBody);

  setPoint(measurements.shoulderStart, g.xLeftShoulder, shoulderY);
  setPoint(measurements.shoulderEnd, g.xRightShoulder, shoulderY);
  setPoint(measurements.bodyStart, g.xLeftBody, g.yBody);
  setPoint(measurements.bodyEnd, g.xRightBody, g.yBody);
  setPoint(measurements.lengthStart, lengthX, 196.94);
  setPoint(measurements.lengthEnd, lengthX, g.yHem);
  setPoint(measurements.sleeveStart, g.hasSleeve ? g.xRightShoulder : g.xLeftBody, g.hasSleeve ? 219.56 : g.yBody);
  setPoint(measurements.sleeveEnd, g.hasSleeve ? g.rightSleeveTop.x : g.xRightBody, g.hasSleeve ? g.rightSleeveTop.y : g.yBody);

  setLabel(measurements.shoulderLabel, `${state.shoulder} mm`, (g.xLeftShoulder + g.xRightShoulder) / 2, shoulderY - 8, 'middle');
  setLabel(measurements.bodyLabel, `${state.body} mm`, bodyLabelX, g.yBody - 8, 'middle');
  setLabel(measurements.lengthLabel, `${state.length} mm`, lengthX + 8, (196.94 + g.yHem) / 2, 'start');
  setLabel(measurements.sleeveLabel, `${state.sleeve} mm`, g.hasSleeve ? sleeveMidX + 8 : g.xRightBody - 8, g.hasSleeve ? sleeveMidY - 6 : g.yBody + 16, g.hasSleeve ? 'start' : 'end');
}

function fitSvg(g) {
  const minX = Math.min(g.leftSleeveTop.x, g.leftCuff.x, g.xLeftHem, g.xLeftShoulder) - 42;
  const maxX = Math.max(g.rightSleeveTop.x, g.rightCuff.x, g.xRightHem, g.xRightShoulder) + 42;
  const minY = 150;
  const maxY = Math.max(720, g.yHem + 42);
  svg.setAttribute('viewBox', `${minX} ${minY} ${maxX - minX} ${maxY - minY}`);
  grid.setAttribute('x', minX);
  grid.setAttribute('y', minY);
  grid.setAttribute('width', maxX - minX);
  grid.setAttribute('height', maxY - minY);
  return { width: maxX - minX, height: maxY - minY };
}

function updateStrokeWidths(viewBox) {
  const distanceRatio = Math.max(viewBox.width / 620.48, viewBox.height / 570);
  const strokeScale = clamp(1 + (distanceRatio - 1) * 0.35, 1, 2.5);
  dynamicStrokeTargets.forEach(([element, baseWidth]) => element.setAttribute('stroke-width', baseWidth * strokeScale));
}

function updateUI() {
  enforceGarmentBounds();
  const geometry = getGeometry();
  updateValues();
  setPathGeometry(geometry);
  // ドラッグ中にviewBoxを変えると、操作点がポインタからずれて見えるため固定する。
  const viewBox = !activeHandle ? fitSvg(geometry) : svg.viewBox.baseVal;
  updateStrokeWidths(viewBox);
  setHandlePositions(getHandlePositions(geometry));
  updateMeasurements(geometry);
}

function syncLinkedDimensions(changedKey) {
  if (changedKey === 'body') {
    state.body = roundStep(clamp(state.body, state.min.body, state.max.body));
    state.shoulder = roundStep(clamp(state.body - linkedBodyOffset, state.min.shoulder, state.max.shoulder));
    state.body = state.shoulder + linkedBodyOffset;
    return;
  }

  state.shoulder = roundStep(clamp(state.shoulder, state.min.shoulder, state.max.shoulder - linkedBodyOffset));
  state.body = state.shoulder + linkedBodyOffset;
}

function setDimension(key, value) {
  const nextValue = roundStep(clamp(value, state.min[key], state.max[key]));
  state[key] = nextValue;
  if (state.linked && (key === 'body' || key === 'shoulder')) {
    syncLinkedDimensions(key);
  }
  enforceGarmentBounds();
  if (state.linked && (key === 'body' || key === 'shoulder')) {
    syncLinkedDimensions(key);
  }
  updateUI();
}

function getSvgPoint(event) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return { x: event.clientX, y: event.clientY };
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  return { x: point.x, y: point.y };
}

function handlePointerDown(event) {
  if (event.pointerType !== 'mouse' && event.pointerType !== 'touch') return;
  const target = event.target.closest('.handle');
  if (!target) return;
  event.preventDefault();
  try {
    svg.setPointerCapture(event.pointerId);
  } catch (error) {
    // Pointer Captureがない環境ではSVGイベントを追跡する。
  }
  activeHandle = target.dataset.handle;
  pointerId = event.pointerId;
  startPoint = getSvgPoint(event);
  dragStartValues = { shoulder: state.shoulder, sleeve: state.sleeve, body: state.body, length: state.length };
}

function handlePointerMove(event) {
  if (!activeHandle || event.pointerId !== pointerId) return;
  event.preventDefault();
  const point = getSvgPoint(event);
  const dx = point.x - startPoint.x;
  const dy = point.y - startPoint.y;
  if (activeHandle === 'shoulder-left' || activeHandle === 'shoulder-right') {
    setDimension('shoulder', dragStartValues.shoulder + (activeHandle === 'shoulder-left' ? -dx : dx) / geometryScale.shoulder);
  } else if (activeHandle === 'sleeve-left' || activeHandle === 'sleeve-right') {
    setDimension('sleeve', dragStartValues.sleeve + dy / geometryScale.sleeveY);
  } else if (activeHandle === 'body-left' || activeHandle === 'body-right') {
    setDimension('body', dragStartValues.body + (activeHandle === 'body-left' ? -dx : dx) / geometryScale.body);
  } else if (activeHandle === 'hem') {
    setDimension('length', dragStartValues.length + dy / geometryScale.hemY);
  }
}

function handlePointerUp(event) {
  if (event.pointerId !== pointerId) return;
  activeHandle = null;
  pointerId = null;
  startPoint = null;
  dragStartValues = null;
  updateUI();
}

svg.addEventListener('pointerdown', handlePointerDown);
svg.addEventListener('pointermove', handlePointerMove);
svg.addEventListener('pointerup', handlePointerUp);
svg.addEventListener('pointercancel', handlePointerUp);
svg.addEventListener('lostpointercapture', handlePointerUp);

Object.keys(ranges).forEach((key) => {
  ranges[key].addEventListener('input', () => setDimension(key, sliderToValue(key, ranges[key].value)));
  values[key].addEventListener('change', () => setDimension(key, Number(values[key].value)));
});

linkButton.addEventListener('click', () => {
  state.linked = !state.linked;
  linkButton.setAttribute('aria-pressed', String(state.linked));
  if (state.linked) {
    syncLinkedDimensions('shoulder');
    enforceGarmentBounds();
    syncLinkedDimensions('shoulder');
    updateUI();
  }
});

updateUI();