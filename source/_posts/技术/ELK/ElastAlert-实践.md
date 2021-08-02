---
title: "ElastAlert-实践"
date: 2021-06-17
categories:
- 技术
tags:
- ElastAlert
- ELK
---

<!-- more -->

## 基于Elastalert的二次开发

https://github.com/lights8080/elastalert forked from Yelp/elastalert

修改内容大致如下：
1. 修改报警及日志的日期格式为`%Y-%m-%d %H:%M:%S %Z`
2. 集成钉钉报警（支持At、secret认证），参考`example_rules/example_frequency_lights8080.yaml`
3. PercentageMatchRule，报警内容增加match_bucket_count字段
4. FrequencyRule，报警内容增加doc_count字段
5. requirements.txt改为elasticsearch==7.0.0
6. 优化日志

## 规则配置建议

* buffer_time与run_every参数设置相同

## 支持钉钉报警

1. 新增文件：elastalert_modules/dingtalk_alert.py
```python
#! /usr/bin/env python
# -*- coding: utf-8 -*-
"""
@author: xuyaoqiang,lights8080
@contact: xuyaoqiang@gmail.com
@date: 2017-09-14 17:35,2021-06-23
@version: 0.0.0
@license:
@copyright:

"""
import json
import requests
from elastalert.alerts import Alerter, DateTimeEncoder
from requests.exceptions import RequestException
from elastalert.util import EAException
import sys
import io
import time
import datetime
import hmac
import hashlib
import base64
import urllib

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

class DingTalkAlerter(Alerter):
    required_options = frozenset(['dingtalk_webhook', 'dingtalk_msgtype'])

    def __init__(self, rule):
        super(DingTalkAlerter, self).__init__(rule)
        self.dingtalk_webhook_url = self.rule['dingtalk_webhook']
        self.dingtalk_msgtype = self.rule.get('dingtalk_msgtype', 'text')
        self.dingtalk_isAtAll = self.rule.get('dingtalk_isAtAll', False)
        self.dingtalk_title = self.rule.get('dingtalk_title', '')
        self.dingtalk_atMobiles = self.rule.get('dingtalk_atMobiles', [])
        self.dingtalk_secret = self.rule.get('dingtalk_secret', '')

    def format_body(self, body):
        return body.encode('utf8')

    def alert(self, matches):
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json;charset=utf-8"
        }
        body = self.create_alert_body(matches)
        payload = {
            "msgtype": self.dingtalk_msgtype,
            "text": {
                "content": body
            },
            "at": {
                "isAtAll":False
            }
        }
        if len(self.dingtalk_atMobiles) > 0:
          payload["at"]["atMobiles"] = self.dingtalk_atMobiles

        url = self.dingtalk_webhook_url
        if len(self.dingtalk_secret) > 0:
            timestamp = round(time.time() * 1000)
            secret_enc = bytes(self.dingtalk_secret, encoding='utf8')
            string_to_sign = '{}\n{}'.format(timestamp, self.dingtalk_secret)
            string_to_sign_enc = bytes(string_to_sign, encoding='utf8')
            hmac_code = hmac.new(secret_enc, string_to_sign_enc, digestmod=hashlib.sha256).digest()
            sign = urllib.parse.quote(base64.b64encode(hmac_code))
            url = '{}&timestamp={}&sign={}'.format(self.dingtalk_webhook_url, timestamp, sign)

        try:
            response = requests.post(url,
                        data=json.dumps(payload, cls=DateTimeEncoder),
                        headers=headers)
            response.raise_for_status()
            print(response)
        except RequestException as e:
            raise EAException("Error request to Dingtalk: {0}".format(str(e)))

    def get_info(self):
        return {
            "type": "dingtalk",
            "dingtalk_webhook": self.dingtalk_webhook_url
        }
        pass
```

2. 修改规则

```yaml
alert:
- "elastalert_modules.dingtalk_alert.DingTalkAlerter"

dingtalk_webhook: "https://oapi.dingtalk.com/robot/send?access_token=token"
dingtalk_msgtype: "text"
dingtalk_secret: "secret"
dingtalk_atMobiles:
- "18610241024"
```

## 报警实践转换为本地时区

规则配置增强模块：
```yaml
match_enhancements:
- "elastalert.enhancements.TimeEnhancement"
```

修改前：
```
Example rule

At least 50 events occurred between 2021-06-18 19:55:24 CST and 2021-06-18 20:00:24 CST
@timestamp: 2021-06-18T12:00:24.768631Z
```

修改后：
```
Example rule

At least 50 events occurred between 2021-06-18 19:55:24 CST and 2021-06-18 20:00:24 CST

@timestamp: 2021-06-18 20:00:24 CST
```