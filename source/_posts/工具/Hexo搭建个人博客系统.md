---
title: Hexo搭建个人博客系统
categories:
  - 工具
tags:
  - Hexo
  - 开源产品
abbrlink: 9af43afc
date: 2021-06-08 00:00:00
---

> 介绍基于Hexo搭建个人博客，包括评论、图床、站内搜索、字数统计、PV统计、百度统计等

<!-- more -->

## 特色
1. Hexo（https://hexo.io/zh-cn/）
2. 模板：pure（https://github.com/cofess/hexo-theme-pure.git）
3. 模板2：hexo-theme-matery（https://github.com/blinkfox/hexo-theme-matery）
4. 图床：gitee
5. 评论：valine（https://console.leancloud.cn/apps）
6. 站内搜索：insight
7. 字数统计：postCount
8. PV统计（leancloud）
9. 百度统计（https://tongji.baidu.com/web/10000362099/homepage/index）

## 命令
```sh
# 切换Node版本
nvm use v14.17.0

# 生成静态文件（-d：部署；-w：监视文件变动）
hexo generate/hexo g
# 启动服务器
hexo server/hexo s
# 部署网站
hexo deploy/hexo d

# 更换主题后，清除缓存文件和已生成的静态文件
hexo clean

hexo clean && hexo deploy
hexo s -w
```

## 安装步骤
```sh
# 切换Node版本
nvm use v14.17.0

# Hexo初始化项目
hexo init blog
cd blog

# 安装依赖模块
npm install hexo-wordcount --save
npm install hexo-generator-json-content --save
npm install hexo-generator-feed --save
npm install hexo-generator-sitemap --save
npm install hexo-generator-baidu-sitemap --save
npm install hexo-deployer-git --save
npm install highlight.js --save

# 下载pure模板
cd themes
git clone git@github.com:cofess/hexo-theme-pure.git

# 启动
npm install
hexo server
```

### 环境配置

$ vim _config.yml
```yaml
# Hexo发布
deploy:
- type: git
  repo: https://github.com/lights8080/lights8080.github.io
  branch: master
  token: 
```

$ vim themes/pure/_config.yml
```yaml
# 评论
comment:
  valine:
    appid: 
    appkey: 
# 百度统计
plugins:
  baidu_analytics: 
```

## 文章链接唯一化
npm install hexo-abbrlink --save

```
permalink: post/:abbrlink.html
abbrlink:
  alg: crc32  # 算法：crc16(default) and crc32
  rep: hex    # 进制：dec(default) and hex
```

## 报错问题处理
执行hexo server命令，报错
```
INFO  Validating config
INFO  Start processing
FATAL { err:
   TypeError: line.matchAll is not a function
       at res.value.res.value.split.map.line (/home/seek/Data/hexosite/node_modules/hexo-util/lib/highlight.js:128:26)
       at Array.map (<anonymous>)
```

升级node到12以上
https://stackoverflow.com/questions/67516168/i-just-installed-hexo-static-site-generator-on-debian-and-ran-hexo-server-to-see