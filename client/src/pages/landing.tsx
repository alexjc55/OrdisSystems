import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Utensils, Clock, Star } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-poppins font-bold text-primary">
                <Utensils className="inline-block mr-2" />
                Ресторан Меню
              </h1>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary hover:bg-primary/90"
            >
              Войти
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-poppins font-bold text-gray-900 mb-6">
            Магазин Готовой Еды
            <br />
            <span className="text-primary">На Развес</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Свежие продукты высшего качества с точным взвешиванием и прозрачным ценообразованием в шекелях
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Начать Покупки
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-primary text-primary hover:bg-primary hover:text-white px-8 py-3"
            >
              Узнать Больше
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-poppins font-bold text-gray-900 mb-4">
              Почему Выбирают Нас
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Современная система управления для магазина готовой еды с удобным интерфейсом и точными расчетами
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Utensils className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="font-poppins">Свежие Продукты</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Ежедневные поставки свежих продуктов высшего качества от проверенных поставщиков
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="font-poppins">Быстрое Обслуживание</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Эффективная система заказов и быстрая обработка с точным взвешиванием продуктов
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-success" />
                </div>
                <CardTitle className="font-poppins">Высокое Качество</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Строгий контроль качества и свежести всех продуктов с гарантией удовлетворения
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Categories Preview */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-poppins font-bold text-gray-900 mb-4">
              Наши Категории
            </h2>
            <p className="text-gray-600">
              Широкий ассортимент свежих продуктов на любой вкус
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "Рыба", icon: "🐟", count: "12+" },
              { name: "Мясо", icon: "🥩", count: "8+" },
              { name: "Овощи", icon: "🥕", count: "15+" },
              { name: "Фрукты", icon: "🍎", count: "10+" },
            ].map((category, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">{category.icon}</div>
                  <h3 className="font-poppins font-semibold text-lg mb-2">{category.name}</h3>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {category.count} товаров
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-poppins font-bold text-white mb-4">
            Готовы Начать Покупки?
          </h2>
          <p className="text-primary-foreground/90 text-lg mb-8">
            Войдите в систему и получите доступ к полному каталогу свежих продуктов
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => window.location.href = '/api/login'}
            className="bg-white text-primary hover:bg-gray-100 px-8 py-3"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Войти в Систему
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Utensils className="h-8 w-8 text-primary" />
              <span className="text-xl font-poppins font-bold">Ресторан Меню</span>
            </div>
            <p className="text-gray-400 mb-4">
              Современная система управления магазином готовой еды
            </p>
            <p className="text-sm text-gray-500">
              © 2024 Ресторан Меню. Все права защищены.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
