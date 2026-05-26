"use client";

import { QRCodeSVG } from "qrcode.react";

interface QrCodeProps {
  value: string;
  size?: number;
}

export function QrCode({ value, size = 128 }: QrCodeProps) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      level="M"
      bgColor="transparent"
      fgColor="currentColor"
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
