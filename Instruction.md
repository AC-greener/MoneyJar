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