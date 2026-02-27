# Autonomous Mode - Complete Index

**Status:** ✅ FULLY IMPLEMENTED (27 feb 2026)
**Activation:** `/trabalhe-para-mim`
**Tokens:** Up to 5-hour cycles, auto-renewable

---

## 📁 File Structure

```
.aios/autonomous/
├── system-config.json              ← System configuration (read-only after init)
├── task-queue.json                 ← YOUR TASK QUEUE (create from template)
├── task-queue-template.json        ← TEMPLATE (copy → edit → use)
├── execution-log.json              ← LIVE EXECUTION LOG (auto-updated)
├── QUICK-START.txt                 ← THIS FILE (visual quick ref)
├── AUTONOMOUS-MODE-GUIDE.md        ← Full guide (300+ lines)
├── AGENT-AUTONOMOUS-BEHAVIOR.md    ← Agent-specific directives
└── INDEX.md                        ← This file
```

---

## 🎯 Which File to Read?

| Goal | File | Time |
|------|------|------|
| **Get started now** | `QUICK-START.txt` | 5 min |
| **Setup first queue** | Copy `task-queue-template.json` | 5 min |
| **Learn how it works** | `AUTONOMOUS-MODE-GUIDE.md` | 15 min |
| **Deep dive (agents)** | `AGENT-AUTONOMOUS-BEHAVIOR.md` | 20 min |
| **Configure system** | `system-config.json` | 5 min (optional) |
| **Check progress** | `execution-log.json` | 2 min |

---

## 🚀 Quick Links

**Start here:**
```bash
# 1. Copy template
cp task-queue-template.json task-queue.json

# 2. Edit with your tasks
nano task-queue.json

# 3. Activate (and walk away for 5h)
/trabalhe-para-mim
```

**Monitor progress:**
```bash
# Check stats in real-time
cat execution-log.json | jq '.statistics'
```

**View documentation:**
```bash
# Visual quick reference
cat QUICK-START.txt

# Full guide with examples
less AUTONOMOUS-MODE-GUIDE.md

# Agent-specific behavior
less AGENT-AUTONOMOUS-BEHAVIOR.md
```

---

## 📋 File Descriptions

### `system-config.json`
**Purpose:** System-wide configuration for autonomous mode
**Key Settings:**
- `enabled: false` - Set to `true` to enable (done by `/trabalhe-para-mim`)
- `min_delay_between_tasks_minutes: 10` - Slow mode gap
- `max_task_duration_minutes: 60` - Timeout per task
- `max_retries_per_task: 1` - Auto-retry on failure

**Edit?** Only if you need non-standard settings
**Default:** Good as-is, safe to leave alone

---

### `task-queue-template.json`
**Purpose:** Template for your task queue
**Usage:**
1. Copy to `task-queue.json`
2. Edit `tasks` array
3. Remove/add/modify tasks as needed

**Format:**
```json
{
  "meta": { "name", "duration_hours", ... },
  "tasks": [
    {
      "id": 1,
      "agent": "@agent-name",
      "command": "*command",
      "params": ["arg1", "arg2"],
      "wait_before_minutes": 0,
      "timeout_minutes": 30
    }
  ]
}
```

**Edit?** YES - Copy and modify this for each job

---

### `task-queue.json` (YOURS)
**Purpose:** Your actual task queue (created from template)
**Status:** Created when you run `/trabalhe-para-mim task-queue.json`

**Edit?** YES - Customize for each autonomous session

---

### `execution-log.json`
**Purpose:** Live execution log (auto-updated every task)
**Format:**
```json
{
  "session_id": "auto-2026-02-27-10-30",
  "mode": "autonomous-slow",
  "statistics": {
    "tasks_completed": 2,
    "tasks_failed": 0,
    "success_rate_percent": 100
  },
  "completed_tasks": [
    {
      "id": 1,
      "agent": "@pm",
      "status": "completed",
      "duration_minutes": 12
    }
  ]
}
```

**Edit?** NO - Read-only, system maintains this
**Monitor?** YES - Check progress anytime

---

### `QUICK-START.txt`
**Purpose:** Visual quick reference card
**Contains:**
- 3-step setup
- Common task templates (copy-paste ready)
- Agent quick reference
- Example complete queue
- Monitoring commands

**Read?** YES - Before anything else
**Length:** ~200 lines, 5 min read

---

### `AUTONOMOUS-MODE-GUIDE.md`
**Purpose:** Complete guide with full context
**Contains:**
- How it works
- Slow mode explanation
- Task queue structure
- Agent behavior (global)
- Monitoring in real-time
- Token reset handling
- Troubleshooting
- Advanced configuration
- 6 example task queues

**Read?** YES - Once for full understanding
**Length:** ~400 lines, 15-20 min read

---

### `AGENT-AUTONOMOUS-BEHAVIOR.md`
**Purpose:** Agent-specific directives
**Contains:**
- 5 global rules for all agents
- Individual agent behavior (18 agents)
- Error handling patterns
- Logging format
- Checklist per agent

**Read?** YES - If you want to understand each agent
**Length:** ~300 lines, 20 min read

---

## 🔄 Workflow

### Create Task Queue (5 min)

