import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "입춘 — 인디 공연 일정",
    short_name: "입춘",
    description: "인디 밴드·아티스트 공연 일정을 한눈에 확인하세요.",
    start_url: "/",
    display: "standalone",
    background_color: "#FDFCF9",
    theme_color: "#1A1A1A",
    icons: [
      {
        src: "/icon.png",
        sizes: "48x48",
        type: "image/png",
      },
    ],
  };
}
