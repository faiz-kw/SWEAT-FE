import * as React from "react";
import { generateQRMatrix, ErrorCorrectionLevel } from "@/utils/qrCodeGenerator";

export interface QRCodeSvgProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  level?: ErrorCorrectionLevel;
  includeMargin?: boolean;
  className?: string;
  title?: string;
}

/**
 * High-performance, zero-dependency SVG QR Code component.
 * Renders standard ISO-18004 Model 2 2D barcodes into scalable SVG paths.
 */
export const QRCodeSvg: React.FC<QRCodeSvgProps> = ({
  value,
  size = 192,
  fgColor = "#000000",
  bgColor = "#ffffff",
  level = "M",
  includeMargin = true,
  className = "",
  title,
}) => {
  const matrix = React.useMemo(() => {
    if (!value) return [];
    try {
      return generateQRMatrix(value, level);
    } catch (e) {
      console.error("[QRCodeSvg] Generation failed:", e);
      return [];
    }
  }, [value, level]);

  if (!matrix || matrix.length === 0) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-muted text-muted-foreground text-xs rounded-lg ${className}`}
      >
        Invalid QR
      </div>
    );
  }

  const moduleCount = matrix.length;
  const margin = includeMargin ? 3 : 0;
  const totalCount = moduleCount + margin * 2;

  // Build a single SVG path string for optimal DOM performance
  let path = "";
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        const x = c + margin;
        const y = r + margin;
        path += `M${x},${y}h1v1h-1z `;
      }
    }
  }

  return (
    <svg
      role="img"
      aria-label={title || "Turnstile Access QR Code"}
      viewBox={`0 0 ${totalCount} ${totalCount}`}
      width={size}
      height={size}
      className={`select-none ${className}`}
      shapeRendering="crispEdges"
    >
      {title && <title>{title}</title>}
      {bgColor && (
        <rect
          x={0}
          y={0}
          width={totalCount}
          height={totalCount}
          fill={bgColor}
        />
      )}
      <path d={path.trim()} fill={fgColor} />
    </svg>
  );
};
