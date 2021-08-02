---
title: Elasticsearch-聚合（Aggregations）
date: 2021-04-25
categories:
- 技术
tags:
- ELK
- Elasticsearch
---

> Elasticsearch聚合速查表，介绍指标聚合、桶分聚合、管道聚合的分类和聚合示例。
 基于7.11版本。
<!-- more -->
聚合将数据汇总为指标, 统计, 或其他分析。

## 聚合分类
* Metric：指标聚合，从文档字段值中计算指标，如总和、平均值等
* Bucket：桶分聚合，根据字段值、范围或其他条件将文档分组为桶
* Pipeline：管道聚合，从其他的聚合结果作为输入

### Bucket

* Adjacency matrix：邻接矩阵，获取矩阵每个组的计数
* Auto-interval date histogram：时间柱状图，根据桶的数量自动的选择桶的间隔
* Children：子聚合，如：join field
* Composite：多存储桶聚合，类似于多字段分组
* Date histogram：日期柱状图，可以按日历感知时间间隔（如：day，week，houth）和固定时间间隔。
* Date range：时间范围聚合，from：从大于等于某个时间，to：到小于某个时间
* Filter：过滤器聚合，将当前的聚合的上下文缩小到一组特定文档。在当前聚合上应用过滤，不影响其他聚合器。
* Filters：多桶过滤器聚合，每个桶都与一个过滤器相关联
* Geo-distance：地理距离聚合，工作在geo_point字段上，定义一个原点或一组距离范围的桶，评估落在每个桶的文档。
* Geo hash grid：网格聚合，每个单元格使用自定义精度的geohash进行标记，geohash可以在1~12之间选择精度
* Geotile grid：网格聚合，每个单元格对应许多在线地图的图块，使用{zoom}/{x}/{y}标记
* Global：在搜索的上下文中定义一个，不受搜索影响的上下文进行聚合。与Filter对应
* Histogram：柱状图聚合，指定间隔，返回落在间隔内的文档数
* IP range：IP类型字段的范围聚合
* Missing：NULL字段聚合
* Nested：嵌套文档聚合
* Parent：父文档聚合
* Range：范围聚合，定义一组范围，每组范围代表一个桶
* Rare terms：稀少（长期分布但不频繁的项）的术语聚合
* Reverse nested：在嵌套聚合内定义聚合父文档
* Sampler：采样器聚合，将聚合的文档限制在得分最高的文档上，降低繁重缓慢的聚合成本。shard_size：限制在每个分片上使用得分最高的文档数
* Diversified sampler：多样化采集聚合，采用多样化的设置进行抽样可以提供一种方法来消除内容偏差
* Terms：动态桶聚合。结果是近似值，可以通过size、shard_size来控制其精度。对标关系数据库中的group by。size：定义返回桶的数；shard_size：每个分片使用文档样本数
* Significant terms：显著的关键词聚合，通过background sets（背景集合）对比聚合数据。通常使用整个索引库内容当做背景集合，可以通过background_filter设置。
* Significant text：显著的文本聚合，像Significant terms一样，区别是作用在text字段
* Variable width histogram：动态的宽度柱状图聚合，定义桶数，动态确定桶间隔。
* Subtleties of bucketing range fields：范围字段导致桶数大于文档数

### Metric

* Avg：计算平均值，单值的指标聚合，提取文档的数值型字段或提供的脚本。
* Min：计算最小值，histogram fields时，返回values中的最小值
* Max：计算最大值
* Sum：计算总和
* Boxplot：盒型图，返回最大值、最小值、25%、50%和75%的值。常用语响应时间的分析
* Cardinality：去重求和，计算不同值的近似计数，可以从文档中的特定字段提取值，也可以通过脚本
* stats：统计信息，多值的指标聚合，可以从文档中的特定字段提取值，也可以通过脚本
  * status: min, max, sum, count and avg
  * string stats: count, min_length, max_length, avg_length, entropy
  * extended stats: sum_of_squares, variance, std_deviation
* geo：地图
  * geo bounds: 地理边界聚合
  * geo centroid: 地理重心聚合
