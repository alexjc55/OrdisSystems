import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'utm_params';
const STORAGE_TTL_KEY = 'utm_params_ttl';
const TTL_DAYS = 30; // UTM параметры действительны 30 дней

// Список параметров для сохранения
const TRACKED_PARAMS = [
  // UTM параметры
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  
  // Click IDs для рекламных платформ
  'fbclid',    // Facebook Click ID
  'gclid',     // Google Click ID
  'yclid',     // Yandex Click ID
  'msclkid',   // Microsoft Click ID
  'ttclid',    // TikTok Click ID
  
  // Другие трекинг параметры
  'ref',       // Referral
  'source',    // Generic source
  'campaign',  // Generic campaign
];

interface UTMParams {
  [key: string]: string;
}

export function useUTMParams() {
  const [utmParams, setUtmParams] = useState<UTMParams>({});

  // Загрузить сохраненные параметры из localStorage
  const loadSavedParams = useCallback((): UTMParams => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const ttl = localStorage.getItem(STORAGE_TTL_KEY);
      
      if (!saved || !ttl) {
        return {};
      }
      
      // Проверить срок действия
      const expiryTime = parseInt(ttl, 10);
      if (Date.now() > expiryTime) {
        // Истекли - удалить
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_TTL_KEY);
        return {};
      }
      
      return JSON.parse(saved);
    } catch (error) {
      console.error('[UTMParams] Error loading saved params:', error);
      return {};
    }
  }, []);

  // Сохранить параметры в localStorage
  const saveParams = useCallback((params: UTMParams) => {
    try {
      if (Object.keys(params).length === 0) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_TTL_KEY);
        return;
      }
      
      const expiryTime = Date.now() + (TTL_DAYS * 24 * 60 * 60 * 1000);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
      localStorage.setItem(STORAGE_TTL_KEY, expiryTime.toString());
    } catch (error) {
      console.error('[UTMParams] Error saving params:', error);
    }
  }, []);

  // Извлечь трекинг параметры из URL
  const extractParamsFromURL = useCallback((): UTMParams => {
    const urlParams = new URLSearchParams(window.location.search);
    const params: UTMParams = {};
    
    TRACKED_PARAMS.forEach(param => {
      const value = urlParams.get(param);
      if (value) {
        params[param] = value;
      }
    });
    
    return params;
  }, []);

  // Объединить существующие и новые параметры
  const mergeParams = useCallback((existing: UTMParams, newParams: UTMParams): UTMParams => {
    // Новые параметры имеют приоритет над старыми
    return { ...existing, ...newParams };
  }, []);

  // Инициализация при монтировании
  useEffect(() => {
    // 1. Загрузить сохраненные параметры
    const savedParams = loadSavedParams();
    
    // 2. Извлечь параметры из текущего URL
    const urlParams = extractParamsFromURL();
    
    // 3. Объединить (новые имеют приоритет)
    const merged = mergeParams(savedParams, urlParams);
    
    // 4. Сохранить обновленные параметры
    if (Object.keys(merged).length > 0) {
      saveParams(merged);
      setUtmParams(merged);
      
      console.log('[UTMParams] Initialized with params:', merged);
    } else {
      setUtmParams({});
    }
  }, []); // Выполнить только один раз при монтировании

  // Добавить параметры к URL
  const addParamsToURL = useCallback((url: string, additionalParams: Record<string, string> = {}): string => {
    try {
      // Если URL начинается с #, игнорировать
      if (url.startsWith('#')) {
        return url;
      }
      
      // Если URL начинается с http:// или https://, это внешний URL - не добавлять параметры
      if (url.match(/^https?:\/\//)) {
        return url;
      }
      
      const urlObj = new URL(url, window.location.origin);
      
      // Получить существующие параметры из URL
      const existingParams: Record<string, string> = {};
      urlObj.searchParams.forEach((value, key) => {
        existingParams[key] = value;
      });
      
      // Объединить: существующие + UTM + дополнительные
      const allParams = {
        ...utmParams,           // Сохраненные UTM параметры
        ...existingParams,      // Параметры уже в URL (приоритет)
        ...additionalParams     // Дополнительные параметры (наивысший приоритет)
      };
      
      // Очистить текущие параметры и добавить объединенные
      urlObj.search = '';
      Object.entries(allParams).forEach(([key, value]) => {
        if (value) {
          urlObj.searchParams.set(key, value);
        }
      });
      
      // Вернуть только pathname + search + hash (без origin)
      return urlObj.pathname + urlObj.search + urlObj.hash;
    } catch (error) {
      console.error('[UTMParams] Error adding params to URL:', url, error);
      return url;
    }
  }, [utmParams]);

  // Получить параметры как строку запроса
  const getQueryString = useCallback((): string => {
    const params = new URLSearchParams();
    Object.entries(utmParams).forEach(([key, value]) => {
      params.set(key, value);
    });
    return params.toString();
  }, [utmParams]);

  // Очистить сохраненные параметры
  const clearParams = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_TTL_KEY);
    setUtmParams({});
  }, []);

  return {
    utmParams,
    addParamsToURL,
    getQueryString,
    clearParams,
    hasParams: Object.keys(utmParams).length > 0
  };
}
