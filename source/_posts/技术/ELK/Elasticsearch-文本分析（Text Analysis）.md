---
title: Elasticsearch-文本分析（Text Analysis）
date: 2021-04-01
categories:
- 技术
- ELK
tags:
- 技术
- ELK
- Elasticsearch
---

文本分析使Elasticsearch能够执行全文搜索，其中搜索返回所有相关结果，而不仅仅是精确匹配。
文本通过标记化（tokenization）使全文搜索成为可能，将文本分解为标记的更小块。在大多数情况下，这些标记是单个单词。

## 概念
分析器（无论是内置的还是自定义的）只是一个包，其中包含三个较低级别的构建块：字符过滤器（character filters），标记生成器（tokenizers）和标记过滤器（token filters）。

* 索引和搜索分析器：文本分析发生在两次时间，索引时间（index time）和搜索时间（search time）。大多数情况，应在索引和搜索时使用同一台分析器，这样可以确保将字段的值和查询字符串更改为相同形式的标记。

* 词干化（Stemming）：词干化是将单词还原为词根形式的过程。这样可以确保在搜索过程中单词匹配的变体。如walking和walked的词根是walk。

* 标记图（Token graphs）：标记生成器将文本转换为标记流时，还会标记位置（position）和标记跨越的位置数（positionLength）。使用这些，可以为流创建有向无环图，称为标记图。

## 内置解析器
* standard analyzer：标准分析器；按照Unicode编码算法，将文本按照单词边界划分为terms，转为小写，支持删除停用词。
* simple analyzer：简易分析器；遇到非字母字时，将文本划分terms，转为小写，支持删除停用词。
* whitespace analyzer：空格分析器；遇到任意空格是，将文本划分为terms，不会小写。
* stop analyzer：同simple analyzer
* keyword analyzer：无操作解析器；会将文本作为单个term输出。
* pattern analyzer：正则表达式解析器；按照正则表达式，将文本分成多个term，支持小写字母和停用词。
* language analyzer：特定语言分析器；如：english
* custom analyzer：自定义解析器