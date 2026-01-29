import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { getCompanyId } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Truck, Package, FileText, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const companyId = await getCompanyId()

  if (!companyId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">No company data available</p>
        </div>
      </div>
    )
  }

  const [trailers, shipments, loadPlans] = await Promise.all([
    prisma.trailer.count({
      where: { companyId, isActive: true },
    }),
    prisma.shipment.count({
      where: { companyId },
    }),
    prisma.loadPlan.count({
      where: { companyId },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome to the TMS System</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trailers</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trailers}</div>
            <p className="text-xs text-muted-foreground">In fleet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shipments}</div>
            <p className="text-xs text-muted-foreground">Total shipments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Load Plans</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loadPlans}</div>
            <p className="text-xs text-muted-foreground">Created plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Average load</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/load-plans/new">
              <Button className="w-full justify-start" {...({ variant: 'outline' } as any)}>
                <FileText className="mr-2 h-4 w-4" />
                Create New Load Plan
              </Button>
            </Link>
            <Link href="/dashboard/fleet">
              <Button className="w-full justify-start" {...({ variant: 'outline' } as any)}>
                <Truck className="mr-2 h-4 w-4" />
                Manage Fleet
              </Button>
            </Link>
            <Link href="/dashboard/shipments">
              <Button className="w-full justify-start" {...({ variant: 'outline' } as any)}>
                <Package className="mr-2 h-4 w-4" />
                View Shipments
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest load plans and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

