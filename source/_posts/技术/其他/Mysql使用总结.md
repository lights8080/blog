---
title: Mysql使用总结
categories:
  - 技术
tags:
  - Mysql
abbrlink: 28b8e966
date: 2021-06-24 00:00:00
---

新建用户及授权、性能指标、数据库容量、导入导出、存储过程和事件、sql总结

<!-- more -->

## 新建用户及授权

```sql
-- 添加用户
CREATE USER 'username'@'host' IDENTIFIED BY 'password';
-- 授权
GRANT [select,update,delete,create,drop] privileges ON databasename.tablename TO 'username'@'host';
-- 授权示例
GRANT all privileges ON *.* TO 'user1'@'%' identified by '123456';
-- 刷新系统权限表
flush privileges;
-- 设置或更改用户密码
SET PASSWORD FOR 'username'@'host' = PASSWORD('newpassword');
-- 撤销用户权限
REVOKE privilege ON databasename.tablename FROM 'username'@'host';
-- 查看授权信息
SHOW GRANTS FOR 'username'@'host';
-- 删除用户
DROP USER 'username'@'host';
```

### Examples
```
grant all privileges on *.* to root@'%' identified by '123456';
flush privileges;

CREATE USER 'lihaipeng'@'%' IDENTIFIED BY '123456';
GRANT all privileges ON *.* TO 'lihaipeng'@'%' identified by '123456';
flush privileges;
```

## 性能指标
```sql
-- sql性能分析
explain select * from xxx

-- 显示正在执行语句
show PROCESSLIST;
-- 查询表连接数和锁表数
show open tables;

-- max_connections 最大连接数
-- max_user_connections 单用户的最大连接数
-- thread_cache_size 线程缓存最大数
show variables like '%max_connections%';

-- Threads_cached 当前缓存中空闲的连接数量
-- Threads_connected 当前打开的连接数量
-- Threads_running 不在睡眠的线程数量
show status like 'Threads%';

-- Max_used_connections 同时使用的连接的最大数目
-- Connections 试图连接到MySQL(不管是否连接成功)的连接数
show status like 'Max_used_connections';

-- 显示group_concat长度限制
show session variables LIKE '%group_concat_max_len%';
-- 设置group_concat长度限制
SET SESSION group_concat_max_len=512000;
```

#### 事务和锁
```sql
-- 查看数据库当前的进程
show processlist;
select * from information_schema.processlist;
-- 当前运行的所有事务
SELECT * FROM information_schema.INNODB_TRX;
-- 查看正在锁的事务
SELECT * FROM information_schema.INNODB_LOCKS;
-- 查看等待锁的事务
SELECT * FROM information_schema.INNODB_LOCK_WAITS;
-- 结束线程
KILL <trx_mysql_thread_id>;
```

#### 连接数和超时时间
```sql
-- 查看服务器状态信息(分为全局和会话，支持like)
SHOW global status LIKE 'slow_queries';
-- 查看系统变量及其值(分为全局和会话，支持like)
show global variables LIKE '%slow_queries%';
-- 更改全局变量，必须具有SUPER权限
-- 最大连接数
set global max_connections=1500;
-- 关闭一个非交互的连接之前等待秒数 28800
set global wait_timeout=600;
-- 关闭一个交互的连接之前等待秒数 28800
set global interactive_timeout=600;
-- 锁等待时间 31536000
set global lock_wait_timeout=600;
```

#### 查看数据库容量
```sql
-- 查看所有数据库容量大小
select
table_schema as '数据库',
sum(table_rows) as '记录数',
sum(truncate(data_length/1024/1024, 2)) as '数据容量(MB)',
sum(truncate(index_length/1024/1024, 2)) as '索引容量(MB)'
from information_schema.tables
group by table_schema
order by sum(data_length) desc, sum(index_length) desc;

-- 查看所有数据库各表容量大小
select
table_schema as '数据库',
table_name as '表名',
table_rows as '记录数',
truncate(data_length/1024/1024, 2) as '数据容量(MB)',
truncate(index_length/1024/1024, 2) as '索引容量(MB)'
from information_schema.tables
order by data_length desc, index_length desc;

-- 查看指定数据库容量大小
select
table_schema as '数据库',
sum(table_rows) as '记录数',
sum(truncate(data_length/1024/1024, 2)) as '数据容量(MB)',
sum(truncate(index_length/1024/1024, 2)) as '索引容量(MB)'
from information_schema.tables
where table_schema='mysql';

-- 查看指定数据库各表容量大小
select
table_schema as '数据库',
table_name as '表名',
table_rows as '记录数',
truncate(data_length/1024/1024, 2) as '数据容量(MB)',
truncate(index_length/1024/1024, 2) as '索引容量(MB)'
from information_schema.tables
where table_schema='mysql'
order by data_length desc, index_length desc;
```

