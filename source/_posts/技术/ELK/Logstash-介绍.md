---
title: Logstash-介绍
date: 2021-03-19 11:27:15
categories:
- 技术
- ELK
tags:
- 技术
- ELK
- Logstash
---

> 本文内容是通过官网学习Logstash的一个总结，阅读本文可以对Logstash有个整体的认识。
包括Logstash介绍、如何工作、事件模型、工作原理、弹性数据、持久化队列、性能优化、部署和扩展等
基于7.11版本。
https://www.elastic.co/guide/en/logstash/7.11/index.html
<!-- more -->
## 介绍
Logstash是具有实时流水线能力的开源的数据收集引擎。Logstash可以动态统一不同来源的数据，并将数据标准化到您选择的目标输出。它提供了大量插件，可帮助我们解析，丰富，转换和缓冲任何类型的数据。

## 如何工作
管道（Logstash Pipeline）是Logstash中独立的运行单元，每个管道都包含两个必须的元素输入（input）和输出（output），和一个可选的元素过滤器（filter），事件处理管道负责协调它们的执行。
输入和输出支持编解码器，使您可以在数据进入或退出管道时对其进行编码或解码，而不必使用单独的过滤器。如：json、multiline等

![IMAGE](https://www.elastic.co/guide/en/logstash/7.11/static/images/basic_logstash_pipeline.png)

#### inputs（输入阶段）：
会生成事件。包括：file、kafka、beats等

#### filters（过滤器阶段）：
可以将过滤器和条件语句结合使用对事件进行处理。包括：grok、mutate等

#### outputs（输出阶段）：
将事件数据发送到特定的目的地，完成了所以输出处理，改事件就完成了执行。如：elasticsearch、file等

#### Codecs（解码器）：
基本上是流过滤器，作为输入和输出的一部分进行操作，可以轻松地将消息的传输与序列化过程分开。

### 1. 工作原理
Logstash管道中每个输入阶段都运行在自己的线程中，输入将事件写入到内存或磁盘的中央队列。每个管道工作线程（pipeline worker）从队列中获取一批事件，通过配置的过滤器运行这批事件，然后将过滤的事件运行到所有输出。批处理的大小和工作线程数可以通过`pipeline.batch.size`和`pipeline.workers`进行配置。

默认Logstash在管道各阶段之间使用内存队列来缓存事件，如果发生意外的终止，则内存中的事件都将丢失。为了防止数据丢失，可以启用Logstash配置`queue.type: persisted`将正在运行的事件持久保存到磁盘。

### 2. 事件顺序
默认Logstash不保证事件顺序，重新排序可以发送在两个地方：
* 批处理中的事件可以在过滤器处理期间重新排序
* 当一个或多个批次的处理速度快于其他批次时，可以对批次重新排序

当维护事件顺序非常重要时，排序设置：
1. 设置`pipeline.ordered: auto`且设置`pipeline.workers: 1`，则自动启用排序。
2. 设置`pipeline.ordered: true`，这种方法可以确保批处理是一个一个的执行，并确保确保事件在批处理中保持其顺序。
3. 设置`pipeline.ordered: false`则禁用排序处理，但可以节省排序所需的成本。

## Logstash 模块
Logstash Module提供了一种快速的端到端的解决方案，用于提取数据并使用专用仪表盘对其进行可视化。

每个模块都内置了Logstash配置、Kibana仪表盘和其他元文件。使您可以更轻松地为特定用例或数据源设置Elastic Stack。

为了更轻松的上手，Logstash Module提供了三种基本功能，运行模块时将执行以下步骤：
1. 创建ElasticSearch索引
2. 设置Kibana仪表盘和可视化数据所需要的索引模式，搜索和可视化。
3. 使用配置运行Logstash pipeline

![IMAGE](https://www.elastic.co/guide/en/logstash/7.11/static/images/logstash-module-overview.png)

## 弹性数据
当数据流过事件处理管道时，Logstash可能会遇到阻止其事件传递到输出的情况。如：意外的数据类型或异常终止。
为了防止数据丢失并确保事件不中断的流过管道，Logstash提供了两种功能。
1. 持久队列（persistent queues）
2. 死信队列（dead letter queues-DLQ）

### 持久队列
默认Logstash在管道阶段（inputs->pipeline worker）之间使用内存中有边界队列来缓冲事件。这些内存队列的大小是固定的，并且不可配置。如果Logstash遇到暂时的计算机故障，那内存队列中的数据将丢失。

为了防止异常终止期间的数据丢失，Logstash具有持久队列功能，该功能将消息队列存储在磁盘上，提供数据的持久性。
持久队列对于需要大缓冲区的Logstash部署也很有用，无需部署和管理消息代理（Kafka、Redis等）以促进缓冲的发布-订阅模型，可以启用持久队列在磁盘上缓冲消息并删除消息代理。

使用queue.max_bytes可配置磁盘上队列的总容量，当队列已满时，Logstash向输入施加压力阻止数据流入，不再接受新事件，这种机制有助于在输入阶段控制数据流速，不会压倒性的到输出。

持久队列的好处：
* Logstash异常终止或重启启动时避免数据丢失，将消息存储在磁盘上，直到传递至少成功一次。
* 无需使用Kafka外部缓冲消息代理。应对大缓冲区和吸收突发事件。

无法解决的问题：
1. 永久性机器故障（如磁盘损坏），持久队列无法防止数据丢失。具有确认能力的Beats和http之类的插件，将受到持久队列的良好保护。
2. 不使用请求-响应协议的输入插件（如TCP、UDP），持久队列无法防止数据丢失。

#### 工作原理
* 队列位于输入和过滤器阶段之间：`input → queue → filter + output`。
* 当输入阶段可处理事件时将事件写入队列，成功写入后，输入可以向数据源发送确认（acknowledgement）。
* 处理队列中的事件时，Logstash仅在过滤器和输出已完全处理该事件时，该事件才记录（队列保留管道已处理的事件记录）为已处理（acknowledged/ACKed）- 这意味着该事件已由所有已配置的过滤器和输出处理。
* 在正常关闭时，Logstash将停止从队列读取数据，并将完成正在由过滤器和输出处理中的事件。重启后，Logstash将恢复处理持久队列中的事件，并接受来自输入的新事件。
* 如果Logstash异常终止，任何运行中的事件都不会被记录为ACKed，并且在Logstash重新启动时将被过滤器和输出重新处理。Logstash在批处理事件，当发生异常终止时，可能有一些批处理已经成功完成，但没有记录为 ACKed。

#### 页
队列本身就是一个页（page）集合，分为头页（head page）和尾页（tail page），仅有一个头页，达到具体大小（queue.page_capacity）时将变成尾页，并创建一个新的头页。尾页是不可变的，头页是仅追加的。
每个页都是一个文件，页中的所有事件确认后，将被删除，如果较旧的页中至少有一个未被确认，整个页将保留在磁盘上，直到成功处理该页上的所有事件为止。

#### 检查点
启用持久队列功能后，Logstash通过一种称为检查点（checkpoint）的机制提交到磁盘。检查点文件在单独文件中记录有关自身的详细信息（页信息，确认等）。
当记录检查点时，Logstash将调用头页的同步操作和以原子的方式将队列的当前状态写入磁盘。检查点的过程是原子的，意味着如果成功，将保存对文件的任何修改。
如果Logstash终止，或者出现硬件级别的故障，则持久队列中缓冲但尚未提交检查点的所有数据都将丢失。
可以通过设置queue.checkpoint.writes，强制Logstash更频繁地检查点。为了确保最大的持久性避免丢失数据，可以设置queue.checkpoint.writes为1，在每次事件后强制执行检查点。

### 死信队列
死信队列提供了另一层数据弹性。（当前仅对Elasticsearch输出支持死信队列，用于响应码为400和404的文档，二者均表示无法重试的事件。）
默认情况，当Logstash遇到由于数据错误而无法处理事件时，会挂起或删除失败的事件。为了防止数据丢失，可以配置将未成功的事件写入死信队列，而不是丢弃。
写入死信队列的每个事件包括原始事件、无法处理的原因、写入事件的插入信息以及事件时间戳。
要处理死信队列的事件，需要创建一个管道配置，使用dead_letter_queue插件从死信队列中读取数据。

#### 工作原理
![IMAGE](https://www.elastic.co/guide/en/logstash/7.11/static/images/dead_letter_queue.png)

Elasticsearch无法访问的HTTP请求失败，Elasticsearch输出插件将无限期的重试整个请求，这些场景中死信队列不会拦截。

## 部署和扩展
从操作日志和指标分析到企业和应用程序搜索，Elastic Stack可用于大量用例。确保将数据可扩展、持久和安全地传输到Elasticsearch极为重要，尤其是对于关键任务环境。
本文重点介绍Logstash的常见体系结构模型，以及如何随着部署的增长而有效的扩展。重点放在操作日志、指标、安全分析用例上，因为它们往往需要大规模部署。

### Beats to Elasticsearch
使用Filebeat Modules，可以快速的收集、解析和索引流行的日志类型和预建的Kibana仪表盘。这种情况下Beats会将数据直接发送到ES，由摄取节点处理并索引数据。

### Beats and Logstash to Elasticsearch
Beats和Logstash共同提供了可扩展且具有弹性的全面解决方案。Beats运行在数千台边缘主机服务器上，将日志收集、拖尾和传输到Logstash。
Logstash是水平可伸缩的，可以形成运行同一管道的节点组。Logstash的自适应缓冲功能即使在吞吐量变化不定的情况下也有助于流畅的传输。如果Logstash成为瓶颈，只需要添加更多节点即可进行横向扩展。以下是一些建议：

扩展：
* Beats应该在一组Logstash节点之间实现负载均衡
* 建议至少使用两个Logstash节点已实现高可用性
* 通常每个Logstash节点仅部署一个Beats输入，但也可以为每个Logstash节点部署多个Beats输入。

弹性：
* 使用Filebeat/Winlogbeat进行日志收集时，可以保证至少一次交付
* 从Filebeat/Winlogbeat到Logstash，以及从Logstash到Elasticsearch这两种通讯协议都是同步且支持确认。其他的Beats不支持。

处理：
* Logstash通常将使用grok或dissect提取字段，增强地理信息，并可以进一步利用文件、数据库或Elasticsearch查找数据集来丰富事件。
* 处理复杂性会影响整体吞吐量和CPU利用率，确保检查其他可用的过滤器插件。

### Integrating with Messaging Queues
如果现有的基础架构中有消息队列，那么将数据放入Elastic Stack会很容易。如果仅使用消息队列用于Logstash缓冲数据，建议使用Logstash持久队列，消除不必要的复杂性。

## 性能调优
包括性能故障排除和调优和分析Logstash性能。

### JVM
* 建议堆的大小应不小于4G且不大于8G，太小会导致JVM不断的进行垃圾回收，造成增加CPU利用率
* 堆的大小不要超过物理内存量的水平，必须保留一些内存以运行OS和其他进程，一般不要超过物理内存的50-75％。
* 将最小（Xms）和最大（Xmx）堆分配大小设置为相同的值，以防止在运行时调整堆大小，这是一个非常昂贵的过程。

### 调优和分析Logstash性能
Logstash提供了以下选项来优化管道性能，pipeline.workers，pipeline.batch.size和pipeline.batch.delay。

#### pipeline.workers
此设置确定要运行多少个线程以进行过滤和输出处理。如果发现事件正在备份或者CPU没有饱和可以考虑增加此参数以更好的利用可用的处理能力。

#### pipeline.batch.size
此设置定义单个工作线程在尝试执行过滤器和输出之前收集的最大事件数。较大的批处理大小通常更有效，但会增加内存开销。
某些硬件配置要求您增加jvm.options配置文件中的JVM堆空间，以避免性能下降。由于频繁的垃圾收集或与内存不足异常相关的JVM崩溃，超出最佳范围的值会导致性能下降。
输出插件可以将每个批次作为逻辑单元进行处理。例如，Elasticsearch输出为收到的每个批次发出批量请求。调整pipeline.batch.size设置可调整发送到Elasticsearch的批量请求的大小。

#### pipeline.batch.delay
很少需要调整。此设置调整Logstash管道的延迟。管道批处理延迟是Logstash在当前管道工作线程中接收到事件后等待新消息的最长时间（以毫秒为单位）。经过这段时间后，Logstash开始执行过滤器和输出。Logstash在接收事件和在过滤器中处理该事件之间等待的最长时间是pipeline.batch.delay和pipeline.batch.size设置的乘积。

### 管道的配置和优化
进行中事件的总数由pipeline.workers和pipeline.batch.size设置的乘积确定。注意在间歇地不规则的接收大型事件的管道，需要足够的内存来处理这些峰值。
可以将工作线程数设置高于CPU内核数，因为输出通常度过空闲时间在I/O等待条件下。





