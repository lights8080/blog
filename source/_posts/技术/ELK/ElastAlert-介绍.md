---
title: "ElastAlert-介绍"
date: 2021-05-19
categories:
- 技术
- ELK
tags:
- 技术
- ELK
---

<!-- more -->

## 一、Alerting With Elasticsearch
> ElastAlert是一个简单的框架，用于从Elasticsearch中的数据中发出异常，尖峰或其他感兴趣的模式的警报。

它通过将Elasticsearch与两种类型的组件（规则类型和警报）结合使用。定期查询Elasticsearch，并将数据传递到规则类型，该规则类型确定找到任何匹配项。发生匹配时，它会发出一个或多个警报，这些警报根据不同的类型采取相应的措施。

ElastAlert由一组规则配置，每个规则定义一个查询，一个规则类型和一组警报。

### 特性
* 架构简单，定制灵活
* 支持多种匹配规则（频率、阈值、数据变化、黑白名单、变化率等）
* 支持多种警报类型（邮件、HTTP POST、自定义脚本等）
* 匹配项汇总报警，重复警报抑制，报警失败重试和过期
* 可用性强，状态信息保存到Elasticsearch的索引中
* 过程的调试和审计等

### 可用性（Reliability）
* ElastAlert 将其状态保存到 Elasticsearch，启动后，将恢复之前停止的状态
* 如果 Elasticsearch 没有响应，ElastAlert 将等到恢复后才继续
* 抛出错误的警报可能会在一段时间内自动重试

### 模块性（Modularity）
ElastAlert具有三个主要组件（规则类型、警报、增强），可以作为模块导入和定制。
* 规则类型（Rule Types）
规则类型负责处理从Elasticsearch返回的数据。它会使用规则配置进行初始化，传递通过规则过滤器查询Elasticsearch返回的数据，并根据此数据输出匹配项。

* 警报（Alerts）
警报负责根据匹配采取行动。匹配项通常是一个字典，其中包含Elasticsearch中文档中的值，但可以包含由规则类型添加的任意数据。

* 增强（Enhancements）
增强功能是一种拦截警报并以某种方式对其进行修改或增强的方法。在将其提供给警报器之前，将它们传递给匹配字典。

### 全局配置（Configuration）
config.yaml
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
writeback_index: elastalert_status
# 单次查询Elasticsearch最大文档数，默认10000
max_query_size: 10000
# 滚动浏览的最大页面数，默认0（表示不限制）
max_scrolling_count: 0
# 在滚动浏览上下文中应保持活动状态的最长时间
scroll_keepalive: 
汇总在一起的最大警报数
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
```

## 二、Running ElastAlert
> 安装、命令、测试规则、运行

### 安装
```sh
# Python3.6安装
$ wget https://www.python.org/ftp/python/3.6.9/Python-3.6.9.tgz
$ tar -zxvf Python-3.6.9.tgz
$ cd Python-3.6.9
$ ./configure
$ make && make install

# 检查Python版本
$ python3 -V

# 安装
$ git clone https://github.com/Yelp/elastalert.git

$ wget https://github.com/daichi703n/elastalert/archive/refs/heads/fix/initialize_alerts_sent.zip

$ cd elastalert/
$ pip3 install "setuptools>=11.3"
$ python3 ./setup.py install

# 报错（pip:No module named setuptools_rust）解决办法
$ pip3 install setuptools-rust

$ pip3 install "elasticsearch>=5.0.0"
```

### 命令
```sh
# 创建索引
$ elastalert-create-index

# 测试Rule，24小时内以调试模式运行。--config：指定配置文件
$ elastalert-test-rule example_rules/example_frequency.yaml
# 或
$ python3 -m elastalert.elastalert --config ./config.yaml --rule rules/service_exception.yaml --start 2021-05-16T00:00:00+08:00 --debug --es_debug

