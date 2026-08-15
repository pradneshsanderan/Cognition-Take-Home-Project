import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Deterministic PRNG so reruns produce the same data and stay idempotent.
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const random = makeRandom(20240601);

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(random() * values.length)];
}

function intBetween(min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

const FIRST_NAMES = [
  "Alice", "Bob", "Carol", "Dave", "Priya", "Omar", "Chen", "Maria", "Liam",
  "Nina", "Tomas", "Sofia", "Ade", "Yuki", "Hannah", "Grace", "Ravi", "Elena",
  "Jonas", "Fatima",
];

const LAST_NAMES = [
  "Smith", "Okafor", "Nguyen", "Garcia", "Patel", "Haddad", "Wei", "Rossi",
  "Murphy", "Kowalski", "Silva", "Bakker", "Ferreira", "Tanaka", "Novak",
  "Jensen", "Sharma", "Petrov", "Larsen", "Ahmed",
];

const REFUND_REASONS = [
  "Duplicate charge",
  "Item never arrived",
  "Damaged on arrival",
  "Cancelled subscription",
  "Wrong item shipped",
  "Price charged incorrectly",
  "Customer changed their mind",
  "Service outage credit",
];

const REFUND_STATUSES = ["approved", "rejected"] as const;
const COUNTRIES = ["GB", "IE", "DE", "FR", "NG", "IN", "US", "SG"] as const;
const RISK_LEVELS = ["low", "medium", "high"] as const;
const DOCUMENT_TYPES = ["passport", "driving_licence", "national_id", "residence_permit"] as const;
// Every value here is declared by apps/kyc.ts, and the 6/3/1 weighting below
// keeps all three represented in the data.
const KYC_STATUSES = [
  "pending", "pending", "pending", "pending", "pending", "pending",
  "cleared", "cleared", "cleared",
  "escalated",
] as const;
const ENVIRONMENTS = ["dev", "staging", "prod"] as const;

function personName(index: number): string {
  return `${FIRST_NAMES[index % FIRST_NAMES.length]} ${
    LAST_NAMES[(index * 7) % LAST_NAMES.length]
  }`;
}

function emailFor(name: string, index: number): string {
  return `${name.toLowerCase().replace(/[^a-z]+/g, ".")}.${index}@example.com`;
}

function daysAgo(days: number, index: number): Date {
  const base = Date.UTC(2026, 0, 1, 9, 0, 0);
  return new Date(base - days * 86_400_000 + ((index * 37) % 1440) * 60_000);
}

async function seedUsers() {
  const users = [
    { email: "alice@example.com", name: "Alice Smith", roles: ["finance", "support"] },
    { email: "bob@example.com", name: "Bob Okafor", roles: ["support"] },
    { email: "carol@example.com", name: "Carol Nguyen", roles: ["engineering"] },
    { email: "dave@example.com", name: "Dave Garcia", roles: ["compliance"] },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: user,
      update: { name: user.name, roles: user.roles },
    });
  }
  return users.length;
}

async function seedRefunds(target: number) {
  const existing = await prisma.refund.count();
  if (existing >= target) return { created: 0, existing };

  const rows = [];
  for (let index = existing; index < target; index += 1) {
    const name = personName(index);
    rows.push({
      customerName: name,
      customerEmail: emailFor(name, index),
      amountPence: intBetween(500, 200_000),
      reason: pick(REFUND_REASONS),
      // ~60% pending.
      status: random() < 0.6 ? "pending" : pick(REFUND_STATUSES),
      createdAt: daysAgo(intBetween(0, 120), index),
    });
  }
  await prisma.refund.createMany({ data: rows });
  return { created: rows.length, existing };
}

function kycStatus(index: number): string {
  return KYC_STATUSES[index % KYC_STATUSES.length];
}

// Assigns each case the status its queue position implies, so a rerun on a
// database seeded before the queue statuses existed converges on the same
// distribution instead of leaving stale values behind.
async function reconcileKycStatuses() {
  const cases = await prisma.kycCase.findMany({
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    select: { id: true, status: true },
  });

  const stale = new Map<string, string[]>();
  for (const [index, kycCase] of cases.entries()) {
    const status = kycStatus(index);
    if (kycCase.status === status) continue;
    stale.set(status, [...(stale.get(status) ?? []), kycCase.id]);
  }

  let updated = 0;
  for (const [status, ids] of stale) {
    const result = await prisma.kycCase.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    updated += result.count;
  }
  return updated;
}

async function seedKycCases(target: number) {
  const existing = await prisma.kycCase.count();
  const rows = [];
  for (let index = existing; index < target; index += 1) {
    rows.push({
      applicantName: personName(index * 3 + 1),
      country: COUNTRIES[index % COUNTRIES.length],
      riskLevel: pick(RISK_LEVELS),
      documentType: pick(DOCUMENT_TYPES),
      status: kycStatus(index),
      submittedAt: daysAgo(intBetween(0, 90), index),
    });
  }
  if (rows.length > 0) await prisma.kycCase.createMany({ data: rows });

  return { created: rows.length, existing, updated: await reconcileKycStatuses() };
}

async function seedFeatureFlags() {
  const keys = [
    "checkout.new-summary",
    "checkout.apple-pay",
    "refunds.bulk-approve",
    "refunds.auto-approve-small",
    "kyc.document-ocr",
    "kyc.manual-override",
    "search.typeahead",
    "search.semantic-ranking",
    "billing.proration-v2",
    "billing.invoice-pdf",
    "support.canned-replies",
    "support.live-chat",
    "platform.dark-mode",
    "platform.audit-trail",
    "platform.rate-limit-v2",
  ];

  for (const [index, key] of keys.entries()) {
    const environment = ENVIRONMENTS[index % ENVIRONMENTS.length];
    const enabled = index % 3 !== 2;
    const rollout = enabled ? intBetween(5, 100) : 0;
    await prisma.featureFlag.upsert({
      where: { key },
      create: {
        key,
        description: `Controls ${key.split(".")[1].replace(/-/g, " ")} in ${environment}`,
        environment,
        enabled,
        rollout,
      },
      update: { environment, enabled, rollout },
    });
  }
  return keys.length;
}

async function main() {
  const users = await seedUsers();
  const refunds = await seedRefunds(200);
  const kycCases = await seedKycCases(120);
  const flags = await seedFeatureFlags();

  console.log(
    [
      `users upserted: ${users}`,
      `refunds created: ${refunds.created} (existing: ${refunds.existing})`,
      `kyc cases created: ${kycCases.created} (existing: ${kycCases.existing}, statuses reconciled: ${kycCases.updated})`,
      `feature flags upserted: ${flags}`,
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
