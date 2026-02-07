/**
 * Переиспользуемый компонент для чекбоксов согласия
 * 
 * Путь в проекте: components/auth/TermsCheckbox.tsx
 */

'use client'

import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface TermsCheckboxProps {
  termsAccepted: boolean
  privacyAccepted: boolean
  onTermsChange: (checked: boolean) => void
  onPrivacyChange: (checked: boolean) => void
  error?: string
  className?: string
  showSeparateCheckboxes?: boolean
  termsUrl?: string
  privacyUrl?: string
  required?: boolean
  dataProtectionLaw?: string  // "GDPR" / "RODO" / etc.
}

/**
 * Компонент для отображения чекбоксов согласия с условиями.
 * 
 * @example
 * ```tsx
 * <TermsCheckbox
 *   termsAccepted={formData.termsAccepted}
 *   privacyAccepted={formData.privacyAccepted}
 *   onTermsChange={(checked) => handleChange('termsAccepted', checked)}
 *   onPrivacyChange={(checked) => handleChange('privacyAccepted', checked)}
 *   error={errors.terms}
 *   dataProtectionLaw="RODO"
 * />
 * ```
 */
export function TermsCheckbox({
  termsAccepted,
  privacyAccepted,
  onTermsChange,
  onPrivacyChange,
  error,
  className = '',
  showSeparateCheckboxes = true,
  termsUrl = '/terms',
  privacyUrl = '/privacy',
  required = true,
  dataProtectionLaw
}: TermsCheckboxProps) {
  
  // Режим с одним чекбоксом
  if (!showSeparateCheckboxes) {
    const bothAccepted = termsAccepted && privacyAccepted
    
    const handleCombinedChange = (checked: boolean) => {
      onTermsChange(checked)
      onPrivacyChange(checked)
    }

    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-start space-x-3">
          <Checkbox
            id="terms-combined"
            checked={bothAccepted}
            onCheckedChange={(checked) => handleCombinedChange(checked as boolean)}
            className="mt-1"
          />
          <Label htmlFor="terms-combined" className="text-sm leading-relaxed cursor-pointer">
            Я прочитал(а) и принимаю{' '}
            <Link href={termsUrl} target="_blank" className="text-blue-600 hover:underline font-medium">
              Пользовательское соглашение
            </Link>
            {' '}и{' '}
            <Link href={privacyUrl} target="_blank" className="text-blue-600 hover:underline font-medium">
              Политику конфиденциальности
            </Link>
            {dataProtectionLaw && ` (${dataProtectionLaw})`}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        </div>
        
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
      </div>
    )
  }

  // Режим с двумя чекбоксами
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <Checkbox
          id="terms"
          checked={termsAccepted}
          onCheckedChange={(checked) => onTermsChange(checked as boolean)}
          className="mt-1"
        />
        <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
          Я прочитал(а) и принимаю{' '}
          <Link href={termsUrl} target="_blank" className="text-blue-600 hover:underline font-medium">
            Пользовательское соглашение
          </Link>
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>

      <div className="flex items-start space-x-3">
        <Checkbox
          id="privacy"
          checked={privacyAccepted}
          onCheckedChange={(checked) => onPrivacyChange(checked as boolean)}
          className="mt-1"
        />
        <Label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
          Я прочитал(а) и принимаю{' '}
          <Link href={privacyUrl} target="_blank" className="text-blue-600 hover:underline font-medium">
            Политику конфиденциальности
          </Link>
          {dataProtectionLaw && ` (${dataProtectionLaw})`}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>
      
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </div>
  )
}

/**
 * Хук для валидации согласия
 */
export function useTermsValidation() {
  const validateTerms = (
    termsAccepted: boolean, 
    privacyAccepted: boolean
  ): string | null => {
    if (!termsAccepted && !privacyAccepted) {
      return 'Необходимо принять пользовательское соглашение и политику конфиденциальности'
    }
    if (!termsAccepted) {
      return 'Необходимо принять пользовательское соглашение'
    }
    if (!privacyAccepted) {
      return 'Необходимо принять политику конфиденциальности'
    }
    return null
  }

  return { validateTerms }
}

export default TermsCheckbox
