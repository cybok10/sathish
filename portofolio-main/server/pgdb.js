import pg from "pg";

/**
 * A thin compatibility layer over `pg` that keeps the shape of the
 * `node:sqlite` API the rest of the server was written against.
 *
 * Two things differ between the two drivers and both are handled here:
 *
 *  1. Placeholders. SQLite uses `?`, PostgreSQL uses `$1, $2`. The
 *     converter below rewrites them, skipping any `?` that sits inside a
 *     quoted string literal.
 *
 *  2. Transactions. `node:sqlite` is synchronous, so `BEGIN` / `COMMIT` /
 *     `ROLLBACK` could be plain statements. With a pool, each statement
 *     could land on a different connection, which would silently break
 *     the transaction. `exec()` therefore pins one client for the
 *     duration of a transaction and routes every statement to it.
 *
 * The methods are asynchronous, so call sites need `await` — that is the
 * one unavoidable change in the server code.
 */

const { Pool } = pg;

/**
 * Rewrites `?` placeholders to PostgreSQL's `$1, $2` form.
 * A `?` inside a single-quoted literal is left alone.
 */
export function toPgPlaceholders(sql) {
  let out = "";
  let index = 0;
  let inString = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];

    if (char === "'") {
      // Doubled quotes ('') are an escaped quote, not a string boundary.
      if (inString && sql[i + 1] === "'") {
        out += "''";
        i += 1;
        continue;
      }
      inString = !inString;
      out += char;
      continue;
    }

    if (char === "?" && !inString) {
      index += 1;
      out += `$${index}`;
      continue;
    }

    out += char;
  }

  return out;
}

/**
 * `INSERT OR IGNORE` is SQLite-only. PostgreSQL spells it
 * `INSERT ... ON CONFLICT DO NOTHING`.
 *
 * Only statements that really said `OR IGNORE` are rewritten this way.
 * A plain INSERT must still fail on a unique violation, exactly as it
 * did under SQLite.
 */
export function toPgDialect(sql) {
  if (!/\bINSERT\s+OR\s+IGNORE\b/i.test(sql)) return sql;
  return sql
    .replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/gi, "INSERT INTO")
    .trimEnd() + " ON CONFLICT DO NOTHING";
}

/** True when the statement inserts a row and could return its id. */
function isInsert(sql) {
  return /^\s*INSERT\s+INTO\b/i.test(sql);
}

function hasReturning(sql) {
  return /\bRETURNING\b/i.test(sql);
}

/** The table an INSERT writes to. */
function insertTarget(sql) {
  const match = /^\s*INSERT\s+INTO\s+"?([\w.]+)"?/i.exec(sql);
  return match ? match[1].split(".").pop().toLowerCase() : null;
}

