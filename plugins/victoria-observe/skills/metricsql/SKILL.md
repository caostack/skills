---
name: metricsql
description: MetricsQL query language reference for VictoriaMetrics-specific features like default_rollup, rollup, outlier detection, resource utilization functions (ru, ttf), time-series transformations, extended aggregations (topk_avg, outliers_iqr), and MetricsQL-only rollup functions. Use when writing queries with VictoriaMetrics extensions or when VictoriaMetrics query semantics (no extrapolation, optional lookbehind) are needed. For standard PromQL syntax and semantics, use the promql skill.
user-invocable: false
---

# MetricsQL Reference

MetricsQL is VictoriaMetrics' query language, backwards-compatible with PromQL with additional features.

## Key Differences from PromQL

- `rate()` and `increase()` account for the last sample before the lookbehind window (no extrapolation)
- `scalar` and `instant vector` are treated the same
- NaN values are removed from output
- Metric names are preserved in functions like `min_over_time()`, `round()`
- Lookbehind window `[d]` can be omitted — auto-set to `step` or `max(step, scrape_interval)`
- `offset` and `@` modifiers can appear anywhere in the query
- Duration suffix is optional (e.g., `rate(m[300])` = `rate(m[5m])`)
- Numeric suffixes: `K`=1000, `Ki`=1024, `M`=1e6, `Mi`=1048576, `G`, `Gi`, `T`, `Ti`

## Selectors

```
# Instant vector
http_requests_total{job="api", status=~"5.."}
{__name__=~"job:.*"}                    # regex on metric name

# Range vector
http_requests_total[5m]                  # last 5 minutes
rate(metric)[1.5m] offset 0.5d          # fractional durations

# Multiple label matchers with "or"
{env="prod",job="a" or env="dev",job="b"}
```

Label matchers: `=` (exact), `!=`, `=~` (regex, fully anchored), `!~`

## Rollup Functions

### Core Rollup Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `rate()` | `rate(http_requests_total[5m])` | Per-second rate over range |
| `irate()` | `irate(http_requests_total[5m])` | Instant rate (last 2 points) |
| `increase()` | `increase(http_requests_total[1h])` | Absolute increase (integer for counters) |
| `delta()` | `delta(temperature[1h])` | Difference for gauges |
| `avg_over_time()` | `avg_over_time(temp[24h])` | Average over range |
| `max_over_time()` | `max_over_time(temp[24h])` | Max over range |
| `min_over_time()` | `min_over_time(temp[24h])` | Min over range |
| `count_over_time()` | `count_over_time(up[5m])` | Count of raw samples |
| `sum_over_time()` | `sum_over_time(temp[1h])` | Sum of values over range |
| `quantile_over_time()` | `quantile_over_time(0.99, latency[5m])` | Quantile over range |
| `median_over_time()` | `median_over_time(temp[1h])` | Median over range |
| `stddev_over_time()` | `stddev_over_time(temp[1h])` | Standard deviation |
| `stdvar_over_time()` | `stdvar_over_time(temp[1h])` | Standard variance |
| `last_over_time()` | `last_over_time(metric[1h])` | Last sample value |
| `first_over_time()` | `first_over_time(metric[1h])` | First sample value |
| `absent_over_time()` | `absent_over_time(up[5m])` | 1 if no data (alerting) |
| `present_over_time()` | `present_over_time(up[5m])` | 1 if has data |
| `predict_linear()` | `predict_linear(metric[1h], 3600)` | Linear prediction |
| `deriv()` | `deriv(metric[1h])` | Per-second derivative |
| `holt_winters()` | `holt_winters(m[1h], 0.5, 0.5)` | Double exponential smoothing |

### Conditional Count Rollup Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `count_eq_over_time()` | `count_eq_over_time(status[5m], 200)` | Count samples equal to value |
| `count_ne_over_time()` | `count_ne_over_time(status[5m], 200)` | Count samples not equal |
| `count_gt_over_time()` | `count_gt_over_time(latency[5m], 1)` | Count samples greater than |
| `count_le_over_time()` | `count_le_over_time(latency[5m], 0.5)` | Count samples less or equal |
| `count_values_over_time()` | `count_values_over_time("value", temp[1h])` | Count unique values |
| `distinct_over_time()` | `distinct_over_time(status[1h])` | Number of unique values |
| `sum_eq_over_time()` | `sum_eq_over_time(metric[1h], 1)` | Sum of values equal to |
| `sum_gt_over_time()` | `sum_gt_over_time(metric[1h], 0)` | Sum of values greater than |
| `sum_le_over_time()` | `sum_le_over_time(metric[1h], 100)` | Sum of values less or equal |

