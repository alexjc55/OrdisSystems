import React, { useState, useRef, useCallback } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';
import { Bold, Italic, Underline, Type, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const updateSelection = useCallback(() => {
    if (textareaRef.current) {
      setSelection({
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd
      });
    }
  }, []);

  const insertFormatting = useCallback((prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let newText: string;
    let newCursorPos: number;
    
    if (selectedText) {
      // Если текст выделен, обернуть его в форматирование
      newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
      newCursorPos = start + prefix.length + selectedText.length + suffix.length;
    } else {
      // Если текст не выделен, вставить форматирование в позицию курсора
      newText = value.substring(0, start) + prefix + suffix + value.substring(start);
      newCursorPos = start + prefix.length;
    }
    
    onChange(newText);
    
    // Восстановить фокус и позицию курсора
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange]);

  const toggleBold = () => insertFormatting('**', '**');
  const toggleItalic = () => insertFormatting('*', '*');
  const toggleUnderline = () => insertFormatting('<u>', '</u>');
  
  const toggleCase = useCallback((type: 'upper' | 'lower' | 'title') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    if (!selectedText) return;
    
    let transformedText: string;
    switch (type) {
      case 'upper':
        transformedText = selectedText.toUpperCase();
        break;
      case 'lower':
        transformedText = selectedText.toLowerCase();
        break;
      case 'title':
        transformedText = selectedText.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        break;
      default:
        return;
    }
    
    const newText = value.substring(0, start) + transformedText + value.substring(end);
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + transformedText.length);
    }, 0);
  }, [value, onChange]);

  const clearFormatting = useCallback(() => {
    const cleanText = value
      .replace(/\*\*(.*?)\*\*/g, '$1') // Убрать жирный
      .replace(/\*(.*?)\*/g, '$1')     // Убрать курсив
      .replace(/<u>(.*?)<\/u>/g, '$1'); // Убрать подчеркивание
    
    onChange(cleanText);
  }, [value, onChange]);

  return (
    <div className="space-y-2">
      {/* Панель инструментов */}
      <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleBold}
          className="h-8 w-8 p-0"
          title="Жирный (**текст**)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleItalic}
          className="h-8 w-8 p-0"
          title="Курсив (*текст*)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleUnderline}
          className="h-8 w-8 p-0"
          title="Подчеркнутый (<u>текст</u>)"
        >
          <Underline className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1 self-center" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => toggleCase('upper')}
          className="h-8 px-2 text-xs font-bold"
          title="ЗАГЛАВНЫЕ (выделить текст)"
        >
          АБ
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => toggleCase('lower')}
          className="h-8 px-2 text-xs"
          title="строчные (выделить текст)"
        >
          аб
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => toggleCase('title')}
          className="h-8 px-2 text-xs"
          title="Первая Заглавная (выделить текст)"
        >
          <Type className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1 self-center" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearFormatting}
          className="h-8 w-8 p-0"
          title="Очистить форматирование"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Текстовое поле */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={updateSelection}
        onKeyUp={updateSelection}
        onClick={updateSelection}
        placeholder={placeholder}
        className={cn("min-h-[120px] font-mono text-sm", className)}
      />
      
      {/* Справка по форматированию */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div><strong>Жирный:</strong> **текст** → <strong>текст</strong></div>
        <div><strong>Курсив:</strong> *текст* → <em>текст</em></div>
        <div><strong>Подчеркнутый:</strong> &lt;u&gt;текст&lt;/u&gt; → <u>текст</u></div>
      </div>
    </div>
  );
}