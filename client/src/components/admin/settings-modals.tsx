import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ImageUpload } from "@/components/ui/image-upload";
import { Store, Clock, CreditCard, Settings, Users } from "lucide-react";
import { useAdminTranslation, useCommonTranslation } from "@/hooks/use-language";

interface SettingsModalsProps {
  basicInfoOpen: boolean;
  setBasicInfoOpen: (open: boolean) => void;
  workingHoursOpen: boolean;
  setWorkingHoursOpen: (open: boolean) => void;
  deliveryPaymentOpen: boolean;
  setDeliveryPaymentOpen: (open: boolean) => void;
  languageOpen: boolean;
  setLanguageOpen: (open: boolean) => void;
  trackingOpen: boolean;
  setTrackingOpen: (open: boolean) => void;
  authPageOpen: boolean;
  setAuthPageOpen: (open: boolean) => void;
  form: any;
}

export function SettingsModals({ 
  basicInfoOpen, setBasicInfoOpen,
  workingHoursOpen, setWorkingHoursOpen,
  deliveryPaymentOpen, setDeliveryPaymentOpen,
  languageOpen, setLanguageOpen,
  trackingOpen, setTrackingOpen,
  authPageOpen, setAuthPageOpen,
  form
}: SettingsModalsProps) {
  const { t: adminT } = useAdminTranslation();
  const { i18n } = useCommonTranslation();
  const isRTL = i18n.language === 'he';

  return (
    <>
      {/* Basic Info Modal */}
      <Dialog open={basicInfoOpen} onOpenChange={setBasicInfoOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              {adminT('storeSettings.basicInfo')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="storeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{adminT('storeSettings.storeName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={adminT('storeSettings.storeNamePlaceholder')} {...field} className="text-sm" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="welcomeTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{adminT('storeSettings.welcomeTitle')}</FormLabel>
                    <FormControl>
                      <Input placeholder={adminT('storeSettings.welcomeTitlePlaceholder')} {...field} className="text-sm" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{adminT('storeSettings.contactPhone')}</FormLabel>
                    <FormControl>
                      <Input placeholder={adminT('storeSettings.contactPhonePlaceholder')} {...field} className="text-sm" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{adminT('storeSettings.contactEmail')}</FormLabel>
                    <FormControl>
                      <Input placeholder={adminT('storeSettings.contactEmailPlaceholder')} {...field} className="text-sm" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-sm">{adminT('storeSettings.logoUrl')}</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="storeDescription"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-sm">{adminT('storeSettings.storeDescription')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={adminT('storeSettings.storeDescriptionPlaceholder')} 
                        {...field} 
                        className="text-sm min-h-[100px]" 
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-sm">{adminT('storeSettings.address')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={adminT('storeSettings.addressPlaceholder')} 
                        {...field} 
                        className="text-sm min-h-[80px]" 
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Working Hours Modal */}
      <Dialog open={workingHoursOpen} onOpenChange={setWorkingHoursOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {adminT('storeSettings.workingHours')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                <FormField
                  key={day}
                  control={form.control}
                  name={`workingHours.${day}` as any}
                  render={({ field }) => (
                    <FormItem className={`p-3 rounded-lg border ${field.value ? 'bg-green-50 border-green-200' : 'bg-gray-100 border-gray-200'}`}>
                      <FormLabel className="text-sm font-medium">
                        {adminT(`days.${day}`)}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={adminT('storeSettings.workingHoursPlaceholder')}
                          {...field}
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Other modals can be added here for delivery/payment, language, tracking, auth */}
    </>
  );
}