### Share Rollup Functions (SLI/SLO)

| Function | Example | Purpose |
|----------|---------|---------|
| `share_eq_over_time()` | `share_eq_over_time(up[24h], 1)` | Share of time equal to value |
| `share_le_over_time()` | `share_le_over_time(latency[1h], 0.5)` | Share of time below threshold |
| `share_gt_over_time()` | `share_gt_over_time(up[24h], 0)` | Service availability (SLI) |

### Changes and Derivatives

| Function | Example | Purpose |
|----------|---------|---------|
| `changes()` | `changes(metric[5m])` | Number of value changes |
| `changes_prometheus()` | `changes_prometheus(metric[5m])` | Changes (Prometheus semantics) |
| `increases_over_time()` | `increases_over_time(metric[5m])` | Count of value increases |
| `decreases_over_time()` | `decreases_over_time(metric[5m])` | Count of value decreases |
| `deriv_fast()` | `deriv_fast(metric[5m])` | Fast derivative (first/last points) |
| `ideriv()` | `ideriv(metric[5m])` | Instant derivative (last 2 points) |
| `idelta()` | `idelta(metric[5m])` | Difference (last 2 points) |
| `integrate()` | `integrate(metric[1h])` | Integral over range |

### Prometheus Compatibility Variants

| Function | Example | Purpose |
|----------|---------|---------|
| `increase_prometheus()` | `increase_prometheus(m[1h])` | Increase (Prometheus semantics) |
| `increase_pure()` | `increase_pure(m[1h])` | Pure increase (assumes from 0) |
| `delta_prometheus()` | `delta_prometheus(m[1h])` | Delta (Prometheus semantics) |
| `rate_prometheus()` | `rate_prometheus(m[5m])` | Rate (Prometheus semantics) |

### Time-based Rollup Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `timestamp()` | `timestamp(up[5m])` | Timestamp of last sample (seconds) |
| `timestamp_with_name()` | `timestamp_with_name(up[5m])` | Timestamp (preserves metric name) |
| `tfirst_over_time()` | `tfirst_over_time(up[1h])` | Timestamp of first sample |
| `tlast_over_time()` | `tlast_over_time(up[5m])` | Alias for timestamp() |
| `tlast_change_over_time()` | `tlast_change_over_time(up[1h])` | Timestamp of last change |
| `tmax_over_time()` | `tmax_over_time(temp[1h])` | Timestamp of max value |
| `tmin_over_time()` | `tmin_over_time(temp[1h])` | Timestamp of min value |
| `duration_over_time()` | `duration_over_time(up[1h], 60)` | Duration present (with max interval) |
| `lifetime()` | `lifetime(up[1h])` | Duration between first and last sample |
| `lag()` | `lag(up[5m])` | Duration from last sample to now |
| `scrape_interval()` | `scrape_interval(up[5m])` | Average interval between samples |

### Histogram Rollup Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `histogram_over_time()` | `histogram_over_time(temp[24h])` | VM histogram over gauges |
| `quantiles_over_time()` | `quantiles_over_time("phi", 0.5, 0.99, m[5m])` | Multiple quantiles |

### Statistics and Anomaly Detection

| Function | Example | Purpose |
|----------|---------|---------|
| `mad_over_time()` | `mad_over_time(temp[1h])` | Median absolute deviation |
| `geomean_over_time()` | `geomean_over_time(temp[1h])` | Geometric mean |
| `mode_over_time()` | `mode_over_time(status[1h])` | Most frequent value |
| `outlier_iqr_over_time()` | `outlier_iqr_over_time(temp[1h])` | Detect outliers (IQR method) |
| `zscore_over_time()` | `zscore_over_time(temp[1h])` | Z-score for anomaly detection |
| `hoeffding_bound_lower()` | `hoeffding_bound_lower(0.95, temp[1h])` | Lower Hoeffding bound |
| `hoeffding_bound_upper()` | `hoeffding_bound_upper(0.95, temp[1h])` | Upper Hoeffding bound |