# 后台运行
nohup python3 -m elastalert.elastalert --config ./config.yaml --verbose --rule ./your_rule.yaml >> ./elastalert.log 2>&1 &
```

#### 测试规则（Testing Rule）
可以在调试模式下运行ElastAlert，也可以使用elastalert-test-rule（该脚本可以简化测试的各个方面）

功能：
* 检查配置文件是否加载成功
* 检查Elasticsearch过滤器是否解析
* 与最后的X天(s)运行，显示匹配您的过滤器的点击数
* 在一个结果中显示可用的术语
* 保存返回到JSON文件的文档
* 使用JSON文件或Elasticsearch的实际结果运行ElastAlert
* 打印调试警报或触发真实警报
* 如果存在，则检查结果中是否包含primary_key、compare_key和include术语
* 显示将要写入elastalert_status的元数据文档

参数：
* --schema-only：只对文件执行验证
* --count-only：仅查找匹配文档的数量并列出可用字段
* --days N：指定针对最近的N天运行，默认1天
* --save-json FILE：将所有下载的文档保存为JSON文件
* --data FILE：使用JSON文件代替Elasticsearch作为数据源
* --alert：触发实际警报，而不是调试（日志文本）警报
* --formatted-output：以格式化的JSON输出结果。

#### 运行（Running ElastAlert）
有两种运行ElastAlert的方法。作为守护程序或直接与Python一起使用（$ python3 elastalert/elastalert.py）。

参数：
* --config：指定要使用的配置文件，默认值为config.yaml
* --debug：debug模式；1.增加日志记录的详细程度，2.将所有的报警更改为DebugAlerter，抑制它们正常的报警行为，3.跳过写入查询和警报的元数据到Elasticsearch
* --verbose：将增加日志记录的详细程度，与--debug不兼容
* --start <timestamp>：强制从指定的时间查询，而不是当前时间。如：2021-05-16T00:00:00+08:00
* --end <timestamp>：将强制在指定时间之后停止查询，默认到当前时间
* --rule <rule.yaml>：只运行给定的规则
* --silence <unit>=<number>：将使给定规则的警报静音一段时间。该规则必须使用--rule指定
* --es_debug：启用对Elasticsearch进行的所有查询的日志记录。
* --es_debug_trace <trace.log>：将启用将对Elasticsearch进行的所有查询的curl命令记录到指定的日志文件
* --pin_rules：禁用动态加载规则

## 三、Rule Types and Configuration Options
> 规则类型、配置项、报警配合
> https://elastalert.readthedocs.io/en/stable/ruletypes.html

### Rule Types

* frequency：频率；在给定时间范围内至少有一定数量的事件时，此规则匹配
  * num_events：触发警报的事件数
  * timeframe：事件数必须发生在的此时间段内，触发报警
  * use_count_query：使用count API轮询Elasticsearch
* any：过滤器每次匹配都会警报
* blacklist：黑名单；将对照黑名单检查某个字段，如果该字段在黑名单中，则进行匹配
  * compare_key： 用于与黑名单进行比较的字段的名称，如果字段为null，那么这些事件将被忽略
  * blacklist：黑名单值的列表
* whitelist：白名单；与黑名单类似
* change：更改；将监视特定字段，并在该字段发生更改时进行匹配
  * compare_key：要监视更改的字段的名称
  * ignore_null：如果为true，则没有compare_key字段的事件将不会计为已更改
  * query_key：对每个query_key的唯一值分别计数。
  * timeframe: 可选；时间范围，两次更改之间的最长时间。在这段时间之后，ElastAlert将忘记compare_key字段的旧值
* spike：当事件发生率增加或减少时匹配，它使用两个滑动窗口来比较事件的当前频率和参考频率
  * spin_height：上一个时间范围与上一个时间范围内的事件数之比，点击该事件将触发警报
  * spike_type：‘up’, ‘down’ or ‘both’
  * timeframe：平均出该时间段内的事件发生率
  * field_value：可选；使用文档中字段的值而不是匹配文档的数量
  * threshold_ref：参考窗口中必须存在的最少数量的事件才能触发警报
  * threshold_cur：当前窗口中必须存在的最小数量的事件才能触发警报
* flatline：当事件总数在一个时间段内低于给定阈值时，此规则匹配
  * threshold：不触发警报的最小事件数
  * timeframe：时间范围
* new_term：当新值出现在以前从未见过的字段中时，此规则匹配
  * fields：监视字段列表
* cardinality：当时间范围内某个字段的唯一值的总数大于或小于阈值时，此规则匹配
  * cardinality_field：要计算基数的字段
  * timeframe：时间范围
* metric_aggregation：当计算窗口中的度量值高于或低于阈值时，此规则匹配
* spike_aggregation：当计算窗口中某个指标的值是spike_height乘以比前一个时间段大或小时，该规则匹配
* percentage_match：当计算窗口内匹配存储区中的文档百分比高于或低于阈值时，此规则匹配

![IMAGE](https://gitee.com/lights8080/lights8080-oss/raw/master/2021/06/xZ1jbI.jpg)


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
# Alerts
alert:
  - email
  - debug

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

# 开启timeframe（当前时间减去timeframe之后开始查询）
scan_entire_timeframe: true
# 
timeframe:
  minutes: 1

# Elasticsearch查询过滤器
filter:
- query:
    query_string:
      query: "level: ERROR"

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

# 为每个值单独计数（多个逗号分隔，必须配合compound_query_key使用）
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

```

### Alerts
每个规则都可以附加任何数量的警报。每个警报器的选项既可以定义在yaml文件，也可以嵌套在警报名称中，允许同一警报器的多个不同设置。

* Command：命令报警，并从匹配项中传递参数
* Email：邮件报警
* Http Post：URL报警
* ... 


示例：
```yaml
name: API not 200
index: sg-access-*
type: frequency
num_events: 20
timeframe:
  minutes: 1
filter:
- query:
    query_string:
      query: "NOT statusCode: 200"

alert:
  - command
  - debug

command: ["python3", "/opt/elastalert/weixin.py", "生产环境报警，报警:", "接口{orgPathName} 出现状态码{statusCode}频率高！","服务 IP: {directBackServer}; 服务端口：{port}"]
```

## 四、ElastAlert Metadata Index
ElastAlert使用Elasticsearch来存储有关其状态的各种信息。这不仅可以对ElastAlert的操作进行某种程度的审核和调试，还可以避免在ElastAlert关闭，重新启动或崩溃时丢失数据或重复警报。Elasticsearch群集和索引信息在全局配置文件中使用es_host，es_port和writeback_index进行定义。ElastAlert必须能够写入此索引。脚本elastalert-create-index将为您创建具有正确映射的索引，并可以选择从现有ElastAlert回写索引中复制文档。

ElastAlert将在回写索引（writeback index）中创建三种不同类型的文档。

#### elastalert_status
> 记录规则的查询执行日志

elastalert_status是ElastAlert在确定其首次开始时要使用的时间范围，以避免重复查询。对于每个规则，它将从最近的结束时间开始查询。如果ElastAlert在调试模式下运行，它仍将通过查找最近执行的搜索来尝试基于其开始时间，但不会将任何查询的结果写回到Elasticsearch。

#### elastalert
> 记录触发的每个警报信息日志

#### elastalert_error
> 当ElastAlert中发生错误时，它将同时写入Elasticsearch和stderr

#### silence
> 记录何时将抑制给定规则的警报的日志

## 参考
https://elastalert.readthedocs.io/en/stable/index.html
https://www.cnblogs.com/evescn/p/13098343.html
https://www.jianshu.com/p/e6281cf72e95/
