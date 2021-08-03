---
title: Linux Shell
categories:
  - 技术
tags:
  - Linux
  - shell
abbrlink: 706c2122
date: 2021-06-18 00:00:00
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

## shell环境信息
bashrc与profile都用于保存用户的环境信息，bashrc用于交互式non-loginshell，而profile用于交互式login shell。

```
1. 当bash以login shell启动时，它会执行/etc/profile中的命令，然后/etc/profile调用/etc/profile.d目录下的所有脚本；然后执行~/.bash_profile，~/.bash_profile调用~/.bashrc，最后~/.bashrc又调用/etc/bashrc.

2. 非login方式启动时，它会调用~/.bashrc，随后~/.bashrc中调用/etc/bashrc，最后/etc/bashrc调用所有/etc/profile.d目录下的脚本
```


* /etc/profile：为系统的每个用户设置环境信息，当用户第一次登录时，该文件被执行，并从/etc/profile.d目录的配置文件中搜集shell的设置
* /etc/bashrc：为每一个运行bash shell的用户执行此文件，当bash shell被打开时，该文件被读取。进行个性化设置
* ~/.bash_profile：每个用户都可使用该文件输入专用于自己使用的shell信息，当用户登录时该文件执行一次。默认情况下，他设置一些环境变量，执行用户的.bashrc文件
* ~/.bashrc：该文件包含专用于某个用户的bash shell的bash信息，当登录时以及每次打开新的shell时，该文件被读取
* ~/.bash_logout：当每次退出bash shell时，执行该文件



~/.profile可以设定本用户专有的路径，环境变量，等，它只能登入的时候执行一次

~/.bashrc也是某用户专有设定文档，可以设定路径，命令别名，每次shell script的执行都会使用它一次



命令：

```sh
# 立马生效
source ~/.bash_profile
```
