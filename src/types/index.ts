export interface Property {
  id: string
  userId: string
  name: string
  address: string
  city: string
  postalCode?: string
  area?: number
  rooms?: number
  floor?: number
  description?: string
  status: 'VACANT' | 'OCCUPIED' | 'RESERVED'
  createdAt: Date
  updatedAt: Date
}

export interface Tenant {
  id: string
  userId: string
  propertyId?: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  pesel?: string
  moveInDate?: Date
  moveOutDate?: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Payment {
  id: string
  userId: string
  tenantId: string
  amount: number
  type: 'RENT' | 'UTILITIES' | 'DEPOSIT' | 'OTHER'
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  dueDate: Date
  paidDate?: Date
  period?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface DashboardStats {
  totalProperties: number
  occupiedProperties: number
  vacantProperties: number
  totalTenants: number
  pendingPayments: number
  overduePayments: number
  monthlyIncome: number
}