```bash
# 1. Copy template
cp .aios/autonomous/task-queue-template.json \
   .aios/autonomous/task-queue.json

# 2. Edit with your tasks
nano .aios/autonomous/task-queue.json

# Example: 4 tasks
# - @pm onboard
# - @copy-chef brief
# - @georgi write
# - @follow-up-specialist sequence
```

### Activate (1 sec)

```bash
# System loads task-queue.json
# Starts first task immediately
# You can close terminal and walk away
/trabalhe-para-mim
```

### Monitor (optional)

```bash
# Check progress anytime (even if you're away)
tail -f .aios/autonomous/execution-log.json

# Or parse JSON
cat .aios/autonomous/execution-log.json | jq '.statistics'
```

### Come Back Later

```bash
# After 5 hours (when tokens reset):
# System automatically continues remaining tasks
# No re-activation needed
# Check log to see what was done

cat .aios/autonomous/execution-log.json
```

---

## 🎯 Use Cases

### Use Case 1: Onboarding Blitz (5 agents)
**Time:** ~3 hours
```
1. @pm: onboard-client
2. @copy-chef: client-brief (15 min gap)
3. @halbert: headlines (20 min gap)
4. @georgi: sales-letter (20 min gap)
5. @orzechowski: email-sequence (20 min gap)
```

### Use Case 2: GHL Sync + Analysis
**Time:** ~1 hour
```
1. @ghl-maestro: sync-conversations
2. @ghl-maestro: sync-messages (10 min gap)
3. @account: analyze-conversations (15 min gap)
```

### Use Case 3: Multi-Client Campaign Build
**Time:** ~4 hours
```
Client A: Onboarding (0-45 min)
Client B: Onboarding (45-90 min)
Client C: Brief (90-135 min)
Client A: Copy (135-195 min)
Client B: Copy (195-255 min)
```

---

## 🔒 Security & Limits

| Limit | Value | Why |
|-------|-------|-----|
| Concurrency | 1 task | Serial, no race conditions |
| Max per task | 60 min | Prevent hangs |
| Retries | 1 auto | Recover transient errors |
| Memory | 80% max | Pause if overloaded |
| Pre-reset | 5 min stop | Save state before tokens reset |

---

## 💾 Persisting Across Token Resets

**How it works:**
1. Task #1-3 complete, logged
2. Tokens reset mid-task #4
3. New session starts
4. System reads `task-queue.json` (unchanged)
5. Recognizes tasks #1-3 already done (in log)
6. Continues with task #4
7. No duplication, no re-activation

**You don't do anything.** System handles it.

---

## 🛠️ Advanced Features

### Pause Execution (Optional)
If you want to pause mid-run:
```
*queue-pause
```
System stops after current task, awaits manual resume.

### Resume Execution
```
*queue-resume
```

### View Pending Tasks
```
*queue-list
```

### Export Full Log
```
*queue-export
```

---

## 📊 Key Metrics (from `execution-log.json`)

```json
{
  "total_tasks_queued": 4,
  "tasks_completed": 2,
  "tasks_failed": 0,
  "tasks_pending": 2,
  "success_rate_percent": 100,
  "total_duration_minutes": 45,
  "average_task_duration_minutes": 22.5
}
```

---

## 🚨 Error Handling

**Task fails → Auto-retry once**
```
Attempt 1: ❌ Failed
Attempt 2: ❌ Failed
Action: Skip task, continue to next
Log: Task marked "failed" in execution-log.json
Queue: NOT BLOCKED, continues normally
```

**If all retries exhaust:**
- Task marked `failed` in log
- Next task starts normally
- Error details logged for review

**Queue never blocks.** Graceful degradation always.

---

## 📞 Getting Help

**File to check:**
1. `QUICK-START.txt` - Visual reference
2. `AUTONOMOUS-MODE-GUIDE.md` - Full documentation
3. `execution-log.json` - Actual output

**If confused:**
- Re-read the 3-step setup
- Check QUICK-START.txt for your use case
- See examples in AUTONOMOUS-MODE-GUIDE.md

---

## 📝 Version Info

| Item | Value |
|------|-------|
| Created | 27 February 2026 |
| Version | 1.0 |
| Status | ✅ Production Ready |
| Last Updated | 2026-02-27 |

---

## 🎓 Learning Path

1. **Day 1:** Read `QUICK-START.txt` (5 min)
2. **Day 1:** Create first queue from template (10 min)
3. **Day 1:** Run `/trabalhe-para-mim` (0 sec)
4. **Day 2:** Review `execution-log.json` (5 min)
5. **When ready:** Read `AUTONOMOUS-MODE-GUIDE.md` (20 min)
6. **Deep dive:** Read `AGENT-AUTONOMOUS-BEHAVIOR.md` (20 min)
7. **Optional:** Tweak `system-config.json` for your needs (10 min)

**Total:** ~1.5 hours to full mastery

---

## ✅ Checklist Before First Run

- [ ] Read `QUICK-START.txt` (5 min)
- [ ] Copy `task-queue-template.json` → `task-queue.json`
- [ ] Edit `task-queue.json` with your tasks
- [ ] Verify JSON is valid (no syntax errors)
- [ ] Run `/trabalhe-para-mim`
- [ ] Wait first task to start (should see logs)
- [ ] Walk away or monitor as desired

---

**That's it. Autonomous system ready to go.**

---

*Synkra AIOS - Autonomous Mode v1.0*
*Created: 27 February 2026*
*Status: ✅ Production Ready*
