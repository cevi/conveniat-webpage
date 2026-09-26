'use client';

import type { RefObject } from 'react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** The part of the Barcode Detection API used here; not in the DOM typings yet. */
interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const getDetector = (): BarcodeDetectorConstructor | undefined =>
  (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;

export type ScannerState = 'unsupported' | 'starting' | 'scanning' | 'denied';

const SCAN_INTERVAL_MS = 250;

const noop = (): void => {};

/** Detector support never changes while the page is open, so there is nothing to watch. */
const subscribeToNothing = (): (() => void) => noop;

/**
 * Whether the browser has a detector. The server cannot know, so it renders the camera view
 * and the client corrects that after hydration instead of rendering something else first.
 */
const useHasDetector = (): boolean =>
  useSyncExternalStore(
    subscribeToNothing,
    () => getDetector() !== undefined,
    () => true,
  );

/**
 * Reads QR codes from the back camera with the browser's own detector, so no decoder has to
 * ship to cheap phones. Safari and Firefox have no detector; there the labels still work,
 * because they hold a plain link the phone's camera app opens.
 *
 * `onResult` answers whether it handled the code. Only then does the scanner stop; a code it
 * could not use is ignored until a different one comes into view, so the camera stays live.
 */
export const useQrScanner = (
  onResult: (value: string) => boolean,
): { state: ScannerState; videoReference: RefObject<HTMLVideoElement | null> } => {
  const videoReference = useRef<HTMLVideoElement>(null);
  const hasDetector = useHasDetector();
  const [cameraState, setCameraState] = useState<Exclude<ScannerState, 'unsupported'>>('starting');

  useEffect(() => {
    const Detector = getDetector();
    const video = videoReference.current;
    if (Detector === undefined || video === null) return;

    const detector = new Detector({ formats: ['qr_code'] });
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;
    let rejected: string | undefined;

    const start = async (): Promise<void> => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
      } catch {
        setCameraState('denied');
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
        detector
          .detect(video)
          .then((codes) => {
            const value = codes[0]?.rawValue;
            if (value === undefined || stopped || value === rejected) return;
            if (onResult(value)) stopped = true;
            else rejected = value;
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
  }, [onResult, hasDetector]);

  return { state: hasDetector ? cameraState : 'unsupported', videoReference };
};
