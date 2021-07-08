---
title: "Linux使用总结"
date: 2021-06-24
categories:
- 技术
tags:
- Linux
---


<!-- more -->

## 常用命令

```sh
# 查找目录下的所有文件中是否含有某个字符串,只打印出文件名称
find . | xargs grep -ri 'string' -l

# 文件字符串替换
sed -i 's/oldStr/newStr/g' demo

# 将worker-5的异常前后20行保存到文件中
cat all.log.2015-08-26 | grep 'schedulerFactoryBean_Worker-5] - 异常信息' -A 20 -B 20 > worker-5-exception.log

# 查询文件中时间段的内容
sed -n '/2014-05-16/,/2014-05-17/p' catalina.out > 20140516tomcat.log
grep "2014-07-23 13:[00-59]" 20140514tomcat.log >05-14.log

# 正则匹配
egrep '(-开始)|(-结束)' p.log > begin-end.log

# 昨天这个时候的时间
date -d"yesterday" +"%F %H:%M:%S"

# linux 查询端口占用情况
netstat -natp|grep 8080

# 创建软连接
ln -s 目标文件 连接文件

#查看CPU性能
vmstat 1
#显示CPU数，ALL为索引
mpstat -P ALL 1
#查看I/O性能
iostat -m -x 1
```

## Statistics Examples

```sh
### 每小时的访问量统计
awk '{print $5}' /data/log/nginxlog/nginx.log|awk -F: '{s[$1":"$2]++}END{for(a in s){print a,s[a]}}'|sort

### 每小时状态码统计
awk '{print $5":"$10}' /data/log/nginxlog/nginx.log|awk -F: '{s[$1":"$2":"$5]++}END{for(a in s){print a,s[a]}}'|sort

### 统计search服务每分钟处理时间大于7秒的统计
grep '2021-02-02 00' /data/log/service/service.2021-02-02.log |grep 'ServiceImpl'| awk '{print $1,$2":"strtonum($12)}' |awk -F: '{if($4>7000){s[$1":"$2]++}}END{for(a in s){print a,s[a]}}'|sort

### 每小时统计[hour,gds_ms,jaxb_ms,parser_ms,spendms,count,spendms/1000]
grep 'INFO  c.f.s.s.api.service.impl.ServiceImpl ' /data/log/service/service.2019-04-24.log \
| awk '{split($2,time,":");split($9,gds,":");split($10,jaxb,":");split($11,parse,":");split($13,count,":");{print $1 "-" time[1] " " strtonum(gds[2]) " " strtonum(jaxb[2]) " " strtonum(parse[2]) " " strtonum(count[2])}}' \
| awk '{gds[$1]=gds[$1]+$2;jaxb[$1]=jaxb[$1]+$3;parser[$1]=parser[$1]+$4;count[$1]=count[$1]+$5;size[$1]=size[$1]+1};END{for(i in gds)print i,gds[i],jaxb[i],parser[i],(gds[i]+jaxb[i]+parser[i]),count[i],size[i],(gds[i]+jaxb[i]+parser[i])/1000 | "sort"}'

### 按航线统计
grep 'INFO  c.f.s.s.api.service.impl.ServiceImpl ' /data/log/service/service.2019-04-24.log \
| awk '{split($2,time,":");split($9,gds,":");split($10,jaxb,":");split($11,parse,":");split($13,count,":");{if(strtonum(gds[2])>7000){print $1 "-" time[1] "#" $7 " " strtonum(gds[2]) " " strtonum(jaxb[2]) " " strtonum(parse[2]) " " strtonum(count[2])}}}' \
| awk '{gds[$1]+=$2;jaxb[$1]+=$3;parser[$1]+=$4;count[$1]+=$5;size[$1]+=1};END{for(i in gds)print (gds[i]+jaxb[i]+parser[i]),(gds[i]+jaxb[i]+parser[i])/size[i],size[i],i | "sort -nr"}' \
| head -n 100 >> stat

### 统计每小时查询量
grep 'INFO' /data/log/service/service.2019-11-11.log|awk -F: '{sum[$1]+=1}END{for(c in sum){print c,sum[c]}}'|sort

### 统计单个小时航线查询量
grep 'INFO' /data/log/service/service.2019-11-11.log|awk -F: '{split($6,fromto,"|");{print $1,fromto[1]}}'|awk -F: '{sum[$1]+=1}END{for(c in sum){print c,sum[c]}}'|sort -k 4 -nr|head

### 统计每小时超时数
grep 'INFO' /data/log/service/service.2019-11-11.log|awk -F: '{split($5,detail,",");{print $1,strtonum(detail[1])}}'| awk '{if(strtonum($3)>7000){print $1,$2,"timeout"}else{print $1,$2,"ok"}}'|awk -F: '{sum[$1]+=1}END{for(c in sum){print c,sum[c]}}'|sort

```
