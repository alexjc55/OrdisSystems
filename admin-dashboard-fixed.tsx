// This is a backup of the working collapsible sections structure
// I'll use this as reference to fix the main file

// Working structure for collapsible sections:

{/* Основная информация */}
<Collapsible open={isBasicInfoOpen} onOpenChange={setIsBasicInfoOpen} className="space-y-6">
  <CollapsibleTrigger asChild>
    <Button variant="ghost" className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 w-full">
        <Store className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-semibold">Основная информация</h3>
        {isBasicInfoOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-500 ml-auto" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500 ml-auto" />
        )}
      </div>
    </Button>
  </CollapsibleTrigger>
  
  <CollapsibleContent className="space-y-6">
    {/* Content for basic info section */}
  </CollapsibleContent>
</Collapsible>

{/* Описание и контакты */}
<Collapsible open={isContactsOpen} onOpenChange={setIsContactsOpen} className="space-y-6">
  <CollapsibleTrigger asChild>
    <Button variant="ghost" className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 w-full">
        <MapPin className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-semibold">Описание и контакты</h3>
        {isContactsOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-500 ml-auto" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500 ml-auto" />
        )}
      </div>
    </Button>
  </CollapsibleTrigger>
  
  <CollapsibleContent className="space-y-6">
    {/* Content for contacts section */}
  </CollapsibleContent>
</Collapsible>

// Similar structure for:
// - Визуальное оформление (isVisualsOpen)
// - Часы работы (isWorkingHoursOpen) 
// - Доставка и оплата (isDeliveryPaymentOpen)
// - Настройки отображения (isDisplaySettingsOpen)
// - Код отслеживания (isTrackingCodeOpen)