# Custom Endpoint Forwards Codex Thread Session

### Feature: Custom endpoint proxy forwards the Codex thread id as the upstream session key

#### Prerequisites
- Start Codex UI and select **Custom endpoint** in Settings.
- Point it at a session-aware upstream (for example, an `opencode-claude` backend that reads `x-opencode-claude-session`) or at a local endpoint whose request headers can be inspected.
- Open one project that has an `AGENTS.md`, so every new thread starts with the same instructions preamble.

#### Steps
1. Start thread A in the project and send a long-running prompt (for example, "count slowly from 1 to 200").
2. While thread A is still generating, start thread B in the same project and send another prompt.
3. Inspect the upstream request headers of both turns.
4. Switch back to thread A and send a follow-up while thread B is generating.

#### Expected Results
- Each upstream request carries `session-id` and `x-opencode-claude-session` equal to that thread's Codex `thread-id`.
- Thread A keeps generating and completes after thread B starts; neither thread's turn is cancelled by activity in the other.
- An `opencode-claude` backend logs no `stopping an earlier turn still running for this chat` warning for turns of different threads.
- Requests without a valid `thread-id`/`session-id` (malformed or missing) are proxied without these headers, as before.

#### Rollback/Cleanup
- Revert the custom endpoint proxy change; upstreams then fall back to their own conversation keying.
