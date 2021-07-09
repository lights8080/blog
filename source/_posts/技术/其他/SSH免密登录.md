---
title: "SSH免密登录"
date: 2021-07-09
categories:
- 技术
tags:
- SSH
---

SSH免密码登录

<!-- more -->

###server-1
```sh
$ ssh-keygen -t rsa

$ cat ~/id_rsa.pub >> ～/.ssh/authorized_keys

$ chmod 700 ~/.ssh
$ chmod 600 ~/.ssh/authorized_keys

$ ssh localhost
```

###server-2
```sh
$ ssh-keygen -t rsa

$ cat ~/id_rsa.pub >> ～/.ssh/authorized_keys

$ chmod 700 ~/.ssh
$ chmod 600 ~/.ssh/authorized_keys

$ ssh localhost
# 将server-2公钥粘贴到server-1节点的authorized_keys中
$ ssh server-1 "cat >> ~/.ssh/authorized_keys" < ~/.ssh/id_rsa.pub
```