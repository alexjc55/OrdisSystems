import { getDB } from "./db";
import { categories, products, users } from "@shared/schema";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  console.log("🌱 Seeding database...");

  const db = await getDB();
  const existingProducts = await db.select().from(products).limit(1);
  const existingCategories = await db.select().from(categories).limit(1);
  const existingUsers = await db.select().from(users).limit(1);

  if (existingProducts.length > 0 || existingCategories.length > 0) {
    console.log("✅ Database already contains data, skipping seed");
    return;
  }

  // Create default admin account
  if (existingUsers.length === 0) {
    try {
      const hashedPassword = await hashPassword("admin123");
      await db.insert(users).values({
        id: "admin-default",
        username: "admin",
        email: "admin@example.com",
        firstName: "Admin",
        lastName: "",
        role: "admin",
        password: hashedPassword,
      });
      console.log("✅ Created default admin user (login: admin / password: admin123)");
      console.log("⚠️  Please change the admin password after first login!");
    } catch (error) {
      console.log("Admin user may already exist, skipping...");
    }
  }

  // Insert categories
  const categoryData = [
    { name: "Салаты", description: "Свежие салаты и закуски", icon: "🥗", sortOrder: 1 },
    { name: "Горячие блюда", description: "Основные блюда на развес", icon: "🍖", sortOrder: 2 },
    { name: "Гарниры", description: "Каши, картофель, овощи", icon: "🍚", sortOrder: 3 },
    { name: "Супы", description: "Первые блюда", icon: "🍲", sortOrder: 4 },
    { name: "Выпечка и десерты", description: "Блинчики, сырники, корндоги", icon: "🥞", sortOrder: 5 },
    { name: "Пирожки", description: "Свежие пирожки с разными начинками", icon: "🥟", sortOrder: 6 },
  ];

  const insertedCategories = await db.insert(categories).values(categoryData).returning();
  console.log(`✅ Created ${insertedCategories.length} categories`);

  // Insert products
  const productData = [
    // Салаты
    { name: "Оливье", description: "Классический салат с мясом, картофелем, морковью, яйцами и горошком", pricePerKg: "42.00", categoryId: insertedCategories.find(c => c.name === "Салаты")!.id, isAvailable: true },
    { name: "Винегрет", description: "Традиционный русский салат со свеклой, морковью и квашеной капустой", pricePerKg: "35.50", categoryId: insertedCategories.find(c => c.name === "Салаты")!.id, isAvailable: true },
    { name: "Мимоза", description: "Нежный слоеный салат с рыбой, яйцами и сыром", pricePerKg: "48.90", categoryId: insertedCategories.find(c => c.name === "Салаты")!.id, isAvailable: true },
    { name: "Абжерка", description: "Острый грузинский салат с овощами и зеленью", pricePerKg: "45.00", categoryId: insertedCategories.find(c => c.name === "Салаты")!.id, isAvailable: true },
    { name: "Аджика", description: "Острая закуска из помидоров, перца и специй", pricePerKg: "52.90", categoryId: insertedCategories.find(c => c.name === "Салаты")!.id, isAvailable: true },
    { name: "Баклажаны по-азиатски", description: "Маринованные баклажаны с чесноком и кориандром", pricePerKg: "58.80", categoryId: insertedCategories.find(c => c.name === "Салаты")!.id, isAvailable: true },
    { name: "Грибы по-азиатски", description: "Маринованные грибы с корейскими специями", pricePerKg: "62.50", categoryId: insertedCategories.find(c => c.name === "Салаты")!.id, isAvailable: true },
    { name: "Салат из капусты", description: "Свежая капуста с морковью и зеленью", pricePerKg: "25.90", categoryId: insertedCategories.find(c => c.name === "Салаты")!.id, isAvailable: true },
    { name: "Салат свежий с редиской", description: "Хрустящий салат из огурцов, редиски и зелени", pricePerKg: "32.50", categoryId: insertedCategories.find(c => c.name === "Салаты")!.id, isAvailable: true },
    { name: "Салат из свеклы", description: "Вареная свекла с чесноком и майонезом", pricePerKg: "28.90", categoryId: insertedCategories.find(c => c.name === "Салаты")!.id, isAvailable: true },
    { name: "Салат из моркови", description: "Корейская морковка с пряными специями", pricePerKg: "35.80", categoryId: insertedCategories.find(c => c.name === "Салаты")!.id, isAvailable: true },
    { name: "Салат Цезарь", description: "Классический салат с курицей, пармезаном и соусом цезарь", pricePerKg: "65.90", categoryId: insertedCategories.find(c => c.name === "Салаты")!.id, isAvailable: true },
    // Горячие блюда
    { name: "Котлеты", description: "Домашние мясные котлеты из говядины и свинины", pricePerKg: "72.50", categoryId: insertedCategories.find(c => c.name === "Горячие блюда")!.id, isAvailable: true },
    { name: "Паргит", description: "Куриное филе в панировке, жаренное до золотистой корочки", pricePerKg: "68.90", categoryId: insertedCategories.find(c => c.name === "Горячие блюда")!.id, isAvailable: true },
    { name: "Крылышки", description: "Сочные куриные крылышки в медово-горчичном соусе", pricePerKg: "65.80", categoryId: insertedCategories.find(c => c.name === "Горячие блюда")!.id, isAvailable: true },
    { name: "Окорочка", description: "Запеченные куриные окорочка с травами и специями", pricePerKg: "58.50", categoryId: insertedCategories.find(c => c.name === "Горячие блюда")!.id, isAvailable: true },
    { name: "Тефтели", description: "Нежные мясные шарики в томатном соусе", pricePerKg: "69.90", categoryId: insertedCategories.find(c => c.name === "Горячие блюда")!.id, isAvailable: true },
    { name: "Гуляш", description: "Тушеное мясо с овощами в пряном соусе", pricePerKg: "78.50", categoryId: insertedCategories.find(c => c.name === "Горячие блюда")!.id, isAvailable: true },
    { name: "Плов", description: "Классический узбекский плов с мясом и морковью", pricePerKg: "52.90", categoryId: insertedCategories.find(c => c.name === "Горячие блюда")!.id, isAvailable: true },
    { name: "Перцы фаршированные", description: "Болгарский перец, фаршированный мясом и рисом", pricePerKg: "62.50", categoryId: insertedCategories.find(c => c.name === "Горячие блюда")!.id, isAvailable: true },
    { name: "Голубцы", description: "Капустные листья с мясной начинкой в томатном соусе", pricePerKg: "58.90", categoryId: insertedCategories.find(c => c.name === "Горячие блюда")!.id, isAvailable: true },
    { name: "Отбивные", description: "Свиные отбивные в золотистой панировке", pricePerKg: "82.90", categoryId: insertedCategories.find(c => c.name === "Горячие блюда")!.id, isAvailable: true },
    { name: "Шницель", description: "Куриный шницель в хрустящей панировке", pricePerKg: "75.80", categoryId: insertedCategories.find(c => c.name === "Горячие блюда")!.id, isAvailable: true },
    { name: "Жаркое", description: "Мясо тушеное с картофелем и овощами по-домашнему", pricePerKg: "68.90", categoryId: insertedCategories.find(c => c.name === "Горячие блюда")!.id, isAvailable: true },
    { name: "Капуста тушеная", description: "Белокочанная капуста тушеная с морковью и луком", pricePerKg: "28.50", categoryId: insertedCategories.find(c => c.name === "Горячие блюда")!.id, isAvailable: true },
    // Гарниры
    { name: "Картошка жареная", description: "Золотистая жареная картошка с луком и зеленью", pricePerKg: "32.50", categoryId: insertedCategories.find(c => c.name === "Гарниры")!.id, isAvailable: true },
    { name: "Рис отварной", description: "Рассыпчатый белый рис с маслом", pricePerKg: "25.80", categoryId: insertedCategories.find(c => c.name === "Гарниры")!.id, isAvailable: true },
    { name: "Гречка", description: "Рассыпчатая гречневая каша с маслом", pricePerKg: "28.90", categoryId: insertedCategories.find(c => c.name === "Гарниры")!.id, isAvailable: true },
    { name: "Картофель отварной", description: "Молодой картофель отварной с укропом", pricePerKg: "26.50", categoryId: insertedCategories.find(c => c.name === "Гарниры")!.id, isAvailable: true },
    { name: "Макароны", description: "Отварные макароны с маслом и сыром", pricePerKg: "22.90", categoryId: insertedCategories.find(c => c.name === "Гарниры")!.id, isAvailable: true },
    { name: "Пюре картофельное", description: "Нежное картофельное пюре на молоке с маслом", pricePerKg: "35.80", categoryId: insertedCategories.find(c => c.name === "Гарниры")!.id, isAvailable: true },
    // Супы
    { name: "Борщ", description: "Традиционный украинский борщ со сметаной", pricePerKg: "38.50", categoryId: insertedCategories.find(c => c.name === "Супы")!.id, isAvailable: true },
    { name: "Солянка мясная", description: "Сытная солянка с копченостями и оливками", pricePerKg: "48.90", categoryId: insertedCategories.find(c => c.name === "Супы")!.id, isAvailable: true },
    { name: "Щи", description: "Кислые щи из квашеной капусты с мясом", pricePerKg: "35.80", categoryId: insertedCategories.find(c => c.name === "Супы")!.id, isAvailable: true },
    { name: "Суп гороховый", description: "Наваристый гороховый суп с копченостями", pricePerKg: "32.50", categoryId: insertedCategories.find(c => c.name === "Супы")!.id, isAvailable: true },
    { name: "Харчо", description: "Острый грузинский суп с мясом и рисом", pricePerKg: "42.90", categoryId: insertedCategories.find(c => c.name === "Супы")!.id, isAvailable: true },
    { name: "Лагман", description: "Узбекский суп с лапшой и мясом", pricePerKg: "45.80", categoryId: insertedCategories.find(c => c.name === "Супы")!.id, isAvailable: true },
    // Выпечка и десерты
    { name: "Блинчики с Куриной Грудкой и Сыром", description: "Сочная начинка из нежной куриной грудки и плавленого сыра в тонких блинчиках", pricePerKg: "62.90", categoryId: insertedCategories.find(c => c.name === "Выпечка и десерты")!.id, isAvailable: true },
    { name: "Блинчики с Мясом", description: "Тонкие и румяные блинчики с богатой мясной начинкой", pricePerKg: "58.90", categoryId: insertedCategories.find(c => c.name === "Выпечка и десерты")!.id, isAvailable: true },
    { name: "Сырники", description: "Нежные творожные сырники со сметаной", pricePerKg: "52.90", categoryId: insertedCategories.find(c => c.name === "Выпечка и десерты")!.id, isAvailable: true },
    { name: "Чебуреки с Мясом Жареные", description: "Хрустящие чебуреки с сочной мясной начинкой, обжаренные до золотистой корочки", pricePerKg: "65.50", categoryId: insertedCategories.find(c => c.name === "Выпечка и десерты")!.id, isAvailable: true },
    // Пирожки
    { name: "Пирожок с Мясом", description: "Сытный пирожок с ароматной мясной начинкой, выпеченный по домашнему рецепту", pricePerKg: "45.80", categoryId: insertedCategories.find(c => c.name === "Пирожки")!.id, isAvailable: true },
    { name: "Пирожок с Зеленым Луком и Яйцом", description: "Традиционный пирожок с начинкой из свежего зеленого лука и вареных яиц", pricePerKg: "38.50", categoryId: insertedCategories.find(c => c.name === "Пирожки")!.id, isAvailable: true },
    { name: "Пирожок с Картофелем", description: "Домашний пирожок с нежной картофельной начинкой и зеленью", pricePerKg: "35.90", categoryId: insertedCategories.find(c => c.name === "Пирожки")!.id, isAvailable: true },
    { name: "Пирожок с Яблоком", description: "Сладкий пирожок с ароматной яблочной начинкой и корицей", pricePerKg: "42.90", categoryId: insertedCategories.find(c => c.name === "Пирожки")!.id, isAvailable: true },
  ];

  const insertedProducts = await db.insert(products).values(productData).returning();
  console.log(`✅ Created ${insertedProducts.length} demo products`);

  console.log("✨ Database seeded successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔐 Admin credentials:");
  console.log("   Login:    admin");
  console.log("   Password: admin123");
  console.log("   ⚠️  Change password after first login!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}
