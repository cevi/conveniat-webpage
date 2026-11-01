'use client';

import type { RefObject } from 'react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** The part of the Barcode Detection API used here; not in the DOM typings yet. */
interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

/** Reads the QR code in the current video frame, if there is one. */
type DetectQrCode = (video: HTMLVideoElement) => Promise<string | undefined> | string | undefined;

const getDetector = (): BarcodeDetectorConstructor | undefined =>
  (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;

export type ScannerState = 'unsupported' | 'starting' | 'scanning' | 'denied';

const SCAN_INTERVAL_MS = 250;

/**
 * The edge of the square the fallback decoder reads. A full camera frame takes jsQR far longer
 * than the scan interval on a cheap phone; a QR code held in the frame still has enough pixels.
 */
const FALLBACK_FRAME_SIZE = 640;

const noop = (): void => {};

/** Camera support never changes while the page is open, so there is nothing to watch. */
const subscribeToNothing = (): (() => void) => noop;

/**
 * Whether the browser can open the camera at all. The server cannot know, so it renders the
 * camera view and the client corrects that after hydration instead of rendering something else
 * first.
 */
const useHasCamera = (): boolean =>
  useSyncExternalStore(
    subscribeToNothing,
    // only secure contexts expose it
    () => 'mediaDevices' in navigator,
    () => true,
  );

const createNativeDetect = (Detector: BarcodeDetectorConstructor): DetectQrCode => {
  const detector = new Detector({ formats: ['qr_code'] });
  return async (video) => {
    const codes = await detector.detect(video);
    return codes[0]?.rawValue;
  };
};

/**
 * Decodes with jsQR. It reads the centred square of the frame, which is what the square,
 * `object-cover` preview shows, scaled down to {@link FALLBACK_FRAME_SIZE}.
 */
const createFallbackDetect = async (): Promise<DetectQrCode> => {
  const { default: jsQR } = await import('jsqr');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  return (video) => {
    const { videoWidth, videoHeight } = video;
    if (context === null || videoWidth === 0 || videoHeight === 0) {
      return;
    }
    const side = Math.min(videoWidth, videoHeight);
    const size = Math.min(side, FALLBACK_FRAME_SIZE);
    if (canvas.width !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    context.drawImage(
      video,
      (videoWidth - side) / 2,
      (videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );
    const { data } = context.getImageData(0, 0, size, size);
    return jsQR(data, size, size, { inversionAttempts: 'dontInvert' })?.data;
  };
};

/**
 * Reads QR codes from the back camera. Chromium on Android brings its own detector, so nothing
 * extra loads there. WebKit, Firefox and desktop Chromium have none; only for them the jsQR
 * decoder is fetched, as its own chunk, once the scanner opens.
 *
 * `onResult` answers whether it handled the code. Only then does the scanner stop; a code it
 * could not use is ignored until a different one comes into view, so the camera stays live.
 */
export const useQrScanner = (
  onResult: (value: string) => boolean,
): { state: ScannerState; videoReference: RefObject<HTMLVideoElement | null> } => {
  const videoReference = useRef<HTMLVideoElement>(null);
  const hasCamera = useHasCamera();
  const [cameraState, setCameraState] = useState<ScannerState>('starting');

  useEffect(() => {
    const video = videoReference.current;
    if (!hasCamera || video === null) return;

    const Detector = getDetector();
    // loads while the user answers the permission prompt
    const detectPromise =
      Detector === undefined
        ? createFallbackDetect()
        : Promise.resolve(createNativeDetect(Detector));
    // a denied camera never awaits it, so its failure must not surface as unhandled
    detectPromise.catch(noop);
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;
    let rejected: string | undefined;

    const start = async (): Promise<void> => {
      let detect: DetectQrCode;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
      } catch {
        setCameraState('denied');
        return;
      }
      try {
        detect = await detectPromise;
      } catch {
        // the decoder chunk did not load, e.g. offline before it was ever cached
        for (const track of stream.getTracks()) track.stop();
        setCameraState('unsupported');
        return;
      }
      if (stopped) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      video.srcObject = stream;
      await video.play();
      setCameraState('scanning');
      timer = setInterval(() => {
        // starting from a promise turns a throwing synchronous decoder into a rejection
        Promise.resolve(video)
          .then(detect)
          .then((value) => {
            if (value === undefined || stopped || value === rejected) return;
            if (onResult(value)) {
              stopped = true;
              clearInterval(timer);
            } else rejected = value;
          })
          .catch(() => {
            // a frame that could not be read, the next one will do
          });
      }, SCAN_INTERVAL_MS);
    };
    void start();

    return (): void => {
      stopped = true;
      if (timer !== undefined) clearInterval(timer);
      for (const track of stream?.getTracks() ?? []) track.stop();
    };
  }, [onResult, hasCamera]);

  return { state: hasCamera ? cameraState : 'unsupported', videoReference };
};
