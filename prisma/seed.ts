import { PrismaClient, RoleCode, SectorCode, LossTypeCode, ProductionFormula } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const permissions = [
    "dashboard:read",
    "production:write",
    "production:approve",
    "weeks:close",
    "weeks:reopen",
    "products:manage",
    "reports:export",
    "users:manage",
    "audit:read",
    "backups:manage",
    "imports:run"
  ];

  for (const code of permissions) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, description: code.replace(":", " ") },
      update: {}
    });
  }

  const roleMatrix: Record<RoleCode, string[]> = {
    ADMIN: permissions,
    MANAGER: ["dashboard:read", "weeks:close", "reports:export", "audit:read"],
    SUPERVISOR: ["dashboard:read", "production:write", "production:approve", "weeks:close"],
    OPERATOR: ["production:write"],
    VIEWER: ["dashboard:read"]
  };

  for (const code of Object.values(RoleCode)) {
    const role = await prisma.role.upsert({
      where: { code },
      create: { code, name: code },
      update: {}
    });

    for (const permissionCode of roleMatrix[code]) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code: permissionCode } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {}
      });
    }
  }

  const p1 = await prisma.sector.upsert({
    where: { code: SectorCode.P1 },
    create: { code: SectorCode.P1, name: "P1 - Pao de Queijo" },
    update: {}
  });

  const p2 = await prisma.sector.upsert({
    where: { code: SectorCode.P2 },
    create: { code: SectorCode.P2, name: "P2 - Bolos e Churros" },
    update: {}
  });

  for (const line of [
    { sectorId: p1.id, code: "P1-L1", name: "Linha P1 principal" },
    { sectorId: p2.id, code: "P2-L1", name: "Linha P2 principal" }
  ]) {
    await prisma.productionLine.upsert({
      where: { sectorId_code: { sectorId: line.sectorId, code: line.code } },
      create: line,
      update: {}
    });
  }

  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("INITIAL_ADMIN_PASSWORD must be set before running prisma:seed.");
  }
  const admin = await prisma.user.upsert({
    where: { email: process.env.INITIAL_ADMIN_EMAIL ?? "admin@nexus.local" },
    create: {
      email: process.env.INITIAL_ADMIN_EMAIL ?? "admin@nexus.local",
      name: "Administrador Nexus",
      passwordHash: await bcrypt.hash(adminPassword, 12)
    },
    update: {}
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.ADMIN } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    create: { userId: admin.id, roleId: adminRole.id },
    update: {}
  });

  for (const lossType of [
    { code: LossTypeCode.PACKAGING, name: "Embalagem", defaultGoalKg: 20 },
    { code: LossTypeCode.BOX, name: "Caixa", defaultGoalKg: 10 },
    { code: LossTypeCode.ORGANIC, name: "Organico", defaultGoalKg: 50 },
    { code: LossTypeCode.MACHINE, name: "Maquina", defaultGoalKg: 10 },
    { code: LossTypeCode.WEIGHING, name: "Pesagem", defaultGoalKg: 50 },
    { code: LossTypeCode.OVERWEIGHT, name: "Sobrepeso", defaultGoalKg: null },
    { code: LossTypeCode.OTHER, name: "Outros", defaultGoalKg: 10 }
  ]) {
    await prisma.lossType.upsert({
      where: { code: lossType.code },
      create: lossType,
      update: lossType
    });
  }

  for (const name of [
    "Aguardando massa",
    "Aguardando embalagem",
    "Aguardando silo",
    "Troca de arame",
    "Falta de materia-prima",
    "Aguardando manutencao",
    "Setup/troca de produto",
    "Limpeza",
    "Aguardando temperatura",
    "Aguardando congelar",
    "Outros"
  ]) {
    await prisma.downtimeReason.upsert({
      where: { name },
      create: { name },
      update: {}
    });
  }

  for (const goal of [
    { name: "Sobrepeso maximo", metric: "overweight_percent", targetValue: 0.02, comparator: "<=" },
    { name: "Perdas maximas", metric: "losses_kg", targetValue: 50, comparator: "<=" },
    { name: "Rendimento minimo", metric: "yield_percent", targetValue: 0.95, comparator: ">=" },
    { name: "Producao semanal minima", metric: "production_kg", targetValue: 20000, comparator: ">=" }
  ]) {
    const existing = await prisma.goal.findFirst({ where: { metric: goal.metric, sectorCode: null } });
    if (existing) {
      await prisma.goal.update({ where: { id: existing.id }, data: goal });
    } else {
      await prisma.goal.create({ data: goal });
    }
  }

  const demoProduct = await prisma.product.upsert({
    where: { code: "72169" },
    create: {
      code: "72169",
      name: "PAO DE QUEIJO REI DO MATE 13g x 1kg",
      defaultSectorId: p1.id,
      unit: "kg"
    },
    update: {}
  });

  await prisma.productWeightConfig.upsert({
    where: { productId: demoProduct.id },
    create: {
      productId: demoProduct.id,
      packageWeightKg: 1,
      boxWeightKg: 12,
      packagesPerBox: 12,
      massWeightKg: 511,
      targetPackageWeightG: 1000,
      overweightTolerancePercent: 0.02,
      formula: ProductionFormula.BOX_WEIGHT
    },
    update: {}
  });

  await prisma.systemSetting.upsert({
    where: { key: "company" },
    create: { key: "company", value: { name: process.env.COMPANY_NAME ?? "Empresa" } },
    update: { value: { name: process.env.COMPANY_NAME ?? "Empresa" } }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
