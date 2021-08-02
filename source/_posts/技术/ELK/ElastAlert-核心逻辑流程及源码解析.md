---
title: "ElastAlert-核心逻辑流程及源码解析"
date: 2021-06-10
categories:
- 技术
tags:
- ELK
- ElastAlert
---

1. ElastAlert核心逻辑流程及源码解析
2. run_every、buffer_time、timeframe之间的关系
3. num_hits、num_matches说明

<!-- more -->

## 1、核心主流程及源码解析

核心主流程：
1. 初始化ElastAlerter对象，并调用start()：加载规则、并启动job
2. job调用规则处理(handle_rule_execution)：计算结束时间，run_rule，设置job下次执行时间
3. run_rule：计算查询开始和结束时间，run_query，send_alert，回写索引
4. run_query：根据规则调用ES查询，向规则中添加计数数据
5. send_alert：根据计数数据报警，回写索引

流程图如下：
![ElastAlert核心源码解析](https://gitee.com/lights8080/lights8080-oss/raw/master/2021/06/ElastAlert核心源码解析.png)

[ElastAlert核心逻辑流程及源码解析](https://www.processon.com/view/60bf156fe0b34d0950a54ac4?fromnew=1)

## 2、run_every、buffer_time、timeframe之间的关系

* run_every：任务执行时间间隔
* buffer_time：查询窗口范围。未设置use_count_query和use_terms_query时，有效
* timeframe：事件数的时间窗口

## 3、num_hits、num_matches说明

* match['num_hits']：查询文档计数或聚合桶数
* match['num_matches']：查询符合过滤规则的计数
```python
### match['num_hits']不同的查询统计，计算方式不同
# get_hits_count：
thread_data.num_hits += res['count']

# get_hits：
thread_data.num_hits += len(res['hits']['hits'])

# get_hits_terms：
thread_data.num_hits += len(res['aggregations']['counts']['buckets'])

# get_hits_aggregation：
thread_data.num_hits += res['hits']['total']['value']
```