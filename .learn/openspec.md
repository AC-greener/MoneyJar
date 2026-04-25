`delta spec` 可以理解成“这次 change 对主规格的增量说明”。

在 OpenSpec 里，通常有两层东西：

1. `change artifacts`
放在 `openspec/changes/<change>/...`
这里描述“这次准备做什么、怎么做、任务怎么拆”

2. `main specs`
放在 `openspec/specs/<capability>/spec.md`
这里描述“项目现在正式承认的能力合同是什么”

所以 `delta spec` 就是 change 里面这份文件：

`openspec/changes/<change>/specs/<capability>/spec.md`

它不是整本总规范，而是“相对于主 spec，这次新增/修改/删除了什么 requirement”。

一个典型 delta spec 会长这样：

```md
## ADDED Requirements

### Requirement: Android app SHALL support local bookkeeping
...

## MODIFIED Requirements

### Requirement: Existing Feature
...
```

为什么当时没有 delta spec，核心原因很简单：

- 我们那次 `android-mvp-mock-ui` 虽然写了 `proposal.md`、`design.md`、`tasks.md`
- 但没有在 `openspec/changes/.../specs/...` 下面创建对应的 `spec.md`

也就是说，那次 change 其实缺了“把变更翻译成正式 requirement”的那一层。

所以后来归档时就会出现这个结果：

```text
有 proposal/design/tasks
没有 delta spec
=> 没有东西可同步到 openspec/specs/
=> 主 spec 不会自动生成
```

换句话说：

- `proposal` 回答的是：为什么做
- `design` 回答的是：怎么做
- `tasks` 回答的是：怎么拆活
- `delta spec` 回答的是：这个 change 最终改变了系统哪些正式能力定义

而那次少掉的，正是最后这一层。

你现在看到我补的 [android-mock-bookkeeping-app/spec.md](/Users/tongtong/AndroidStudioProjects/MoneyJar/openspec/specs/android-mock-bookkeeping-app/spec.md:1)，本质上就是在“事后补主 spec”，把原来没有沉淀进去的能力合同补回来。

以后避免这个问题，最稳的做法是：

- 每个会落地的 change，都在 `openspec/changes/<change>/specs/<capability>/spec.md` 写 delta spec
- 再归档或 sync 到主 `openspec/specs/...`


archive without syncing openspec-archive-change 的规则本来就允许“有 delta spec 但跳过同步”。

delta spec：某个 change 里的增量规范
main spec：项目当前正式生效的能力规范
归档不等于同步，sync 之后主 spec 才会出现
