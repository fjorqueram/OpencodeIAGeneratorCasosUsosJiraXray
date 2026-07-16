import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const XRAY_BASE = "https://xray.cloud.getxray.app/api/v2";
const JIRA_BASE = process.env["JIRA_URL"] ?? "https://imed.atlassian.net";
const JIRA_AUTH = Buffer.from(
  `${process.env["JIRA_EMAIL"]}:${process.env["JIRA_API_TOKEN"]}`
).toString("base64");

const LINEA_DESARROLLO_MAP: Record<string, string> = {
  "Equipo Documentos y Firma": "10253",
  "DYF": "10253",
};

let cachedToken: string | null = null;
let tokenExpiry = 0;

// ─────────────────────────────────────────
// HELPERS HTTP
// ─────────────────────────────────────────

async function getXrayToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const res = await fetch(`${XRAY_BASE}/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env["XRAY_CLIENT_ID"],
      client_secret: process.env["XRAY_CLIENT_SECRET"],
    }),
  });
  if (!res.ok) throw new Error(`XRAY auth failed: ${res.status} ${await res.text()}`);
  const raw = await res.text();
  cachedToken = raw.replace(/^"|"$/g, "");
  tokenExpiry = Date.now() + 3500 * 1000;
  return cachedToken;
}

async function xrayGraphQL(query: string, variables?: Record<string, unknown>) {
  const token = await getXrayToken();
  const res = await fetch(`${XRAY_BASE}/graphql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`XRAY GraphQL → ${res.status}: ${await res.text()}`);
  const json = await res.json() as {
    data?: unknown;
    errors?: Array<{ message: string }>;
  };
  if (json.errors?.length) throw new Error(`XRAY GraphQL: ${json.errors.map(e => e.message).join(" | ")}`);
  return json.data;
}

