---
title: "OOM killer及Overcommit"
date: 2021-05-19 00:00:00
categories:
- 技术
- Linux
tags:
- 技术
- Linux
---

## OOM killer
OOM killer(Out Of Memory killer)是Linux内核的一种内存管理机制，该机制在系统物理内存不足时，选择性（oom_killer遍历当前所有进程，根据进程的内存使用情况进行打分，然后从中选择一个分数最高的进程）杀死一些进程以释放内存，以使系统继续运行。

### Overcommit（过量使用）
这个特性出于优化系统考虑，因为进程实际使用到的内存往往比申请的内存少。

按照Linux的算法，物理内存页的分配发生在使用瞬间，而不是在申请瞬间。Overcommit针对的也是内存申请，而不是内存分配。

Linux下允许程序申请比系统可用内存更多的内存。因为不是所有的程序申请了内存就立刻使用的，当实际使用时超过可分配物理内存时，利用OOM机制选择性杀死一些进程以释放内存。

### 参数调优
vm.overcommit_memory
* 0：OVERCOMMIT_GUESS（默认），内核将检查是否有足够的可用内存供应用进程使用
* 1：OVERCOMMIT_ALWAYS，允许超过CommitLimit的分配，即允许分配所有的物理内存，而不管当前的内存状态如何
* 2：OVERCOMMIT_NEVER，拒绝超过CommitLimit的分配，即拒绝等于或者大于CommitLimit指定的物理 RAM 比例的内存请求

CommitLimit 和 Commited_AS
* CommitLimit：最大能分配的内存
  * 计算公式：(Physical RAM * vm.overcommit_ratio / 100) + Swap
* Committed_AS：当前已经分配的内存

### OVERCOMMIT策略的可用内存判定
* OVERCOMMIT_GUESS：判定可用内存 = free + buff/cache - share + Swap + SLAB已标记可回收的内存 - 系统运行预留的内存 - 管理员操作预留内存
* OVERCOMMIT_ALWAYS：直接返回成功
* OVERCOMMIT_NEVER：判断Committed_AS < CommitLimit

## 相关命令
```shell
# 查看overcommit策略
$ cat /proc/sys/vm/overcommit_memory
# 查看进程OOM得分，oom_killer将首先杀死得分最高的进程
$ cat /proc/<pid>/oom_score
# 查看CommitLimit和Committed_AS
$ cat /proc/meminfo |grep -i commit
```

## 参考
* [Linux OOM killer机制介绍
](https://blog.csdn.net/run_for_belief/article/details/83446344)
