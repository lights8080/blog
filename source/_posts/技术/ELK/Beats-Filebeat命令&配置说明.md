---
title: Beats-Filebeat命令&配置说明
date: 2021-04-29 11:27:15
categories:
- 技术
- ELK
tags:
- 技术
- ELK
- Filebeat
---

> 介绍Filebeat命令、配置以及最佳实战。
>  基于7.11版本。

<!-- more -->

## 命令
* export：导出配置到标准输出（configuration, index template, ILM policy, dashboard）
* keystore：管理秘钥仓库
* modules：管理模块配置
* run：运行Filebeat。不知道命令的情况下，默认使用此命令
  * --modules MODULE_LIST：指定运行的模块
* setup：一次性初始化环境。包括索引模板，ILM政策，写别名，Kibana仪表盘等
  * --dashboards：设置Kibana仪表盘，需配置连接Kibana信息
  * --pipelines：设置Elasticsearch的ingest pipelines
  * -e：发送输出到标准错误而不是syslog
  * --index-management：设置与Elasticsearch索引管理相关的组件（template, ILM policy, and write alias）
* test：测试配置文件

全局标记
* -E, --E "SETTING_NAME=VALUE"：覆盖指定的配置
* -M, --M "VAR_NAME=VALUE"：覆盖默认的模块配置
* -c, --c FILE：指定Filebeat的配置文件
* -f：指定管道配置文件
* -d, --d SELECTORS：调试选择器，"*"：开启所有组件的调试，"publish"：开启调试”publish“相关信息
* -e, --e：日志发送到stderr并禁用syslog文件输出
* --path.config：设置配置文件路径

示例：
```shell
# 一次性设置Elasticsearch索引和Kibana仪表板，-e：发送输出到标准错误而不是syslog
./filebeat setup -e

# 启用要运行的模块
./filebeat modules enable system

# 启动
sudo chown root filebeat.yml 
sudo ./filebeat -c filebeat.yml -e
```

## 配置说明 filebeat.yml

* project paths：项目路径
* general settings：配置包括Global、General
* config file loading：允许外部加载inputs和modules配置
* modules：一种开始处理常见日志格式的快速方法
* inputs：指定Filebeat查找和处理的数据
* output：指定输出。如：Logstash、Elasticsearch、Kafka
* Processors：过滤和增强导出的数据
* internal queue：存储事件的内部缓冲队列（内存和磁盘），负责缓冲输入事件并按批次发送到输出。
* load balancing：配置输出的负载均衡
* logging：Filebeat日志输出选项
* http endpoint：Filebeat通过端点查看内部指标
* autodiscover：容器运行时，自动发现配置，移动目标的监视系统

