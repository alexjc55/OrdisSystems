import { Label } from "@/components/ui/label";

interface ModernStyleSettingsProps {
  id: string;
  defaultValues?: {
    modernBlock1Icon?: string;
    modernBlock1Text?: string;
    modernBlock2Icon?: string;
    modernBlock2Text?: string;
    modernBlock3Icon?: string;
    modernBlock3Text?: string;
  };
}

export function ModernStyleSettings({ id, defaultValues }: ModernStyleSettingsProps) {
  return (
    <div id={id} className="space-y-4" style={{ display: 'none' }}>
      <div className="p-4 bg-blue-50 rounded-lg border">
        <h4 className="text-sm font-medium mb-3">Информационные блоки (Современный стиль)</h4>
        <div className="space-y-4">
          {[1, 2, 3].map(num => (
            <div key={num} className="p-3 bg-white rounded border">
              <h5 className="text-xs font-medium mb-2">Блок {num}</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`modernBlock${num}Icon${id.includes('Create') ? 'Create' : 'Edit'}`} className="text-xs">Иконка</Label>
                  <select
                    name={`modernBlock${num}Icon`}
                    id={`modernBlock${num}Icon${id.includes('Create') ? 'Create' : 'Edit'}`}
                    defaultValue={defaultValues?.[`modernBlock${num}Icon` as keyof typeof defaultValues] || ""}
                    className="w-full px-2 py-1 border rounded text-xs bg-white"
                  >
                    <option value="">Выберите иконку</option>
                    <option value="Clock">Часы</option>
                    <option value="Phone">Телефон</option>
                    <option value="CreditCard">Оплата</option>
                    <option value="Truck">Доставка</option>
                    <option value="MapPin">Местоположение</option>
                    <option value="Shield">Безопасность</option>
                    <option value="Star">Качество</option>
                    <option value="Zap">Скорость</option>
                    <option value="Heart">Забота</option>
                    <option value="Award">Награды</option>
                    <option value="Users">Команда</option>
                    <option value="ThumbsUp">Одобрение</option>
                    <option value="CheckCircle">Проверено</option>
                    <option value="Gift">Подарки</option>
                    <option value="Smile">Удовольствие</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`modernBlock${num}Text${id.includes('Create') ? 'Create' : 'Edit'}`} className="text-xs">Текст</Label>
                  <input
                    type="text"
                    name={`modernBlock${num}Text`}
                    id={`modernBlock${num}Text${id.includes('Create') ? 'Create' : 'Edit'}`}
                    defaultValue={defaultValues?.[`modernBlock${num}Text` as keyof typeof defaultValues] || ""}
                    placeholder="Описание преимущества"
                    className="w-full px-2 py-1 border rounded text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}