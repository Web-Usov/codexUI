### Custom endpoint Completions via local Responses proxy

#### Feature/Change Name
Custom endpoint `Completions` mode uses a local Responses-compatible proxy so current Codex CLI versions do not reject `wire_api="chat"`.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Local OpenAI-compatible endpoint running at `http://127.0.0.1:8666/v1`
3. API key `pwd`

#### Steps
1. Open Settings
2. Set Provider to `Custom endpoint`
3. Enter Custom endpoint URL `http://127.0.0.1:8666/v1`
4. Enter API key `pwd`
5. Set API format to `Completions`
6. Save
7. Select model `claude-sonnet-4.5`
8. Send `hi`
9. Select model `glm-5`
10. Send `hi`
11. In the same thread, ask `what is latest codex cli version?`

#### Expected Results
- The Codex app-server starts with `wire_api="responses"` against `/codex-api/custom-proxy/v1`
- The custom provider save records a usable default model from `/models` when available
- The Codex app-server receives the custom default model via runtime config
- The model list preserves endpoint-advertised models, including `auto-*` aliases
- The local proxy forwards the request to `/v1/chat/completions`
- The UI renders an assistant greeting such as `Hey! How can I help you today?`
- `glm-5` returns a successful assistant response
- Follow-up tool-output turns do not fail with Kiro Gateway's generic `payload size exceeded ~615KB` error when the payload is small

#### Rollback/Cleanup
- Switch provider/API format back to preferred defaults

---

### Qwen strict system-message template compatibility

#### Feature/Change Name
Responses-to-Chat translation merges Codex `instructions`, `developer`, and `system` messages into one leading `system` message for strict chat templates such as Qwen in LM Studio.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. LM Studio server reachable from CodexUI with a Qwen model loaded
3. Custom endpoint URL points to the LM Studio OpenAI-compatible `/v1` base URL

#### Steps
1. Open Settings
2. Set Provider to `Custom endpoint`
3. Set API format to `Completions`
4. Save the LM Studio endpoint and API key value required by the local server, if any
5. Select the loaded Qwen model
6. Start a fresh thread and send `Привет! Ты тут?`
7. Send a follow-up that causes Codex to use a normal function tool such as a shell command or file read
8. Inspect LM Studio developer logs for the forwarded `/v1/chat/completions` request

#### Expected Results
- LM Studio receives `/v1/chat/completions`, not the direct Codex `/v1/responses` payload
- The forwarded message list contains at most one `system` message and it is the first message
- Codex `instructions` plus any `developer`/`system` input are preserved inside that single leading system message
- User, assistant, and tool messages keep their relative order
- Qwen does not fail with `Jinja Exception: System message must be at the beginning.`
- The greeting returns an assistant response and the follow-up tool turn completes normally

#### Rollback/Cleanup
- Switch the custom provider API format back to `Responses` if direct Responses API behavior is being tested

---
