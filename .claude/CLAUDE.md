# Synkra AIOS Development Rules for Claude Code

You are working with Synkra AIOS, an AI-Orchestrated System for Full Stack Development.

<!-- AIOS-MANAGED-START: core-framework -->
## Core Framework Understanding

Synkra AIOS is a meta-framework that orchestrates AI agents to handle complex development workflows. Always recognize and work within this architecture.
<!-- AIOS-MANAGED-END: core-framework -->

<!-- AIOS-MANAGED-START: agent-system -->
## Agent System

### Agent Activation
- Agents are activated with @agent-name syntax: @dev, @qa, @architect, @pm, @po, @sm, @analyst
- The master agent is activated with @aios-master
- Agent commands use the * prefix: *help, *create-story, *task, *exit

### Agent Context
When an agent is active:
- Follow that agent's specific persona and expertise
- Use the agent's designated workflow patterns
- Maintain the agent's perspective throughout the interaction
<!-- AIOS-MANAGED-END: agent-system -->

## Development Methodology

### Story-Driven Development
1. **Work from stories** - All development starts with a story in `docs/stories/`
2. **Update progress** - Mark checkboxes as tasks complete: [ ] → [x]
3. **Track changes** - Maintain the File List section in the story
4. **Follow criteria** - Implement exactly what the acceptance criteria specify

### Code Standards
- Write clean, self-documenting code
- Follow existing patterns in the codebase
- Include comprehensive error handling
- Add unit tests for all new functionality
- Use TypeScript/JavaScript best practices

### Testing Requirements
- Run all tests before marking tasks complete
- Ensure linting passes: `npm run lint`
- Verify type checking: `npm run typecheck`
- Add tests for new features
- Test edge cases and error scenarios

<!-- AIOS-MANAGED-START: framework-structure -->
## AIOS Framework Structure

```
aios-core/
├── agents/         # Agent persona definitions (YAML/Markdown)
├── tasks/          # Executable task workflows
├── workflows/      # Multi-step workflow definitions
├── templates/      # Document and code templates
├── checklists/     # Validation and review checklists
└── rules/          # Framework rules and patterns

docs/
├── stories/        # Development stories (numbered)
├── prd/            # Product requirement documents
├── architecture/   # System architecture documentation
└── guides/         # User and developer guides
```
<!-- AIOS-MANAGED-END: framework-structure -->

## Workflow Execution

### Task Execution Pattern
1. Read the complete task/workflow definition
2. Understand all elicitation points
3. Execute steps sequentially
4. Handle errors gracefully
5. Provide clear feedback

### Interactive Workflows
- Workflows with `elicit: true` require user input
- Present options clearly
- Validate user responses
- Provide helpful defaults

## Best Practices

### When implementing features:
- Check existing patterns first
- Reuse components and utilities
- Follow naming conventions
- Keep functions focused and testable
- Document complex logic

### When working with agents:
- Respect agent boundaries
- Use appropriate agent for each task
- Follow agent communication patterns
- Maintain agent context

### When handling errors:
```javascript
try {
  // Operation
} catch (error) {
  console.error(`Error in ${operation}:`, error);
  // Provide helpful error message
  throw new Error(`Failed to ${operation}: ${error.message}`);
}
```

## Git & GitHub Integration

### Commit Conventions
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, etc.
- Reference story ID: `feat: implement IDE detection [Story 2.1]`
- Keep commits atomic and focused

### GitHub CLI Usage
- Ensure authenticated: `gh auth status`
- Use for PR creation: `gh pr create`
- Check org access: `gh api user/memberships`

<!-- AIOS-MANAGED-START: aios-patterns -->
## AIOS-Specific Patterns

### Working with Templates
```javascript
const template = await loadTemplate('template-name');
const rendered = await renderTemplate(template, context);
```

### Agent Command Handling
```javascript
if (command.startsWith('*')) {
  const agentCommand = command.substring(1);
  await executeAgentCommand(agentCommand, args);
}
```

### Story Updates
```javascript
// Update story progress
const story = await loadStory(storyId);
story.updateTask(taskId, { status: 'completed' });
await story.save();
```
<!-- AIOS-MANAGED-END: aios-patterns -->

## Environment Setup

### Required Tools
- Node.js 18+
- GitHub CLI
- Git
- Your preferred package manager (npm/yarn/pnpm)

### Configuration Files
- `.aios/config.yaml` - Framework configuration
- `.env` - Environment variables
- `aios.config.js` - Project-specific settings

<!-- AIOS-MANAGED-START: common-commands -->
## Common Commands

### AIOS Master Commands
- `*help` - Show available commands
- `*create-story` - Create new story
- `*task {name}` - Execute specific task
- `*workflow {name}` - Run workflow

### Development Commands
- `npm run dev` - Start development
- `npm test` - Run tests
- `npm run lint` - Check code style
- `npm run build` - Build project
<!-- AIOS-MANAGED-END: common-commands -->

## Autonomous Operation Mode (Trabalhe para Mim)

### Overview
When Eric is away, agents operate in **Slow Autonomous Mode** for up to 5 hours (until token reset). This mode allows continuous work without user intervention or permission prompts.

### Activation
**Command:** `/trabalhe-para-mim`

