# Superpowers Skills — Master Catalog

These skills override default Claude behaviour. Invoke any of them via the `Skill` tool when the situation matches the trigger. **If there's even a 1% chance a skill applies, invoke it.**

## Process Skills (use FIRST — determine HOW to approach)

| Skill | When to Use |
|-------|-------------|
| `superpowers:using-superpowers` | Loaded automatically at session start. Establishes the skill-invocation rules. |
| `superpowers:brainstorming` | **Mandatory before any creative work** — features, components, behaviour changes. Explores intent + design before code. |
| `superpowers:systematic-debugging` | Any bug, test failure, unexpected behaviour — before proposing a fix. |
| `superpowers:test-driven-development` | Implementing any feature or bugfix, before writing impl code. |
| `superpowers:verification-before-completion` | Before claiming work is done / fixed / passing. Run verification first. Evidence before assertions. |

## Planning & Execution Skills

| Skill | When to Use |
|-------|-------------|
| `superpowers:writing-plans` | When you have a spec for a multi-step task, before touching code. |
| `superpowers:executing-plans` | When you have a written plan to execute in a separate session with review checkpoints. |
| `superpowers:subagent-driven-development` | Executing plans with independent tasks in the current session. |
| `superpowers:dispatching-parallel-agents` | 2+ independent tasks with no shared state / sequential deps. |
| `superpowers:using-git-worktrees` | Starting feature work that needs isolation, or before executing implementation plans. |

## Code Review & Completion Skills

| Skill | When to Use |
|-------|-------------|
| `superpowers:requesting-code-review` | Completing tasks, major features, or before merging. |
| `superpowers:receiving-code-review` | Receiving review feedback — apply technical rigour, not blind agreement. |
| `superpowers:finishing-a-development-branch` | Implementation complete + tests pass — decide merge / PR / cleanup. |

## Skill Authoring

| Skill | When to Use |
|-------|-------------|
| `superpowers:writing-skills` | Creating, editing, or verifying skills. |
| `skill-creator:skill-creator` | Build new skills from scratch, optimise existing ones, run evals. |

## Hard Rules
- **Process skills run before implementation skills.** "Let's build X" → brainstorming first, then frontend-design.
- **Rigid skills (TDD, debugging) must be followed exactly.** Don't adapt away the discipline.
- **Don't rationalise out of using a skill.** "This is simple" / "I know this" / "I'll just check first" = stop, invoke the skill.
