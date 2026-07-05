const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.subscription.updateMany({
    data: { plan: 'free' }
  });
  console.log('Downgraded to free plan so the Upgrade button appears');
}
run().catch(console.error).finally(() => process.exit(0));
