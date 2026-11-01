import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SupplyHub — Independent makers",
    short_name: "SupplyHub",
    description: "A curated marketplace for independent studios.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f6f9",
    theme_color: "#101a3a",
    icons: [
      { src: "/icons/supplyhub-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/supplyhub-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/supplyhub-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
