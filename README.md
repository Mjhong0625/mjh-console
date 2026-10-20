# MJH 总汇

只有你自己用的小后台：列出所有品牌的在线状态与数据摘要（不含会员个资）。

## 部署（Railway，一份就好）
1. 新 GitHub repo `mjh-console`，把本资料夹内容推上去
2. Railway 部署，加 Volume 挂 `/data`
3. Variables：`CONSOLE_PASSWORD`（≥10位）、`DATA_DIR=/data`、`NODE_ENV=production`
4. Custom Domain：`telegrambot.mjhco.com`；Cloudflare 加 CNAME（先灰云）
5. 你自己的总汇在 `telegrambot.mjhco.com/admin`，登入 → 添加品牌（名称、该品牌后台网址、PLATFORM_KEY）

## 另见
- `ops/新客户开通清单.md`
- `ops/sync-template.sh` + `ops/customers.txt`

## 客户统一入口
- 客户打开 `telegrambot.mjhco.com`，输入账号，系统向各品牌后台询问「有没有这个账号」，找到后自动跳转到该品牌后台并带入账号，客户再输入密码。
- 账号必须全局唯一：建议用「品牌缩写+名字」，如 `dbt-amy`。重复时入口会提示联系技术支持。
- `owner` 不能从入口登入（owner 是你的系统账号，直接用品牌网址）。
- 品牌必须已在总汇登记，且设置了 PLATFORM_KEY。
