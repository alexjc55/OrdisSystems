const fs = require('fs');

// Read the admin dashboard file
let content = fs.readFileSync('client/src/pages/admin-dashboard.tsx', 'utf8');

// Replace all Select patterns with CustomSelect
content = content.replace(
  /<Select\s+([\s\S]*?)>([\s\S]*?)<\/Select>/g,
  (match, props, children) => {
    // Extract value and onValueChange from props
    const valueMatch = props.match(/value=\{([^}]+)\}/);
    const onValueChangeMatch = props.match(/onValueChange=\{([^}]+)\}/);
    
    let customProps = '';
    if (valueMatch) customProps += `value={${valueMatch[1]}} `;
    if (onValueChangeMatch) customProps += `onValueChange={${onValueChangeMatch[1]}} `;
    
    // Convert children - replace SelectTrigger/SelectValue/SelectContent/SelectItem
    let customChildren = children
      .replace(/<SelectTrigger[^>]*>[\s\S]*?<\/SelectTrigger>/g, '')
      .replace(/<SelectContent[^>]*>/g, '')
      .replace(/<\/SelectContent>/g, '')
      .replace(/<SelectItem\s+value="([^"]+)"[^>]*>([^<]+)<\/SelectItem>/g, 
        '<CustomSelectItem value="$1">$2</CustomSelectItem>');
    
    return `<CustomSelect ${customProps.trim()}>${customChildren}</CustomSelect>`;
  }
);

// Write the fixed content back
fs.writeFileSync('client/src/pages/admin-dashboard.tsx', content);
console.log('Fixed all Select components in admin-dashboard.tsx');