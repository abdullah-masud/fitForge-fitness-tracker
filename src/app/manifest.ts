import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FitForge — Personal Gym",
    short_name: "FitForge",
    description: "Train with purpose.",
    start_url: "/",
    display: "standalone",
    background_color: "#101218",
    theme_color: "#101218",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
