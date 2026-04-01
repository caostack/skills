---
name: logsql
description: LogsQL query language reference for VictoriaLogs. This skill should be used when writing LogsQL queries, searching logs in VictoriaLogs, filtering log streams, using pipe operators for log aggregation, building log analysis queries with stats/sort/fields pipes, or understanding LogsQL filter syntax including word search, regex, and field-level filters.
user-invocable: false
---

# LogsQL Reference

LogsQL is VictoriaLogs' query language for log data. Uses pipe-based syntax: `[filters] [| pipe_action ...]`

## Special Fields

| Field | Description |
|-------|-------------|
| `_msg` | Log message body (default target for word/phrase searches) |
| `_time` | Timestamp of the log entry |
| `_stream` | Log stream label set, e.g. `{app="nginx",host="srv1"}` |
| `_stream_id` | Internal stream identifier |

## Filters

### Stream Selector
```
_stream:{app="api"}
_stream:{app="nginx",instance="host-123"}
{app="api"}                      # _stream: prefix is optional
```
Operators: `=`, `!=`, `=~` (regex), `!~`, `in("a","b")`, `not_in("a","b")`

### Time Range
```
_time:5m                         # last 5 minutes
_time:1h                         # last 1 hour
_time:2.5d15m42s                 # compound duration
_time:>1h                        # older than 1 hour ago
_time:1y                         # last year
_time:100ns                      # last 100 nanoseconds
_time:2023-04-25Z                # absolute date
_time:2023-04-25T10:00Z          # absolute datetime
_time:[2023-04-25T10:00Z, 2023-04-25T18:00Z]  # absolute range
_time:day_range[08:00, 18:00]    # per-day time window (business hours)
_time:week_range[Mon, Fri]       # weekday range (workdays only)
```
Duration units: `ns`, `us`, `ms`, `s`, `m`, `h`, `d`, `w`, `y` (365 days). Compound: `1h33m55s`

### Word and Phrase Search
```
error                            # word "error" in _msg
log.level:error                  # word "error" in log.level field
i(error)                         # case-insensitive word search
"connection refused"             # exact phrase in _msg
i("connection refused")          # case-insensitive phrase
```

### Logical Operators
```
error AND warning                # both must match (AND is optional)
error _time:5m                   # implicit AND
error OR warning                 # either matches
NOT error                        # exclude
-error                           # NOT (shorthand)
(error OR warning) _time:5m      # parentheses for grouping
```
Precedence: `NOT` > `AND` > `OR`

### Field-Level Filters
```
log.level:error                  # word in field
log.level:="error"               # exact match
log.level:in("error","fatal")    # multi-value exact match
log.level:not_in("debug","trace") # not in list
response_size:>10KiB             # numeric comparison
response_size:>=1MiB             # greater or equal
duration:range(0, 60)            # in range (exclusive)
size:range[1, 100]               # in range (inclusive bounds)
app:~"nginx|apache"              # regex on field
user.ip:ipv4_range("10.0.0.0/8") # IPv4 CIDR
user.ipv6:ipv6_range("2001:db8::/112") # IPv6 CIDR
user.name:string_range(A, C)     # string range (A to Z)
field:*                          # field exists
field:""                         # field is empty
-field:*                         # field does not exist
field:len_range(1, 100)          # field length in range
field:value_type(string)         # field has specific type
field1:eq_field(field2)           # fields are equal
field:contains_all("foo", "bar")  # contains all values
field:contains_any("a", "b")      # contains any value
field:json_array_contains_any("x", "y") # JSON array contains value
field:seq("foo", "bar")           # sequence of words/phrases
```

### Regex
```
~"err|warn"                      # regex in _msg (RE2 syntax)
~"(?i)(err|warn)"                # case-insensitive regex
event.original:~"err|warn"       # regex on specific field
```

### Pattern Match
```
pattern_match("user_id=<N>, ip=<IP4>")   # match structured patterns
```
Placeholders: `<N>` (number), `<UUID>`, `<IP4>`, `<TIME>`, `<DATE>`, `<DATETIME>`, `<W>` (word)

### Wildcards and Substrings
```
*                                # match all logs
err*                             # words starting with "err"
*err*                            # contains substring "err"
="exact value"                   # exact match only (no extra text)
="prefix"*                       # value starts with prefix
```

## Pipe Operators

