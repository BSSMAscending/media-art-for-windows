const FONT_SIZE = 14;
let videoElement, canvasElement, hiddenCanvasElement;
let hasStarted = false;
let bodyPixModel = null;
let requestId = 0;
let tf, bodyPix;

document.addEventListener('DOMContentLoaded', async () => {
  videoElement = document.getElementById('videoElement');
  canvasElement = document.getElementById('binaryCanvas');
  hiddenCanvasElement = document.getElementById('hiddenCanvas');

  const startButton = document.getElementById('startButton');

  startButton.addEventListener('click', startCamera);

  loadModel();
});

async function loadModel() {
  try {
    document.getElementById('titleText').textContent = 'AI 모델 로딩 중...';

    // TensorFlow is loaded via preload script
    tf = window.tf;
    bodyPix = window.bodyPix;

    await tf.ready();
    console.log('TensorFlow.js loaded');

    bodyPixModel = await bodyPix.load({
      architecture: 'MobileNetV1',
      outputStride: 16,
      multiplier: 0.75,
      quantBytes: 2
    });
    console.log('BodyPix Model loaded');

    document.getElementById('titleText').textContent = 'BINARY MEDIA ART';
  } catch (error) {
    console.error('Failed to load BodyPix model:', error);
    showError('AI 모델을 불러오지 못했습니다.');
  }
}

function showError(message) {
  const errorText = document.getElementById('errorText');
  errorText.textContent = message;
  errorText.style.display = 'block';
}

async function startCamera() {
  if (!bodyPixModel) {
    showError('AI 모델이 아직 로딩 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    });

    videoElement.srcObject = stream;
    await videoElement.play();

    hasStarted = true;
    document.getElementById('overlayUI').style.display = 'none';
    canvasElement.style.display = 'block';

    requestId = requestAnimationFrame(drawFrame);
  } catch (error) {
    console.error('Camera access failed:', error);
    showError('카메라 권한을 허용해주세요.');
  }
}

async function drawFrame() {
  if (!hasStarted || !videoElement || !canvasElement || !hiddenCanvasElement || !bodyPixModel) {
    requestId = requestAnimationFrame(drawFrame);
    return;
  }

  if (videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
    requestId = requestAnimationFrame(drawFrame);
    return;
  }

  const ctx = canvasElement.getContext('2d', { alpha: false });
  const hiddenCtx = hiddenCanvasElement.getContext('2d', { willReadFrequently: true });

  if (!ctx || !hiddenCtx) {
    requestId = requestAnimationFrame(drawFrame);
    return;
  }

  // Resize canvas to window size
  if (canvasElement.width !== window.innerWidth || canvasElement.height !== window.innerHeight) {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
  }

  // Set hidden canvas size for sampling
  const cols = Math.floor(canvasElement.width / FONT_SIZE);
  const rows = Math.floor(canvasElement.height / FONT_SIZE);

  if (hiddenCanvasElement.width !== cols || hiddenCanvasElement.height !== rows) {
    hiddenCanvasElement.width = cols;
    hiddenCanvasElement.height = rows;
  }

  try {
    // Perform person segmentation
    const segmentation = await bodyPixModel.segmentPerson(videoElement, {
      flipHorizontal: false,
      internalResolution: 'medium',
      segmentationThreshold: 0.7
    });

    // Draw video frame to hidden canvas (mirrored)
    hiddenCtx.save();
    hiddenCtx.scale(-1, 1);
    hiddenCtx.drawImage(videoElement, -hiddenCanvasElement.width, 0, hiddenCanvasElement.width, hiddenCanvasElement.height);
    hiddenCtx.restore();

    // Get pixel data
    const imgData = hiddenCtx.getImageData(0, 0, hiddenCanvasElement.width, hiddenCanvasElement.height);
    const pixels = imgData.data;

    // Draw mirrored video background
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(videoElement, -canvasElement.width, 0, canvasElement.width, canvasElement.height);
    ctx.restore();

    // Check if person is detected
    const hasPerson = segmentation.data.some(val => val === 1);
    if (!hasPerson) {
      requestId = requestAnimationFrame(drawFrame);
      return;
    }

    // Set font for binary text
    ctx.font = `bold ${FONT_SIZE}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw binary text overlay only on person areas
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // Map to segmentation data with mirroring
        const maskX = Math.floor((x / cols) * segmentation.width);
        const maskY = Math.floor((y / rows) * segmentation.height);
        const mirroredMaskX = segmentation.width - 1 - maskX;
        const isPerson = segmentation.data[maskY * segmentation.width + mirroredMaskX] === 1;

        if (!isPerson) continue;

        const i = (y * hiddenCanvasElement.width + x) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        // Dark background for person area
        ctx.fillStyle = '#020205';
        ctx.fillRect(x * FONT_SIZE, y * FONT_SIZE, FONT_SIZE, FONT_SIZE);

        // Calculate luminance and determine binary character
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const char = luminance > 0.4 ? '1' : '0';

        // Apply cyan color effect
        const cyanInfluence = 0.8;
        const outR = Math.floor(r * (1 - cyanInfluence) + 0 * cyanInfluence);
        const outG = Math.floor(g * (1 - cyanInfluence) + 255 * cyanInfluence);
        const outB = Math.floor(b * (1 - cyanInfluence) + 255 * cyanInfluence);

        const alpha = Math.max(0.4, luminance * 1.5);
        ctx.fillStyle = `rgba(${outR}, ${outG}, ${outB}, ${alpha})`;

        // Add glow effect for bright areas
        if (luminance > 0.7) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = `rgba(${outR}, ${outG}, ${outB}, 1)`;
        } else {
          ctx.shadowBlur = 0;
        }

        // Draw binary character
        ctx.fillText(
          char,
          x * FONT_SIZE + FONT_SIZE / 2,
          y * FONT_SIZE + FONT_SIZE / 2
        );
      }
    }
  } catch (error) {
    console.error('Error in drawFrame:', error);
  }

  requestId = requestAnimationFrame(drawFrame);
}

// Handle window resize
window.addEventListener('resize', () => {
  if (hasStarted && canvasElement) {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
  }
});