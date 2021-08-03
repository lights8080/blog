---
title: Elasticsearch-映射（Mapping）
categories:
  - 技术
tags:
  - ELK
  - Elasticsearch
abbrlink: 5217ff46
date: 2021-04-01 00:00:00
---

> Elasticsearch映射介绍，包括动态映射、显式映射、字段数据类型、映射参数、映射限制设置。
 内容大纲源自官方文档“Mapping”模块
 基于7.11版本。

<!-- more -->

映射（Mapping）是定义文档及其包含的字段如何存储和索引的过程。
每个文档都是字段的集合，每个字段都有自己的数据类型。为数据创建一个映射定义，包含与文档相关的字段列表。

## 动态映射（Dynamic mapping）
当Elasticsearch在文档中检测到新字段时，会动态将该字段添加到映射中称为动态映射。

* 动态字段映射：根据数据类型规则应用于动态添加的字段。支持的数据类型包括：boolean、double、integer、object、array、date。
  * dynamic：开启动态映射的模式
  * date_detection：开启日期检测
  * dynamic_date_formats：检测的日期格式
  * numeric_detection: true：开启数值检测
* 动态模板：又称自定义映射，根据匹配条件应用于动态添加的字段。
  * match_mapping_type:  Elasticsearch检测到的数据类型进行操作
  * match and unmatch: 使用模式来匹配字段名称
  * path_match and path_unmatch:  使用字段的路径来匹配

## 显式映射（Explicit mapping）
显式映射以完全控制字段的存储和索引方式。

显式映射的意义：
* 区分全文本字符串字段和精确值字符串字段
* 执行特定语言的文本分析
* 优化字段进行部分匹配
* 自定义日期格式
* 无法自动检测到的数据类型，如地理信息

## 字段数据类型（Field data types）

常见的类型：
* binary：二进制编码为Base64字符串
* boolean：布尔值
* Keywords：关键字，通常用于过滤、排序和聚合。包括keyword、constant_keyword和wildcard。
* Numbers：数值类型，包括long、integer、short、byte、double、float
* Dates：日期类型，包括date和date_nanos
* alias：为现有字段定义别名

对象和关系类型：
* object：JSON对象。扁平的键-值对列表
* flattened：将整个JSON对象作为单个字段值
* nested：保留其子字段之间关系的JSON对象，维护每个对象的独立性
* join：为同一索引中的文档定义父/子关系

结构化数据类型：
* Range：范围，包括long_range, double_range, date_range, and ip_range
* ip：IPv4和IPv6地址
* version：软件版本。特殊的关键字，用于处理软件版本值并支持它们的专用优先级规则
* murmur3：计算和存储值的散列。提供了在索引时计算字段值的哈希并将其存储在索引中的功能

聚合数据类型：
* aggregate_metric_double：度量值进行聚合
* histogram：柱状图，以直方图形式聚合数值

文本搜索类型：
* text：非结构化文本。配置分词器
* annotated_text：注解文本。带有映射器注释的文本插件提供了索引文本的功能。如WWW与World Wide Web同义
* completion：补全提示。是一个导航功能，引导用户在输入时查看相关结果，提高搜索精度
* search_as_you_type：自定义搜索。类似文本的字段，经过优化提供开箱即用的按需输入搜索服务。如搜索框
* token_count：符号计数。分词分析后对数量进行索引

文档排名类型：
* rank_feature：记录一个数字特性，以便在查询中增强文档。

空间数据类型：
* geo_point：经纬度
* geo_shape：复杂的形状，如多边形

元数据：
  * _index：文档所属的索引
  * _id：文档ID
  * _doc_count：桶聚合（Bucket）返回字段，显示桶中已聚合和分区的文档数
  * _source：原始JSON文档
  * _size：_source字段的大小
  * _routing：自定义路由
  * _meta：元数据信息

## 映射参数（Mapping parameters）

