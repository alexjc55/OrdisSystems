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

// Функция для получения всех ключей из объекта (включая вложенные)
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

// Функция для анализа файлов переводов
function analyzeTranslations() {
  const languages = ['ru', 'en', 'he'];
  const files = ['common.json', 'shop.json', 'admin.json'];
  const basePath = 'client/src/locales';

  console.log('=== АНАЛИЗ ФАЙЛОВ ПЕРЕВОДОВ ===\n');

  for (const file of files) {
    console.log(`\n📁 Анализ файла: ${file}`);
    console.log('='.repeat(50));

    const languageData = {};
    const allKeys = new Set();

    // Загружаем данные для всех языков
    for (const lang of languages) {
      const filePath = path.join(basePath, lang, file);
      const data = readJsonFile(filePath);
      if (data) {
        languageData[lang] = data;
        const keys = getAllKeys(data);
        keys.forEach(key => allKeys.add(key));
        console.log(`${lang.toUpperCase()}: ${keys.length} ключей`);
      }
    }

    const totalKeys = allKeys.size;
    console.log(`\nВСЕГО УНИКАЛЬНЫХ КЛЮЧЕЙ: ${totalKeys}`);

    // Проверяем отсутствующие ключи для каждого языка
    const missingKeys = {};
    for (const lang of languages) {
      if (languageData[lang]) {
        const langKeys = new Set(getAllKeys(languageData[lang]));
        const missing = [...allKeys].filter(key => !langKeys.has(key));
        missingKeys[lang] = missing;
        
        if (missing.length > 0) {
          console.log(`\n❌ ${lang.toUpperCase()} - отсутствует ${missing.length} ключей:`);
          missing.forEach(key => console.log(`   - ${key}`));
        } else {
          console.log(`\n✅ ${lang.toUpperCase()} - все ключи присутствуют`);
        }
      }
    }

    // Проверяем избыточные ключи
    console.log('\n🔍 Проверка избыточных ключей:');
    for (const lang of languages) {
      if (languageData[lang]) {
        const langKeys = getAllKeys(languageData[lang]);
        const extras = langKeys.filter(key => {
          return !languages.some(otherLang => {
            if (otherLang === lang || !languageData[otherLang]) return false;
            const otherKeys = new Set(getAllKeys(languageData[otherLang]));
            return otherKeys.has(key);
          });
        });
        
        if (extras.length > 0) {
          console.log(`⚠️  ${lang.toUpperCase()} - избыточные ключи (${extras.length}):`);
          extras.forEach(key => console.log(`   + ${key}`));
        }
      }
    }
  }

  // Общая статистика
  console.log('\n\n📊 ОБЩАЯ СТАТИСТИКА');
  console.log('='.repeat(50));
  
  let totalAllKeys = 0;
  let totalMissingKeys = 0;
  
  for (const file of files) {
    const languageData = {};
    const allKeys = new Set();

    for (const lang of languages) {
      const filePath = path.join(basePath, lang, file);
      const data = readJsonFile(filePath);
      if (data) {
        languageData[lang] = data;
        const keys = getAllKeys(data);
        keys.forEach(key => allKeys.add(key));
      }
    }

    totalAllKeys += allKeys.size;

    for (const lang of languages) {
      if (languageData[lang]) {
        const langKeys = new Set(getAllKeys(languageData[lang]));
        const missing = [...allKeys].filter(key => !langKeys.has(key));
        totalMissingKeys += missing.length;
      }
    }
  }

  console.log(`Всего ключей во всех файлах: ${totalAllKeys}`);
  console.log(`Общее количество отсутствующих ключей: ${totalMissingKeys}`);
  console.log(`Процент синхронизации: ${((totalAllKeys * 3 - totalMissingKeys) / (totalAllKeys * 3) * 100).toFixed(1)}%`);

  if (totalMissingKeys === 0) {
    console.log('\n🎉 ВСЕ ФАЙЛЫ ПЕРЕВОДОВ ПОЛНОСТЬЮ СИНХРОНИЗИРОВАНЫ!');
  } else {
    console.log('\n⚠️  ТРЕБУЕТСЯ СИНХРОНИЗАЦИЯ ФАЙЛОВ ПЕРЕВОДОВ');
  }
}

// Запускаем анализ
analyzeTranslations();