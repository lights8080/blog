---
title: Elasticsearch-索引（Index）
date: 2021-04-07
categories:
- 技术
tags:
- ELK
- Elasticsearch
---

> Elasticsearch索引介绍，包括索引设置、索引模板、索引生命周期管理、翻滚索引、索引别名、滚动索引。
 基于7.11版本。
<!-- more -->

## 索引设置（Index Settings）
### static
只能在创建索引时或关闭的索引上设置

* index.number_of_shards：主分片数量，默认1
* index.number_of_routing_shards：拆分索引的路由分片数量，默认值位于2~1024之间，依赖索引主分片数量
* index.shard.check_on_startup：打开前检查分片是否损坏，默认false
* index.codec：压缩存储算法，默认LZ4
* index.routing_partition_size：自定义路由可以到达的分片数量，默认1

### dynamic
可以使用API实时对索引进行操作

* index.number_of_replicas：主分片的副本数，默认1
* index.auto_expand_replicas：根据集群中数据节点的数量自动扩展副本的数量，默认false
* index.search.idle.after：搜索空闲之前不能接收搜索和获取请求的时间，默认30s
* index.refresh_interval：刷新操作频率，最近对索引的更改既可见，默认1s。-1关闭刷新操作
* index.max_result_window：查询索引结果的最大数量，默认10000
* index.max_inner_result_window：内部或聚合命中最大数量，默认100
* index.max_rescore_window：打分请求的最大索引数量，默认10000（同index.max_result_window）
* index.max_docvalue_fields_search：查询中允许的最大字段数，默认100
* index.max_script_fields：查询中允许的最大脚本字段数，默认32
* index.query.default_field：查询返回的默认字段，默认*（表示所有）

## 索引模板（Index Templates）
索引模板是告诉Elasticsearch在创建索引时如何配置索引的一种方法。对于数据流（data stream），索引模板配置是创建他们的后备索引。在创建索引之前先配置模板，模板设置将用作创建索引的基础。

模板有两种类型，索引模板（index templates）和组件模板（component templates）。

组件模板是可重用的构建块，用于配置映射（mappings）、设置（settings）和别名（alias）。使用组件模板来构造索引模板，但它们不会直接应用于索引。索引模板可以包含组件模板的集合，也可以直接指定设置，映射和别名。如果匹配多个模板，优先使用优先级最高的模板。

可以使用模拟API创建索引，确定最终的索引设置。`POST /_index_template/_simulate`。

注意事项：
* 如果新数据流或索引与多个索引模板匹配，则使用优先级最高的索引模板。
* Elasticsearch内置了许多索引模板（如：metrics-*-*,logs-*-*），每个模板的优先级是100。如果不想使用内置模板，请为您的模板分配更高的优先级。
* 如果显式设置创建索引，并且该索引与索引模板匹配，则创建索引请求中的设置将优先于索引模板中指定的设置。
* 索引模板仅在创建索引期间应用。索引模板的更改不会影响现有索引。
* 当可组合模板匹配给定索引时，它始终优先于旧模板。如果没有可组合模板匹配，则旧版模板可能仍匹配并被应用。

### 示例
```sh
PUT _template/datastream_template
{
  # 1.1 匹配所有"datastream-"开头的索引
  "index_patterns": ["datastream-*"],
  # 2 指定创建数据流索引模板
  "data_stream": {},
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "refresh_interval": "15s",
    # 指定索引管理策略，索引关联策略
    "index.lifecycle.name": "datastream_policy",
    # 指定滚动写别名
    "index.lifecycle.rollover_alias": "datastream",
    # 满足策略的索引检查频率
    "indices.lifecycle.poll_interval": "10m",
    # 跳过滚动
    "index.lifecycle.indexing_complete": true
  },
  "mappings": {
    "dynamic_date_formats": [
      "yyyy-MM-dd HH:mm:ss",
      "yyyy-MM-dd HH:mm:ss Z",
      "yyyy-MM-dd HH:mm:ss.SSS",
      "yyyy-MM-dd HH:mm:ss.SSS Z"
    ],
    "_default_": {
      "_all": {
        "enabled": false
      }
    }
  },
  # 1.2 非数据流索引是使用
  "aliases": {
    "last_3_months": {} 
  }
}
```

## 索引生命周期管理（Index Lifecycle Manager - ILM）
配置索引生命周期管理策略，能够随着时间推移根据性能、弹性和保留要求自动的管理索引。

