```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as bodyPix from '@tensorflow-models/body-pix';

const FONT_SIZE = 14;

export default function BinaryCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [net, setNet] = useState<bodyPix.BodyPix | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const model = await bodyPix.load({
          architecture: 'MobileNetV1',
          outputStride: 16,
          multiplier: 0.75,
          quantBytes: 2
        });
        setNet(model);
        console.log('BodyPix Model Loaded');
      } catch (err) {
        console.error('Failed to load BodyPix model:', err);
        setError('인공지능 모델을 불러오지 못했습니다. (Failed to load AI model)');
      }
    };
    loadModel();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setHasStarted(true);
      }
    } catch (err: any) {
      console.error(err);
      setError('카메라 권한을 허용해주세요. (Please allow camera access)');
    }
  };

  // We define drawFrame with useCallback or just a standard function since it only depends on refs
  const drawFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;
    
    if (!video || !canvas || !hiddenCanvas || video.readyState !== video.HAVE_ENOUGH_DATA || !net) {
      requestRef.current = requestAnimationFrame(drawFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    const hCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
    if (!ctx || !hCtx) return;

    // Resize canvas to window if it changed
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    // Set hidden canvas size proportional to window but smaller for sampling
    const cols = Math.floor(canvas.width / FONT_SIZE);
    const rows = Math.floor(canvas.height / FONT_SIZE);
    
    if (hiddenCanvas.width !== cols || hiddenCanvas.height !== rows) {
      hiddenCanvas.width = cols;
      hiddenCanvas.height = rows;
    }

    // Perform segmentation
    const segmentation = await net.segmentPerson(video, {
      flipHorizontal: false,
      internalResolution: 'medium',
      segmentationThreshold: 0.7
    });

    // Capture current video frame to hidden canvas (mirrored)
    hCtx.save();
    hCtx.scale(-1, 1);
    hCtx.drawImage(video, -hiddenCanvas.width, 0, hiddenCanvas.width, hiddenCanvas.height);
    hCtx.restore();

    // Get pixel data for luminance
    const imgData = hCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    const pixels = imgData.data;

    // First, draw the actual video as background (mirrored)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // If no person detected (all pixels 0 in segmentation.data), we are done here
    const hasPerson = segmentation.data.some(val => val === 1);
    if (!hasPerson) {
      requestRef.current = requestAnimationFrame(drawFrame);
      return;
    }

    ctx.font = `bold ${FONT_SIZE}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw the binary text grid only for person areas
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // Map grid (x, y) to segmentation data index
        // The segmentation result is the same size as the input video usually, 
        // but net.segmentPerson with internalResolution handles resizing for us.
        // We need to sample from segmentation.data which has size videoWidth * videoHeight
        // or whatever InternalResolution returned.
        // Actually, BodyPix returns a mask of the same size as the input image.
        
        // Better way: Resize segmentation mask down to (cols, rows) if needed?
        // Let's use proportional indexing.
        const maskX = Math.floor((x / cols) * segmentation.width);
        const maskY = Math.floor((y / rows) * segmentation.height);
        // Explicitly handle mirroring to match the flipped background
        const isPerson = segmentation.data[maskY * segmentation.width + (segmentation.width - 1 - maskX)] === 1;

        if (!isPerson) continue;

        const i = (y * hiddenCanvas.width + x) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        // Mask background for the person with a solid dark color to make 0101 pop
        ctx.fillStyle = '#020205';
        ctx.fillRect(x * FONT_SIZE, y * FONT_SIZE, FONT_SIZE, FONT_SIZE);

        // Calculate relative luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const char = luminance > 0.4 ? '1' : '0';
        
        const cyanInfluence = 0.8;
        const outR = Math.floor(r * (1 - cyanInfluence) + 0 * cyanInfluence);
        const outG = Math.floor(g * (1 - cyanInfluence) + 255 * cyanInfluence);
        const outB = Math.floor(b * (1 - cyanInfluence) + 255 * cyanInfluence);

        const alpha = Math.max(0.4, luminance * 1.5); // Boosted alpha for visibility
        ctx.fillStyle = `rgba(${outR}, ${outG}, ${outB}, ${alpha})`;

        if (luminance > 0.7) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = `rgba(${outR}, ${outG}, ${outB}, 1)`;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillText(
          char,
          x * FONT_SIZE + FONT_SIZE / 2,
          y * FONT_SIZE + FONT_SIZE / 2
        );
      }
    }

    requestRef.current = requestAnimationFrame(drawFrame);
  }, [net]);

  useEffect(() => {
    if (hasStarted) {
      requestRef.current = requestAnimationFrame(drawFrame);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [hasStarted, drawFrame]);

  return (
    <>
      <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />

      {!hasStarted ? (
        <div className="overlay-ui">
          {error ? (
            <div style={{ color: '#ff3366', marginBottom: 20, letterSpacing: '1px' }}>{error}</div>
          ) : (
            <div className="title-text">BINARY MEDIA ART</div>
          )}
          <button className="start-button" onClick={startCamera}>
            START CAMERA
          </button>
        </div>
      ) : (
        <canvas className="binary-canvas" ref={canvasRef} />
      )}
    </>
  );
}
```