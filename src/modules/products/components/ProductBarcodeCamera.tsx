'use client';

import { useEffect, useRef, useState } from 'react';
import { normalizeProductCode } from '../code-utils';

interface ScannerControls {
  stop: () => void;
}

interface ProductBarcodeCameraProps {
  onCodeScanned: (code: string) => void;
}

function cameraErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'NotAllowedError') {
    return 'No se concedió permiso para usar la cámara. Puedes ingresar el código manualmente.';
  }
  if (error instanceof Error && error.name === 'NotFoundError') {
    return 'No se encontró una cámara disponible. Puedes ingresar el código manualmente.';
  }
  if (error instanceof Error && error.name === 'NotReadableError') {
    return 'La cámara está ocupada o no se puede iniciar. Puedes ingresar el código manualmente.';
  }
  return 'No se pudo iniciar la cámara. Puedes ingresar el código manualmente.';
}

export function ProductBarcodeCamera({ onCodeScanned }: ProductBarcodeCameraProps) {
  const [cameraMessage, setCameraMessage] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const componentActiveRef = useRef(false);
  const cameraStartingRef = useRef(false);
  const lastCameraCodeRef = useRef({ code: '', timestamp: 0 });
  const onCodeScannedRef = useRef(onCodeScanned);
  onCodeScannedRef.current = onCodeScanned;

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (typeof MediaStream !== 'undefined' && stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  useEffect(() => {
    componentActiveRef.current = true;
    const videoElement = videoRef.current;
    return () => {
      componentActiveRef.current = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
      const stream = videoElement?.srcObject;
      if (
        typeof MediaStream !== 'undefined' &&
        stream instanceof MediaStream
      ) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  async function startCamera() {
    if (cameraStartingRef.current || cameraActive) return;
    cameraStartingRef.current = true;
    setCameraMessage('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage(
        'Este dispositivo o navegador no ofrece cámara. Puedes ingresar el código manualmente.',
      );
      cameraStartingRef.current = false;
      return;
    }

    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current ?? undefined,
        (result) => {
          if (!result || !componentActiveRef.current) return;
          const scannedCode = result.getText();
          const normalizedCode = normalizeProductCode(scannedCode);
          const timestamp = Date.now();
          const previous = lastCameraCodeRef.current;
          if (previous.code === normalizedCode && timestamp - previous.timestamp < 1800) {
            return;
          }
          lastCameraCodeRef.current = { code: normalizedCode, timestamp };
          onCodeScannedRef.current(scannedCode);
        },
      );

      if (!componentActiveRef.current) {
        controls.stop();
      } else {
        controlsRef.current = controls;
        setCameraActive(true);
      }
    } catch (error) {
      if (componentActiveRef.current) setCameraMessage(cameraErrorMessage(error));
    } finally {
      cameraStartingRef.current = false;
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => void startCamera()}
        disabled={cameraActive}
        className="min-h-11 w-full rounded-md border border-primary px-4 font-semibold text-primary disabled:opacity-60"
      >
        {cameraActive ? 'Cámara activa' : 'Usar cámara'}
      </button>
      {cameraActive && (
        <button
          type="button"
          onClick={stopCamera}
          className="mt-2 min-h-11 w-full rounded-md border border-border px-4"
        >
          Apagar cámara
        </button>
      )}
      {cameraMessage && (
        <p role="status" className="mt-3 rounded-md bg-warning/10 p-3 text-sm">
          {cameraMessage}
        </p>
      )}
      <video
        ref={videoRef}
        className={`mt-3 w-full rounded-md bg-black ${cameraActive ? 'block' : 'hidden'}`}
        aria-label="Vista de la cámara para leer el código"
        muted
        playsInline
      />
    </div>
  );
}
