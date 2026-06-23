import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pages = await prisma.facebookPage.findMany();
  console.log("=== Connected Pages ===");
  console.dir(pages, { depth: null });

  const schedules = await prisma.schedule.findMany({
    include: {
      facebookPage: true,
      postDraft: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log("\n=== Latest Schedules ===");
  console.dir(schedules, { depth: null });

  const logs = await prisma.workflowLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log("\n=== Latest Workflow Logs ===");
  console.dir(logs, { depth: null });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
