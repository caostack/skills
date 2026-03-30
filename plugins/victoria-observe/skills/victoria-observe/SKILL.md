---
name: victoria-observe
description: >-
  Query and analyze observability data from VictoriaMetrics, VictoriaLogs, and VictoriaTraces.
  This skill should be used when the user wants to "query metrics", "check logs",
  "search traces", "analyze observability data", "debug with metrics",
  "find errors in logs", "trace a request", "check VictoriaMetrics",
  "query VictoriaLogs", "search VictoriaTraces", "query MetricsQL",
  "query LogsQL", "search Jaeger traces",
  "查询指标", "查看日志", "搜索链路", "分析可观测数据",
  "查一下 metrics", "看下日志有什么错误", "追踪一下这个请求",
  "复现 bug", "验证部署", "检查服务状态", "查 VictoriaMetrics",
  "看 VictoriaLogs", "搜 VictoriaTraces",
  or mentions analyzing metrics, logs, or distributed traces from
  VictoriaMetrics, VictoriaLogs, or VictoriaTraces.
  Do NOT use for GitHub issues, code analysis, or file editing.
argument-hint: "[service] [action] [query]"
---

# victoria-observe

Query and analyze observability data from VictoriaMetrics (metrics), VictoriaLogs (logs), and VictoriaTraces (distributed traces).

## Prerequisites

Before using this skill, verify these environment variables are set:

- `VICTORIA_METRICS_URL` — VictoriaMetrics endpoint (e.g. `http://vmselect:8481/select/0/prometheus`)
- `VICTORIA_LOGS_URL` — VictoriaLogs endpoint (e.g. `http://vlselect:9428`)
- `VICTORIA_TRACES_URL` — VictoriaTraces endpoint (e.g. `http://vtselect:10428`)

If any variable is missing, inform the user which one needs to be configured.

## Script Location

```bash
SCRIPT="$CLAUDE_PLUGIN_ROOT/skills/victoria-observe/scripts/victoria-query.js"
```

All commands follow the pattern:

```bash
node $SCRIPT <service> <action> [args...] [--start <time>] [--end <time>] [--limit <n>] [--raw]
```

**Time format**: Relative (`1h`, `30m`, `24h`, `7d`), Unix timestamp, or RFC3339. Default `--start` is `1h`, default `--end` is `now`.

---

## Diagnostic Workflow

When the user describes a problem (bug, error, performance issue), follow this workflow:

### Phase 1: Scope the Problem

Ask or infer:
- What service/endpoint is affected?
- When did the issue start? (time range)
- What symptoms? (errors, latency, throughput drop)

### Phase 2: Metrics — Detect Anomalies

```bash
# Check if the service is up
node $SCRIPT metrics query 'up{job="<service>"}'

# Check error rate
node $SCRIPT metrics query 'sum(rate(http_requests_total{status=~"5.."}[5m])) by (job)'

# Check latency (p99)
node $SCRIPT metrics query 'histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, job))'

# Range query to see trends
node $SCRIPT metrics range 'rate(http_requests_total{job="<service>"}[5m])' --start 2h --step 1m
```

### Phase 3: Logs — Find Error Details

```bash
# Search for errors in the service logs
node $SCRIPT logs query '_stream:{app="<service>"} error' --start 2h

# Search for specific error messages
node $SCRIPT logs query '_stream:{app="<service>"} "panic" OR "fatal"' --start 2h --limit 50

# List available log fields for filtering
node $SCRIPT logs field-names '_stream:{app="<service>"}' --start 2h

# Check log volume over time
node $SCRIPT logs hits '_stream:{app="<service>"} error' --start 2h
```

### Phase 4: Traces — Trace the Request Path

```bash
# List available services
node $SCRIPT traces services

# Find slow requests for the service
node $SCRIPT traces search --service <service> --minDuration 1s --start 2h --limit 10

# Find error traces
node $SCRIPT traces search --service <service> --tags '{"error":"true"}' --start 2h --limit 10

# Get detailed trace by ID
node $SCRIPT traces get <traceID>

# Check service dependencies
node $SCRIPT traces dependencies --start 2h
```

### Phase 5: Correlate Findings

Cross-reference the three data sources:
1. Metrics showed the **what** (anomaly, spike, drop)
2. Logs showed the **why** (error message, stack trace)
3. Traces showed the **where** (which service, which call chain)

Summarize findings with specific timestamps, affected services, and root cause hypothesis.

---

## Metrics Query Templates

### Metric Discovery

```bash
# List all metric names
node $SCRIPT metrics label-values '__name__'

# List all label names
node $SCRIPT metrics labels

# Find series matching a pattern
node $SCRIPT metrics series 'http_requests_total{job="api"}'
```

### Common MetricsQL Queries

