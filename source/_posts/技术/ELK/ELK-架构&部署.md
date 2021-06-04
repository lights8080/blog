---
title: ELK-架构&部署
date: 2021-05-10 11:27:15
categories:
- 技术
- ELK
tags:
- 技术
- ELK
---

> 介绍业务规模和架构选择，以及部署说明。
基于7.11版本。

<!-- more -->

## 业务规模
业务每天查询量在千万级，采集数据的规模上亿（后续会更大）。单台Logstash，数据延迟并不大，肉眼可见的Logstash的数据处理能力
![Logstash监控](https://gitee.com/lights8080/lights8080-oss/raw/master/2021/05/lmWxyk.jpg)

## 架构选择
ELK架构有很多种，这里简单列出常用的几个：
* 架构1（最为简单）
  Logstash -> Elasticsearch -> Kibana
* 架构2（使用Beats作为日志收集器）
  Beats -> Logstash -> Elasticsearch -> Kibana
* 架构3（引入消息队列）
  Beats -> Logstash -> Kafka -> Logstash -> Elasticsearch -> Kibana

其中架构3可能是被大家积极推荐和最为认可的理想架构。优点是消息队列可以把数据缓存起来避免数据丢失，可以抵挡浪涌削峰填谷，保护下游Logstash。适用于日志规模比较庞大的场景。

但我的实践中采用的架构2，理由如下：
* 消除不必要的复杂性，较低成本
* 关于数据丢失，Filebeat至少投递一次和Logstash持久队列可以解决这个问题
* 日志规模比较大的情况，可以水平扩展Logstash节点，一组Logstash之间实现负载
* 实践Logstash处理能力很强

![架构2](https://www.elastic.co/guide/en/logstash/7.11/static/images/deploy3.png)

## 部署说明&实践配置
介绍服务器环境配置，以及Elasticsearch、Kibana、Logstash、Filebeat的部署和配置参考。

* kibana-7.11.2/config/lights.conf
* filebeat-7.11.2/inputs.d/lights.yml
关于业务的这两个配置，不理解的请私信或留言吧


#### 新建用户和修改文件夹权限
```sh
# 新建用户
$ groupadd elk
$ useradd -m -d /home/elk -s /bin/bash -g elk elk
# 修改文件夹所属组
$ chown -R elk:elk /opt/elk
$ chown -R elk:elk /data/elk
```

#### 修改系统配置
* vim /etc/sysctl.conf
```sh
vm.max_map_count = 262144
```

* vim /etc/security/limits.conf
```sh
elk soft memlock unlimited
elk hard memlock unlimited
```

#### Elasticsearch

* vim bin/elasticsearch
```sh
export JAVA_HOME=/opt/elk/elasticsearch-7.11.2/jdk
export PATH=$JAVA_HOME/bin:$PATH
```

* vim config/jvm.options
```
-Xms8g
-Xmx8g
```

* vim config/elasticsearch.yml
```yaml
cluster.name: elasticsearch
node.name: node-1
node.master: true
node.data: true
node.ingest: true
path.data: /data/elk/elasticsearch/data
path.logs: /data/elk/elasticsearch/logs
network.host: "10.88.2.1"
http.port: 9200
transport.port: 9300
discovery.seed_hosts: ["10.88.2.1"]
#discovery.type: single-node
cluster.initial_master_nodes: ["10.88.2.1"]

http.cors.enabled: true
http.cors.allow-origin: "*"
bootstrap.memory_lock: true
bootstrap.system_call_filter: true

xpack.security.enabled: true
```

* 命令
```sh
# 启动
$ sh ./bin/elasticsearch -d -p es.pid
# 初始化内置用户
$ bin/elasticsearch-setup-passwords auto
```

#### Kibana

* vim config/kibana.yml
```yaml
server.port: 5601
server.host: "0.0.0.0"
server.name: "elk-1"
elasticsearch.hosts: ["http://10.88.2.1:9200"]
elasticsearch.username: "kibana_system"
elasticsearch.password: "xxxxxxx"
i18n.locale: "zh-CN"
xpack.reporting.encryptionKey: "something_at_least_32_characters"
xpack.security.encryptionKey: "something_at_least_32_characters"
xpack.encryptedSavedObjects.encryptionKey: "something_at_least_32_characters"
```

* 命令
```sh
# 启动
$ nohup sh ./bin/kibana >kibana.log 2>&1 &
# 查看端口
netstat -napl|grep 5601
# 停止
kill <port>
```

#### Logstash

* vim config/jvm.options
```
-Xms4g
-Xmx4g
```

* vim config/logstash.yml
```yaml
pipeline.workers: 4
queue.type: persisted
```

* vim config/lights.conf
```properties
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

    if "lights-nginx" in [tags] {
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
        if "lights-nginx" in [tags] {
            elasticsearch {
                hosts => ["http://10.88.2.1:9200"]
                index => "lights-nginx"
                action => "create"
                user => "elastic"
                password => "xxxxx"
            }
        }
    }
}
```

* 命令
```sh
# 测试配置
$ ./bin/logstash -f config/lights.conf --config.test_and_exit
# 启动
$ nohup ./bin/logstash -f config/lights.conf --config.reload.automatic > logstash.log &
```

#### Filebeat

* vim filebeat.yml
```yaml
filebeat.config.inputs:
  enabled: true
  path: ${path.config}/inputs.d/*.yml
  reload.enabled: true
  reload.period: 10s

output.logstash:
  hosts: ["10.88.2.1:5044"]
```

* vim inputs.d/lights.yml
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

* 命令
```sh
# 启动
$ nohup ./filebeat -e >filebeat.log 2>&1 &
```

