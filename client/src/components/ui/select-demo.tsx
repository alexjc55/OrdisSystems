import { CustomSelect, CustomSelectItem } from "./custom-select"
import { NativeSelect, NativeSelectOption } from "./native-select"

// Пример использования кастомного select (полная замена Radix UI)
export function CustomSelectDemo() {
  return (
    <CustomSelect placeholder="Выберите категорию">
      <CustomSelectItem value="all">Все категории</CustomSelectItem>
      <CustomSelectItem value="salads">Салаты</CustomSelectItem>
      <CustomSelectItem value="hot">Горячие блюда</CustomSelectItem>
      <CustomSelectItem value="drinks">Напитки</CustomSelectItem>
    </CustomSelect>
  )
}

// Пример использования нативного select (упрощенная версия)
export function NativeSelectDemo() {
  return (
    <NativeSelect>
      <NativeSelectOption value="">Выберите категорию</NativeSelectOption>
      <NativeSelectOption value="all">Все категории</NativeSelectOption>
      <NativeSelectOption value="salads">Салаты</NativeSelectOption>
      <NativeSelectOption value="hot">Горячие блюда</NativeSelectOption>
      <NativeSelectOption value="drinks">Напитки</NativeSelectOption>
    </NativeSelect>
  )
}