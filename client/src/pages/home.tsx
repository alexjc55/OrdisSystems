import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import ProductCard from "@/components/menu/product-card";
import CategoryNav from "@/components/menu/category-nav";
import CartOverlay from "@/components/cart/cart-overlay";
import { useCartStore } from "@/lib/cart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Star, TrendingUp, Utensils, Clock, Phone, Mail, MapPin, Truck, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { CategoryWithProducts, ProductWithCategory } from "@shared/schema";

export default function Home() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const { isOpen: isCartOpen } = useCartStore();

  const { data: categories, isLoading: categoriesLoading } = useQuery<CategoryWithProducts[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const { data: allProducts, isLoading: allProductsLoading } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products", selectedCategoryId],
    enabled: selectedCategoryId !== null,
    queryFn: async () => {
      const url = selectedCategoryId === -1 ? "/api/products" : `/api/products?categoryId=${selectedCategoryId}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const { data: storeSettings } = useStoreSettings();

  const { data: searchResults, isLoading: searchLoading } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products/search", searchQuery],
    enabled: searchQuery.length > 2,
    queryFn: async () => {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setSearchQuery("");
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedCategoryId(null);
  };

  const selectedCategory = categories?.find(cat => cat.id === selectedCategoryId);
  
  // Filter out unavailable products for customers
  const availableProducts = (searchQuery.length > 2 ? searchResults : (selectedCategoryId === null ? allProducts : products))?.filter(product => product.isAvailable !== false) || [];
  const displayProducts = availableProducts;
  const isLoading = searchQuery.length > 2 ? searchLoading : (selectedCategoryId === null ? allProductsLoading : productsLoading);
  
  // Get popular products (top 6 available products for home page)
  const popularProducts = allProducts?.filter(product => product.isAvailable !== false)?.slice(0, 6) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex">
        <Sidebar 
          categories={categories || []} 
          selectedCategoryId={selectedCategoryId}
          onCategorySelect={handleCategorySelect}
          isLoading={categoriesLoading}
        />

        <main className="flex-1 p-6">
          {/* Search Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-poppins font-bold text-gray-900">
                  {(() => {
                    try {
                      if (searchQuery && searchQuery.length > 2) {
                        return `Результаты поиска: "${searchQuery}"`;
                      }
                      if (selectedCategory?.name) {
                        return selectedCategory.name;
                      }
                      if (storeSettings?.welcomeTitle) {
                        return storeSettings.welcomeTitle;
                      }
                      return "eDAHouse - טעים";
                    } catch (error) {
                      console.error('Error rendering title:', error);
                      return "eDAHouse - טעים";
                    }
                  })()}
                </h1>
                <p className="text-gray-600 mt-1">
                  {(() => {
                    try {
                      if (searchQuery && searchQuery.length > 2) {
                        return `Найдено товаров: ${searchResults?.length || 0}`;
                      }
                      if (selectedCategory?.description) {
                        return selectedCategory.description;
                      }
                      if (storeSettings?.storeDescription) {
                        return storeSettings.storeDescription;
                      }
                      return "Свежая домашняя еда на развес - выбирайте по вкусу";
                    } catch (error) {
                      console.error('Error rendering description:', error);
                      return "Свежая домашняя еда на развес - выбирайте по вкусу";
                    }
                  })()}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Поиск товаров..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 w-64"
                  />
                </div>
                {(user?.role === 'admin' || user?.role === 'worker') && (
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить товар
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {categoriesLoading && (
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <Utensils className="mr-3 h-6 w-6 text-primary" />
                <h2 className="text-2xl font-poppins font-bold text-gray-900">Загрузка меню...</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4 mx-auto"></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories Grid - Show when no category is selected and no search */}
          {selectedCategoryId === null && searchQuery.length <= 2 && !categoriesLoading && categories && categories.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <Utensils className="mr-3 h-6 w-6 text-primary" />
                <h2 className="text-2xl font-poppins font-bold text-gray-900">Категории меню</h2>
              </div>
              
              {categoriesLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                      <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4 mx-auto"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                  {categories?.map((category) => (
                    <Card 
                      key={category.id} 
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-white border-2 hover:border-primary/20"
                      onClick={() => handleCategorySelect(category.id)}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="text-4xl mb-3">{category.icon}</div>
                        <h3 className="font-poppins font-semibold text-gray-900 mb-1">{category.name}</h3>
                        <p className="text-sm text-gray-600">{category.description}</p>
                        <Badge variant="secondary" className="mt-2">
                          {category.products?.length || 0} блюд
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Show All Products Card */}
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-primary/5 to-primary/10 border-2 hover:border-primary/30"
                    onClick={() => handleCategorySelect(-1)}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl mb-3">🍽️</div>
                      <h3 className="font-poppins font-semibold text-gray-900 mb-1">Все блюда</h3>
                      <p className="text-sm text-gray-600">Полное меню</p>
                      <Badge variant="default" className="mt-2 bg-primary">
                        {allProducts?.length || 0} блюд
                      </Badge>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Popular Products Section */}
              <div className="mt-12">
                <div className="flex items-center mb-6">
                  <TrendingUp className="mr-3 h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-poppins font-bold text-gray-900">Популярные блюда</h2>
                </div>
                
                {allProductsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                        <div className="w-full h-48 bg-gray-200"></div>
                        <div className="p-4 space-y-3">
                          <div className="h-4 bg-gray-200 rounded"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {popularProducts.map((product) => (
                      <div key={product.id} className="relative">
                        <ProductCard product={product} />
                        <Badge className="absolute top-3 left-3 bg-primary text-white">
                          <Star className="w-3 h-3 mr-1" />
                          Популярное
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Products Grid - Show when category is selected or showing all */}
          {(selectedCategoryId !== null || searchQuery.length > 2) && (
            <div className="mb-8">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                      <div className="w-full h-48 bg-gray-200"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : displayProducts && displayProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {displayProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📦</div>
                  <h3 className="text-lg font-poppins font-semibold text-gray-900 mb-2">
                    Товары не найдены
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery.length > 2 
                      ? "Попробуйте изменить поисковый запрос"
                      : "В данной категории пока нет товаров"
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Store Information Section */}
          {storeSettings && selectedCategoryId === null && searchQuery.length <= 2 && (
            <div className="mb-12 space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-poppins font-bold text-gray-900 mb-2">О нашем магазине</h2>
                <p className="text-gray-600">Узнайте больше о {storeSettings.storeName}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Working Hours */}
                {storeSettings?.workingHours && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="h-5 w-5 text-primary" />
                        Часы работы
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(() => {
                        try {
                          const workingHours = storeSettings.workingHours;
                          if (!workingHours || typeof workingHours !== 'object') {
                            return <p className="text-gray-500 text-sm">Часы работы не указаны</p>;
                          }

                          const entries = Object.entries(workingHours);
                          const dayNames: Record<string, string> = {
                            monday: 'Понедельник',
                            tuesday: 'Вторник', 
                            wednesday: 'Среда',
                            thursday: 'Четверг',
                            friday: 'Пятница',
                            saturday: 'Суббота',
                            sunday: 'Воскресенье'
                          };

                          const validEntries = entries.filter(([day, hours]) => {
                            return hours && typeof hours === 'string' && hours.trim();
                          });

                          if (validEntries.length === 0) {
                            return <p className="text-gray-500 text-sm">Часы работы не указаны</p>;
                          }

                          return validEntries.map(([day, hours]) => (
                            <div key={day} className="flex justify-between text-sm">
                              <span className="font-medium">{dayNames[day] || day}</span>
                              <span className="text-gray-600">{String(hours)}</span>
                            </div>
                          ));
                        } catch (error) {
                          console.error('Error rendering working hours:', error);
                          return <p className="text-red-500 text-sm">Ошибка загрузки часов работы</p>;
                        }
                      })()}
                    </CardContent>
                  </Card>
                )}

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Phone className="h-5 w-5 text-primary" />
                      Контакты
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {storeSettings.contactPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <a href={`tel:${storeSettings.contactPhone}`} className="text-sm text-primary hover:underline">
                          {storeSettings.contactPhone}
                        </a>
                      </div>
                    )}
                    {storeSettings.contactEmail && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <a href={`mailto:${storeSettings.contactEmail}`} className="text-sm text-primary hover:underline">
                          {storeSettings.contactEmail}
                        </a>
                      </div>
                    )}
                    {storeSettings.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="text-sm text-gray-600">{storeSettings.address}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Delivery & Payment Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Truck className="h-5 w-5 text-primary" />
                      Доставка и оплата
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {storeSettings.deliveryFee && (
                      <div className="text-sm">
                        <span className="font-medium">Стоимость доставки:</span>
                        <span className="text-primary ml-1">₪{storeSettings.deliveryFee}</span>
                      </div>
                    )}
                    {storeSettings.minOrderAmount && (
                      <div className="text-sm">
                        <span className="font-medium">Минимальный заказ:</span>
                        <span className="text-primary ml-1">₪{storeSettings.minOrderAmount}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {storeSettings.deliveryInfo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Truck className="h-5 w-5 text-primary" />
                        Условия доставки
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {storeSettings.deliveryInfo}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {storeSettings.paymentInfo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Способы оплаты
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {storeSettings.paymentInfo}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* About Us Photos */}
              {storeSettings.aboutUsPhotos && storeSettings.aboutUsPhotos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Фотогалерея</CardTitle>
                    <CardDescription>Наши блюда и атмосфера</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {storeSettings.aboutUsPhotos.map((photo: string, index: number) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                          <img 
                            src={photo} 
                            alt={`Фото ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Category Navigation */}
      <CategoryNav 
        categories={categories || []}
        selectedCategoryId={selectedCategoryId}
        onCategorySelect={handleCategorySelect}
      />

      {/* Cart Overlay */}
      {isCartOpen && <CartOverlay />}

      {/* Admin Floating Actions */}
      {(user?.role === 'admin') && (
        <div className="fixed bottom-6 right-6 space-y-3">
          <Button 
            size="lg"
            className="bg-secondary hover:bg-secondary/90 text-white p-3 rounded-full shadow-lg"
            title="Управление заказами"
          >
            📋
          </Button>
          <Button 
            size="lg"
            className="bg-accent hover:bg-accent/90 text-white p-3 rounded-full shadow-lg"
            title="Настройки магазина"
          >
            ⚙️
          </Button>
          <Button 
            size="lg"
            className="bg-success hover:bg-success/90 text-white p-3 rounded-full shadow-lg"
            title="Статистика"
          >
            📊
          </Button>
        </div>
      )}
    </div>
  );
}
