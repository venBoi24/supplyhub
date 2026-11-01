import "dotenv/config";
import { defineConfig } from "prisma/config";

import { resolveMigrationDatabaseUrl } from "./src/lib/config/database-url";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: resolveMigrationDatabaseUrl(process.env),
  },
});
