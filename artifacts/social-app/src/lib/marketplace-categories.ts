/** Categorías del marketplace para publicar y filtrar anuncios (20 principales). */
export const MARKETPLACE_CATEGORIES = [
  { id: "agro-insumos", name: "Agro insumos", icon: "Sprout" },
  { id: "paquetes-turismo", name: "Paquetes de turismo", icon: "Plane" },
  { id: "envases-plastico-vidrio", name: "Envases plásticos y vidrio", icon: "Package" },
  { id: "mascotas", name: "Artículos de mascotas", icon: "PawPrint" },
  { id: "bebidas-comestibles", name: "Bebidas y comestibles", icon: "Coffee" },
  { id: "accesorios-bebe", name: "Accesorios para bebé", icon: "Baby" },
  { id: "vehiculos-autos", name: "Carros y camionetas", icon: "Car" },
  { id: "motos-cuatrimotos", name: "Motos y cuatrimotos", icon: "Bike" },
  { id: "inmuebles", name: "Inmuebles", icon: "Home" },
  { id: "electronica", name: "Electrónica", icon: "Smartphone" },
  { id: "repuestos-vehiculos", name: "Repuestos para vehículos", icon: "Wrench" },
  { id: "belleza-cuidados", name: "Belleza y cuidados", icon: "Sparkles" },
  { id: "industrias-oficinas", name: "Industrias y oficinas", icon: "Building2" },
  { id: "videojuegos", name: "Todo para videojuegos", icon: "Gamepad2" },
  { id: "instrumentos-musicales", name: "Instrumentos musicales", icon: "Music" },
  { id: "libros-revistas", name: "Libros y revistas de novela", icon: "BookOpen" },
  { id: "boletas-espectaculos", name: "Boletas para espectáculos", icon: "Ticket" },
  { id: "construccion-obras", name: "Construcción de obras", icon: "HardHat" },
  { id: "ropa-hombre", name: "Ropa para hombre", icon: "Shirt" },
  { id: "calzado-damas", name: "Calzado para damas", icon: "Footprints" },
] as const;

export type MarketplaceCategoryId = (typeof MARKETPLACE_CATEGORIES)[number]["id"];

export const DEFAULT_MARKETPLACE_CATEGORY: MarketplaceCategoryId = "electronica";
