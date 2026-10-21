'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

/** The edge of the square the photo is framed in, in CSS pixels. */
export const FRAME_EDGE = 256;
/** The edge of the square that is uploaded; the server shrinks it to its own square. */
const OUTPUT_EDGE = 512;
const MAX_ZOOM = 3;
/** How far an arrow key moves the photo. */
const KEY_STEP = 12;

interface DecodedPhoto {
  src: string;
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

export interface PhotoFraming {
  /** `undefined` while decoding, `false` for a photo this browser cannot decode (HEIC outside Safari) */
  photo: DecodedPhoto | false | undefined;
  zoom: number;
  setZoom: (zoom: number) => void;
  maxZoom: number;
  /** the CSS transform that shows the photo as framed */
  transform: string;
  stageHandlers: {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  };
  /** the framed square as a JPEG, ready to upload */
  crop: () => Promise<File | undefined>;
}

const clamp = (value: number, limit: number): number =>
  Math.min(Math.max(value, -limit), Math.max(limit, 0));

/**
 * Lets the user place their face in the round avatar before anything is uploaded: drag to move,
 * a slider or two fingers' worth of zoom, arrow keys for the keyboard. The photo always covers
 * the frame, so the crop never has an empty edge.
 */
export const usePhotoFraming = (
  file: File | undefined,
  /** called for a photo this browser cannot decode, HEIC outside Safari */
  onUndecodable: (file: File) => void,
): PhotoFraming => {
  const [photo, setPhoto] = useState<DecodedPhoto | false | undefined>();
  const [zoom, setZoomState] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number; from: { x: number; y: number } }>();
  const onUndecodableReference = useRef(onUndecodable);
  useEffect(() => {
    onUndecodableReference.current = onUndecodable;
  });

  // another photo starts over: centred, not zoomed
  const [framedFile, setFramedFile] = useState(file);
  if (file !== framedFile) {
    setFramedFile(file);
    setPhoto(undefined);
    setZoomState(1);
    setOffset({ x: 0, y: 0 });
  }

  useEffect(() => {
    if (file === undefined) return;
    let decoded: DecodedPhoto | undefined;
    let cancelled = false;
    createImageBitmap(file, { imageOrientation: 'from-image' })
      .then((bitmap) => {
        if (cancelled) {
          bitmap.close();
          return;
        }
        decoded = {
          src: URL.createObjectURL(file),
          bitmap,
          width: bitmap.width,
          height: bitmap.height,
        };
        setPhoto(decoded);
      })
      .catch(() => {
        if (cancelled) return;
        setPhoto(false);
        onUndecodableReference.current(file);
      });
    return (): void => {
      cancelled = true;
      if (decoded !== undefined) {
        URL.revokeObjectURL(decoded.src);
        decoded.bitmap.close();
      }
    };
  }, [file]);

  const scaleAt = useCallback(
    (atZoom: number): number =>
      photo ? (FRAME_EDGE / Math.min(photo.width, photo.height)) * atZoom : 1,
    [photo],
  );

  /** keeps the photo covering the frame at the given zoom */
  const clampOffset = useCallback(
    (next: { x: number; y: number }, atZoom: number): { x: number; y: number } => {
      if (!photo) return next;
      const scale = scaleAt(atZoom);
      return {
        x: clamp(next.x, (photo.width * scale - FRAME_EDGE) / 2),
        y: clamp(next.y, (photo.height * scale - FRAME_EDGE) / 2),
      };
    },
    [photo, scaleAt],
  );

  const setZoom = (next: number): void => {
    const bounded = Math.min(Math.max(next, 1), MAX_ZOOM);
    setZoomState(bounded);
    setOffset((current) => clampOffset(current, bounded));
  };

  const stageHandlers: PhotoFraming['stageHandlers'] = {
    onPointerDown: (event) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag({ x: event.clientX, y: event.clientY, from: offset });
    },
    onPointerMove: (event) => {
      if (drag === undefined) return;
      setOffset(
        clampOffset(
          {
            x: drag.from.x + event.clientX - drag.x,
            y: drag.from.y + event.clientY - drag.y,
          },
          zoom,
        ),
      );
    },
    onPointerUp: () => setDrag(undefined),
    onKeyDown: (event) => {
      const moves: Record<string, { x: number; y: number }> = {
        ArrowLeft: { x: KEY_STEP, y: 0 },
        ArrowRight: { x: -KEY_STEP, y: 0 },
        ArrowUp: { x: 0, y: KEY_STEP },
        ArrowDown: { x: 0, y: -KEY_STEP },
      };
      const move = moves[event.key];
      if (move === undefined) return;
      event.preventDefault();
      setOffset((current) => clampOffset({ x: current.x + move.x, y: current.y + move.y }, zoom));
    },
  };

  const scale = scaleAt(zoom);
  const transform = photo
    ? `translate(${offset.x - (photo.width * scale - FRAME_EDGE) / 2}px, ${offset.y - (photo.height * scale - FRAME_EDGE) / 2}px)`
    : '';

  const crop = async (): Promise<File | undefined> => {
    if (!photo) return undefined;
    const factor = OUTPUT_EDGE / FRAME_EDGE;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_EDGE;
    canvas.height = OUTPUT_EDGE;
    canvas
      .getContext('2d')
      ?.drawImage(
        photo.bitmap,
        (FRAME_EDGE / 2 + offset.x - (photo.width * scale) / 2) * factor,
        (FRAME_EDGE / 2 + offset.y - (photo.height * scale) / 2) * factor,
        photo.width * scale * factor,
        photo.height * scale * factor,
      );
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });
    return blob === null ? undefined : new File([blob], 'profile.jpg', { type: 'image/jpeg' });
  };

  return {
    photo,
    zoom,
    setZoom,
    maxZoom: MAX_ZOOM,
    transform,
    stageHandlers,
    crop,
  };
};
