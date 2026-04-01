---
name: promql
description: PromQL query language fundamentals for Prometheus and Prometheus-compatible systems. Use for understanding PromQL instant/range vectors, label matchers, aggregation operators, offset/@ modifiers, or when targeting non-VictoriaMetrics Prometheus systems. For VictoriaMetrics-specific features like default_rollup, rollup, or outlier detection, use the metricsql skill.
user-invocable: false
---

# PromQL Basics Reference

PromQL (Prometheus Query Language) is a functional query language for selecting and aggregating time series data.

**Cross-references**: See `metricsql` skill for VictoriaMetrics extensions. See `victoriametrics-api` skill for HTTP endpoints.

## Data Types

- **Instant vector**: Set of time series with a single sample per series at one timestamp
- **Range vector**: Set of time series with a range of data points over time
- **Scalar**: Simple numeric floating point value
- **String**: Simple string value (currently unused)

## Time Duration Literals

```
ms  - milliseconds     s - seconds     m - minutes
h   - hours            d - days        w - weeks
y   - years
```

Combined: `1h30m` = 5400s, `12h34m56s` = 45296s

## Instant Vector Selectors

```
http_requests_total                                    # by metric name
http_requests_total{job="prometheus",group="canary"}   # with label filters
http_requests_total{environment=~"staging|testing|development",method!="GET"}
```

Label matchers:
- `=` exact equal
- `!=` not equal
- `=~` regex match (fully anchored: `env=~"foo"` = `env=~"^foo$"`)
- `!~` regex not match

Matching empty string also selects series without that label.

## Range Vector Selectors

```
http_requests_total[5m]                    # last 5 minutes
http_requests_total{job="api"}[1h]         # with label filter
```

Left-open, right-closed interval: excludes left boundary, includes right.

## Offset Modifier

Shifts the evaluation time back for a specific selector:

```
http_requests_total offset 5m
sum(http_requests_total{method="GET"} offset 5m)      # correct
sum(http_requests_total{method="GET"}) offset 5m       # INVALID
rate(http_requests_total[5m] offset 1w)                # rate from a week ago
```

Must follow the selector immediately.

## @ Modifier

Sets an absolute evaluation time (Unix timestamp):

```
http_requests_total @ 1609746000
sum(http_requests_total{method="GET"} @ 1609746000)    # correct
rate(http_requests_total[5m] @ 1609746000)

# Special values
http_requests_total @ start()    # start of query range
rate(http_requests_total[5m] @ end())    # end of query range
```

Works with offset: `http_requests_total @ 1609746000 offset 5m`

## Operators

### Arithmetic: `+ - * / % ^`
```
rate(errors[5m]) / rate(total[5m]) * 100
```

### Comparison: `== != > < >= <=`
```
http_requests_total > 1000
```
Use `_bool` suffix for 0/1 output: `http_requests_total > bool 0`

### Vector Matching

When binary operations combine two vectors, matching behavior determines which series are paired.

#### One-to-One Matching (default)
```
http_requests_total{job="api"} + http_requests_total{job="worker"}
# Series match if all label names/values are identical
```

#### `on()` - Match on Specific Labels
```
# Match only on 'instance' label, ignore 'job'
http_requests_total / on(instance) http_requests_total{job="api"}
```

#### `ignoring()` - Exclude Labels from Matching
```
# Ignore 'job' label during matching
http_requests_total / ignoring(job) http_requests_total{job="api"}
```

#### `group_left` - Many-to-One Matching
Right side must return single series per group. Left side can have multiple.
```
# Calculate per-instance error rate against total
sum(rate(http_requests_total{status=~"5.."}[5m])) by (instance)
  / on(instance) group_left()
sum(rate(http_requests_total[5m])) by (instance)

# With additional labels from "one" side
sum(rate(http_requests_total[5m])) by (job, instance)
  / on(job) group_left(instance)
sum(rate(http_requests_total[5m])) by (job)
```

#### `group_right` - One-to-Many Matching
Left side must return single series per group. Right side can have multiple.
```
sum(rate(http_requests_total[5m])) by (job)
  / on(job) group_right()
sum(rate(http_requests_total{status=~"5.."}[5m])) by (job, instance)
```

## Aggregation Operators

```
sum(http_requests_total) by (job)
avg(node_cpu_seconds_total) by (instance) without (mode)
count(up) by (job)
topk(5, http_requests_total)
bottomk(3, http_requests_total)
```

Operators: `sum`, `avg`, `count`, `min`, `max`, `stddev`, `stdvar`, `topk`, `bottomk`, `quantile`, `count_values`, `group`

## Common Functions

### Range Vector Functions (Rollup)

