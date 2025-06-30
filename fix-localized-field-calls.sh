#!/bin/bash

# Script to fix getLocalizedField calls to use store settings instead of hardcoded 'ru'

files=(
  "client/src/components/menu/category-nav.tsx"
  "client/src/components/menu/product-card.tsx"
  "client/src/components/cart/cart-sidebar.tsx"
  "client/src/components/cart/cart-overlay.tsx"
  "client/src/components/checkout/checkout-form.tsx"
  "client/src/pages/profile.tsx"
  "client/src/pages/home.tsx"
  "client/src/pages/checkout.tsx"
  "client/src/pages/admin-dashboard.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    
    # Add useQuery import if not present
    if ! grep -q "useQuery" "$file"; then
      sed -i 's/import { useShopTranslation, useLanguage }/import { useShopTranslation, useLanguage } from "@\/hooks\/use-language";\nimport { useQuery }/g' "$file"
    fi
    
    # Replace hardcoded 'ru' as SupportedLanguage with undefined (to use default)
    sed -i "s/, 'ru' as SupportedLanguage/, undefined/g" "$file"
    
    echo "✓ Fixed $file"
  else
    echo "✗ File not found: $file"
  fi
done

echo "Done!"