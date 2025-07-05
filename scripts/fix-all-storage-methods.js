import fs from 'fs';

// Read the storage file
let content = fs.readFileSync('server/storage.ts', 'utf8');

// List of methods that need getDB() calls based on the grep results
const methodsToFix = [
  { line: 141, name: 'getUser' },
  { line: 146, name: 'getUserByUsername' },
  { line: 151, name: 'upsertUser' },
  { line: 166, name: 'updateUserProfile' },
  { line: 176, name: 'getUserAddresses' },
  { line: 180, name: 'createUserAddress' },
  { line: 196, name: 'updateUserAddress' },
  { line: 216, name: 'deleteUserAddress' },
  { line: 220, name: 'setDefaultAddress' },
  { line: 235, name: 'getCategories' },
  { line: 264, name: 'getCategoryById' },
  { line: 269, name: 'createCategory' },
  { line: 277, name: 'updateCategory' },
  { line: 286, name: 'deleteCategory' },
  { line: 290, name: 'updateCategoryOrders' },
  { line: 658, name: 'getProductById' },
  { line: 679, name: 'createProduct' },
  { line: 701, name: 'updateProduct' },
  { line: 730, name: 'updateProductAvailability' },
  { line: 743, name: 'deleteProduct' },
  { line: 750, name: 'searchProducts' },
  { line: 789, name: 'getOrders' },
  { line: 892, name: 'getProductsPaginated' },
  { line: 1066, name: 'getOrderById' },
  { line: 1163, name: 'createOrder' },
  { line: 1181, name: 'updateOrder' },
  { line: 1190, name: 'updateOrderStatus' },
  { line: 1199, name: 'updateOrderItems' },
  { line: 1220, name: 'getStoreSettings' },
  { line: 1225, name: 'updateStoreSettings' },
  { line: 1249, name: 'getUsersPaginated' },
  { line: 1331, name: 'createUser' },
  { line: 1347, name: 'updateUser' },
  { line: 1363, name: 'deleteUser' },
  { line: 1367, name: 'updateUserRole' },
  { line: 1384, name: 'getUserByEmail' },
  { line: 1389, name: 'updatePassword' },
  { line: 1407, name: 'createPasswordResetToken' },
  { line: 1428, name: 'validatePasswordResetToken' },
  { line: 1447, name: 'clearPasswordResetToken' },
  { line: 1459, name: 'getThemes' },
  { line: 1463, name: 'getActiveTheme' },
  { line: 1472, name: 'getThemeById' },
  { line: 1481, name: 'createTheme' },
  { line: 1494, name: 'updateTheme' },
  { line: 1506, name: 'deleteTheme' },
  { line: 1511, name: 'activateTheme' }
];

const lines = content.split('\n');

// Add getDB() call after each method signature
methodsToFix.forEach(method => {
  const lineIndex = method.line - 1; // Convert to 0-based index
  if (lineIndex < lines.length && lines[lineIndex].includes(`async ${method.name}`)) {
    // Find the opening brace line
    let braceLineIndex = lineIndex;
    while (braceLineIndex < lines.length && !lines[braceLineIndex].includes('{')) {
      braceLineIndex++;
    }
    
    // Check if next line already has getDB()
    if (braceLineIndex + 1 < lines.length && !lines[braceLineIndex + 1].includes('const db = await getDB()')) {
      // Insert getDB() call after the opening brace
      lines.splice(braceLineIndex + 1, 0, '    const db = await getDB();');
    }
  }
});

// Write the fixed content
fs.writeFileSync('server/storage.ts', lines.join('\n'));
console.log('Fixed all methods with getDB() calls');