### Elevation Rollup Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `ascent_over_time()` | `ascent_over_time(altitude[1h])` | Total elevation gain |
| `descent_over_time()` | `descent_over_time(altitude[1h])` | Total elevation loss |
| `range_over_time()` | `range_over_time(temp[1h])` | Max - min |

### Multi-Rollup Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `aggr_over_time()` | `aggr_over_time(("min","max","rate"), m[5m])` | Run multiple rollups |

### Special Rollup Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `default_rollup()` | `default_rollup(metric[5m])` | Last value (handles staleness) |
| `resets()` | `resets(counter[1h])` | Counter reset count |
| `stale_samples_over_time()` | `stale_samples_over_time(up[1h])` | Count of stale markers |
| `sum2_over_time()` | `sum2_over_time(temp[1h])` | Sum of squares |

### Extended Rollup Functions (return series with rollup label)

| Function | Example | Purpose |
|----------|---------|---------|
| `rollup()` | `rollup(temp[5m])` | Returns min, max, avg with `rollup` label |
| `rollup_candlestick()` | `rollup_candlestick(price[5m])` | OHLC (open, high, low, close) |
| `rollup_delta()` | `rollup_delta(temp[5m])` | Min/max/avg of differences |
| `rollup_deriv()` | `rollup_deriv(temp[5m])` | Min/max/avg of derivatives |
| `rollup_increase()` | `rollup_increase(counter[5m])` | Min/max/avg of increases |
| `rollup_rate()` | `rollup_rate(counter[5m])` | Min/max/avg of rates |
| `rollup_scrape_interval()` | `rollup_scrape_interval(up[5m])` | Min/max/avg of intervals |
| `rate_over_sum()` | `rate_over_sum(temp[5m])` | Rate over sum of values |

All rollup functions accept optional `keep_metric_names` modifier.

## Aggregation Operators

### Core Aggregation Functions

```
sum by (job) (rate(http_requests_total[5m]))
avg by (instance) (node_cpu_seconds_total)
count by (status) (http_requests_total)
min by (job) (temperature)
max by (job) (temperature)
```

### Percentile Functions

```
quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
quantiles("phi", 0.5, 0.9, 0.99, rate(bucket[5m]))
histogram_quantile(0.99, sum(rate(bucket[5m])) by (le))
topk(10, sum by (job) (rate(http_requests_total[5m])))
bottomk(10, sum by (job) (rate(http_requests_total[5m])))
```

### Extended Top/Bottom Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `topk_avg()` | `topk_avg(5, sum(x) by (job))` | Top by average value |
| `topk_max()` | `topk_max(5, sum(x) by (job))` | Top by maximum value |
| `topk_min()` | `topk_min(5, sum(x) by (job))` | Top by minimum value |
| `topk_median()` | `topk_median(5, sum(x) by (job))` | Top by median value |
| `topk_last()` | `topk_last(5, sum(x) by (job))` | Top by last value |
| `bottomk_avg()` | `bottomk_avg(5, sum(x) by (job))` | Bottom by average |
| `bottomk_max()` | `bottomk_max(5, sum(x) by (job))` | Bottom by maximum |
| `bottomk_min()` | `bottomk_min(5, sum(x) by (job))` | Bottom by minimum |
| `bottomk_median()` | `bottomk_median(5, sum(x) by (job))` | Bottom by median |
| `bottomk_last()` | `bottomk_last(5, sum(x) by (job))` | Bottom by last value |

### Statistical Aggregation Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `stddev()` | `stddev(latency) by (job)` | Standard deviation |
| `stdvar()` | `stdvar(latency) by (job)` | Variance |
| `geomean()` | `geomean(values) by (job)` | Geometric mean |
| `mad()` | `mad(values) by (job)` | Median absolute deviation |
| `mode()` | `mode(status) by (job)` | Most frequent value |
| `zscore()` | `zscore(latency) by (job)` | Z-score (anomaly detection) |

### Counting and Grouping

| Function | Example | Purpose |
|----------|---------|---------|
| `count_values()` | `count_values("val", status)` | Count per distinct value |
| `distinct()` | `distinct(status) by (job)` | Count unique values |
| `group()` | `group(up) by (job)` | Return 1 per group |
| `any()` | `any(up) by (job)` | Return one series per group |
| `limitk()` | `limitk(5, up) by (job)` | Limit to k series per group |

