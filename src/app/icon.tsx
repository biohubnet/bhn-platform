import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 14,
          background: "linear-gradient(135deg,#3b6cef 0%,#1c2f7a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Mortarboard rhombus */}
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M20 8 L33 16 L20 24 L7 16 Z" fill="#ffffff" />
          <circle cx="20" cy="16" r="1.6" fill="#1c2f7a" />
          <path d="M33 16 Q33 20 31.5 23" stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <circle cx="31.5" cy="23.5" r="1.4" fill="#fbbf24" />
        </svg>
      </div>
    ),
    size
  );
}
