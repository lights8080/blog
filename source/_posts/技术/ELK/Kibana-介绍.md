---
title: Kibana-介绍
date: 2021-04-29
categories:
- 技术
- ELK
tags:
- 技术
- ELK
- Kibana
---

> 介绍Kibana的侧边栏、面板类型、配置说明等。
基于7.11版本。

<!-- more -->

# Kibana
> Kibana是一个开源分析和可视化平台，旨在与Elasticsearch协同工作。您使用Kibana搜索，查看和与存储在Elasticsearch索引中的数据进行交互。您可以轻松执行高级数据分析，并在各种图表，表格和地图中可视化您的数据。
https://www.elastic.co/guide/en/kibana/7.11/index.html

## 侧边栏
* Discover（数据探索）：搜索、过滤和展示所选索引模型（Index Pattern）文档数据
* Visualize（可视化）：为数据创建可视化控件
* Dashboard（仪表盘）：展示保存的可视化结果集合
* Canvas（画布）：非常自由灵活对数据进行可视化布局与展现
* Maps（地图）：已地图的方式展示聚合信息
* Machine Learning（机器学习）
* Infrastructure（基础设施监控）：通过metricbeat监控基础服务。如：redis、rocketmq
* Metrics（度量应用）：探索整个生态系统中有关系统和服务的指标
* Logs（日志）：实时跟踪相关的日志数据；提供了一个紧凑的，类似控制台的显示器。可以实时日志拖尾
* APM（Application Performance Monitoring-应用程序性能监视）：业务跟踪及监控。
* Uptime（正常运行时间）：监控应用程序和服务的可用性问题；通过HTTP/S，TCP和ICMP监控网络端点的状态
* SIEM（Security Information & Event Management-安全信息与事件管理）：安全分析师的高度交互式工作区
* Dev Tools（开发工具）：包括控制台、查询分析和聚合
* Stack Monitoring（ELK监控）：可视化监控数据
* Management（Kibana管理）：包括索引模式的初始设置和持续配置等

### Dashboard（仪表板）
仪表板是用于分析数据的面板的集合。在仪表板上，您可以添加各种面板，可以重新排列并讲述关于数据的故事。

编辑仪表板：
* Add controls（添加控制器）
* Add markdown（添加说明文档）
* Arrange panels（面板排版）
* Clone panels（克隆面板）
* Customize time ranges（自定义时间范围）

探索仪表板数据：
* Inspect elements（检查元素）：查看可视化和保存的搜索背后的数据和请求
* Explore underlying data（探索面板底层数据）：可以在其中查看和过滤可视化面板中的数据，为了探索仪表板上面板的底层数据，Kibana打开了Discover，可视化的索引模式、筛选器、查询和时间范围将继续应用。仅适用于单个索引模式的面板

自定义仪表板操作：
* Dashboard drilldowns（仪表盘深度探讨）：能够从另一个仪表板打开仪表板，带有时间范围、过滤器和其他参数，因此上下文保持不变。仪表板钻取可以帮助您从一个新的角度继续分析。
* URL drilldowns（URL深度探讨）：能够从仪表板导航到内部或外部URL。目标URL可以是动态的，这取决于仪表板上下文或用户与面板的交互。

共享仪表板：
* 将代码嵌入网页中，必须具有Kibana访问权限才能查看嵌入式仪表板
* 直接链接到 Kibana 的控制面板
* 生成PDF/PNG报告

