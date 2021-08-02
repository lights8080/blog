---
title: "ElastAlert-配置"
date: 2021-06-01
categories:
- 技术
tags:
- ElastAlert
- ELK
---

全局配置和规则配置说明

<!-- more -->

### 全局配置（Configuration）
```yaml
# Elasticsearch集群配置
es_host:
es_port:
use_ssl:
verify_certs:
es_username:
es_password:
es_url_prefix:
es_conn_timeout:
# 设置检索rules和hashes的加载类
rules_loader: 'FileRulesLoader'
# 规则配置文件的文件夹的名称，仅rules_loader=FileRulesLoader时有效
rules_folder: rules
# 是否递归rules目录的子目录配置
scan_subdirectories: true
# 查询Elasticsearch的时间间隔
run_every:
  minutes: 1
# 查询窗口的大小
buffer_time:
  minutes: 15
# ElastAlert将存储数据的索引名称
writeback_index: elastalert
# 单次查询Elasticsearch最大文档数，默认10000
max_query_size: 10000
# 滚动浏览的最大页面数，默认0（表示不限制）
max_scrolling_count: 0
# 在滚动浏览上下文中应保持活动状态的最长时间
scroll_keepalive: 
# 汇总在一起的最大警报数
max_aggregation:
# 两次查询之间的最长时间
old_query_limit:
# 禁用未捕获异常的规则，默认True
disable_rules_on_error: 
# ElastAlert完成执行后会显示“禁用规则”列表
show_disabled_rules: true
# 通知邮件列表，当前只有未捕获的异常会发送通知电子邮件
notify_email:
# 警报是否包括规则中描述的元数据，默认False
add_metadata_alert: false
# 跳过无效的文件而不是退出
skip_invalid:
# 失败警报的重试窗口
alert_time_limit:

# 增强模块，与规则一起使用，将其传递给报警器之前对其进行修改或删除
match_enhancements:
- "elastalert_modules.my_enhancements.MyEnhancement"
# 匹配立刻运行增强
run_enhancements_first: true
```




### 规则配置（Rule Configuration）
```yaml
# Elasticsearch配置
es_host: 10.188.10.1
es_port: 9200
es_username: elastic
es_password: xxx
index: logstash-*

# Rule Type
type: 'any'

# 导入公共配置
import:
# 用于标识警报的利益相关者
owner: 'xxx'
# 用于标识警报的相对优先级
priority: 2
# 用于标识警报的类别
catagory: ''
# 规则描述
description: ''

# 设置请求里查询窗口的范围。当use_count_query或use_terms_query为true时，将忽略此值
buffer_time:
  minutes: 5
# 延迟查询
query_delay:
  minutes: 5

# 开启timeframe（查询开始时间=now()-timeframe）
scan_entire_timeframe: true
# 1. 查询开始时间，scan_entire_timeframe开启，use_count_query和use_terms_query未设置时有效
# 2. 规则的事件发生窗口期，如：FrequencyRule-EventWindow
timeframe:
  minutes: 1

# Elasticsearch查询过滤器
filter:
- query:
    query_string:
      query: "level: ERROR"

# 触发报警的事件数
num_events: 5

# 传递给规则类型和警报的查询结果字段列表，默认所有字段
include: 
  - "username"
# 针对每个字段的前X（top_count_number）个最常用的值执行Terms查询
top_count_keys:
  - "username"
# 术语的前X个最常用的值，与top_count_keys一同使用
top_count_number: 5
# 如果为true，top_count_keys中所有字段都会附加.raw
raw_count_keys: true

# 单次查询获取的最大文档数
max_query_size: 10000
# 计数查询（count api），而不下载所匹配的文档
use_count_query: false
# 聚合查询（aggregation），和query_key、doc_type、terms_size一起使用
use_terms_query: false

# use_terms_query=true时，为每个值单独计数
query_key: 'username'
# top_count_keys存在，发送警报时，多个逗号分隔，必须配合compound_query_key使用
query_key: 'service_name,username'
# 复合的查询key，必须与query_key一一对应，get_hits_terms时使用
compound_query_key:
 - service_name
 - username
 
doc_type: _doc
# 桶的最大数
terms_size: 50
# 相关事件一同报警。一个桶触发报警，其他的桶一同触发报警
attach_related: false

# 将多次匹配汇总到一个警报中，将聚合时间期内发生的所有匹配项一起发送
aggregation:
  # 需要大量匹配并只需要定期报告
  hours: 2
  # 汇总所有警报并定期发送报警
  schedule: '2 4 * * mon,fri'
# 为不同的字段值创建一个独立的聚合窗口，默认在聚合窗口期中所有事件被分组在一起
aggregation_key: 'my_data.username'
# 基于第一个事件的时间创建聚合，默认当前时间
aggregate_by_match_time: true
# 对于聚合报警，指定摘要表字段
summary_table_fields:
  - my_data.username

# 忽略一段时间的重复警报，支持query_key
realert: 
  minutes: 10
# 使realert的值呈指数增加
exponential_realert:
  hours: 1

# 是否将时间戳转换为警报中的本地时区
use_local_time: true
# 时间戳类型（iso, unix, unix_ms, custom）
timestamp_type: 'iso'
# 自定义时间戳格式
timestamp_format: '%Y-%m-%dT%H:%M:%SZ'
# 指定时间字段，默认@timestamp
timestamp_field: '@timestamp'

### Metric Aggregation Type or Percentage Match Type
# 使用run_every计算度量计算窗口大小，默认使用buffer_time
use_run_every_query_size: true
# 度量计算窗口大小，必须是buffer_time的倍数
bucket_interval: 

# Alerts
alert:
  - command
  - debug
command: ["python3", "/opt/elastalert/weixin.py", "生产环境报警，报警:", "接口{orgPathName} 出现状态码{statusCode}频率高！","服务 IP: {directBackServer}; 服务端口：{port}"]

```

不同的规则类型参数不同，详细请看源码文件elastalert/schema.yaml
![IMAGE](https://gitee.com/lights8080/lights8080-oss/raw/master/2021/06/xZ1jbI.jpg)

## 参考
[ElastAlert](https://elastalert.readthedocs.io/en/stable/index.html)