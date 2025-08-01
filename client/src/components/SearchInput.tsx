import { useCallback, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export default function SearchInput({ value, onChange, placeholder, className = "" }: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  // Sync external value changes with local state
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Only call parent onChange when we have 3+ characters or when clearing (0 characters)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue.length >= 3 || localValue.length === 0) {
        onChange(localValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  }, []);

  return (
    <div className={`relative max-w-md ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        className="pl-10 bg-white border-gray-300"
      />
    </div>
  );
}