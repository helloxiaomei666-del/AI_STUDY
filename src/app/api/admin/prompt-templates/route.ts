import { z } from "zod";
import { defaultPromptTemplates } from "@/lib/ai/prompts";
import { ApiError, jsonOk, readJson, requireApiUser, requirePlatformAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { dbIdSchema, promptTemplateBaseSchema, promptTemplateSchema } from "@/lib/validation";

const patchSchema = promptTemplateBaseSchema.partial().extend({
  id: dbIdSchema,
  restoreDefault: z.coerce.boolean().optional(),
});

export async function GET(request: Request) {
  return requireApiUser(request, async (user) => {
    requirePlatformAdmin(user);
    const templates = await prisma.promptTemplate.findMany({
      orderBy: [{ featureType: "asc" }, { version: "desc" }],
    });
    return jsonOk(templates);
  });
}

export async function POST(request: Request) {
  return requireApiUser(request, async (user) => {
    requirePlatformAdmin(user);
    const input = promptTemplateSchema.parse(await readJson(request));
    const template = await createPromptVersion(input);
    return jsonOk(template, { status: 201 });
  });
}

export async function PATCH(request: Request) {
  return requireApiUser(request, async (user) => {
    requirePlatformAdmin(user);
    const input = patchSchema.parse(await readJson(request));
    const current = await prisma.promptTemplate.findUnique({ where: { id: input.id } });
    if (!current) throw new ApiError("模板不存在", 404);

    const fallback = defaultPromptTemplates[current.featureType];
    const next = input.restoreDefault
      ? {
          featureType: current.featureType,
          name: fallback.name,
          systemPrompt: fallback.systemPrompt,
          userPromptTemplate: fallback.userPromptTemplate,
          modelName: fallback.modelName,
          temperature: fallback.temperature,
          status: "active" as const,
        }
      : {
          ...promptTemplateSchema.parse(input),
        };

    const template = await createPromptVersion(next, {
      replaceActive: current.status === "active" || next.status === "active",
    });

    return jsonOk(template);
  });
}

async function createPromptVersion(input: z.infer<typeof promptTemplateSchema>, options?: { replaceActive?: boolean }) {
  return prisma.$transaction(async (tx) => {
    const replaceActive = options?.replaceActive ?? input.status === "active";
    if (replaceActive) {
      await tx.promptTemplate.updateMany({
        where: { featureType: input.featureType, status: "active" },
        data: { status: "inactive" },
      });
    }
    const max = await tx.promptTemplate.aggregate({
      where: { featureType: input.featureType },
      _max: { version: true },
    });
    return tx.promptTemplate.create({
      data: {
        ...input,
        version: (max._max.version ?? 0) + 1,
      },
    });
  });
}
