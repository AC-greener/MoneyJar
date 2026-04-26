## 优化CLAUDE.md
 根据项目已有的代码，完善CLAUDE.md,注意CLAUDE.md内容不要超过150行，涉及到的文档和规范可以在CLAUDE.md中引用链接

- review .worktrees/google-login 相关代码，并找出问题
- 整个登录的流程是什么，详细解释给我，并写入/docs/login-process.md目录，必要时使用 mermind图进行说明

## 登录问题修复
1. 完善测试用例，先测一下登录，保证测试用例跑通
2. 完成之后，推送到生产环境使用playwright MCP测试
3. ❯ 页面报错了：Failed to fetch dynamically imported module: https://moneyjar.zhutongtong.cn/assets/RecordPage-BKmvgKnM.js
4. 登录完成之后，回到了这个页面：https://moneyjar.zhutongtong.cn/auth/callback?exchange_code=eb5239e5-629e-42d9-991b-357357c0c985&return_to=%2Frecord，然后看到请求了这个地址：curl 'http://localhost:8787/auth/exchange' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'Referer;' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
  -H 'Content-Type: application/json' \
  -H 'sec-ch-ua-mobile: ?0' \
  --data-raw '{"code":"eb5239e5-629e-42d9-991b-357357c0c985"}'

5. 页面已经登录上了，但是接口有一些报错：
6. 整理一下目录结构，吧安卓的代码放到`/android`目录下，整体的目录结构如下：
```
/android
  ├── app
  │   ├── src
  │   │   ├── main
  │   │   │   ├── java
  │   │   │   └── res
  │   │   └── test
  │   │       └── java
  │   └── build.gradle
  ├── build.gradle
  └── settings.gradle
/frontend
/server
...
```

## 0425
- [x] 为什么changes/voice-ai-text-first-entry/tasks.md 中还有一些未完成的任务
- [x] 吧 openspec/changes/voice-ai-text-first-entry/tasks.md中的任务2以及相关文档，移动到backup/specs中，稍后再做
- [x] 吧当前changes/voice-ai-text-first-entry 开发过程中遇到的问题、踩的坑、或者你学到的东西记录到文档中
- [x] 根据当前项目的实际情况，完善AGENTS.md，注意不要超过150行，必要时可以引用其他文档和规范链接
- [x] openspec/changes/voice-ai-text-first-entry/tasks.md 中的 4.4 需要做什么吗，不需要做的话直接完成这个任务
- [ ] review下安卓的测试覆盖率以及单元测试集成测试，看看还有哪些可以优化的地方

## 0426
- 现在有个问题：登录完成之后没有显示这个账号之前的记账数据，应该是有数据的，因为我之前在web端有一些记账，请你分析下这个问题