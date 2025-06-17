import { db } from "./db";
import { categories, products } from "@shared/schema";

export async function seedDatabase() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await db.delete(products);
  await db.delete(categories);

  // Insert categories
  const categoryData = [
    {
      name: "Салаты",
      description: "Свежие салаты и закуски",
      icon: "🥗",
      sortOrder: 1
    },
    {
      name: "Горячие блюда",
      description: "Основные блюда на развес",
      icon: "🍖",
      sortOrder: 2
    },
    {
      name: "Гарниры",
      description: "Каши, макароны, овощи",
      icon: "🍚",
      sortOrder: 3
    },
    {
      name: "Супы",
      description: "Первые блюда",
      icon: "🍲",
      sortOrder: 4
    },
    {
      name: "Выпечка",
      description: "Хлеб и кондитерские изделия",
      icon: "🥐",
      sortOrder: 5
    }
  ];

  const insertedCategories = await db.insert(categories).values(categoryData).returning();
  console.log(`✅ Created ${insertedCategories.length} categories`);

  // Insert products
  const productData = [
    // Салаты
    {
      name: "Салат Цезарь",
      description: "Классический салат с курицей, пармезаном и соусом цезарь",
      pricePerKg: "45.90",
      categoryId: insertedCategories.find(c => c.name === "Салаты")!.id,
      isAvailable: true
    },
    {
      name: "Салат Греческий",
      description: "Свежие овощи с сыром фета и оливками",
      pricePerKg: "38.50",
      categoryId: insertedCategories.find(c => c.name === "Салаты")!.id,
      isAvailable: true
    },
    {
      name: "Салат Оливье",
      description: "Традиционный русский салат с мясом и овощами",
      pricePerKg: "42.00",
      categoryId: insertedCategories.find(c => c.name === "Салаты")!.id,
      isAvailable: true
    },
    
    // Горячие блюда
    {
      name: "Курица по-домашнему",
      description: "Тушеная курица с овощами в сливочном соусе",
      pricePerKg: "65.80",
      categoryId: insertedCategories.find(c => c.name === "Горячие блюда")!.id,
      isAvailable: true
    },
    {
      name: "Говядина в соусе",
      description: "Нежная говядина в грибном соусе",
      pricePerKg: "89.90",
      categoryId: insertedCategories.find(c => c.name === "Горячие блюда")!.id,
      isAvailable: true
    },
    {
      name: "Рыба запеченная",
      description: "Филе рыбы запеченное с лимоном и специями",
      pricePerKg: "78.50",
      categoryId: insertedCategories.find(c => c.name === "Горячие блюда")!.id,
      isAvailable: true
    },
    
    // Гарниры
    {
      name: "Рис отварной",
      description: "Рассыпчатый рис с маслом и зеленью",
      pricePerKg: "25.00",
      categoryId: insertedCategories.find(c => c.name === "Гарниры")!.id,
      isAvailable: true
    },
    {
      name: "Картофель отварной",
      description: "Молодой картофель с укропом и маслом",
      pricePerKg: "28.90",
      categoryId: insertedCategories.find(c => c.name === "Гарниры")!.id,
      isAvailable: true
    },
    {
      name: "Гречка",
      description: "Рассыпчатая гречневая каша",
      pricePerKg: "32.50",
      categoryId: insertedCategories.find(c => c.name === "Гарниры")!.id,
      isAvailable: true
    },
    
    // Супы
    {
      name: "Борщ украинский",
      description: "Традиционный борщ со сметаной",
      pricePerKg: "35.80",
      categoryId: insertedCategories.find(c => c.name === "Супы")!.id,
      isAvailable: true
    },
    {
      name: "Солянка мясная",
      description: "Сытная солянка с копченостями и оливками",
      pricePerKg: "48.90",
      categoryId: insertedCategories.find(c => c.name === "Супы")!.id,
      isAvailable: true
    },
    
    // Выпечка
    {
      name: "Хлеб белый",
      description: "Свежий белый хлеб",
      pricePerKg: "15.50",
      categoryId: insertedCategories.find(c => c.name === "Выпечка")!.id,
      isAvailable: true
    },
    {
      name: "Булочки с маком",
      description: "Сдобные булочки с маковой начинкой",
      pricePerKg: "35.00",
      categoryId: insertedCategories.find(c => c.name === "Выпечка")!.id,
      isAvailable: true
    }
  ];

  const insertedProducts = await db.insert(products).values(productData).returning();
  console.log(`✅ Created ${insertedProducts.length} products`);
  
  console.log("✨ Database seeded successfully!");
}