// components/contracts/OccasionalAttachments.tsx
'use client'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle } from 'lucide-react'
import UploadContractFile from './UploadContractFile'
import { getContractsT } from '@/lib/i18n/contracts'

const t = getContractsT('pl')

interface OccasionalAttachmentsProps {
  // Akt notarialny
  aktNotarialnyUrl: string | null
  aktNotarialnyName: string | null
  onAktUpload: (file: File) => Promise<string>
  onAktRemove: () => void

  // Zgoda właściciela
  zgodaUrl: string | null
  zgodaName: string | null
  onZgodaUpload: (file: File) => Promise<string>
  onZgodaRemove: () => void

  // Lokal zastępczy
  substituteAddress: string
  substituteCity: string
  substitutePostalCode: string
  onFieldChange: (field: string, value: string) => void
}

export default function OccasionalAttachments({
  aktNotarialnyUrl,
  aktNotarialnyName,
  onAktUpload,
  onAktRemove,
  zgodaUrl,
  zgodaName,
  onZgodaUpload,
  onZgodaRemove,
  substituteAddress,
  substituteCity,
  substitutePostalCode,
  onFieldChange,
}: OccasionalAttachmentsProps) {
  return (
    <Card className="p-6 mb-6 border-purple-200 bg-purple-50/30">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-purple-100 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t.sections.occasionalDocs}</h2>
          <p className="text-sm text-gray-500">
            Najem okazjonalny wymaga dodatkowych dokumentów zgodnie z ustawą
          </p>
        </div>
      </div>

      <div className="space-y-6 mt-6">
        {/* 1. Akt notarialny */}
        <UploadContractFile
          label={t.fields.aktNotarialny}
          description={t.fields.aktNotarialnyDesc}
          value={aktNotarialnyUrl}
          fileName={aktNotarialnyName}
          onUpload={onAktUpload}
          onRemove={onAktRemove}
          required
        />

        {/* 2. Lokal zastępczy */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            {t.sections.substituteProperty}
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <p className="text-xs text-gray-500 mb-3">
            Adres lokalu, do którego najemca zobowiązuje się wyprowadzić po zakończeniu umowy
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <Label htmlFor="substituteAddress" className="text-xs text-gray-500">
                {t.fields.substituteAddress}
              </Label>
              <Input
                id="substituteAddress"
                value={substituteAddress}
                onChange={(e) => onFieldChange('substituteAddress', e.target.value)}
                placeholder="ul. Przykładowa 10/5"
                className="mt-1"
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="substituteCity" className="text-xs text-gray-500">
                {t.fields.substituteCity}
              </Label>
              <Input
                id="substituteCity"
                value={substituteCity}
                onChange={(e) => onFieldChange('substituteCity', e.target.value)}
                placeholder="Warszawa"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="substitutePostalCode" className="text-xs text-gray-500">
                {t.fields.substitutePostalCode}
              </Label>
              <Input
                id="substitutePostalCode"
                value={substitutePostalCode}
                onChange={(e) => onFieldChange('substitutePostalCode', e.target.value)}
                placeholder="00-000"
                className="mt-1"
                required
              />
            </div>
          </div>
        </div>

        {/* 3. Zgoda właściciela */}
        <UploadContractFile
          label={t.fields.zgodaWlasciciela}
          description={t.fields.zgodaWlascicielaDesc}
          value={zgodaUrl}
          fileName={zgodaName}
          onUpload={onZgodaUpload}
          onRemove={onZgodaRemove}
          required
        />
      </div>
    </Card>
  )
}