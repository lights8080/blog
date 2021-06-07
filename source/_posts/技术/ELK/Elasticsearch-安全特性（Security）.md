---
title: Elasticsearch-安全特性（Security）
date: 2021-04-27
categories:
- 技术
- ELK
tags:
- 技术
- ELK
- Elasticsearch
---

> Elasticsearch安全特性，介绍加密通讯的基本原理、开启安全特性的操作步骤、如何生成节点证书、用户认证和相关概念等。
 基于7.11版本。
<!-- more -->

## 一、安全特性
Elastic Stack安全功能使您可以轻松保护集群。

Elasticsearch集群保护方式：
* 通过密码保护，基于角色的访问控制和IP过滤防止未经授权的访问。
* 使用SSL/TLS加密保留数据的完整性。
* 维护审计跟踪，知道谁在对集群进行操作

Elasticsearch配置安全的简易步骤：
1. 集群内每个节点设置为`xpack.security.enabled: true`
2. 为节点间通信配置TLS/SSL【#加密通讯】
3. 启动Elasticsearch
4. 设置内置用户和密码（命令：`elasticsearch-setup-passwords auto`）
5. 设置角色和用户，控制对Elasticsearch的访问
6. (可选)启用审计功能`xpack.security.audit.enabled: true`，并重启集群

### 1 加密通讯
> 未启用加密的群集将以纯文本格式（包括密码）发送所有数据。如果启用了Elasticsearch安全功能，除非您具有试用许可证，否则必须配置SSL/TLS进行节点间通信。

* Elasticsearch集群节点间通信使用SSL/TLS加密，保护节点安全有助于降低基于网络的攻击的风险
* 要求节点使用SSL证书添加到集群时进行身份验证，新节点的身份验证有助于防止流氓节点加入群集并通过复制接收数据

Elasticsearch集群配置STL
1. 为每个Elasticsearch节点生成一个私钥和X.509证书【#1.3 生成节点证书】
2. 在集群中配置每个节点，以使用其签名证书标识自己，并在传输层上启用TLS。还可以选择在HTTP层上启用TLS
3. 配置Kibana以加密浏览器和Kibana服务器之间的通信，并通过HTTPS连接到Elasticsearch
4. 配置其他Elastic产品使用加密通信

#### 1.1 加密集群中节点之间的通信
1. 生成节点证书【#1.3 生成节点证书】
2. 启用TLS并制定访问节点证书所需要的信息
```yaml
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate
xpack.security.transport.ssl.keystore.path: elastic-certificates.p12
xpack.security.transport.ssl.truststore.path: elastic-certificates.p12
```
3. （可选）如果你用密码保护节点的证书，将密码添加到 Elasticsearch 密钥存储库
4. 重启Elasticsearch

#### 1.2 加密HTTP客户端通信
1. 生成HTTP证书【#1.3 生成节点证书】
2. 启用TLS并制定访问节点证书所需要的信息
```yaml
xpack.security.http.ssl.enabled: true
xpack.security.http.ssl.keystore.path: "http.p12"
```
3. （可选）如果你用密码保护节点的证书，将密码添加到 Elasticsearch 密钥存储库
4. 重启Elasticsearch

#### 1.3 生成节点证书

1. （可选）为 Elasticsearch 集群创建一个证书颁发机构。

`./bin/elasticsearch-certutil ca`
输出文件是一个PKCS#12密钥存储库，其中包含证书颁发机构的公共证书和用于签署节点证书的私钥。

2. 为集群中的每个节点生成证书和私钥
交互形式：
`./bin/elasticsearch-certutil cert --ca elastic-stack-ca.p12`
命令形式：
`./bin/elasticsearch-certutil cert --ca elastic-stack-ca.p12 --dns localhost --ip 127.0.0.1,::1 --out config/certs/node-1.p12`
输出是一个包含节点证书、节点密钥和CA证书的PKCS#12密钥存储库。

3. （可选）生成专门用于加密 HTTP 客户端通信的附加证书。

