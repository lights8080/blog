---
title: Beats-Filebeat介绍
date: 2021-04-28
categories:
- 技术
- ELK
tags:
- 技术
- ELK
- Filebeat
---

> Filebeat介绍，包括工作方式、模块、如何避免数据重复、处理器的速查表。
 基于7.11版本。
<!-- more -->
Beats是一款轻量级数据采集器，你可以将它作为代理程序安装在你的服务器上，然后将操作数据发送到 Elasticsearch。可以直接发送数据到 Elasticsearch 或者通过 Logstash，在那里你可以进一步处理和增强数据。
* Filebeat（日志文件）
* Metricbeat（指标）
* Heartbeat（可用性监控）
* Functionbeat（函数计算采集器）

## Filebeat
> Filebeat是用于转发集中日志数据的传输工具。作为服务器上的代理安装，收集日志事件，并将它们转发到Elasticsearch或Logstash。
https://www.elastic.co/guide/en/beats/filebeat/7.11/index.html

### 工作方式
当启动Filebeat，会根据显示指定的日志数据启动一个或多个输入，每个日志文件都会启动一个收割机（harvester）。每个收割机会读取日志的最新内容，并将日志数据发送到libbeat，libbeat汇总事件并发送到输出。

{% oss uPic/StbFBm.jpg %}

Filebeat由两个主要部分组成：inputs和harvesters。它们一起工作以尾部文件将事件数据发送到指定的输出。

收割机（harvesters）：一个收割机负责读取单个文件的内容。收割机逐行读取每个文件并将内容发送到输出。每个文件启动一个收割机负责打开和关闭文件，收割机运行时文件描述符保持打开状态。如果文件被删除或重命名，Filebeat将继续读取该文件，副作用是磁盘上的空间将保留到收割机关闭为止。

输入（inputs）：一个输入负责管理收割机并查找所有可读取的资源。日志类型输入检查每个文件，以查看收割机是否需要启动，是否已经运行，或是否需要忽略该文件。自收割机关闭之后，如果文件大小有更改才会获取新行。

Filebeat保持每个文件的状态，并经常将状态刷新到磁盘的注册表文件。该状态用于记录收割机正在读取的最后一个偏移量并确保发送所有的日志行。如果输出不可达，则Filebeat会保持跟踪发送的最后几行，并在输出可用时继续读取文件。Filebeat运行时状态信息也会保持在内存中，当Filebeat重启时，将使用注册文件中的数据重新构建状态，并且在最后一个已知位置继续每个收割机。

对于每个输入，Filebeat会保持每个文件的状态。由于文件可以重命名和移动，因此文件名和路径不能标识一个文件。Filebeat将存储每个文件的唯一标识符以检测文件是否以前被获取过。

Filebeat保证事件将至少一次传递到输出，并且不会丢失数据。因为他在注册文件中存储了每个事件的传递状态。如果输出被阻止或未确认所有事件的情况下，Filebeat将继续尝试发送事件，直到输出确认接收为止。如果Filebeat在发送事件的过程中关闭，则不会等待输出确认所有的事件。重启Filebeat时，将再次发送关闭之前输出未确认的所有事件。这样可以确保每个事件至少发送一次，但是有可能会重复发送。

### 如何避免Elasticsearch数据重复
由于Beats框架确保至少一次交付，又由于Elasticsearch的文档ID通常是接受到数据后才设置的，因此重复事件被索引为新文档。通过在建立索引期间设置，则Elasticsearch会覆盖现有文档而不是新创建一个新文档。
1. 在Beats中设置文档ID。
2. 在Logstash管道设置文档ID。

### 填充地理位置信息
基于IP地址填充地理位置信息。然后可以使用此信息来可视化IP地址在地图中的位置。
1. Filebeat与Elasticsearch中的GoeIp处理器一起使用
2. Logstash中使用GeoIP过滤器

### 模块（Modules）
> Filebeat模块简化了常见的日志格式的收集，解析和可视化。每个Filebeat模块由一个或多个文件集组成，这些文件集包含摄取节点管道（ingest node pipelines），Elasticsearch模板，Filebeat输入配置和Kibana仪表板。
* use ingest pipelines for parsing
* use Logstash pipelines for parsing

如Nginx日志，由一个或多个文件集组成（access和error）：
* Filebeat输入配置要查找的日志文件路径，还负责在需要时将多行事件缝合在一起。
* Elasticsearch Ingest Node管道定义，用于解析日志行。
* 定义字段，为每个字段正确的配置到Elasticsearch。
* Kibana仪表盘可视化日志文件

### 处理器（Processors）
#### 过滤和增强数据的处理器
如果只需要导出的数据的一部分或者需要增强导出数据。Filebeat提供了两个选项来过滤和增强导出的数据。

1. 可以为每个输入指定包含和排除的行或文件，需要为每个输入配置选项。（include_lines, exclude_lines, and exclude_files options）
2. 定义处理器（Processor）可以的导出的所有数据进行全局处理。

可以在配置中定义处理器，在发送到输出之前处理所有事件。libbeat提供的处理器分为：
* 减少导出字段
* 增加元数据增强事件
* 执行其他处理和解码

每个处理器都接收一个事件，对该事件应用已定义的操作，然后返回该事件。如果定义处理器列表，则将按照在Filebeat配置文件中定义的顺序执行它们。
执行顺序：event -> processor 1 -> event1 -> processor 2 -> event2 ...

```yaml
processors:
  - if:
      <condition>
    then: 
      - <processor_name>:
          <parameters>
      - <processor_name>:
          <parameters>
      ...
    else: 
      - <processor_name>:
          <parameters>
      - <processor_name>:
          <parameters>
      ...
```

* add_docker_metadata
使用来自Docker容器的相关元数据注释每个事件。包括（Container ID、Name、Image、Labels）

* add_fields
将其他字段添加到事件中

* add_host_metadata
为事件添加主机信息

* add_id
为事件生成唯一的ID

* add_labels
将一组键值对添加到事件

* add_locale
通过将机器的时区偏离UTC或时区名称来丰富每个事件

* add_tags
将标签添加到标签列表中

* convert
将事件中的字段转换为其他类型，例如将字符串转换为整数。

* copy_fields
将一个字段复制到另一个字段。

* decode_base64_field
指定要对base64进行解码的字段

* dissect
解剖处理器使用定义的模式对传入的字符串进行标记

* drop_event
如果满足相关条件，则drop_event处理器将丢弃整个事件。条件是强制性的，因为没有一个条件，所有事件都将被丢弃

* drop_fields
指定在满足特定条件时要删除的字段，条件是可选的。@timestamp和type字段在列表中，也不能删除他们。

* fingerprint
根据事件字段的指定子集生成事件的指纹。

* include_fields
指定在满足特定条件时要导出的字段，条件是可选的。@timestamp和type字段，也始终将其导出。

* rename
指定要重命名的字段的列表。

* script
执行Javascript代码以处理事件。该处理器使用ECMAScript 5.1的纯Go实现，并且没有外部依赖性。

* timestamp
时间戳处理器从字段解析时间戳。默认情况下，时间戳处理器将已解析的结果写入@timestamp字段。

* truncate_fields
将字段截断为给定的大小。如果字段的大小小于限制，则该字段将保持不变。

* urldecode
指定要从URL编码格式解码的字段列表