Usage:
```
/trabalhe-para-mim [duration] [queue-file]
```

Examples:
- `/trabalhe-para-mim` - Default 5 hours
- `/trabalhe-para-mim 3h` - 3 hours
- `/trabalhe-para-mim queue.json` - Load custom task queue

### Task Queue Format
File: `.aios/autonomous/task-queue.json`

```json
{
  "meta": {
    "created": "2026-02-27T10:30:00Z",
    "duration_hours": 5,
    "mode": "slow",
    "executor": "autonomous-system"
  },
  "tasks": [
    {
      "id": 1,
      "agent": "@pm",
      "command": "*onboard-client",
      "params": ["Dra. Bruna Nogueira"],
      "priority": "high",
      "wait_before_minutes": 0,
      "timeout_minutes": 30,
      "status": "pending"
    },
    {
      "id": 2,
      "agent": "@copy-chef",
      "command": "*client-brief",
      "params": ["Dr. Erico Servano"],
      "priority": "high",
      "wait_before_minutes": 15,
      "timeout_minutes": 45,
      "status": "pending"
    }
  ]
}
```

### Execution Rules (Autonomous Mode)

**CRITICAL DIRECTIVES:**

1. **No User Interaction** - All tasks execute without asking for confirmation
2. **Auto-Approve Permissions** - All tool calls auto-approved (user is away)
3. **Graceful Degradation** - Skip failed tasks, continue queue
4. **Slow Execution** - Add delays between tasks (10-30 min gaps)
5. **Self-Healing** - Retry failed tasks once automatically
6. **Token Awareness** - Stop 5 minutes before expected reset
7. **State Logging** - Log all progress to `.aios/autonomous/execution-log.json`

### Task Queue Management

**Available Commands (root level):**
- `*queue-list` - Show all pending tasks
- `*queue-add {agent} {command} {params}` - Add task to queue
- `*queue-remove {task-id}` - Remove task from queue
- `*queue-pause` - Pause execution (resume manually)
- `*queue-resume` - Resume paused execution
- `*queue-clear` - Clear all pending tasks
- `*queue-export` - Export execution log

### Agent Behavior in Autonomous Mode

**All agents:**
1. Skip `*help` and interactive prompts
2. Use default/sensible parameters if not specified
3. Log output to task execution record (not just console)
4. Continue to next task even if current fails
5. Report status every 30 minutes (brief summary)

**Example (Agent Behavior):**
```
@pm receives: *onboard-client Dra. Bruna Nogueira
→ Skips "Are you sure?" prompts
→ Uses default folder structure
→ Logs completion to autonomous log
→ Returns to queue manager
```

### Status Tracking
Check progress at any time:
```
.aios/autonomous/execution-log.json
```

Example output:
```json
{
  "session_start": "2026-02-27T10:30:00Z",
  "mode": "autonomous",
  "tasks_completed": 3,
  "tasks_pending": 7,
  "last_update": "2026-02-27T11:15:00Z",
  "completed_tasks": [
    {
      "id": 1,
      "agent": "@pm",
      "command": "*onboard-client",
      "status": "completed",
      "duration_minutes": 12,
      "timestamp": "2026-02-27T10:45:00Z"
    }
  ],
  "next_task_at": "2026-02-27T11:30:00Z"
}
```

### Safety Limits

- **Max concurrent tasks**: 1 (serial execution only)
- **Max retries per task**: 1 (fail → retry once → skip)
- **Max task duration**: 60 minutes (timeout if exceeds)
- **Min delay between tasks**: 10 minutes (slow mode)
- **Auto-stop**: 5 min before token reset
- **Memory check**: If memory > 80%, pause and wait

### Token Reset Handling

When tokens reset:
1. Current task completes
2. New session inherits remaining task queue
3. Execution continues automatically (no re-activation needed)
4. Logs merge across sessions

---

## Debugging

### Enable Debug Mode
```bash
export AIOS_DEBUG=true
```

### View Agent Logs
```bash
tail -f .aios/logs/agent.log
```

### Trace Workflow Execution
```bash
npm run trace -- workflow-name
```

## Claude Code Specific Configuration

### Performance Optimization
- Prefer batched tool calls when possible for better performance
- Use parallel execution for independent operations
- Cache frequently accessed data in memory during sessions

### Tool Usage Guidelines
- Always use the Grep tool for searching, never `grep` or `rg` in bash
- Use the Task tool for complex multi-step operations
- Batch file reads/writes when processing multiple files
- Prefer editing existing files over creating new ones

### Session Management
- Track story progress throughout the session
- Update checkboxes immediately after completing tasks
- Maintain context of the current story being worked on
- Save important state before long-running operations

### Error Recovery
- Always provide recovery suggestions for failures
- Include error context in messages to user
- Suggest rollback procedures when appropriate
- Document any manual fixes required

### Testing Strategy
- Run tests incrementally during development
- Always verify lint and typecheck before marking complete
- Test edge cases for each new feature
- Document test scenarios in story files

### Documentation
- Update relevant docs when changing functionality
- Include code examples in documentation
- Keep README synchronized with actual behavior
- Document breaking changes prominently

---
*Synkra AIOS Claude Code Configuration v2.0*
