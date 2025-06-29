import { Label } from "@/components/ui/label";
import { useTranslation } from 'react-i18next';

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
  const { t: adminT } = useTranslation('admin');
  
  return (
    <div id={id} className="space-y-4">
      <div className="p-4 bg-blue-50 rounded-lg border">
        <h4 className="text-sm font-medium mb-3">{adminT('themes.modernStyleInfoBlocks')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(num => (
            <div key={num} className="p-3 bg-white rounded border">
              <h5 className="text-xs font-medium mb-3">{adminT(`themes.block${num}`)}</h5>
              <div className="space-y-2">
                <select
                  name={`modernBlock${num}Icon`}
                  id={`modernBlock${num}Icon${id.includes('Create') ? 'Create' : 'Edit'}`}
                  defaultValue={defaultValues?.[`modernBlock${num}Icon` as keyof typeof defaultValues] || ""}
                  className="w-full px-2 py-1 border rounded text-xs bg-white"
                >
                  <option value="">{adminT('themes.selectIcon')}</option>
                  <option value="Clock">{adminT('themes.iconClock')}</option>
                  <option value="Phone">{adminT('themes.iconPhone')}</option>
                  <option value="CreditCard">{adminT('themes.iconPayment')}</option>
                  <option value="Truck">{adminT('themes.iconDelivery')}</option>
                  <option value="MapPin">{adminT('themes.iconLocation')}</option>
                  <option value="Shield">{adminT('themes.iconSecurity')}</option>
                  <option value="Star">{adminT('themes.iconQuality')}</option>
                  <option value="ChefHat">{adminT('themes.iconChef')}</option>
                  <option value="Heart">{adminT('themes.iconCare')}</option>
                  <option value="Award">{adminT('themes.iconAwards')}</option>
                  <option value="Users">{adminT('themes.iconTeam')}</option>
                  <option value="ThumbsUp">{adminT('themes.iconApproval')}</option>
                  <option value="CheckCircle">{adminT('themes.iconVerified')}</option>
                  <option value="Gift">{adminT('themes.iconGifts')}</option>
                  <option value="Smile">{adminT('themes.iconPleasure')}</option>
                </select>
                <input
                  type="text"
                  name={`modernBlock${num}Text`}
                  id={`modernBlock${num}Text${id.includes('Create') ? 'Create' : 'Edit'}`}
                  defaultValue={defaultValues?.[`modernBlock${num}Text` as keyof typeof defaultValues] || ""}
                  placeholder={adminT('themes.advantageDescription')}
                  className="w-full px-2 py-1 border rounded text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}