# Codex Plugin Full-stack Atlas

一个可离线打开的单页网站，把 4,184 个 Codex 插件及可取得证据的 Skill 映射到 `vibecoding_config` 的 M00–M13 全栈开发节点。

网站为 [public/index.html](public/index.html)。它不加载外部脚本、字体、图片或数据；搜索、筛选、节点地图和详情抽屉都在单个 HTML 内运行。

## 它回答什么

每个插件或 Skill 固定回答三件事：

1. 它替你处理什么；
2. 怎么才能用；
3. 用完怎样才算数。

节点映射是研究模型的推断，不是插件作者的官方定位。插件只能为 Gate 提供证据，不能替人通过 Gate。`已安装`、`已认证`、`调用通过`和`生产可用`也是四种不同状态。

## 证据基线

- 插件身份与状态：4,184 个 canonical plugin IDs，冻结于 2026-09-16 01:29:11 +08:00。
- 插件丰富元数据与公共声量代理：研究快照生成于 2026-09-15T18:01:19.457Z。
- 当前 remote catalog Skill 证据：抓取于 2026-09-15T20:05:45.943690Z。
- 全栈节点：[vibecoding_config@d0a611e](https://github.com/zjgulai/vibecoding_config/commit/d0a611e7d86939ba873af2bd5e686e64b07f85ea)。
- 保真改写方法：[shuorenhua@5a9eafe](https://github.com/MrGeDiao/shuorenhua/commit/5a9eafefe03807404135f4d2ee4f42fe61d58759)。

完整方法、已知缺口与排序边界见 [METHODOLOGY.md](METHODOLOGY.md)，执行状态见 [PLAN.md](PLAN.md)。

## 本地再生成

无需安装 npm dependency。准备冻结的研究快照与 Codex remote catalog 后运行：

```bash
node scripts/build-site.mjs \
  --snapshot=/absolute/path/plugin-research-snapshot.json \
  --catalog=/absolute/path/remote-plugin-catalog.json \
  --local-cache=/absolute/path/plugin-cache \
  --output=public/index.html \
  --manifest=data/build-manifest.json
```

生成器会验证 canonical ID 唯一性、总数、单一主节点、技能父子关系、HTML CSP、内嵌数据一致性和敏感路径泄漏。

生成后再运行独立 artifact 检查：

```bash
node scripts/verify-artifact.mjs public/index.html data/build-manifest.json
```

## 发布

推送 `main` 后，GitHub Actions 直接把 `public/` 部署到 GitHub Pages。没有构建步骤，也不会把本地研究原始文件发布出去。

## 许可与来源

本仓库未替外部插件说明、两个上游仓库或第三方数据声明新的许可。原始描述仍归各自权利人；本项目只发布必要的短元数据、研究映射和证据边界。
