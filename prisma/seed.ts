import { PrismaClient } from '@prisma/client'
import { TrailerType, PalletType, ShipmentStatus, StopType, LoadPlanStatus, UserRole } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create company
  const company = await prisma.company.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Transport BV',
      slug: 'demo-company',
    },
  })

  console.log('✅ Created company:', company.name)

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      name: 'Admin User',
      password: hashedPassword,
      role: UserRole.ADMIN,
      companyId: company.id,
    },
  })

  // Create planner user
  const planner = await prisma.user.upsert({
    where: { email: 'planner@demo.com' },
    update: {},
    create: {
      email: 'planner@demo.com',
      name: 'Transport Planner',
      password: hashedPassword,
      role: UserRole.PLANNER,
      companyId: company.id,
    },
  })

  console.log('✅ Created users')

  // Create trailers
  const bache = await prisma.trailer.create({
    data: {
      companyId: company.id,
      name: 'Bâche Trailer 01',
      type: TrailerType.BACHE,
      model: 'Schmitz Cargobull S.CS',
      licensePlate: 'NL-123-ABC',
      internalLength: 13600, // 13.6m
      internalWidth: 2450,   // 2.45m
      internalHeight: 2700,  // 2.7m
      doorWidth: 2450,
      doorHeight: 2700,
      maxPayload: 24000, // 24 ton
      maxAxleLoad: 10000,
      maxStackHeight: 4500,
      hasWheelArches: true,
      wheelArchHeight: 300,
      wheelArchWidth: 800,
      hasRails: true,
      railSpacing: 1200,
    },
  })

  const frigo = await prisma.trailer.create({
    data: {
      companyId: company.id,
      name: 'Frigo Trailer 01',
      type: TrailerType.FRIGO,
      model: 'Thermo King',
      licensePlate: 'NL-456-DEF',
      internalLength: 13300, // 13.3m
      internalWidth: 2400,   // 2.4m
      internalHeight: 2600,  // 2.6m
      doorWidth: 2400,
      doorHeight: 2600,
      maxPayload: 22000, // 22 ton
      maxAxleLoad: 10000,
      maxStackHeight: 4000,
      temperatureMin: 2,
      temperatureMax: 8,
      temperatureZones: [
        {
          name: 'Cool Zone 2-8°C',
          x: 0,
          y: 0,
          width: 2400,
          height: 8000,
          tempMin: 2,
          tempMax: 8,
        },
        {
          name: 'Ambient Zone 15-25°C',
          x: 0,
          y: 8000,
          width: 2400,
          height: 5300,
          tempMin: 15,
          tempMax: 25,
        },
      ],
    },
  })

  const stukgoed = await prisma.trailer.create({
    data: {
      companyId: company.id,
      name: 'Stukgoedwagen 01',
      type: TrailerType.STUKGOED,
      model: 'DAF LF',
      licensePlate: 'NL-789-GHI',
      internalLength: 9000,  // 9m
      internalWidth: 2300,   // 2.3m
      internalHeight: 2500,  // 2.5m
      doorWidth: 2300,
      doorHeight: 2500,
      maxPayload: 12000, // 12 ton
      maxAxleLoad: 6000,
      maxStackHeight: 3500,
    },
  })

  console.log('✅ Created trailers')

  // Create cargo items
  const cargoItems = [
    {
      name: 'EURO Pallet - Standaard',
      description: 'Standaard EURO pallet 1200x800mm',
      palletType: PalletType.EURO_1200x800,
      length: 1200,
      width: 800,
      height: 1440, // Pallet + standaard lading
      weight: 1200,
      isStackable: true,
      maxStackWeight: 5000,
      maxStackHeight: 3000,
      isFragile: false,
      sku: 'PALLET-EURO-001',
    },
    {
      name: 'Blokpallet - Zwaar',
      description: 'Blokpallet 1200x1000mm met zware lading',
      palletType: PalletType.BLOCK_1200x1000,
      length: 1200,
      width: 1000,
      height: 1600,
      weight: 1800,
      isStackable: true,
      maxStackWeight: 4000,
      maxStackHeight: 3200,
      isFragile: false,
      sku: 'PALLET-BLOCK-001',
    },
    {
      name: 'Fragile - Elektronica',
      description: 'Fragiele elektronica op pallet',
      palletType: PalletType.EURO_1200x800,
      length: 1200,
      width: 800,
      height: 1200,
      weight: 450,
      isStackable: false,
      isFragile: true,
      thisSideUp: true,
      sku: 'FRAGILE-001',
    },
    {
      name: 'Frigo Product - 2-8°C',
      description: 'Gekoelde producten, temperatuur 2-8°C',
      palletType: PalletType.EURO_1200x800,
      length: 1200,
      width: 800,
      height: 1400,
      weight: 800,
      isStackable: true,
      maxStackWeight: 3000,
      temperatureMin: 2,
      temperatureMax: 8,
      sku: 'FRIGO-001',
    },
    {
      name: 'Frigo Product - 15-25°C',
      description: 'Gekoelde producten, temperatuur 15-25°C',
      palletType: PalletType.EURO_1200x800,
      length: 1200,
      width: 800,
      height: 1400,
      weight: 750,
      isStackable: true,
      maxStackWeight: 3000,
      temperatureMin: 15,
      temperatureMax: 25,
      sku: 'FRIGO-002',
    },
    {
      name: 'ADR - Klasse 3',
      description: 'ADR gevaarlijke stoffen klasse 3',
      palletType: PalletType.EURO_1200x800,
      length: 1200,
      width: 800,
      height: 1500,
      weight: 1000,
      isStackable: true,
      maxStackWeight: 4000,
      adrClass: '3',
      sku: 'ADR-003',
    },
    {
      name: 'Zware Machine',
      description: 'Zware machine, niet stapelbaar',
      palletType: PalletType.CUSTOM,
      length: 2000,
      width: 1500,
      height: 1800,
      weight: 3500,
      isStackable: false,
      noClamp: true,
      sku: 'MACHINE-001',
    },
    {
      name: 'Rollen - Textiel',
      description: 'Textielrollen op pallet',
      palletType: PalletType.EURO_1200x800,
      length: 1200,
      width: 800,
      height: 2000,
      weight: 600,
      isStackable: true,
      maxStackHeight: 4000,
      sku: 'TEXTILE-001',
    },
    {
      name: 'Kratten - Groenten',
      description: 'Kratten met groenten',
      palletType: PalletType.BLOCK_1200x1000,
      length: 1200,
      width: 1000,
      height: 1700,
      weight: 900,
      isStackable: true,
      maxStackWeight: 3500,
      sku: 'VEGETABLE-001',
    },
    {
      name: 'Dozen - Consumentengoederen',
      description: 'Dozen op pallet',
      palletType: PalletType.EURO_1200x800,
      length: 1200,
      width: 800,
      height: 1300,
      weight: 550,
      isStackable: true,
      maxStackWeight: 4000,
      sku: 'CONSUMER-001',
    },
  ]

  const createdCargo = await Promise.all(
    cargoItems.map((item) =>
      prisma.cargoItem.create({
        data: {
          ...item,
          companyId: company.id,
        },
      })
    )
  )

  console.log('✅ Created cargo items')

  // Create truck
  const truck = await prisma.truck.create({
    data: {
      companyId: company.id,
      name: 'Truck 01',
      licensePlate: 'NL-TRUCK-01',
      driverName: 'Jan Jansen',
    },
  })

  console.log('✅ Created truck')

  // Create shipments with stops
  const shipment1 = await prisma.shipment.create({
    data: {
      companyId: company.id,
      reference: 'SHIP-2024-001',
      status: ShipmentStatus.PLANNED,
      truckId: truck.id,
      trailerId: bache.id,
      plannedDate: new Date('2024-02-15T08:00:00Z'),
      stops: {
        create: [
          {
            type: StopType.PICKUP,
            sequence: 1,
            address: 'Magazijnstraat 10',
            city: 'Amsterdam',
            postalCode: '1000 AA',
            country: 'NL',
            contactName: 'Piet Pietersen',
            contactPhone: '+31 20 1234567',
            timeWindowStart: new Date('2024-02-15T08:00:00Z'),
            timeWindowEnd: new Date('2024-02-15T10:00:00Z'),
          },
          {
            type: StopType.DELIVERY,
            sequence: 2,
            address: 'Distributieweg 25',
            city: 'Rotterdam',
            postalCode: '3000 AB',
            country: 'NL',
            contactName: 'Klaas Klaassen',
            contactPhone: '+31 10 7654321',
            timeWindowStart: new Date('2024-02-15T14:00:00Z'),
            timeWindowEnd: new Date('2024-02-15T16:00:00Z'),
          },
        ],
      },
    },
  })

  const shipment2 = await prisma.shipment.create({
    data: {
      companyId: company.id,
      reference: 'SHIP-2024-002',
      status: ShipmentStatus.DRAFT,
      truckId: truck.id,
      trailerId: frigo.id,
      plannedDate: new Date('2024-02-16T09:00:00Z'),
      stops: {
        create: [
          {
            type: StopType.PICKUP,
            sequence: 1,
            address: 'Koelhuislaan 5',
            city: 'Utrecht',
            postalCode: '3500 CD',
            country: 'NL',
            contactName: 'Marie Meijer',
            contactPhone: '+31 30 1112222',
            timeWindowStart: new Date('2024-02-16T09:00:00Z'),
            timeWindowEnd: new Date('2024-02-16T11:00:00Z'),
          },
          {
            type: StopType.DELIVERY,
            sequence: 2,
            address: 'Supermarktstraat 100',
            city: 'Den Haag',
            postalCode: '2500 EF',
            country: 'NL',
            contactName: 'Lisa de Vries',
            contactPhone: '+31 70 3334444',
            timeWindowStart: new Date('2024-02-16T15:00:00Z'),
            timeWindowEnd: new Date('2024-02-16T17:00:00Z'),
          },
        ],
      },
    },
  })

  console.log('✅ Created shipments')

  console.log('🎉 Seeding completed!')
  console.log('\n📝 Login credentials:')
  console.log('   Admin: admin@demo.com / admin123')
  console.log('   Planner: planner@demo.com / admin123')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

