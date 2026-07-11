---
name: feedback-no-claude-in-commits
description: Never include Claude references (Co-Authored-By, Claude-Session, etc.) in git commit messages
metadata:
  type: feedback
---

Never include Claude references in git commit messages. This means:
- No "Co-Authored-By: Claude..." lines
- No "Claude-Session: ..." lines
- No AI attribution of any kind in commit messages

**Why:** User explicitly rejected a commit for including these references and said to leave them out.

**How to apply:** Write clean, human-style commit messages with only the commit description. No trailer lines referencing AI tools.