#### 面板类型
* Area（面积图）：使用面积图比较两个或多个类别随时间变化的趋势，并显示趋势的幅度。
* Stacked Area（堆积面积图）：使用堆积面积图可视化部分-整体关系，并显示每个类别对累积总数的贡献。
* Bar（条形图）：使用条形图对大量类别的数据进行比较，也支持水平条形图。
* Stacked bar（堆积条形图）：使用堆叠的条形图可以比较分类值级别之间的数值。
* Line（折线图）：使用折线图可以直观地显示一系列值，发现一段时间内的趋势并预测未来值。
* Pie（饼图）：使用饼图显示多个类别之间的比较，说明一个类别相对于其他类别的优势，并显示百分比或比例数据。
* Donut（甜甜圈图）：与饼形图相似，但删除了中心圆。当您想一次显示多个统计信息时，请使用甜甜圈图。
* Tree map（树图）：将数据的不同部分关联到整体，使用树图可以有效利用空间来显示每个类别的总计百分比。
* Heat map（热图）：显示数据的图形表示形式，其中各个值由颜色表示。当数据集包含范畴数据时，使用热图。
* Goal（进度图）：显示指标如何朝固定目标发展，使用目标显示目标进度状态的易于阅读的视觉效果。
* Gauge（计量图）：沿比例尺显示数据，使用计量图来显示度量值与参考阈值的关系。
* Metric（度量值）：显示聚合的单个数值。
* Data table（表格数据）：以表格格式显示原始数据或聚合结果。
* Tag cloud（标签云）：显示单词在出现的频率，使用标签云可以轻松生成大型文档的摘要。
* Maps（地图）
* Lens（透镜）：创建强大的数据可视化效果的最简单、最快捷的方法。可以将任意多的数据字段拖放到可视化构建窗格中。
* TSVB（时间序列数据）：TSVB是时间序列数据可视化工具，充分利用Elasticsearch聚合框架的功能。可以组合无数个聚合来显示数据。支持：选择不同的数据展示方式、叠加注释事件等。
* Timelion（时间序列数据）：时间序列数据可视化工具，可以在单个可视化文件中组合独立的数据源。在7.0及更高版本中，不建议使用Timelion应用。
* Vega（自定义可视化）：使用Vega和Vega-Lite构建自定义可视化，并由一个或多个数据源支持。支持：使用嵌套或父/子映射的聚合、没有索引模式的聚合、自定义时间过滤器查询、复杂的计算、从_source而不是聚合中提取数据等。
* Controls（控制器）：可以实时过滤面板上的数据，支持选择列表和范围滑杆
* Markdown（文本编辑器）：当您要将上下文（例如重要信息，说明和图像）添加到仪表板上的其他面板时，请使用Markdown。

### Alerts and Actions（监控警报）
* General alert details（警报详细信息）：
  * Name：警报名称，显示在警报列表，帮助识别和查询警报
  * Tags：警报标签列表，显示在警报列表，有助于查询和组织警报
  * Check every：检查警报条件的频率
  * Notify every：限制重复报警的频率
* Alert type and conditions（警报类型和条件）：选择不同的警报类型不同的条件表达形式。
  * Index threshold：索引阈值警报类型
* Action type and action details（动作类型和详细信息）：每个操作都必须指定一个连接器实例。
  * Index：Index data into Elasticsearch
  * Email：Send email from your server
  * Server log：Add a message to a Kibana log
  * Webhook：Send a request to a web service

### Graph（图形分析）
图形分析功能使您能够发现 Elasticsearch 索引中的项目是如何相关的。您可以研究索引词汇之间的连接，并查看哪些连接最有意义。这在各种应用程序中都很有用，从欺诈检测到推荐引擎。

例如，图形浏览可以帮助您发现黑客所针对的网站漏洞，从而可以加固您的网站。或者，您可以向电子商务客户提供基于图的个性化推荐。

图形分析特性为 Kibana 提供了一个简单但强大的图形探索 API 和一个交互式图形可视化工具。两者都可以在现有的 Elasticsearch 索引中使用ー你不需要存储任何额外的数据来使用这些特性。

## kibana.yml

```yaml
server.port: 5601
server.host: "0.0.0.0"
server.name: "elk-1"
i18n.locale: "zh-CN"
elasticsearch.hosts: ["http://your_elasticsearch_host:9200"]
elasticsearch.username: "kibana_system"
elasticsearch.password: "xxxxxxxxxxxxxxx"
# 防止会话在重启时失效
xpack.security.encryptionKey: "something_at_least_32_characters"
# 防止挂起的报告在重新启动时失败
xpack.reporting.encryptionKey: "something_at_least_32_characters"
```

## 问题
### 1. 创建索引失败
错误信息：POST 403 (forbidden) on create index pattern
解决办法：
```json
PUT _settings
{
  "index": {
    "blocks": {
      "read_only_allow_delete": "false"
    }
  }
}
```