* Median absolute deviation：中位数绝对偏差，更可靠的统计信息，可以减少异常值对于数据集的影响。
* Percentile rank：百分比等级，显示低于特定值的百分比。如：显示web服务加载时间的占比
* Percentiles：百分位的值，显示出现百分位观察值的点，percents指定返回的百分位。如：显示大于观察值95%的值
* Scripted metric：使用脚本执行获取指标
* Value count：去重计数
* Weighted avg：带权重的平均值

### Pipeline

* Avg bucket：【sibling pipeline aggs】，计算平均值
* max bucket：【sibling pipeline aggs】，计算最大值
* min bucket：【sibling pipeline aggs】，计算最小值
* sum bucket：【sibling pipeline aggs】，计算总和
* bucket script：【parent pipeline aggs】，脚本计算
* bucket selector：【parent pipeline aggs】，桶过滤
* bucket sort：【parent pipeline aggs】，桶排序
* cumulative cardinality：累积基数，此值显示自查询时间段开始以来总的计数，也可显示增量的计数。如：每天网站的新访问者新增数量。
* cumulative sum：累积总和，此值显示自查询时间段开始以来累积总和。如：月销售额的累积总和。
* derivative：柱状图导数计算
* stats bucket：【sibling pipeline aggs】，统计信息，包括min, max, sum, count and avg
* extended stats bucket：【sibling pipeline aggs】扩展的统计信息，包括平方和、标准差等
* inference bucket：【parent pipeline aggs】，训练模型推断
* moving average：滑动窗口平均值
* moving function：滑动窗口上自定义函数
* moving percentiles：基于百分位的滑动窗口
* normalize：计算标准的数学值
* percentiles bucket：计算桶的百分位的值
* serial differencing：时间序列差值

### 示例1：聚合、分组
```
GET /bank/_search
{
  # 仅返回聚合结果，不需要搜索结果的内容
  "size": 0,
  "aggs": {
    # 单列分组统计，sql: select sum(balance) as sum_balance,avg(balance) as avg_balance from bank group by state.keyword limit 10;
    "group_by_state": {
      # 定义桶的类型
      "terms": {
        "field": "state.keyword"
      },
      # 添加自定义Mata信息
      "meta": {
        "my-metadata-field": "foo"
      }
      # 子聚合
      "aggs": {
        "avg_balance": {
          "avg": {
            "field": "balance"
          }
        },
        "sum_balance": {
          "sum": {
            "field": "balance"
          }
        }
      }
    },
    # 多列分组统计 sql: select sum(balance) as sum_balance from bank group by state.keyword, gender.keyword limit 50;
    "group_by_fields": {
      "composite":{
        "sources": [
          {
            "state": {
              "terms": {
                "field": "state.keyword"
              }
            }
          },{
            "gender": {
              "terms": {
                "field": "gender.keyword"
              }
            }
          }
        ],
        # 查询记录数，默认10条
        "size": 50
      },
      # 子聚合
      "aggs": {
        "sum_balance": {
          "sum": {
            "field": "balance"
          }
        }
      }
    }
  }
  # 聚合后置过滤器，对聚合结果无影响
  "post_filter": { 
    "term": { "color": "red" }
  }
}
```

### 示例2：条件过滤，多列分组、排序、分页
```
GET /lights-order/_search
{
  "size": 0,
  "query": {
    "range": {
      "gmtCreate": {
        "gte": "2021-05-06 00:00:00",
        "lte": "2021-05-06 23:59:59",
        "format": "yyyy-MM-dd HH:mm:ss",
        "time_zone":"+08:00"
      }
    }
  },
  "aggs": {
    "group_by_fields": {
      "composite":{
        "sources": [
          {
            "cid": {
              "terms": {
                "field": "cid"
              }
            }
          },{
            "ipcc": {
              "terms": {
                "field": "ipcc"
              }
            }
          }
        ],
        "size": 50
      },
      "aggs": {
        "sum_totalAmount": {
          "sum": {
            "field": "totalAmount"
          }
        },
        "order_count": {
          "value_count": {
            "field": "id"
          }
        },
        # 按order_count排序
        "sales_bucket_sort": {
          "bucket_sort": {
            "sort": [
              { "order_count": { "order": "asc" } }
            ],
            "from": 0, 
            "size": 10
          }
        },
        # 按doc_count排序
        "top_bucket_sort":{
          "bucket_sort": {
            "sort": [
              { "_count": { "order": "desc" } }
              ]
          }
        }
      }
    }
  }
}
```

