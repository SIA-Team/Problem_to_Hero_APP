# Release APK 构建完整指南

## 🚀 快速开始

### 一键构建

```bash
build-release-apk.bat
```

**预计时间**：10-15 分钟

---

## 📋 构建步骤详解

### 步骤 1：清理旧文件

```bash
cd android
./gradlew clean
cd ..
```

**作用**：
- 删除旧的编译文件
- 确保使用最新配置
- 避免缓存问题

---

### 步骤 2：重新预构建

```bash
npx expo prebuild --clean --platform android
```

**作用**：
- 应用 `app.json` 中的配置
- 应用 `AndroidManifest.xml` 的权限
- 生成最新的原生代码

**重要**：这一步会应用我们修复的权限配置！

---

### 步骤 3：构建 Release APK

```bash
cd android
./gradlew assembleRelease
cd ..
```

**作用**：
- 编译 Release 版本
- 优化代码
- 生成签名的 APK

**时间**：5-10 分钟（首次更久）

---

### 步骤 4：找到 APK

**位置**：
```
android/app/build/outputs/apk/release/app-release.apk
```

**大小**：约 50-80 MB

---

## 🔍 验证构建

### 检查 APK 信息

```bash
# 查看 APK 的 targetSdkVersion
aapt dump badging android/app/build/outputs/apk/release/app-release.apk | findstr "targetSdkVersion"

# 查看权限
aapt dump badging android/app/build/outputs/apk/release/app-release.apk | findstr "permission"
```

**应该看到**：
```
targetSdkVersion:'35'
uses-permission: name='android.permission.POST_NOTIFICATIONS'
uses-permission: name='android.permission.READ_MEDIA_IMAGES'
uses-permission: name='android.permission.READ_MEDIA_VIDEO'
uses-permission: name='android.permission.READ_MEDIA_AUDIO'
...
```

---

## 📱 安装测试

### 方法 1：通过 adb 安装

```bash
# 连接设备
adb devices

# 安装 APK
adb install -r android/app/build/outputs/apk/release/app-release.apk

# 查看日志
adb logcat | findstr "com.qa.app"
```

---

### 方法 2：直接传输

1. 将 APK 复制到手机
2. 在手机上打开文件管理器
3. 点击 APK 安装
4. 允许"安装未知来源应用"

---

## ✅ 测试清单

### 基础测试

- [ ] 应用正常启动（不闪退）
- [ ] 首页正常显示
- [ ] Tab 切换正常
- [ ] 搜索功能正常
- [ ] 通知功能正常

### 权限测试

- [ ] 相机权限请求正常
- [ ] 相册权限请求正常
- [ ] 位置权限请求正常
- [ ] 通知权限请求正常

### 功能测试

- [ ] 登录/注册
- [ ] 发布问题
- [ ] 回答问题
- [ ] 图片上传
- [ ] 个人资料编辑

### 兼容性测试

- [ ] Android 15 设备测试
- [ ] Android 16 设备测试（如果有）
- [ ] 不同品牌手机测试

---

## 🐛 常见问题

### 问题 1：构建失败

**错误信息**：
```
FAILURE: Build failed with an exception.
```

**解决方案**：
1. 检查 Java 版本（需要 JDK 17）
2. 清理缓存：`./gradlew clean`
3. 删除 `node_modules` 重新安装

---

### 问题 2：找不到 APK

**原因**：构建失败但没有报错

**解决方案**：
```bash
# 查看详细日志
cd android
./gradlew assembleRelease --stacktrace
```

---

### 问题 3：安装失败

**错误信息**：
```
INSTALL_FAILED_UPDATE_INCOMPATIBLE
```

