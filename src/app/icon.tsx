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
          borderRadius: 9999,
          background: "linear-gradient(135deg,#5e8ff7 0%,#2a4fdb 55%,#1c2f7a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path
            d="M11 35 C 16 27, 22 22, 30 16"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M14 38 C 19 30, 25 25, 33 19"
            stroke="#ffffff"
            strokeOpacity="0.4"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="32" cy="14" r="3.5" fill="#fbbf24" />
        </svg>
      </div>
    ),
    size
  );
}