### Anomaly Detection Aggregation

| Function | Example | Purpose |
|----------|---------|---------|
| `outliers_iqr()` | `outliers_iqr(temp) by (dc)` | Find outliers (IQR method) |
| `outliers_mad()` | `outliers_mad(3, temp) by (dc)` | Find outliers (MAD method) |
| `outliersk()` | `outliersk(5, temp) by (dc)` | Top k by std deviation |

### Histogram and Share

| Function | Example | Purpose |
|----------|---------|---------|
| `histogram()` | `histogram(latency) by (job)` | Create VM histogram |
| `share()` | `share(rate(b[5m])) by (le)` | Normalize to [0,1] |

### Other Aggregation Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `sum2()` | `sum2(values) by (job)` | Sum of squares |
| `share()` | `share(metric) by (labels)` | Share of total (sums to 1) |

`by()` groups by specified labels. `without()` groups by all except specified. Supports `limit N` suffix.

## Binary Operators

```
# Arithmetic: + - * / % ^
rate(errors[5m]) / rate(total[5m]) * 100

# Comparison: == != > < >= <=
# Use _bool suffix for 0/1 output
http_requests_total{status=~"5.."} > bool 0

# Special: default (fill gaps), if (filter), ifnot (exclude)
q1 default q2        # fill gaps in q1 with q2 values
q1 if q2              # keep q1 values only where q2 has data
```

### Vector Matching (for binary ops between vectors)

```
# on() / ignoring() - restrict which labels to match
q1 + on(job) q2                    # match only on job label
q1 + ignoring(instance) q2         # match on all labels except instance

# group_left / group_right - many-to-one / one-to-many
q1 + on(job) group_left q2         # many-to-one (left has more labels)
q1 + on(job) group_left(env) q2    # include extra labels from right side
```
See the `promql` skill for detailed vector matching examples.

## Transform Functions

### Math Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `abs()` | `abs(delta(temp[1h]))` | Absolute value |
| `ceil()` | `ceil(1.23)` | Round up to integer |
| `floor()` | `floor(1.23)` | Round down to integer |
| `round()` | `round(1.23, 0.1)` | Round to nearest multiple |
| `sqrt()` | `sqrt(x)` | Square root |
| `exp()` | `exp(x)` | e^x |
| `ln()` | `ln(x)` | Natural logarithm |
| `log2()` | `log2(x)` | Log base 2 |
| `log10()` | `log10(x)` | Log base 10 |
| `sgn()` | `sgn(x)` | Sign (-1, 0, 1) |

### Trigonometric Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `sin()`, `cos()`, `tan()` | `sin(x)` | Sine, cosine, tangent |
| `asin()`, `acos()`, `atan()` | `asin(x)` | Inverse trig functions |
| `sinh()`, `cosh()`, `tanh()` | `sinh(x)` | Hyperbolic functions |
| `asinh()`, `acosh()`, `atanh()` | `asinh(x)` | Inverse hyperbolic |
| `deg()` | `deg(radians)` | Radians to degrees |
| `rad()` | `rad(degrees)` | Degrees to radians |

### Clamping and Rounding

| Function | Example | Purpose |
|----------|---------|---------|
| `clamp()` | `clamp(temp, 0, 100)` | Bound values between min/max |
| `clamp_min()` | `clamp_min(temp, 0)` | Minimum bound |
| `clamp_max()` | `clamp_max(temp, 100)` | Maximum bound |

### Random Numbers

| Function | Example | Purpose |
|----------|---------|---------|
| `rand()` | `rand()` | Random [0,1) with optional seed |
| `rand_normal()` | `rand_normal()` | Normal distribution |
| `rand_exponential()` | `rand_exponential()` | Exponential distribution |

### Constants and Time Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `pi()` | `pi()` | Pi constant |
| `time()` | `time()` | Current timestamp (per point) |
| `now()` | `now()` | Current timestamp (scalar) |
| `start()` | `start()` | Query range start timestamp |
| `end()` | `end()` | Query range end timestamp |
| `step()` | `step()` | Query step value in seconds |
| `timezone_offset()` | `timezone_offset("America/NY")` | Timezone offset in seconds |