* analyzer：text字段文本解析器
* boots：增强匹配权重，默认1.0。如：title的匹配权重大于content匹配权重
* coerce：强行类型转换，默认true。如：如string（“10”）强制转换为integer（10）
* copy_to：将多个字段的值复制到同一字段中。如：first_name和last_name，复制到full_name
* doc_values：开启字段的排序、聚合和脚本中访问字段，支持除了text和annotated_text的所有字段类型，默认true。本质上是列式存储，保持与原始文档字段相同的值，关闭可节省空间
* dynamic：新检测到的字段添加到映射，默认true。false表示不建立索引，strict表示拒绝文档
* eager_global_ordinals：全局序号映射。文档中字段的值仅存储序号，而不存原始内容，用于聚合时提高性能
* enabled：尝试为字段建立索引，仅可应用于顶级映射和object类型下，默认true。如果禁用整个映射，意味着可以对其进行获取，但是不会以任何方式对它的内容建立索引
* format：自定义日期格式
* ignore_above：超过长度的字符串内容将不会被索引
* ignore_malformed：忽略错误的数据类型插入到索引中。默认抛出异常并丢弃文档
* index：控制是否对字段值建立索引，默认true。未索引的字段不可查询
* index_options：控制哪些信息添加到倒排索引已进行搜索并突出显示，仅使用于文本字段
* index_phrases：将两个词的组合词索引到一个单独的字段中。默认false
* index_prefixes：为字段值的前缀编制索引，以加快前缀搜索速度
* meta：附加到字段的元数据
* fields：为不同的目的以不同的方式对同一字段建立索引
* norms：用于计算查询的文档分数，默认true。对于仅用于过滤或聚合的字段，不需要对字段进行打分排序时设置为false
* null_value：使用指定的值替换为null值，以便可以进行索引和搜索
* position_increment_gap：当为具有多个值的文本字段建立索引时，将在值之间添加“假”间隙，以防止大多数短语查询在值之间进行匹配，默认值为100
* properties：类型映射，object字段和nested字段包含子字段叫properties
* search_analyzer：查询时使用指定的分析器
* similarity：字段打分的相似性算法，默认BM25
* store：单独存储属性值。默认对字段值进行索引以使其可搜索，但不单独存储它们，但是已存储在_source字段中
* term_vector：存储分析过程的词矢量（Term vectors）信息。包括：词、位置、偏移量、有效载荷

## 映射限制设置（mapping limit settings）
索引中定义太多字段会导致映射爆炸，从而导致内存不足错误和难以恢复的情况。在动态映射中，如果每个新插入的文档都引入新字段，每个新字段都添加到索引映射中，随着映射的增长，这会成为一个问题。使用映射限制设置可以限制（手动或动态创建的）字段映射的数量，并防止文档引起映射爆炸。

* index.mapping.total_fields.limit: 字段最大数限制，默认1000
* index.mapping.depth.limit: 字段的最大深度，默认20
* index.mapping.nested_fields.limit: 单个索引中嵌套类型（nested）最大数限制，默认50
* index.mapping.nested_objects.limit: 单个文档中嵌套JSON对象的最大数限制，默认10000

## 其他
### object与nested区别
如果需要为对象数组建立索引并保持数组中每个对象的独立性，应该使用nested类型而不是object类型。

```sh
PUT my_index/_doc/1
{
  "group" : "fans",
  "user" : [ 
    {
      "first" : "John",
      "last" :  "Smith"
    },
    {
      "first" : "Alice",
      "last" :  "White"
    }
  ]
}
```

ES内部会转换成这样的对象：
```sh
{
  "group" :        "fans",
  "user.first" : [ "alice", "john" ],
  "user.last" :  [ "smith", "white" ]
}
```

### multi-fields（多字段不同的目的）
为了不同的目的，以不同的方式对同一个字段进行索引
https://www.elastic.co/guide/en/elasticsearch/reference/7.11/multi-fields.html
https://stackoverflow.com/questions/42383341/full-text-search-as-well-as-terms-search-on-same-filed-of-elasticsearch

```sh
PUT my_index
{"mappings":{"properties":{"city":{"type":"text","fields":{"raw":{"type":"keyword"}}}}}}
```

### 示例

```sh
PUT my_index
{
    "mappings": {
        "dynamic_templates": [
            {
                "strings_as_keywords": {
                    "match_mapping_type": "string",
                    "mapping": {
                        "type": "keyword",
                        "ignore_above": 1024
                    }
                }
            },
            {
                "unindexed_longs": {
                    "match_mapping_type": "long",
                    "mapping": {
                        "type": "long",
                        "index": false
                    }
                }
            }
        ],
        "properties": {
            "@timestamp": {
                "type": "date"
            },
            "message": {
                "type": "text",
                "index": false
            },
            "log": {
                "properties": {
                    "file": {
                        "properties": {
                            "path": {
                                "type": "text",
                                "index": false
                            }
                        }
                    }
                }
            }
        }
    }
}
```