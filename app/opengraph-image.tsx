import { ImageResponse } from "next/og";
export const alt = "DramaMatch — Find a drama you’ll actually love.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 90,
        background: "#f9f7f2",
        color: "#252a27",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 30,
          color: "#b84f3c",
          marginBottom: 45,
        }}
      >
        ✳ DramaMatch.
      </div>
      <div
        style={{
          fontSize: 82,
          letterSpacing: -4,
          lineHeight: 1.08,
          display: "flex",
        }}
      >
        Find a drama you’ll
      </div>
      <div
        style={{
          fontSize: 82,
          letterSpacing: -4,
          color: "#b84f3c",
          display: "flex",
        }}
      >
        actually love.
      </div>
      <div style={{ fontSize: 25, marginTop: 35, display: "flex" }}>
        K-dramas + C-dramas matched to your mood.
      </div>
    </div>,
    size,
  );
}
