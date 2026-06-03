import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TMC病院実習",
    short_name: "TMC病院実習",
    description: "TMC病院実習スケジュール・巡回記録管理システム",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#d50012",
    icons: [
      {
        src: "/病院実習.png",
        sizes: "2048x2048",
        type: "image/png",
      },
    ],
  }
}