### Date/Time Extraction

| Function | Example | Purpose |
|----------|---------|---------|
| `year()` | `year(time())` | Year from timestamp |
| `month()` | `month(time())` | Month [1-12] |
| `day_of_month()` | `day_of_month(time())` | Day of month [1-31] |
| `day_of_week()` | `day_of_week(time())` | Day of week [0-6] |
| `day_of_year()` | `day_of_year(time())` | Day of year [1-366] |
| `days_in_month()` | `days_in_month(time())` | Days in month [28-31] |
| `hour()` | `hour(time())` | Hour [0-23] |
| `minute()` | `minute(time())` | Minute [0-59] |

### Histogram Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `histogram_quantile()` | `histogram_quantile(0.99, buckets)` | Percentile from buckets |
| `histogram_quantiles()` | `histogram_quantiles("phi", 0.5, 0.99, b)` | Multiple quantiles |
| `histogram_share()` | `histogram_share(0.5, buckets)` | Share below value |
| `histogram_avg()` | `histogram_avg(buckets)` | Average from histogram |
| `histogram_stddev()` | `histogram_stddev(buckets)` | Std deviation from histogram |
| `histogram_stdvar()` | `histogram_stdvar(buckets)` | Variance from histogram |
| `prometheus_buckets()` | `prometheus_buckets(vmrange_buckets)` | Convert to Prometheus format |
| `buckets_limit()` | `buckets_limit(10, buckets)` | Limit bucket count |

### Range Transform Functions (operate over query range)

| Function | Example | Purpose |
|----------|---------|---------|
| `range_avg()` | `range_avg(temp)` | Average over range |
| `range_sum()` | `range_sum(temp)` | Sum over range |
| `range_min()` | `range_min(temp)` | Min over range |
| `range_max()` | `range_max(temp)` | Max over range |
| `range_median()` | `range_median(temp)` | Median over range |
| `range_stddev()` | `range_stddev(temp)` | Standard deviation |
| `range_stdvar()` | `range_stdvar(temp)` | Variance |
| `range_mad()` | `range_mad(temp)` | Median absolute deviation |
| `range_first()` | `range_first(temp)` | First value in range |
| `range_last()` | `range_last(temp)` | Last value in range |
| `range_quantile()` | `range_quantile(0.99, temp)` | Quantile over range |
| `range_linear_regression()` | `range_linear_regression(temp)` | Linear regression |
| `range_normalize()` | `range_normalize(q1, q2)` | Normalize to [0,1] |
| `range_zscore()` | `range_zscore(temp)` | Z-score over range |

### Range Transform - Outlier Detection

| Function | Example | Purpose |
|----------|---------|---------|
| `range_trim_outliers()` | `range_trim_outliers(3, temp)` | Remove outliers (MAD-based) |
| `range_trim_spikes()` | `range_trim_spikes(0.1, temp)` | Remove top 10% spikes |
| `range_trim_zscore()` | `range_trim_zscore(3, temp)` | Remove outliers (z-score) |

### Running/Window Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `running_avg()` | `running_avg(temp)` | Running average |
| `running_sum()` | `running_sum(temp)` | Running sum |
| `running_min()` | `running_min(temp)` | Running minimum |
| `running_max()` | `running_max(temp)` | Running maximum |

### Gap Filling

| Function | Example | Purpose |
|----------|---------|---------|
| `interpolate()` | `interpolate(temp)` | Fill gaps with linear interpolation |
| `keep_last_value()` | `keep_last_value(temp)` | Fill gaps with last value |
| `keep_next_value()` | `keep_next_value(temp)` | Fill gaps with next value |
| `drop_empty_series()` | `drop_empty_series(q)` | Remove empty series |

### Sorting

| Function | Example | Purpose |
|----------|---------|---------|
| `sort()` | `sort(temp)` | Sort ascending by last value |
| `sort_desc()` | `sort_desc(temp)` | Sort descending by last value |

### Series and Scalar Conversion

| Function | Example | Purpose |
|----------|---------|---------|
| `scalar()` | `scalar(metric)` | Convert to scalar (single series) |
| `vector()` | `vector(x)` | No-op (compatibility) |
| `limit_offset()` | `limit_offset(10, 5, q)` | Pagination (skip 5, limit 10) |

