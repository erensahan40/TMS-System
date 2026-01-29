# Visuele Vrachtwagen Inplanning & Laden Platform

Een professioneel webplatform voor transportplanners om transporten visueel te plannen en te optimaliseren met 2D en 3D visualisatie van laadruimtes.

## 🚀 Features

- **2D & 3D Visualisatie**: Bovenaanzicht (floorplan) en 3D laadruimte visualisatie
- **Drag & Drop Plaatsing**: Intuïtieve plaatsing van lading in trailers
- **Real-time Validatie**: Live berekening van volume/ruimte/gewicht met waarschuwingen
- **Multi-trailer Types**: Bâche, Frigo (met temperatuurzones), Stukgoedwagen
- **Route Planning**: Multi-stop routes met LIFO/FIFO loading sequence
- **Auto-pack**: Automatische plaatsing met heuristieken
- **Export**: PDF load sheets met QR codes en laadinstructies
- **Fleet Management**: Trailer templates en vlootbeheer

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **2D Canvas**: Konva.js
- **3D Visualization**: Three.js + react-three-fiber
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js
- **Validation**: Zod

## 📋 Vereisten

- Node.js 18+ 
- Docker & Docker Compose
- npm of yarn

## 🚀 Quick Start

### 1. Clone en installeer dependencies

```bash
npm install
```

### 2. Start PostgreSQL met Docker Compose

```bash
docker compose up -d
```

### 3. Setup database

```bash
# Genereer Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database met voorbeelddata
npx prisma db seed
```

### 4. Configureer environment variabelen

Kopieer `.env.example` naar `.env` en vul aan:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tms?schema=public"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 5. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in je browser.

## 📁 Project Structuur

```
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── dashboard/     # Main dashboard
│   │   ├── fleet/         # Fleet management
│   │   ├── shipments/     # Shipments overview
│   │   └── load-plans/    # Load plan editor
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── load-plan/        # Load plan editor components
│   └── visualization/    # 2D/3D visualization
├── lib/                  # Utilities & helpers
│   ├── packing/          # Packing algorithms
│   ├── validation/       # Validation rules
│   └── geometry/         # Geometry calculations
├── prisma/               # Prisma schema & migrations
├── types/                # TypeScript types
└── public/               # Static assets
```

## 🎯 Core Use Cases

1. **Trailer Selectie**: Kies trailer type en model, visualiseer laadruimte
2. **Cargo Import**: Importeer orderregels/pallets of voeg manueel toe
3. **Visueel Load Plan**: Drag & drop plaatsing, roteren, stapelen, groeperen
4. **Real-time Validatie**: Vrije ruimte, gewicht, zwaartepunt, waarschuwingen
5. **Versiebeheer**: Concept → Gepland → Bevestigd → Uitgevoerd
6. **Export**: PDF load sheet met QR code en laadinstructies
7. **Multi-stop Planning**: Meerdere losadressen met loading sequence
8. **Fleet Management**: Trailer templates en vlootbeheer

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

## 🐳 Docker

```bash
# Start all services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f
```

## 📝 License

Proprietary - Internal Use Only

