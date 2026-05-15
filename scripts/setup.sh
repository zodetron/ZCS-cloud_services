#!/bin/bash
set -e

echo "🚀 StorageCloud Setup"
echo "===================="

# Check dependencies
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js 20+ is required."; exit 1; }

# Setup env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env from .env.example"
  echo "⚠️  Edit .env with your secrets before production use"
fi

# Start infrastructure
echo "Starting infrastructure services..."
docker-compose up -d postgres redis minio
sleep 5

# Backend setup
echo "Setting up backend..."
cd backend
npm install
npx prisma migrate dev --name init
node prisma/seed.js
cd ..

# Frontend setup
echo "Setting up frontend..."
cd frontend
npm install
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Start development:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Dashboard: http://localhost:3000/dashboard"
echo "Admin:     http://localhost:3000/admin"
echo "API:       http://localhost:4000/api/health"
echo ""
echo "Demo credentials:"
echo "  Tenant: demo@example.com / demo123"
echo "  Admin:  admin@storagecloud.io / admin123"
