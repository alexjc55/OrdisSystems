import React from 'react';

/**
 * Форматирует текст с базовым форматированием в JSX
 * Поддерживает: **жирный**, *курсив*, <u>подчеркнутый</u>
 */
export function formatText(text: string): React.ReactNode {
  if (!text) return null;
  
  // Разбиваем текст на части с учетом форматирования
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  let key = 0;
  
  // Паттерны для разных типов форматирования (в порядке приоритета)
  const patterns = [
    { regex: /\*\*(.*?)\*\*/g, render: (match: string, content: string) => <strong key={key++}>{content}</strong> },
    { regex: /<u>(.*?)<\/u>/g, render: (match: string, content: string) => <u key={key++}>{content}</u> },
    { regex: /\*(.*?)\*/g, render: (match: string, content: string) => <em key={key++}>{content}</em> }
  ];
  
  // Находим все совпадения для всех паттернов
  const allMatches: Array<{
    index: number;
    length: number;
    element: React.ReactNode;
  }> = [];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      allMatches.push({
        index: match.index,
        length: match[0].length,
        element: pattern.render(match[0], match[1])
      });
    }
  });
  
  // Сортируем совпадения по позиции
  allMatches.sort((a, b) => a.index - b.index);
  
  // Строим результирующий массив элементов
  allMatches.forEach(match => {
    // Добавляем обычный текст перед форматированным
    if (currentIndex < match.index) {
      const normalText = text.substring(currentIndex, match.index);
      if (normalText) {
        parts.push(normalText);
      }
    }
    
    // Добавляем форматированный элемент
    parts.push(match.element);
    
    // Обновляем текущую позицию
    currentIndex = match.index + match.length;
  });
  
  // Добавляем оставшийся текст
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex);
    if (remainingText) {
      parts.push(remainingText);
    }
  }
  
  // Если нет форматирования, возвращаем исходный текст
  if (parts.length === 0) {
    return text;
  }
  
  return <>{parts}</>;
}

/**
 * Компонент для отображения форматированного текста
 */
interface FormattedTextProps {
  children: string;
  className?: string;
}

export function FormattedText({ children, className }: FormattedTextProps) {
  return (
    <span className={className}>
      {formatText(children)}
    </span>
  );
}