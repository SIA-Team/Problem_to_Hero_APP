# Android 闪退问题排查指南

## 🔍 问题描述

**环境**：
- 模拟器：API 35 "VanillaIceCream"
- 系统：Android 15.0
- 现象：APK 安装后闪退

---

## 🎯 常见原因和解决方案

### 原因 1：权限问题（最常见）⭐⭐⭐⭐⭐

#### 问题
Android 13+ (API 33+) 对权限要求更严格，特别是：
- 通知权限
- 存储权限
- 位置权限

#### 解决方案

**检查 AndroidManifest.xml**：

```bash
# 查看当前权限配置
cat android/app/src/main/AndroidManifest.xml
```

**需要添加的权限**：

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- 网络权限 -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- 存储权限（Android 13+ 需要新权限）-->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" 
                     android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
                     android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    
    <!-- 相机权限 -->
    <uses-permission android:name="android.permission.CAMERA" />
    
    <!-- 通知权限（Android 13+ 必需）-->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <!-- 位置权限 -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    
    <!-- 允许 HTTP 请求（开发环境）-->
    <application
        android:usesCleartextTraffic="true"
        ...
    >
    </application>
</manifest>
```

---

### 原因 2：Hermes 引擎问题 ⭐⭐⭐⭐

#### 问题
Hermes 引擎在某些模拟器上可能不稳定

#### 解决方案

**方法 A：禁用 Hermes（快速测试）**

```properties
# android/gradle.properties
hermesEnabled=false
```

**方法 B：更新 Hermes 版本**

```bash
# 更新依赖
npm install react-native@latest
```

---

### 原因 3：64 位架构问题 ⭐⭐⭐

#### 问题
某些模拟器只支持 64 位架构

#### 解决方案

**检查架构配置**：

```gradle
// android/app/build.gradle
android {
    defaultConfig {
        ndk {
            abiFilters "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
        }
    }
}
```

**或在 gradle.properties 中**：

```properties
# android/gradle.properties
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
```

---

### 原因 4：ProGuard/R8 混淆问题 ⭐⭐⭐

#### 问题
Release 版本开启了代码混淆，导致某些类找不到

#### 解决方案

**检查混淆配置**：

```gradle
// android/app/build.gradle
buildTypes {
    release {
        minifyEnabled false  // 暂时禁用混淆
        shrinkResources false
    }
}
```

**或添加混淆规则**：

```proguard
# android/app/proguard-rules.pro

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Expo
-keep class expo.** { *; }

# 保留所有原生模块
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }
-keep class * extends com.facebook.react.bridge.NativeModule { *; }
```

---

### 原因 5：依赖冲突 ⭐⭐

#### 问题
某些库在 Android 15 上不兼容

#### 解决方案

**检查依赖版本**：

```bash
# 查看依赖树
cd android
./gradlew app:dependencies
```

**更新关键依赖**：

```bash
# 更新 Expo SDK
npx expo upgrade

# 更新 React Native
npm install react-native@latest
```

---

## 🔧 排查步骤

### 步骤 1：获取崩溃日志

**方法 A：使用 adb logcat**

```bash
# 连接模拟器
adb devices

# 清除旧日志
adb logcat -c

# 启动应用并查看日志
adb logcat | grep -E "AndroidRuntime|FATAL|ERROR"
```

**方法 B：使用 Android Studio**

1. 打开 Android Studio
2. 底部点击 "Logcat"
3. 筛选 "Error" 级别
4. 启动应用，查看错误信息

---

### 步骤 2：分析崩溃日志

**常见错误类型**：

#### 错误 1：权限被拒绝
```
FATAL EXCEPTION: main
java.lang.SecurityException: Permission denied
```

**解决**：添加缺失的权限到 AndroidManifest.xml

---

#### 错误 2：找不到类
```
FATAL EXCEPTION: main
java.lang.ClassNotFoundException: com.xxx.xxx
```

**解决**：
1. 检查 ProGuard 规则
2. 禁用代码混淆测试

---

#### 错误 3：内存不足
```
FATAL EXCEPTION: main
java.lang.OutOfMemoryError
```

**解决**：
```gradle
// android/app/build.gradle
android {
    dexOptions {
        javaMaxHeapSize "4g"
    }
}
```

---

#### 错误 4：Hermes 崩溃
```
FATAL EXCEPTION: main
com.facebook.hermes.unicode.JSRuntimeException
```

**解决**：禁用 Hermes 或更新版本

---

### 步骤 3：创建测试版本

**创建 Debug 版本（更多日志）**：

```bash
# 清理
cd android
./gradlew clean
cd ..