`./bin/elasticsearch-certutil http`
命令步骤如下：
```shell
## Do you wish to generate a Certificate Signing Request (CSR)? - 是否生成证书签名请求(CSR)?
Generate a CSR? [y/N]N

## Do you have an existing Certificate Authority (CA) key-pair that you wish to use to sign your certificate? -是否有一个现有的证书颁发机构(CA)密钥对，您希望使用它来签署证书?
Use an existing CA? [y/N]y

## What is the path to your CA? - 你的CA路径在哪里?
CA Path: /data/elk/elasticsearch-7.11.2/elastic-stack-ca.p12

## How long should your certificates be valid? - 您的证书应该多长时间有效?
For how long should your certificate be valid? [5y] 3Y

## Do you wish to generate one certificate per node? - 是否希望每个节点生成一个证书?
Generate a certificate per node? [y/N]N

## Which hostnames will be used to connect to your nodes? - 哪些主机名将用于连接到您的节点?
### Enter all the hostnames that you need, one per line. - 输入需要的所有主机名，每行一个。
### When you are done, press <ENTER> once more to move on to the next step. - 完成后，再次按<ENTER>继续下一步。

Is this correct [Y/n]Y

## Which IP addresses will be used to connect to your nodes? - 哪些IP地址将用于连接到您的节点?
### Enter all the IP addresses that you need, one per line.
### When you are done, press <ENTER> once more to move on to the next step.

Is this correct [Y/n]Y

## Other certificate options - 其他证书选项
Do you wish to change any of these options? [y/N]N
输出是一个.zip 文件，包含 Elasticsearch 和 Kibana 各自的一个目录
```
输出文件elasticsearch-ssl-http.zip
```
/elasticsearch
|_ README.txt
|_ http.p12
|_ sample-elasticsearch.yml

/kibana
|_ README.txt
|_ elasticsearch-ca.pem
|_ sample-kibana.yml
```

4. 将节点证书复制到适当的位置
* 在每个Elasticsearch节点上的配置目录中创建文件夹certs。如：/home/es/config/certs。
* 在每个节点上，将创建的证书复制到certs目录（通常是一个.p12文件）
* 如果生成了HTTP证书，复制http.p12到certs目录
* 配置其他Elastic产品，将证书复制到相关目录

### 2 用户认证
安全功能提供了基于角色的访问控制（RBAC）机制，该机制使您可以通过为角色分配特权并将角色分配给用户或组来授权用户。
安全功能还提供了基于属性的访问控制（ABAC）机制，使您可以使用属性来限制对搜索查询和聚合中文档的访问。

role-based access control (RBAC) 
* Secured Resource（访问受限的资源）：索引，别名，文档，字段，用户和Elasticsearch群集本身都是受保护对象。
* Privilege（特权）：对受保护的资源执行的一个或多个动作的命名组，如read是索引特权，代表所有启用读取已索引/存储的数据的操作。
* Permissions（权限）：针对受保护资源的一组一个或多个特权，权限可以很容易地用语言来描述。
* Role（角色）：一组命名的权限
* User（用户）：经过身份验证的用户
* Group（用户组）：用户所属的一个或多个组

内置用户
* 这些内置用户存储在指定的.security索引中，由Elasticsearch管理。
* elasticsearch-setup-passwords工具是首次设置内置用户密码的最简单方法

基于令牌的身份验证
* token-service：访问令牌（根据OAuth2规范生成访问令牌和刷新令牌）是短期令牌，默认情况下20分钟后过期。（Authorization: Bearer xxx）
* api-key-service：API秘钥，默认情况下API密钥不会过期，创建时，可以指定到期时间和权限。（Authorization: ApiKey xxx）

## 二、相关概念
* SSL（Secure Socket Layer)/TLS(Transport Layer Security）
* 数字证书：互联网通讯中标志通讯各方身份信息的一系列数据
* X.509：是一种数字证书（Public Key Certificates）的格式标准，主要定义了证书中应该包含哪些内容。
  * HTTPS依赖的TLS/SSL证书使用的就是使用的X.509格式。一个X.509 Certificate包含一个Public Key和一个身份信息（a hostname, or an organization, or an individual），它要么是被CA签发的要么是自签发的。
* CA（Certificate Authority）：颁发数字证书的权威机构，承担公钥体系中公钥的合法性检验的责任。
* 编码格式：用来存储和发送公钥/私钥、证书和其他数据的文件格式；分为DER和PEM
  * DER（Distinguished Encoding Rules）：二进制不可读，常用于Windows系统
  * PEM（Privacy-Enhanced Mail）：内容是BASE64编码，常用于*NIX系统
* PKCS（Public Key Cryptography Standards）：公钥密码学标准
  * PKCS#12：描述个人信息交换语法标准，通常用来存储Private Keys和Public Key Certificates（例如前面提到的X.509）的文件格式，使用基于密码的对称密钥进行保护。

## 三、参考文档
[安全集群](https://www.elastic.co/guide/en/elasticsearch/reference/7.11/secure-cluster.html)
[加密通讯](https://www.elastic.co/guide/en/elasticsearch/reference/7.11/configuring-tls.html#configuring-tls)


