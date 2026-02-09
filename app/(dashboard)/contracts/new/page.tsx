// app/(dashboard)/contracts/new/page.tsx
'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Save,
  Upload,
  Building,
  User,
  Calendar,
  CreditCard,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import UploadContractFile from '@/components/contracts/UploadContractFile'
import OccasionalAttachments from '@/components/contracts/OccasionalAttachments'
import { getContractsT } from '@/lib/i18n/contracts'

const t = getContractsT('pl')

interface PropertyOption {
  id: string
  name: string
  address: string
  city: string
  postalCode: string | null
  area: number | null
}

interface TenantOption {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  nationalId: string | null
  nationalIdType: string | null
  citizenship: string | null
  registrationAddress: string | null
}

type CreationMode = 'FORM' | 'UPLOAD'

export default function NewContractPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <NewContractForm />
    </Suspense>
  )
}

function NewContractForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPropertyId = searchParams.get('propertyId') || ''

  const [isLoading, setIsLoading] = useState(false)
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Creation mode
  const [creationMode, setCreationMode] = useState<CreationMode>('FORM')

  // Form data
  const [formData, setFormData] = useState({
    propertyId: preselectedPropertyId,
    tenantId: '',
    type: 'STANDARD' as 'STANDARD' | 'OCCASIONAL' | 'INSTITUTIONAL',
    startDate: '',
    endDate: '',
    rentAmount: '',
    adminFee: '',
    utilitiesAdvance: '',
    depositAmount: '',
    paymentDay: '10',
    notes: '',
    currency: 'PLN',
    country: 'PL',
  })

  // Uploaded contract PDF
  const [contractFileUrl, setContractFileUrl] = useState<string | null>(null)
  const [contractFileName, setContractFileName] = useState<string | null>(null)

  // Occasional contract attachments
  const [aktNotarialnyUrl, setAktNotarialnyUrl] = useState<string | null>(null)
  const [aktNotarialnyName, setAktNotarialnyName] = useState<string | null>(null)
  const [zgodaUrl, setZgodaUrl] = useState<string | null>(null)
  const [zgodaName, setZgodaName] = useState<string | null>(null)
  const [substituteAddress, setSubstituteAddress] = useState('')
  const [substituteCity, setSubstituteCity] = useState('')
  const [substitutePostalCode, setSubstitutePostalCode] = useState('')

  // Load properties and tenants
  useEffect(() => {
    async function loadData() {
      try {
        const [propsRes, tenantsRes] = await Promise.all([
          fetch('/api/properties'),
          fetch('/api/tenants'),
        ])
        if (propsRes.ok) setProperties(await propsRes.json())
        if (tenantsRes.ok) setTenants(await tenantsRes.json())
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [])

  // Computed total monthly
  const totalMonthly = useMemo(() => {
    const rent = parseFloat(formData.rentAmount) || 0
    const admin = parseFloat(formData.adminFee) || 0
    const utils = parseFloat(formData.utilitiesAdvance) || 0
    return rent + admin + utils
  }, [formData.rentAmount, formData.adminFee, formData.utilitiesAdvance])

  // Selected property/tenant info
  const selectedProperty = properties.find((p) => p.id === formData.propertyId)
  const selectedTenant = tenants.find((t) => t.id === formData.tenantId)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // File upload helper
  async function uploadFile(file: File, type: string = 'OTHER'): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', type)

    const res = await fetch('/api/contracts/upload', { method: 'POST', body: fd })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Upload failed')
    }
    const data = await res.json()
    return data.url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Build attachments array for occasional
      const attachments: any[] = []
      if (formData.type === 'OCCASIONAL') {
        if (aktNotarialnyUrl) {
          attachments.push({
            type: 'AKT_NOTARIALNY',
            label: t.fields.aktNotarialny,
            fileUrl: aktNotarialnyUrl,
            fileName: aktNotarialnyName,
          })
        }
        if (zgodaUrl) {
          attachments.push({
            type: 'ZGODA_WLASCICIELA',
            label: t.fields.zgodaWlasciciela,
            fileUrl: zgodaUrl,
            fileName: zgodaName,
          })
        }
      }

      const payload = {
        propertyId: formData.propertyId,
        tenantId: formData.tenantId,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        rentAmount: formData.rentAmount,
        adminFee: formData.adminFee || '0',
        utilitiesAdvance: formData.utilitiesAdvance || '0',
        depositAmount: formData.depositAmount || null,
        paymentDay: formData.paymentDay,
        notes: formData.notes || null,
        contractSource: creationMode,
        contractFileUrl: contractFileUrl || null,
        currency: formData.currency,
        country: formData.country,
        locale: 'pl-PL',
        substituteAddress: substituteAddress || null,
        substituteCity: substituteCity || null,
        substitutePostalCode: substitutePostalCode || null,
        attachments,
      }

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error saving contract')
      }

      router.push('/contracts')
    } catch (error) {
      console.error('Error saving contract:', error)
      alert(t.messages.errorSaving)
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/contracts"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t.actions.back}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{t.newContract}</h1>
        <p className="text-gray-500 mt-1">{t.createDescription}</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ===== CREATION MODE ===== */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="h-5 w-5 text-gray-600" />
            </div>
            <h2 className="text-lg font-semibold">{t.creationMode.title}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label
              className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                creationMode === 'FORM'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="creationMode"
                value="FORM"
                checked={creationMode === 'FORM'}
                onChange={() => setCreationMode('FORM')}
                className="sr-only"
              />
              <FileText className="h-6 w-6 text-blue-600 mb-2" />
              <span className="font-medium">{t.creationMode.fromTemplate}</span>
              <span className="text-sm text-gray-500 mt-1">{t.creationMode.fromTemplateDesc}</span>
            </label>

            <label
              className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                creationMode === 'UPLOAD'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="creationMode"
                value="UPLOAD"
                checked={creationMode === 'UPLOAD'}
                onChange={() => setCreationMode('UPLOAD')}
                className="sr-only"
              />
              <Upload className="h-6 w-6 text-blue-600 mb-2" />
              <span className="font-medium">{t.creationMode.uploadPdf}</span>
              <span className="text-sm text-gray-500 mt-1">{t.creationMode.uploadPdfDesc}</span>
            </label>
          </div>
        </Card>

        {/* ===== UPLOAD MODE: PDF upload ===== */}
        {creationMode === 'UPLOAD' && (
          <Card className="p-6 mb-6">
            <UploadContractFile
              label={t.actions.uploadPdf}
              description="Wgraj podpisany plik umowy (PDF lub skan)"
              value={contractFileUrl}
              fileName={contractFileName}
              onUpload={async (file) => {
                const url = await uploadFile(file, 'CONTRACT')
                setContractFileUrl(url)
                setContractFileName(file.name)
                return url
              }}
              onRemove={() => {
                setContractFileUrl(null)
                setContractFileName(null)
              }}
              required
            />
          </Card>
        )}

        {/* ===== CONTRACT TYPE ===== */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold">{t.sections.contractType}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['STANDARD', 'OCCASIONAL', 'INSTITUTIONAL'] as const).map((contractType) => (
              <label
                key={contractType}
                className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.type === contractType
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={contractType}
                  checked={formData.type === contractType}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="font-medium">{t.types[contractType]}</span>
                <span className="text-xs text-gray-500 mt-1">{t.typeDescriptions[contractType]}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* ===== PARTIES (Property + Tenant) ===== */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold">{t.sections.parties}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Property select */}
            <div>
              <Label htmlFor="propertyId">{t.fields.property} *</Label>
              <select
                id="propertyId"
                name="propertyId"
                value={formData.propertyId}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t.fields.selectProperty}</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.address}
                  </option>
                ))}
              </select>
              {selectedProperty && (
                <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                  <p>
                    {selectedProperty.city}
                    {selectedProperty.postalCode ? `, ${selectedProperty.postalCode}` : ''}
                  </p>
                  {selectedProperty.area && <p>{selectedProperty.area} m²</p>}
                </div>
              )}
            </div>

            {/* Tenant select */}
            <div>
              <Label htmlFor="tenantId">{t.fields.tenant} *</Label>
              <select
                id="tenantId"
                name="tenantId"
                value={formData.tenantId}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t.fields.selectTenant}</option>
                {tenants.map((tn) => (
                  <option key={tn.id} value={tn.id}>
                    {tn.firstName} {tn.lastName}
                    {tn.email ? ` (${tn.email})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                <Link href="/tenants/new" className="text-blue-600 hover:underline">
                  {t.fields.addNewTenant}
                </Link>
              </p>

              {/* Show tenant info */}
              {selectedTenant && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
                  {selectedTenant.phone && (
                    <p>
                      {t.fields.phone}: {selectedTenant.phone}
                    </p>
                  )}
                  {selectedTenant.email && (
                    <p>
                      {t.fields.email}: {selectedTenant.email}
                    </p>
                  )}
                  {selectedTenant.nationalId && (
                    <p>
                      {selectedTenant.nationalIdType || 'PESEL'}: {selectedTenant.nationalId}
                    </p>
                  )}
                  {selectedTenant.citizenship && (
                    <p>
                      {t.fields.citizenship}: {selectedTenant.citizenship}
                    </p>
                  )}
                  {selectedTenant.registrationAddress && (
                    <p>
                      {t.fields.registrationAddress}: {selectedTenant.registrationAddress}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ===== DURATION ===== */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold">{t.sections.duration}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="startDate">{t.fields.startDate} *</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate">{t.fields.endDate}</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">{t.fields.indefinite}</p>
            </div>
          </div>
        </Card>

        {/* ===== FINANCIAL ===== */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold">{t.sections.financial}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Czynsz najmu */}
            <div>
              <Label htmlFor="rentAmount">{t.fields.rentAmount} *</Label>
              <Input
                id="rentAmount"
                name="rentAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="2500"
                value={formData.rentAmount}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>

            {/* Czynsz administracyjny */}
            <div>
              <Label htmlFor="adminFee">{t.fields.adminFee}</Label>
              <Input
                id="adminFee"
                name="adminFee"
                type="number"
                min="0"
                step="0.01"
                placeholder="500"
                value={formData.adminFee}
                onChange={handleChange}
                className="mt-1"
              />
            </div>

            {/* Zaliczka na media */}
            <div>
              <Label htmlFor="utilitiesAdvance">{t.fields.utilitiesAdvance}</Label>
              <Input
                id="utilitiesAdvance"
                name="utilitiesAdvance"
                type="number"
                min="0"
                step="0.01"
                placeholder="300"
                value={formData.utilitiesAdvance}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
          </div>

          {/* Total monthly */}
          {totalMonthly > 0 && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
              <span className="font-medium text-emerald-800">{t.fields.totalMonthly}:</span>
              <span className="text-xl font-bold text-emerald-700">
                {totalMonthly.toLocaleString('pl-PL')} zł
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Kaucja */}
            <div>
              <Label htmlFor="depositAmount">{t.fields.depositAmount}</Label>
              <Input
                id="depositAmount"
                name="depositAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="5000"
                value={formData.depositAmount}
                onChange={handleChange}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">{t.fields.depositHint}</p>
            </div>

            {/* Dzień płatności */}
            <div>
              <Label htmlFor="paymentDay">{t.fields.paymentDay} *</Label>
              <select
                id="paymentDay"
                name="paymentDay"
                value={formData.paymentDay}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 5, 10, 15, 20, 25].map((day) => (
                  <option key={day} value={day}>
                    {day}. {t.fields.dayOfMonth}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* ===== OCCASIONAL ATTACHMENTS ===== */}
        {formData.type === 'OCCASIONAL' && (
          <OccasionalAttachments
            aktNotarialnyUrl={aktNotarialnyUrl}
            aktNotarialnyName={aktNotarialnyName}
            onAktUpload={async (file) => {
              const url = await uploadFile(file, 'AKT_NOTARIALNY')
              setAktNotarialnyUrl(url)
              setAktNotarialnyName(file.name)
              return url
            }}
            onAktRemove={() => {
              setAktNotarialnyUrl(null)
              setAktNotarialnyName(null)
            }}
            zgodaUrl={zgodaUrl}
            zgodaName={zgodaName}
            onZgodaUpload={async (file) => {
              const url = await uploadFile(file, 'ZGODA_WLASCICIELA')
              setZgodaUrl(url)
              setZgodaName(file.name)
              return url
            }}
            onZgodaRemove={() => {
              setZgodaUrl(null)
              setZgodaName(null)
            }}
            substituteAddress={substituteAddress}
            substituteCity={substituteCity}
            substitutePostalCode={substitutePostalCode}
            onFieldChange={(field, value) => {
              if (field === 'substituteAddress') setSubstituteAddress(value)
              if (field === 'substituteCity') setSubstituteCity(value)
              if (field === 'substitutePostalCode') setSubstitutePostalCode(value)
            }}
          />
        )}

        {/* ===== NOTES ===== */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-6">{t.sections.notes}</h2>
          <div>
            <Label htmlFor="notes">{t.fields.notes}</Label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder={t.fields.notesPlaceholder}
              value={formData.notes}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </Card>

        {/* ===== ACTIONS ===== */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{t.messages.pdfSavedHint}</p>
          <div className="flex gap-4">
            <Link href="/contracts">
              <Button type="button" variant="outline">
                {t.actions.cancel}
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.actions.saving}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t.actions.save}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}