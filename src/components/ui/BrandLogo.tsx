import * as React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  showStatusDot?: boolean;
  statusDotPulse?: boolean;
  variant?: "badge" | "glyph";
  primaryColor?: string;
  accentColor?: string;
}

/**
 * PerformanceOS Enterprise Brand Emblem
 * An athletic cyber-shield telemetry emblem engineered with high-precision
 * geometry, multi-stop neon gradients, and live status beacon.
 * Dynamically adapts to tenant white-label primary and accent colors when configured.
 */
export function BrandLogo({
  size = 34,
  showStatusDot = true,
  statusDotPulse = true,
  variant = "badge",
  primaryColor,
  accentColor,
  className,
  ...props
}: BrandLogoProps) {
  const uid = React.useId().replace(/:/g, "");

  const bgGradId = `pos-bg-${uid}`;
  const rimGradId = `pos-rim-${uid}`;
  const coreGradId = `pos-core-${uid}`;
  const glowFilterId = `pos-glow-${uid}`;

  const rimStart = accentColor || primaryColor || "#38bdf8";
  const rimMid = primaryColor || "#2dd4bf";
  const rimEnd = primaryColor || "#10b981";

  const svgContent = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-200 group-hover:scale-105 select-none"
    >
      <defs>
        {/* Deep High-Tech Cosmic Obsidian Substrate */}
        <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f2b2c" />
          <stop offset="50%" stopColor="#081b1d" />
          <stop offset="100%" stopColor="#020809" />
        </linearGradient>

        {/* Dynamic Multi-Stop Rim Gradient */}
        <linearGradient id={rimGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={rimStart} />
          <stop offset="50%" stopColor={rimMid} />
          <stop offset="100%" stopColor={rimEnd} />
        </linearGradient>

        {/* Radiant Telemetry Core Gradient */}
        <linearGradient id={coreGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor={rimStart} />
          <stop offset="70%" stopColor={rimMid} />
          <stop offset="100%" stopColor={rimEnd} />
        </linearGradient>

        {/* Optical Glow Filter */}
        <filter id={glowFilterId} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="3.5" floodColor={primaryColor || "#0ea5e9"} floodOpacity="0.45" />
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor={rimStart} floodOpacity="0.6" />
        </filter>
      </defs>

      {/* Rounded Squircle Substrate */}
      <rect width="64" height="64" rx="17" fill={`url(#${bgGradId})`} />
      <rect
        x="1"
        y="1"
        width="62"
        height="62"
        rx="16"
        stroke={`url(#${rimGradId})`}
        strokeWidth="1.5"
        strokeOpacity="0.38"
      />

      {/* Precision Athletic Cyber-Shield Hexagon */}
      <path
        d="M32 9 L51 20 L51 44 L32 55 L13 44 L13 20 Z"
        stroke={`url(#${rimGradId})`}
        strokeWidth="2.8"
        strokeLinejoin="round"
        fill="rgba(6, 182, 212, 0.08)"
      />

      {/* High-Performance Telemetry Velocity Core */}
      <g filter={`url(#${glowFilterId})`}>
        <path
          d="M34.5 14 L22 31.5 L31 31.5 L26.5 49 L43 27.5 L33 27.5 Z"
          fill={`url(#${coreGradId})`}
        />
      </g>
    </svg>
  );

  if (variant === "glyph") {
    return svgContent;
  }

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-2xl shadow-md transition-all duration-200",
        primaryColor ? "ring-1 border border-white/10" : "ring-1 ring-teal-500/25 hover:ring-teal-400/50 hover:shadow-[0_0_15px_rgba(45,212,191,0.2)]",
        className
      )}
      style={{
        width: size,
        height: size,
        ...(primaryColor ? { borderColor: primaryColor } : {}),
      }}
      {...props}
    >
      {svgContent}

      {/* Live Operational Status Indicator */}
      {showStatusDot && (
        <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5 items-center justify-center pointer-events-none">
          {statusDotPulse && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className="relative inline-flex size-2 rounded-full bg-emerald-400 ring-2 ring-sidebar" />
        </span>
      )}
    </div>
  );
}
