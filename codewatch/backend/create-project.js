const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function run() {
  const api_key = crypto.randomBytes(32).toString('hex');
  const project = await prisma.project.create({
    data: { name: 'Carbon Wallet (Dogfood)', github_repo_url: 'https://github.com/test/carbon', api_key }
  });
  await prisma.subscription.create({ data: { project_id: project.id, plan: 'free', analyses_limit: 50 } });
  console.log('API_KEY=' + api_key);
}
run().catch(console.error).finally(() => process.exit(0));
