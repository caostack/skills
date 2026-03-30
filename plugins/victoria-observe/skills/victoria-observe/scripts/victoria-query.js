#!/usr/bin/env node
'use strict';

const http = require('http');
const https = require('https');
const url = require('url');

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i += 2;
      } else {
        flags[key] = true;
        i += 1;
      }
    } else {
      positional.push(arg);
      i += 1;
    }
  }
  return { positional, flags };
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

function parseRelativeTime(input) {
  const match = String(input).match(/^(\d+(?:\.\d+)?)(s|m|h|d|w)$/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  const unit = match[2];
  const now = Date.now() / 1000;
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
  return now - val * multipliers[unit];
}

function parseTime(input) {
  if (input === undefined || input === 'now') return Date.now() / 1000;
  const relative = parseRelativeTime(input);
  if (relative !== null) return relative;
  if (/^\d+(\.\d+)?$/.test(input)) return parseFloat(input);
  const parsed = Date.parse(input);
  if (!isNaN(parsed)) return parsed / 1000;
  throw new Error(`Cannot parse time: ${input}`);
}

function formatTimestamp(unixSec) {
  return new Date(unixSec * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// HTTP request helper (zero dependencies)
// ---------------------------------------------------------------------------

function httpRequest(targetUrl) {
  return new Promise((resolve, reject) => {
    const parsed = new url.URL(targetUrl);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.get(targetUrl, { timeout: 30000 }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 500)}`));
        } else {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

function buildBaseUrl(envVar, defaultPort, defaultPath) {
  let base = process.env[envVar];
  if (!base) {
    console.error(`Error: Environment variable ${envVar} is not set.`);
    process.exit(1);
  }
  base = base.replace(/\/+$/, '');
  return base;
}

function buildUrl(base, path, params) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const separator = base.endsWith('/') ? '' : '/';
  return qs ? `${base}${separator}${path}?${qs}` : `${base}${separator}${path}`;
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function outputJson(data, raw) {
  if (raw) {
    console.log(typeof data === 'string' ? data : JSON.stringify(data));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

function formatLogsResponse(body, raw) {
  if (raw) {
    console.log(body);
    return;
  }
  // VictoriaLogs returns NDJSON (one JSON object per line)
  const lines = body.trim().split('\n').filter(Boolean);
  const logs = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      logs.push({
        _time: entry._time,
        _stream: entry._stream,
        _msg: entry._msg || entry.message || entry.msg || '',
        ...(entry.level ? { level: entry.level } : {}),
        ...(entry.error ? { error: entry.error } : {}),
      });
    } catch {
      logs.push({ _raw: line });
    }
  }
  console.log(JSON.stringify(logs, null, 2));
}

// ---------------------------------------------------------------------------
// Metrics commands
// ---------------------------------------------------------------------------

async function cmdMetricsQuery(positional, flags) {
  const query = positional[0];
  if (!query) throw new Error('Usage: metrics query <MetricsQL expression>');
  const base = buildBaseUrl('VICTORIA_METRICS_URL', 8428);
  const params = { query, time: flags.time ? parseTime(flags.time) : undefined };
  const u = buildUrl(base, 'api/v1/query', params);
  const body = await httpRequest(u);
  outputJson(JSON.parse(body), flags.raw);
}

async function cmdMetricsRange(positional, flags) {
  const query = positional[0];
  if (!query) throw new Error('Usage: metrics range <MetricsQL expression>');
  const base = buildBaseUrl('VICTORIA_METRICS_URL', 8428);
  const start = parseTime(flags.start || '1h');
  const end = parseTime(flags.end || 'now');
  const params = {
    query,
    start: String(start),
    end: String(end),
    step: flags.step || '5m',
  };
  const u = buildUrl(base, 'api/v1/query_range', params);
  const body = await httpRequest(u);
  outputJson(JSON.parse(body), flags.raw);
}

async function cmdMetricsLabels(positional, flags) {
  const base = buildBaseUrl('VICTORIA_METRICS_URL', 8428);
  const params = {};
  if (positional[0]) params['match[]'] = positional[0];
  if (flags.start) params.start = String(parseTime(flags.start));
  if (flags.end) params.end = String(parseTime(flags.end));
  const u = buildUrl(base, 'api/v1/labels', params);
  const body = await httpRequest(u);
  outputJson(JSON.parse(body), flags.raw);
}

async function cmdMetricsLabelValues(positional, flags) {
  const label = positional[0];
  if (!label) throw new Error('Usage: metrics label-values <label name>');
  const base = buildBaseUrl('VICTORIA_METRICS_URL', 8428);
  const params = {};
  if (positional[1]) params['match[]'] = positional[1];
  if (flags.start) params.start = String(parseTime(flags.start));
  if (flags.end) params.end = String(parseTime(flags.end));
  const u = buildUrl(base, `api/v1/label/${label}/values`, params);
  const body = await httpRequest(u);
  outputJson(JSON.parse(body), flags.raw);
}

async function cmdMetricsSeries(positional, flags) {
  const match = positional[0];
  if (!match) throw new Error('Usage: metrics series <match selector>');
  const base = buildBaseUrl('VICTORIA_METRICS_URL', 8428);
  const params = { 'match[]': match };
  if (flags.start) params.start = String(parseTime(flags.start));
  if (flags.end) params.end = String(parseTime(flags.end));
  if (flags.limit) params.limit = flags.limit;
  const u = buildUrl(base, 'api/v1/series', params);
  const body = await httpRequest(u);
  outputJson(JSON.parse(body), flags.raw);
}

async function cmdMetricsExport(positional, flags) {
  const match = positional[0];
  if (!match) throw new Error('Usage: metrics export <match selector>');
  const base = buildBaseUrl('VICTORIA_METRICS_URL', 8428);
  const params = { 'match[]': match };
  if (flags.start) params.start = String(parseTime(flags.start));
  if (flags.end) params.end = String(parseTime(flags.end));
  const u = buildUrl(base, 'api/v1/export', params);
  const body = await httpRequest(u);
  // Export returns NDJSON
  if (flags.raw) {
    console.log(body);
  } else {
    const lines = body.trim().split('\n').filter(Boolean);
    const records = lines.map((l) => {
      try { return JSON.parse(l); } catch { return l; }
    });
    console.log(JSON.stringify(records, null, 2));
  }
}

// ---------------------------------------------------------------------------
// Logs commands
// ---------------------------------------------------------------------------

async function cmdLogsQuery(positional, flags) {
  const query = positional[0];
  if (!query) throw new Error('Usage: logs query <LogsQL expression>');
  const base = buildBaseUrl('VICTORIA_LOGS_URL', 9429);
  const params = { query };
  if (flags.start) params.start = String(Math.round(parseTime(flags.start)));
  if (flags.end) params.end = String(Math.round(parseTime(flags.end)));
  if (flags.limit) params.limit = flags.limit;
  const u = buildUrl(base, 'select/logsql/query', params);
  const body = await httpRequest(u);
  formatLogsResponse(body, flags.raw);
}

async function cmdLogsHits(positional, flags) {
  const query = positional[0];
  if (!query) throw new Error('Usage: logs hits <LogsQL expression>');
  const base = buildBaseUrl('VICTORIA_LOGS_URL', 9429);
  const params = { query, step: flags.step || '1h' };
  if (flags.start) params.start = String(Math.round(parseTime(flags.start)));
  if (flags.end) params.end = String(Math.round(parseTime(flags.end)));
  const u = buildUrl(base, 'select/logsql/hits', params);
  const body = await httpRequest(u);
  outputJson(JSON.parse(body), flags.raw);
}

async function cmdLogsFieldNames(positional, flags) {
  const base = buildBaseUrl('VICTORIA_LOGS_URL', 9429);
  const params = { query: positional[0] || '*' };
  if (flags.start) params.start = String(Math.round(parseTime(flags.start)));
  if (flags.end) params.end = String(Math.round(parseTime(flags.end)));
  const u = buildUrl(base, 'select/logsql/field_names', params);
  const body = await httpRequest(u);
  outputJson(JSON.parse(body), flags.raw);
}

async function cmdLogsFieldValues(positional, flags) {
  const field = positional[0];
  if (!field) throw new Error('Usage: logs field-values <field name>');
  const base = buildBaseUrl('VICTORIA_LOGS_URL', 9429);
  const params = { field };
  if (positional[1]) params.query = positional[1];
  if (flags.start) params.start = String(Math.round(parseTime(flags.start)));
  if (flags.end) params.end = String(Math.round(parseTime(flags.end)));
  if (flags.limit) params.limit = flags.limit;
  const u = buildUrl(base, 'select/logsql/field_values', params);
  const body = await httpRequest(u);
  outputJson(JSON.parse(body), flags.raw);
}

async function cmdLogsStreams(positional, flags) {
  const base = buildBaseUrl('VICTORIA_LOGS_URL', 9428);
  // streams endpoint requires a query parameter; default to match all
  const params = { query: positional[0] || '*' };
  if (flags.start) params.start = String(Math.round(parseTime(flags.start)));
  if (flags.end) params.end = String(Math.round(parseTime(flags.end)));
  if (flags.limit) params.limit = flags.limit;
  const u = buildUrl(base, 'select/logsql/streams', params);
  const body = await httpRequest(u);
  outputJson(JSON.parse(body), flags.raw);
}

// ---------------------------------------------------------------------------
// Traces commands (Jaeger-compatible API)
// ---------------------------------------------------------------------------

async function cmdTracesServices(positional, flags) {
  const base = buildBaseUrl('VICTORIA_TRACES_URL', 9428);
  const u = buildUrl(base, 'select/jaeger/api/services', {});
  const body = await httpRequest(u);
  outputJson(JSON.parse(body), flags.raw);
}

async function cmdTracesOperations(positional, flags) {
  const service = positional[0];
  if (!service) throw new Error('Usage: traces operations <service name>');
  const base = buildBaseUrl('VICTORIA_TRACES_URL', 9428);
  const u = buildUrl(base, `select/jaeger/api/services/${encodeURIComponent(service)}/operations`, {});
  const body = await httpRequest(u);
  outputJson(JSON.parse(body), flags.raw);
}

async function cmdTracesSearch(positional, flags) {
  const base = buildBaseUrl('VICTORIA_TRACES_URL', 9428);
  const params = {};
  if (flags.service) params.service = flags.service;
  else throw new Error('traces search requires --service <name>. Run "traces services" to list available services.');
  if (flags.operation) params.operation = flags.operation;
  if (flags.tags) params.tags = flags.tags;
  if (flags.minDuration) params.minDuration = flags.minDuration;
  if (flags.maxDuration) params.maxDuration = flags.maxDuration;
  if (flags.limit) params.limit = flags.limit;
  if (flags.start) {
    // Jaeger API uses microseconds
    params.start = String(Math.round(parseTime(flags.start) * 1e6));
  }
  if (flags.end) {
    params.end = String(Math.round(parseTime(flags.end) * 1e6));
  }
  const u = buildUrl(base, 'select/jaeger/api/traces', params);
  const body = await httpRequest(u);
  outputJson(JSON.parse(body), flags.raw);
}

async function cmdTracesGet(positional, flags) {
  const traceID = positional[0];
  if (!traceID) throw new Error('Usage: traces get <trace ID>');
  const base = buildBaseUrl('VICTORIA_TRACES_URL', 9428);
  const u = buildUrl(base, `select/jaeger/api/traces/${traceID}`, {});
  const body = await httpRequest(u);
  outputJson(JSON.parse(body), flags.raw);
}

async function cmdTracesDependencies(positional, flags) {
  const base = buildBaseUrl('VICTORIA_TRACES_URL', 9428);
  const params = {};
  if (flags.start) params.start = String(Math.round(parseTime(flags.start) * 1e6));
  if (flags.end) params.end = String(Math.round(parseTime(flags.end) * 1e6));
  const u = buildUrl(base, 'select/jaeger/api/dependencies', params);
  const body = await httpRequest(u);
  outputJson(JSON.parse(body), flags.raw);
}

// ---------------------------------------------------------------------------
// Command routing
// ---------------------------------------------------------------------------

const COMMANDS = {
  metrics: {
    query: cmdMetricsQuery,
    range: cmdMetricsRange,
    labels: cmdMetricsLabels,
    'label-values': cmdMetricsLabelValues,
    series: cmdMetricsSeries,
    export: cmdMetricsExport,
  },
  logs: {
    query: cmdLogsQuery,
    hits: cmdLogsHits,
    'field-names': cmdLogsFieldNames,
    'field-values': cmdLogsFieldValues,
    streams: cmdLogsStreams,
  },
  traces: {
    services: cmdTracesServices,
    operations: cmdTracesOperations,
    search: cmdTracesSearch,
    get: cmdTracesGet,
    dependencies: cmdTracesDependencies,
  },
};

function printHelp() {
  console.log(`
victoria-query - Query VictoriaMetrics, VictoriaLogs, and VictoriaTraces

Usage: node victoria-query.js <service> <action> [args...] [options]

Services and actions:
  metrics query <query>              Instant MetricsQL query
  metrics range <query>              Range MetricsQL query (--start, --end, --step)
  metrics labels [match]             List label names
  metrics label-values <label>       List label values
  metrics series <match>             Find time series
  metrics export <match>             Export raw data

  logs query <logsql>                LogsQL query
  logs hits <logsql>                 Log hit counts
  logs field-names [query]           List log field names
  logs field-values <field> [query]  List log field values
  logs streams                       List log streams

  traces services                    List services
  traces operations <service>        List operations for a service
  traces search [options]            Search traces (--service, --operation, --tags,
                                      --minDuration, --maxDuration, --limit)
  traces get <traceID>               Get trace by ID
  traces dependencies                Service dependency graph

Options:
  --start <time>     Start time (relative: 1h, 30m, 24h, 7d | unix timestamp | RFC3339)
  --end <time>       End time (default: now)
  --step <duration>  Query step for range queries (default: 5m)
  --limit <n>        Limit number of results
  --raw              Output raw JSON without formatting

Environment variables:
  VICTORIA_METRICS_URL   VictoriaMetrics URL (e.g. http://localhost:8428)
  VICTORIA_LOGS_URL      VictoriaLogs URL (e.g. http://localhost:9429)
  VICTORIA_TRACES_URL    VictoriaTraces URL (e.g. http://localhost:9428)
`.trim());
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));

  if (positional.length === 0 || flags.help) {
    printHelp();
    process.exit(0);
  }

  const service = positional[0];
  const action = positional[1];

  if (!service || !action) {
    console.error('Error: Please specify <service> and <action>.');
    console.error('Run with --help for usage.');
    process.exit(1);
  }

  const serviceCommands = COMMANDS[service];
  if (!serviceCommands) {
    console.error(`Error: Unknown service "${service}". Use: metrics, logs, traces`);
    process.exit(1);
  }

  const cmd = serviceCommands[action];
  if (!cmd) {
    console.error(`Error: Unknown action "${action}" for service "${service}".`);
    console.error(`Available: ${Object.keys(serviceCommands).join(', ')}`);
    process.exit(1);
  }

  try {
    await cmd(positional.slice(2), flags);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
