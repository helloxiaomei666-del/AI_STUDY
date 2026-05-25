import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { defaultPromptTemplates } from "../src/lib/ai/prompts";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hash("123456", 10);

  const basePackage = await prisma.package.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "基础版",
      monthlyPrice: 399,
      studentLimit: 50,
      wrongQuestionQuota: 200,
      studyPlanQuota: 100,
      dailyReportQuota: 300,
      staffLimit: 5,
    },
  });

  await prisma.package.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "专业版",
      monthlyPrice: 899,
      studentLimit: 200,
      wrongQuestionQuota: 800,
      studyPlanQuota: 500,
      dailyReportQuota: 1500,
      staffLimit: 20,
    },
  });

  const admin = await prisma.user.upsert({
    where: { phone: "18800000000" },
    update: {},
    create: {
      name: "平台管理员",
      phone: "18800000000",
      email: "admin@zhixi.local",
      passwordHash,
      role: "platform_admin",
    },
  });

  const owner = await prisma.user.upsert({
    where: { phone: "18800000001" },
    update: {},
    create: {
      name: "演示门店老板",
      phone: "18800000001",
      email: "owner@zhixi.local",
      passwordHash,
      role: "store_owner",
    },
  });

  const expire = new Date();
  expire.setMonth(expire.getMonth() + 1);
  const store = await prisma.store.upsert({
    where: { id: "10000000-0000-0000-0000-000000000001" },
    update: { ownerUserId: owner.id },
    create: {
      id: "10000000-0000-0000-0000-000000000001",
      name: "智习演示自习室",
      ownerUserId: owner.id,
      packageType: basePackage.name,
      packageExpireAt: expire,
    },
  });

  await prisma.user.update({
    where: { id: owner.id },
    data: { storeId: store.id },
  });

  const staff = await prisma.user.upsert({
    where: { phone: "18800000002" },
    update: { storeId: store.id },
    create: {
      storeId: store.id,
      name: "演示督学",
      phone: "18800000002",
      email: "staff@zhixi.local",
      passwordHash,
      role: "staff",
    },
  });

  await prisma.student.upsert({
    where: { id: "20000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "20000000-0000-0000-0000-000000000001",
      storeId: store.id,
      assignedUserId: staff.id,
      name: "小明",
      grade: "初二",
      mainSubjects: "数学、物理、化学、英语",
      goal: "提升错题复盘质量，重点巩固数学函数、物理受力分析和学术英语阅读证据定位",
      weakSubjects: "数学、物理、英语",
      weakPoints: "一次函数、几何证明、受力分析、学术英语句法与阅读论证",
      parentName: "小明妈妈",
      parentContact: "微信备注：小明妈妈",
      remark: "做题速度较慢，容易粗心。",
    },
  });

  const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  await prisma.storeQuota.upsert({
    where: { storeId_month: { storeId: store.id, month } },
    update: {},
    create: {
      storeId: store.id,
      packageId: basePackage.id,
      month,
      wrongQuestionQuota: basePackage.wrongQuestionQuota,
      studyPlanQuota: basePackage.studyPlanQuota,
      dailyReportQuota: basePackage.dailyReportQuota,
    },
  });

  for (const [featureType, template] of Object.entries(defaultPromptTemplates)) {
    await prisma.promptTemplate.upsert({
      where: { id: `30000000-0000-0000-0000-00000000000${featureType === "wrong_question" ? 1 : featureType === "study_plan" ? 2 : 3}` },
      update: {},
      create: {
        id: `30000000-0000-0000-0000-00000000000${featureType === "wrong_question" ? 1 : featureType === "study_plan" ? 2 : 3}`,
        featureType: featureType as keyof typeof defaultPromptTemplates,
        name: template.name,
        systemPrompt: template.systemPrompt,
        userPromptTemplate: template.userPromptTemplate,
        modelName: template.modelName,
        temperature: template.temperature,
        version: 1,
      },
    });
  }

  console.log("Seed complete");
  console.log("平台管理员：18800000000 / 123456");
  console.log("门店老板：18800000001 / 123456");
  console.log("督学员工：18800000002 / 123456");
  console.log(`管理员账号ID：${admin.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