async function xrayGet(path: string) {
  const token = await getXrayToken();
  const res = await fetch(`${XRAY_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`XRAY GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function jiraGet(path: string) {
  const res = await fetch(`${JIRA_BASE}${path}`, {
    headers: { Authorization: `Basic ${JIRA_AUTH}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Jira GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function jiraPost(path: string, body: unknown) {
  const res = await fetch(`${JIRA_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${JIRA_AUTH}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Jira POST ${path} → ${res.status}: ${await res.text()}`);
  if (res.status === 204) return {};
  return res.json();
}

async function jiraPut(path: string, body: unknown) {
  const res = await fetch(`${JIRA_BASE}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Basic ${JIRA_AUTH}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Jira PUT ${path} → ${res.status}: ${await res.text()}`);
  if (res.status === 204) return {};
  return res.json();
}

// ─────────────────────────────────────────
// HELPERS DE NEGOCIO
// ─────────────────────────────────────────

function toADF(text: string) {
  const blocks: unknown[] = [];
  const lines = text.split("\n");
  const precIndex = lines.findIndex(l => l.trim().match(/^Precondiciones:/i));
  const mainText = (precIndex >= 0 ? lines.slice(0, precIndex) : lines)
    .join("\n")
    .trim();

  if (mainText) {
    const prefixed = mainText.startsWith("Se debe validar")
      ? mainText
      : `Se debe validar ${mainText}`;
    blocks.push({
      type: "paragraph",
      content: [{ type: "text", text: prefixed }],
    });
  }

  if (precIndex >= 0) {
    blocks.push({
      type: "paragraph",
      content: [{ type: "text", text: "Precondiciones:", marks: [{ type: "strong" }] }],
    });

    const bulletLines = lines.slice(precIndex + 1).filter(l => l.trim().length > 0);

    if (bulletLines.length > 0) {
      const listItems = bulletLines.map(line => {
        const content = line.replace(/^[\s-]+/, "").trim();

        const linkWithUrl = content.match(/^(\[.+?\]\s+.+?):\s+(https?:\/\/\S+)$/);
        if (linkWithUrl) {
          const [, label, url] = linkWithUrl;
          return {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: label, marks: [{ type: "link", attrs: { href: url } }] }] }],
          };
        }

        const jiraKeyMatch = content.match(/^\[([A-Z]+-\d+)\]\s+(.+)$/);
        if (jiraKeyMatch) {
          const [, key, title] = jiraKeyMatch;
          const url = `${JIRA_BASE}/browse/${key}`;
          return {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: `[${key}] ${title}`, marks: [{ type: "link", attrs: { href: url } }] }] }],
          };
        }

        const contarConMatch = content.match(/^(Contar con .+?)\s*\[(https?:\/\/\S+?)\]$/);
        if (contarConMatch) {
          const [, textPart, url] = contarConMatch;
          return {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: `${textPart} ` }, { type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] }] }],
          };
        }

        const textWithUrl = content.match(/^(.+?)\s+(https?:\/\/\S+)$/);
        if (textWithUrl) {
          const [, textPart, url] = textWithUrl;
          return {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: `${textPart} ` }, { type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] }] }],
          };
        }

        return {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: content }] }],
        };
      });

      blocks.push({ type: "bulletList", content: listItems });
    }
  }

  if (blocks.length === 0) {
    blocks.push({ type: "paragraph", content: [{ type: "text", text: "" }] });
  }

  return { type: "doc", version: 1, content: blocks };
}

function resolveLineaDesarrolloId(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  return LINEA_DESARROLLO_MAP[trimmed] ?? null;
}

// ─────────────────────────────────────────
// HELPER INTERNO — crear test en Xray
// Reutilizado por xray_create_test y create_and_load_test
// ─────────────────────────────────────────

async function internalCreateTest(args: Record<string, unknown>) {
  const jiraFields: Record<string, unknown> = {
    summary: args["summary"],
    project: { key: args["projectKey"] ?? "QA" },
  };

  if (args["productos"] && Array.isArray(args["productos"])) {
    jiraFields["customfield_10428"] = (args["productos"] as string[]).map(
      (v: string) => ({ value: v })
    );
  }
  if (args["complejidad"]) {
    jiraFields["customfield_10646"] = { value: String(args["complejidad"]) };
  }
  if (args["assigneeAccountId"]) {
    jiraFields["assignee"] = { accountId: String(args["assigneeAccountId"]) };
  }

  const data = await xrayGraphQL(
    `mutation createTest($jira: JSON!, $steps: [CreateStepInput]) {
      createTest(testType: { name: "Manual" } steps: $steps jira: $jira) {
        test {
          issueId
          jira(fields: ["key", "summary"])
        }
        warnings
      }
    }`,
    { jira: { fields: jiraFields }, steps: args["steps"] }
  );

  const created = data as { createTest: { test: { jira: { key: string } } } };
  const issueKey = created?.createTest?.test?.jira?.key;
  const editWarnings: string[] = [];
  const complejidadSet = !!args["complejidad"];
  let lineaDesarrolloSet = false;

  if (issueKey) {
    const editFields: Record<string, unknown> = {};

    if (args["description"] && String(args["description"]).trim()) {
      editFields["description"] = toADF(String(args["description"]));
    }

    if (args["lineaDesarrollo"]) {
      const resolvedId = resolveLineaDesarrolloId(String(args["lineaDesarrollo"]));
      if (resolvedId) {
        editFields["customfield_10136"] = { id: resolvedId };
        lineaDesarrolloSet = true;
      } else {
        editWarnings.push(
          `lineaDesarrollo: valor "${args["lineaDesarrollo"]}" no reconocido — agrega el ID al mapa LINEA_DESARROLLO_MAP en index.ts`
        );
      }
    }

    if (Object.keys(editFields).length > 0) {
      try {
        await jiraPut(`/rest/api/3/issue/${issueKey}`, { fields: editFields });
      } catch (editErr) {
        lineaDesarrolloSet = false;
        editWarnings.push(
          `Jira PUT edit falló: ${editErr instanceof Error ? editErr.message : String(editErr)}`
        );
      }
    }
  }

  const readyForManual = complejidadSet && lineaDesarrolloSet;
  return { data, issueKey, editWarnings, readyForManual };
}

// ─────────────────────────────────────────
// SERVIDOR MCP
// ─────────────────────────────────────────

const server = new Server(
  { name: "xray-mcp", version: "3.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ── Tools individuales ────────────────────────────────────────────
    {
      name: "xray_search_tests",
      description: "Busca casos de prueba (tipo Test) en XRAY usando JQL.",
      inputSchema: {
        type: "object" as const,
        properties: {
          jql: { type: "string" },
          limit: { type: "number" },
          page: { type: "number" },
        },
        required: ["jql"],
      },
    },
    {
      name: "xray_search_preconditions",
      description: "Busca Preconditions en XRAY usando JQL.",
      inputSchema: {
        type: "object" as const,
        properties: {
          jql: { type: "string" },
          limit: { type: "number" },
        },
        required: ["jql"],
      },
    },
    {
      name: "xray_create_test",
      description: "Crea un caso de prueba Manual en XRAY con pasos nativos vía GraphQL.",
      inputSchema: {
        type: "object" as const,
        properties: {
          summary: { type: "string" },
          description: { type: "string" },
          projectKey: { type: "string" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                data: { type: "string" },
                result: { type: "string" },
              },
              required: ["action", "result"],
            },
          },
          productos: { type: "array", items: { type: "string" } },
          complejidad: { type: "string" },
          lineaDesarrollo: { type: "string" },
          assigneeAccountId: { type: "string" },
        },
        required: ["summary", "projectKey", "steps"],
      },
    },
    {
      name: "xray_associate_test",
      description: "Vincula un test de XRAY a una tarjeta Jira.",
      inputSchema: {
        type: "object" as const,
        properties: {
          testKey: { type: "string" },
          requirementKey: { type: "string" },
        },
        required: ["testKey", "requirementKey"],
      },
    },
    {
      name: "jira_get_transitions",
      description: "Obtiene las transiciones disponibles para un issue de Jira.",
      inputSchema: {
        type: "object" as const,
        properties: { issueKey: { type: "string" } },
        required: ["issueKey"],
      },
    },
    {
      name: "jira_transition_issue",
      description: "Ejecuta una transición de estado en un issue de Jira.",
      inputSchema: {
        type: "object" as const,
        properties: {
          issueKey: { type: "string" },
          transitionId: { type: "string" },
          fields: { type: "object" },
        },
        required: ["issueKey", "transitionId"],
      },
    },
    {
      name: "jira_get_current_user",
      description: "Retorna el accountId del usuario Jira autenticado.",
      inputSchema: { type: "object" as const, properties: {} },
    },

    // ── TOOL 1 — analyze_ticket_context ───────────────────────────────
    {
      name: "analyze_ticket_context",
      description: "Obtiene tests existentes, preconditions y usuario actual en paralelo. Usar en Paso 3 en vez de llamar xray_search_tests + xray_search_preconditions + jira_get_current_user por separado.",
      inputSchema: {
        type: "object" as const,
        properties: {
          productos: {
            type: "string",
            description: "Valor exacto del campo productos en Xray. Ej: CME",
          },
        },
        required: ["productos"],
      },
    },

    // ── TOOL 2 — create_and_load_test ─────────────────────────────────
    {
      name: "create_and_load_test",
      description: "Crea el test, ejecuta transiciones Backlog→En curso→Manual y asocia a la tarjeta Jira en una sola llamada optimizada. Usar en Paso 6 en vez de llamar xray_create_test + jira_transition_issue + xray_associate_test por separado.",
      inputSchema: {
        type: "object" as const,
        properties: {
          summary: { type: "string" },
          description: { type: "string" },
          projectKey: { type: "string" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                data: { type: "string" },
                result: { type: "string" },
              },
              required: ["action", "result"],
            },
          },
          productos: { type: "array", items: { type: "string" } },
          complejidad: { type: "string" },
          lineaDesarrollo: { type: "string" },
          assigneeAccountId: { type: "string" },
          requirementKey: {
            type: "string",
            description: "Key de la tarjeta Jira a la que se asociará el test. Ej: DYF-4249",
          },
        },
        required: ["summary", "projectKey", "steps", "requirementKey"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [{ type: "text" as const, text: "ERROR: No arguments provided" }],
      isError: true as const,
    };
  }

  const ok = (data: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  });

  const fail = (err: unknown) => ({
    content: [{
      type: "text" as const,
      text: `ERROR: ${err instanceof Error ? err.message : String(err)}`,
    }],
    isError: true as const,
  });

  try {
    switch (name) {

      // ── Tools individuales ──────────────────────────────────────────

      case "xray_search_tests": {
        const params = new URLSearchParams({
          jql: String(args["jql"]),
          limit: String(args["limit"] ?? 50),
          page: String(args["page"] ?? 0),
        });
        return ok(await xrayGet(`/tests?${params}`));
      }

      case "xray_search_preconditions": {
        const params = new URLSearchParams({
          jql: String(args["jql"]),
          limit: String(args["limit"] ?? 50),
        });
        return ok(await xrayGet(`/preconditions?${params}`));
      }

      case "xray_create_test": {
        const result = await internalCreateTest(args as Record<string, unknown>);
        return ok({
          ...result.data as object,
          editWarnings: result.editWarnings,
          readyForManual: result.readyForManual,
        });
      }

      case "xray_associate_test": {
        return ok(
          await jiraPost(`/rest/api/3/issueLink`, {
            type: { name: "Test" },
            inwardIssue: { key: String(args["requirementKey"]) },
            outwardIssue: { key: String(args["testKey"]) },
          })
        );
      }

      case "jira_get_transitions": {
        return ok(await jiraGet(`/rest/api/3/issue/${args["issueKey"]}/transitions`));
      }

      case "jira_transition_issue": {
        const body: Record<string, unknown> = {
          transition: { id: args["transitionId"] },
        };
        if (args["fields"]) body["fields"] = args["fields"];
        return ok(await jiraPost(`/rest/api/3/issue/${args["issueKey"]}/transitions`, body));
      }

      case "jira_get_current_user": {
        return ok(await jiraGet("/rest/api/3/myself"));
      }

      // ── TOOL 1 — analyze_ticket_context ────────────────────────────

      case "analyze_ticket_context": {
        const productos = String(args["productos"]);

        // ✅ Corrección 2 — incluye AND assignee = currentUser()
        const jql_tests = `project = QA AND issuetype = Test AND "productos" = "${productos}" AND assignee = currentUser()`;
        const jql_prec  = `project = QA AND issuetype = Precondition AND "productos" = "${productos}"`;

        // 3 llamadas en paralelo — de ~45 seg a ~15 seg
        const [tests, preconditions, currentUser] = await Promise.all([
          xrayGet(`/tests?${new URLSearchParams({ jql: jql_tests, limit: "50", page: "0" })}`),
          xrayGet(`/preconditions?${new URLSearchParams({ jql: jql_prec, limit: "50" })}`),
          jiraGet("/rest/api/3/myself"),
        ]);

        return ok({
          tests,
          preconditions,
          currentUser,
          summary: {
            testsFound: (tests as { results?: unknown[] })?.results?.length ?? 0,
            preconditionsFound: (preconditions as { results?: unknown[] })?.results?.length ?? 0,
            assigneeAccountId: (currentUser as { accountId?: string })?.accountId ?? null,
          },
        });
      }

      // ── TOOL 2 — create_and_load_test ──────────────────────────────

      case "create_and_load_test": {
        const requirementKey = String(args["requirementKey"]);

        // ✅ Corrección 3 — incluir data en desestructuración
        const { data: createData, issueKey, editWarnings, readyForManual } =
          await internalCreateTest(args as Record<string, unknown>);

        if (!issueKey) {
          throw new Error("xray_create_test no devolvió issueKey — no se puede continuar.");
        }

        const transitionsData = await jiraGet(
          `/rest/api/3/issue/${issueKey}/transitions`
        ) as { transitions: Array<{ id: string; name: string }> };

        const toInProgress = transitionsData.transitions.find(
          t => t.name === "En curso" || t.name === "In Progress"
        );
        const toManual = transitionsData.transitions.find(
          t => t.name === "Manual"
        );

        if (!toInProgress) {
          throw new Error(`No se encontró transición "En curso" para ${issueKey}`);
        }

        // Backlog → En curso (secuencial — requerido antes de Manual)
        await jiraPost(`/rest/api/3/issue/${issueKey}/transitions`, {
          transition: { id: toInProgress.id },
        });

        // En curso → Manual + Asociar (en paralelo)
        const parallelTasks: Promise<unknown>[] = [
          // Asociar siempre
          jiraPost(`/rest/api/3/issueLink`, {
            type: { name: "Test" },
            inwardIssue: { key: requirementKey },
            outwardIssue: { key: issueKey },
          }),
        ];

        // Manual solo si readyForManual
        if (readyForManual && toManual) {
          parallelTasks.push(
            jiraPost(`/rest/api/3/issue/${issueKey}/transitions`, {
              transition: { id: toManual.id },
            })
          );
        }

        const results = await Promise.allSettled(parallelTasks);

        const associateResult = results[0];

        // ✅ Corrección 1 — manualResult solo existe si se agregó la tarea
        const manualResult = (readyForManual && toManual) ? results[1] : undefined;

        const warnings = [...editWarnings];

        if (associateResult.status === "rejected") {
          warnings.push(`⚠️ No se pudo asociar ${issueKey} a ${requirementKey}: ${associateResult.reason}`);
        }

        let finalState = "En curso";
        if (readyForManual && toManual) {
          if (manualResult?.status === "fulfilled") {
            finalState = "Manual";
          } else {
            warnings.push(
              `⚠️ Transición En curso → Manual falló para ${issueKey}: ${
                manualResult?.status === "rejected"
                  ? (manualResult as PromiseRejectedResult).reason
                  : "respuesta inesperada"
              }`
            );
          }
        } else if (!readyForManual) {
          warnings.push(`⚠️ ${issueKey} quedó en En curso — faltan campos Linea de Desarrollo o Complejidad.`);
        }

        return ok({
          issueKey,
          finalState,
          readyForManual,
          requirementKey,
          warnings,
          // ✅ Corrección 3 — warnings de GraphQL visibles
          xrayWarnings: (createData as { createTest?: { warnings?: string[] } })?.createTest?.warnings ?? [],
          summary: {
            created: true,
            associated: associateResult.status === "fulfilled",
            state: finalState,
          },
        });
      }

      default:
        throw new Error(`Herramienta desconocida: ${name}`);
    }
  } catch (err) {
    return fail(err);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
