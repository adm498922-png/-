import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSalesSheet, type ImportRow } from "@/lib/sales-import";
import { getDecryptedSettings, updateSettings } from "@/lib/settings";
import { keyOf } from "@/lib/match-or-create";

/**
 * 판매일보 붙여넣기 → 공구 기록 만들기.
 *
 * mode "preview" 는 무엇이 새로 생기고 무엇이 건너뛰어지는지만 알려주고 저장은 안 한다.
 * mode "commit" 이어야 실제로 저장한다.
 */

type Matched = {
  row: ImportRow;
  creatorId: string | null;
  productId: string | null;
  duplicate: boolean;
};

async function matchAll(rows: ImportRow[]): Promise<{
  matched: Matched[];
  newCreators: string[];
  newProducts: string[];
}> {
  const creators = await prisma.creator.findMany({
    select: { id: true, name: true, handle: true },
  });
  const products = await prisma.product.findMany({ select: { id: true, name: true } });

  const byHandle = new Map(
    creators.filter((c) => c.handle).map((c) => [keyOf(c.handle as string), c.id])
  );
  const byName = new Map(creators.map((c) => [keyOf(c.name), c.id]));
  const productByName = new Map(products.map((p) => [keyOf(p.name), p.id]));

  const existingDeals = await prisma.deal.findMany({
    select: { creatorId: true, startDate: true, productId: true, productName: true },
  });
  const dealKey = (creatorId: string, start: string | null, product: string | null) =>
    `${creatorId}|${start ?? ""}|${keyOf(product ?? "")}`;
  const existing = new Set(
    existingDeals.map((d) =>
      dealKey(
        d.creatorId,
        d.startDate ? d.startDate.toISOString().slice(0, 10) : null,
        d.productName
      )
    )
  );

  const newCreators: string[] = [];
  const newProducts: string[] = [];
  const matched: Matched[] = [];

  for (const row of rows) {
    const creatorId =
      (row.handle ? byHandle.get(keyOf(row.handle)) : undefined) ??
      byName.get(keyOf(row.creatorName)) ??
      null;

    if (!creatorId && !newCreators.includes(row.creatorName)) {
      newCreators.push(row.creatorName);
    }

    const productId = row.productName
      ? productByName.get(keyOf(row.productName)) ?? null
      : null;
    if (row.productName && !productId && !newProducts.includes(row.productName)) {
      newProducts.push(row.productName);
    }

    const duplicate = creatorId
      ? existing.has(dealKey(creatorId, row.startDate, row.productName))
      : false;

    matched.push({ row, creatorId, productId, duplicate });
  }

  return { matched, newCreators, newProducts };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text : "";
  const mode = body.mode === "commit" ? "commit" : "preview";

  if (!text.trim()) {
    return NextResponse.json(
      { error: "붙여넣은 내용이 비어 있습니다." },
      { status: 400 }
    );
  }

  const settings = await getDecryptedSettings();
  let savedHeader: string[] | null = null;
  try {
    savedHeader = settings.salesSheetHeader
      ? (JSON.parse(settings.salesSheetHeader) as string[])
      : null;
  } catch {
    savedHeader = null;
  }

  let parsed;
  try {
    parsed = parseSalesSheet(text, new Date(), savedHeader);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  if (parsed.rows.length === 0) {
    return NextResponse.json(
      {
        error:
          "가져올 줄을 찾지 못했습니다. 제목 줄과 내용 줄을 함께 복사했는지 확인해주세요.",
      },
      { status: 400 }
    );
  }

  const { matched, newCreators, newProducts } = await matchAll(parsed.rows);
  const willCreate = matched.filter((m) => !m.duplicate);
  const duplicates = matched.filter((m) => m.duplicate);

  if (mode === "preview") {
    return NextResponse.json({
      ok: true,
      total: parsed.rows.length,
      willCreate: willCreate.length,
      duplicates: duplicates.length,
      skipped: parsed.skipped,
      unmatchedHeaders: parsed.unmatchedHeaders,
      usedSavedHeader: parsed.usedSavedHeader,
      newCreators,
      newProducts,
      sample: willCreate.slice(0, 8).map((m) => ({
        creatorName: m.row.creatorName,
        productName: m.row.productName,
        startDate: m.row.startDate,
        revenue: m.row.revenue,
        settlement: m.row.settlement,
        status: m.row.status,
      })),
    });
  }

  // 다음번에 제목 없이 내용만 붙여넣어도 되도록 이번 제목 줄을 기억해 둔다
  if (!parsed.usedSavedHeader) {
    await updateSettings({ salesSheetHeader: JSON.stringify(parsed.headers) });
  }

  // ── 여기서부터 실제 저장 ──
  const creatorIdByKey = new Map<string, string>();
  const productIdByKey = new Map<string, string>();
  let createdCreators = 0;
  let createdProducts = 0;
  let createdDeals = 0;

  for (const m of matched) {
    if (m.duplicate) continue;
    const row = m.row;

    // 크리에이터
    const cKey = keyOf(row.handle || row.creatorName);
    let creatorId = m.creatorId ?? creatorIdByKey.get(cKey) ?? null;
    if (!creatorId) {
      const created = await prisma.creator.create({
        data: {
          name: row.creatorName,
          handle: row.handle,
          platform: "INSTAGRAM",
          // 진행 상태는 가져온 공구 상태를 따라간다
          status:
            row.status === "ONGOING"
              ? "ONGOING"
              : row.status === "PLANNED"
                ? "CONFIRMED"
                : "DONE",
          commissionRate: row.commissionRate,
          isBusiness: row.isBusiness,
          memo: "판매일보에서 가져옴",
        },
      });
      creatorId = created.id;
      createdCreators++;
    }
    creatorIdByKey.set(cKey, creatorId);

    // 상품
    let productId = m.productId;
    if (!productId && row.productName) {
      const pKey = keyOf(row.productName);
      productId = productIdByKey.get(pKey) ?? null;
      if (!productId) {
        const created = await prisma.product.create({
          data: {
            name: row.productName,
            brand: row.brand,
            commissionRate: row.commissionRate,
          },
        });
        productId = created.id;
        createdProducts++;
      }
      productIdByKey.set(pKey, productId);
    }

    await prisma.deal.create({
      data: {
        creatorId,
        productId,
        productName: row.productName,
        status: row.status as never,
        startDate: row.startDate ? new Date(row.startDate) : null,
        endDate: row.endDate ? new Date(row.endDate) : null,
        revenue: row.revenue,
        commissionRate: row.commissionRate,
        salesCommission: row.salesCommission,
        contentFee: row.contentFee,
        settlement: row.settlement,
        agencyRate: row.agencyRate,
        agencyFee: row.agencyFee,
        settleDueDate: row.settleDueDate ? new Date(row.settleDueDate) : null,
        settledAt: row.settledAt ? new Date(row.settledAt) : null,
        linkSent: row.linkSent,
        taxReported: row.taxReported,
        statementIssued: row.statementIssued,
      },
    });
    createdDeals++;
  }

  return NextResponse.json({
    ok: true,
    createdDeals,
    createdCreators,
    createdProducts,
    duplicates: duplicates.length,
    skipped: parsed.skipped,
  });
}
