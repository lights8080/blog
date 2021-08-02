---
title: ELK-实践（业务框架&业务配置）
date: 2021-06-04
categories:
- 技术
tags:
- ELK
---

> 介绍基于业务的数据模型框架和业务配置（Elasticsearch的映射和索引、Logstash配置管理、Filebeat规则管理、同步脚本等）。
基于7.11版本。

<!-- more -->

业务中Elasticsearch数据分为两类：

* 日志类：数据线性增长，无修改操作，无主键，数据价值随时间递减。如：用户操作、异常信息等

* 业务类：有主键，允许修改删除，长期保留。如：订单信息、基础信息



数据提取方式和特点：

日志类数据：Filebeat->Logstash->Elasticsearch。数据流、通用模型、容错性强

业务类数据：通过脚本获取数据信息（数据库、API等）直接更新到Elasticsearch。自定义灵活可控

![](https://gitee.com/lights8080/lights8080-oss/raw/master/2021/06/vgIs47.png)

## 1. Elasticsearch 映射和索引

* lights-mappings：组件模板mappings
* lights-settings：组件模板settings
* lights-log：索引生命周期-日志类
* lights-data：索引生命周期-数据类
* lights-service-exception：服务异常信息（数据流）
* lights-nginx-web：Nginx日志（数据流）
* lights-order：订单信息（索引别名）

```yaml
### 创建索引模板组件-mapping
PUT /_component_template/lights-mappings
{
    "template": {
        "mappings": {
            "dynamic_date_formats": [
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd HH:mm:ss Z",
                "yyyy-MM-dd HH:mm:ss.SSS",
                "yyyy-MM-dd HH:mm:ss.SSS Z"
            ],
            "dynamic_templates": [
                {
                    "string_as_keyword": {
                        "match_mapping_type": "string",
                        "mapping": {
                            "type": "keyword",
                            "ignore_above": 1024
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
}

### 创建索引模板组件-setting
PUT /_component_template/lights-settings
{
    "template": {
        "settings": {
            "index": {
                "number_of_shards": 1,
                "number_of_replicas": 0,
                "refresh_interval": "15s",
                "codec": "best_compression"
            },
            "query": {
                "default_field": [
                    "@timestamp",
                    "message"
                ]
            }
        }
    }
}

### 创建索引生命周期-日志类
PUT _ilm/policy/lights-log
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "1d"
          }
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}

### 创建索引生命周期-数据类
PUT /_ilm/policy/lights-data
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "30d"
          }
        }
      }
    }
  }
}

### 创建索引模板（数据流）-服务异常信息
POST /_index_template/lights-service-exception
{
    "index_patterns": [
        "lights-service-exception"
    ],
    "data_stream": {},
    "template": {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
            "refresh_interval": "15s",
            "index.lifecycle.name": "lights-log-30"
        }
    },
    "priority": 100,
    "composed_of": [
        "lights-mappings",
        "lights-settings"
    ],
    "_meta": {
        "description": "索引模板-服务异常信息"
    }
}

### 创建索引模板（数据流）-Nginx日志
POST /_index_template/lights-nginx-web
{
    "index_patterns": [
        "lights-nginx-web"
    ],
    "data_stream": {},
    "template": {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
            "refresh_interval": "15s",
            "codec": "best_compression",
            "index.lifecycle.name": "lights-log"
        },
        "mappings": {
            "properties": {
                "bytes": {
                    "type": "long"
                },
                "status": {
                    "type": "integer"
                },
                "request_time": {
                    "type": "double"
                },
                "upstream_status": {
                    "type": "integer"
                },
                "upstream_response_time": {
                    "type": "double"
                }
            }
        }
    },
    "priority": 100,
    "composed_of": [
        "lights-mappings",
        "lights-settings"
    ]
}


### 创建索引模板（索引别名）-订单数据
POST /_index_template/lights-order
{
    "index_patterns": [
        "lights-order-*"
    ],
    "template": {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
            "refresh_interval": "15s"
        },
        "mappings": {
            "dynamic_date_formats": [
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd HH:mm:ss Z",
                "yyyy-MM-dd HH:mm:ss.SSS",
                "yyyy-MM-dd HH:mm:ss.SSS Z"
            ],
            "dynamic_templates": [
                {
                    "string_as_keyword": {
                        "match_mapping_type": "string",
                        "mapping": {
                            "type": "keyword",
                            "ignore_above": 1024
                        }
                    }
                },
                {
                    "total_as_double": {
                        "match_mapping_type": "long",
                        "match":   "*Amount",
                        "mapping": {
                            "type": "double"
                        }
                    }
                }
            ],
            "properties": {
                "orderNum": {
                    "type": "integer"
                },
                "logs": {
                    "properties": {
                        "remark": {
                            "type": "text"
                        }
                    }
                }
            }
        },
        "aliases": {
            "lights-order": {}
        }
    },
    "priority": 100,
    "_meta": {
        "description": "索引模板-订单数据"
    }
}
```

## 2. Logstash Config

1. 通过Filebeat标签识别日志类型
2. 根据具体的服务名称打上业务标签，过滤、处理数据
3. 根据不同的业务标签，输出到不同的Elasticsearch索引

config/lights.conf
```yaml
# Sample Logstash configuration for creating a simple
# Beats -> Logstash -> Elasticsearch pipeline.

input {
    beats {
        port => 5044
        host => "0.0.0.0"
    }
}

filter {
    if "lights-service" in [tags] {
        if !([service_name]) {
            mutate {
                copy => { "[log][file][path]" => "log_file_path" }
            }
            mutate {
                split => [ "log_file_path" , "/" ]
                add_field => { "service_name" => "%{[log_file_path][2]}" }
                remove_field => ["log_file_path"]
            }
        }

        if [message] =~ " ERROR " and [message] =~ "Exception" {
            truncate {
                fields => ["message"]
                length_bytes => 10000
            }
            grok {
                match => {
                    "message" => [
                        "%{TIMESTAMP_ISO8601:timestamp} \[%{DATA:thread}\] %{DATA:level} %{DATA:class} - %{DATA:error_message}\n%{GREEDYDATA:throwable}",
                        "%{TIMESTAMP_ISO8601:timestamp} \[%{DATA:thread}\] %{DATA:level} %{DATA:class} - %{DATA:error_message}",
                        "%{TIMESTAMP_ISO8601:timestamp} \[%{DATA:thread}\] %{DATA:level} - %{DATA:error_message}\n%{GREEDYDATA:throwable}",
                        "%{TIMESTAMP_ISO8601:timestamp} \[%{DATA:thread}\] %{DATA:level} - %{DATA:error_message}"
                    ]
                }
                id => "service-exception"
            }
            mutate {
                add_tag => [ "service-exception" ]
            }
            if [throwable] {
                mutate {
                    remove_field => ["throwable"]
                }
            }
        } else {
            if [service_name] == "lights-search-service" and [message] =~ "LightSearchServiceImpl" and [message] =~ " INFO " {
                grok {
                    match => {
                        "message" => [
                            "%{TIMESTAMP_ISO8601:timestamp} \[%{DATA:thread}\] %{DATA:level} %{DATA:class} - %{GREEDYDATA:response_message}"
                        ]
                    }
                    id => "lights-search-service"
                }
                mutate {
                    add_tag => [ "lights-search-service" ]
                    remove_field => ["message"]
                }
            }
        }
    }

    if "lights-nginx-web" in [tags] {
        grok {
            match => {
                "message" => [
                    "%{IPORHOST:clientip} %{IPORHOST:server_name} %{HTTPDUSER:ident} %{HTTPDUSER:auth} \[%{HTTPDATE:timestamp}\] \"(?:%{WORD:verb} %{DATA:request}(?: HTTP/%{NUMBER:httpversion})?|%{DATA:rawrequest})\" (?:-|%{NUMBER:status}) (?:-|%{NUMBER:request_time}) (?:-|%{NUMBER:bytes}) \"%{DATA:http_referer}\" \"%{DATA:http_user_agent}\" \"%{DATA:http_x_forwarded_for}\" \"%{DATA:upstream_addr}\" %{NUMBER:upstream_status} %{NUMBER:upstream_response_time}"
                ]
            }
        }
        mutate {
            remove_field => ["message"]
        }
    }
    date {
        match => [ "timestamp", "yyyy-MM-dd HH:mm:ss.SSS", "dd/MMM/yyyy:HH:mm:ss Z" ]
    }
    mutate {
        remove_field => ["@version", "timestamp", "agent", "input"]
    }
}

output {
    #stdout { codec => rubydebug { metadata => true } }
    if "_grokparsefailure" in [tags] {
        file {
            path => "/opt/elk/logstash-7.11.2/_grokparsefailure-%{+yyyy.MM.dd}"
        }
    } else {
        if "service-exception" in [tags] {
            elasticsearch {
                hosts => ["http://10.88.2.1:9200"]
                index => "lights-service-exception"
                action => "create"
                user => "elastic"
                password => "xxxxx"
            }
        }
        if "lights-search-service" in [tags] {
            elasticsearch {
                hosts => ["http://10.88.2.1:9200"]
                index => "lights-search"
                #document_id => "%{[@metadata][_id]}"
                action => "create"
                user => "elastic"
                password => "xxxxx"
            }
        }
        if "lights-nginx-web" in [tags] {
            elasticsearch {
                hosts => ["http://10.88.2.1:9200"]
                index => "lights-nginx-web"
                action => "create"
                user => "elastic"
                password => "xxxxx"
            }
        }
    }
}
```

## 3.1 Filebeat

```yaml
# Nginx日志
- type: log
  enabled: true
  paths:
    - /log/nginx/lights.log
  tags: ["lights-nginx"]
  tail_files: true

# Java日志(异常多行合并)
- type: log
  enabled: true
  paths:
    - /log/<service-name>/*.log
  exclude_lines: ['/actuator/']
  exclude_files: ['.gz$']
  tags: ["lights-service"]
  multiline.type: pattern
  multiline.pattern: '^\d{4}-\d{2}-\d{2}'
  multiline.negate: true
  multiline.match: after
  ignore_older: 6h
```

## 3.2 脚本（同步到Elasticsearch）

```sh
#!/bin/bash
# 判断脚本正在执行
LOCK=$(cat $es_script_path/.lock_$file_suffix)
if [ $LOCK -eq 1 ];then
   echo "`date "+%Y-%m-%d %H:%M:%S"` locked" && exit 1
fi
echo "1" > $es_script_path/.lock_$file_suffix

DATE_BEGIN=$(cat $es_script_path/.lasttime_$file_suffix)
DATE_END=`date +"%Y-%m-%d %H:%M:%S"`
DATE_BEGIN="2021-05-01 09:00:10"
DATE_END="2021-05-01 09:00:10"

ORDERS_SQL="""
select order_no from lights.order where createtime BETWEEN '$DATE_BEGIN' and '$DATE_END'
"""
# 查询同步订单列表
ORDERS_RESULT=$(mysql -u <user> <db> -e  "$ORDERS_SQL");

for LINE in $ORDERS_RESULT
do
  if [ 'order_no' != "$LINE" ];then
    es_index=`echo "lights-order-20$LINE"|cut -c 1-20`
    echo "sync order time:$DATE_BEGIN ~ $DATE_END order no: $LINE, es index: $es_index"
    # 调用查询接口
    orderdetail_result=$(curl -XPOST -H "Content-Type: application/json" -d '{"orderNo":"'$LINE'"}' http://localhost:8080/flights-order-service/order/detail)
    echo "$orderdetail_result" > $es_script_path/.data_$file_suffix
    # 时区设置
    cat $es_script_path/.data_$file_suffix |jq '.orderInfo' -c >$es_script_path/.data_1_$file_suffix
    sed -i 's/[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} [0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}/& +0800/g' $es_script_path/.data_1_$file_suffix
    # 保持到Elasticsearch
    curl -XPOST --user 'elastic:<password>' -H "Content-Type: application/json" http://localhost:9200/$es_index/_doc/$LINE -d@$es_script_path/.data_1_$file_suffix
  fi
done

# 更新同步时间 及 解除正在执行标记
echo $DATE_END > $es_script_path/.lasttime_$file_suffix
echo "0" > $es_script_path/.lock_$file_suffix
```


## 4. 其他

#### 1. Logstash Req-Resp合并成一条事件

正常情况下Controller层会拦截请求参数和响应结果并输出到日志，如何基于线程ID将前后两条日志记录合并到一个事件中。

```yaml
if [service_name] == "lights-order-service" and [message] =~ "LIGHTS-RE" and [message] =~ " INFO " {
    grok {
        match => {
            "message" => [
                "%{TIMESTAMP_ISO8601:timestamp} \[%{DATA:thread}\] %{DATA:level} - LIGHTS-%{DATA:type}-\[%{DATA:class_method}\] \[%{DATA:username}\] \[%{GREEDYDATA:request}\]",
                "%{TIMESTAMP_ISO8601:timestamp} \[%{DATA:thread}\] %{DATA:level} - LIGHTS-%{DATA:type}-\[%{DATA:class_method}\] %{GREEDYDATA:response} size:%{DATA:size} spend:%{DATA:spend}ms"
            ]
        }
        id => "lights-order-service"
    }
    if [type] == "REQ" {
        aggregate {
            task_id => "%{thread}"
            code => "map['request_timestamp'] = event.get('timestamp'); map['username'] = event.get('username'); map['request'] = event.get('request')"
            map_action => "create"
        }
    }
    if [type] == "RESP" {
        aggregate {
            task_id => "%{thread}"
            code => "event.set('request_timestamp', map['request_timestamp']); event.set('username', map['username']); event.set('request', map['request'])"
            map_action => "update"
            end_of_task => true
            timeout => 120
        }
        mutate {
            add_tag => [ "lights-order-service" ]
            remove_field => ["message"]
        }
    }
}
```

#### 2. Kibana小技巧和注意事项

1. Kibana可视化中Lens(条形图、饼图等)，如何使用索引的另一个时间x字段统计？
新建一个Kibana索引，选择x字段作为时间字段。

2. Kibana可视化中Lens(条形图、饼图等)，如何像TSVB那样使用公式计算值？
使用Kibana索引的脚本字段，在Lens中使用

3. Kibana中Discover时间框搜索是大于等于(>=)开始时间，小于(<)结束时间，对时间敏感的搜索需要注意

#### 3. Elasticsearch时区问题
Elasticsearch存储和读取时都要带上时区

* Logstash存储修改UTC时间为东八区时间
```json
ruby {
            code => "event.set('temp', event.get('@timestamp').time.localtime + 8*60*60); event.set('@timestamp', event.get('temp'))"
        }
```

* 直接存储ES的时间字段要带上时区信息`2021-05-15 00:00:00 +0800`
```sh
curl -XPOST --user 'elastic:xxx' -H "Content-Type: application/json" http://127.0.0.1:9200/es_index/_doc/$LINE -d@/json_data
```

* Kibana搜索时带上时区
```json
GET lights-order/_count
{
  "query": {
    "range": {
      "@timestamp": {
        "gte": "2021-04-15 00:00:00",
        "lte": "2021-04-15 23:59:59",
        "format": "yyyy-MM-dd HH:mm:ss",
        "time_zone":"+08:00"
      }
    }
  }
}
```

#### 4. 设计上的原则
数据清洗一定发生在写入ES之前，而不是请求数据后处理，那势必会降低请求速度和效率。
让ES做他擅长的事，检索+不复杂的聚合，否则数据量+复杂的业务逻辑会有性能问题。
