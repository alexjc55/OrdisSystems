#!/usr/bin/env node

/**
 * ВАЛИДАТОР ПЕРЕВОДОВ
 * 
 * Проверяет целостность и синхронность переводов между языками
 */

const fs = require('fs');
const path = require('path');

const languages = ['ru', 'en', 'ar'];
const localesDir = path.join(__dirname, '..', 'client', 'src', 'locales');

// Функция для извлечения всех ключей из объекта
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Загрузка всех файлов переводов
const translations = {};
languages.forEach(lang => {
  const filePath = path.join(localesDir, lang, 'admin.json');
  if (fs.existsSync(filePath)) {
    try {
      translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`✓ Загружен ${lang}/admin.json`);
    } catch (error) {
      console.error(`✗ Ошибка в ${lang}/admin.json: ${error.message}`);
    }
  } else {
    console.error(`✗ Файл не найден: ${lang}/admin.json`);
  }
});

// Получение ключей для каждого языка
const languageKeys = {};
languages.forEach(lang => {
  if (translations[lang]) {
    languageKeys[lang] = getAllKeys(translations[lang]);
    console.log(`${lang}: ${languageKeys[lang].length} ключей`);
  }
});

// Поиск недостающих ключей
console.log('\n=== АНАЛИЗ НЕДОСТАЮЩИХ КЛЮЧЕЙ ===');
const allKeys = new Set();
Object.values(languageKeys).forEach(keys => {
  keys.forEach(key => allKeys.add(key));
});

languages.forEach(lang => {
  if (languageKeys[lang]) {
    const missing = Array.from(allKeys).filter(key => !languageKeys[lang].includes(key));
    if (missing.length > 0) {
      console.log(`\n${lang} - недостает ${missing.length} ключей:`);
      missing.forEach(key => console.log(`  - ${key}`));
    } else {
      console.log(`\n${lang} - все ключи присутствуют ✓`);
    }
  }
});

// Проверка пустых значений
console.log('\n=== АНАЛИЗ ПУСТЫХ ЗНАЧЕНИЙ ===');
languages.forEach(lang => {
  if (translations[lang]) {
    const emptyKeys = [];
    function checkEmpty(obj, prefix = '') {
      for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          checkEmpty(obj[key], fullKey);
        } else if (!obj[key] || obj[key].startsWith('[') && obj[key].endsWith(']')) {
          emptyKeys.push(fullKey);
        }
      }
    }
    checkEmpty(translations[lang]);
    
    if (emptyKeys.length > 0) {
      console.log(`\n${lang} - ${emptyKeys.length} пустых значений:`);
      emptyKeys.slice(0, 10).forEach(key => console.log(`  - ${key}`));
      if (emptyKeys.length > 10) {
        console.log(`  ... и еще ${emptyKeys.length - 10}`);
      }
    } else {
      console.log(`\n${lang} - все значения заполнены ✓`);
    }
  }
});

console.log('\n=== ИТОГИ ВАЛИДАЦИИ ===');
const totalKeys = allKeys.size;
languages.forEach(lang => {
  const coverage = languageKeys[lang] ? 
    Math.round((languageKeys[lang].length / totalKeys) * 100) : 0;
  console.log(`${lang}: ${coverage}% покрытие (${languageKeys[lang]?.length || 0}/${totalKeys} ключей)`);
});