### Stats (Aggregation)
```
| stats count() logs
| stats by (host) count() logs
| stats by (_time:1h) count() logs
| stats by (_time:1m) count() logs, count_uniq(ip) unique_ips
| stats count() if (error) errors, count() total
| stats sum(duration) total_duration
| stats avg(response_size) avg_size
| stats min(latency) min_latency, max(latency) max_latency
| stats median(latency) p50, quantile(0.99, latency) p99
| stats rate() per_second_rate
| stats histogram(response_size) buckets
| stats uniq_values(status_code) statuses
| stats block_stats()                           # stats per matched line/block
| stats period("1m") count() logs               # time bucket with custom period
| stats step("1m") count() logs                 # time bucket with custom step
| stats span("1h") count() logs                 # time bucket with span
| stats alignment("start") count() logs         # align buckets to start
```
Functions: `count()`, `count_uniq(field)`, `count_uniq_hash(field)` (estimated, faster), `count_empty(field)`, `sum(field)`, `avg(field)`, `min(field)`, `max(field)`, `median(field)`, `quantile(phi, field)`, `stddev(field)`, `rate()`, `rate_sum(field)`, `histogram(field)`, `uniq_values(field)`, `values(field)`, `json_values(field)` (JSON array, supports limit/sort), `any(field)`, `sum_len(field)`, `row_any()`, `row_max(field)`, `row_min(field)`, `field_max(maxField, field)`, `field_min(minField, field)`

### Sort and Limit
```
| sort by (_time) desc
| sort by (logs desc)
| sort by (field1, field2) desc   # multi-field sort
| sort by (field) desc limit 10    # sort and limit combined
| limit 10
| offset 100 | limit 50
| first 10 by (duration)           # first N by field
| last 10 by (duration)            # last N by field
| first 10 by (duration) desc      # first N by field (descending)
| last 10 by (duration) asc        # last N by field (ascending)
```

### Field Manipulation
```
| fields host, log.level              # keep only these fields
| delete password, token               # remove fields
| drop_empty_fields                    # remove fields with empty values
| unpack_json                          # parse JSON fields
| unpack_logfmt                        # parse logfmt fields
| unpack_syslog                        # parse syslog (RFC3164/RFC5424)
| unpack_words                         # extract words into JSON array
| extract "ip=<ip> "                   # extract field from _msg
| extract_regexp "(?P<ip>[0-9.]+)"    # extract using RE2 regex
| rename old_name as new_name          # rename field
| copy src as dst                      # copy field
| replace ("old", "new") at field      # replace substrings
| replace_regexp ("\\s+", " ")         # regex replace
| split "," from field as array        # split field into array
| unroll (array_field)                 # expand array into rows
| format "<name>: <name>" as msg       # format fields into string
| pack_json as json_field             # pack fields into JSON
| pack_logfmt as logfmt_field         # pack fields into logfmt
| set_stream_fields field1, field2    # set fields to stream labels
| collapse_nums                        # replace numbers with placeholders
| decolorize                           # remove ANSI color codes
```

### Context
```
| stream_context before 5 after 10    # show surrounding log lines
| stream_context after 10              # show 10 lines after matches
| stream_context before 5              # show 5 lines before matches
| stream_context                       # show all context (no limits)
```

### Analytics and Discovery
```
| facets                              # most frequent values per field
| field_names                         # list available field names
| field_values field_name             # list unique values for field
| query_stats                         # return query execution stats
| top 10 by (_msg)                    # top patterns by field
| uniq by (field)                     # unique values by field
```

### Time Operations
```
| time_add("1h")                      # add duration to _time
| time_add("-30m")                    # subtract duration from _time
| time_trunc("1m")                    # truncate _time to bucket
```

### Sampling
```
| sample 10                           # return ~10 random results
| sample 0.1                          # return ~10% of results
```

### Data Transformations
```
| len field                           # calculate length of field value
| json_array_len field                # length of JSON array field
| hash field                          # hash field value
| generate_sequence("1", "10") as id  # generate sequence numbers
```

### Filtering
```
| filter error                        # apply additional filter
| filter -debug                       # exclude matches
```

### Join and Union
```
| join by (user_id) (...)             # join with subquery
| union (subquery)                    # combine results
```

### Running and Cumulative Stats
```
| running_stats sum(logs) as total    # running sum
| running_stats avg(value) as avg_val # running average
| total_stats sum(logs) as grand_total # total across all results
```

### Compact Output
```
| compact                             # compact output format
```

## Query Options

```
options(concurrency=4) error _time:1h              # limit CPU cores per query
options(parallel_readers=8) error _time:1h         # parallel data readers
options(ignore_global_time_filter=true) error       # skip global time filter injection
options(allow_partial_response=true) error          # partial results on node failure
options(time_offset=7d) _time:1h error             # shift query time window by offset
```