```bash
# Request rate (req/s) over last 5 minutes
node $SCRIPT metrics query 'sum(rate(http_requests_total[5m])) by (job)'

# Error percentage
node $SCRIPT metrics query 'sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100'

# CPU usage
node $SCRIPT metrics query '100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'

# Memory usage percentage
node $SCRIPT metrics query '(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100'

# Disk I/O
node $SCRIPT metrics query 'rate(node_disk_read_bytes_total[5m])'

# Increase over time window
node $SCRIPT metrics query 'sum(increase(http_requests_total{job="api"}[1h])) by (status)'
```

### Range Queries (Time Series)

```bash
# Hourly request rate over the last day
node $SCRIPT metrics range 'sum(rate(http_requests_total[5m])) by (job)' --start 24h --step 1h

# Error rate trend over last 6 hours
node $SCRIPT metrics range 'sum(rate(http_requests_total{status=~"5.."}[5m])) by (job)' --start 6h --step 5m
```

---

## Logs Query Templates

### Basic Log Searches

```bash
# Recent logs from a specific app
node $SCRIPT logs query '_stream:{app="api"}' --start 30m --limit 100

# Filter by log level
node $SCRIPT logs query '_stream:{app="api"} _level:error' --start 1h

# Full-text search
node $SCRIPT logs query '"connection refused"' --start 1h

# Combined filters
node $SCRIPT logs query '_stream:{app="api"} _level:error "timeout"' --start 2h --limit 50
```

### Log Exploration

```bash
# List all log streams
node $SCRIPT logs streams

# Discover available fields
node $SCRIPT logs field-names '_stream:{app="api"}'

# Get unique values for a field
node $SCRIPT logs field-values 'status_code' '_stream:{app="api"}' --start 1h

# Count log entries matching a query
node $SCRIPT logs hits '_stream:{app="api"} error' --start 1h
```

---

## Traces Query Templates

### Service Discovery

```bash
# List all services in the tracing system
node $SCRIPT traces services

# List operations for a service
node $SCRIPT traces operations my-service
```

### Trace Search

```bash
# Search by service name
node $SCRIPT traces search --service checkout --start 1h --limit 20

# Search by operation
node $SCRIPT traces search --service checkout --operation PlaceOrder --start 1h

# Find slow traces (>500ms)
node $SCRIPT traces search --service checkout --minDuration 500ms --start 1h

# Find traces with specific tags
node $SCRIPT traces search --service checkout --tags '{"error":"true"}' --start 1h

# Search across all services for errors
node $SCRIPT traces search --tags '{"error":"true"}' --start 30m --limit 50
```

### Trace Details

```bash
# Get full trace details by ID
node $SCRIPT traces get abc123def456

# Service dependency map
node $SCRIPT traces dependencies --start 24h
```

---

## Combined Debugging Scenarios

### Scenario: "Payment API returns 502 errors"

```bash
# 1. Check error rate spike
node $SCRIPT metrics query 'sum(rate(http_requests_total{path="/api/pay",status="502"}[5m]))'

# 2. Find related error logs
node $SCRIPT logs query '_stream:{app="payment"} "502" OR "upstream"' --start 1h --limit 20

# 3. Trace failed payment requests
node $SCRIPT traces search --service payment --operation POST /api/pay --tags '{"http.status_code":"502"}' --start 1h

# 4. Check downstream service health
node $SCRIPT traces dependencies --start 1h
```

### Scenario: "Service latency increased"

```bash
# 1. Check p99 latency
node $SCRIPT metrics range 'histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{job="api"}[5m])) by (le))' --start 2h --step 1m

# 2. Find slow traces
node $SCRIPT traces search --service api --minDuration 1s --start 2h --limit 10

# 3. Check for resource pressure
node $SCRIPT metrics query '100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'
```

### Scenario: "Verify deployment — did error rate drop?"

```bash
# 1. Check error rate before and after deployment
node $SCRIPT metrics range 'sum(rate(http_requests_total{status=~"5.."}[5m])) by (job)' --start 4h --step 5m

# 2. Check recent error logs
node $SCRIPT logs query '_stream:{app="api"} _level:error' --start 1h --limit 20

# 3. Verify trace success rate
node $SCRIPT traces search --service api --tags '{"error":"true"}' --start 1h --limit 10
```

---

## Important Notes

- **Cluster paths**: If the environment URL already includes `/select/0/prometheus`, do not add it again. The script appends API paths directly to the base URL.
- **LogsQL syntax**: Uses `_stream:{label="value"}` for stream filtering. Combine with `|` for pipes and `_time:<duration>` for relative time.
- **Jaeger API compatibility**: VictoriaTraces uses Jaeger-compatible API. Durations use Go format (`500ms`, `1s`, `5m`). Tags are JSON objects.
- **Time ranges**: For debugging, start with `--start 1h` and narrow down. For deployment verification, use wider ranges like `--start 24h`.
- **Output**: Default output is formatted JSON. Use `--raw` for raw API response or piping to other tools.
