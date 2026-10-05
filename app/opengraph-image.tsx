import { ImageResponse } from "next/og";

export const alt = "DramaMatch: how are you feeling tonight?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const tiles = [
    "#7a1f2b",
    "#1d3557",
    "#3a1f5c",
    "#5c3a1f",
    "#1f5c4a",
    "#5c1f4a",
  ];
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#07070a",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: 18,
          padding: 18,
          opacity: 0.45,
          transform: "rotate(-7deg) scale(1.2)",
        }}
      >
        {Array.from({ length: 24 }, (_, i) => (
          <div
            key={i}
            style={{
              width: 150,
              height: 225,
              borderRadius: 14,
              background: `linear-gradient(160deg, ${tiles[i % 6]}, #0b0b10)`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(60% 70% at 50% 50%, rgba(7,7,10,.6), #07070a)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          gap: 22,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 34,
            fontWeight: 800,
            color: "#f4f1ec",
            letterSpacing: -1,
          }}
        >
          drama<span style={{ color: "#e5303c" }}>match</span>
        </div>
        <div
          style={{
            fontSize: 84,
            fontWeight: 800,
            color: "#f4f1ec",
            letterSpacing: -3,
            textAlign: "center",
            lineHeight: 1,
          }}
        >
          How are you feeling tonight?
        </div>
        <div style={{ fontSize: 30, color: "#b9b5ae" }}>
          A mood, a star or a movie in. Your next favourite out.
        </div>
      </div>
    </div>,
    size,
  );
}
