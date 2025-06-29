const fs = require('fs');

function flattenObject(obj, prefix = '') {
  const flattened = {};
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(flattened, flattenObject(obj[key], prefix ? `${prefix}.${key}` : key));
    } else {
      flattened[prefix ? `${prefix}.${key}` : key] = obj[key];
    }
  }
  return flattened;
}

// Анализ всех языков для admin.json
const languages = ['ru', 'en', 'he', 'ar'];
const files = ['admin', 'common', 'shop'];

files.forEach(file => {
  console.log(`\n=== Анализ ${file}.json ===`);
  const allKeys = new Set();
  const langData = {};
  
  languages.forEach(lang => {
    try {
      const data = JSON.parse(fs.readFileSync(`client/src/locales/${lang}/${file}.json`, 'utf8'));
      const flattened = flattenObject(data);
      langData[lang] = flattened;
      Object.keys(flattened).forEach(key => allKeys.add(key));
    } catch (e) {
      console.log(`Ошибка чтения ${lang}/${file}.json:`, e.message);
      langData[lang] = {};
    }
  });
  
  console.log(`Общее количество уникальных плоских ключей: ${allKeys.size}`);
  
  languages.forEach(lang => {
    const missing = Array.from(allKeys).filter(key => !(key in langData[lang]));
    console.log(`${lang}: ${Object.keys(langData[lang]).length} ключей, недостает: ${missing.length}`);
    if (missing.length > 0 && missing.length <= 10) {
      console.log(`  Примеры недостающих: ${missing.slice(0, 5).join(', ')}`);
    }
  });
});