# 构建 Debug 版本
npx expo run:android --variant debug
```

**Debug 版本特点**：
- ✅ 包含完整日志
- ✅ 不混淆代码
- ✅ 更容易排查问题

---

## 🚀 快速修复方案

### 方案 1：最小化配置（推荐）

**1. 禁用 Hermes**
```properties
# android/gradle.properties
hermesEnabled=false
```

**2. 禁用混淆**
```gradle
// android/app/build.gradle
buildTypes {
    release {
        minifyEnabled false
        shrinkResources false
    }
}
```

**3. 添加所有权限**
```xml
<!-- AndroidManifest.xml -->
<!-- 添加上面列出的所有权限 -->
```

**4. 重新构建**
```bash
cd android
./gradlew clean
cd ..
npx expo run:android --variant release
```

---

### 方案 2：使用 EAS Build（推荐）

```bash
# 使用 EAS Build 构建
eas build --profile production --platform android

# EAS 会自动处理：
# ✅ 正确的权限配置
# ✅ 正确的签名
# ✅ 正确的混淆规则
# ✅ 兼容性检查
```

---

## 📝 检查清单

### 构建前检查

- [ ] AndroidManifest.xml 包含所有必需权限
- [ ] targetSdkVersion = 35
- [ ] compileSdkVersion = 36
- [ ] 禁用混淆（测试时）
- [ ] 包含所有架构（armeabi-v7a, arm64-v8a, x86, x86_64）

### 测试检查

- [ ] 在真机上测试
- [ ] 在模拟器上测试
- [ ] 检查崩溃日志
- [ ] 测试所有核心功能

---

## 🎯 针对你的情况

### 当前配置

```gradle
// 你的配置
targetSdkVersion = 35
compileSdkVersion = 36
```

### 可能的问题

1. **权限不足** ⭐⭐⭐⭐⭐
   - Android 15 对权限要求严格
   - 需要添加 POST_NOTIFICATIONS 等新权限

2. **Hermes 问题** ⭐⭐⭐⭐
   - 模拟器可能不支持 Hermes
   - 尝试禁用 Hermes

3. **混淆问题** ⭐⭐⭐
   - Release 版本可能混淆了关键代码
   - 尝试禁用混淆

---

## 🔍 立即排查

### 命令 1：获取崩溃日志

```bash
# 清除旧日志
adb logcat -c

# 安装 APK
adb install -r your-app.apk

# 启动应用（会自动打开）
# 或手动打开应用

# 查看崩溃日志
adb logcat | grep -E "FATAL|AndroidRuntime"
```

### 命令 2：检查权限

```bash
# 查看 AndroidManifest.xml
cat android/app/src/main/AndroidManifest.xml | grep "permission"
```

### 命令 3：检查 Hermes

```bash
# 查看 Hermes 配置
cat android/gradle.properties | grep "hermes"
```

---

## 💡 我的建议

### 立即执行（5 分钟）

1. **获取崩溃日志**
```bash
adb logcat -c
adb install -r your-app.apk
# 打开应用
adb logcat | grep -E "FATAL|AndroidRuntime" > crash.log
```

2. **发送日志给我**
   - 把 crash.log 的内容发给我
   - 我可以精确定位问题

### 快速修复（30 分钟）

如果无法获取日志，尝试：

1. **禁用 Hermes**
```properties
# android/gradle.properties
hermesEnabled=false
```

2. **禁用混淆**
```gradle
// android/app/build.gradle
minifyEnabled false
```

3. **重新构建**
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

---

## 🚨 紧急解决方案

如果上述方法都不行，使用这个"万能"配置：

```gradle
// android/app/build.gradle
android {
    compileSdkVersion 36
    
    defaultConfig {
        minSdkVersion 24
        targetSdkVersion 35
        
        // 包含所有架构
        ndk {
            abiFilters "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
        }
    }
    
    buildTypes {
        release {
            // 禁用所有优化
            minifyEnabled false
            shrinkResources false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

```properties
# android/gradle.properties
hermesEnabled=false
android.enableJetifier=true
android.useAndroidX=true
```

---

**现在最重要的是获取崩溃日志！请运行上面的 adb logcat 命令，把日志发给我，我可以精确定位问题。** 🔍
