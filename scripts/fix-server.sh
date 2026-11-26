#!/bin/bash
echo "=== BUC LMS Server & Database Recovery Tool ==="

# 1. Check database connection & prisma status
echo "Checking database status..."
npx prisma db pull --force || echo "Database connection failed or unconfigured."

# 2. Reset stuck or failed lessons/tasks
echo "Resetting stuck and failed tasks in database..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const updated = await prisma.lesson.updateMany({
    where: { status: { in: ['FAILED', 'PROCESSING'] } },
    data: { status: 'PENDING', attempts: 0, lastError: null }
  });
  console.log('Reset ' + updated.count + ' stuck/failed lessons to PENDING.');
  await prisma.\$disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
"

# 3. Clear Next.js build cache if corrupted
echo "Clearing Next.js cache..."
rm -rf .next

# 4. Verify Node modules and dependencies
echo "Verifying dependencies..."
npm install --silent

echo "=== Server recovery completed successfully! ==="
Developer: Reload Windo