索引生命周期策略可以触发以下操作：
* 翻转（Rollover）：当现有索引达到一定分片大小，文档数或使用年限时，为翻转目标创建新索引。翻转目标可以是索引别名或数据流。
* 收缩（Shrink）：减少索引中主碎片的数量。
* 强制合并（Force merge）：手动触发合并以减少索引每个分片中的段数，并释放已删除文档所使用的空间。
* 冻结（Freeze）：将索引设为只读，并最大程度地减少其内存占用量。
* 删除（Delete）：永久删除索引，包括其所有数据和元数据。

使用ILM可以更轻松地管理热-温-冷体系结构中的索引，在使用时间序列数据时很常见（如日志和指标）。

### 索引生命周期（Index lifecycle）
ILM定义了以下四个阶段（Phases）
* Hot：频繁的写入和查询
* Warm：索引不在更新，仍然在查询
* Cold：不再更新的索引，很少查询仍然可以搜索，查询较慢也没关系
* Delete：不再需要的索引，可以安全的删除

索引的生命周期策略指定了应用于哪些阶段，每个阶段中执行什么操作，以及何时在两个阶段之间进行转换。

创建索引时可以手动应用生命周期策略。对于时间序列索引，需要将生命周期策略与用于在序列中创建新索引的索引模板相关联。当索引滚动时，不会自动将手动应用的策略应用于新索引。

#### 阶段转换（phase transitions）
ILM根据其年龄在整个生命周期中移动索引。要控制这些翻转的时间，请为每个阶段设置一个最小年龄。为了使索引移至下一阶段，当前阶段中的所有操作都必须完成，并且索引必须早于下一阶段的最小年龄。

最小年龄默认为0，这会导致ILM在当前阶段中的所有操作完成后立即将索引移至下一阶段。

如果索引具有未分配的分片并且集群运行状况为黄色，则索引仍可以根据其索引生命周期管理策略过渡到下一阶段。但是，由于Elasticsearch只能在绿色集群上执行某些清理任务，因此可能会有意外的副作用。

#### 阶段执行（phase execution）
ILM控制阶段中的动作的执行的顺序，以及哪些步骤是执行每个动作的必要索引操作。

当索引进入阶段后，ILM将阶段定义信息缓存在索引元数据中，这样可以确保索引政策更新不会将索引置于永远不退出阶段的状态。

ILM定期运行，检查索引是否符合策略标准，并执行所需的步骤。为了避免竞争情况，ILM可能需要运行多次执行，完成一项动作所需的所有步骤。这意味着即使`indexs.lifecycle.poll_interval`设置为10分钟并且索引满足翻转条件，也可能需要20分钟才能完成翻转。

#### 阶段动作（phase actions）
参考https://www.elastic.co/guide/en/elasticsearch/reference/7.11/ilm-index-lifecycle.html#ilm-phase-actions

### 索引生命周期动作（Index Lifecycle Actions）
* Allocate：将分片移动到具有不同性能特征的节点，并减少副本的数量。
* Delete：永久删除索引。
* Force merge：减少索引段的数量并清除已删除的文档。将索引设为只读。
* Freeze：冻结索引以最大程度地减少其内存占用量。
* Migrate：将索引分片移动到对应于当前 ILM 阶段的数据层。
* Read only：阻止对索引的写操作。
* Rollover：移动索引作为滚动别名的写索引，并开始索引到新索引。
* Searchable snapshot：为配置库中的管理索引拍摄快照，并将其作为可搜索快照。
* Set priority：降低索引在生命周期中的优先级，以确保首先恢复热索引。
* Shrink：通过将索引缩小为新索引来减少主碎片的数量。
* Unfollow：将关注者索引转换为常规索引。在Rollover、Shrink和Searchable snapshot操作之前自动执行。
* Wait for snapshot：删除索引之前，请确保快照已存在。

### ILM更新（Lifecycle policy updates）
您可以通过修改当前策略或切换到其他策略的方式来更改管理索引或滚动索引集合的生命周期。

为确保策略更新不会将索引置于无法退出当前阶段的状态，进入这个阶段时，阶段定义会缓存在索引元数据中。如果策略更新可以安全的应用，ILM更新缓冲的阶段定义；如果不能，则使用缓冲阶段定义完成该阶段。

### Rollover（翻转）
在为日志或指标等时间序列数据编制索引时，不能无限期地写入单个索引。为了满足索引和搜索性能要求并管理资源使用，可以写入索引直到达到某个阈值，然后创建一个新索引并开始写入该索引。

使用滚动索引能够：
* 优化活跃的索引，以在高性能热节点上获得高接收速率。
* 针对热节点上的搜索性能进行优化。
* 将较旧的，访问频率较低的数据转移到价格较低的冷节点上。
* 根据您的保留政策，通过删除整个索引来删除数据。

