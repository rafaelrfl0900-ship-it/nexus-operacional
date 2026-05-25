import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { productionEntrySchema, productionPreviewSchema } from "../../domain/validators/schemas";
import { calculateProductionEntry } from "../../domain/calculations/production-calculations";
import { ProductWeightConfig } from "../../domain/calculations/types";
import { classifyRule } from "../../domain/alerts/alert-engine";
import { AuditService } from "../audit/audit.service";

const severity = { OK: 0, MEDIUM: 1, ATTENTION: 2, CRITICAL: 3 } as const;

function worstStatus(...statuses: Array<keyof typeof severity>) {
  return statuses.sort((a, b) => severity[b] - severity[a])[0] ?? "OK";
}

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  preview(payload: unknown) {
    const input = productionPreviewSchema.parse(payload);
    const calculations = calculateProductionEntry(input);
    const yieldStatus = classifyRule({ metric: "yield", value: calculations.realYieldPercent, target: 0.95 });
    const overweightStatus = classifyRule({
      metric: "overweight",
      value: calculations.overweightPercent,
      target: input.weightConfig.overweightTolerancePercent
    });

    return {
      ...calculations,
      status: worstStatus(yieldStatus, overweightStatus)
    };
  }

  async list(query: { weekId?: string; sector?: "P1" | "P2"; productId?: string; op?: string }) {
    return this.prisma.productionEntry.findMany({
      where: {
        deletedAt: null,
        weekId: query.weekId,
        sector: query.sector ? { code: query.sector } : undefined,
        productId: query.productId,
        productionOrder: query.op
      },
      include: { week: true, product: true, sector: true, line: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }]
    });
  }

  async create(payload: unknown) {
    const input = productionEntrySchema.parse(payload);
    const week = await this.prisma.weeklyPeriod.findUnique({ where: { id: input.weekId } });
    if (!week) throw new NotFoundException("Semana nao encontrada.");
    if (week.status !== "OPEN" && week.status !== "REVIEW") {
      throw new BadRequestException("Semana fechada ou arquivada nao aceita novos lancamentos.");
    }

    const product = await this.prisma.product.findUnique({
      where: { id: input.productId },
      include: { weightConfig: true }
    });
    if (!product || product.deletedAt) throw new NotFoundException("Produto nao encontrado.");
    if (!product.active) throw new BadRequestException("Produto inativo nao pode ser usado em novo lancamento.");
    if (!product.weightConfig) throw new BadRequestException("Produto sem configuracao de peso.");

    const sector = await this.prisma.sector.findUniqueOrThrow({ where: { code: input.sector } });
    const weightConfig: ProductWeightConfig = {
      formula: product.weightConfig.formula,
      packageWeightKg: Number(product.weightConfig.packageWeightKg),
      boxWeightKg: Number(product.weightConfig.boxWeightKg),
      packagesPerBox: product.weightConfig.packagesPerBox,
      massWeightKg: Number(product.weightConfig.massWeightKg),
      targetPackageWeightG: Number(product.weightConfig.targetPackageWeightG),
      overweightTolerancePercent: Number(product.weightConfig.overweightTolerancePercent)
    };
    const calculated = calculateProductionEntry({
      sector: input.sector,
      plannedBatches: input.plannedBatches,
      realizedBatches: input.realizedBatches,
      usedReworkKg: input.usedReworkKg,
      packedBoxes: input.packedBoxes,
      weighingLossKg: input.weighingLossKg,
      generatedReworkKg: input.generatedReworkKg,
      averagePackageWeightG: input.averagePackageWeightG,
      weightConfig
    });

    const yieldStatus = classifyRule({ metric: "yield", value: calculated.realYieldPercent, target: 0.95 });
    const overweightStatus = classifyRule({
      metric: "overweight",
      value: calculated.overweightPercent,
      target: weightConfig.overweightTolerancePercent
    });

    const order = await this.prisma.productionOrder.upsert({
      where: {
        weekId_orderNumber_productId: {
          weekId: input.weekId,
          orderNumber: input.productionOrder,
          productId: product.id
        }
      },
      create: {
        weekId: input.weekId,
        productId: product.id,
        sectorCode: input.sector,
        orderNumber: input.productionOrder
      },
      update: { status: "OPEN" }
    });

    const entry = await this.prisma.productionEntry.create({
      data: {
        weekId: input.weekId,
        sectorId: sector.id,
        productId: product.id,
        productionOrderId: order.id,
        date: input.date,
        productionOrder: input.productionOrder,
        plannedBatches: input.plannedBatches,
        realizedBatches: input.realizedBatches,
        usedReworkKg: input.usedReworkKg,
        packedBoxes: input.packedBoxes,
        producedKg: calculated.producedKg,
        weighingLossKg: input.weighingLossKg,
        generatedReworkKg: input.generatedReworkKg,
        expectedYieldKg: calculated.expectedYieldKg,
        realYieldPercent: calculated.realYieldPercent,
        massWeightKg: weightConfig.massWeightKg,
        boxWeightKg: weightConfig.boxWeightKg,
        targetPackageWeightG: weightConfig.targetPackageWeightG,
        averagePackageWeightG: input.averagePackageWeightG,
        overweightGPerPackage: calculated.overweightGPerPackage,
        overweightTotalKg: calculated.overweightTotalKg,
        overweightPercent: calculated.overweightPercent,
        status: worstStatus(yieldStatus, overweightStatus),
        notes: [input.notes, ...calculated.inconsistencies].filter(Boolean).join("\n")
      },
      include: { week: true, sector: true, product: true }
    });

    await this.audit.record({ module: "production", action: "create", entity: "ProductionEntry", entityId: entry.id, after: entry });
    return { ...entry, calculations: calculated };
  }

  async duplicate(id: string) {
    const current = await this.prisma.productionEntry.findUnique({ where: { id } });
    if (!current || current.deletedAt) throw new NotFoundException("Lancamento nao encontrado.");
    const duplicated = await this.prisma.productionEntry.create({
      data: {
        ...current,
        id: undefined,
        productionOrder: `${current.productionOrder}-COPIA`,
        createdAt: undefined,
        updatedAt: undefined,
        deletedAt: null
      }
    });
    await this.audit.record({ module: "production", action: "duplicate", entity: "ProductionEntry", entityId: duplicated.id, before: current, after: duplicated });
    return duplicated;
  }

  async softDelete(id: string) {
    const entry = await this.prisma.productionEntry.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ module: "production", action: "delete", entity: "ProductionEntry", entityId: id, after: entry });
    return entry;
  }
}
