import React, { useState, useRef, useCallback } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';
import { Bold, Italic, Underline, Type, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/use-language';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const editorI18n: Record<string, {
  bold: string; italic: string; underline: string;
  upper: string; lower: string; titleCase: string; clear: string;
  hintBold: string; hintItalic: string; hintUnderline: string;
  word: string;
}> = {
  ru: {
    bold: 'Жирный (**текст**)',
    italic: 'Курсив (*текст*)',
    underline: 'Подчеркнутый (<u>текст</u>)',
    upper: 'ЗАГЛАВНЫЕ (выделить текст)',
    lower: 'строчные (выделить текст)',
    titleCase: 'Первая Заглавная (выделить текст)',
    clear: 'Очистить форматирование',
    hintBold: 'Жирный',
    hintItalic: 'Курсив',
    hintUnderline: 'Подчеркнутый',
    word: 'текст',
  },
  en: {
    bold: 'Bold (**text**)',
    italic: 'Italic (*text*)',
    underline: 'Underline (<u>text</u>)',
    upper: 'UPPERCASE (select text)',
    lower: 'lowercase (select text)',
    titleCase: 'Title Case (select text)',
    clear: 'Clear formatting',
    hintBold: 'Bold',
    hintItalic: 'Italic',
    hintUnderline: 'Underline',
    word: 'text',
  },
  he: {
    bold: 'מודגש (**טקסט**)',
    italic: 'נטוי (*טקסט*)',
    underline: 'קו תחתון (<u>טקסט</u>)',
    upper: 'אותיות גדולות (בחר טקסט)',
    lower: 'אותיות קטנות (בחר טקסט)',
    titleCase: 'אות ראשונה גדולה (בחר טקסט)',
    clear: 'נקה עיצוב',
    hintBold: 'מודגש',
    hintItalic: 'נטוי',
    hintUnderline: 'קו תחתון',
    word: 'טקסט',
  },
  ar: {
    bold: 'غامق (**نص**)',
    italic: 'مائل (*نص*)',
    underline: 'تسطير (<u>نص</u>)',
    upper: 'أحرف كبيرة (حدد النص)',
    lower: 'أحرف صغيرة (حدد النص)',
    titleCase: 'الحرف الأول كبير (حدد النص)',
    clear: 'مسح التنسيق',
    hintBold: 'غامق',
    hintItalic: 'مائل',
    hintUnderline: 'تسطير',
    word: 'نص',
  },
};

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const { currentLanguage } = useLanguage();
  const t = editorI18n[currentLanguage] || editorI18n.ru;

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
      newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
      newCursorPos = start + prefix.length + selectedText.length + suffix.length;
    } else {
      newText = value.substring(0, start) + prefix + suffix + value.substring(start);
      newCursorPos = start + prefix.length;
    }
    
    onChange(newText);
    
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
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/<u>(.*?)<\/u>/g, '$1');
    
    onChange(cleanText);
  }, [value, onChange]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleBold}
          className="h-8 w-8 p-0"
          title={t.bold}
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleItalic}
          className="h-8 w-8 p-0"
          title={t.italic}
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleUnderline}
          className="h-8 w-8 p-0"
          title={t.underline}
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
          title={t.upper}
        >
          АБ
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => toggleCase('lower')}
          className="h-8 px-2 text-xs"
          title={t.lower}
        >
          аб
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => toggleCase('title')}
          className="h-8 px-2 text-xs"
          title={t.titleCase}
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
          title={t.clear}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      
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
      
      <div className="text-xs text-muted-foreground space-y-1">
        <div><strong>{t.hintBold}:</strong> **{t.word}** → <strong>{t.word}</strong></div>
        <div><strong>{t.hintItalic}:</strong> *{t.word}* → <em>{t.word}</em></div>
        <div><strong>{t.hintUnderline}:</strong> &lt;u&gt;{t.word}&lt;/u&gt; → <u>{t.word}</u></div>
      </div>
    </div>
  );
}
