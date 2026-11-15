# 配置与主题

内容仓库使用 `site.json`，不用复制或修改模板的 TypeScript 源码。构建器把配置校验后写入临时模板的 `src/site.override.json`，与 `src/site.config.ts` 的默认值合并。

## 内容仓库的 `site.json`

```json
{
  "title": "我的博客",
  "suffix": "/ notes",
  "description": {
    "zh": "关于代码、工具和日常的笔记。",
    "en": "Notes on code, tools and everyday life."
  },
  "url": "https://blog.example.com",
  "favicon": "/content/images/favicon.svg",
  "author": "你的名字",
  "sameAs": [],
  "postsOnHome": 0
}
```

所有字段均为可选，未提供的值使用模板默认配置：

| 字段 | 类型 | 用途 |
| --- | --- | --- |
| `title` | string | 站点名称、页头和页面 metadata |
| `suffix` | string | 首页封面标题和站点后缀 |
| `description` | `{ zh?: string, en?: string }` | 两种语言的介绍与摘要 |
| `url` | string | 站点 HTTP(S) origin，不含子路径、查询、fragment 或账号信息 |
| `favicon` | string | 浏览器标签页图标的站内绝对路径或完整 HTTP(S) URL；默认 `/favicon.svg` |
| `socialImage` | string | 自定义分享图片的站内绝对路径或完整 HTTP(S) URL；省略时自动生成 `/og.png` |
| `author` | string | 作者署名 |
| `email` | string | 页脚邮箱；空字符串可隐藏 |
| `about` | string | 关于页面链接；空字符串可隐藏 |
| `repo` | string | 内容或站点源码仓库地址 |
| `sameAs` | string[] | 页脚个人链接，空数组可隐藏默认示例链接 |
| `postsOnHome` | integer | 首页总文章数，包含推荐文章；`0` 表示全部 |
| `license` | `{ name?: string, url?: string }` | 文章许可名称与地址 |

`description` 和 `license` 按字段合并，其他字段整体覆盖。未知字段、错误类型和负数/小数形式的 `postsOnHome` 会在构建前报错，错误中包含配置文件路径。

默认读取 `<contentDir>/site.json`；也可使用 `--config /path/to/site.json`。文件是 JSON，不执行任意 JavaScript。内容仓库里的 `.env`、应用源码和其他文件不会被复制进临时模板。

## 网站图标

`favicon` 从 `@swufefox/ak-blog` 1.0.3 起提供；使用旧版包时需先升级。

将自己的图标放入内容仓库的 `images/`，例如 `images/favicon.svg`，再在 `site.json` 设置：

```json
{
  "favicon": "/content/images/favicon.svg"
}
```

SVG、PNG 和 ICO 可随站点导出；也可以填写 `https://example.com/favicon.png` 这样的外链地址。路径以站点根目录的 `/` 开头，不要填写本机路径或 `../images/…`。配置会用于中英文首页、文章、搜索、归档及 404。

没有配置时使用模板的文档图标，不再固定显示 AK。源码项目可在 `src/site.override.json` 使用相同字段，或直接替换 `public/favicon.svg`。页头方块仍取站点名称前两个字，与浏览器图标独立。

浏览器和静态图片 CDN 会缓存图标。更新时可换一个文件名，例如 `favicon-v2.svg`，同步修改配置并重新构建部署。

## 分享卡片

`socialImage` 从 1.0.4 起提供。不设置时，模板使用站点名称、后缀、默认语言简介和域名生成 1200×630 的 `/og.png`。构建使用包内的 Noto Sans CJK 字体，支持中文，不依赖在线字体请求；字体只用于构建，不会由网页下载。

使用自己的图片时，把 PNG/JPEG 放入内容仓库的 `images/`，例如 `images/social.png`，再设置：

```json
{
  "socialImage": "/content/images/social.png"
}
```

也支持完整 HTTP(S) 图片地址。建议图片使用 1200×630；模板不会猜测自定义图片的尺寸。中英文首页和文章的 Open Graph / Twitter metadata 共用这张图片，替代文字使用当前语言的站点简介。替换图片时建议更换文件名并重新构建。

## 域名优先级

从高到低：

1. 构建进程的 `NEXT_PUBLIC_SITE_URL` 环境变量。
2. `site.json.url`。
3. 模板默认的 `https://example.com`。

`url` 是 origin，例如 `https://blog.example.com`；不是 `https://example.com/blog`。构建器会移除 JSON origin 的尾部斜线。canonical、RSS、sitemap 和社交图片地址在构建时确定，因此改域名后需重新构建。

## 修改独立源码项目

通过 `ak-blog init` 创建的项目可以直接编辑 `src/site.override.json`，或者在 `src/site.config.ts` 修改模板默认值。前者与内容仓库的 `site.json` 使用相同字段。

`src/site.config.ts` 还包含源码层面的语言列表、语言名称、导航文案和 `UiStrings` 类型。它没有文件系统依赖，可以被客户端模块安全导入。构建 API 位于独立的 `@swufefox/ak-blog/build` 入口，不会进入浏览器 bundle。

## 语言与路由

包的默认契约是中文 `/` 和英文 `/en`：

- `posts/example.md` → `/posts/example`
- `posts/en/example.md` → `/en/posts/example`
- 同名文件互为翻译，缺少翻译时不生成对应文章入口。
- 只有中文文章时，英文首页、搜索、归档和空 RSS 仍可生成。
- 标签和分类页切换语言时，存在同名词条就保留词条路径；目标语言没有该词条时，返回对应语言的归档页。

添加其他语言是源码定制，不是随意在 JSON 中增加一个键：需要更新语言类型、完整 UI 文案、URL 约定、对应的静态路由入口，以及 `next.config.ts` 的可选路由扩展。页面实现可复用 `src/views/`，无需复制整套页面布局。

## 界面文案

`src/lib/i18n.ts` 的 `strings` 是 `Record<Locale, UiStrings>`，确保每种语言字段完整：

- 导航：`home`、`navMenu`、`close`、`switchLanguage`、`skip`、`themeToggle`。
- 文章：`published`、`readingTime`、`readMinutes`、`updated`、`toc`、`colophon`、许可、上一篇/下一篇和复制按钮。
- 首页与归档：`latestEntry`、`readArticle`、`moreEntries`、文章与标签计数、表头和空态。
- 搜索：输入提示、单复数结果、无结果和清除动作。
- 404：标题、说明和返回首页。

带参数的文案使用函数；搜索结果计数保留 `{count}` 占位，由浏览器格式化。

## 主题与样式

`archive` 是浅色，`terminal` 是深色。主题开关把选择保存在 `localStorage['ak-theme']`；根文档的预绘制脚本恢复主题和浏览器地址栏颜色。

| 层 | 文件与变量 |
| --- | --- |
| ak-ui 语义令牌 | `--ak-surface-*`、`--ak-text-*`、`--ak-signal-*` 等 |
| 独立组件 | `src/styles/components.css` 的 `--blog-*` 映射 |
| 完整模板 | `src/styles/globals.css` 的 `--site-*` 映射 |

组件样式与完整页面样式分别维护。结构与文字使用墨色，动作黄表示交互或状态，危险红用于错误页。设计规则见[设计系统](design-system.md)。
