const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const proj = await prisma.project.findFirst({ include: { subscription: true } });
  console.log("PROJECT:", proj);
}
run().catch(console.error).finally(() => process.exit(0));
