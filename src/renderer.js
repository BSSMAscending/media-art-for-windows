const FONT_SIZE = 8;
let videoElement, canvasElement, hiddenCanvasElement;
let hasStarted = false;
let bodyPixModel = null;
let requestId = 0;
let tf, bodyPix;
let availableCameras = [];
let selectedCameraId = null;
let selectedVersion = 'original';

document.addEventListener('DOMContentLoaded', async () => {
  videoElement = document.getElementById('videoElement');
  canvasElement = document.getElementById('binaryCanvas');
  hiddenCanvasElement = document.getElementById('hiddenCanvas');

  const startButton = document.getElementById('startButton');
  const cameraSelect = document.getElementById('cameraSelect');
  const versionSelect = document.getElementById('versionSelect');

  startButton.addEventListener('click', startCamera);
  cameraSelect.addEventListener('change', (event) => {
    selectedCameraId = event.target.value;
  });
  versionSelect.addEventListener('change', (event) => {
    selectedVersion = event.target.value;
  });

  await getCameraDevices();
  loadModel();
});

async function getCameraDevices() {
  try {
    // Request initial permission to enumerate devices
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    availableCameras = devices.filter(device => device.kind === 'videoinput');

    const cameraSelect = document.getElementById('cameraSelect');
    cameraSelect.innerHTML = '';

    if (availableCameras.length === 0) {
      cameraSelect.innerHTML = '<option value="">카메라를 찾을 수 없습니다</option>';
      return;
    }

    // Add default option
    cameraSelect.innerHTML = '<option value="">기본 카메라</option>';

    // Add camera options
    availableCameras.forEach((camera, index) => {
      const option = document.createElement('option');
      option.value = camera.deviceId;
      option.textContent = camera.label || `카메라 ${index + 1}`;
      cameraSelect.appendChild(option);
    });

    // Set first camera as default if available
    if (availableCameras.length > 0) {
      selectedCameraId = '';
    }
  } catch (error) {
    console.error('Failed to get camera devices:', error);
    const cameraSelect = document.getElementById('cameraSelect');
    cameraSelect.innerHTML = '<option value="">카메라 권한이 필요합니다</option>';
  }
}

