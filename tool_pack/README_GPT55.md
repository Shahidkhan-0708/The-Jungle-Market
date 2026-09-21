# GPT-5.5 High — How to use this pack

Attach this folder/ZIP and instruct GPT-5.5 High:

> Build Jungle Market incrementally using `00_INDEX.md`. Treat every numbered Markdown file as the implementation contract for that technology and `90_SYSTEM_RULES.md` as mandatory cross-system behavior. Do not introduce excluded tools. Keep one canonical repository state. After each component, create/update tests and state anything blocked by missing weights or training data. Never fake a real model; use an explicitly named mock adapter when necessary.

For each step:
1. show files created/changed,
2. implement the code,
3. add tests,
4. run consistency checks,
5. record blockers honestly.
