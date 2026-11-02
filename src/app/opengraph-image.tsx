import { ImageResponse } from "next/og";

export const alt = "EvArkadaşıAra";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The default share image. Listing pages use their cover photo instead. */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        background: "#35E5FD",
        color: "#000000",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "#FFFFFF",
          borderRadius: 24,
          padding: "32px 48px",
          fontSize: 88,
          fontWeight: 800,
        }}
      >
        EvArkadaşı
        <span
          style={{
            background: "#35E5FD",
            borderRadius: 12,
            padding: "4px 20px",
          }}
        >
          Ara
        </span>
      </div>
      <div style={{ fontSize: 40 }}>Ev arkadaşı, kiralık oda ve stüdyo ilanları</div>
    </div>,
    size,
  );
}
