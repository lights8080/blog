---
title: "Linux 2>&1"
date: 2021-07-07
categories:
- 技术
- Linux
tags:
- 技术
- Linux
---

2>&1说明

<!-- more -->

## 2>&1

看下这个命令`nohup command>/dev/null 2>&1 &`

- `nohup` 表示可以在你退出帐户之后继续运行相应的进程
- `>` 代表重定向到哪里，例如：echo "123" > /home/123.txt
- /dev/null 表示空设备文件
- 2>&1 表示把标准错误重定向到标准输出
  - 0 表示stdin标准输入
  - 1 表示stdout标准输出，系统默认值是1，所以”>/dev/null”等同于 “1>/dev/null”
  - 2 表示stderr标准错误
- `&` 表示该命令以后台的job的形式运行

## command>a 2>a VS command>a 2>&1

* command>a 2>&1：打开了一次文件a，&1的含义就可以理解为用标准输出的引用
* command>a 2>a：打开文件两次，并导致stdout被stderr覆盖

## >/dev/null 2>&1 VS 2>&1 >/dev/null

* `>/dev/null 2>&1`：标准输出(丢弃)，错误输出(丢弃)
* `2>&1 >/dev/null`：标准输出(丢弃)，错误输出(屏幕)

