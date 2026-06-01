---
title: API 参考
description: 用于以编程方式查询和安装 Skill 的 REST API。
category: 参考
order: 5
updatedAt: 2026-05-19
---

## 基础 URL

```
https://api.skills.re
```

## 交互式文档

完整的 OpenAPI 规范可在以下地址查看：

```
https://api.skills.re/docs
```

所有请求和响应模式均在此定义。以下章节介绍外部开发者最常用的端点。

## 身份认证

大多数读取端点为公开访问。认证请求使用通过 `skills-re auth login`（设备流程）获取的 Bearer token：

```
Authorization: Bearer <token>
```

## Skills

### 搜索 Skill

```
POST /skills/search
```

**请求体**

```json
{
  "query": "code review",
  "tags": ["testing"],
  "categories": ["development"],
  "limit": 20,
  "cursor": "<分页游标>"
}
```

所有字段均为可选。返回包含 `page`、`continueCursor` 和 `isDone` 的分页结果。

### 按路径获取 Skill

```
GET /skills/by-path?authorHandle=<handle>&skillSlug=<slug>
GET /skills/by-path?authorHandle=<handle>&repoName=<repo>&skillSlug=<slug>
```

### 提交 GitHub 仓库

```
POST /skills/submit-github-repo-public
```

触发对公开 GitHub 仓库中 Skill 的发现和导入。由 `/submit` 页面调用。

## CLI 端点

以下端点由 `skills-re` CLI 使用。

### 解析安装

```
GET /cli/skills/resolve-install?skill=<author/repo/skill>&version=<version>
```

解析给定 Skill 路径的最新可安装快照，返回归档下载 URL、锁文件条目和快照元数据。

### 下载 Skill 归档

```
GET /skills/download?snapshotId=<id>
```

下载已安装 Skill 快照的 `.tar.gz` 归档文件。

### 通知安装

```
POST /cli/skills/notify-install
```

**请求体：** `{ "repoUrl": "https://github.com/owner/repo", "ref": "<sha>" }`

## 认证端点

```
POST /auth/device/code
POST /auth/device/token
GET  /cli/auth/session
POST /cli/auth/revoke
```

## MCP 服务器

Model Context Protocol 服务器可在以下地址访问：

```
GET/POST https://api.skills.re/mcp
```

传输方式：Streamable HTTP。启动本地 MCP 服务器：`skills-re mcp`。查看配置：`skills-re mcp --remote-config`。
