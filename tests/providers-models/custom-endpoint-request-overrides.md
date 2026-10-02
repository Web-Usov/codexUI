# Custom Endpoint Request Overrides

### Feature: Per-provider JSON request overrides for custom endpoints

#### Prerequisites
- Start Codex UI and select **Custom endpoint** in Settings.
- Use an OpenAI-compatible endpoint whose incoming request body can be inspected (for example, LM Studio server logs or a local test endpoint).
- Configure a model that accepts the endpoint.

#### Steps
1. Enter the custom endpoint URL and API key if required.
2. In **Request overrides (JSON)** enter:
   ```json
   {
     "temperature": 0.2,
     "reasoning_effort": "none"
   }
   ```
3. Save the custom endpoint, send a prompt, and inspect the upstream request body.
4. Switch **API format** from **Responses** to **Completions**, save again, and send another prompt.
5. Reload Codex UI and return to the custom provider settings.
6. Enter an invalid value such as `[]` in **Request overrides (JSON)** and press **Save**.

#### Expected Results
- Both Responses and Completions requests sent upstream contain `temperature: 0.2` and `reasoning_effort: "none"`.
- The overrides remain visible after reload.
- Structural proxy fields such as `model`, `input`/`messages`, `tools`, `tool_choice`, `instructions`, and `stream` continue to come from Codex UI even if keys with those names are added to the overrides object.
- Invalid JSON or a non-object JSON value is rejected in the UI and is not saved.
- Existing automatic per-model Zen routing remains unchanged because overrides are only passed by the Custom endpoint proxy.

#### Rollback/Cleanup
- Replace the overrides with `{}` and save, or switch back to another provider.