我们建议使用数据流来管理时间序列数据。数据流自动跟踪写入索引，同时将配置保持在最低水平。数据流设计用于仅追加数据，其中数据流名称可用作操作（读取，写入，翻转，收缩等）目标。如果您的用例需要就地更新数据，则可以使用索引别名来管理时间序列数据。

#### 自动翻转（automatic rollover）：
ILM使您能够根据索引大小，文档数或使用年限自动翻转到新索引。触发翻转后，将创建一个新索引，将写入别名更新为指向新索引，并将所有后续更新写入新索引。
与基于时间的过渡相比，基于大小，文档数或使用年限翻转至新索引更可取。在任意时间滚动通常会导致许多小的索引，这可能会对性能和资源使用产生负面影响。

### 示例
```sh
# 查看索引所处哪个阶段、应用策略等
GET datastream-*/_ilm/explain
# 创建索引管理策略
PUT _ilm/policy/full_policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "7d",
            "max_size": "50G"
          }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "forcemerge": {
            "max_num_segments": 1
          },
          "shrink": {
            "number_of_shards": 1
          },
          "allocate": {
            "number_of_replicas": 2
          }
        }
      },
      "cold": {
        "min_age": "60d",
        "actions": {
          "allocate": {
            "require": {
              "box_type": "cold"
            }
          }
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

## 数据流（Data streams）
数据流用于跨多个索引存储仅追加的时间序列数据，同时提供一个用于请求的数据流名称。
可以将索引和搜索请求直接提交到数据流。流自动将请求路由到存储流数据的索引。同样可以使用索引生命周期管理（ILM）来自动管理这些后备索引。
数据流非常适合日志，事件，指标和其他连续生成的数据。

## 索引别名（index alias）

#### Request body
* actions：必填，要执行的一组动作
  * add：添加一个索引别名
  * remove：删除一个索引别名
  * remove_index：删除索引

actions on alias objects：
* index：指定索引名称，允许逗号分隔或通配符
* alias：指定别名名称，允许逗号分隔或通配符
* filter：使用别名查询时，限制条件
* is_write_index：标记作为别名的写索引，一个别名同时只能有一个写索引
* routing：指定路由到特定分片
* search_routing：搜索路由
* index_routing：索引路由

### 示例
```sh
PUT /<index>/_alias/<alias>
DELETE /<index>/_alias/<alias>
GET /_alias
GET /_alias/<alias>
GET /<index>/_alias/<alias>

POST /_aliases
{
    "actions": [
        {
            "remove": {
                "index": "test1",
                "alias": "alias1"
            }
        },
        {
            "add": {
                "index": "test",
                "alias": "alias1",
                "is_write_index": false
            }
        },
        {
            "add": {
                "index": "test2",
                "alias": "alias1",
                "is_write_index": true
            }
        }
    ]
}
```

## 滚动索引（rollover index）
当现有的索引满足您提供的条件（a list of conditions）时，滚动索引API会为滚动目标（rollover target）创建一个新的索引。
当滚动目标是别名（alias）时，别名会指向新索引（当指向多个索引时，必须有一个索引设置`is_write_index=true`）
当滚动目标是数据流（data stream）时，新索引会成为数据流的写索引，并生成一个增量

### Rollover request
```sh
POST /<rollover-target>/_rollover/<target-index>
POST /<rollover-target>/_rollover/
```

滚动索引接受一个滚动目标（rollover target）和一个条件列表（a list of conditions）。可以使用API撤销太大或太旧的索引。

当满足滚动条件，滚动请求在不同的场景下，滚动操作有所不同：
* 如果滚动目标是别名指向单个索引时：
1. 创建新索引
2. 别名指向新索引
3. 原始索引中移除别名

* 如果滚动目标是别名指向多个索引时，必须有一个索引设置`is_write_index=true`：
1. 创建新索引
2. 设置新索引is_write_index=true
3. 设置原始索引is_write_index=false

* 如果滚动目标是数据流：
1. 创建新索引
2. 在数据流上添加新索引作为支持索引和写索引
3. 增加数据流的generation属性

### Path parameters

* `<rollover-target>`：必填，现有的分配给目标索引的索引别名或数据流名称。
* `<target-index>`：可选，用于创建和分配索引别名的目标索引名称。如果`<rollover-target>`是数据流，则不允许使用此参数。如果`<rollover-target>`是索引别名，则分配给以"-"和数字结尾的索引名称，如logs-000001。

### 示例
```sh
PUT /logs-000001
{
  "aliases": {
    "logs_write": {}
  }
}

# Add > 1000 documents to logs-000001

POST /logs_write/_rollover
{
  "conditions": {
    "max_age":   "7d",
    "max_docs":  1000,
    "max_size":  "5gb"
  }
}
```

