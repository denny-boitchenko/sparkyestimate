import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export interface ComboboxOption {
  value: string
  label: string
  detail?: string
  group?: string
}

export interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  allowCustom?: boolean
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function Combobox({
  options,
  value,
  onValueChange,
  allowCustom = false,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  className,
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedOption = options.find(
    (opt) => opt.value.toLowerCase() === value.toLowerCase()
  )

  const displayLabel = selectedOption
    ? selectedOption.label
    : value || placeholder

  // Group options by their group field
  const grouped = React.useMemo(() => {
    const groups = new Map<string, ComboboxOption[]>()
    const ungrouped: ComboboxOption[] = []

    for (const opt of options) {
      if (opt.group) {
        const existing = groups.get(opt.group)
        if (existing) {
          existing.push(opt)
        } else {
          groups.set(opt.group, [opt])
        }
      } else {
        ungrouped.push(opt)
      }
    }

    return { groups, ungrouped }
  }, [options])

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue)
    setOpen(false)
    setSearch("")
  }

  const handleCustomSelect = () => {
    if (search.trim()) {
      onValueChange(search.trim())
      setOpen(false)
      setSearch("")
    }
  }

  // Check if the current search text matches any existing option
  const searchMatchesOption = options.some(
    (opt) =>
      opt.label.toLowerCase() === search.trim().toLowerCase() ||
      opt.value.toLowerCase() === search.trim().toLowerCase()
  )

  const showCustomOption =
    allowCustom && search.trim() !== "" && !searchMatchesOption

  const renderItem = (opt: ComboboxOption) => (
    <CommandItem
      key={opt.value}
      value={opt.value}
      keywords={[opt.label, opt.detail ?? ""]}
      onSelect={handleSelect}
    >
      <Check
        className={cn(
          "mr-2 h-4 w-4",
          value.toLowerCase() === opt.value.toLowerCase()
            ? "opacity-100"
            : "opacity-0"
        )}
      />
      <span className="flex-1 truncate">{opt.label}</span>
      {opt.detail && (
        <span className="ml-2 text-xs text-muted-foreground">{opt.detail}</span>
      )}
    </CommandItem>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedOption && !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {allowCustom && search.trim()
                ? "No matches found. Press Enter to use custom value."
                : "No results found."}
            </CommandEmpty>

            {/* Ungrouped options */}
            {grouped.ungrouped.length > 0 && (
              <CommandGroup>
                {grouped.ungrouped.map(renderItem)}
              </CommandGroup>
            )}

            {/* Grouped options */}
            {Array.from(grouped.groups.entries()).map(([groupName, groupOptions]) => (
              <CommandGroup key={groupName} heading={groupName}>
                {groupOptions.map(renderItem)}
              </CommandGroup>
            ))}

            {/* Custom value option */}
            {showCustomOption && (
              <CommandGroup>
                <CommandItem
                  value={`__custom__${search.trim()}`}
                  onSelect={handleCustomSelect}
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  <span className="text-muted-foreground">
                    Use: &ldquo;{search.trim()}&rdquo;
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
