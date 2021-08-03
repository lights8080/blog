---
title: Maven学习笔记
categories:
  - 技术
tags:
  - Java
  - Maven
abbrlink: be02a930
date: 2021-06-24 00:00:00
---

依赖范围、依赖原则、Maven插件和生命周期、插件说明、Maven模板、Maven生成archetype项目

<!-- more -->

## 依赖范围
Maven在编译、测试、运行环境下都需要独立的一套classpath。
* compile：（默认）编译依赖范围，对于编译、测试、运行三种classpath都有效。典型的是spring-core，三种环境都使用。
* test：测试依赖范围，只对于测试classpath有效。典型的是Junit，测试时使用。
* provided：已提供依赖范围，对于编译和测试classpath有效。典型的是servlet-api，容器已提供。
* runtime：运行时依赖范围，对于测试和运行classpath有效。典型的是JDBC驱动实现，编译时JDK提供了JDBC接口。
* system：系统依赖范围，往往与本地系统绑定，造成不可移植性，谨慎使用。

## 依赖原则
传递性依赖：A项目--依赖于-->B项目--依赖于-->C项目。A项目对于C项目是传递性依赖。
依赖调解：A-->B-->C-->X(1.0)，A-->D-->X(2.0)。传递性依赖有可能造成依赖问题。这时候依赖路径上有两个X版本，该依赖那条路径下的X项目呢？路径选择原则，第一原则：路径最近者优先，第二原则：第一声明者优先。
可选依赖：A-->B，B-->X(可选)，B-->Y(可选)。可选依赖只会对当前项目B产生影响，依赖不会被传递，A不会有任何影响。例如：X为mysql驱动包，Y为oracle驱动包，这种情况只能依赖一种数据库驱动包。POM代码：<optional>true</optional>。推荐采用单一职责原则。为mysql和oracle分别建立Maven项目。就不存在可选依赖了。

## Maven插件和生命周期
Maven插件执行详解：
* maven-clean-plugin:2.5:clean (default-clean)   删除target目录
* maven-resources-plugin:2.6:resources (default-resources)    拷贝主程序配置文件到target/classes目录
* maven-compiler-plugin:2.5.1:compile (default-compile)    编译主程序目录java文件到target/classes目录
* maven-resources-plugin:2.6:testResources (default-testResources)    拷贝测试程序配置文件到target/classes目录
* maven-compiler-plugin:2.5.1:testCompile (default-testCompile)    编译测试程序目录java文件到target/classes目录
* maven-surefire-plugin:2.12.4:test (default-test)    运行测试用例
* maven-jar-plugin:2.4:jar (default-jar)    将项目主代码打包成jar文件（不包含测试程序和测试配置文件）
* maven-install-plugin:2.4:install (default-install)   将项目输出的jar文件安装到Maven本地仓库中

mvn命令执行过程：
* mvn clean   default-clean
* mvn compile   default-resources--> default-compile
* mvn test     mvn compile--> default-testResources--> default-testCompile--> default-test
* mvn package    mvn test--> default-jar
* mvn install   mvn package--> default-install
* mvn deploy   项目构建输出的构件部署到对应的远程仓库
* mvn clean install-U   强制让Maven检查更新
* mvn help:describe -Dplugin=compiler  获取插件compiler的描述信息
* mvn dependency:tree    获得项目依赖树

## 插件说明
1、设置源文件编码方式
2、解决资源文件的编码问题
3、配置多个源文件夹
4、打包source文件为jar文件
5、拷贝依赖的jar包到目录
6、生成源代码包
7、打包jar文件时，配置manifest文件，加入lib包的jar依赖
8、编译java文件使用依赖本地jar包
9、打war包配置项目webContext相对路径、排除文件
10、生成可执行jar文件1
11、生成可执行jar文件2
12、编译错误（错误: 不兼容的类型）增加配置
13、跳过测试

