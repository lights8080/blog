---
title: "Linux Shell"
date: 2021-06-18
categories:
- 技术
- Linux
tags:
- 技术
- Linux
---

shell介绍和shell环境

<!-- more -->

## Shell
shell是用户使用Linux系统的一座桥梁，是一种命令语言。Shell 脚本（shell script）是一种为 shell 编写的脚本程序。业界所说的 shell 通常都是指 shell 脚本，但是shell 和 shell script是两个不同的概念。


Linux Shell分类：
* Bourne Shell（/usr/bin/sh或/bin/sh）
* Bourne Again Shell（/bin/bash）
* C Shell（/usr/bin/csh）
* K Shell（/usr/bin/ksh）
* ...

Bash 也是大多数Linux系统默认的Shell。

命令：
```sh
# 查看shell外壳
echo $SHELL
# 切换bash
chsh -s /bin/bash
```

## shell环境
定制bash shell环境

* /etc/profile：为系统的每个用户设置环境信息，当用户第一次登录时，该文件被执行
* /etc/bashrc：为每一个运行bash shell的用户执行此文件，进行个性化设置
* ~/.bash_profile：为当前用户设置专属的环境信息，当用户登录时该文件执行一次
* ~/.bashrc：为当前用户每次打开新的shell时，读取该文件，进行个性化设置
* ~/.bash_logout：退出shell时被读取

命令：
```sh
# 立马生效
source ~/.bash_profile
```
