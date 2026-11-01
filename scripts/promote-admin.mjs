import { Client } from "pg";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run admin:promote -- you@example.com");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set. Run this with an .env file that defines it.");
  process.exit(1);
}

const client = new Client({ connectionString });

try {
  await client.connect();

  const result = await client.query(
    "UPDATE users SET role = 'ADMIN' WHERE lower(email) = $1 AND status = 'ACTIVE' RETURNING email, name",
    [email],
  );

  if (result.rowCount === 0) {
    console.error("No active account matches that email. Register the account first.");
    process.exitCode = 1;
  } else {
    console.log(`Promoted ${result.rows[0].email} (${result.rows[0].name}) to ADMIN.`);
    console.log(
      "Session reads refresh the role from the database, so access applies on the next request.",
    );
  }
} finally {
  await client.end();
}
