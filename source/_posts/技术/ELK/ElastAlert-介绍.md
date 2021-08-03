---
title: ElastAlert-介绍
categories:
  - 技术
tags:
  - ElastAlert
  - ELK
abbrlink: 9f0e3b5c
date: 2021-05-19 00:00:00
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

#$ pip3 install "elasticsearch>=5.0.0"
$ pip3 install elasticsearch==7.0.0
```

### 命令
```sh
# 创建索引
$ elastalert-create-index

# 测试Rule，24小时内以调试模式运行。--config：指定配置文件
$ elastalert-test-rule example_rules/example_frequency.yaml
# 或
$ python3 -m elastalert.elastalert --config ./config.yaml --rule rules/service_exception.yaml --start 2021-05-16T00:00:00+08:00 --debug --es_debug --es_debug_trace trace-20210617.log

# 后台运行
nohup python3 -m elastalert.elastalert --config ./config.yaml --rule ./your_rule.yaml --verbose >> ./elastalert.log 2>&1 &
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

详细请看源码文件elastalert/schema.yaml

### Rule Types

frequency：频率；在给定时间范围内至少有一定数量的事件时，此规则匹配
* num_events：触发警报的事件数
* timeframe：事件数必须发生在的此时间段内，触发报警
* use_count_query：使用count API轮询Elasticsearch

any：任意；过滤器每次匹配都会警报

blacklist：黑名单；将对照黑名单检查某个字段，如果该字段在黑名单中，则进行匹配
* compare_key： 用于与黑名单进行比较的字段的名称，如果字段为null，那么这些事件将被忽略
* blacklist：黑名单值的列表

whitelist：白名单；与黑名单类似

change：变动；将监视特定字段，并在该字段发生更改时进行匹配
* compare_key：要监视更改的字段的名称
* ignore_null：如果为true，则没有compare_key字段的事件将不会计为已更改
* query_key：对每个query_key的唯一值分别计数。
* timeframe: 可选；时间范围，两次更改之间的最长时间。在这段时间之后，ElastAlert将忘记compare_key字段的旧值

spike：突刺；当给定时间段内的事件量是前一时间段内的spike_height倍数时，此规则匹配
* spike_height：上一个时间范围内的事件数量与前一个时间范围内的事件数量之比，匹配时触发警报
* spike_type：‘up’, ‘down’ or ‘both’
* timeframe：当前窗口和参考窗口的时间范围
* field_value：可选；使用文档中字段的值而不是匹配文档的数量
* threshold_ref：参考窗口中必须存在的最少数量的事件才能触发警报
* threshold_cur：当前窗口中必须存在的最小数量的事件才能触发警报

flatline：阈值；当事件总数在一个时间段内低于给定阈值时，此规则匹配
* threshold：不触发警报的最小事件数
* timeframe：时间范围

new_term：新值；当新值出现在以前从未见过的字段中时，此规则匹配

* fields：监视字段列表

cardinality：基数阈值；当时间范围内某个字段的唯一值的总数大于或小于阈值时，此规则匹配
* cardinality_field：要计算基数的字段
* timeframe：时间范围

metric_aggregation：当计算窗口中的度量值高于或低于阈值时，此规则匹配
* metric_agg_key：指标字段
* metric_agg_type：指标类型，‘min’, ‘max’, ‘avg’, ‘sum’, ‘cardinality’, ‘value_count’
* max_threshold：最大阈值
* min_threshold：最小阈值

spike_aggregation：当计算窗口中某个指标的值是spike_height乘以比前一个时间段大或小时，该规则匹配
* metric_agg_key：指标字段
* metric_agg_type：指标类型，‘min’, ‘max’, ‘avg’, ‘sum’, ‘cardinality’, ‘value_count’
* spike_height：上一个时间范围内的事件数量与前一个时间范围内的事件数量之比，匹配时触发警报
* spike_type：‘up’, ‘down’ or ‘both’
* buffer_time：当前窗口和参考窗口的时间范围
* query_key：按字段分组
* metric_agg_script：计算指标脚本
* threshold_ref：参考窗口中用于触发警报的指标的最小值
* threshold_cur：当前窗口中用于触发警报的指标的最小值
* min_doc_count：当前窗口中触发警报所需的最小事件数

percentage_match：当计算窗口内匹配桶中文档的百分比高于或低于阈值时，此规则匹配
* match_bucket_filter：匹配桶定义了一个过滤器
* min_percentage：匹配文档的百分比小于此数字，则会触发警报
* max_percentage：匹配文档的百分比大于此数字，则会触发警报

![IMAGE](https://gitee.com/lights8080/lights8080-oss/raw/master/2021/06/xZ1jbI.jpg)

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
[ElastAlert](https://elastalert.readthedocs.io/en/stable/index.html)
[elastalert搭建](https://www.cnblogs.com/evescn/p/13098343.html)
[ElastAlert安装与使用](https://www.jianshu.com/p/e6281cf72e95/)
[Rule Filters说明](https://elastalert.readthedocs.io/en/stable/recipes/writing_filters.html)