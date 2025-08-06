import React from 'react';

/**
 * Форматирует текст с базовым форматированием в JSX
 * Поддерживает: **жирный**, *курсив*, <u>подчеркнутый</u>
 */
export function formatText(text: string): React.ReactNode {
  if (!text) return null;
  
  // Обрабатываем текст построчно для сохранения переносов
  const lines = text.split('\n');
  
  return (
    <>
      {lines.map((line, lineIndex) => (
        <React.Fragment key={lineIndex}>
          {lineIndex > 0 && <br />}
          {formatLine(line)}
        </React.Fragment>
      ))}
    </>
  );
}

function formatLine(line: string): React.ReactNode {
  if (!line) return '';
  
  const parts: React.ReactNode[] = [];
  let currentText = line;
  let keyCounter = 0;
  
  // Обрабатываем форматирование последовательно
  while (currentText.length > 0) {
    // Ищем ближайший паттерн форматирования
    const boldMatch = currentText.match(/\*\*(.*?)\*\*/);
    const underlineMatch = currentText.match(/<u>(.*?)<\/u>/);
    const italicMatch = currentText.match(/\*([^*]+?)\*/);
    
    // Определяем какой паттерн встречается раньше
    let earliestMatch = null;
    let earliestIndex = Infinity;
    let type = '';
    
    if (boldMatch && boldMatch.index !== undefined && boldMatch.index < earliestIndex) {
      earliestMatch = boldMatch;
      earliestIndex = boldMatch.index;
      type = 'bold';
    }
    
    if (underlineMatch && underlineMatch.index !== undefined && underlineMatch.index < earliestIndex) {
      earliestMatch = underlineMatch;
      earliestIndex = underlineMatch.index;
      type = 'underline';
    }
    
    if (italicMatch && italicMatch.index !== undefined && italicMatch.index < earliestIndex) {
      // Проверяем что это не часть ** паттерна
      const beforeChar = italicMatch.index > 0 ? currentText[italicMatch.index - 1] : '';
      const afterChar = currentText[italicMatch.index + italicMatch[0].length] || '';
      
      if (beforeChar !== '*' && afterChar !== '*') {
        earliestMatch = italicMatch;
        earliestIndex = italicMatch.index;
        type = 'italic';
      }
    }
    
    if (earliestMatch) {
      // Добавляем текст до форматирования
      if (earliestIndex > 0) {
        parts.push(currentText.substring(0, earliestIndex));
      }
      
      // Добавляем форматированный элемент
      const content = earliestMatch[1];
      switch (type) {
        case 'bold':
          parts.push(<strong key={keyCounter++}>{content}</strong>);
          break;
        case 'underline':
          parts.push(<u key={keyCounter++}>{content}</u>);
          break;
        case 'italic':
          parts.push(<em key={keyCounter++}>{content}</em>);
          break;
      }
      
      // Продолжаем с оставшимся текстом
      currentText = currentText.substring(earliestIndex + earliestMatch[0].length);
    } else {
      // Нет больше форматирования, добавляем оставшийся текст
      parts.push(currentText);
      break;
    }
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