---
name: capability-trainer
description: Guide learning and mastery of new capabilities through hands-on practice. Use when user wants to become proficient in a domain, learn a skill, or mentions "train", "learn", "master", "become expert" in any capability. Automatically detects learning depth (quick/practical/expert) and adapts the process. Creates learning workspace, guides practice, and internalizes knowledge into memory.
---

# Capability Trainer

Learn new capabilities through hands-on practice. Not theory — practice.

## Core Principle

**Learning = Practice Loop, Not Theory Accumulation**

```
Understand Goal → Practice → Assess → Improve → Internalize
```

- Templates can't cover every domain
- Real mastery = can produce quality work independently
- Internalize only what's stable and reusable

## Detect Learning Depth

Based on user's intent, choose appropriate depth:

| Depth | Goal | Time | Trigger Phrases |
|-------|------|------|-----------------|
| **Quick** | Use it with docs handy | 20-60 min | "学会用X", "了解X", "quick start", "basics of" |
| **Practical** | Work independently | 2-4 hours | "掌握X", "熟悉X", "get good at", "practical use" |
| **Expert** | Teach others | 1-3 days+ | "成为X专家", "精通X", "become expert", "deep dive" |

**When uncertain**: Ask user: "你想达到什么程度？快速了解(20分钟)、实用掌握(2小时)、还是专家级别(深入学习)？"

## Directory Structure

```
~/.claude/
├── learning/<capability>/
│   ├── quick-note.md          # Quick: reference card
│   └── mastery/               # Practical: learning records
│       ├── notes.md           # Concepts & resources
│       ├── practice.md        # Tasks & results
│       └── artifacts/         # Practice outputs
└── memory/
    └── capabilities.md        # Internalized knowledge
```

Create directories as needed.

## Quick Learning (20-60 min)

**Goal**: Use it with reference docs available

### Process

1. **Search core documentation**
   - Use web_search for official docs
   - Or ask user for preferred source
   - Focus on "getting started" or "quickstart"

2. **Create quick-reference note**
   ```bash
   ~/.claude/learning/<capability>/quick-note.md
   ```
   Include:
   - What it is (1 sentence)
   - Common use cases (3-5 bullets)
   - Basic usage pattern (code example or steps)
   - Gotchas to watch for
   - Reference links

3. **Verify with 1-2 simple exercises**
   - Pick basic examples from docs
   - Actually run them
   - Note what worked/what didn't

4. **Output**: quick-note.md

**Example** (learning `sed`):
```markdown
# sed Quick Reference

**What**: Stream editor for text transformation

**Common uses**:
- Find and replace text
- Delete lines matching pattern
- Insert/delete lines by number

**Basic pattern**:
```bash
sed 's/find/replace/g' file.txt    # substitute
sed '/pattern/d' file.txt           # delete matching lines
sed '5d' file.txt                   # delete line 5
```

**Gotchas**:
- Use -i to edit in-place (otherwise prints to stdout)
- Patterns are basic regex by default
- Escape special chars: \. \* \/

**References**: [GNU sed manual](link)
```

## Practical Mastery (2-4 hours)

**Goal**: Work independently on common tasks

### Process

1. **Collect resources systematically**
   - 2-3 authoritative sources (official docs, tutorials)
   - Note source credibility
   - Skip marketing content

2. **Create learning notes**
   ```bash
   ~/.claude/learning/<capability>/mastery/notes.md
   ```
   Include:
   - Learning objectives (from user or search)
   - Core concepts (not full tutorial)
   - How-to knowledge (actions, not theory)
   - Resource links with notes

3. **Design practice tasks**
   - 3-5 tasks covering common scenarios
   - Each independently verifiable
   - Progress from simple to complex
   - Record to `practice.md`

4. **Execute practice**
   - Work in `artifacts/` directory
   - Document process, issues, solutions
   - Focus on understanding, not perfection

5. **Simple self-check**
   - Use checklist, not scoring
   - Can I do X without looking it up?
   - What did I miss?
   - What needs more practice?

6. **Save learning record**

**Example tasks** (learning Git workflow):
```
Task 1: Create repo, add file, commit
Task 2: Create branch, make changes, merge
Task 3: Simulate conflict, resolve it
Task 4: Check history, undo last commit
```

## Expert Level (1-3 days+)

**Goal**: Deep mastery, can teach others

Use this only when user explicitly wants expert level. Process mirrors Practical Mastery but with:

- **More extensive practice** (7+ tasks, edge cases)
- **Multiple assessment cycles** (practice → assess → improve → repeat)
- **Simpler evaluation** (see below)
- **Internalization** (write to memory)

### Evaluation (Simplified)

Skip complex scoring. Use checklist:

```
Can I:
□ Explain core concepts clearly?
□ Work independently without docs?
□ Handle common edge cases?
□ Debug my own mistakes?
□ Apply to new scenarios?
```

If any box is unchecked → identify gaps → practice those areas → reassess.

**Repeat until confident**, not until arbitrary "90 points".

### Internalization

When confident, extract to `~/.claude/memory/capabilities.md`:

```markdown
## [Capability] Core Knowledge

**Principle**: [Key insight]

**Common patterns**:
1. Pattern 1
2. Pattern 2

**Gotchas**:
- Watch out for X
- Y is counterintuitive

**Learning source**: ~/.claude/learning/<capability>/
```

**Internalize only**:
- Stable knowledge (won't change soon)
- Reusable patterns (use across projects)
- Core principles (not every detail)

Keep memory lean. Delete or archive learning directory after internalization.

## Workflow Summary

```
User request → Detect depth → Follow appropriate process
                          ↓
              Quick ← Practical ← Expert
                ↓        ↓          ↓
          quick-note  mastery/  mastery+
                               (internalize)
```

**Key differences**:
- Quick: 1 doc, quick note, 1-2 exercises
- Practical: 2-3 docs, notes + practice, 3-5 tasks
- Expert: Extensive practice, multiple cycles, internalize

## Usage Examples

**User**: "学会用 sed"

**Response**: Quick learning → Create quick-note.md with basics → Verify with 2 examples

---

**User**: "让Claude掌握 Docker"

**Response**: Practical mastery → Create mastery/ directory → Collect docs → Design 5 tasks → Practice → Checklist self-assess

---

**User**: "成为代码审查专家"

**Response**: Expert level → Extensive practice (7+ tasks) → Multiple assessment cycles → Internalize to memory/capabilities.md

## Important Principles

1. **Practice over theory** - Doing once > reading 10 times
2. **Match depth to intent** - Don't over-process simple requests
3. **Simplify evaluation** - Checklist > scoring system
4. **Internalize selectively** - Only stable, reusable knowledge
5. **Global storage** - Use ~/.claude/ for cross-project access

## Reference Templates

Simplified templates are in `references/` directory for reference, but adapt to needs rather than following rigidly.
