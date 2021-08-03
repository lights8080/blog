---
title: MinIO对象存储
categories:
  - 工具
tags:
  - 开源产品
abbrlink: ca17c92b
date: 2021-07-12 00:00:00
---

> MinIO 是一个基于Apache License v2.0开源协议的对象存储服务。它兼容亚马逊S3云存储服务接口，非常适合于存储大容量非结构化的数据，例如图片、视频、日志文件、备份数据和容器/虚拟机镜像等，而一个对象文件可以是任意大小，从几kb到最大5T不等。
MinIO是一个非常轻量的服务,可以很简单的和其他应用的结合，类似 NodeJS, Redis 或者 MySQL。

<!-- more -->

http://docs.minio.org.cn/docs/

MinIO 是一个基于Apache License v2.0开源协议的对象存储服务。它兼容亚马逊S3云存储服务接口，非常适合于存储大容量非结构化的数据，例如图片、视频、日志文件、备份数据和容器/虚拟机镜像等，而一个对象文件可以是任意大小，从几kb到最大5T不等。

MinIO是一个非常轻量的服务,可以很简单的和其他应用的结合，类似 NodeJS, Redis 或者 MySQL。

## 安装和启动

```sh
wget http://dl.minio.org.cn/server/minio/release/darwin-amd64/minio
chmod 755 minio
./minio server /data
nohup ./minio server  /home/minio/data > /home/minio/data/minio.log 2>&1 &
```
