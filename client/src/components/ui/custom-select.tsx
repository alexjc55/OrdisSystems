import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CustomSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export interface CustomSelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

const CustomSelect = React.forwardRef<HTMLDivElement, CustomSelectProps>(
  ({ value, onValueChange, placeholder = "Выберите...", children, className, disabled }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedValue, setSelectedValue] = useState(value || "")
    const selectRef = useRef<HTMLDivElement>(null)

    // Extract options from children
    const options = React.Children.toArray(children).filter(
      (child): child is React.ReactElement<CustomSelectItemProps> =>
        React.isValidElement(child) && child.type === CustomSelectItem
    )

    const selectedOption = options.find(option => option.props.value === selectedValue)

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }

      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
      setSelectedValue(value || "")
    }, [value])

    const handleSelect = (optionValue: string) => {
      setSelectedValue(optionValue)
      onValueChange?.(optionValue)
      setIsOpen(false)
    }

    return (
      <div className={cn("relative", className)} ref={selectRef}>
        <div
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm cursor-pointer",
            disabled && "cursor-not-allowed opacity-50",
            isOpen && "ring-2 ring-ring ring-offset-2"
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <span className={cn(!selectedValue && "text-gray-500")}>
            {selectedOption?.props.children || placeholder}
          </span>
          <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-white shadow-lg">
            {options.map((option) => (
              <div
                key={option.props.value}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors",
                  "hover:bg-orange-500 hover:text-white",
                  selectedValue === option.props.value && "bg-orange-500 text-white"
                )}
                onClick={() => handleSelect(option.props.value)}
              >
                <span>{option.props.children}</span>
                {selectedValue === option.props.value && (
                  <Check className="h-4 w-4" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)
CustomSelect.displayName = "CustomSelect"

const CustomSelectItem: React.FC<CustomSelectItemProps> = ({ value, children }) => {
  // This is just a placeholder component for type checking
  return null
}

export { CustomSelect, CustomSelectItem }