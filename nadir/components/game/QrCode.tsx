'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QrCode({ value, size = 200, className }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(value, { width: size, margin: 1, color: { dark: '#05070f', light: '#f3f5fb' } }).then(setSrc).catch(() => setSrc(null));
  }, [value, size]);
  if (!src) return <div className={className} style={{ width: size, height: size }} aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} alt={`QR code to join: ${value}`} className={className} />;
}
