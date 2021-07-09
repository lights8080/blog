---
title: "同步订单到ES"
date: 2021-07-07
categories:
- 技术
- 脚本
tags:
- 脚本
- Shell
---

从Mysql->logstash->Elasticsearch。支持时间字段时区设置，防止重复执行，错误订单记录。

<!-- more -->

## sync_order_fix2.sh
```sh
#!/bin/bash

es_script_path="/opt/sync_elasticsearch/"
file_suffix="order_fix2"

LOCK=$(cat $es_script_path/.lock_$file_suffix)
if [ $LOCK -eq 1 ];then
   echo "`date "+%Y-%m-%d %H:%M:%S"` locked" && exit 1
fi
echo "1" > $es_script_path/.lock_$file_suffix

#DATE_BEGIN=$(cat $es_script_path/.lasttime_$file_suffix)
#DATE_END=`date +"%Y-%m-%d %H:%M:%S"`

DATE_BEGIN="2021-01-01 00:00:00"
DATE_END="2021-04-01 00:00:00"

ORDERS_SQL="""
select order_no from db.order_main where gmt_create BETWEEN '$DATE_BEGIN' and '$DATE_END'
"""

successStr='"status":0'
declare -i succ_c
declare -i fail_c
declare -i order_c
declare -i run_c
succ_c=0
fail_c=0
run_c=0
ORDERS_RESULT=$(mysql -u xxx -pxxx -h 127.0.0.1 db -e  "$ORDERS_SQL");
order_c=$(echo $ORDERS_RESULT|wc -w)
if [ $order_c -gt 0 ];then
  order_c=$order_c-1
fi
echo "sync order begin. time:$DATE_BEGIN ~ $DATE_END, count:$order_c"
for LINE in $ORDERS_RESULT
do
  if [ 'order_no' != "$LINE" ];then
    run_c=$run_c+1
    orderdetail_result=$(curl -XPOST -H "Content-Type: application/json" -H "username: _system_sync" -H "Authorization: " -d '{"orderNo":"'$LINE'"}' http://10.88.2.1:80/u2c-order-service/orderDetail -s)
    if [[ $orderdetail_result  =~ $successStr ]];then
      echo "$orderdetail_result" > $es_script_path/.data_$file_suffix
      cat $es_script_path/.data_$file_suffix |jq '.orderInfo' -c >$es_script_path/.data_1_$file_suffix
      sed -i 's/[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} [0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}/& +0800/g' $es_script_path/.data_1_$file_suffix
      logstash_result=$(curl -XPOST -H "Content-Type: application/json" http://10.88.2.1:4000 -d@$es_script_path/.data_1_$file_suffix -s)
      if [ "ok" == $logstash_result ];then
        echo "$order_c/$run_c $LINE ok"
        succ_c=$succ_c+1
      else
        echo "$LINE" >> $es_script_path/failure_$file_suffix
        echo "$order_c/$run_c $LINE fail -> $logstash_result"
        fail_c=$fail_c+1
      fi
    else
      echo "$LINE" >> $es_script_path/failure_$file_suffix
      echo "$order_c/$run_c $LINE fail -> $orderdetail_result"
      fail_c=$fail_c+1
    fi
  fi
done

echo "sync order end. time:$DATE_BEGIN ~ $DATE_END, count:$order_c, succ:$succ_c, fail:$fail_c"
echo $DATE_END > $es_script_path/.lasttime_$file_suffix
echo "0" > $es_script_path/.lock_$file_suffix
```
