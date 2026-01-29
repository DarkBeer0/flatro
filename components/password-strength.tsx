// components/password-strength.tsx
'use client'

interface PasswordStrengthProps {
  password: string
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }

  const passedChecks = Object.values(checks).filter(Boolean).length
  
  const getStrength = () => {
    if (passedChecks <= 1) return { level: 1, label: 'Слабый', color: 'bg-red-500' }
    if (passedChecks <= 2) return { level: 2, label: 'Слабый', color: 'bg-orange-500' }
    if (passedChecks <= 3) return { level: 3, label: 'Средний', color: 'bg-yellow-500' }
    if (passedChecks <= 4) return { level: 4, label: 'Хороший', color: 'bg-lime-500' }
    return { level: 5, label: 'Отличный', color: 'bg-green-500' }
  }

  const strength = getStrength()

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      {/* Progress bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              level <= strength.level ? strength.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      
      {/* Label */}
      <p className={`text-xs ${
        strength.level <= 2 ? 'text-red-600' : 
        strength.level <= 3 ? 'text-yellow-600' : 'text-green-600'
      }`}>
        Надёжность: {strength.label}
      </p>

      {/* Requirements */}
      <ul className="text-xs text-gray-500 space-y-1">
        <li className={checks.length ? 'text-green-600' : ''}>
          {checks.length ? '✓' : '○'} Минимум 8 символов
        </li>
        <li className={checks.lowercase ? 'text-green-600' : ''}>
          {checks.lowercase ? '✓' : '○'} Строчная буква (a-z)
        </li>
        <li className={checks.uppercase ? 'text-green-600' : ''}>
          {checks.uppercase ? '✓' : '○'} Заглавная буква (A-Z)
        </li>
        <li className={checks.number ? 'text-green-600' : ''}>
          {checks.number ? '✓' : '○'} Цифра (0-9)
        </li>
        <li className={checks.special ? 'text-green-600' : ''}>
          {checks.special ? '✓' : '○'} Спецсимвол (!@#$%...)
        </li>
      </ul>
    </div>
  )
}

// Функция валидации для использования в форме
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Пароль должен быть минимум 8 символов' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать строчную букву' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать заглавную букву' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать цифру' }
  }
  return { valid: true }
}