```yaml
### project Paths
# Filebeat主目录，默认安装路径
path.home: 
path.config: ${path.home}
path.data: ${path.home}/data
path.logs: ${path.home}/logs

### Global Filebeat configuration options
# 注册表的根路径，默认${path.data}/registry
filebeat.registry.path: registry
filebeat.registry.file_permissions: 0600
# 控制何时将注册表项写入磁盘(刷新)的超时值
filebeat.registry.flush: 0s
# Filebeat 在关闭之前等待发布者完成发送事件的关闭时间
filebeat.shutdown_timeout: 5s

### General configuration options
# Beat的名字，默认使用主机名
name: my-service
# 标记列表，方便Kibana或Logstash过滤，如服务层，集群名等
tags: ["service-X", "web-tier"]
# 属性中添加附加信息的可选字段，如环境信息
fields:
  env: staging
  service_name: service-X
# 将自定义字段作为顶级字段存储到到输出文档中，默认false
fields_under_root: false

### Processors configuration
# 定义模块的处理器，删除所有DEBUG消息
processors:
  - drop_event:
      when:
        regexp:
          message: "^DBG:"

### Logging
logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  # 日志文件最大大小，默认10M
  rotateeverybytes: 10485760
  # 日志滚动删除旧文件，默认7
  keepfiles: 7
  # 日志文件滚动周期，默认禁用
  interval: 24h
  # 标准错误记录到日志文件中
  redirect_stderr: false
# 定期记录内部发生变化的指标，默认开启
logging.metrics.enabled: true
# 记录内部指标的时间
logging.metrics.period: 30s

### 外部配置
filebeat.config.inputs:
  enabled: true
  # 要检查的更改文件路径
  path: configs/*.yml
  # 开启配置动态加载
  reload.enabled: true
  # 指定检查文件更改的频率
  reload.period: 10s
filebeat.config.modules:
  path: ${path.config}/modules.d/*.yml
  reload.enabled: false

### 日志输入
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - "/var/log/wifi.log"
    - "/var/log/apache2/*"
    - "/var/log/*/*.log"
  # 递归模式，默认false。For example: /foo/** expands to /foo, /foo/*, /foo/*/*, and so on
  recursive_glob.enabled: false
  # 文件编码
  encoding: plain
  # 设置标记文件的位置
  file_identity.inode_marker.path: /logs/.filebeat-marker
  # 标记列表，方便Kibana或Logstash过滤
  tags: ["service-X", "web-tier"]
  # 属性中添加附加信息的可选字段
  fields:
    env: staging
  # 将自定义字段作为顶级字段存储到到输出文档中
  fields_under_root: false
  
  # 包含的正则表达式列表，先于exclude_lines执行
  include_lines: ['^ERR', '^WARN']
  # 排除的正则表达式列表
  exclude_lines: ['^DBG']
  # 多行消息匹配,Java 堆栈跟踪的例子（https://www.elastic.co/guide/en/beats/filebeat/7.x/multiline-examples.html）
  multiline.type: pattern
  multiline.pattern: '^[[:space:]]+(at|\.{3})[[:space:]]+\b|^Caused by:'
  # 否定模式，true：没有匹配的行作为事件行的连贯行；false：匹配的行作为事件行的连贯行。默认false。
  multiline.negate: false
  # 连贯行组合事件行之前（before）还是之后（after）
  multiline.match: after
  # 每个收割机获取文件时使用的缓冲区大小
  harvester_buffer_size: 16384
  # 单个日志消息的最大字节数，超出部分丢弃（10M）
  max_bytes: 10485760
  # 排除文件
  exclude_files: ['\.gz$']
  
  ##### Harvester closing options
  # 指定的时间段后关闭文件句柄，基于文件的修改，被扫描到后继续进行。建议设置一个大于最少更新频率的值，默认5分钟
  close_inactive: 5m
  # 重命名或移动文件时关闭收割机，默认关闭
  close_renamed: false
  # 删除文件时立马关闭收割机，当文件再次出现时被扫描到后继续进行，默认启用
  close_removed: true
  # 收割机到达文件末尾时立刻关闭，默认禁用
  close_eof: false
  # 指定时间后关闭，按照扫描频路再次开启新的收割机，默认禁用
  close_timeout: 0
  
  ##### State options
  # 指定时间段后文件无更新，则清除注册表中的状态，默认0，表示禁用清除注册表。clean_inactive设置必须大于ignore_older + scan_frequency，否则可能导致不断的重新发送全部内容
  clean_inactive: 0
  # 重命名或移动的文件，注册表中的状态将被清除。默认开启
  clean_removed: true
  # 扫描频率，默认10秒
  scan_frequency: 10s
  # 扫描顺序，默认禁用，可选值：modtime|filename。如果为此设置指定值，则可以使用scan.order配置文件是按升序还是降序进行扫描
  scan.sort: 
  scan.order: asc|desc
  # Filebeat 将开始在每个文件的结尾而不是开始读取新文件，适用于Filebeat尚未处理的文件。如果已经运行过Filebeat并且文件的状态已经保留，则tail_files配置无效。
  tail_files: false
  # 忽略在指定时间跨度之前修改的所有文件，依赖于文件的修改时间。默认0，不忽略任何文件。必须大于close_inactive
  ignore_older: 0
  
  # 限制并行启动的收割机数量
  harvester_limit: 0
  # 根据文件的inode和设备id来区分文件
  file_identity.native: ~
  # 根据路径来区分文件
  file_identity.path: ~

### 日志输出
output.kafka:
  # kafka服务器
  hosts: ["kafka1:9092", "kafka2:9092", "kafka3:9092"]
  # 动态设置topic
  topic: '%{[fields.log_topic]}'
  # 事件将仅发布到可用分区
  partition.round_robin:
    reachable_only: false
  # ACK可靠性级别，默认1。0 = no response，1 = wait for local commit，-1 = wait for all replica to commit
  required_acks: 1
  # gzip压缩级别，0禁用压缩
  compression: gzip
  compression_level: 4
  # 消息的最大字节数
  max_message_bytes: 1000000
# 负载均衡的Logstash
output.logstash:
  hosts: ["localhost:5044", "localhost:5045"]
  loadbalance: true
  worker: 2
  
### Internal queue
# 用于缓冲要发布的事件的内部队列配置。默认mem（内存队列）
queue.mem:
  # 内存队列的最大缓冲事件数
  events: 4096
  # 发布所需的最小事件数，设置为0则发布事件直接输出使用，无需等待
  flush.min_events: 2048
  # 达到flush.min_events的最大等待事件，设置为0则无需等待
  flush.timeout: 1s
queue.disk:
  # 启用磁盘队列，指定最大大小既使用空间
  max_size: 10GB
  path: ${path.data}/diskqueue
  # 队列文件以段的形式保存，每个段包含一些待发送到输出的事件，所有事件发送后删除
  segment_size: max_size / 10
  # 当事件等待输出时，从磁盘读取到内存中的事件数。调高此值可以提高输出速度，但是会占用更多内存
  read_ahead: 512
  # 队列等待事件写入磁盘时可以存储到内存中的事件数
  write_ahead: 2048
  # 磁盘错误导致的队列操作失败，重试间隔时间
  retry_interval: 1s
  # 多个连续的写入磁盘错误，队列将重试间隔增加2倍，最大间隔时间
  max_retry_interval: 30s
queue.spool:
```

## 最佳实践调优

* 文件内容变更延迟发送事件调优
默认基于内存缓冲事件，最晚需要11s才会发布事件到输出。
`filebeat.inputs.type:log.scan_frequency: 10s`：文件的扫描频率
`queue.mem.flush.timeout: 1s`：缓冲事件的超时时间
`queue.mem.flush.min_events: 2048`：超时时间内发布事件所需的最小缓冲数

* 测试时编辑文件导致整个文件内容重新发送
不要用vim修改，使用`echo "xxx" >> log_file`