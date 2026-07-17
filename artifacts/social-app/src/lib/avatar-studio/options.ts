import type { AvatarStudioConfig } from "./types";

export const DEFAULT_AVATAR_CONFIG: AvatarStudioConfig = {
  skinColor: "edb98a",
  top: "ShortHairShortFlat",
  hairColor: "2c1b18",
  hatColor: "25557c",
  eyes: "Default",
  eyebrows: "Default",
  mouth: "Default",
  nose: "Default",
  clothing: "Hoodie",
  clothesColor: "3c4f5c",
  clothesGraphic: "Skull",
  accessories: "Blank",
  accessoriesColor: "262e33",
  facialHair: "Blank",
  facialHairColor: "2c1b18",
};

export type AvatarOptionCategory = {
  id: keyof AvatarStudioConfig | "expressions";
  label: string;
  icon: string;
};

export const AVATAR_CATEGORIES: AvatarOptionCategory[] = [
  { id: "skinColor", label: "Piel", icon: "🎨" },
  { id: "top", label: "Cabello", icon: "💇" },
  { id: "hairColor", label: "Color pelo", icon: "🖌️" },
  { id: "eyes", label: "Ojos", icon: "👀" },
  { id: "eyebrows", label: "Cejas", icon: "〰️" },
  { id: "mouth", label: "Boca", icon: "👄" },
  { id: "clothing", label: "Ropa", icon: "👕" },
  { id: "clothesColor", label: "Color ropa", icon: "🧥" },
  { id: "accessories", label: "Accesorios", icon: "🕶️" },
  { id: "facialHair", label: "Barba", icon: "🧔" },
];

type OptionItem = { value: string; label: string; swatch?: string };

export const AVATAR_OPTIONS: Record<keyof AvatarStudioConfig, OptionItem[]> = {
  skinColor: [
    { value: "614335", label: "Oscura", swatch: "#614335" },
    { value: "8d5524", label: "Morena", swatch: "#8d5524" },
    { value: "ae5d29", label: "Bronce", swatch: "#ae5d29" },
    { value: "edb98a", label: "Clara", swatch: "#edb98a" },
    { value: "ffdbb4", label: "Muy clara", swatch: "#ffdbb4" },
    { value: "fd9841", label: "Dorada", swatch: "#fd9841" },
  ],
  top: [
    { value: "ShortHairShortFlat", label: "Corto plano" },
    { value: "ShortHairShortRound", label: "Corto redondo" },
    { value: "ShortHairShortWaved", label: "Corto ondulado" },
    { value: "ShortHairSides", label: "Lados rapados" },
    { value: "LongHairStraight2", label: "Largo liso" },
    { value: "LongHairCurly", label: "Largo rizado" },
    { value: "LongHairBob", label: "Bob" },
    { value: "LongHairBun", label: "Moño" },
    { value: "Hat", label: "Sombrero" },
    { value: "WinterHat1", label: "Gorro invierno" },
    { value: "Hijab", label: "Hijab" },
    { value: "Turban", label: "Turbante" },
  ],
  hairColor: [
    { value: "2c1b18", label: "Negro", swatch: "#2c1b18" },
    { value: "4a312c", label: "Castaño oscuro", swatch: "#4a312c" },
    { value: "724133", label: "Castaño", swatch: "#724133" },
    { value: "a55728", label: "Pelirrojo", swatch: "#a55728" },
    { value: "b58143", label: "Rubio", swatch: "#b58143" },
    { value: "d6b370", label: "Rubio claro", swatch: "#d6b370" },
    { value: "c93305", label: "Naranja", swatch: "#c93305" },
    { value: "e8e1e1", label: "Plata", swatch: "#e8e1e1" },
  ],
  hatColor: [
    { value: "25557c", label: "Azul", swatch: "#25557c" },
    { value: "262e33", label: "Negro", swatch: "#262e33" },
    { value: "65c9ff", label: "Celeste", swatch: "#65c9ff" },
    { value: "929598", label: "Gris", swatch: "#929598" },
    { value: "e6e6e6", label: "Blanco", swatch: "#e6e6e6" },
    { value: "ff5c5c", label: "Rojo", swatch: "#ff5c5c" },
  ],
  eyes: [
    { value: "Default", label: "Normal" },
    { value: "Happy", label: "Feliz" },
    { value: "Hearts", label: "Corazones" },
    { value: "Wink", label: "Guiño" },
    { value: "Surprised", label: "Sorprendido" },
    { value: "Squint", label: "Entrecerrado" },
    { value: "Side", label: "Lado" },
    { value: "Cry", label: "Lágrimas" },
  ],
  eyebrows: [
    { value: "Default", label: "Normal" },
    { value: "RaisedExcited", label: "Animadas" },
    { value: "SadConcerned", label: "Tristes" },
    { value: "Angry", label: "Enojadas" },
    { value: "FlatNatural", label: "Naturales" },
    { value: "UpDown", label: "Arriba/abajo" },
  ],
  mouth: [
    { value: "Default", label: "Normal" },
    { value: "Smile", label: "Sonrisa" },
    { value: "Twinkle", label: "Risa" },
    { value: "Serious", label: "Seria" },
    { value: "Sad", label: "Triste" },
    { value: "ScreamOpen", label: "Sorprendida" },
    { value: "Tongue", label: "Lengua" },
    { value: "Eating", label: "Comiendo" },
  ],
  nose: [
    { value: "Default", label: "Normal" },
    { value: "Wide", label: "Ancha" },
    { value: "Round", label: "Redonda" },
  ],
  clothing: [
    { value: "Hoodie", label: "Sudadera" },
    { value: "BlazerShirt", label: "Blazer" },
    { value: "BlazerSweater", label: "Blazer + suéter" },
    { value: "CollarSweater", label: "Suéter cuello" },
    { value: "GraphicShirt", label: "Camiseta gráfica" },
    { value: "Overall", label: "Overol" },
    { value: "ShirtCrewNeck", label: "Cuello redondo" },
    { value: "ShirtVNeck", label: "Cuello V" },
  ],
  clothesColor: [
    { value: "3c4f5c", label: "Azul marino", swatch: "#3c4f5c" },
    { value: "262e33", label: "Negro", swatch: "#262e33" },
    { value: "65c9ff", label: "Azul", swatch: "#65c9ff" },
    { value: "5199e4", label: "Azul medio", swatch: "#5199e4" },
    { value: "25557c", label: "Índigo", swatch: "#25557c" },
    { value: "929598", label: "Gris", swatch: "#929598" },
    { value: "ff5c5c", label: "Rojo", swatch: "#ff5c5c" },
    { value: "ff488e", label: "Rosa", swatch: "#ff488e" },
    { value: "b8e986", label: "Verde", swatch: "#b8e986" },
    { value: "ffd5dc", label: "Pastel", swatch: "#ffd5dc" },
  ],
  clothesGraphic: [
    { value: "Skull", label: "Calavera" },
    { value: "Bat", label: "Murciélago" },
    { value: "Cumbia", label: "Cumbia" },
    { value: "Deer", label: "Ciervo" },
    { value: "Diamond", label: "Diamante" },
    { value: "Pizza", label: "Pizza" },
    { value: "Resist", label: "Resist" },
  ],
  accessories: [
    { value: "Blank", label: "Ninguno" },
    { value: "Sunglasses", label: "Lentes sol" },
    { value: "Round", label: "Lentes redondos" },
    { value: "Wayfarers", label: "Wayfarers" },
    { value: "Prescription01", label: "Receta 1" },
    { value: "Prescription02", label: "Receta 2" },
    { value: "Kurt", label: "Kurt" },
    { value: "Eyepatch", label: "Parche" },
  ],
  accessoriesColor: [
    { value: "262e33", label: "Negro", swatch: "#262e33" },
    { value: "25557c", label: "Azul", swatch: "#25557c" },
    { value: "e6e6e6", label: "Blanco", swatch: "#e6e6e6" },
    { value: "ff5c5c", label: "Rojo", swatch: "#ff5c5c" },
    { value: "ffd5dc", label: "Rosa", swatch: "#ffd5dc" },
  ],
  facialHair: [
    { value: "Blank", label: "Sin barba" },
    { value: "BeardMedium", label: "Barba media" },
    { value: "BeardLight", label: "Barba ligera" },
    { value: "BeardMajestic", label: "Barba majestuosa" },
    { value: "MoustacheFancy", label: "Bigote elegante" },
    { value: "MoustacheMagnum", label: "Bigote magnum" },
  ],
  facialHairColor: [
    { value: "2c1b18", label: "Negro", swatch: "#2c1b18" },
    { value: "4a312c", label: "Castaño", swatch: "#4a312c" },
    { value: "724133", label: "Marrón", swatch: "#724133" },
    { value: "a55728", label: "Pelirrojo", swatch: "#a55728" },
    { value: "b58143", label: "Rubio", swatch: "#b58143" },
    { value: "e8e1e1", label: "Gris", swatch: "#e8e1e1" },
  ],
};