| Function | Example | Purpose |
|----------|---------|---------|
| `rate()` | `rate(metric[5m])` | Per-second rate over range |
| `irate()` | `irate(metric[5m])` | Instant rate (last 2 points) |
| `increase()` | `increase(metric[1h])` | Increase over range (counters) |
| `delta()` | `delta(metric[1h])` | Difference (gauges) |
| `idelta()` | `idelta(metric[5m])` | Instant difference (last 2 points) |
| `avg_over_time()` | `avg_over_time(m[5m])` | Average over range |
| `max_over_time()` | `max_over_time(m[5m])` | Max over range |
| `min_over_time()` | `min_over_time(m[5m])` | Min over range |
| `count_over_time()` | `count_over_time(m[5m])` | Sample count |
| `sum_over_time()` | `sum_over_time(m[5m])` | Sum over range |
| `stddev_over_time()` | `stddev_over_time(m[5m])` | Standard deviation over range |
| `stdvar_over_time()` | `stdvar_over_time(m[5m])` | Standard variance over range |
| `absent_over_time()` | `absent_over_time(up[5m])` | 1 if no samples in range |
| `present_over_time()` | `present_over_time(up[5m])` | 1 if any samples in range |
| `changes()` | `changes(m[5m])` | Number of changes in range |
| `resets()` | `resets(counter[1h])` | Number of counter resets |
| `predict_linear()` | `predict_linear(m[1h], 3600)` | Linear prediction |
| `deriv()` | `deriv(m[1h])` | Derivative (linear regression) |
| `holt_winters()` | `holt_winters(m[1h], 0.5, 0.5)` | Double exponential smoothing |
| `timestamp()` | `timestamp(up[5m])` | Timestamp of last sample |
| `quantile_over_time()` | `quantile_over_time(0.9, m[5m])` | Quantile over range |

### Instant Vector Transform Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `abs()` | `abs(-5)` | Absolute value |
| `sqrt()` | `sqrt(x)` | Square root |
| `cbrt()` | `cbrt(x)` | Cube root |
| `exp()` | `exp(x)` | e^x |
| `ln()` | `ln(x)` | Natural logarithm |
| `log2()` | `log2(x)` | Log base 2 |
| `log10()` | `log10(x)` | Log base 10 |
| `sgn()` | `sgn(x)` | Sign (-1, 0, 1) |
| `ceil()` | `ceil(1.23)` | Round up |
| `floor()` | `floor(1.23)` | Round down |
| `round()` | `round(1.23, 0.1)` | Round to nearest multiple |
| `clamp()` | `clamp(x, 0, 100)` | Clamp between min/max |
| `clamp_min()` | `clamp_min(x, 0)` | Minimum bound |
| `clamp_max()` | `clamp_max(x, 100)` | Maximum bound |
| `absent()` | `absent(up)` | Return 1 if no results |
| `scalar()` | `scalar(q)` | Convert to scalar (single series) |
| `vector()` | `vector(s)` | Convert scalar to vector |
| `time()` | `time()` | Current timestamp |
| `hour()` | `hour(time())` | Hour [0-23] |
| `minute()` | `minute(time())` | Minute [0-59] |
| `month()` | `month(time())` | Month [1-12] |
| `year()` | `year(time())` | Year |
| `day_of_month()` | `day_of_month(time())` | Day [1-31] |
| `day_of_week()` | `day_of_week(time())` | Weekday [0-6] |
| `day_of_year()` | `day_of_year(time())` | Day [1-365/366] |
| `days_in_month()` | `days_in_month(time())` | Days in month |

### Trigonometric Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `sin()` | `sin(x)` | Sine |
| `cos()` | `cos(x)` | Cosine |
| `tan()` | `tan(x)` | Tangent |
| `asin()` | `asin(x)` | Arc sine |
| `acos()` | `acos(x)` | Arc cosine |
| `atan()` | `atan(x)` | Arc tangent |
| `sinh()` | `sinh(x)` | Hyperbolic sine |
| `cosh()` | `cosh(x)` | Hyperbolic cosine |
| `tanh()` | `tanh(x)` | Hyperbolic tangent |
| `asinh()` | `asinh(x)` | Hyperbolic arc sine |
| `acosh()` | `acosh(x)` | Hyperbolic arc cosine |
| `atanh()` | `atanh(x)` | Hyperbolic arc tangent |
| `deg()` | `deg(radians)` | Radians to degrees |
| `rad()` | `rad(degrees)` | Degrees to radians |

### Label Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `label_replace()` | `label_replace(q, "dst", "val", "src", "re")` | Regex replace label |
| `label_join()` | `label_join(q, "dst", "-", "s1", "s2")` | Join label values |

### Histogram Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `histogram_quantile()` | `histogram_quantile(0.99, rate(b[5m]))` | Quantile from classic buckets |
| `histogram_avg()` | `histogram_avg(b)` | Average from native histogram |
| `histogram_count()` | `histogram_count(b)` | Observation count from native histogram |
| `histogram_sum()` | `histogram_sum(b)` | Observation sum from native histogram |
| `histogram_fraction()` | `histogram_fraction(0, 1, b)` | Fraction of observations in range (native) |
| `histogram_stddev()` | `histogram_stddev(b)` | Std deviation from native histogram |
| `histogram_stdvar()` | `histogram_stdvar(b)` | Variance from native histogram |

### Sorting

| Function | Example | Purpose |
|----------|---------|---------|
| `sort()` | `sort(q)` | Sort ascending by value |
| `sort_desc()` | `sort_desc(q)` | Sort descending by value |

## Subquery

```
<instant_query> '[' <range> ':' [<resolution>] ']' [@ <timestamp>] [offset <duration>]
```

Example: `max_over_time(rate(http_requests_total[5m])[1h:30s])`

## Gotchas

- **Lookback delta**: Default 5 minutes. A series disappears if its last sample is older than this.
- **Staleness**: Series marked stale when no longer exported. They disappear at the staleness marker time.
- **Avoid slow queries**: Start with tabular view, filter sufficiently before graphing. Use recording rules for expensive recurring queries.
- Regex uses RE2 syntax, always fully anchored.
- **Native histograms**: Prometheus 2.40+ supports native histograms with `histogram_avg`, `histogram_count`, `histogram_sum`, `histogram_fraction`, `histogram_stddev`, `histogram_stdvar`.
