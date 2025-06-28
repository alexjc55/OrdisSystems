import fs from 'fs';
import path from 'path';

// Функция для чтения JSON файла
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Ошибка чтения файла ${filePath}:`, error.message);
    return null;
  }
}

// Функция для получения значения по вложенному ключу
function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce((current, key) => current && current[key], obj);
}

// Список всех ключей уведомлений из кода
const notificationKeys = [
  'categories.notifications.categoryCreated',
  'categories.notifications.categoryCreatedDesc',
  'categories.notifications.categoryDeleted',
  'categories.notifications.categoryDeletedDesc',
  'categories.notifications.categoryUpdated',
  'categories.notifications.categoryUpdatedDesc',
  'categories.notifications.createError',
  'categories.notifications.deleteError',
  'categories.notifications.deleteErrorWithProducts',
  'categories.notifications.deleteErrorWithProductsDesc',
  'categories.notifications.updateError',
  'common.error',
  'orders.notifications.statusUpdated',
  'orders.notifications.statusUpdatedDesc',
  'products.notifications.availabilityError',
  'products.notifications.createError',
  'products.notifications.deleteError',
  'products.notifications.productCreated',
  'products.notifications.productCreatedDesc',
  'products.notifications.productDeleted',
  'products.notifications.productDeletedDesc',
  'products.notifications.productUpdated',
  'products.notifications.productUpdatedDesc',
  'products.notifications.statusError',
  'products.notifications.statusUpdated',
  'products.notifications.statusUpdatedDesc',
  'products.notifications.updateError',
  'settings.saved',
  'settings.saveSuccess',
  'settings.saveError',
  'users.created',
  'users.createSuccess',
  'users.createError',
  'users.updated',
  'users.updateSuccess',
  'users.updateError',
  'users.deleted',
  'users.deleteSuccess',
  'users.deleteError',
  'users.notifications.deleteError',
  'users.notifications.passwordSet',
  'users.notifications.passwordSetDesc',
  'users.notifications.passwordSetError',
  'users.notifications.roleUpdated',
  'users.notifications.roleUpdatedDesc',
  'users.notifications.roleUpdateError',
  'users.notifications.userDeleted',
  'users.notifications.userDeletedDesc'
];

function checkNotificationKeys() {
  const languages = ['ru', 'en', 'he'];
  const basePath = 'client/src/locales';

  console.log('=== ПРОВЕРКА КЛЮЧЕЙ УВЕДОМЛЕНИЙ ===\n');

  let totalMissing = 0;
  const missingByLang = {};

  for (const lang of languages) {
    console.log(`\n🔍 Проверка языка: ${lang.toUpperCase()}`);
    console.log('='.repeat(40));

    const adminPath = path.join(basePath, lang, 'admin.json');
    const commonPath = path.join(basePath, lang, 'common.json');
    
    const adminData = readJsonFile(adminPath);
    const commonData = readJsonFile(commonPath);
    
    if (!adminData || !commonData) {
      console.log(`❌ Не удалось загрузить файлы для языка ${lang}`);
      continue;
    }

    const missing = [];

    for (const key of notificationKeys) {
      let found = false;
      
      if (key.startsWith('common.')) {
        const commonKey = key.replace('common.', '');
        if (getNestedValue(commonData, commonKey)) {
          found = true;
        }
      } else {
        if (getNestedValue(adminData, key)) {
          found = true;
        }
      }

      if (!found) {
        missing.push(key);
      }
    }

    if (missing.length === 0) {
      console.log('✅ Все ключи уведомлений присутствуют');
    } else {
      console.log(`❌ Отсутствует ${missing.length} ключей:`);
      missing.forEach(key => console.log(`   - ${key}`));
      totalMissing += missing.length;
      missingByLang[lang] = missing;
    }
  }

  console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА');
  console.log('='.repeat(40));
  console.log(`Всего проверенных ключей: ${notificationKeys.length}`);
  console.log(`Общее количество отсутствующих ключей: ${totalMissing}`);

  if (totalMissing === 0) {
    console.log('\n🎉 ВСЕ КЛЮЧИ УВЕДОМЛЕНИЙ ПРИСУТСТВУЮТ!');
  } else {
    console.log('\n⚠️  ТРЕБУЕТСЯ ДОБАВЛЕНИЕ КЛЮЧЕЙ УВЕДОМЛЕНИЙ');
    console.log('\nОтсутствующие ключи по языкам:');
    for (const [lang, keys] of Object.entries(missingByLang)) {
      if (keys.length > 0) {
        console.log(`\n${lang.toUpperCase()}:`);
        keys.forEach(key => console.log(`  - ${key}`));
      }
    }
  }
}

// Запускаем проверку
checkNotificationKeys();