async function loadModel() {
  try {
    document.getElementById('titleText').textContent = 'AI 모델 로딩 중...';

    // TensorFlow is loaded via preload script
    tf = window.tf;
    bodyPix = window.bodyPix;

    await tf.ready();
    console.log('TensorFlow.js loaded');

    bodyPixModel = await bodyPix.load({
      architecture: 'ResNet50',
      outputStride: 16,
      quantBytes: 4
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
    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    };

    // Use selected camera if available
    if (selectedCameraId) {
      constraints.video.deviceId = { exact: selectedCameraId };
    } else {
      constraints.video.facingMode = 'user';
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    videoElement.srcObject = stream;
    await videoElement.play();

    hasStarted = true;
    document.getElementById('overlayUI').style.display = 'none';
    canvasElement.style.display = 'block';

    requestId = requestAnimationFrame(drawFrame);
  } catch (error) {
    console.error('Camera access failed:', error);
    showError('선택한 카메라에 접근할 수 없습니다. 다른 카메라를 선택해보세요.');
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
    // Perform person segmentation with higher accuracy settings
    const segmentation = await bodyPixModel.segmentPerson(videoElement, {
      flipHorizontal: false,
      internalResolution: 'high',
      segmentationThreshold: 0.5,
      maxDetections: 1,
      scoreThreshold: 0.5,
      nmsRadius: 20
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

    // Handle black and white version with smooth silhouette
    if (selectedVersion === 'blackwhite') {
      // Fill entire canvas with black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

      // Create smooth white silhouette using segmentation mask
      const maskData = new ImageData(segmentation.width, segmentation.height);

      // Fill mask data: white for person, transparent for background
      for (let i = 0; i < segmentation.data.length; i++) {
        const baseIndex = i * 4;
        if (segmentation.data[i] === 1) {
          maskData.data[baseIndex] = 255;     // R
          maskData.data[baseIndex + 1] = 255; // G
          maskData.data[baseIndex + 2] = 255; // B
          maskData.data[baseIndex + 3] = 255; // A
        } else {
          maskData.data[baseIndex + 3] = 0;   // Transparent
        }
      }

      // Create temporary canvas for mask
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = segmentation.width;
      tempCanvas.height = segmentation.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.putImageData(maskData, 0, 0);

      // Draw mirrored mask to main canvas
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(tempCanvas, -canvasElement.width, 0, canvasElement.width, canvasElement.height);
      ctx.restore();

      requestId = requestAnimationFrame(drawFrame);
      return;
    }

    // Set font for binary text
    ctx.font = `bold ${FONT_SIZE}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Handle binary, numeric and busan versions with dark background
    if (selectedVersion === 'binary' || selectedVersion === 'numeric' || selectedVersion === 'busan') {
      // Fill entire canvas with dark background first
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
    }

    // Draw content based on selected version
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // Map to segmentation data with mirroring
        const maskX = Math.floor((x / cols) * segmentation.width);
        const maskY = Math.floor((y / rows) * segmentation.height);
        const mirroredMaskX = segmentation.width - 1 - maskX;
        const isPerson = segmentation.data[maskY * segmentation.width + mirroredMaskX] === 1;

        if (selectedVersion === 'original') {
          // Original version: binary text overlay only on person areas
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
        } else if (selectedVersion === 'blackwhite') {
          // Black and white version: smooth silhouette without pixel blocks
          continue; // Skip pixel-by-pixel processing for smooth silhouette
        } else if (selectedVersion === 'binary') {
          // Binary version: 0/1 characters only on person areas
          if (!isPerson) continue;

          const i = (y * hiddenCanvasElement.width + x) * 4;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];

          // Calculate luminance and determine binary character
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const char = luminance > 0.4 ? '1' : '0';

          // White text on dark background (no need to fill rect since background is already dark)
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 0;

          // Draw binary character
          ctx.fillText(
            char,
            x * FONT_SIZE + FONT_SIZE / 2,
            y * FONT_SIZE + FONT_SIZE / 2
          );
        } else if (selectedVersion === 'numeric') {
          // Numeric version: 0-9 characters based on density
          if (!isPerson) continue;

          const i = (y * hiddenCanvasElement.width + x) * 4;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];

          // Calculate luminance and map to 0-9 based on density
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          // Map luminance to numbers based on visual density (densest = brightest areas)
          // Dense numbers (8,9,6,4) for bright areas, sparse numbers (1,7,0,3) for dark areas
          let char;
          if (luminance < 0.1) char = '1';      // Darkest - most sparse
          else if (luminance < 0.2) char = '7'; // Very dark - sparse
          else if (luminance < 0.3) char = '0'; // Dark - very sparse
          else if (luminance < 0.4) char = '3'; // Medium dark - sparse
          else if (luminance < 0.5) char = '2'; // Medium - medium sparse
          else if (luminance < 0.6) char = '5'; // Medium bright - medium
          else if (luminance < 0.7) char = '4'; // Bright - medium dense
          else if (luminance < 0.8) char = '6'; // Brighter - dense
          else if (luminance < 0.9) char = '9'; // Very bright - dense
          else char = '8';                      // Brightest - very dense

          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 0;

          // Draw numeric character
          ctx.fillText(
            char,
            x * FONT_SIZE + FONT_SIZE / 2,
            y * FONT_SIZE + FONT_SIZE / 2
          );
        } else if (selectedVersion === 'busan') {
          // Busan theme: '부산수학문화관' characters based on luminance
          if (!isPerson) continue;

          const i = (y * hiddenCanvasElement.width + x) * 4;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];

          // Calculate luminance
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          // Map luminance to '부산수학문화관' characters (7 characters total)
          let char;
          if (luminance < 0.14) char = '부';      // Darkest
          else if (luminance < 0.28) char = '산'; // Very dark
          else if (luminance < 0.42) char = '수'; // Dark
          else if (luminance < 0.56) char = '학'; // Medium
          else if (luminance < 0.70) char = '문'; // Medium bright
          else if (luminance < 0.84) char = '화'; // Bright
          else char = '관';                       // Brightest

          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 0;

          // Draw Busan character
          ctx.fillText(
            char,
            x * FONT_SIZE + FONT_SIZE / 2,
            y * FONT_SIZE + FONT_SIZE / 2
          );
        }
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