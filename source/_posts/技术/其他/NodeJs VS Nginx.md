---
title: NodeJs VS Nginx
categories:
  - 技术
tags:
  - 前端
  - NodeJs
  - Nginx
abbrlink: da8d67f4
date: 2021-06-08 00:00:00
---
前端项目动态应用和静态应用的区别，有了 Vue + Nginx，为什么还要 Node？
<!-- more -->

* Vue：只是一个 UI 层的框架，因此他打包出来的就是一套 UI 的静态文件：html + js-bundle
* Nginx：反向服务器，并不提供逻辑处理，只做譬如负载均衡、流量控制、静态服务器等功能
* Node：运行在服务端的 JavaScript

vue 对 node 的服务端渲染支持最好（反过来说就不准确了）

## NodeJS的核心优势
* 服务端渲染-SSR（Server Side Rendering）
* 鉴权
* 接口聚合

Node要避免一些高CPU开销的功能

![](https://pic4.zhimg.com/80/v2-4bc69c4ff1594d1ff4a55d93c78ea55c_1440w.jpg?source=1940ef5c)




