---
title: ELK-加密通信的说明和配置教程
categories:
  - 技术
tags:
  - ELK
abbrlink: 12eaa363
date: 2021-04-28 00:00:00
---


> 介绍Elasticsearch节点之间的加密通信、浏览器与Kibana之间的加密通信、Kibana与Elasticsearch之间的加密通信、操作步骤和配置说明。
基于7.11。

<!-- more -->

## 1 Elasticsearch加密通信
Elastic Stack安全特性能够加密加密往返于Elasticsearch集群以及从其内部的通信。使用传输层安全性(TLS/SSL)保护连接的安全。
未启用加密的群集将以纯文本格式（包括密码）发送所有数据。如果启用了Elasticsearch安全功能，除非您具有试用许可证，否则必须配置SSL/TLS进行节点间通信。

### 1.1 Elasticsearch节点之间的加密通信
https://www.elastic.co/guide/en/elasticsearch/reference/7.11/configuring-tls.html#tls-transport

* Verify that the xpack.security.enabled setting is true.（启用安全功能）
* Generate a private key and X.509 certificate.（生成私钥和X.509证书）
* Configure each node to:
  * Required: Enable TLS on the transport layer.（传输层启用TLS）
  * Recommended: Enable TLS on the HTTP layer.（HTTP层启用TLS）

### 1.2 HTTP客户端的加密通信
https://www.elastic.co/guide/en/elasticsearch/reference/7.11/configuring-tls.html#tls-http

* Generate node certificates.（生成节点证书）
* Enable TLS and specify the information required to access the node’s certificate.（启用TLS并指定节点证书）
* Restart Elasticsearch.（重启Elasticsearch）

## 2 Kibana通信加密
传输层安全安全协议(SSL)和传输层安全协议(TLS)为数据传输提供加密。虽然这些术语通常可以互换使用，但 Kibana 只支持 TLS，它取代了旧的 SSL 协议。
浏览器将流量发送到 Kibana，Kibana 将流量发送到 Elasticsearch，这些通信通道分别配置为使用 TLS。

### 2.1 浏览器与Kibana之间的加密通信
https://www.elastic.co/guide/en/kibana/7.11/configuring-tls.html#configuring-tls-browser-kib

1. 获得 Kibana 的服务器证书和私钥
2. 配置 Kibana 以访问服务器证书和私钥
3. 将 Kibana 配置为为入站连接启用 TLS
4. 重启 Kibana

### 2.2 Kibana与Elasticsearch之间的加密通信
https://www.elastic.co/guide/en/kibana/7.11/configuring-tls.html#configuring-tls-kib-es

* Enable TLS on the HTTP layer in Elasticsearch.（在Elasticsearch的HTTP层上启动TLS）
* Obtain the certificate authority (CA) certificate chain for Elasticsearch.（获取Elasticsearch的证书颁发机构(CA)证书链）
  * used the elasticsearch-certutil http command,include the CA certificate chain in PEM format.（使用elasticsearch-certutil http命令生成CA证书链）
  * extract the CA certificate.（通过PKCS#12文件提取CA证书链）
* Configure Kibana to trust the Elasticsearch CA certificate chain for the HTTP layer.（配置Kibana以信任HTTP层的Elasticsearch CA证书链）
* Configure Kibana to enable TLS for outbound connections to Elasticsearch.（配置Kibana与Elasticsearch的连接启用TLS）

## 3 操作步骤

1. 操作命令
```shell
# 进入Elasticsearch目录
cd /data/elk/elasticsearch-7.11.2
# 创建证书颁发机构：获得文件：elastic-stack-ca.p12
./bin/elasticsearch-certutil ca
# 为每个节点生成证书和私钥，获得文件：elastic-certificates.p12
./bin/elasticsearch-certutil cert --ca elastic-stack-ca.p12
# 生成专门用于加密HTTP客户端通信的证书，获得文件：elasticsearch-ssl-http.zip
./bin/elasticsearch-certutil http
# 解压HTTP通信证书，获得文件：elasticsearch/http.p12和kibana/elasticsearch-ca.pem
unzip elasticsearch-ssl-http.zip
# 在每个Elasticsearch节点的配置目录中创建一个文件夹certs，放置安全证书
mkdir /data/elk/elasticsearch-7.11.2/config/certs
cp elastic-certificates.p12 config/certs
cp elasticsearch/http.p12 config/certs
# 复制HTTP通信证书到Kibana配置目录
cp kibana/elasticsearch-ca.pem /data/elk/kibana-7.11.2/config
```

2. 生成加密HTTP客户端通信证书说明（./bin/elasticsearch-certutil http）
参考：https://lights8080.github.io/post/es-an-quan-security

## 4 参数配置

1. Elasticsearch
elasticsearch-7.11.2/config/elasticsearch.yml
```yaml
# 在节点上启用Elasticsearch安全功能
xpack.security.enabled: true
# 节点间加密通信配置
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate 
xpack.security.transport.ssl.keystore.path: elastic-certificates.p12 
xpack.security.transport.ssl.truststore.path: elastic-certificates.p12 
# HTTP加密通信配置
xpack.security.http.ssl.enabled: true
xpack.security.http.ssl.keystore.path: "certs/http.p12"
```

2. Kibana
kibana-7.11.2/config/kibana.yml
```yaml
# 配置Kibana与Elasticsearch的连接启用TLS
elasticsearch.hosts: ["https://127.0.0.1:9200"]
# 配置信任HTTP层的Elasticsearch CA证书链
elasticsearch.ssl.certificateAuthorities: ["/data/elk/kibana-7.11.2/config/elasticsearch-ca.pem"]
```

3. Logstash
logstash-7.11.2/config/logstash-sample.conf
```
output {
    elasticsearch {
            hosts => ["https://127.0.0.1:9200"]
            user => "elastic"
            password => "xxxxxx"
            cacert => "/data/elk/elasticsearch-7.11.2/config/certs/elasticsearch-ca.pem"
     }
}
```

4. Metricbeat
metricbeat-7.11.2/modules.d/elasticsearch-xpack.yml
```xml
- module: elasticsearch
  xpack.enabled: true
  period: 10s
  hosts: ["https://127.0.0.1:9200"]
  username: "elastic"
  password: "xxxxxx"
  ssl.certificate_authorities: ["/data/elk/elasticsearch-7.11.2/config/certs/elasticsearch-ca.pem"]
```

5. 其他Elastic产品使用加密通信
略





