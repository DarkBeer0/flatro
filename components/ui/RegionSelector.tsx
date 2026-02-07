/**
 * Компонент выбора региона/страны
 * 
 * Путь в проекте: components/ui/RegionSelector.tsx
 */

'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { RegionCode, getRegionsList, getRegion } from '@/lib/regions'

interface RegionSelectorProps {
  value: RegionCode
  onChange: (value: RegionCode) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  showFlag?: boolean
}

/**
 * Компонент для выбора региона/страны
 * 
 * @example
 * ```tsx
 * <RegionSelector
 *   value={regionCode}
 *   onChange={setRegionCode}
 *   placeholder="Выберите страну"
 * />
 * ```
 */
export function RegionSelector({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = 'Выберите страну',
  showFlag = true
}: RegionSelectorProps) {
  const [open, setOpen] = useState(false)
  const regions = getRegionsList()
  const selectedRegion = value ? getRegion(value) : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between', className)}
        >
          {selectedRegion ? (
            <span className="flex items-center gap-2">
              {showFlag && <span className="text-lg">{selectedRegion.flag}</span>}
              <span>{selectedRegion.name}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4" />
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Поиск страны..." />
          <CommandEmpty>Страна не найдена</CommandEmpty>
          <CommandGroup>
            {regions.map((region) => (
              <CommandItem
                key={region.code}
                value={region.name}
                onSelect={() => {
                  onChange(region.code)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === region.code ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="text-lg mr-2">{region.flag}</span>
                <span>{region.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default RegionSelector
