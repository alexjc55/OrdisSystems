import fs from 'fs';

// Читаем файл
let content = fs.readFileSync('server/storage.ts', 'utf8');

// Список методов, которые нужно исправить (найденные по ошибкам)
const methodsToFix = [
  'getUser',
  'getUserByUsername', 
  'getUserByEmail',
  'upsertUser',
  'updateUserProfile',
  'getUserAddresses',
  'createUserAddress',
  'updateUserAddress',
  'deleteUserAddress',
  'setDefaultAddress',
  'getCategoryById',
  'createCategory',
  'updateCategory',
  'deleteCategory',
  'updateCategoryOrders',
  'getProducts',
  'getProductsPaginated',
  'getProductById',
  'createProduct',
  'updateProduct',
  'updateProductAvailability',
  'deleteProduct',
  'searchProducts',
  'getOrders',
  'getOrdersPaginated',
  'getOrderById',
  'createOrder',
  'updateOrder',
  'updateOrderStatus',
  'updateOrderItems',
  'updateStoreSettings',
  'getUsersPaginated',
  'createUser',
  'updateUser',
  'deleteUser',
  'updateUserRole',
  'updatePassword',
  'createPasswordResetToken',
  'validatePasswordResetToken',
  'clearPasswordResetToken',
  'getThemes',
  'getActiveTheme',
  'getThemeById',
  'createTheme',
  'updateTheme',
  'deleteTheme',
  'activateTheme'
];

// Для каждого метода добавляем getDB() в начало
methodsToFix.forEach(method => {
  // Ищем начало метода и добавляем getDB() если его еще нет
  const methodRegex = new RegExp(`(async ${method}\\([^{]*\\{)\\s*(?!const db = await getDB\\(\\);)`, 'g');
  content = content.replace(methodRegex, '$1\n    const db = await getDB();');
});

// Записываем обратно в файл
fs.writeFileSync('server/storage.ts', content);

console.log('Все методы исправлены с getDB() вызовами');