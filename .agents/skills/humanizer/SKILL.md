---
name: humanizer
description: Detects 55 AI writing patterns and rewrites text in five voice profiles so it reads like a specific human wrote it, with an optional 0-100 AI-tell score. Use when text sounds AI-generated or like a chatbot, when preparing a blog post, README, or LinkedIn post for publication, when auditing prose for AI tells, or when editing a Markdown file in place. Triggers on phrases like "humanize this", "make this sound less AI", "make this sound human", "remove AI tells", "does this read like ChatGPT", and "rewrite so it does not sound AI-generated". Pure Markdown, zero dependencies, no network calls.
user-invocable: true
argument-hint: '"your text" [--mode detect|rewrite|edit] [--voice casual|professional|technical|warm|blunt] [--file path/to/file.md] [--aggressive] [--iterate N] [--score] [--purpose essay|email|marketing|technical|general] [--openings N] [--ignore-code] [--ignore-quotes]'
---

# Humanizer: Make Text Sound Like a Human Wrote It

Take text that smells like a chatbot wrote it and rewrite it as a specific, opinionated human. Detects 55 AI writing patterns, scores them 0-100, applies a chosen voice profile, and varies sentence-length burstiness so the result reads as written by a person.

## Quick reference

**Modes**

| Mode | What it does |
|:-----|:-------------|
| `detect` | Scan text, report patterns, output a 0-100 AI-tell score. No rewrite. |
| `rewrite` | Full transform with voice injection. Default mode. |
| `edit` | In-place file editing using the Edit tool. Minimal targeted changes. |

**Voices**

| Voice | Personality | Best for |
|:------|:-----------|:---------|
| `casual` | Contractions, first person, fragments | Blog posts, social media |
| `professional` | Selective contractions, dry wit | Business comms, reports |
| `technical` | Precise vocabulary, code-like clarity | API docs, READMEs |
| `warm` | "We" language, empathy, short paragraphs | Tutorials, onboarding |
| `blunt` | Shortest sentences, no hedging, active voice | Internal comms, reviews |

**Pattern catalog (55 total)**

| Category | Count | IDs |
|:---------|:------|:----|
| Content | 8 | P1 to P8 |
| Language & Style | 10 | P9 to P18 |
| Communication | 3 | P19 to P21 |
| Filler & Hedging | 9 | P22 to P30 |
| Emerging | 13 | P31 to P43 |
| Craft & Forensic | 12 | P44 to P55 |

**Flags**

| Flag | Effect |
|:-----|:-------|
| `--score` | Prepend a `[Score: NN/100]` AI-tell density header |
| `--iterate N` | Loop detect, rewrite, detect until convergence (max N=3) |
| `--aggressive` | Heavier rewrite, shorter sentences, more personality |
| `--purpose` | Layer `essay`, `email`, `marketing`, `technical`, or `general` rules |
| `--openings N` | Generate N maximally-different opening hooks, surface the strongest |
| `--ignore-code` | Mask fenced code blocks before detect/score (do not flag inside them) |
| `--ignore-quotes` | Mask blockquotes before detect/score (do not rewrite quoted text) |

## Operating principles

You are a ruthless editor who despises AI slop. Take text that smells like a chatbot and rewrite it as a specific, opinionated human. Don't just remove bad patterns. Replace them with something that has a pulse.

North star: **LLMs regress to the statistical mean. Humans are weird, specific, and inconsistent. Write like a human.**

The fundamental AI tell: text that emerges from nowhere, addressed to no one, with no stake in its claims. Human writing reveals a mind behind it. If the reader can't picture a specific person writing this, it's not done.

**No fabrication.** A rewrite may sharpen, cut, and restructure, but it may not invent facts, names, dates, numbers, or quotes that are not in the source.
