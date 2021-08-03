---
title: Elasticsearch-配置及系统配置说明
categories:
  - 技术
tags:
  - ELK
  - Elasticsearch
abbrlink: 1130cce3
date: 2021-06-03 00:00:00
---

系统配置、Elasticsearch配置说明
<!-- more -->

## 系统配置
理想情况下，Elasticsearch应该单独运行在服务器上，并使用所有可用的资源。为了做到这一点，您需要配置您的操作系统，以允许运行Elasticsearch的用户访问超过默认允许的资源。

[Important System Configuration](https://www.elastic.co/guide/en/elasticsearch/reference/7.11/system-config.html)

### 系统配置-参考
$ vim /etc/security/limits.conf
```sh
root soft nofile 65535
root hard nofile 65535
* soft nofile 65535
* hard nofile 65535
elasticsearch soft memlock unlimited
elasticsearch hard memlock unlimited
elasticsearch soft nproc 4096
elasticsearch hard nproc 4096
```

$ vim /etc/sysctl.conf

```sh
vm.max_map_count = 262144
net.ipv4.tcp_retries2 = 5
```

### 系统配置-说明

#### Disable swapping（禁用内存交互）
大多数操作系统尝试为文件系统缓存使用尽可能多的内存，并急切地交换未使用的应用程序内存。这可能导致部分JVM堆甚至其可执行页被交换到磁盘。交换对于性能和节点稳定性非常不利，应该不惜一切代价避免。

* On Linux systems，临时禁用
```sh
sudo swapoff -a
```
* On Linux systems，永久禁用
编辑/etc/fstab，注释掉包含swap的任意行

* Elasticsearch配置
set bootstrap.memory_lock to true in elasticsearch.yml

$ vim /etc/security/limits.conf
```sh
# allow user 'elasticsearch' mlockall
elasticsearch soft memlock unlimited
elasticsearch hard memlock unlimited
```

检查：
`GET _nodes?filter_path=**.mlockall`
如果为false，最可能的原因是，运行Elasticsearch的用户没有锁定内存的权限，通过以下方式授权

#### File Descriptors（文件描述符）
Elasticsearch使用了很多文件描述符或文件句柄。耗尽文件描述符可能是灾难性的，很可能会导致数据丢失。确保将运行Elasticsearch的用户打开文件描述符数量的限制增加到65536或更高。

$ vim /etc/security/limits.conf
```sh
# elasticsearch  -  nofile  65535
root soft nofile 65535
root hard nofile 65535
* soft nofile 65535
* hard nofile 65535
```

检查：
`GET _nodes/stats/process?filter_path=**.max_file_descriptors`

#### Virtual memory（虚拟内存）
Elasticsearch默认使用一个mappfs目录来存储索引。默认操作系统对mmap计数的限制可能太低，这可能会导致内存不足异常。


* 暂时设置
`sysctl -w vm.max_map_count=262144`

* 永久设置

$ vim /etc/sysctl.conf

```sh
# 设置操作系统mmap数限制，Elasticsearch与Lucene使用mmap来映射部分索引到Elasticsearch的地址空间
# 为了让mmap生效，Elasticsearch还需要有创建需要内存映射区的能力。最大map数检查是确保内核允许创建至少262144个内存映射区
vm.max_map_count = 262144
```

#### Number of threads（线程数）
Elasticsearch为不同类型的操作使用了许多线程池。它能够在需要时创建新线程，这一点很重要。确保Elasticsearch用户可以创建的线程数量至少是4096个。

$ vim /etc/security/limits.conf
```sh
elasticsearch soft nproc 4096
elasticsearch hard nproc 4096
```

#### TCP retransmission timeout（TCP重传超时）
集群中的每一对节点通过许多TCP连接进行通信，这些TCP连接一直保持打开状态，直到其中一个节点关闭或由于底层基础设施中的故障而中断节点之间的通信。

TCP通过对通信应用程序隐藏临时的网络中断，在偶尔不可靠的网络上提供可靠的通信。在通知发送者任何问题之前，您的操作系统将多次重新传输任何丢失的消息。大多数Linux发行版默认重传任何丢失的数据包15次。重传速度呈指数级下降，所以这15次重传需要900秒才能完成。这意味着Linux使用这种方法需要花费许多分钟来检测网络分区或故障节点。Windows默认只有5次重传，相当于6秒左右的超时。

Linux默认允许在可能经历很长时间包丢失的网络上进行通信，但是对于单个数据中心内的生产网络来说，这个默认值太大了，就像大多数Elasticsearch集群一样。高可用集群必须能够快速检测节点故障，以便它们能够通过重新分配丢失的碎片、重新路由搜索以及可能选择一个新的主节点来迅速作出反应。因此，Linux用户应该减少TCP重传的最大数量。

$ vim /etc/sysctl.conf
```sh
net.ipv4.tcp_retries2 = 5
```

## Elasticsearch配置
默认情况Elasticsearch假设处于开发模式中，任何的配置不正确都会在日志文件中写入警告，能够正常启动和运行节点；一旦配置了像network.host这样的网络设置，Elasticsearch就会假设处于生产环境中，并将上面的警告升级为异常，这些异常将阻止节点启动。

[Important Elasticsearch configuration](https://www.elastic.co/guide/en/elasticsearch/reference/7.11/important-settings.html#important-settings)

#### config/elasticsearch.yml
```yaml
# ES数据目录和日志目录，path.data可以设置多个路径
path:
  logs: /var/log/elasticsearch
  data: /var/data/elasticsearch
# 集群名称，默认elasticsearch。相同的集群名称的节点，才能加入集群
cluster.name: elasticsearch
# 设置全新群集中符合主机资格的节点的初始集合（首次启动集群时需要）；默认为空表示该节点希望加入已经被引导的集群
cluster.initial_master_nodes: ["10.188.80.14"]

# 节点名称，默认随机生成
node.name: prod-data-2
node.master: true
node.data: true
# 启用预处理，默认启用
node.ingest: true
# 集群绑定的主机名或IP地址，用于形成一个可以相互通讯的集群；0.0.0.0表示绑定到所有网络接口
network.host: 192.168.1.10
# 节点间通讯绑定端口，默认9300-9400
transport.port: 9300

# 提供可访问的集群列表，没有给出端口的通过`transport.port`确定端口，以前使用`discovery.zen.ping.unicast.hosts`
discovery.seed_hosts: ["10.188.80.14"]
# 启用单节点发现（节点将选举自己为主节点，并且不会与任何其他节点一起加入集群），推迟了TLS的配置；默认形成多节点集群（发现其他节点，并允许他们加入集群）
discovery.type: single-node

# 集群的最小master节点数，避免集群脑裂
discovery.zen.minimum_master_nodes: 2
# HTTP服务绑定到的主机地址
http.bind_host: 
# 发布以供HTTP客户端连接的主机地址
http.publish_host: 
# http.bind_host and the http.publish_host
http.host: "10.188.80.14"
# HTTP请求绑定端口，默认9200-9300
http.port: 9200
# 允许跨域
http.cors.enabled: true
http.cors.allow-origin: "*"

# 禁用swapping，避免影响集群的性能和稳定性，默认开启。（大多数操作系统尝试使用尽可能多的内存文件系统缓存和热切换出未使用的应用程序内存，避免JVM堆交互到磁盘上）
bootstrap.memory_lock: true
# 开启通过系统调用过滤器检查，默认为true，如果自己承担禁用系统调用过滤器的风险，设置为false
bootstrap.system_call_filter: true

# 自动创建索引，默认为true
action.auto_create_index: true
# 删除索引时必须显示的指定名称，默认为true
action.destructive_requires_name: true
```

#### config/ jvm.options
* Elasticsearch有足够的可用堆是非常重要的。
* 堆的最小值（Xms）与堆的最大值（Xmx）设置成相同的。
* Elasticsearch的可用堆越大，它能在内存中缓存的数据越多。但是需要注意堆越大在垃圾回收时造成的暂停会越长。
* 设置Xmx不要大于物理内存的50%。用来确保有足够多的物理内存预留给操作系统缓存。
* 禁止用串行收集器来运行Elasticsearch（-XX:+UseSerialGC），默认JVM配置通过Elasticsearch的配置将使用CMS回收器。

```conf
-Xms8g
-Xmx8g
```
