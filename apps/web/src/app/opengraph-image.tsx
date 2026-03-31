import { ImageResponse } from "next/og";

export const alt = "입춘 — 인디 공연 일정";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadGoogleFont(
  text: string,
  family: string,
  weight: number,
): Promise<ArrayBuffer> {
  const params = new URLSearchParams({
    family: `${family}:wght@${weight}`,
    text,
  });
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?${params}`)
  ).text();
  const match = css.match(/src:\s*url\(([^)]+)\)/);
  if (!match?.[1]) throw new Error(`Font URL not found for ${family}`);
  return await (await fetch(match[1])).arrayBuffer();
}

export default async function OGImage() {
  const allText = "입춘인디밴드아티스트공연일정을한눈에";

  const [headingFont, bodyFont] = await Promise.all([
    loadGoogleFont(allText, "Noto Serif KR", 900),
    loadGoogleFont(allText, "Noto Serif KR", 500),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FDFCF9",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontFamily: "Noto Serif KR",
            fontWeight: 900,
            color: "#1A1A1A",
            letterSpacing: "0.05em",
          }}
        >
          입춘
        </div>
        <div
          style={{
            fontSize: 28,
            fontFamily: "Noto Serif KR",
            fontWeight: 500,
            color: "#777777",
            marginTop: 16,
          }}
        >
          인디 밴드 · 아티스트 공연 일정을 한눈에
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Noto Serif KR", data: headingFont, weight: 900, style: "normal" as const },
        { name: "Noto Serif KR", data: bodyFont, weight: 500, style: "normal" as const },
      ],
    },
  );
}
