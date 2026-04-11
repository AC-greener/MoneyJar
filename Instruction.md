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
curl 'https://moneyjar.zhutongtong.cn/api/auth/exchange' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: zh-CN,zh;q=0.9,zh-HK;q=0.8,en-US;q=0.7,en;q=0.6' \
  -H 'cache-control: no-cache' \
  -H 'content-type: application/json' \
  -b 'Hm_lvt_ede26455936c86e9ca96f051b0734ab9=1762869678' \
  -H 'origin: https://moneyjar.zhutongtong.cn' \
  -H 'pragma: no-cache' \
  -H 'priority: u=1, i' \
  -H 'referer: https://moneyjar.zhutongtong.cn/auth/callback?exchange_code=9943da04-2361-4eb9-88ad-3d0084e662da&return_to=%2Frecord' \
  -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
  -H 'sec-ch-ua-mobile: ?1' \
  -H 'sec-ch-ua-platform: "iOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1' \
  --data-raw '{"code":"9943da04-2361-4eb9-88ad-3d0084e662da"}'
  curl 'https://moneyjar.zhutongtong.cn/api/auth/exchange' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: zh-CN,zh;q=0.9,zh-HK;q=0.8,en-US;q=0.7,en;q=0.6' \
  -H 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNTMyMDU1NC03YThhLTQ3NGMtOGRmYi05ZWRkMDA1NmEzZDAiLCJlbWFpbCI6InpodTE1OTI5Nzc0MzA0QGdtYWlsLmNvbSIsInBsYW4iOiJmcmVlIiwiaWF0IjoxNzc1ODc5MzUyLCJleHAiOjE3NzU4ODAyNTJ9.cisep-o6Ptb7mQsCPMnM3_vtMeH3xFuBmH4abdmfb5k' \
  -H 'cache-control: no-cache' \
  -H 'content-type: application/json' \
  -b 'Hm_lvt_ede26455936c86e9ca96f051b0734ab9=1762869678' \
  -H 'origin: https://moneyjar.zhutongtong.cn' \
  -H 'pragma: no-cache' \
  -H 'priority: u=1, i' \
  -H 'referer: https://moneyjar.zhutongtong.cn/record' \
  -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
  -H 'sec-ch-ua-mobile: ?1' \
  -H 'sec-ch-ua-platform: "iOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1' \
  --data-raw '{"code":"9943da04-2361-4eb9-88ad-3d0084e662da"}'

  curl 'https://moneyjar.zhutongtong.cn/api/auth/exchange' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: zh-CN,zh;q=0.9,zh-HK;q=0.8,en-US;q=0.7,en;q=0.6' \
  -H 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNTMyMDU1NC03YThhLTQ3NGMtOGRmYi05ZWRkMDA1NmEzZDAiLCJlbWFpbCI6InpodTE1OTI5Nzc0MzA0QGdtYWlsLmNvbSIsInBsYW4iOiJmcmVlIiwiaWF0IjoxNzc1ODc5MzU1LCJleHAiOjE3NzU4ODAyNTV9.5_SqG-gN4PszECR6kNAWUY_eqz4T74XEiB1DLZ2f6VM' \
  -H 'cache-control: no-cache' \
  -H 'content-type: application/json' \
  -b 'Hm_lvt_ede26455936c86e9ca96f051b0734ab9=1762869678' \
  -H 'origin: https://moneyjar.zhutongtong.cn' \
  -H 'pragma: no-cache' \
  -H 'priority: u=1, i' \
  -H 'referer: https://moneyjar.zhutongtong.cn/record' \
  -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
  -H 'sec-ch-ua-mobile: ?1' \
  -H 'sec-ch-ua-platform: "iOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1' \
  --data-raw '{"code":"9943da04-2361-4eb9-88ad-3d0084e662da"}'

  curl 'https://moneyjar.zhutongtong.cn/api/api/transactions/' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: zh-CN,zh;q=0.9,zh-HK;q=0.8,en-US;q=0.7,en;q=0.6' \
  -H 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNTMyMDU1NC03YThhLTQ3NGMtOGRmYi05ZWRkMDA1NmEzZDAiLCJlbWFpbCI6InpodTE1OTI5Nzc0MzA0QGdtYWlsLmNvbSIsInBsYW4iOiJmcmVlIiwiaWF0IjoxNzc1ODc5MzU1LCJleHAiOjE3NzU4ODAyNTV9.5_SqG-gN4PszECR6kNAWUY_eqz4T74XEiB1DLZ2f6VM' \
  -H 'cache-control: no-cache' \
  -b 'Hm_lvt_ede26455936c86e9ca96f051b0734ab9=1762869678' \
  -H 'pragma: no-cache' \
  -H 'priority: u=1, i' \
  -H 'referer: https://moneyjar.zhutongtong.cn/record' \
  -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
  -H 'sec-ch-ua-mobile: ?1' \
  -H 'sec-ch-ua-platform: "iOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'

  6. 接口报错：
  7. 
  curl 'https://moneyjar.zhutongtong.cn/api/auth/exchange' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: zh-CN,zh;q=0.9,zh-HK;q=0.8,en-US;q=0.7,en;q=0.6' \
  -H 'cache-control: no-cache' \
  -H 'content-type: application/json' \
  -b 'Hm_lvt_ede26455936c86e9ca96f051b0734ab9=1762869678' \
  -H 'origin: https://moneyjar.zhutongtong.cn' \
  -H 'pragma: no-cache' \
  -H 'priority: u=1, i' \
  -H 'referer: https://moneyjar.zhutongtong.cn/auth/callback?exchange_code=5503cd4b-cd82-4ddf-a677-8d26e7f6a2d3&return_to=%2Fsettings' \
  -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
  -H 'sec-ch-ua-mobile: ?1' \
  -H 'sec-ch-ua-platform: "iOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1' \
  --data-raw '{"code":"5503cd4b-cd82-4ddf-a677-8d26e7f6a2d3"}'