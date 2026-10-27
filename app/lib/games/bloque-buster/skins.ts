// Paletas de skin para BLOQUE BUSTER (Arkanoid) — SPEC 12.
//
// A diferencia de ROCAS/SERPENTINA, este motor NO pinta con fillStyle: dibuja
// desde un spritesheet PNG con los colores horneados en los pixeles (ver
// sprites.ts). El unico color que el motor fija directamente es el fondo. Por
// eso un skin aqui no es "color por rol", sino:
//   - bg: fondo del canvas (oscuro propio del skin),
//   - spriteFilter: cadena para ctx.filter que recolorea TODO lo que se dibuja
//     desde el atlas (bloques, paleta, pelota, explosiones); "none" = sin tocar,
//   - glowColor/glowBlur: halo CRT via shadowColor/shadowBlur alrededor de los
//     sprites (glowBlur 0 = sin glow).
// El motor aplica filter+glow una vez tras pintar el fondo y los resetea al
// terminar el frame. Anclaje: la portada .cover-bricks usa magenta/ambar/cian/
// verde — ese multicolor es la identidad de catalogo, de la que parte "neon".
import type { GameSkin } from "../types";
export interface BloqueBusterPalette {
  bg: string; // fondo del canvas
  spriteFilter: string; // valor de ctx.filter al dibujar el atlas ("none" = sin filtro)
  glowColor: string; // shadowColor del halo CRT
  glowBlur: number; // shadowBlur en px (0 = sin glow)
}
const SKINS: Record<GameSkin, BloqueBusterPalette> = {
  // Fiel al arcade: el multicolor del atlas tal cual sobre negro, sin filtro ni
  // glow. El default seguro.
  clasico: {
    bg: "#000000",
    spriteFilter: "none",
    glowColor: "#000000",
    glowBlur: 0,
  },
  // CRT vibrante: realza el multicolor del catalogo (mas saturacion y brillo)
  // sobre navy profundo (eco de la plataforma) con un halo cian que da bloom.
  neon: {
    bg: "#06061a",
    spriteFilter: "saturate(1.5) brightness(1.15)",
    glowColor: "#00f5ff",
    glowBlur: 8,
  },
  // Fosforo monocromo ambar: grayscale+sepia+hue-rotate convierte el atlas
  // multicolor en un unico tono ambar/oro desgastado sobre negro calido, con
  // glow tenue.
  retro: {
    bg: "#0d0a04",
    spriteFilter: "grayscale(1) sepia(1) saturate(3) hue-rotate(-18deg) brightness(1.05)",
    glowColor: "#ffb000",
    glowBlur: 4,
  },
};
export function getBloqueBusterSkin(
  skin: GameSkin = "clasico",
): BloqueBusterPalette {
  return SKINS[skin];
}
