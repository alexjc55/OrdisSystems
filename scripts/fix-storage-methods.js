import fs from 'fs';

// Read the storage file
let content = fs.readFileSync('server/storage.ts', 'utf8');

// List of all methods that need getDB() call
const methods = [
  'getUser', 'getUserByUsername', 'getUserByEmail', 'upsertUser', 'updateUserProfile',
  'updatePassword', 'createPasswordResetToken', 'validatePasswordResetToken', 'clearPasswordResetToken',
  'createUser', 'updateUser', 'deleteUser', 'updateUserRole',
  'getUserAddresses', 'createUserAddress', 'updateUserAddress', 'deleteUserAddress', 'setDefaultAddress',
  'getCategories', 'getCategoryById', 'createCategory', 'updateCategory', 'deleteCategory', 'updateCategoryOrders',
  'getProducts', 'getProductsPaginated', 'getProductById', 'createProduct', 'updateProduct', 'updateProductAvailability', 'deleteProduct',
  'getOrdersPaginated', 'createOrder', 'updateOrder', 'updateOrderStatus', 'updateOrderItems', 'cancelOrder',
  'getUsersPaginated', 'getStoreSettings', 'updateStoreSettings',
  'getThemes', 'createTheme', 'updateTheme', 'deleteTheme', 'activateTheme'
];

// Fix each method
methods.forEach(methodName => {
  // Find the method definition and add getDB() call
  const methodPattern = new RegExp(`(async ${methodName}\\([^)]*\\):[^{]*{)`, 'g');
  
  content = content.replace(methodPattern, (match) => {
    // Check if getDB() is already present
    const nextLines = content.substring(content.indexOf(match) + match.length, content.indexOf(match) + match.length + 200);
    if (nextLines.includes('const db = await getDB()')) {
      return match;
    }
    return match + '\n    const db = await getDB();';
  });
});

// Write the fixed content
fs.writeFileSync('server/storage.ts', content);
console.log('Fixed all methods in storage.ts');