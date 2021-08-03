---
title: >-
  spring cloud gateway [DataBufferLimitException: Exceeded limit on max bytes to
  buffer : 262144]
categories:
  - 技术
tags:
  - SpringCloud
  - 线上问题
abbrlink: '178537e0'
date: 2021-02-04 00:00:00
---

> DataBufferLimitException: Exceeded limit on max bytes to buffer : 262144
> 问题背景、分析过程、解决办法

<!-- more -->

# 问题背景
线上环境spring cloud gateway偶尔遇到如下异常：
DataBufferLimitException: Exceeded limit on max bytes to buffer : 262144

问题的产生原因很容易查到，REST API接口请求数据超过256K，被网关拦截。正常我们加大缓冲区的配置即可，-1表示不限制。但是并没有解决问题，下面介绍我的分析过程和解决办法。
```yaml
spring:
  codec:
    max-in-memory-size: 1048576
```

**环境信息：**

Spring Boot 2.2.1.RELEASE

**异常信息：**
```
2021-02-04 15:39:33.014 [reactor-http-epoll-2] ERROR org.springframework.boot.autoconfigure.web.reactive.error.AbstractErrorWebExceptionHandler - [1513c08e-1]  500 Server Error for HTTP POST "/x-service/path"
org.springframework.core.io.buffer.DataBufferLimitException: Exceeded limit on max bytes to buffer : 262144
        at org.springframework.core.io.buffer.LimitedDataBufferList.raiseLimitException(LimitedDataBufferList.java:101)
        Suppressed: reactor.core.publisher.FluxOnAssembly$OnAssemblyException:
Error has been observed at the following site(s):
        |_ checkpoint ⇢ org.springframework.cloud.gateway.filter.WeightCalculatorWebFilter [DefaultWebFilterChain]
        |_ checkpoint ⇢ org.springframework.boot.actuate.metrics.web.reactive.server.MetricsWebFilter [DefaultWebFilterChain]
        |_ checkpoint ⇢ HTTP POST "/x-service/path" [ExceptionHandlingWebHandler]
Stack trace:
                at org.springframework.core.io.buffer.LimitedDataBufferList.raiseLimitException(LimitedDataBufferList.java:101)
                at org.springframework.core.io.buffer.LimitedDataBufferList.updateCount(LimitedDataBufferList.java:94)
                at org.springframework.core.io.buffer.LimitedDataBufferList.add(LimitedDataBufferList.java:59)
                at reactor.core.publisher.MonoCollect$CollectSubscriber.onNext(MonoCollect.java:124)
                at reactor.core.publisher.FluxMap$MapSubscriber.onNext(FluxMap.java:114)
                at reactor.core.publisher.FluxPeek$PeekSubscriber.onNext(FluxPeek.java:192)
                at reactor.core.publisher.FluxMap$MapSubscriber.onNext(FluxMap.java:114)
                at reactor.netty.channel.FluxReceive.onInboundNext(FluxReceive.java:331)
                at reactor.netty.channel.ChannelOperations.onInboundNext(ChannelOperations.java:352)
                at reactor.netty.http.server.HttpServerOperations.onInboundNext(HttpServerOperations.java:484)
...
```

# 分析过程
1. 定位异常触发点
org.springframework.core.io.buffer.LimitedDataBufferList.java
![file](https://img-blog.csdnimg.cn/img_convert/2d69e2a7a9b9670dc79299ffd6eb7c46.png)

2. 查找maxByteCount的设置代码
org.springframework.http.codec.support.BaseDefaultCodecs.java
![file](https://img-blog.csdnimg.cn/img_convert/09c7e1ac1e765ec4af4b3799a3ad1a61.png)

3. 经过调试发现，启动时初始化是正常的，配置此参数有效spring.codec.max-in-memory-size
4. 但业务调用的时候此参数接受值为null，配置并未生效
5. 继续查找调用源头发现，我们的自定义拦截器获取body信息，代码如下

```java
ServerRequest serverRequest = ServerRequest.create(exchange, HandlerStrategies.withDefaults().messageReaders());
```
6. 因为HandlerStrategies.withDefaults()是重新创建的对象，并未使用Spring注入的对象，造成配置不生效
7. 查看gateway的ModifyRequestBodyGatewayFilterFactory，使用注入的messageReaders即可
org.springframework.cloud.gateway.filter.factory.rewrite.ModifyRequestBodyGatewayFilterFactory.java
![file](https://img-blog.csdnimg.cn/img_convert/298d7425add55807919c628f0b2dadec.png)

# 解决办法
参考ModifyRequestBodyGatewayFilterFactory调整自定义拦截器，使用注入的配置类。
代码如下：

```java

@Component
@Slf4j
public class XXXFilter implements GlobalFilter, Ordered {
    @Autowired
    ServerCodecConfigurer codecConfigurer;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        try {
            if (request.getHeaders().getContentLength() > 0) {
                ServerRequest serverRequest = ServerRequest.create(exchange, codecConfigurer.getReaders());
                Mono<String> bodyToMono = serverRequest.bodyToMono(String.class);
                return bodyToMono.flatMap(reqBody -> {
                    if (isJson(reqBody)) {
                        String perms = JSONObject.parseObject(reqBody).getString("perms");
                        if (StringUtils.isNotEmpty(perms)) {
                            exchange.getAttributes().put(Constants.XXX_REQUEST_PERMS_ATTR, perms);
                        }
                    }
                    ServerHttpRequestDecorator requestDecorator = new ServerHttpRequestDecorator(exchange.getRequest()) {

                        @Override
                        public Flux<DataBuffer> getBody() {
                            NettyDataBufferFactory nettyDataBufferFactory = new NettyDataBufferFactory(ByteBufAllocator.DEFAULT);
                            DataBuffer bodyDataBuffer = nettyDataBufferFactory.wrap(reqBody.getBytes());
                            return Flux.just(bodyDataBuffer);
                        }
                    };
                    return chain.filter(exchange.mutate().request(requestDecorator).build());
                });
            }
            return chain.filter(exchange);
        } catch (Exception e) {
            log.error("Exception[XXXFilter]:", e);
            return chain.filter(exchange);
        }
    }
```
