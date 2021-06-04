---
title: 生产环境的一次JVM调优过程
date: 2021-02-05 00:00:00
categories:
- 技术
- JVM
tags:
- 技术
- JVM
---

> JVM调优过程。问题背景、分析过程、优化思路

<!-- more -->

# 问题背景

机器负载截图：
![](https://img-blog.csdnimg.cn/img_convert/199a0111cd0eb5d125aad7aa9b3931f7.png)

进程截图：
![](https://img-blog.csdnimg.cn/img_convert/309a202cad66e6241042bb4481ef1434.png)

启动参数：
```shell
java -jar -Xms2048m -Xmx4096m -Xss256k -XX:MetaspaceSize=128m -XX:MaxMetaspaceSize=4096m -XX:NewSize=1920m -XX:MaxNewSize=4096m -XX:SurvivorRatio=6 -XX:+UseParNewGC -XX:ParallelGCThreads=8 -XX:MaxTenuringThreshold=9 -XX:+UseConcMarkSweepGC -XX:CMSInitiatingOccupancyFraction=60
```

# 分析过程
* 服务器内存8G，java进程最大分配内存4G。但进程显示内存使用率27.4，实际使用2.1G。进程内存并没有达到最大分配内存，而CPU却使用率很高。初步分析肯定是Full GC导致CPU使用率高。
* 查看GC情况

jstat -gcutil 545592
![](https://img-blog.csdnimg.cn/img_convert/9894d8abf1c685796ff64f0e3d389505.png)

S0：幸存区1当前使用比例
S1：幸存区2当前使用比例
E：伊甸园区使用比例
O：老年代使用比例
M：元数据区使用比例
CCS：压缩使用比例
YGC：年轻代垃圾回收次数
FGC：老年代垃圾回收次数
FGCT：老年代垃圾回收消耗时间
GCT：垃圾回收消耗总时

通过查看GC使用情况，得出年轻代使用比例不高，回收次数少，老年代使用比例高，回收次数过多。

* 查看Heap信息

jmap -heap 545592
![img](https://img-blog.csdnimg.cn/img_convert/d49c1e18cf0b371e2a85a37eef830684.png)

**结果显示**
老年代分片空间：OldSize = 65536 (0.0625MB)
新生代分片空间：MaxNewSize = 4294901760 (4095.9375MB)
频繁对老年代进行Full GC，引起CPU资源占用高。

# 优化思路

问题的根源很简单，没有真正了解JVM的内存模型以及参数控制，不合理的分配新生代和老年代空间导致。

1. 暂时去掉参数-XX:NewSize、-XX:MaxNewSize，默认NewRatio=2（表示老年代:新生代 = 1:2）。跑一段时间检查新生代和老年代占用情况以增长速度和回收次数等，然后酌情合理配置参数-XX:NewSize、-XX:MaxNewSize。

2. 运行一段时间后观察

jstat -gcutil 3239169
![](https://img-blog.csdnimg.cn/img_convert/4016208c399c5fa718eff3b79ccbe30d.png)

jmap -heap 3239169
![](https://img-blog.csdnimg.cn/img_convert/1eaff9853cf6e8f15f3860670b9c837d.png)

结果显示FGC没有再发生，YGC的次数也很低。实际新生代Survivor区只使用了2M，老年代只使用了56M且不再明显增长。所以优化方案是降低老年代和新生代Survivor区空间，增加新生代Eden区空间。

3. 优化策略

* 修改-Xms1024m -Xmx2048m：降低初始堆空间大小，因为业务访问量并不高，新生代增长速度不快，遵循不浪费资源、压榨服务器原则。
* 修改-XX:NewSize=896m -XX:MaxNewSize=1536m：结果显示老年代占用并不大，增长也较慢，所以提高新生代的空间有助于减少YGC，但是太大YGC的时长会增加
* 修改-XX:SurvivorRatio=8：结果显示Survivor区的使用率也不高，进一步提高Eden区大小
* 修改–XX:CMSInitiatingOccupancyFraction=80，提升老年代占比触发垃圾回收的阈值，降低CMS次数
* 修改-XX:MetaspaceSize=128m -XX:MaxMetaspaceSize=512m，永久代不占用堆大小，占用率并不高，遵循不浪费原则

调整后的启动参数如下：
```shell
java -jar -Xms1024m -Xmx2048m -Xss256k -XX:MetaspaceSize=128m -XX:MaxMetaspaceSize=512m -XX:NewSize=896m -XX:MaxNewSize=1536m -XX:SurvivorRatio=8 -XX:+UseParNewGC -XX:MaxTenuringThreshold=9 -XX:+UseConcMarkSweepGC -XX:CMSInitiatingOccupancyFraction=80
```
