import { Router } from "express";
import { db, usersTable, listingsTable } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import { getOrCreateUser } from "../lib/clerk";
import { generateId } from "../lib/id";

const router = Router();

function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    clerkId: user.clerkId,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    coverUrl: user.coverUrl ?? null,
    location: user.location ?? null,
    website: user.website ?? null,
    role: user.role,
    isVerified: user.isVerified,
    isPremium: user.isPremium,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    postsCount: user.postsCount,
    isFollowing: false,
    createdAt: user.createdAt.toISOString(),
  };
}

async function serializeListing(listing: typeof listingsTable.$inferSelect, sellerMap: Map<string, typeof usersTable.$inferSelect>) {
  const seller = sellerMap.get(listing.sellerId);
  if (!seller) return null;
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    currency: listing.currency,
    category: listing.category,
    condition: listing.condition,
    imageUrls: listing.imageUrls,
    location: listing.location ?? null,
    sellerId: listing.sellerId,
    seller: serializeUser(seller),
    isAvailable: listing.isAvailable,
    viewsCount: listing.viewsCount,
    createdAt: listing.createdAt.toISOString(),
  };
}

const CATEGORIES = [
  { id: "agro-insumos", name: "Agro insumos", icon: "Sprout", listingsCount: 0 },
  { id: "paquetes-turismo", name: "Paquetes de turismo", icon: "Plane", listingsCount: 0 },
  { id: "envases-plastico-vidrio", name: "Envases plásticos y vidrio", icon: "Package", listingsCount: 0 },
  { id: "mascotas", name: "Artículos de mascotas", icon: "PawPrint", listingsCount: 0 },
  { id: "bebidas-comestibles", name: "Bebidas y comestibles", icon: "Coffee", listingsCount: 0 },
  { id: "accesorios-bebe", name: "Accesorios para bebé", icon: "Baby", listingsCount: 0 },
  { id: "vehiculos-autos", name: "Carros y camionetas", icon: "Car", listingsCount: 0 },
  { id: "motos-cuatrimotos", name: "Motos y cuatrimotos", icon: "Bike", listingsCount: 0 },
  { id: "inmuebles", name: "Inmuebles", icon: "Home", listingsCount: 0 },
  { id: "electronica", name: "Electrónica", icon: "Smartphone", listingsCount: 0 },
  { id: "repuestos-vehiculos", name: "Repuestos para vehículos", icon: "Wrench", listingsCount: 0 },
  { id: "belleza-cuidados", name: "Belleza y cuidados", icon: "Sparkles", listingsCount: 0 },
  { id: "industrias-oficinas", name: "Industrias y oficinas", icon: "Building2", listingsCount: 0 },
  { id: "videojuegos", name: "Todo para videojuegos", icon: "Gamepad2", listingsCount: 0 },
  { id: "instrumentos-musicales", name: "Instrumentos musicales", icon: "Music", listingsCount: 0 },
  { id: "libros-revistas", name: "Libros y revistas de novela", icon: "BookOpen", listingsCount: 0 },
  { id: "boletas-espectaculos", name: "Boletas para espectáculos", icon: "Ticket", listingsCount: 0 },
  { id: "construccion-obras", name: "Construcción de obras", icon: "HardHat", listingsCount: 0 },
  { id: "ropa-hombre", name: "Ropa para hombre", icon: "Shirt", listingsCount: 0 },
  { id: "calzado-damas", name: "Calzado para damas", icon: "Footprints", listingsCount: 0 },
];

// GET /api/marketplace/categories
router.get("/categories", async (req, res) => {
  return res.json(CATEGORIES);
});

// GET /api/marketplace/listings
router.get("/listings", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  let listings = await db.select().from(listingsTable).where(eq(listingsTable.isAvailable, true)).orderBy(desc(listingsTable.createdAt)).limit(50);

  const { category, q, minPrice, maxPrice } = req.query;
  if (category) listings = listings.filter((l) => l.category === category);
  if (q) listings = listings.filter((l) => l.title.toLowerCase().includes((q as string).toLowerCase()));
  if (minPrice) listings = listings.filter((l) => l.price >= Number(minPrice));
  if (maxPrice) listings = listings.filter((l) => l.price <= Number(maxPrice));

  const sellerIds = [...new Set(listings.map((l) => l.sellerId))];
  const sellers = sellerIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, sellerIds))
    : [];
  const sellerMap = new Map(sellers.map((s) => [s.id, s]));

  const result = (await Promise.all(listings.map((l) => serializeListing(l, sellerMap)))).filter(Boolean);
  return res.json(result);
});

// GET /api/marketplace/listings/:listingId
router.get("/listings/:listingId", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { listingId } = req.params;
  const rows = await db.select().from(listingsTable).where(eq(listingsTable.id, listingId)).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Listing not found" });

  const seller = await db.select().from(usersTable).where(eq(usersTable.id, rows[0].sellerId)).limit(1);
  const sellerMap = new Map(seller.map((s) => [s.id, s]));
  return res.json(await serializeListing(rows[0], sellerMap));
});

// POST /api/marketplace/listings
router.post("/listings", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { title, description = "", price, category, condition, imageUrls = [], location } = req.body;
  if (!title || price === undefined || !category || !condition) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const id = generateId();
  await db.insert(listingsTable).values({ id, title, description, price, category, condition, imageUrls, location, sellerId: user.id });
  const listings = await db.select().from(listingsTable).where(eq(listingsTable.id, id)).limit(1);
  const sellerMap = new Map([[user.id, user]]);
  return res.status(201).json(await serializeListing(listings[0], sellerMap));
});

// PATCH /api/marketplace/listings/:listingId
router.patch("/listings/:listingId", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { listingId } = req.params;
  const rows = await db.select().from(listingsTable).where(eq(listingsTable.id, listingId)).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Listing not found" });
  if (rows[0].sellerId !== user.id) return res.status(403).json({ error: "Forbidden" });

  const { title, description, price, category, condition, imageUrls, location, isAvailable } = req.body;
  const patch: Partial<typeof listingsTable.$inferInsert> = {};
  if (title !== undefined) patch.title = title;
  if (description !== undefined) patch.description = description;
  if (price !== undefined) patch.price = price;
  if (category !== undefined) patch.category = category;
  if (condition !== undefined) patch.condition = condition;
  if (imageUrls !== undefined) patch.imageUrls = imageUrls;
  if (location !== undefined) patch.location = location;
  if (isAvailable !== undefined) patch.isAvailable = isAvailable;

  await db.update(listingsTable).set(patch).where(eq(listingsTable.id, listingId));
  const updated = await db.select().from(listingsTable).where(eq(listingsTable.id, listingId)).limit(1);
  const sellerMap = new Map([[user.id, user]]);
  return res.json(await serializeListing(updated[0], sellerMap));
});

// DELETE /api/marketplace/listings/:listingId
router.delete("/listings/:listingId", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { listingId } = req.params;
  const rows = await db.select().from(listingsTable).where(eq(listingsTable.id, listingId)).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Listing not found" });
  if (rows[0].sellerId !== user.id) return res.status(403).json({ error: "Forbidden" });

  await db.delete(listingsTable).where(eq(listingsTable.id, listingId));
  return res.status(204).send();
});

export default router;
