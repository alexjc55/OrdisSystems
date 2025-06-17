import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import ProductCard from "@/components/menu/product-card";
import CategoryNav from "@/components/menu/category-nav";
import CartOverlay from "@/components/cart/cart-overlay";
import { useCartStore } from "@/lib/cart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { CategoryWithProducts, ProductWithCategory } from "@shared/schema";

export default function Home() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const { isOpen: isCartOpen } = useCartStore();

  const { data: categories, isLoading: categoriesLoading } = useQuery<CategoryWithProducts[]>({
    queryKey: ["/api/categories"],
  });

  const { data: products, isLoading: productsLoading } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products", selectedCategoryId],
    enabled: selectedCategoryId !== null,
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products/search", searchQuery],
    enabled: searchQuery.length > 2,
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
  const displayProducts = searchQuery.length > 2 ? searchResults : products;
  const isLoading = searchQuery.length > 2 ? searchLoading : productsLoading;

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
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-poppins font-bold text-gray-900">
                  {searchQuery.length > 2 
                    ? `Результаты поиска: "${searchQuery}"`
                    : selectedCategory?.name || "Все продукты"
                  }
                </h1>
                <p className="text-gray-600 mt-1">
                  {searchQuery.length > 2 
                    ? `Найдено товаров: ${searchResults?.length || 0}`
                    : selectedCategory?.description || "Выберите категорию для просмотра товаров"
                  }
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
            ) : selectedCategoryId === null && searchQuery.length <= 2 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🛍️</div>
                <h3 className="text-lg font-poppins font-semibold text-gray-900 mb-2">
                  Выберите категорию
                </h3>
                <p className="text-gray-600">
                  Выберите категорию из левого меню для просмотра товаров
                </p>
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
