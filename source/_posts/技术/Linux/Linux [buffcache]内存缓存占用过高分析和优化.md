---
title: 'Linux [buff/cache]内存缓存占用过高分析和优化'
categories:
  - 技术
tags:
  - Linux
  - 线上问题
abbrlink: f7c987f0
date: 2021-05-19 00:00:00
---

> buff/cache过高问题解决过程。问题现场、问题分析、如何解决、扩展知识
<!-- more -->

## 问题现场
查看系统内存的使用状态
![](https://gitee.com/lights8080/lights8080-oss/raw/master/2021/05/linux-buff-free.jpg)

监控报警可用内存空间不足，常规的解决方案如下：
1. 增加内存（增加成本）
2. 增加虚拟内存（影响性能）
3. 定期清理缓存（echo 1 > /proc/sys/vm/drop_caches）

本文将介绍定期清除页面缓存，但是过会儿内存又被占满问题的分析。

## 问题分析

1. 通过监控系统负载情况（vmstat 1），确定是页面缓存（cache项）占用量大，并且释放页面缓存后从块设备读入数据量（bi项）会马上增加。
![](https://gitee.com/lights8080/lights8080-oss/raw/master/2021/05/linux-buff-vmstat.jpg)

2. 通过监控io情况（iostat -x -k 1）也可以看出
![](https://gitee.com/lights8080/lights8080-oss/raw/master/2021/05/linux-buff-iostat.jpg)

3. 基于此可以猜测是有进程在频繁的读取文件导致，监视磁盘I/O使用状况（iotop -oP），释放页面缓存后有几个sed命令读取文件进程占用IO很高。
![](https://gitee.com/lights8080/lights8080-oss/raw/master/2021/05/linux-buff-iotop.jpg)

4. 至此结合业务分析是因为每分钟读取日志统计指标导致

## 扩展知识
### /proc/meminfo
查看更详细的内存信息：
`$ cat /proc/meminfo |grep -E "Buffer|Cache|Swap|Mem|Shmem|Slab|SReclaimable|SUnreclaim"`
![](https://gitee.com/lights8080/lights8080-oss/raw/master/2021/05/linux-buff-meminfo.jpg)

* MemFree：空闲的物理内存
* MemAvailable：可用的物理内存，MemFree+Buffers+Cached
* Buffers：（Buffer Cache）对磁盘块设备数据的缓存
* Cached：（Page Cache）对文件系统上文件数据的缓存，MemFree+SReclaimable
* SwapTotal：虚拟内存，利用磁盘空间虚拟出的一块逻辑内存
* Slab：Linux内存管理机制
* SReclaimable：Slab可回收部分
* SUnreclaim：Slab不可回收部分
* Shmem：进程间共同使用的共享内存

### /proc/sys/vm/drop_caches
清除缓存策略：
1：清除page cache
2：清除slab分配器中的对象（包括目录项和inode）
3：清除page cache和slab分配器中的对象

## 参考
[OOM killer及Overcommit](https://lights8080.github.io/post/oom-killer-ji-overcommit/)
[Linux buffer/cache 内存占用过高的原因以及解决办法](https://blog.csdn.net/kunyus/article/details/104617426)
[Linux查看Buffer&Cache被哪些进程占用](https://blog.csdn.net/linxi7/article/details/109078516)