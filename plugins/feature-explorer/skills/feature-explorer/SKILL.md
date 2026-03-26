---
name: feature-explorer
description: >-
  This skill should be used when the user asks to "explain how X works",
  "how does X work", "what is the implementation of X", "trace the code for X",
  "show me the call chain of X", "how is X implemented", "how does the X module
  work", "what's the design of X", "walk me through X", or mentions understanding,
  analyzing, or exploring a feature, function, module, mechanism, or design in a
  codebase. Also triggers when the user asks about the architecture, flow, or
  internal workings of a component. Provides a structured analysis of how a feature
  is implemented. Do NOT use for debugging, bug fixing, or modifying code — only
  for understanding and explaining.
argument-hint: "[name of the feature/module to explore, e.g. login flow, payment module]"
context: fork
agent: Explore
---

## Objective

Analyze the implementation of a specified feature in a codebase and produce a structured exploration report.

## Target

$ARGUMENTS

## Exploration Process

### Phase 1: Locate Entry Points

1. Use Glob and Grep to search for relevant files, functions, and classes based on the target keyword.
2. Identify entry points: API endpoints, CLI commands, event listeners, exported functions, etc.
3. If the target is ambiguous (e.g. "the auth system"), list candidate entry points and pick the most relevant one.

### Phase 2: Trace the Call Chain

Starting from the entry point, trace function calls layer by layer:
- Record each key function with **file_path:line_number**
- Summarize what each function does in one sentence
- Identify branching paths (conditional logic that splits execution)
- Stop at the project's own code boundary — when a call enters a third-party library or framework, note the boundary and move on. Do not trace into library internals.
- Keep the call chain to a maximum of 7 levels deep. Fold deeper nesting into "...".

### Phase 3: Map Data Flow

- Where data comes from (user input, database, config, external API)
- How data is transformed and processed
- Where data ultimately goes (response, storage, side effects)

### Phase 4: Identify Key Design Decisions

- Design patterns in use
- Important abstractions and interfaces
- Error handling strategy
- Concurrency/async handling (if applicable)

## Output Format

Use this structure for the report:

```
## Overview
<2-3 sentences summarizing what this feature does and why it exists>

## Call Chain
<Show call relationships with indentation or arrows, annotated with file paths and line numbers>

## Data Flow
<Describe data sources, transformations, and destinations>

## Key Design Decisions
<List important design choices and patterns>

## Files
<Bulleted list of all key file paths (no line numbers — see call chain for those)>
```

## Constraints

- Read-only exploration — do not modify any files.
- Every key reference must include `file_path:line_number`.
- Focus on the core happy path. If the feature is complex, prioritize the primary flow over edge cases.