### Combining Queries

| Function | Example | Purpose |
|----------|---------|---------|
| `union()` | `union(q1, q2)` | Combine series (or use `(q1, q2)`) |

### Special Transform Functions

| Function | Example | Purpose |
|----------|---------|---------|
| `absent()` | `absent(metric)` | Return 1 if no results |
| `smooth_exponential()` | `smooth_exponential(temp, 0.5)` | Exponential smoothing |
| `remove_resets()` | `remove_resets(counter)` | Remove counter resets |
| `ru()` | `ru(free, max)` | Resource utilization % |
| `ttf()` | `ttf(disk_free)` | Time to resource exhaustion |
| `bitmap_and()` | `bitmap_and(q, mask)` | Bitwise AND with mask |
| `bitmap_or()` | `bitmap_or(q, mask)` | Bitwise OR with mask |
| `bitmap_xor()` | `bitmap_xor(q, mask)` | Bitwise XOR with mask |

All transform functions accept optional `keep_metric_names` modifier.

## Label Manipulation Functions

### Basic Label Operations

| Function | Example | Purpose |
|----------|---------|---------|
| `alias()` | `alias(up, "alive")` | Rename all series to given name |
| `label_set()` | `label_set(up, "env", "prod")` | Set label values |
| `label_del()` | `label_del(up, "instance")` | Delete labels |
| `label_keep()` | `label_keep(up, "job", "env")` | Keep only specified labels |
| `label_copy()` | `label_copy(q, "src", "dst")` | Copy label values |
| `label_move()` | `label_move(q, "src", "dst")` | Move label values |

### Label Transformation

| Function | Example | Purpose |
|----------|---------|---------|
| `label_replace()` | `label_replace(up, "foo", "bar-$1", "job", "(.+)")` | Regex-based replace (PromQL) |
| `label_transform()` | `label_transform(q, "label", "from", "to")` | Transform label values |
| `label_join()` | `label_join(up, "foo", "-", "a", "b")` | Join labels with separator (PromQL) |
| `label_uppercase()` | `label_uppercase(q, "env")` | Uppercase label values |
| `label_lowercase()` | `label_lowercase(q, "env")` | Lowercase label values |

### Label Matching and Filtering

| Function | Example | Purpose |
|----------|---------|---------|
| `label_match()` | `label_match(rollup(..), "rollup", "avg")` | Keep series matching regex |
| `label_mismatch()` | `label_mismatch(rollup(..), "r", "avg")` | Drop series matching regex |
| `label_map()` | `label_map(q, "env", "dev", "prod")` | Map label values |
| `labels_equal()` | `labels_equal(q, "label1", "label2")` | Series where labels equal |

### Label Sorting

| Function | Example | Purpose |
|----------|---------|---------|
| `sort_by_label()` | `sort_by_label(up, "job")` | Sort by label values (ascending) |
| `sort_by_label_desc()` | `sort_by_label_desc(up, "job")` | Sort by label values (descending) |
| `sort_by_label_numeric()` | `sort_by_label_numeric(up, "port")` | Sort by numeric value |
| `sort_by_label_numeric_desc()` | `sort_by_label_numeric_desc(up, "port")` | Sort by numeric value (desc) |

### Special Label Operations

| Function | Example | Purpose |
|----------|---------|---------|
| `label_graphite_group()` | `label_graphite_group({__graphite__="foo.*"}, 0)` | Extract Graphite groups |
| `label_value()` | `label_value(foo, "bar")` | Return numeric label value |
| `drop_common_labels()` | `drop_common_labels(q1, q2)` | Drop common labels across queries |

## WITH Templates

```
WITH (commonPrefix="long_metric_prefix_")
  {__name__=commonPrefix+"suffix1"} / {__name__=commonPrefix+"suffix2"}
```

## Subqueries

```
max_over_time(rate(http_requests_total[5m])[1h:30s])
```

Syntax: `<instant_query> '[' <range> ':' [<resolution>] ']'`

## HTTP API Endpoints

See the `victoriametrics-api` skill for HTTP endpoint details and query parameters.

## Common Query Patterns

```
# Error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100

# P99 latency
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# CPU usage %
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage %
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# Availability (uptime)
avg_over_time(up[24h]) * 100
```
