---
title: Logstash-配置
date: 2021-03-22
categories:
- 技术
- ELK
tags:
- 技术
- ELK
- Logstash
---

> Logstash配置介绍、插件说明、配置说明、高级配置、命令说明
基于7.11版本。
https://www.elastic.co/guide/en/logstash/7.11/index.html
<!-- more -->
## 一、配置Logstash
配置 Logstash，你需要创建一个配置文件来指定想要使用的插件和每个插件的设置。可以引用配置中的事件字段，并在事件满足某些条件时使用条件来处理它们。运行logstash时使用-f指定配置文件。

每种类型的插件都有一个单独的部分，每个部分都包含一个或多个插件的配置选项。如果指定多个过滤器，则会按照它们在配置文件中出现的顺序进行应用。

logstash-simple.conf
```yaml
input { stdin { } }
filter {
  grok {
    match => { "message" => "%{COMBINEDAPACHELOG}" }
  }
  date {
    match => [ "timestamp" , "dd/MMM/yyyy:HH:mm:ss Z" ]
  }
}
output {
  elasticsearch { hosts => ["localhost:9200"] }
  stdout { codec => rubydebug }
}
```

### 1. 在配置中访问事件数据和字段
Logstash中的某些配置选项需要使用事件的字段。因为输入会生成事件，所以输入块中没有要评估的字段，因为它们还不存在。

#### 引用事件数据和字段
仅在过滤器和输出块内起作用。基本语法是[fieldname]，引用顶级字段时可以去掉[]，引用嵌套字段时，要指定完成整路径[top-level field][nested field]。

#### sprintf格式化
引用事件字段：increment => "apache.%{[response][status]}"
引用事件日期和类型：path => "/var/log/%{type}.%{+yyyy.MM.dd.HH}"

#### 条件
只想在特定条件下过滤或输出事件，这时可以使用条件。
```shell
if EXPRESSION {
  ...
} else if EXPRESSION {
  ...
} else {
  ...
}
```

1. 比较运算符:
equality: ==, !=, <, >, <=, >=
regexp: =~, !~ (checks a pattern on the right against a string value on the left)
inclusion: in, not in
2. 布尔运算符:
and, or, nand, xor
3. 一元运算符：
!（取反）

还可以使用`(...)`，对表达式进行分组。

#### @metadata字段
一个特殊的字段，在输出时不会成为任何事件的一部分。非常适用于做条件，扩展和构建事件字段等

## 二、插件说明
### Input plugins

* beats
* file
* kafka

### Filter plugins
* aggregate
聚合属于同一任务的多个事件（通常是日志行）中的可用信息，最后将聚合的信息推送到最终任务事件中

* clone
克隆事件，原始事件保持不变。新事件作为正常的事件插入到管道中，并从生成事件的过滤器开始继续执行。

* date
解析字段中的日期，然后使用该日期或时间戳作为事件的Logstash的时间戳

