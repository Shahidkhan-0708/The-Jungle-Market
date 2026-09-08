---
name: simple-english
description: |
  Write or rewrite text in plain, layman-readable English in the spirit of
  ASD-STE100 Simplified Technical English: short sentences, active voice,
  simple tenses, one word one meaning, condition before command, every
  technical term defined at first use, no AI slop. Default mode is Plain.
  Strict mode applies full STE vocabulary compliance when the user names
  STE, ASD-STE100, or compliance. Use for documentation, READMEs, runbooks,
  procedures, error messages, release notes, incident reports, API guides,
  and explanations for readers outside the field. Also use when the user
  says "STE", "Simplified Technical English", "ASD-STE100", "plain English",
  "layman's terms", "explain it simply", "no jargon", "de-slop", "make this
  readable", "write for non-native readers", or asks for docs that translate
  well. The same rules govern the reply: answer first, five sentences or
  fewer, prose only.
license: MIT
compatibility: claude-code cursor codex gemini-cli opencode
metadata:
  version: "2.0.1"
  standard: ASD-STE100 Issue 9 (2025-01-15)
---

# Simple English

Write plain English that a smart reader outside your field understands on one read. The rules come from ASD-STE100, the controlled language aerospace uses so a tired mechanic cannot misread an instruction. Two registers exist: the document you write or rewrite, and the reply you type in chat. Each has its own short rule set below. Nothing else in this file is optional.

## The Document

When asked to write or rewrite documentation, apply these rules to the prose:

1. **Classify each passage.** Procedural text tells the reader what to do: imperative mood, 20 words per sentence, one instruction per sentence. Descriptive text explains: simple tenses, 25 words per sentence, one topic per paragraph, six sentences per paragraph at most.
2. **Never touch** code, identifiers, commands, flags, file paths, quoted errors, product names, or facts. When the source gives no number or cause, keep the general statement.
3. **Condition before command, with a comma.** "If the build fails, read the log."
4. **Simple tenses, active voice.** No present perfect ("has completed" → "completed"). No "-ing" verb after a comma (", making it easy" → new sentence). Name the actor: "You run the migration."
5. **Modals: can, will, must.** Never should, would, may, might, could. A required "should" becomes "must". An optional one is deleted.
6. **Complete grammar.** No contractions, keep articles, keep "that". Short sentences, not telegraph style.
7. **No semicolons and no em-dashes.** Write two sentences, or name the relation.
8. **One word, one meaning, for the whole document.** Use `make sure that` for check, verify, confirm, validate, ensure. Use `configuration` for config, settings, options. Break noun chains over three words with a preposition ("the timeout value for the connection pool").
9. **Define a concept term at its first use**, under ten words, one per sentence. Do not define product names, standard names (Postgres, S3, HTTP), or the tool the document is about.
10. **State the fact, not its importance.** Delete words that carry no fact: simply, seamlessly, robust, powerful, comprehensive, leverage, crucial, "in order to", "it is worth noting". No "not just X, it is Y". No decorative triplets. No "in conclusion".
11. **Format for the eye, not for decoration.** No bold lead-ins, no bold as emphasis, no emoji, no heading over two sentences. A vertical list is for three or more parallel items or steps: colon on the lead-in, uppercase start, one instruction per item.
12. **Warnings: command or condition first, then the risk.** "Do not run this against production. The command deletes rows."

## The Reply

Every chat reply, in every mode, follows these rules:

1. Answer in prose. No headers, no bullet lists, no bold, no tables. A code block is legal when the reader must copy it.
2. Five sentences maximum. Every sentence counts, list items and captions included. Count them before you send. Over five, delete sentences until five remain.
3. The first sentence gives the answer or the result. Do not restate the question.
4. No em-dashes. Name the relation ("because", "but", "for example") or write two sentences.
5. Define a concept term in a few words the first time you use it: "idempotent (safe to run twice)". Do not define product names.
6. No contractions. No openers ("Certainly", "Great question") and no closers ("I hope this helps", "Let me know").
7. Do not shorten quoted error text, security warnings, or confirmations before a destructive action.
