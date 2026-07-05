const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.subscription.updateMany({
    data: { plan: 'team' }
  });
  console.log('Successfully upgraded all subscriptions to TEAM plan for testing!');
}
run().catch(console.error).finally(() => process.exit(0));
