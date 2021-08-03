---
title: Elasticsearch-搜索（Search-DSL）
categories:
  - 技术
tags:
  - ELK
  - Elasticsearch
abbrlink: 12e2da86
date: 2021-04-08 00:00:00
---

> Elasticsearch介绍查询搜索请求包含哪些选项，并介绍其中的Query DSL。包括语法说明、查询和过滤上下文、复合查询等和查询示例。
基于7.11版本。

<!-- more -->

搜索请求是对Elasticsearch数据流或索引中的数据信息的请求，包括以下自定义选项：
* Query DSL（查询语法）
* Aggregations（分组聚合）
* Search multiple data streams and indices（多数据流和索引搜索）
* Paginate search results（分页查询）
* Retrieve selected fields（查询指定字段）
* Sort search results（排序）
* Run an async search（异步搜索）

本文介绍其中的Query DSL。

## 查询特定语言（Query DSL - Domain Specific Language）
Elasticsearch提供了基于JSON的丰富的查询特定语言来定义查询，包含两种类型的子句组成：
* Leaf query clauses：页查询。在特定的字段中查找特定值，如match、term和range查询
* Compound query clauses：复合查询。包装其他的Leaf和Compound子查询，逻辑组合多个查询（bool、dis_max），或更改其行为（constant_score）。

### 查询和过滤上下文（Query and filter context）
#### 相关性得分（relevance scores）：
Elasticsearch按相关性得分对匹配的搜索结果进行排序，该得分衡量每个文档与查询的匹配程度。
相关性得分是一个正浮点数，在查询API的_score元数据字段中返回，分值越高，文档越相关。
不同的查询类型可以计算不同的相关性得分，计算分数还取决于查询子句是运行在查询上下文还是过滤器上下文中。

#### 查询上下文（Query context）：
回答的是文档与该查询子句的匹配程度如何，主要用于计算文档相关性得分。

#### 过滤器上下文（Filter context）：
回答的是文档与该查询子句是否匹配，主要用于过滤结构化数据，不计算相关性得分。
频繁的使用filter context将会被ES自动缓存，以提升性能。

### Compound queries：复合查询
  * boolean：匹配和过滤，满足条件可以获得更高的得分
  * boosting：降低文档的得分，而不是排除
  * constant_score：固定值得分
  * dis_max：提升多个文档具有相同固定值得分
  * function_score：根据算法修改查询文档得分

#### 1. boolean query
用于匹配和筛选文档。bool查询是采用more-matches-is-better的机制，因此满足must和should子句的文档将获得更高的分值。
* must：返回的文档必须满足此查询子句，参与分值计算
* filter：返回的文档必须满足此查询子句，不参与分值计算，缓存结果
* should：返回的文档可能满足此查询子句，参与分值计算
* must_not：该查询子句必须不能出现在匹配的文档中，不参与分值计算，缓存结果
* minimum_should_match：指定至少匹配几个should子句，若一个bool查询包含至少一个should子句且无must或filter子句，则默认值为1。
* boost：提升权重

#### 2. boosting
目的是降低某些文档分值，而不是从结果中排除。

boosting计算相关性得分规则：
1. 从符合positive子句的查询中获得原始的相关性得分
2. 得分 乘上 negative_boost系数，获得最终得分

* positive：必填，返回的文档必须匹配此查询。
* negative：必填，降低匹配文档的分值。
* negative_boost：必填，介于0~1.0之间的数

#### 3. constant_score
包装filter query并返回分值，分值等于boost参数。
* filter：必填，返回索引文档都必须匹配的查询条件
* boost：可选，指定分值，默认为1

#### 4. dis_max
用于提升多个字段中包含相同术语的文档分配更高的得分。
dis_max计算相关性得分规则：
1. 获得匹配子句中最高得分
2. 其他匹配的子句得分 乘上 tie_treaker系数
3. 将最高得分与其他匹配得分相加，获得最终得分

* queries：必填，返回的文档必须匹配一个或多个查询条件，匹配的条件越多则分值越高
* tie_breaker：可选，介于0~1.0之间的数，用于增加匹配文档的分值。默认为0