## Common Query Patterns

```
# Recent errors from a specific app
{app="api"} error _time:30m | limit 100

# Error count per hour
error | stats by (_time:1h) count() logs

# Top hosts by error count
error | stats by (host) count() logs | sort by (logs desc) | limit 10

# Filter + phrase + time range
{app="payment"} "connection refused" _time:1h

# Extract IP addresses from logs
| extract "client_ip=<ip> " | stats by (client_ip) count() logs

# Multi-field stats
_time:5m log.level:* | stats by (log.level) count() logs

# P95 latency percentile
_time:1h | stats quantile(0.95, latency) p95_latency

# Time series of error rates
error | stats by (_time:5m) rate() errors_per_sec

# Unique user count
_time:1h | stats count_uniq(user_id) unique_users

# Field value enumeration
_time:1h | stats uniq_values(status_code) status_codes

# Histogram of response sizes
_time:1h | stats histogram(response_size)

# Find logs with specific JSON field
| unpack_json | filter status_code:>=500

# Conditional aggregation
_time:1h | stats count() if (status:~"5..") server_errors, count() total

# Running totals
_time:1h | stats by (_time:1m) count() as hits | running_stats sum(hits) as running_hits

# Pattern extraction with regex
| extract_regexp "status=(?P<status>\\d+)" from _msg

# String transformations
| replace ("secret", "***") at _msg
| replace_regexp ("\\d{3,}", "[REDACTED]") at phone

# Log sample with context
error _time:1h | stream_context before 3 after 3 | limit 50

# Top patterns (collapse numbers first)
_time:1h | collapse_nums | top 10 by (_msg)

# Filter by value type
user_id:value_type(uint64)         # only numeric user IDs
timestamp:value_type(iso8601)     # only timestamp fields

# Field operations
| copy _time as timestamp
| rename _msg as message
| delete temp_field
| fields keep_field1, keep_field2   # same as "fields"

# Math operations on numeric fields
| math round(duration_ms / 1000) as duration_sec

# Discover available fields
_time:1h | field_names

# Get most frequent values (facets)
_time:1h | facets

# Sample random logs
error _time:1h | sample 100

# Field value discovery
_time:1h | field_values log.level

# Time manipulation
| time_add("-1h")                     # shift timestamps back 1 hour

# Generate sequence numbers
| generate_sequence("1", "100") as seq_id

# Calculate field length
| len _msg as msg_length

# Hash field values
| hash user_ip as ip_hash

# Get unique values
| uniq by (user_id)

# Compact output for large results
error _time:1h | compact | limit 1000
```

## Advanced Features

### Subqueries
```
# Filter based on another query's results
user_id:in(_time:1d admin | fields user_id)

# Contains_all with subquery
_msg:contains_all(_time:1h critical | fields pattern)

# Join two queries
_time:1d {app="app1"} | stats by (user) count() app1_hits
  | join by (user) (_time:1d {app="app2"} | stats by (user) count() app2_hits)

# Union (combine results)
_time:1h error | union (_time:1d fatal)
```

### Time Bucketing
```
stats by (_time:1m)           # per-minute buckets
stats by (_time:1h)           # per-hour buckets
stats by (_time:1d)           # per-day buckets
stats by (_time:5m offset 2h) # with timezone offset
```

### Conditional Pipes
```
| extract if (ip:"") "ip=<ip> "           # only if field missing
| unpack_json if (json_field:*)         # only if field exists
| replace if (env="prod") ("dev", "prod") at env
```

## Performance Tips

- Always include `_time` filter to limit scan range
- Use stream filters `{app="value"}` for faster queries
- Put selective filters before expensive ones (regex before stats)
- Use `fields` pipe to reduce columns read from disk
- Consider `sample N` for large result sets
- Use `count_uniq_hash` instead of `count_uniq` for large cardinality

## Notes

- Use the `/select/logsql/streams` endpoint (see `victorialogs-api` skill) to discover available stream labels
- Use the `/select/logsql/field_names` endpoint (see `victorialogs-api` skill) to discover available fields for filtering
- Common OTel field names: `severity`, `service.name`, `otelTraceID`, `otelSpanID`
- Numeric values support short format: `1KiB`, `5MB`, `2GiB` (B, K/KB, M/MB, G/GB, Ki/KiB, Mi/MiB, Gi/GiB)
- String literals: double-quoted `"text"`, single-quoted `'text'`, backtick `` `text` `` (no escaping needed)