```xml
<!-- 解决资源文件的编码问题 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-resources-plugin</artifactId>
    <version>2.3</version>
    <configuration>
        <encoding>UTF-8</encoding>
    </configuration>
</plugin>
<!-- 打包source文件为jar文件 -->
<plugin>
    <artifactId>maven-source-plugin</artifactId>
    <version>2.1</version>
    <configuration>
        <attach>true</attach>
        <encoding>UTF-8</encoding>
    </configuration>
    <executions>
        <execution>
            <phase>compile</phase>
            <goals>
                <goal>jar</goal>
            </goals>
        </execution>
    </executions>
</plugin>
<!-- 拷贝依赖的jar包到目录 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-dependency-plugin</artifactId>
    <executions>
        <execution>
            <id>copy</id>
            <phase>package</phase>
            <goals>
                <goal>copy-dependencies</goal>
            </goals>
            <configuration>
                <outputDirectory>
                    ${project.build.directory}/dependency
                </outputDirectory>
                <includeScope>runtime</includeScope>
                <excludeScope>provided</excludeScope>
            </configuration>
        </execution>
    </executions>
</plugin>
<!-- 设置源文件编码方式 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <defaultLibBundleDir>lib</defaultLibBundleDir>
        <source>1.6</source>
        <target>1.6</target>
        <encoding>UTF-8</encoding>
    </configuration>
</plugin>
<!-- 打包jar文件时，配置manifest文件，加入lib包的jar依赖 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-jar-plugin</artifactId>
    <configuration>
        <archive>
            <manifest>
                <addClasspath>true</addClasspath>
                <classpathPrefix>lib/</classpathPrefix>
                <mainClass>.....MonitorMain</mainClass>
            </manifest>
        </archive>
    </configuration>
</plugin>
<!-- 配置多个源文件夹 -->
<plugin>
    <groupId>org.codehaus.mojo</groupId>
    <artifactId>build-helper-maven-plugin</artifactId>
    <executions>
        <execution>
            <phase>generate-sources</phase>
            <goals>
                <goal>add-source</goal>
            </goals>
            <configuration>
                <sources>
                    <source>src/utils</source>
                    <source>src/platform</source>
                </sources>
            </configuration>
        </execution>
    </executions>
</plugin>
<!-- 编译java文件使用依赖本地jar包 -->
<plugin>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <source>1.6</source>
        <target>1.6</target>
        <encoding>UTF-8</encoding>
        <compilerArguments>
            <extdirs>src\main\webapp\WEB-INF\lib或${basedir}/WebContent/WEB-INF/lib</extdirs>
        </compilerArguments>
    </configuration>
</plugin>
<!-- 打war包配置项目webContext相对路径、排除文件 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-war-plugin</artifactId>
    <version>2.4</version>
    <configuration>
        <!--包含空文件夹-->
        <includeEmptyDirectories>true</includeEmptyDirectories>
        <warSourceDirectory>WebContent</warSourceDirectory>
        <!-- 排除文件 -->
        <packagingExcludes>WEB-INF/classes/**/*.*,WEB-INF/lib/**/*</packagingExcludes>
        <!--将类文件打成jar包-->
        <archiveClasses>true</archiveClasses>
    </configuration>
</plugin>
<!-- 生成源代码包 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-source-plugin</artifactId>
    <version>2.1.1</version>
    <executions>
        <execution>
            <id>attach-sources</id>
            <phase>verify</phase>
            <goals>
                <goal>jar-no-fork</goal>
            </goals>
        </execution>
    </executions>
</plugin>
<!-- 生成可执行jar文件1 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-jar-plugin</artifactId>
    <configuration>
        <archive>
            <manifest>
                <addClasspath>true</addClasspath>
                <classpathPrefix>lib/</classpathPrefix>
                <mainClass>com.abc.ABCTest</mainClass><!-- 入口类名 -->
            </manifest>
        </archive>
    </configuration>
</plugin>
<!-- 生成可执行jar文件2   执行命令：mvn clean install -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-shade-plugin</artifactId>
    <version>1.2.1</version>
    <executions>
        <execution>
            <phase>package</phase>
            <goals>
                <goal>shade</goal>
            </goals>
            <configuration>
                <transformers>
                    <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                        <mainClass>com.lihp.mvnbook.helloworld.HelloWorld</mainClass>
                    </transformer>
                </transformers>
            </configuration>
        </execution>
    </executions>
</plugin>

<!-- 编译错误（错误: 不兼容的类型）增加配置 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <version>3.1</version>
    <configuration>
     <source>1.7</source>
     <target>1.7</target>
     <encoding>UTF-8</encoding>
     <compilerId>csharp</compilerId>
     <compilerArguments>
      <extdirs>${lib.dir}</extdirs>
     </compilerArguments>
    </configuration>
    <dependencies>
     <dependency>
      <groupId>org.codehaus.plexus</groupId>
      <artifactId>plexus-compiler-csharp</artifactId>
      <version>1.6</version>
     </dependency>
    </dependencies>
   </plugin>

<!-- 跳过测试 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <version>2.5</version>
    <configuration>
     <skipTests>true</skipTests>
    </configuration>
   </plugin>
```

## Maven模板
1. mvn archetype:crawl （创建本地模板库）

2. mvn archetype:generate（使用模板创建项目）
```
# groupId、artifactId、version - 为新建项目的定位信息
# archetypeGroupId、archetypeArtifactId、archetypeVersion - 为模板项目的定位信息
# archetypeCatalog=local 从本地仓库选取模板项目
mvn archetype:generate \
-DgroupId=com.lights \
-DartifactId=lights-order \
-Dversion=2.0.0 \
-DarchetypeCatalog=local \
-DarchetypeGroupId=com.lights \
-DarchetypeArtifactId=lights-springcloud-archetype \
-DarchetypeVersion=2.0.0 \
-DinteractiveMode=false
```

## Maven生成archetype项目

1. 进入工程目录执行命令： mvn archetype:create-from-project
2. 进入target/generated-sources/archetype
3. 编辑pom.xml，添加远程发布的Nexus地址
4. 执行命令：mvn deploy
5. 命令创建项目：mvn archetype:generate -DarchetypeCatalog=local

1. 前提配置~/.m2/settings.xml
```xml
    <server>
      <id>releases</id>
      <username>admin</username>
      <password>admin1212</password>
    </server>
    <server>
      <id>snapshots</id>
      <username>admin</username>
      <password>admin1212</password>
    </server>
```

2. 前提配置pom.xml
```xml
    <distributionManagement>
        <repository>
            <id>releases</id>
            <name>Internal Releases</name>
            <url>http://192.168.1.23:8081/nexus/content/repositories/releases</url>
        </repository>
        <snapshotRepository>
            <id>snapshots</id>
            <name>Internal Releases</name>
            <url>http://192.168.1.23:8081/nexus/content/repositories/snapshots</url>
        </snapshotRepository>
    </distributionManagement>
```