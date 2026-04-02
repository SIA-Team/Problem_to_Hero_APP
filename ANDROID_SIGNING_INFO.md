# Android 签名配置完成 ✅

## 配置摘要

已成功配置 Android 生产签名，现在可以构建正式版本的 APK。

### 签名信息
- **密钥别名**: qa-app-release
- **密码**: qaapp2024secure
- **SHA256 指纹**: 6F:D7:BE:92:E9:04:41:99:56:3E:1A:42:8B:3E:39:14:59:6D:EB:A3:80:9F:8C:BD:05:71:BD:7E:37:F0:64:09

### 文件位置
```
android/app/release.keystore          # 签名密钥（不要删除！）
android/keystore.properties           # 配置文件（不要提交到 Git）
android/KEYSTORE_README.md            # 详细说明文档
```

## 构建新版本

### 1. 清理旧的构建
```bash
cd android
./gradlew clean
```

### 2. 构建生产版本
```bash
./gradlew assembleRelease
```

### 3. 查找生成的 APK
```
android/app/build/outputs/apk/release/app-release.apk
```

## 重要提醒

### ⚠️ 第一次使用新签名
由于签名已更改，用户需要：
1. 卸载旧版本（debug 签名）
2. 安装新版本（生产签名）
3. **这是唯一一次需要卸载重装**

### ✅ 之后的所有更新
- 可以直接覆盖安装
- 用户数据不会丢失
- 无需卸载重装

## 版本号管理

更新版本号（在 `app.json` 中）：
```json
{
  "expo": {
    "version": "1.0.1",  // 升级版本号
    "android": {
      "versionCode": 2   // 增加构建号
    }
  }
}
```

## 备份清单

请立即备份以下文件：
- [ ] `android/app/release.keystore`
- [ ] `android/keystore.properties`
- [ ] 记录密码: `qaapp2024secure`

备份位置建议：
- 云盘（OneDrive、Google Drive、百度网盘等）
- U盘（至少 2 个备份）
- 密码管理器（1Password、LastPass 等）

## 下一步

1. **立即备份签名文件**（非常重要！）
2. 构建新的 APK
3. 通知用户需要卸载重装
4. 之后就可以无缝更新了

---

**配置时间**: 2026-04-01
**状态**: ✅ 已完成
