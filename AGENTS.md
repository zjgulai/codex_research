# Repository guidance

修改前先读 `README.md`、`METHODOLOGY.md` 与 `PLAN.md`。

- 公开站点必须保持为 `public/index.html` 单文件；不得加入外部运行依赖、追踪器或远程资源。
- 重新生成必须使用 `scripts/build-site.mjs`，并保留输入时间点、版本漂移和证据缺口。
- 不得把 publisher claim、安装状态、Skill 加载、认证、一次调用或生产可用性互相升级。
- M00–M13 是模块，A00–A13 是交接产物，G0–G6 是生命周期的人类决策门；不要复用 G 编号表示动作影响。
- 变更分类规则后，必须重新运行数据不变量、ELI5 checker、桌面/手机浏览器和公开页面验证。
