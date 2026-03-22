# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

MoneyJar 是一个使用 Kotlin 和 Jetpack Compose 构建的 Android 应用程序。

## 常用命令

### 构建
```bash
./gradlew build
```

### 清理构建
```bash
./gradlew clean
```

### 安装 Debug APK 到连接的设备
```bash
./gradlew installDebug
```

### 运行单元测试
```bash
./gradlew test
```

### 运行特定单元测试类
```bash
./gradlew test --tests "com.example.moneyjar.ExampleUnitTest"
```

### 运行特定测试方法
```bash
./gradlew test --tests "com.example.moneyjar.ExampleUnitTest.addition_isCorrect"
```

### 运行 Instrumented 测试（需要连接 Android 设备或模拟器）
```bash
./gradlew connectedAndroidTest
```

### 生成 Release 构建
```bash
./gradlew assembleRelease
```

## 项目架构

### 技术栈
- **语言**: Kotlin
- **UI 框架**: Jetpack Compose with Material3
- **构建工具**: Gradle with Kotlin DSL
- **最低 SDK**: API 24
- **目标 SDK**: API 36

### 代码结构
- `app/src/main/java/com/example/moneyjar/` - 主要应用代码
  - `MainActivity.kt` - 应用入口 Activity
  - `ui/theme/` - Compose 主题配置（颜色、排版、主题）

### 依赖管理
项目使用 `gradle/libs.versions.toml` 进行版本目录管理。所有依赖版本和插件版本都应在此文件中定义。

### Compose 架构
- `MoneyJarTheme` - 应用主题，支持动态色彩（Android 12+）
- Material3 是 UI 组件库
- 使用 `enableEdgeToEdge()` 启用边缘到边缘布局

## 语音转文字（STT）方案

项目使用 **ML Kit Speech Recognition** 实现语音识别功能。

### ML Kit Speech Recognition 依赖

在 `gradle/libs.versions.toml` 中添加：

```toml
[versions]
# ... 现有版本 ...
mlkit-speech = "16.1.3"

[libraries]
# ... 现有库 ...
mlkit-speech = { group = "com.google.mlkit", name = "speech", version.ref = "mlkit-speech" }
```

在 `app/build.gradle.kts` 中添加依赖：

```kotlin
dependencies {
    // ... 现有依赖 ...
    implementation(libs.mlkit.speech)
}
```

### 使用要点

- ML Kit Speech Recognition 支持多种语言，需要在识别器中指定语言（如 "zh-CN" 表示简体中文）
- 使用 `SpeechRecognizer` API 进行语音识别
- 需要在运行时请求录音权限（`RECORD_AUDIO`）
- 识别结果通过回调返回，支持连续识别和部分结果
