# Android 签名密钥说明

## 重要文件（请妥善保管！）

### 1. 签名密钥文件
- **文件位置**: `android/app/release.keystore`
- **用途**: 用于签名所有生产版本的 APK
- **重要性**: ⚠️ 极其重要！丢失后无法更新 APP

### 2. 密钥配置文件
- **文件位置**: `android/keystore.properties`
- **内容**: 包含密钥密码和别名
- **安全性**: 🔒 不要提交到 Git

## 密钥信息

```
密钥别名 (keyAlias): qa-app-release
密钥密码 (keyPassword): qaapp2024secure
密钥库密码 (storePassword): qaapp2024secure
有效期: 10000 天（约 27 年）
算法: RSA 2048 位
```

## 备份建议

请立即备份以下文件到安全位置：
1. `android/app/release.keystore` - 签名密钥文件
2. `android/keystore.properties` - 配置文件
3. 记录密码: `qaapp2024secure`

建议备份位置：
- 云盘（加密）
- U盘（多个备份）
- 密码管理器
- 公司服务器（加密存储）

## 使用说明

### 构建生产版本
```bash
cd android
./gradlew assembleRelease
```

生成的 APK 位置：
```
android/app/build/outputs/apk/release/app-release.apk
```

### 查看签名信息
```bash
keytool -list -v -keystore android/app/release.keystore -alias qa-app-release
# 密码: qaapp2024secure
```

## 注意事项

⚠️ **极其重要**：
- 这个密钥文件是唯一的，丢失后无法恢复
- 如果丢失，所有用户必须卸载重装才能更新
- 不要修改密码或重新生成密钥
- 不要将密钥文件提交到 Git 仓库

✅ **已配置**：
- `.gitignore` 已配置，不会提交敏感文件
- `build.gradle` 已配置使用生产签名
- 密钥有效期 27 年，足够长期使用

## 团队协作

如果需要在其他电脑构建：
1. 复制 `release.keystore` 到新电脑的 `android/app/` 目录
2. 复制 `keystore.properties` 到新电脑的 `android/` 目录
3. 确保密码正确
4. 即可在新电脑构建

## 紧急情况

如果密钥丢失：
1. 无法发布覆盖更新
2. 必须使用新密钥重新发布
3. 所有用户需要卸载重装
4. 建议更改包名重新上架

---

**生成时间**: 2026-04-01
**生成者**: Kiro AI Assistant