export function createPool(connectionString) {
  const pool = new Pool({
    connectionString,
    // Serverless invocations are short-lived; a small pool is plenty and
    // keeps well under the connection limit of the database provider.
    max: Number(process.env.DB_POOL_MAX || 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // TLS is required by managed PostgreSQL providers.
    ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
      ? undefined
      : { rejectUnauthorized: false },
  });

  // A pool error must not take the process down.
  pool.on("error", (error) => {
    console.error("[blog-db] idle client error:", error.message);
  });

  return pool;
}

/**
 * Wraps a pool in the `node:sqlite`-shaped interface.
 */
export function createDatabase(pool) {
  let transactionClient = null;
  const idColumnCache = new Map();
  let idColumnPromise = null;

  const client = () => transactionClient || pool;

  /**
   * Runs a query, logging the statement when it fails. On a serverless
   * runtime the logs are the only place a failure is visible, so the SQL
   * is included rather than just the message.
   */
  const query = async (text, args) => {
    try {
      return await client().query(text, args);
    } catch (error) {
      console.error("[blog-db] query failed:", error.message, "\n[blog-db] sql:", text);
      throw error;
    }
  };

  /**
   * Every table that has an `id` column.
   *
   * Fetched once per instance in a single round trip. Over a connection
   * pooler every query costs real latency, so asking the catalog one
   * table at a time would add a round trip per table on every cold start.
   */
  const loadIdColumns = async () => {
    if (idColumnPromise) return idColumnPromise;
    idColumnPromise = (async () => {
      try {
        const result = await query(
          `SELECT table_name FROM information_schema.columns
           WHERE table_schema = current_schema() AND column_name = 'id'`
        );
        for (const row of result.rows) idColumnCache.set(String(row.table_name).toLowerCase(), true);
      } catch (error) {
        // If the catalog cannot be read, fall back to the usual shape.
        console.error("[blog-db] could not read the id column catalog:", error.message);
      }
    })();
    return idColumnPromise;
  };

  /**
   * Whether a table has an `id` column, so `RETURNING id` is only added
   * where it makes sense. A failed statement would abort an open
   * transaction, so the answer has to be known before the query runs.
   */
  const tableHasId = async (table) => {
    if (!table) return false;
    if (idColumnCache.has(table)) return idColumnCache.get(table);
    await loadIdColumns();
    const hasId = idColumnCache.get(table) ?? false;
    idColumnCache.set(table, hasId);
    return hasId;
  };

  const db = {
    /** True while a transaction is open on this connection. */
    get inTransaction() {
      return transactionClient !== null;
    },

    prepare(sql) {
      const text = toPgPlaceholders(toPgDialect(sql));

      return {
        async get(...args) {
          const result = await query(text, args);
          return result.rows[0];
        },
        async all(...args) {
          const result = await query(text, args);
          return result.rows;
        },
        async run(...args) {
          // The original code read `result.lastInsertRowid` after an
          // insert, so an INSERT gets RETURNING id appended to preserve
          // that behaviour — but only where the table actually has one.
          const statement =
            isInsert(text) && !hasReturning(text) && (await tableHasId(insertTarget(text)))
              ? `${text} RETURNING id`
              : text;
          const result = await query(statement, args);
          return {
            changes: result.rowCount ?? 0,
            lastInsertRowid: result.rows[0]?.id ?? null,
          };
        },
      };
    },

    /**
     * Runs raw SQL. `BEGIN`, `COMMIT` and `ROLLBACK` open and close a
     * transaction on a single pinned client; anything else is a plain
     * statement.
     */
    async exec(sql) {
      const statement = sql.trim();

      if (/^BEGIN\b/i.test(statement)) {
        if (transactionClient) return;
        transactionClient = await pool.connect();
        await transactionClient.query("BEGIN");
        return;
      }

      if (/^(COMMIT|ROLLBACK)\b/i.test(statement)) {
        if (!transactionClient) return;
        const current = transactionClient;
        transactionClient = null;
        try {
          await current.query(statement.toUpperCase().startsWith("COMMIT") ? "COMMIT" : "ROLLBACK");
        } finally {
          current.release();
        }
        return;
      }

      await client().query(statement);
    },

    /**
     * Runs a callback inside a transaction, committing on success and
     * rolling back on failure.
     */
    async transaction(callback) {
      if (transactionClient) return callback();
      const dedicated = await pool.connect();
      const previous = transactionClient;
      transactionClient = dedicated;
      try {
        await dedicated.query("BEGIN");
        const result = await callback();
        await dedicated.query("COMMIT");
        return result;
      } catch (error) {
        try {
          await dedicated.query("ROLLBACK");
        } catch {
          // The connection may already be broken; releasing it is enough.
        }
        throw error;
      } finally {
        transactionClient = previous;
        dedicated.release();
      }
    },

    /** Releases the pinned transaction client, if one is open. */
    async release() {
      if (!transactionClient) return;
      const current = transactionClient;
      transactionClient = null;
      try {
        await current.query("ROLLBACK");
      } catch {
        // Ignore — the connection is being discarded.
      }
      current.release();
    },
  };

  return db;
}