* Grok filter plugin
解析任何文本并将其结构化。适用于文本的结构是逐行变化。%{SYNTAX:SEMANTIC}
[grok-patterns](https://github.com/logstash-plugins/logstash-patterns-core/blob/3cdd3f6c81/patterns/grok-patterns)

* Dissect filter plugin
适用于界定符拆分，不使用正则表达式，而且速度非常快。%{id->} %{function} %{+ts}
1. `%{+ts}`：表示前面已经捕获到一个ts字段了，而这次捕获的内容，自动添补到之前ts字段内容的后面
2. `->`：表示忽略它右边的填充
3. `%{+key/2}`：表示在有多次捕获内容都填到key字段里的时候，拼接字符串的顺序谁前谁后。/2表示排第2位
4. `%{}`：表示是一个空的跳过字段
5. `%{?string}`：表示这块只是一个占位，并不会实际生成捕获字段存到事件里面
6. `%{?string} %{&string}`：表示当同样捕获名称都是string，但是一个?一个&的时候，表示这是一个键值对

* drop
删除到达此过滤器的所有内容

* elapsed
跟踪一对开始/结束事件，并使用它们的时间戳来计算它们之间的经过时间

* elasticsearch
在Elasticsearch中搜索上一个日志事件，并将其中的某些字段复制到当前事件中

* fingerprint
创建一个或多个字段的一致哈希（指纹），并将结果存储在新字段中

* geoip
根据来自Maxmind GeoLite2数据库的数据添加有关IP地址地理位置的信息

* http
提供了与外部Web服务/ REST API的集成。

* java_uuid
允许您生成UUID并将其作为字段添加到每个已处理事件

* uuid
uuid过滤器允许您生成UUID并将其作为字段添加到每个已处理事件。

* jdbc_static
通过从远程数据库预加载的数据来丰富事件

* jdbc_streaming
执行SQL查询，并将结果集存储在指定为目标的字段中。它会将结果本地缓存到过期的LRU缓存中

* json
这是一个JSON解析过滤器。它采用一个包含JSON的现有字段，并将其扩展为Logstash事件内的实际数据结构

* kv
有助于自动解析foo=bar种类的消息（或特定事件字段）

* metrics
对于汇总指标很有用

* mutate
可以重命名，删除，替换和修改事件中的字段。需要注意的是，一个mutate块中的命令执行是有序的`coerce -> ... -> copy`，可以使用多个mutate块控制执行顺序。
coerce: 设置空字段的默认值
replace: 从事件中的其他部分构件一个新值，替换掉已有字段
strip: 删除字段的前后空格
update: 用新值更新现有字段，该字段不存在不采取任何操作
gsub: 正则表达式匹配，将所有的匹配项更新为替换的字符串，只支持字符串和字符串数组，其他类型不采取任何操作
join: 用分隔符连接数组，非数组字段不采取任何操作
convert: 将字段的值转换为其他类型，如字符串转整数

* prune
用于根据字段名称或其值的白名单或黑名单从事件中删除字段（名称和值也可以是正则表达式）。如果使用json/kv过滤器解析出来一些不是事先知道的字段，只想保留其中一部分，这个功能很有用

* range
用于检查某些字段是否在预期的大小/长度范围内。支持的类型是数字和字符串。当在指定范围内时，执行一个操作。

* ruby
接受嵌入式Ruby代码或Ruby文件

* sleep
睡眠一定时间。这将导致logstash在给定的时间内停止运行。这对于速率限制等很有用

* throttle
节流过滤器用于限制事件数量

* translate
使用配置的哈希或文件确定替换值的常规搜索和替换工具。当前支持的是YAML，JSON和CSV文件。每个字典项目都是一个键值对

* truncate
允许您截断长度超过给定长度的字段

* urldecode
解码经过urlencoded的字段

* useragent
UserAgent过滤器，添加有关用户代理的信息，例如家族，操作系统，版本和设备

* xml
XML过滤器。获取一个包含XML的字段，并将其扩展为实际的数据结构

### Output plugins
* elasticsearch
* file
* stdout
* exec

## 三、配置说明
包括：logstash.yaml、pipelines.yml、jvm.options、log4j2.properties、startup.options

### logstash.yml
> Logstash配置选项可以控制Logstash的执行。如：指定管道设置、配置文件位置、日志记录选项等。运行Logstash时，大多数配置可以命令行中指定，并覆盖文件的相关配置。
```yaml
node.name: `hostname`
path.data: LOGSTASH_HOME/data
path.logs: LOGSTASH_HOME/logs
# 指定main pipeline的配置文件路径
path.config: 
# 指定main pipeline的配置数据。语法同配置文件
config.string: 
# 开启后，检查配置是否有效，然后退出
config.test_and_exit: false
# 开启后，修改配置文件自动加载，过程：暂停管道所有输入；创新新管道并检验配置；检查成功切换到新管道，失败则继续使用老的管道。
config.reload.automatic: false
# 检查配置文件更新的时间间隔
config.reload.interval: 3s

# 内部队列模型，memory(default)：内存，persisted：磁盘
queue.type: memory
# 持久队列的数据文件存储路径（queue.type: persisted时启用）
path.queue: path.data/queue
# 持久队列的页容量，持久化以页为单位
queue.page_capacity: 64mb
# 开启后，关闭logstash之前等待持久队列消耗完毕
queue.drain: false
# 队列中允许的最大事件数，默认0表示无限制
queue.max_events: 0
# 事件缓冲的内部队列的总容量，达到限制时Logstash将不再接受新事件
queue.max_bytes: 1024mb
# 强制执行检查点之前的最大ACKed事件数
queue.checkpoint.acks: 1024
# 强制执行检查点之前，可以写入磁盘的最大事件数
queue.checkpoint.writes: 1024
# 对每次检查点写入失败将重试一次
queue.checkpoint.retry: false

# metrics REST endpoint绑定的地址和端口
http.host: "127.0.0.1"
http.port: 9600

# 工作线程ID
pipeline.id: main
# 控制事件排序，auto：如果`pipeline.workers: 1`开启排序。true：如果有多个工作线程，强制对管道进行排序，并防止Logstash启动。false：禁用排序所需的处理，节省处理成本。
pipeline.ordered: auto
# 管道筛选和输出阶段的工作线程数，CPU没有饱和可以增加此数字更好的利用机器处理能力。
pipeline.workers: `number of cpu cores`
# 单个工作线程在发送到filters+workers之前，从输入中获取的最大事件数
pipeline.batch.size: 125
# 将小批量事件派送到filters+outputs之前，轮询下一个事件等待毫秒时间，可以理解为未到达批处理最大事件数时延迟发送时间
pipeline.batch.delay: 50

# 开启后，每个pipeline分割为不同的日志，使用pipeline.id作为文件名
pipeline.separate_logs: false
# 开启后，强行退出可能会导致关机期间丢失数据
pipeline.unsafe_shutdown: false

# 启用死信队列，默认false
dead_letter_queue.enable: false
dead_letter_queue.max_bytes: 1024mb
path.dead_letter_queue: path.data/dead_letter_queue

# 指定自定义插件的位置
path.plugins: 
# 配置模块，遵循yaml结构
modules:
```

## 四、高级配置

### 1. 多管道配置（multiple pipelines configuration）
如果需要在同一个进程中运行多个管道，通过配置pipelines.yml文件来处理，必须放在path.settings文件夹中。并遵循以下结构：
```yaml
# config/pipelines.yml
- pipeline.id: my-pipeline_1
  path.config: "/etc/path/to/p1.config"
  pipeline.workers: 3
- pipeline.id: my-other-pipeline
  path.config: "/etc/different/path/p2.cfg"
  queue.type: persisted
```

不带任何参数启动Logstash时，将读取pipelines.yml文件并实例化该文件中指定的所有管道。如果使用-e或-f时，Logstash会忽略pipelines.yml文件并记录相关警告。

* 如果当前的配置中的事件流不共享相同的输入/过滤器和输出，并且使用标签和条件相互分隔，则使用多个管道特别有用。
* 在单个实例中具有多个管道还可以使这些事件流具有不同的性能和持久性参数（例如，工作线程数和持久队列的不同设置）。

### 2. 管道到管道的通信（pipeline-to-pipeline Communication）
使用Logstash的多管道功能时，可以在同一Logstash实例中连接多个管道。此配置对于隔离这些管道的执行以及有助于打破复杂管道的逻辑很有用。

### 3. 重新加载配置文件（Reloading the Config File）
如果没有开启自动重新加载（--config.reload.automatic），可以强制Logstash重新加载配置文件并重新启动管道。
```shell
kill -SIGHUP 14175
```

### 4. 管理多行事件（Managing Multiline Events）
### 5. Glob模式支持（glob pattern support）
注意Logstash不会按照glob表达式中编写的文件顺序执行，是按照字母顺序对其进行排序执行的。

### 6. Logstash到Logstash通讯（Logstash-to-Logstash Communication）
### 7. Ingest Node解析数据转换到Logstash解析数据（Converting Ingest Node Pipelines）
### 8. 集中配置管理（Centralized Pipeline Management）

## 五、命令说明
命令行上设置的所有参数都会覆盖logstash.yml中的相应设置。生产环境建议使用logstash.yml控制Logstash执行。

参数：
* --node.name NAME：指定Logstash实例的名称，默认当前主机名
* -f, --path.config CONFIG_PATH：加载Logstash配置的文件或目录
* -e, --config.string CONFIG_STRING：Logstash配置数据，如果未指定输入，则使用`input { stdin { type => stdin } }`作为默认的输入，如果未指定输出，则使用`output { stdout { codec => rubydebug } }`作为默认的输出。
* -M "CONFIG_SETTING=VALUE"：覆盖指定的配置
* --config.test_and_exit: 检查配置是否有效，然后退出
* --config.reload.automatic: 修改配置文件自动加载
* --modules MODULE_NAME：指定运行的模块名称
* --setup：是一次性设置步骤，在Elasticsearch中创建索引模式并导入Kibana仪表板和可视化文件。
* ...

示例：
```shell
bin/logstash -f logstash-simple.conf --config.reload.automatic
```