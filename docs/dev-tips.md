1. 不要一步到位 把每个phase 分成可以独立测试的阶段；
2. 每个phase完成之后在开发下一次phase
3. Voice AI 的 `submit` 不等于直接入库：服务端会先返回 `ready_to_commit`、`needs_confirmation`、`failed` 三种结果，确认弹窗通常是预期行为，不一定是 bug。
4. Voice AI 优先保证 fallback：Cloudflare Workers AI 不可用或返回异常时，服务端必须还能退回 heuristic parser；不要把 AI 当成唯一可用路径。
5. 扩充语音记账词表时，优先补“分类名词/场景词”，例如 `面`、`米线`、`包子`，不要主要靠“整句模板”或过宽泛的动词。
6. Web Speech API 兼容性不稳定，手动文本输入必须始终可用，识别结果也必须允许用户编辑。
7. OpenSpec 相关路径统一写全：优先使用 `openspec/changes/...` 或 `openspec/specs/...`，避免省略前缀后产生定位错误。
8. Voice AI 这次变更的完整复盘见 [voice-ai retrospective](/Users/tongtong/AndroidStudioProjects/MoneyJar/openspec/changes/archive/2026-04-26-voice-ai-text-first-entry/retrospective.md)。
