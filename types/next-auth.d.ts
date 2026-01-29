import { UserRole } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: UserRole
      companyId: string | null
    }
  }

  interface User {
    role: UserRole
    companyId: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole
    companyId: string | null
  }
}

