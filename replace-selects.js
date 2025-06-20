// Temporary script to replace all Select components with CustomSelect
const fs = require('fs');

const files = [
  'client/src/pages/admin-dashboard.tsx',
  'client/src/components/checkout/checkout-form.tsx', 
  'client/src/pages/checkout.tsx',
  'client/src/components/cart/cart-overlay.tsx',
  'client/src/components/ui/language-switcher.tsx',
  'client/src/pages/home.tsx'
];

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace all Select related components
    content = content.replace(/Select([^a-zA-Z])/g, 'CustomSelect$1');
    content = content.replace(/SelectTrigger/g, 'div'); // Remove SelectTrigger
    content = content.replace(/SelectValue/g, 'span'); // Remove SelectValue  
    content = content.replace(/SelectContent/g, 'div'); // Remove SelectContent
    content = content.replace(/SelectItem/g, 'CustomSelectItem');
    
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
});