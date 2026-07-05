const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const proj = await prisma.project.findFirst();
  if (proj) {
    const sub = await prisma.subscription.upsert({
      where: { project_id: proj.id },
      update: { plan: 'free', analyses_limit: 50 },
      create: { project_id: proj.id, plan: 'free', analyses_limit: 50 }
    });
    console.log('Subscription created!', sub);
  }
}
run().catch(console.error).finally(() => process.exit(0));
