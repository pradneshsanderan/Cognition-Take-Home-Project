import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // The audit log is append only, everywhere, including any future admin route.
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.property.name='auditLog'][property.name=/^(update|updateMany|updateManyAndReturn|upsert|delete|deleteMany)$/]",
          message:
            "The audit log is append only: prisma.auditLog may only be created and read.",
        },
      ],
    },
  },
  {
    // Writes to app resources must go through the choke point in lib/mutate.ts,
    // which is the only module allowed to reach for a Prisma write delegate.
    ignores: ["lib/mutate.ts", "prisma/seed.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.property.name='auditLog'][property.name=/^(update|updateMany|updateManyAndReturn|upsert|delete|deleteMany)$/]",
          message:
            "The audit log is append only: prisma.auditLog may only be created and read.",
        },
        {
          selector:
            "MemberExpression[object.object.name=/^(prisma|tx)$/][property.name=/^(create|createMany|createManyAndReturn|update|updateMany|updateManyAndReturn|upsert|delete|deleteMany)$/]",
          message:
            "Mutations must go through runAppAction() in lib/mutate.ts, which checks the permission and writes the audit entry in the same transaction.",
        },
      ],
    },
  },
]);

export default eslintConfig;