**解决方案**：
```bash
# 卸载旧版本
adb uninstall com.qa.app

# 重新安装
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

---

### 问题 4：签名问题

**错误信息**：
```
Keystore file not found
```

**解决方案**：
检查 `android/app/build.gradle` 中的签名配置：

```gradle
signingConfigs {
    release {
        if (keystorePropertiesFile.exists() && keystoreProperties['storeFile']) {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        } else {
            // 使用 debug keystore（仅用于测试）
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
}
```

---

## 📊 构建配置检查

### 当前配置

**SDK 版本**：
```gradle
minSdkVersion = 24
compileSdkVersion = 36
targetSdkVersion = 35
```

**权限**（AndroidManifest.xml）：
- ✅ POST_NOTIFICATIONS
- ✅ READ_MEDIA_IMAGES
- ✅ READ_MEDIA_VIDEO
- ✅ READ_MEDIA_AUDIO
- ✅ ACCESS_NETWORK_STATE
- ✅ CAMERA
- ✅ ACCESS_FINE_LOCATION
- ✅ ACCESS_COARSE_LOCATION

**Hermes**：
```properties
hermesEnabled=true
```

---

## 🎯 构建优化

### 减小 APK 大小

**方法 1：启用 ProGuard**

```gradle
// android/app/build.gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
    }
}
```

**效果**：减小 30-50%

---

**方法 2：分架构构建**

```bash
# 只构建 arm64-v8a（大多数现代设备）
cd android
./gradlew assembleRelease -Preact.native.architecture=arm64-v8a
```

**效果**：减小 50-60%

---

### 加快构建速度

**方法 1：使用 Gradle 缓存**

```properties
# android/gradle.properties
org.gradle.caching=true
org.gradle.parallel=true
org.gradle.daemon=true
```

---

**方法 2：增加内存**

```properties
# android/gradle.properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

---

## 📦 分发 APK

### 方法 1：直接分发

1. 将 APK 上传到云盘
2. 分享下载链接
3. 用户下载安装

**优点**：
- ✅ 快速
- ✅ 简单

**缺点**：
- ⚠️ 需要允许"未知来源"
- ⚠️ 无法自动更新

---

### 方法 2：Google Play

1. 构建 AAB（不是 APK）
2. 上传到 Google Play Console
3. 发布

**优点**：
- ✅ 自动更新
- ✅ 更安全
- ✅ 更小的下载大小

**缺点**：
- ⚠️ 需要开发者账号（$25）
- ⚠️ 审核时间（1-3 天）

---

### 方法 3：第三方平台

- 蒲公英（pgyer.com）
- fir.im
- 应用宝

**优点**：
- ✅ 快速分发
- ✅ 下载统计
- ✅ 版本管理

---

## 🔄 版本管理

### 更新版本号

**修改 `app.json`**：

```json
{
  "expo": {
    "version": "1.0.1",  // 从 1.0.0 改为 1.0.1
    "android": {
      "versionCode": 2   // 从 1 改为 2（必须递增）
    }
  }
}
```

**或修改 `android/app/build.gradle`**：

```gradle
defaultConfig {
    versionCode 2        // 从 1 改为 2
    versionName "1.0.1"  // 从 1.0.0 改为 1.0.1
}
```

---

## 📝 构建日志

### 保存构建日志

```bash
cd android
./gradlew assembleRelease > build.log 2>&1
cd ..
```

### 查看日志

```bash
type android\build.log
```

---

## 🎉 构建成功后

### 1. 重命名 APK

```bash
copy android\app\build\outputs\apk\release\app-release.apk qa-app-v1.0.1-release.apk
```

### 2. 记录信息

创建 `RELEASE_NOTES.md`：

```markdown
# Version 1.0.1

## 发布日期
2026-03-10

## 修复内容
- 修复 Android 15/16 闪退问题
- 添加必需的权限配置
- 更新 SDK 版本

## 测试设备
- Android 15 模拟器 ✅
- Android 16 模拟器 ✅

## APK 信息
- 文件名：qa-app-v1.0.1-release.apk
- 大小：XX MB
- MD5：XXXXXXXX
```

### 3. 分发给用户

---

## 🚀 下次构建

### 快速构建（如果没有配置变化）

```bash
cd android
./gradlew assembleRelease
cd ..
```

**时间**：2-3 分钟

---

### 完整构建（如果有配置变化）

```bash
build-release-apk.bat
```

**时间**：10-15 分钟

---

## 💡 最佳实践

### 1. 构建前检查

- [ ] 更新版本号
- [ ] 测试 Debug 版本
- [ ] 检查权限配置
- [ ] 检查签名配置

### 2. 构建后检查

- [ ] 验证 APK 大小
- [ ] 验证 targetSdkVersion
- [ ] 验证权限列表
- [ ] 在真机上测试

### 3. 分发前检查

- [ ] 所有功能测试通过
- [ ] 在多个设备上测试
- [ ] 记录版本信息
- [ ] 准备更新说明

---

## 🎯 总结

**构建命令**：
```bash
build-release-apk.bat
```

**APK 位置**：
```
android/app/build/outputs/apk/release/app-release.apk
```

**测试重点**：
- ✅ Android 15/16 不闪退
- ✅ 所有权限正常
- ✅ 核心功能正常

**下一步**：
1. 构建 APK
2. 测试验证
3. 分发给用户

---

**准备好了吗？运行 `build-release-apk.bat` 开始构建！** 🚀
