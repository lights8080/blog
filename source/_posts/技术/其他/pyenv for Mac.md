---
title: "pyenv for Mac"
date: 2021-06-18
categories:
- 技术
tags:
- Python
- for Mac
---
pyenv for mac安装说明
<!-- more -->


## 安装

```sh
brew install pyenv
# pyenv管理的Python命令目录添加到$PATH
echo 'eval "$(pyenv init --path)"' >> ~/.bash_profile
```

## 命令

```sh
# 安装指定python版本
pyenv install 3.6.9

# 查看安装的python版本
pyenv versions

# 设置全局python版本
pyenv global 3.5.2

# 为本地环境设置python版本，覆盖global
pyenv local 3.6.9

# 为当前shell会话设置python版本，覆盖local
pyenv shell 3.6.9

# 取消设置
pyenv local --unset

```

## 参考

https://github.com/pyenv/pyenv#homebrew-on-macos
https://github.com/pyenv/pyenv/blob/master/COMMANDS.md#command-reference


