# UnifyVault Android Production Release Pipeline (VPS-Independent)

This repository includes a completely automated, VPS-independent GitHub Actions CI/CD release workflow for UnifyVault Android.

даже agar VPS band ho jaye ya delete ho jaye, aap GitHub Actions ke through 100% cloud me naye signed APK build aur publish kar sakte hain.

---

## 1. Workflow Architecture & Triggers

- **Workflow File:** [`.github/workflows/android-release.yml`](.github/workflows/android-release.yml)
- **Automatic Release Trigger:** Pushing any Git tag matching `v*` (e.g. `v1.0.1`, `v1.1.0`, `v2.0.0`).
- **Manual Trigger (Dry-Run / Custom Version):** Go to GitHub repository -> **Actions** -> **Android Release Build & Publish** -> **Run workflow**.

---

## 2. Required GitHub Encrypted Secrets

To allow GitHub Actions to securely sign the release APK using the existing production signing identity, add the following secrets in:
👉 **GitHub Repository -> Settings -> Secrets and variables -> Actions -> New repository secret**

| Secret Name                 | Description                                           | Example / Source                                   |
| :-------------------------- | :---------------------------------------------------- | :------------------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | Base64-encoded string of `unifyvault-release-key.jks` | Output of `base64 -w 0 unifyvault-release-key.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | Password for the keystore                             | Password used when creating the keystore           |
| `ANDROID_KEY_ALIAS`         | Key alias name                                        | `unifyvault-key`                                   |
| `ANDROID_KEY_PASSWORD`      | Key password                                          | Password for the key alias                         |

> [!SECURITY]
> The workflow writes the keystore to a temporary protected location (`mktemp`) with `600` permissions only during the Gradle build step and immediately cleans up the directory (`rm -rf`) in the `always()` step. Keystores and passwords are never committed to git or exposed in workflow logs.

---

## 3. How to Extract `ANDROID_KEYSTORE_BASE64` from Keystore File

If you have `unifyvault-release-key.jks` on your machine, generate the base64 string:

### Linux / macOS:

```bash
base64 -w 0 unifyvault-release-key.jks > keystore_base64.txt
# Copy the entire content of keystore_base64.txt and paste as ANDROID_KEYSTORE_BASE64
```

### Windows (PowerShell):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("unifyvault-release-key.jks")) | Set-Content keystore_base64.txt
```

---

## 4. How to Create a New Release (e.g., `v1.0.1`)

When you are ready to ship an update:

1. **Commit your code changes:**

   ```bash
   git add .
   git commit -m "feat: release v1.0.1"
   git push origin main
   ```

2. **Tag the release and push the tag:**

   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

3. **What GitHub Actions will automatically do:**
   1. Checks out the code.
   2. Sets up Node.js 18, Java 17, and Android SDK (API 35, Build-Tools 35.0.0).
   3. Builds the Next.js production static export (`out`).
   4. Syncs Capacitor Android assets.
   5. Computes dynamic `versionName` (`1.0.1`) and `versionCode` (`10001`).
   6. Builds and signs `app-release.apk` with the production keystore.
   7. Verifies APK signature (`apksigner`) and package integrity (`xyz.unifyvault.app`).
   8. Computes SHA-256 checksum (`SHA256SUMS.txt`).
   9. Uploads build artifacts.
   10. Creates GitHub Release `v1.0.1` and attaches `app-release.apk` and `SHA256SUMS.txt`.

---

## 5. Versioning Strategy (`versionName` & `versionCode`)

To ensure smooth in-app updates and compatibility with Android OS and Google Play:

- **`versionName`**: Clean SemVer string (e.g. `1.0.1`).
- **`versionCode`**: Strictly increasing integer calculated using:
  $$\text{versionCode} = \text{MAJOR} \times 10000 + \text{MINOR} \times 100 + \text{PATCH}$$

| Git Tag  | Version Name | Version Code |
| :------- | :----------- | :----------- |
| `v1.0.0` | `1.0.0`      | `10000`      |
| `v1.0.1` | `1.0.1`      | `10001`      |
| `v1.1.0` | `1.1.0`      | `10100`      |
| `v2.0.0` | `2.0.0`      | `20000`      |

---

## 6. What Happens if the VPS Disappears?

Your entire release pipeline is **100% independent of the VPS**:

- Keystore identity is safely stored in GitHub Secrets.
- Builds run on standard GitHub-hosted Ubuntu runners.
- GitHub Releases are automatically published with direct download URLs:
  `https://github.com/DigiClums/UnifyVault-UV/releases/download/v1.0.1/app-release.apk`
- In-app auto-update checkers read from GitHub releases / static manifests without VPS backend dependencies.
