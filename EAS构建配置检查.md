# EAS 构建配置检查

## 配置对比分析

### ✅ 已确认一致的配置

#### 1. 应用基本信息
- **应用名称**: Problem to Hero
- **包名**: com.qa.app
- **版本号**: 1.0.0
- **版本代码**: 1

#### 2. SDK 版本
- **compileSdkVersion**: 36
- **targetSdkVersion**: 35
- **minSdkVersion**: 24

#### 3. 权限配置
所有权限都在 `app.json` 中配置，EAS 构建会自动应用：
- ✅ CAMERA
- ✅ READ_EXTERNAL_STORAGE
- ✅ WRITE_EXTERNAL_STORAGE
- ✅ READ_MEDIA_IMAGES/VIDEO/AUDIO
- ✅ POST_NOTIFICATIONS
- ✅ ACCESS_FINE_LOCATION
- ✅ ACCESS_COARSE_LOCATION
- ✅ RECORD_AUDIO

#### 4. 网络配置
- ✅ usesCleartextTraffic: true（允许 HTTP 请求）

#### 5. 状态栏配置
- ✅ backgroundColor: #ffffff
- ✅ barStyle: dark-content

#### 6. 插件配置
- ✅ @react-native-community/datetimepicker
- ✅ expo-image-picker
- ✅ expo-camera
- ✅ expo-build-properties

### ⚠️ 需要注意的差异

#### 1. 签名密钥
**本地构建：**
- 使用 `keystore.properties` 中配置的密钥
- 或者使用 debug.keystore（如果没有配置）

**EAS 构建：**
- 首次构建时会自动生成新的密钥
- 或者使用你上传的密钥

**影响：**
- 如果使用不同的密钥，用户需要卸载旧版本才能安装新版本
- 建议：使用相同的密钥

#### 2. 构建优化
**本地构建：**
- minifyEnabled: 根据 gradle.properties 配置
- shrinkResources: 根据 gradle.properties 配置

**EAS 构建：**
- 默认启用所有优化
- 构建出的 APK 可能更小

### 🔧 需要配置的内容

#### 1. 使用相同的签名密钥（重要！）

如果你想让 EAS 构建的 APK 可以覆盖安装本地构建的 APK，需要使用相同的密钥。

**选项 A：让 EAS 生成新密钥（推荐）**
- 首次构建时 EAS 会自动生成
- 以后都使用这个密钥
- 用户需要卸载旧版本，安装新版本

**选项 B：上传现有密钥到 EAS**
```bash
# 如果你有 keystore.properties 中配置的密钥
eas credentials
```

#### 2. 确认 vector-icons 字体

你的本地构建配置了特定的字体：
```groovy
iconFontNames: [
    'FontAwesome5_Solid.ttf',
    'FontAwesome5_Regular.ttf',
    'FontAwesome5_Brands.ttf',
    'Ionicons.ttf'
]
```

EAS 构建会自动包含所有 vector-icons 字体，所以这个不是问题。

### 📋 构建前检查清单

- [x] app.json 配置正确
- [x] eas.json 配置正确
- [x] 权限配置一致
- [x] SDK 版本一致
- [x] 网络配置一致
- [ ] 决定签名密钥策略

### 🚀 推荐的构建策略

#### 方案 1：使用新密钥（最简单）

**优点：**
- 无需配置，直接构建
- EAS 自动管理密钥

**缺点：**
- 用户需要卸载旧版本
- 无法覆盖安装

**适用场景：**
- 测试阶段
- 用户数量少
- 可以接受重新安装

**操作：**
```bash
# 直接构建，EAS 会自动生成密钥
eas build --platform android --profile production
```

#### 方案 2：使用现有密钥（推荐生产环境）

**优点：**
- 可以覆盖安装
- 用户体验好

**缺点：**
- 需要配置密钥

**适用场景：**
- 生产环境
- 已有用户安装了旧版本
- 需要平滑升级

**操作：**
```bash
# 1. 上传密钥到 EAS
eas credentials

# 2. 选择 "Set up a new Android Keystore"
# 3. 上传你的 keystore 文件和密码

# 3. 构建
eas build --platform android --profile production
```

### 🎯 我的建议

**如果是第一次使用 EAS 构建：**
1. 使用方案 1（让 EAS 生成新密钥）
2. 通知用户卸载旧版本，安装新版本
3. 以后所有构建都使用这个密钥
4. 可以使用热更新，无需重新安装

**如果已有大量用户：**
1. 使用方案 2（上传现有密钥）
2. 用户可以直接覆盖安装
3. 无需卸载旧版本

### 📝 构建命令

```bash
# 检查登录状态
eas whoami

# 如果未登录
eas login

# 开始构建
eas build --platform android --profile production

# 构建过程中会询问：
# 1. 是否生成新密钥？选择 "Yes"（方案1）或 "No"（方案2）
# 2. 如果选择 No，需要上传现有密钥
```

### ⏱️ 预计时间

- **构建时间**: 10-20 分钟
- **下载时间**: 取决于网络速度
- **APK 大小**: 约 50-80 MB（比本地构建可能更小）

### 🔍 构建后验证

构建完成后，下载 APK 并测试：

1. **安装测试**
   - 在测试设备上安装
   - 检查是否能正常启动

2. **功能测试**
   - 测试所有主要功能
   - 检查权限是否正常
   - 测试网络请求

3. **热更新测试**
   - 修改一些代码
   - 运行 `eas update`
   - 重启 APP，检查是否更新

### ✅ 结论

你的配置已经准备好了，可以直接构建。主要区别只是签名密钥，建议：

**现在就构建（方案 1）：**
- 让 EAS 生成新密钥
- 用户卸载旧版本，安装新版本
- 以后可以使用热更新

**命令：**
```bash
eas build --platform android --profile production
```

构建完成后，你就可以使用 `eas update` 推送热更新了！
