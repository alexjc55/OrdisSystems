import { useState } from "react";
import { CustomSelect, CustomSelectItem } from "@/components/ui/custom-select";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DemoSelects() {
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("available");
  const [nativeValue, setNativeValue] = useState("");

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center">Демо выпадающих списков</h1>
      
      {/* CustomSelect Demo */}
      <Card>
        <CardHeader>
          <CardTitle>CustomSelect с оранжевым hover эффектом</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Выбор категории:</label>
            <CustomSelect 
              value={category} 
              onValueChange={setCategory}
              placeholder="Выберите категорию"
              className="w-64"
            >
              <CustomSelectItem value="all">Все категории</CustomSelectItem>
              <CustomSelectItem value="salads">Салаты</CustomSelectItem>
              <CustomSelectItem value="hot">Горячие блюда</CustomSelectItem>
              <CustomSelectItem value="drinks">Напитки</CustomSelectItem>
              <CustomSelectItem value="desserts">Десерты</CustomSelectItem>
            </CustomSelect>
            <p className="text-sm text-gray-600 mt-2">Выбрано: {category}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Статус товара:</label>
            <CustomSelect 
              value={status} 
              onValueChange={setStatus}
              placeholder="Выберите статус"
              className="w-64"
            >
              <CustomSelectItem value="available">Доступно</CustomSelectItem>
              <CustomSelectItem value="out_of_stock">Нет в наличии</CustomSelectItem>
              <CustomSelectItem value="low_stock">Мало на складе</CustomSelectItem>
              <CustomSelectItem value="discontinued">Снято с производства</CustomSelectItem>
            </CustomSelect>
            <p className="text-sm text-gray-600 mt-2">Выбрано: {status}</p>
          </div>
        </CardContent>
      </Card>

      {/* NativeSelect Demo */}
      <Card>
        <CardHeader>
          <CardTitle>NativeSelect (упрощенная версия)</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-sm font-medium mb-2">Выбор языка:</label>
            <NativeSelect
              value={nativeValue}
              onChange={(e) => setNativeValue(e.target.value)}
              className="w-64"
            >
              <NativeSelectOption value="">Выберите язык</NativeSelectOption>
              <NativeSelectOption value="ru">Русский</NativeSelectOption>
              <NativeSelectOption value="en">English</NativeSelectOption>
              <NativeSelectOption value="he">עברית</NativeSelectOption>
            </NativeSelect>
            <p className="text-sm text-gray-600 mt-2">Выбрано: {nativeValue || "Не выбрано"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Icons Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Тест иконок Lucide React</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Иконка с stroke-width 1.5</span>
            </div>
            
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Оранжевая иконка плюс</span>
            </div>
            
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Иконка поиска</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-medium text-green-800 mb-2">Ключевые улучшения:</h3>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• CustomSelect заменяет проблемные Radix UI компоненты</li>
          <li>• Оранжевый hover эффект работает корректно</li>
          <li>• Иконки теперь outline стиля, не залитые</li>
          <li>• Stroke-width установлен в 1.5 для лучшей читаемости</li>
          <li>• Полная совместимость с существующим кодом</li>
        </ul>
      </div>
    </div>
  );
}