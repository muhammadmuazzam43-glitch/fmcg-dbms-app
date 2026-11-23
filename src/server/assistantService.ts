import { queryRelationalAssistant } from '../utils/assistantEngine.ts';
import {
  INITIAL_PRODUCTS,
  INITIAL_BATCHES,
  INITIAL_SUPPLIERS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_TRANSACTIONS,
} from '../data/mockData.ts';

export const CANDIDATE_MODELS = [
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];

export function getHealthPayload(apiKey?: string) {
  return {
    status: 'ok',
    hasApiKey: Boolean(apiKey && apiKey.length > 5),
    keyPrefix: apiKey ? apiKey.substring(0, 7) + '...' : 'none',
    databaseSkus: INITIAL_PRODUCTS.length,
    candidateModels: CANDIDATE_MODELS,
    timestamp: new Date().toISOString(),
  };
}

export function getInventorySummaryPayload() {
  const totalCostVal = INITIAL_PRODUCTS.reduce((s, p) => s + p.quantityOnHand * p.unitCost, 0);
  const lowStockCount = INITIAL_PRODUCTS.filter((p) => p.quantityOnHand <= p.reorderPoint).length;
  const stockoutCount = INITIAL_PRODUCTS.filter((p) => p.quantityOnHand === 0).length;
  const nearExpiryCount = INITIAL_BATCHES.filter((b) => b.daysUntilExpiry <= 30 && b.daysUntilExpiry > 0).length;
  const delayedPOCount = INITIAL_PURCHASE_ORDERS.filter((po) => po.isDelayed).length;

  return {
    totalSkus: INITIAL_PRODUCTS.length,
    totalInventoryValueUSD: Number(totalCostVal.toFixed(2)),
    lowStockCount,
    stockoutCount,
    nearExpiryCount,
    delayedPOCount,
    suppliersCount: INITIAL_SUPPLIERS.length,
    timestamp: new Date().toISOString(),
  };
}

export async function processAssistantChat(
  rawBody: any,
  apiKey?: string
): Promise<{ status: number; body: Record<string, any> }> {
  const { message, history, context, userRole } = rawBody || {};

  if (!message || typeof message !== 'string') {
    return {
      status: 400,
      body: { error: 'Message is required and must be a string' },
    };
  }

  const role = userRole || 'Store POS Operator';

  const products =
    Array.isArray(context?.products) && context.products.length > 0
      ? context.products
      : INITIAL_PRODUCTS;
  const batches =
    Array.isArray(context?.batches) && context.batches.length > 0
      ? context.batches
      : INITIAL_BATCHES;
  const suppliers =
    Array.isArray(context?.suppliers) && context.suppliers.length > 0
      ? context.suppliers
      : INITIAL_SUPPLIERS;
  const purchaseOrders =
    Array.isArray(context?.purchaseOrders) && context.purchaseOrders.length > 0
      ? context.purchaseOrders
      : INITIAL_PURCHASE_ORDERS;
  const transactions =
    Array.isArray(context?.transactions) && context.transactions.length > 0
      ? context.transactions
      : INITIAL_TRANSACTIONS;

  const systemInstruction = `You are "FMCG Inventory AI Assistant", the authoritative enterprise AI embedded in the FMCG Inventory Intelligence & Supply Chain Management System.
Current authenticated user role: "${role}".

CRITICAL TRUTH & DISAMBIGUATION RULES:
1. Clearly differentiate between:
   - [DATABASE FACT]: verified records from the current catalog, transactions, batches, or purchase orders.
   - [CALCULATED INSIGHT]: math derived from formulas (e.g. ROP: Q_rec = (Safety + Velocity * LeadTime) - (OnHand + Incoming), Traceable Equation: Closing = Opening + Receipts + TransfersIn - Sales - TransfersOut - Damage ± Adj).
   - [UNAVAILABLE / UNVERIFIED]: If requested data is not present in the active database, state explicitly: "Information not present in database records".
2. Never invent imaginary SKU names, barcodes, or numbers. Only quote the provided inventory database context.
3. Support queries in English, Urdu, and Roman Urdu (e.g. "konsa saman kam hai", "expiry items", "backend connect", "teacher ko viva mein explain kaise karein").
4. Structure answers neatly with short bullet points, bold highlights, and markdown tables when comparing data.

ACTIVE DATABASE REPOSITORIES:
- Products catalog: ${JSON.stringify(products.map((p: any) => ({ sku: p.sku, name: p.name, category: p.category, barcode: p.barcode, qty: p.quantityOnHand, rop: p.reorderPoint, safety: p.safetyStock, cost: p.unitCost, sell: p.sellingPrice, bin: p.binCode, status: p.status })))}
- FEFO Batches: ${JSON.stringify(batches.map((b: any) => ({ batchNo: b.batchNumber, productId: b.productId, qty: b.quantity, expiry: b.expiryDate, daysLeft: b.daysUntilExpiry, status: b.status })))}
- Suppliers: ${JSON.stringify(suppliers.map((s: any) => ({ id: s.id, name: s.name, leadTime: s.leadTimeDays, otdr: s.onTimeDeliveryRate, score: s.qualityScore, status: s.status })))}
- Purchase Orders: ${JSON.stringify(purchaseOrders.map((po: any) => ({ id: po.id, supplier: po.supplierName, status: po.status, amount: po.totalAmount, isDelayed: po.isDelayed, expectedDelivery: po.expectedDeliveryDate })))}
`;

  const conversationContents: any[] = [];
  if (Array.isArray(history)) {
    for (const item of history.slice(-6)) {
      if (item.sender === 'user') {
        conversationContents.push({ role: 'user', parts: [{ text: item.text }] });
      } else if (item.sender === 'bot') {
        conversationContents.push({ role: 'model', parts: [{ text: item.text }] });
      }
    }
  }
  conversationContents.push({ role: 'user', parts: [{ text: message }] });

  // Attempt Gemini models within a strict 8-second total budget (safe for Vercel Serverless 10s Hobby timeout)
  if (apiKey && apiKey.length > 5) {
    const startMs = Date.now();
    for (const model of CANDIDATE_MODELS) {
      const elapsed = Date.now() - startMs;
      const remainingBudget = 8000 - elapsed;
      if (remainingBudget <= 1200) break;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          Math.min(5000, remainingBudget)
        );

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'aistudio-build',
            },
            signal: controller.signal,
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemInstruction }],
              },
              contents: conversationContents,
            }),
          }
        );
        clearTimeout(timeoutId);

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const replyText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            return {
              status: 200,
              body: {
                reply: replyText,
                userRole: role,
                source: 'GEMINI_AI',
                model,
                timestamp: new Date().toISOString(),
              },
            };
          }
        } else {
          console.warn(`[Assistant] Model ${model} returned ${geminiRes.status}. Trying next fallback.`);
        }
      } catch (modelErr: any) {
        console.warn(`[Assistant] Model ${model} call error:`, modelErr.message);
      }
    }
  }

  // Deterministic Relational Engine fallback (always fast & accurate)
  const fallbackResult = queryRelationalAssistant(message, {
    products,
    batches,
    suppliers,
    purchaseOrders,
    transactions,
    userRole: role,
  });

  return {
    status: 200,
    body: {
      reply: fallbackResult.reply,
      userRole: role,
      source: 'RELATIONAL_ENGINE',
      dataCount: fallbackResult.dataCount,
      timestamp: new Date().toISOString(),
    },
  };
}