#### 5. function_score
允许修改查询文档的相关性得分，通过得分函数（function_score）在过滤后的文档集合上计算，获得最终得分。
* query：指定查询条件，默认"match_all": {}
* score_mode：计算分值的模式。multiply（默认）、sum、avg、first、max、min
* boost_mode：计算的分值与查询分值合并模式。multiply（默认）、replace（忽略查询分值）、sum、avg、max、min
* function_score：计算分值的函数。script_score（函数）、weight（权重）、random_score（0~1随机）、field_value_factor（字段因素）

### Full text queries：全文检索，查询已分析的文本字段
  * intervals：根据匹配项的顺序和接近程度返回文档
  * match：标准的全文查询，模糊匹配和短语接近查询
  * match_bool_prefix：分析其输入解析构造为bool query，最后一个词在前缀查询中使用
  * match_phrase：分析其输入解析为短语匹配查询
  * match_phrase_prefix：分析其输入解析为短语匹配查询，最后一个词在前缀查询中使用
  * multi_match：多个字段匹配查询
  * query_string：语法解析器查询
  * simple_query_string：更简单的语法解析器查询

### Geo queries：坐标查询
  * geo_bounding_box：矩形查询
  * geo_distance：坐标点范围查询
  * geo_polygon：多边形查询
  * geo_shape：包括几何图形查询和指定地理形状相交点查询

### Shape queries：像geo_shape一样，支持索引任意二维的几何图形功能

### Joining queries：连接查询
  * nested：嵌套类型查询
  * has_child：匹配子文档的字段，返回父文档。前提是同一索引中建立的父子关系
  * has_parent：匹配父文档的字段，返回所有子文档。前提是同一索引中建立的父子关系
  * parent_id：查询指定父文档的所有子文档。

### Span queries：区间查询。精准控制多个输入词的先后顺序，已经多个关键词在文档中的前后距离
  * span_containing：区间列表查询
  * field_masking_span：允许跨越不同字段查询
  * span_first：跨度查询，匹配项必须出现在该字段的前N个位置
  * span_multi：Wraps a term, range, prefix, wildcard, regexp, or fuzzy query.
  * span_near：接受多个跨度查询，顺序相同且指定距离之内
  * span_not：包装其他span query，排除与该文档匹配的所有文档
  * span_or：返回任意指定查询匹配的文档
  * span_term：等同于term query，可以和其他span query一起使用
  * span_within：

### Specialized queries：专业的查询
  * distance_feature：基于时间或坐标查询，越接近原点得分越高
  * more_like_this：按文本、文档和文档的集合查询
  * percolate：按存储的指定文档匹配查询
  * rank_feature：通过定义字段的rank_feature或rank_features属性值提高得分
  * script：脚本过滤文档
  * script_score：通过脚本自定义得分
  * wrapper：接受一个base64字符串查询
  * pinned：提升特定文档的查询

### Term-level queries：术语级查询
  * exists：返回包含字段的任意文档
  * fuzzy：返回搜索词的相似词的文档
  * ids：返回指定ID的文档
  * prefix：返回字段中指定前缀的文档
  * range：返回范围内的文档
  * regexp：返回正则匹配的文档
  * term：返回字段中包含特定术语的文档
  * terms：返回字段中包含一个或多个术语的文档
  * terms_set：返回字段中包含最少数目术语的文档
  * type：返回指定类型的文档
  * wildcard：返回通配符匹配文档

### 查询示例
```
# 多索引同步搜索
GET /my-index-000001,my-index-000002/_search
{
  # 指定查询超时时间
  "timeout": "2s",
  # 字段匹配，相当于query context
  "query": {
    "bool": {
      "must": [
        { "match_all": {}},
        { "match": { "title": "Search" }}
      ],
      # 相当于filter context
      "filter": [
        { "term":  { "status": "published" , "_name" : "status_pub"}},
        { "range": { "publish_date": { "gte": "2015-01-01" }}}
      ]
    }
  },
  # 排序
  "sort": [
    { "account_number": "asc" },
    { "post_date" : {"order" : "asc"}},
    "_score"
  ],
  # 范围搜索
  "range": {
    "gmtCreate": {
      "gte": "2020-10-01 00:00:00",
      "lte": "2020-10-31 23:59:59",
      "format": "yyyy-MM-dd HH:mm:ss",
      "time_zone":"+08:00"
    }
  }
  # 查询指定字段
  "fields": ["user.id", "@timestamp"],
  "_source": false
  # 分页
  "from": 10,
  "size": 10
}
```

