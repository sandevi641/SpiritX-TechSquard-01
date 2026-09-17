# SecureConnect 🚀

SecureConnect is an enterprise-grade full-stack user authentication and security telemetry dashboard featuring **bcrypt** salted encryption, **Two-Factor Authentication (2FA / OTP)**, **brute-force rate limiting protection**, **interactive strong password generation**, **security audit logging & export**, and a multi-tab glassmorphic dashboard.

---

## Advanced Features ✨

### 1. Two-Factor Authentication (2FA / OTP Flow) 🔐
- **2-Step Verification**: Enable 2FA from your dashboard to challenge logins with a 6-digit verification code.
- **Interactive OTP Code Assist**: Built-in 6-digit digit input auto-advance, paste detection, and one-click demo code assistant.

### 2. Brute-Force Shield & Rate Limiting 🛡️
- **Automatic Lockout**: Consecutive failed authentication attempts trigger a 60-second lockout shield with a live countdown timer banner.
- **Audit Tracking**: Every failed and blocked attempt is recorded in the security audit trail.

### 3. Integrated Strong Password Generator ⚡
- **One-Click Password Generation**: Built-in modal generator with custom length (8–32 chars) and character filters (uppercase, lowercase, numbers, symbols).
- **Auto-Fill & Verification**: Injects generated password into both fields and triggers the live strength meter instantly.

### 4. Multi-Tab Enterprise Dashboard 📊
- **Tab 1: Overview & Telemetry**:
  - Live system uptime clock and memory consumption gauge.
  - Total registered users counter and database engine status.
  - Interactive server ping test with round-trip latency (ms).
- **Tab 2: Security & Profile Center**:
  - Customize Display Name, Bio, and choose from 5 vibrant Avatar Gradients.
  - Change Password with current password verification and live complexity meter.
  - Toggle Two-Factor Authentication on/off in real-time.
- **Tab 3: Security Audit Log**:
  - Real-time audit history of events (`USER_SIGNUP`, `USER_LOGIN_SUCCESS`, `USER_LOCKOUT`, `PASSWORD_CHANGED`, `2FA_VERIFICATION_SUCCESS`).
  - One-click **Export to JSON** for compliance reporting.
- **Tab 4: Active Devices & Session Manager**:
  - View authorized devices, IP addresses, operating systems, and last active timestamps.
  - Remotely revoke secondary device sessions.

### 5. Resilient Dual-Database Architecture 🗄️
- Automatically connects to **MySQL** using credentials in `.env`.
- Automatically fails over to persistent JSON storage (`data/users.json` and `data/audit_logs.json`) if MySQL is offline.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Edit `.env` to configure your MySQL settings (if using MySQL):
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=secureconnect
PORT=3000
```

### 3. Start the Server
```bash
npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```
