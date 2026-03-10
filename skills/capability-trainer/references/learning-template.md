# Learning Directory Templates

Reference templates for different learning depths. Adapt as needed.

## Quick Learning Template

**File**: `~/.claude/learning/<capability>/quick-note.md`

```markdown
# [Capability] Quick Reference

**What**: [One sentence description]

**Common uses**:
- Use case 1
- Use case 2
- Use case 3

**Basic usage**:
\`\`\`[language or bash]
[Example code or command]
\`\`\`

**Gotchas**:
- Gotcha 1
- Gotcha 2

**References**:
- [Source 1](url)
- [Source 2](url)
```

## Practical Mastery Templates

**Directory**:
```
~/.claude/learning/<capability>/mastery/
├── notes.md
├── practice.md
└── artifacts/
```

### notes.md Template

```markdown
# [Capability] Learning Notes

## Learning Objectives

- [ ] Objective 1
- [ ] Objective 2
- [ ] Objective 3

## Core Concepts

### Concept 1
- Key point
- Key point

### Concept 2
- Key point
- Key point

## Common Patterns

1. Pattern for use case A
2. Pattern for use case B

## Gotchas

- Gotcha 1
- Gotcha 2

## Resources

- [Resource 1](url) - Notes about this source
- [Resource 2](url) - Notes about this source
```

### practice.md Template

```markdown
# [Capability] Practice Log

## Tasks

### Task 1: [Task name]
**Goal**: What this task practices

**Steps**:
1. Step 1
2. Step 2

**Result**: Success / Issues encountered

**Artifacts**: artifacts/task1-output.xxx

**Date**: YYYY-MM-DD

---

### Task 2: [Task name]
...

## Summary

**Tasks completed**: X/Y

**Confident areas**: ...

**Needs more practice**: ...

**Next**: ...
```

## Expert Level Additional Files

For expert-level learning, add to `mastery/`:

### assessment.md Template

```markdown
# [Capability] Assessment Record

## Assessment #1
**Date**: YYYY-MM-DD

**Checklist**:
- [x] Can explain concepts
- [ ] Can work independently
- [x] Can handle edge cases

**Gaps identified**:
- Gap 1
- Gap 2

**Improvement plan**:
1. Practice X more
2. Review Y

---

## Assessment #2
**Date**: YYYY-MM-DD

**Checklist**:
- [x] Can explain concepts
- [x] Can work independently
- [x] Can handle edge cases

**Ready to internalize**: Yes/No
```

## Internalization Template

**File**: `~/.claude/memory/capabilities.md`

```markdown
## [Capability Name]

**What it is**: Brief description

**When to use**:
- Scenario A
- Scenario B

**Core patterns**:
1. Pattern name - description
2. Pattern name - description

**Common pitfalls**:
- Pitfall - how to avoid

**Learning source**: ~/.claude/learning/<capability>/
```

## Usage

Create directories as needed:

```bash
# Quick learning
mkdir -p ~/.claude/learning/<capability>

# Practical/Expert mastery
mkdir -p ~/.claude/learning/<capability>/mastery/artifacts
```

Copy and adapt templates. Don't follow rigidly - adjust to what works for the specific capability.
