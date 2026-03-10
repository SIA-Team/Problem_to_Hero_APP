# Android 16 兼容性升级说明

## 📱 问题描述

用户反馈应用在 Android 16 设备上无法正常运行。

---

## ✅ 已完成的升级

### 1. 更新 SDK 版本

**修改文件**：`android/build.gradle`

```gradle
// 之前
compileSdkVersion = 35
targetSdkVersion = 35

// 现在
compileSdkVersion = 36  // 支持 Android 16
targetSdkVersion = 36   // 支持 Android 16
```

### 2. 更新权限配置

**修改文件**：`app.json`

新增了 Android 13+ 需要的媒体权限：
- `READ_MEDIA_IMAGES` - 读取图片
- `READ_MEDIA_VIDEO` - 读取视频
- `READ_MEDIA_AUDIO` - 读取音频
- `POST_NOTIFICATIONS` - 推送通知
- `ACCESS_FINE_LOCATION` - 精确位置
- `ACCESS_COARSE_LOCATION` - 粗略位置

### 3. 创建 gradle.properties

**新建文件**：`android/gradle.properties`

配置了完整的构建参数，确保兼容性。

---

## 🚀 如何应用升级

### 方法 1：重新构建（推荐）

```bash
# 1. 清理旧的构建文件
cd android
./gradlew clean
cd ..

# 2. 重新预构建
npx expo prebuild --clean

# 3. 构建新的 APK
npx expo run:android
```

### 方法 2：使用 EAS Build

```bash
# 构建新版本
eas build --profile production --platform android
```

---

## 📊 兼容性对比

| 项目 | 升级前 | 升级后 |
|------|--------|--------|
| **minSdkVersion** | 24 (Android 7.0) | 24 (Android 7.0) |
| **targetSdkVersion** | 35 (Android 15) | 36 (Android 16) ✅ |
| **compileSdkVersion** | 35 (Android 15) | 36 (Android 16) ✅ |
| **支持设备** | Android 7.0 - 15 | Android 7.0 - 16 ✅ |

---

## ⚠️ 注意事项

### 1. Android SDK 要求

确保你的开发环境安装了 Android SDK 36：

```bash
# 使用 Android Studio SDK Manager 安装
# 或使用命令行
sdkmanager "platforms;android-36"
sdkmanager "build-tools;35.0.0"
```

### 2. 权限变化

Android 13+ (API 33+) 对存储权限进行了重大改变：
- ❌ `READ_EXTERNAL_STORAGE` - 已弃用
- ✅ `READ_MEDIA_IMAGES` - 新的图片权限
- ✅ `READ_MEDIA_VIDEO` - 新的视频权限
- ✅ `READ_MEDIA_AUDIO` - 新的音频权限

你的应用现在同时声明了新旧权限，确保在所有 Android 版本上都能正常工作。

### 3. 通知权限

Android 13+ 需要显式请求通知权限：
- ✅ 已添加 `POST_NOTIFICATIONS` 权限
- 📝 需要在代码中动态请求权限（如果还没有）

---

## 🔍 验证升级

### 1. 检查构建配置

```bash
# 查看当前配置
cd android
./gradlew app:dependencies
```

### 2. 在 Android 16 设备上测试

1. 安装新构建的 APK
2. 测试所有核心功能：
   - ✅ 相机拍照
   - ✅ 图片选择
   - ✅ 通知推送
   - ✅ 位置服务
   - ✅ 网络请求

### 3. 检查权限

在 Android 16 设备上：
1. 打开应用
2. 进入系统设置 → 应用 → Problem to Hero → 权限
3. 确认所有需要的权限都已列出

---

## 🐛 常见问题

### Q1: 构建失败，提示找不到 SDK 36

**解决方案**：
```bash
# 安装 Android SDK 36
sdkmanager "platforms;android-36"

# 或在 Android Studio 中
# Tools → SDK Manager → SDK Platforms → 勾选 Android 16 (API 36)
```

### Q2: 权限请求不工作

**解决方案**：
检查代码中是否正确请求了运行时权限。Android 6.0+ 需要动态请求危险权限。

示例代码：
```javascript
import { PermissionsAndroid, Platform } from 'react-native';

async function requestCameraPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 23) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: '相机权限',
        message: '应用需要访问您的相机',
        buttonPositive: '允许',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}
```

### Q3: 应用在 Android 16 上崩溃

**可能原因**：
1. 使用了已弃用的 API
2. 权限配置不正确
3. 第三方库不兼容

**解决方案**：
1. 查看崩溃日志：`adb logcat`
2. 更新所有依赖到最新版本
3. 检查是否使用了已弃用的 API

---

## 📝 后续建议

### 1. 更新依赖

定期更新项目依赖，确保兼容最新的 Android 版本：

```bash
# 检查过期的包
npm outdated

# 更新 Expo SDK
npx expo upgrade
```

### 2. 测试覆盖

在以下 Android 版本上测试：
- ✅ Android 7.0 (API 24) - 最低支持版本
- ✅ Android 10 (API 29) - 存储权限变化
- ✅ Android 11 (API 30) - 作用域存储
- ✅ Android 13 (API 33) - 媒体权限变化
- ✅ Android 16 (API 36) - 最新版本

### 3. 持续集成

在 CI/CD 中添加多版本测试：
```yaml
# .github/workflows/android-test.yml
matrix:
  api-level: [24, 29, 30, 33, 36]
```

---

## 🎯 升级完成检查清单

- [x] 更新 `compileSdkVersion` 到 36
- [x] 更新 `targetSdkVersion` 到 36
- [x] 添加新的媒体权限
- [x] 添加通知权限
- [x] 创建 `gradle.properties` 配置
- [ ] 清理并重新构建项目
- [ ] 在 Android 16 设备上测试
- [ ] 验证所有权限正常工作
- [ ] 发布新版本到用户

---

## 📞 需要帮助？

如果升级后仍有问题，请提供：
1. 完整的错误日志（`adb logcat`）
2. Android 版本和设备型号
3. 具体的问题描述

---

**升级完成后，你的应用将完全支持 Android 16！** 🎉
