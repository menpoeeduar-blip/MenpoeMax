import { db, pool, usersTable, postsTable, jobsTable, listingsTable, communitiesTable, eventsTable, streamsTable } from "@workspace/db";

function id() {
  return Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 11);
}

async function main() {
  console.log("🌱 Seeding database...");

  // ── Users ────────────────────────────────────────────────────────────────
  const users = [
    { id: id(), clerkId: "seed_user_1", username: "sofia_tech", displayName: "Sofía Martínez", bio: "Desarrolladora Full-Stack | Open Source | Coffee ☕", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sofia", location: "Madrid, España", isVerified: true, isPremium: true, role: "creator" as const, followersCount: 12400, followingCount: 380, postsCount: 245 },
    { id: id(), clerkId: "seed_user_2", username: "carlos_dev", displayName: "Carlos Rodríguez", bio: "Product Manager @ TechCorp | Ex-Startup Founder 🚀", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=carlos", location: "Barcelona, España", isVerified: true, role: "user" as const, followersCount: 5800, followingCount: 210, postsCount: 130 },
    { id: id(), clerkId: "seed_user_3", username: "ana_design", displayName: "Ana García", bio: "UI/UX Designer | Creating beautiful experiences ✨", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=ana", location: "Valencia, España", isVerified: false, role: "creator" as const, followersCount: 8900, followingCount: 450, postsCount: 310 },
    { id: id(), clerkId: "seed_user_4", username: "techcorp_official", displayName: "TechCorp España", bio: "Empresa líder en soluciones tecnológicas 🏢", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=techcorp", location: "Madrid, España", isVerified: true, isPremium: true, role: "company" as const, followersCount: 34000, followingCount: 50, postsCount: 89 },
    { id: id(), clerkId: "seed_user_5", username: "miguel_startup", displayName: "Miguel Torres", bio: "CEO & Co-founder @NexaLab | Blockchain | AI 🤖", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=miguel", location: "Bilbao, España", isVerified: true, role: "influencer" as const, followersCount: 22100, followingCount: 890, postsCount: 567 },
    { id: id(), clerkId: "seed_user_6", username: "lucia_recruiter", displayName: "Lucía Fernández", bio: "Senior Recruiter | Talent Acquisition | Conectando talento 🤝", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=lucia", location: "Sevilla, España", isVerified: false, role: "recruiter" as const, followersCount: 3200, followingCount: 1100, postsCount: 78 },
    { id: id(), clerkId: "seed_user_7", username: "david_mkt", displayName: "David Sánchez", bio: "Digital Marketing Specialist | Growth Hacker 📈", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=david", location: "Zaragoza, España", role: "user" as const, followersCount: 1800, followingCount: 340, postsCount: 45 },
    { id: id(), clerkId: "seed_user_8", username: "elena_data", displayName: "Elena López", bio: "Data Scientist | ML Engineer | Python lover 🐍", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=elena", location: "Granada, España", isVerified: false, role: "creator" as const, followersCount: 6700, followingCount: 230, postsCount: 198 },
  ];

  for (const u of users) {
    await db.insert(usersTable).values(u).onConflictDoNothing();
  }
  console.log(`✅ ${users.length} usuarios creados`);

  const [sofia, carlos, ana, techcorp, miguel, lucia, david, elena] = users;

  // ── Posts ────────────────────────────────────────────────────────────────
  const posts = [
    { id: id(), authorId: sofia.id, content: "¡Acabo de lanzar mi nuevo proyecto open source! Un framework de React para crear dashboards en segundos. Dale una estrella ⭐ si te parece útil. #OpenSource #React #WebDev", postType: "text" as const, hashtags: ["#OpenSource", "#React", "#WebDev"], likesCount: 342, commentsCount: 28, sharesCount: 15, viewsCount: 8900 },
    { id: id(), authorId: carlos.id, content: "Reflexión del día: el 80% del éxito de un producto viene del 20% de las funcionalidades bien ejecutadas. Enfócate en lo que realmente importa 🎯 #ProductManagement #Startup", postType: "text" as const, hashtags: ["#ProductManagement", "#Startup"], likesCount: 218, commentsCount: 34, sharesCount: 67, viewsCount: 5400 },
    { id: id(), authorId: ana.id, content: "El nuevo diseño que presenté hoy a mi cliente fue un éxito total 🎨 Lección aprendida: siempre involucra al usuario final desde el inicio del proceso de diseño. #UXDesign #UserResearch", postType: "text" as const, hashtags: ["#UXDesign", "#UserResearch"], likesCount: 456, commentsCount: 41, sharesCount: 23, viewsCount: 12300 },
    { id: id(), authorId: techcorp.id, content: "🎉 ¡TechCorp cumple 10 años! Gracias a todos nuestros clientes y empleados por hacer esto posible. Hemos crecido de 5 a 300 personas. ¡El futuro es brillante! #TechCorp10 #Milestone", postType: "text" as const, hashtags: ["#TechCorp10", "#Milestone"], likesCount: 1203, commentsCount: 156, sharesCount: 89, viewsCount: 45000 },
    { id: id(), authorId: miguel.id, content: "La inteligencia artificial no va a quitarte el trabajo. La persona que sabe usar IA sí. Invierte en formación, no en miedo. 🤖 #AI #FutureOfWork #Tech", postType: "text" as const, hashtags: ["#AI", "#FutureOfWork", "#Tech"], likesCount: 892, commentsCount: 73, sharesCount: 234, viewsCount: 28000 },
    { id: id(), authorId: elena.id, content: "Análisis de 100k tweets con NLP: los posts con emojis tienen un 38% más de engagement. Los datos no mienten 📊 #DataScience #NLP #Python", postType: "text" as const, hashtags: ["#DataScience", "#NLP", "#Python"], likesCount: 567, commentsCount: 48, sharesCount: 91, viewsCount: 15600 },
    { id: id(), authorId: david.id, content: "3 estrategias que duplicaron el tráfico orgánico de mi cliente en 6 meses: 1) SEO técnico bien ejecutado 2) Contenido largo y de valor 3) Link building en nichos relevantes. #SEO #DigitalMarketing", postType: "text" as const, hashtags: ["#SEO", "#DigitalMarketing"], likesCount: 189, commentsCount: 22, sharesCount: 45, viewsCount: 6700 },
    { id: id(), authorId: sofia.id, content: "¿Cómo aprendo tecnologías nuevas? Regla simple: 1 hora diaria de práctica real, no de teoría. En 30 días tienes base sólida. En 90 días, proyectos reales. #Learning #Coding #DevLife", postType: "text" as const, hashtags: ["#Learning", "#Coding", "#DevLife"], likesCount: 734, commentsCount: 89, sharesCount: 156, viewsCount: 22000 },
    { id: id(), authorId: lucia.id, content: "Consejo para candidatos: personaliza SIEMPRE tu carta de presentación. El 60% de los CVs que recibo son genéricos. Los que destacan son los específicos. #Recruitment #Jobs #CareerTips", postType: "text" as const, hashtags: ["#Recruitment", "#Jobs", "#CareerTips"], likesCount: 312, commentsCount: 54, sharesCount: 78, viewsCount: 11200 },
    { id: id(), authorId: miguel.id, content: "NexaLab acaba de cerrar nuestra Serie A: €2.5M para expandir nuestra solución de blockchain para pymes. ¡Gracias a todos los inversores que creyeron en la visión! 🚀 #Startup #Blockchain #Funding", postType: "text" as const, hashtags: ["#Startup", "#Blockchain", "#Funding"], likesCount: 1567, commentsCount: 234, sharesCount: 445, viewsCount: 67000 },
    { id: id(), authorId: ana.id, content: "Diseño inclusivo: no es un extra, es la base. Si tu producto no funciona para personas con discapacidad, simplemente no está bien diseñado. #A11y #InclusiveDesign #UX", postType: "text" as const, hashtags: ["#A11y", "#InclusiveDesign", "#UX"], likesCount: 678, commentsCount: 45, sharesCount: 123, viewsCount: 18900 },
    { id: id(), authorId: carlos.id, content: "Acabo de terminar mi primera maratón 🏃‍♂️ 42km completados. El trabajo, la vida y el deporte pueden coexistir si organizas bien tu tiempo. #Marathon #WorkLifeBalance", postType: "text" as const, hashtags: ["#Marathon", "#WorkLifeBalance"], likesCount: 445, commentsCount: 67, sharesCount: 12, viewsCount: 9800 },
  ];

  for (const p of posts) {
    await db.insert(postsTable).values(p).onConflictDoNothing();
  }
  console.log(`✅ ${posts.length} posts creados`);

  // ── Jobs ─────────────────────────────────────────────────────────────────
  const jobs = [
    { id: id(), title: "Senior Full-Stack Developer", company: "TechCorp España", location: "Madrid, España", isRemote: true, salary: "55.000€ - 75.000€/año", jobType: "full_time" as const, description: "Buscamos un desarrollador Full-Stack senior para unirse a nuestro equipo de producto. Trabajarás en arquitectura de microservicios, APIs REST y aplicaciones React modernas en un entorno ágil.\n\nSe ofrece salario competitivo, stock options, seguro médico y 25 días de vacaciones.", requirements: ["5+ años con Node.js / TypeScript", "Experiencia con React y Next.js", "Conocimientos de PostgreSQL y MongoDB", "Experiencia con Docker y Kubernetes", "Inglés nivel B2 o superior"], applicantsCount: 47, postedById: techcorp.id },
    { id: id(), title: "Product Manager - Fintech", company: "NexaLab", location: "Barcelona, España", isRemote: false, salary: "60.000€ - 80.000€/año", jobType: "full_time" as const, description: "NexaLab busca un Product Manager apasionado por el sector fintech y blockchain. Liderarás la hoja de ruta del producto, trabajarás con equipos de ingeniería y diseño, y actuarás como voz del cliente.", requirements: ["3+ años como Product Manager", "Experiencia en fintech o banca", "Conocimiento de metodologías ágiles (Scrum/Kanban)", "Capacidad analítica y orientación a datos"], applicantsCount: 31, postedById: miguel.id },
    { id: id(), title: "UX/UI Designer", company: "DesignStudio Barcelona", location: "Barcelona, España", isRemote: true, salary: "40.000€ - 55.000€/año", jobType: "full_time" as const, description: "Diseñador UX/UI para liderar el diseño de nuestros productos digitales. Desde la investigación de usuarios hasta los prototipos de alta fidelidad, serás la persona clave en la experiencia de nuestros clientes.", requirements: ["Portfolio sólido de proyectos UX/UI", "Dominio de Figma y Adobe Creative Suite", "Experiencia con Design Systems"], applicantsCount: 23, postedById: ana.id },
    { id: id(), title: "Data Scientist - Machine Learning", company: "DataTech Solutions", location: "Madrid, España", isRemote: true, salary: "65.000€ - 90.000€/año", jobType: "full_time" as const, description: "Buscamos Data Scientist para desarrollar modelos de ML en producción. Trabajarás con grandes volúmenes de datos, construirás pipelines de datos y colaborarás con equipos de negocio.", requirements: ["Maestría en Ciencias de Datos o campo relacionado", "Python avanzado (pandas, scikit-learn, TensorFlow)", "Experiencia con MLOps y despliegue de modelos"], applicantsCount: 18, postedById: elena.id },
    { id: id(), title: "Marketing Digital Manager", company: "GrowthHQ", location: "Sevilla, España", isRemote: true, salary: "45.000€ - 60.000€/año", jobType: "full_time" as const, description: "Responsable del marketing digital de una startup en crecimiento acelerado. Gestionarás campañas de paid media, estrategia de contenidos, SEO y analítica web.", requirements: ["4+ años en marketing digital", "Google Ads y Meta Ads certificado", "Experiencia con HubSpot o Salesforce"], applicantsCount: 29, postedById: david.id },
    { id: id(), title: "DevOps Engineer", company: "CloudOps España", location: "Bilbao, España", isRemote: true, salary: "58.000€ - 78.000€/año", jobType: "full_time" as const, description: "DevOps Engineer para mantener y escalar nuestra infraestructura cloud. Trabajarás con AWS, Terraform, Kubernetes y CI/CD pipelines.", requirements: ["Experiencia con AWS, GCP o Azure", "Terraform / Ansible / Pulumi", "Kubernetes y Docker"], applicantsCount: 14, postedById: sofia.id },
    { id: id(), title: "iOS Developer", company: "MobileFirst", location: "Valencia, España", isRemote: false, salary: "50.000€ - 70.000€/año", jobType: "full_time" as const, description: "Desarrollador iOS para construir apps nativas de alta calidad. Trabajarás con Swift y SwiftUI en un equipo pequeño y ágil.", requirements: ["3+ años con Swift", "Experiencia con SwiftUI y UIKit", "Publicación de apps en App Store"], applicantsCount: 11, postedById: carlos.id },
    { id: id(), title: "Recruiter Técnico Senior", company: "TalentBridge", location: "Madrid, España", isRemote: true, salary: "38.000€ - 52.000€/año", jobType: "full_time" as const, description: "Recruiter técnico para identificar y atraer el mejor talento tecnológico. Colaborarás con hiring managers, gestionarás el proceso completo de selección.", requirements: ["3+ años en recruiting técnico", "Conocimiento del ecosistema tech", "Habilidades de entrevista técnica"], applicantsCount: 20, postedById: lucia.id },
    { id: id(), title: "Frontend Developer - React", company: "SaaS Platform", location: "Málaga, España", isRemote: true, salary: "42.000€ - 58.000€/año", jobType: "contract" as const, description: "Desarrollador Frontend React para proyecto de 6 meses con posibilidad de incorporación. Trabajarás en un dashboard SaaS con miles de usuarios activos.", requirements: ["3+ años con React", "TypeScript avanzado", "Experiencia con React Query y Zustand"], applicantsCount: 38, postedById: sofia.id },
    { id: id(), title: "Community Manager", company: "Social Brands", location: "Madrid, España", isRemote: true, salary: "28.000€ - 38.000€/año", jobType: "full_time" as const, description: "Community Manager para gestionar las redes sociales de marcas líderes. Crearás contenido, gestionarás la comunidad y analizarás métricas de engagement.", requirements: ["2+ años en gestión de comunidades", "Experiencia en todas las plataformas sociales", "Creatividad y buena redacción"], applicantsCount: 52, postedById: david.id },
  ];

  for (const j of jobs) {
    await db.insert(jobsTable).values(j).onConflictDoNothing();
  }
  console.log(`✅ ${jobs.length} empleos creados`);

  // ── Marketplace Listings ─────────────────────────────────────────────────
  const listings = [
    { id: id(), title: "MacBook Pro 14\" M3 Pro - Perfecto estado", description: "MacBook Pro 14 pulgadas con chip M3 Pro, 18GB RAM, 512GB SSD. Comprado hace 8 meses, en perfecto estado. Incluye cargador original y funda.", price: 1850, category: "electronics", condition: "like_new" as const, location: "Madrid, España", sellerId: sofia.id, imageUrls: [] },
    { id: id(), title: "iPhone 15 Pro Max 256GB - Titanio Natural", description: "iPhone 15 Pro Max en color Titanio Natural, 256GB de almacenamiento. Sin golpes ni rayaduras. Viene con caja original, cable y cargador.", price: 1100, category: "electronics", condition: "like_new" as const, location: "Barcelona, España", sellerId: carlos.id, imageUrls: [] },
    { id: id(), title: "Mesa de escritorio IKEA BEKANT 160x80cm", description: "Mesa de escritorio IKEA BEKANT 160x80cm, blanca. Ideal para home office. En buen estado, algún rasguño mínimo en la superficie.", price: 120, category: "home", condition: "good" as const, location: "Valencia, España", sellerId: ana.id, imageUrls: [] },
    { id: id(), title: "Silla ergonómica Herman Miller Aeron", description: "Silla Herman Miller Aeron talla B, en excelente estado. Regulable en todos los parámetros. La más cómoda para largas jornadas de trabajo.", price: 850, category: "home", condition: "good" as const, location: "Madrid, España", sellerId: elena.id, imageUrls: [] },
    { id: id(), title: "Sony WH-1000XM5 - Auriculares Noise Cancelling", description: "Auriculares Sony WH-1000XM5 en color negro. Cancelación de ruido excepcional. Caja y accesorios originales incluidos.", price: 280, category: "electronics", condition: "like_new" as const, location: "Sevilla, España", sellerId: lucia.id, imageUrls: [] },
    { id: id(), title: "Bicicleta de montaña Trek Marlin 7 - 2022", description: "Trek Marlin 7, talla L, color azul metalizado. Frenos hidráulicos Shimano, suspensión delantera. Revisada y lista para rodar.", price: 750, category: "sports", condition: "good" as const, location: "Zaragoza, España", sellerId: david.id, imageUrls: [] },
    { id: id(), title: "Cámara Sony Alpha 7 IV + Objetivo 28-70mm", description: "Sony Alpha 7 IV con objetivo 28-70mm f/3.5-5.6 OSS. Solo 5.000 disparos. Incluye 2 baterías, cargador, filtros UV y bolsa.", price: 2400, category: "electronics", condition: "good" as const, location: "Bilbao, España", sellerId: miguel.id, imageUrls: [] },
    { id: id(), title: "Monitor LG UltraWide 34\" - 100Hz IPS", description: "Monitor LG 34WN80C-B, resolución 3440x1440, 100Hz, panel IPS, conector USB-C y HDMI. Ideal para trabajo y gaming.", price: 420, category: "electronics", condition: "good" as const, location: "Madrid, España", sellerId: sofia.id, imageUrls: [] },
    { id: id(), title: "Teclado mecánico Keychron K2 - Brown switches", description: "Teclado mecánico Keychron K2 con switches Brown, retroiluminación RGB, compatible Mac/Windows. Con funda de transporte.", price: 95, category: "electronics", condition: "like_new" as const, location: "Barcelona, España", sellerId: carlos.id, imageUrls: [] },
    { id: id(), title: "Zapatillas Nike Air Max 270 - Talla 42", description: "Nike Air Max 270 en colorway blanco/negro, talla 42. Usadas 3 veces, prácticamente nuevas. Incluye caja original.", price: 95, category: "fashion", condition: "like_new" as const, location: "Málaga, España", sellerId: david.id, imageUrls: [] },
    { id: id(), title: "Diseño de logo + identidad visual completa", description: "Servicio de diseño freelance: logo profesional + identidad visual completa (colores, tipografía, patrones). Entrega en 7 días.", price: 350, category: "services", condition: "new" as const, location: "Valencia, España", sellerId: ana.id, imageUrls: [] },
    { id: id(), title: "Pack libros Python & Machine Learning", description: "4 libros: Python Crash Course, Hands-on ML, Deep Learning with Python y Pattern Recognition. Todos en perfecto estado.", price: 80, category: "freelance", condition: "good" as const, location: "Granada, España", sellerId: elena.id, imageUrls: [] },
  ];

  for (const l of listings) {
    await db.insert(listingsTable).values(l).onConflictDoNothing();
  }
  console.log(`✅ ${listings.length} anuncios de marketplace creados`);

  // ── Communities ──────────────────────────────────────────────────────────
  const communities = [
    { id: id(), name: "Devs en Español", slug: "devs-espanol", description: "Comunidad de desarrolladores hispanohablantes. Compartimos recursos, proyectos y ayudamos a crecer juntos.", visibility: "public" as const, membersCount: 15800, postsCount: 2340, ownerId: sofia.id },
    { id: id(), name: "Startup Founders España", slug: "startup-founders-espana", description: "Red de fundadores de startups en España. Networking, inversión y recursos para emprendedores.", visibility: "public" as const, membersCount: 8900, postsCount: 1230, ownerId: miguel.id },
    { id: id(), name: "UX/UI Design Community", slug: "ux-ui-design-community", description: "Diseñadores de producto compartiendo inspiración, feedback y oportunidades de trabajo.", visibility: "public" as const, membersCount: 12300, postsCount: 3450, ownerId: ana.id },
    { id: id(), name: "Data Science & ML Hispano", slug: "data-science-ml-hispano", description: "Comunidad de científicos de datos y profesionales ML en el mundo hispanohablante.", visibility: "public" as const, membersCount: 9700, postsCount: 1890, ownerId: elena.id },
    { id: id(), name: "Remote Jobs Spain", slug: "remote-jobs-spain", description: "Ofertas de trabajo remoto para profesionales en España. Comparte oportunidades y experiencias.", visibility: "public" as const, membersCount: 21400, postsCount: 4560, ownerId: lucia.id },
    { id: id(), name: "Marketing Digital España", slug: "marketing-digital-espana", description: "Estrategias, tendencias y herramientas de marketing digital para el mercado español.", visibility: "public" as const, membersCount: 6700, postsCount: 980, ownerId: david.id },
  ];

  for (const c of communities) {
    await db.insert(communitiesTable).values(c).onConflictDoNothing();
  }
  console.log(`✅ ${communities.length} comunidades creadas`);

  // ── Events ───────────────────────────────────────────────────────────────
  const now = new Date();
  const d = (days: number) => new Date(now.getTime() + days * 86400000);

  const events = [
    { id: id(), title: "Tech Summit Madrid 2026", description: "El mayor evento de tecnología de España. 3 días con más de 100 ponentes internacionales, talleres prácticos y networking.", organizerId: techcorp.id, startsAt: d(15), endsAt: d(17), eventType: "in_person" as const, location: "IFEMA Madrid, España", attendeesCount: 2340 },
    { id: id(), title: "Workshop: Inteligencia Artificial para Empresas", description: "Taller práctico de 4 horas sobre cómo implementar IA en tu empresa. Desde chatbots hasta análisis predictivo.", organizerId: miguel.id, startsAt: d(7), endsAt: d(7), eventType: "online" as const, location: "https://zoom.us/j/example", attendeesCount: 456 },
    { id: id(), title: "Meetup Diseño UX/UI Barcelona", description: "Encuentro mensual de la comunidad de diseñadores en Barcelona. Esta edición: Case studies de apps premiadas.", organizerId: ana.id, startsAt: d(5), endsAt: d(5), eventType: "in_person" as const, location: "Espai JuJol, Barcelona", attendeesCount: 78 },
    { id: id(), title: "Hackathon: Soluciones Climáticas con IA", description: "48 horas para desarrollar soluciones tecnológicas al cambio climático. Premios valorados en €20.000.", organizerId: sofia.id, startsAt: d(21), endsAt: d(23), eventType: "hybrid" as const, location: "Madrid + Online", attendeesCount: 234 },
    { id: id(), title: "Webinar: Cómo conseguir inversión para tu startup", description: "Panel de inversores hablan sobre qué buscan en una startup, cómo preparar el pitch y errores comunes.", organizerId: miguel.id, startsAt: d(3), endsAt: d(3), eventType: "online" as const, location: "https://meet.google.com/example", attendeesCount: 892 },
    { id: id(), title: "Feria de Empleo Tech 2026", description: "Conecta con más de 50 empresas tecnológicas que buscan talento. Entrevistas en vivo, presentaciones de empresa y más.", organizerId: lucia.id, startsAt: d(30), endsAt: d(31), eventType: "in_person" as const, location: "Palacio de Congresos, Sevilla", attendeesCount: 1200 },
  ];

  for (const e of events) {
    await db.insert(eventsTable).values(e).onConflictDoNothing();
  }
  console.log(`✅ ${events.length} eventos creados`);

  // ── Streams ──────────────────────────────────────────────────────────────
  const streams = [
    { id: id(), title: "🔴 Coding en vivo: API con Node.js + TypeScript", description: "Vamos a crear una API REST desde cero con Express, TypeScript y PostgreSQL. ¡Preguntas bienvenidas!", hostId: sofia.id, isLive: true, viewersCount: 234, peakViewers: 567, category: "Programming", startedAt: now },
    { id: id(), title: "🎨 Diseñando un app de viajes en Figma", description: "Sesión de diseño en vivo: wireframes, componentes y prototipo completo de una app de viajes.", hostId: ana.id, isLive: true, viewersCount: 189, peakViewers: 412, category: "Design", startedAt: now },
    { id: id(), title: "📊 Machine Learning: Predicción de precios en Python", description: "Construimos un modelo de regresión para predecir precios de casas. Dataset real de Kaggle.", hostId: elena.id, isLive: true, viewersCount: 156, peakViewers: 289, category: "Data Science", startedAt: now },
    { id: id(), title: "🚀 AMA: Levantando una Serie A", description: "Respondo todas vuestras preguntas sobre cómo levantamos nuestra ronda de inversión.", hostId: miguel.id, isLive: false, viewersCount: 0, peakViewers: 1243, category: "Entrepreneurship", startedAt: new Date(now.getTime() - 2 * 3600000), endedAt: now },
  ];

  for (const s of streams) {
    await db.insert(streamsTable).values(s).onConflictDoNothing();
  }
  console.log(`✅ ${streams.length} streams creados`);

  console.log("\n🎉 ¡Seed completado con éxito!");
  await pool.end();
}

main().catch((e) => {
  console.error("❌ Error en seed:", e);
  pool.end();
  process.exit(1);
});