## 导入/导出
```sql
-- 导出指定库所有表结构
mysqldump -u root -p234234 -h 192.168.1.75 -d [数据库] > a.sql
-- 导出指定数据库所有结构和数据
mysqldump -u root -p234234 -h 192.168.1.75 [数据库] > a.sql
-- 导出指定数据库，指定表结构
mysqldump -u root -p234234 -h 192.168.1.75 -d [数据库] [表] > a.sql
-- 导出指定数据库，指定表结构和数据
mysqldump -u root -p234234 -h 192.168.1.75 [数据库] [表] > a.sql
-- 导入
mysql -u root -proot test < cid-fromto-1.sql 
```

#### to csv
```sql
SELECT order_id,product_name,qty FROM orders
INTO OUTFILE '/tmp/orders.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
```

#### to txt
```sql
SELECT order_id,product_name,qty FROM orders
INTO OUTFILE '/tmp/orders.txt'
```

## Sql

### 统计：mysql中每10分钟统计
```sql
SELECT concat(date_format(createtime,'%Y-%m-%d %H:') , floor( date_format(createtime, '%i')/10)) AS c, count( id )
FROM `qm_log`
WHERE createtime BETWEEN '2015-11-24 07:00:00' and '2015-11-24 08:59:59'
GROUP BY c
```

### 关联表更新
```sql
update fesf_order.order_detail od set od.child_policy_no =
(
select pg.policy_no from fesf_commission.policy_general pg where pg.id = substring_index(od.child_policy_id,"|",-1)
);
```

### 数据库表迁移
```sql
-- 复制表
create table database1.table1 like database2.table1;

-- 复制表数据
insert into database1.table1 select * from database2.table1;

-- 数据库改名方案
-- 1. 创建目标库
CREATE SCHEMA `unififi_security` DEFAULT CHARACTER SET utf8;
-- 2. 生成改表名的sql
select concat('rename table ',TABLE_SCHEMA,'.',TABLE_NAME,' to target_schema.',TABLE_NAME,';') from information_schema.TABLES where TABLE_SCHEMA='origin_schema';
```

#### 数据库改名脚本
rename_schema.sh
```shell
#!/bin/bash
# 假设将sakila数据库名改为new_sakila
# MyISAM直接更改数据库目录下的文件即可

mysql -uroot -p123456 -e 'create database if not exists new_sakila'
list_table=$(mysql -uroot -p123456 -Nse "select table_name from information_schema.TABLES where TABLE_SCHEMA='sakila'")

for table in $list_table
do
    mysql -uroot -p123456 -e "rename table sakila.$table to new_sakila.$table"
done
```

### 库表操作
```sql
-- 创建库
CREATE SCHEMA `lights` DEFAULT CHARACTER SET utf8;
-- 删除/创建表
drop table `lights`.`scheduler_log`;
CREATE TABLE `lights`.`scheduler_log` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `task_id` varchar(64) DEFAULT NULL COMMENT '任务ID',
  `task_type` varchar(10) DEFAULT NULL COMMENT '任务类型 once:一次性任务 cron:定时任务',
  `task_module` varchar(100) DEFAULT NULL COMMENT '任务模块',
  `callback_url` varchar(500) DEFAULT NULL COMMENT '回调URL',
  `callback_request` varchar(3000) DEFAULT NULL COMMENT '回调请求内容',
  `callback_response` varchar(3000) DEFAULT NULL COMMENT '回调响应内容',
  `callback_status` int(11) DEFAULT '0' COMMENT '回调响应状态 0:成功',
  `callback_spendms` int(11) DEFAULT '0' COMMENT '回调响应时间（毫秒）',
  `gmt_create` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `gmt_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_query` (`gmt_create`) USING BTREE,
  KEY `idx_task_module` (`task_module`) USING HASH
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='任务执行日志表';

-- 修改表
alter table `lights`.`scheduler_log` add column `test` longtext COMMENT 'test' after callback_spendms;

-- 创建索引
create UNIQUE index uk_orderno on lights.order_main (order_no);
create index idx_query on lights.order_main (gmt_create, status) USING BTREE;

-- 创建存储过程
drop procedure if exists `lights`.`proc_report`;
create procedure `lights`.`proc_report`(IN report_day date)
  begin
    declare end_day date;
    declare usd_rmbratio decimal(18, 6) default 1;
    set usd_rmbratio = 6.890000;
    set end_day = date_add(date_add(report_day, interval 1 day), interval -1 microsecond);
    -- 可以执行delete、update、insert操作
    select * from table;

  end;

-- 调用存储过程
call `lights`.proc_report('2019-01-02');
select * from lights.proc_report;

-- 创建事件
drop event if exists `lights`.`proc_report`;
CREATE EVENT `lights`.`event_call_proc_report`
  on schedule EVERY 1 DAY
    STARTS DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 1 DAY), INTERVAL 1 HOUR)
  ON COMPLETION PRESERVE
DO
  BEGIN
    call `lights`.`proc_report`(DATE_ADD(CURDATE(), INTERVAL -1 DAY));
  END;
  
-- 创建函数
delimiter $$
CREATE FUNCTION fesf_accounting.accounting_status(cc_status int, iata_status int) RETURNS int
BEGIN
    declare status int default null;
    if  iata_status = 1 || cc_status = 1
        then set status = 5;
    elseif iata_status = 6 || cc_status = 6
        then set status = 6;
    else
        set status = null;
    end if;
    return status;
END $$
```
