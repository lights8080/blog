---
title: Elasticsearch-数据迁移
categories:
  - 技术
tags:
  - ELK
  - Elasticsearch
abbrlink: eaaae947
date: 2021-06-03 00:00:00
---

## Reindex数据迁移
重建索引（_reindex），即：一旦索引被创建，则无法直接修改索引字段的mapping属性，必需要重建索引然后将旧的索引数据迁移到新的索引中才行（迁移过程底层使用了scroll API ）。

示例：
```sh
POST _reindex
    {
      "conflicts": "proceed", # 发生冲突继续执行
      "source": {
        "index": "old_index",
        "type": "_doc",
        "size": 5000, # 设置每批迁移的文档记录数
        "_source": ["user", "_doc"], # 可设置要迁移的索引字段，不设置则默认所有字段
        "query": { # 可设置要迁移的文档记录过滤条件
          "match_all": { }
        }
      },
      "dest": {
        "index": "new_index",
        "type": "_doc",
        "version_type": "internal" # "internal"或者不设置，则Elasticsearch强制性的将文档转储到目标中，覆盖具有相同类型和ID的任何内容
      }
    }
```