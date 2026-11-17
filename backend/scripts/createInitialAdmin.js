const path = require("node:path");
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const bcrypt = require("bcrypt");

// Load backend/.env explicitly so this script works from any current directory.
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Use the same PostgreSQL pool as the rest of the backend.
const pool = require("../config/db");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const adminLockKeys = [741920, 1];

class ProvisioningError extends Error {}

function promptForHiddenPassword(promptText) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    return Promise.reject(new ProvisioningError("A terminal is required to enter the password safely."));
  }

  stdout.write(promptText);
  const previousRawMode = stdin.isRaw;
  stdin.setEncoding("utf8");
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let password = "";

    const finish = (error) => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(previousRawMode);
      stdout.write("\n");
      if (error) {
        reject(error);
      } else {
        resolve(password);
      }
    };

    const onData = (input) => {
      for (const character of input) {
        if (character === "\u0003" || character === "\u0004") {
          finish(new ProvisioningError("Password entry cancelled."));
          return;
        }

        if (character === "\r" || character === "\n") {
          finish();
          return;
        }

        if (character === "\u007f" || character === "\b") {
          password = password.slice(0, -1);
        } else if (character >= " ") {
          password += character;
        }
      }
    };

    stdin.on("data", onData);
  });
}

async function main() {
  let client;
  let transactionStarted = false;
  let exitCode = 0;

  try {
    const prompt = readline.createInterface({ input: stdin, output: stdout });
    const fullName = (await prompt.question("Admin full name: ")).trim();
    const email = (await prompt.question("Admin email: ")).trim().toLowerCase();
    prompt.close();

    const password = await promptForHiddenPassword("Admin password (input hidden): ");

    if (!fullName || fullName.length > 100) {
      throw new ProvisioningError("Full name is required and must be at most 100 characters.");
    }
    if (!email || email.length > 150 || !emailPattern.test(email)) {
      throw new ProvisioningError("Enter a valid email address of at most 150 characters.");
    }
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      throw new ProvisioningError("Password must be at least 8 characters and no more than 72 UTF-8 bytes.");
    }

    // Hash before opening the transaction to keep the database lock short.
    const passwordHash = await bcrypt.hash(password, 12);

    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    // A transaction-scoped lock serializes concurrent runs of this script.
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", adminLockKeys);

    const existingAdmin = await client.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );
    if (existingAdmin.rows.length > 0) {
      throw new ProvisioningError("An Admin account already exists. No account was created.");
    }

    const existingEmail = await client.query(
      "SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1",
      [email]
    );
    if (existingEmail.rows.length > 0) {
      throw new ProvisioningError("An account with this email already exists. No account was created.");
    }

    await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')`,
      [fullName, email, passwordHash]
    );

    await client.query("COMMIT");
    transactionStarted = false;
    stdout.write("Initial Admin account created successfully.\n");
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Keep database details out of terminal output.
      }
    }

    if (error.code === "23505") {
      stdout.write("An account with this email already exists. No account was created.\n");
    } else if (error instanceof ProvisioningError) {
      stdout.write(`${error.message}\n`);
    } else {
      stdout.write("Unable to create the initial Admin account. Check the backend configuration and try again.\n");
    }
    exitCode = 1;
  } finally {
    if (client) {
      client.release();
    }

    try {
      await pool.end();
    } catch {
      stdout.write("Unable to close the database connection cleanly.\n");
      exitCode = 1;
    }

    process.exitCode = exitCode;
  }
}

if (require.main === module) {
  main();
}
