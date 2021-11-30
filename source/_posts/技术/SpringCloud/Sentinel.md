---
title: Sentinel
categories:
  - 技术
tags:
  - Sentinel
abbrlink: 1408c19
date: 2021-11-25 00:00:00
---

> 

<!-- more -->

## Sentinel（分布式系统的流量防卫兵）
Sentinel 是面向分布式服务架构的轻量级流量控制组件，主要以流量为切入点，从限流、流量整形、熔断降级、系统负载保护等多个维度来帮助您保障微服务的稳定性。
https://sentinelguard.io/zh-cn/index.html

### Sentinel 核心类解析
https://github.com/alibaba/Sentinel/wiki/Sentinel-%E6%A0%B8%E5%BF%83%E7%B1%BB%E8%A7%A3%E6%9E%90

包括Context、Entry、Node（统计节点）、Slot（插槽）。

链路、来源怎么理解？
* 链路：查询商品业务逻辑，在查询订单和创建订单业务中都有调用，既查询商品有两个调用链路。
* 来源：上例中查询订单业务，支持web查询和app查询，既有两个来源。

Node 的分类
* StatisticNode：最为基础的统计节点，包含秒级和分钟级两个滑动窗口结构。
* DefaultNode：链路节点，用于统计调用链路上某个资源的数据，维持树状结构。
* EntranceNode：入口节点，特殊的链路节点，对应某个 Context 入口的所有调用数据。
* ClusterNode：簇点，用于统计每个资源全局的数据（不区分调用链路），以及存放该资源的按来源区分的调用数据（响应时间、QPS、block 数目、线程数、异常数等）。

Node 的维度
* EntranceNode 的维度是 context
* ClusterNode 的维度是 resource
* DefaultNode 的维度是 resource * context

Slot 的分类
* NodeSelectorSlot：负责收集资源的路径，并将这些资源的调用路径以树状结构存储起来，用于根据调用路径进行流量控制。
* ClusterBuilderSlot：用于构建资源的 ClusterNode 以及调用来源节点，用作为多维度限流，降级的依据。
* StatisticSlot 是 Sentinel 的核心功能插槽之一，用于统计实时的调用数据。


规则的种类及属性：
https://github.com/alibaba/Sentinel/wiki/%E5%A6%82%E4%BD%95%E4%BD%BF%E7%94%A8#%E8%A7%84%E5%88%99%E7%9A%84%E7%A7%8D%E7%B1%BB