export const STICKER_EXPRESSIONS = [
  { key: "neutral", label: "Hola", mouth: "Default", eyes: "Default", eyebrows: "Default", accessories: "Blank" },
  { key: "happy", label: "Feliz", mouth: "Smile", eyes: "Happy", eyebrows: "RaisedExcited", accessories: "Blank" },
  { key: "love", label: "Amor", mouth: "Smile", eyes: "Hearts", eyebrows: "Default", accessories: "Blank" },
  { key: "laugh", label: "Jaja", mouth: "Twinkle", eyes: "Happy", eyebrows: "RaisedExcited", accessories: "Blank" },
  { key: "wow", label: "Wow", mouth: "ScreamOpen", eyes: "Surprised", eyebrows: "RaisedExcited", accessories: "Blank" },
  { key: "sad", label: "Triste", mouth: "Sad", eyes: "Cry", eyebrows: "SadConcerned", accessories: "Blank" },
  { key: "cool", label: "Cool", mouth: "Serious", eyes: "Default", eyebrows: "Default", accessories: "Sunglasses" },
  { key: "wink", label: "Guiño", mouth: "Smile", eyes: "Wink", eyebrows: "Default", accessories: "Blank" },
] as const;

export function randomAvatarConfig(): AvatarStudioConfig {
  const pick = <K extends keyof AvatarStudioConfig>(key: K) => {
    const opts = AVATAR_OPTIONS[key];
    return opts[Math.floor(Math.random() * opts.length)].value as AvatarStudioConfig[K];
  };
  return {
    skinColor: pick("skinColor"),
    top: pick("top"),
    hairColor: pick("hairColor"),
    hatColor: pick("hatColor"),
    eyes: pick("eyes"),
    eyebrows: pick("eyebrows"),
    mouth: pick("mouth"),
    nose: pick("nose"),
    clothing: pick("clothing"),
    clothesColor: pick("clothesColor"),
    clothesGraphic: pick("clothesGraphic"),
    accessories: pick("accessories"),
    accessoriesColor: pick("accessoriesColor"),
    facialHair: pick("facialHair"),
    facialHairColor: pick("facialHairColor"),
  };
}
