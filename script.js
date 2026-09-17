/**
 * SecureConnect - Modern Client Logic, 2FA, Password Generator & Protection
 */

// Toast notification helper
function showToast(title, message, type = "info", duration = 4000) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === "success") {
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === "error") {
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
        ${iconSvg}
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-msg">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("removing");
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Theme Management
function initTheme() {
    const themeToggleBtn = document.getElementById("theme-toggle");
    const savedTheme = localStorage.getItem("sc_theme") || 
        (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            const isDark = document.body.classList.toggle("dark-mode");
            localStorage.setItem("sc_theme", isDark ? "dark" : "light");
        });
    }
}

// Tab Switching
function initTabs() {
    const tabLogin = document.getElementById("tab-login");
    const tabSignup = document.getElementById("tab-signup");
    const paneLogin = document.getElementById("pane-login");
    const paneSignup = document.getElementById("pane-signup");
    const switchToSignup = document.getElementById("switch-to-signup");
    const switchToLogin = document.getElementById("switch-to-login");

    function setActiveTab(tab) {
        if (tab === "login") {
            tabLogin.classList.add("active");
            tabSignup.classList.remove("active");
            paneLogin.classList.add("active");
            paneSignup.classList.remove("active");
        } else {
            tabSignup.classList.add("active");
            tabLogin.classList.remove("active");
            paneSignup.classList.add("active");
            paneLogin.classList.remove("active");
        }
    }

    if (tabLogin && tabSignup) {
        tabLogin.addEventListener("click", () => setActiveTab("login"));
        tabSignup.addEventListener("click", () => setActiveTab("signup"));
    }

    if (switchToSignup) {
        switchToSignup.addEventListener("click", (e) => {
            e.preventDefault();
            setActiveTab("signup");
        });
    }

    if (switchToLogin) {
        switchToLogin.addEventListener("click", (e) => {
            e.preventDefault();
            setActiveTab("login");
        });
    }
}

// Password Visibility Toggles
function initPasswordToggles() {
    document.querySelectorAll(".toggle-password").forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target");
            const input = document.getElementById(targetId);
            if (!input) return;

            if (input.type === "password") {
                input.type = "text";
                btn.classList.add("active");
            } else {
                input.type = "password";
                btn.classList.remove("active");
            }
        });
    });
}

// Password Strength Evaluation
function evaluatePassword(val) {
    const strengthBar = document.getElementById("strengthBar");
    const strengthLabel = document.getElementById("strengthLabel");
    const reqLength = document.getElementById("req-length");
    const reqUpper = document.getElementById("req-upper");
    const reqLower = document.getElementById("req-lower");
    const reqNumSym = document.getElementById("req-num-sym");

    if (!strengthBar || !strengthLabel) return;

    const hasLength = val.length >= 8;
    const hasUpper = /[A-Z]/.test(val);
    const hasLower = /[a-z]/.test(val);
    const hasNumOrSym = /[\d\W_]/.test(val);

    function updateReq(element, isValid) {
        if (!element) return;
        const icon = element.querySelector(".req-icon");
        if (isValid) {
            element.classList.add("valid");
            if (icon) icon.textContent = "✓";
        } else {
            element.classList.remove("valid");
            if (icon) icon.textContent = "✕";
        }
    }

    updateReq(reqLength, hasLength);
    updateReq(reqUpper, hasUpper);
    updateReq(reqLower, hasLower);
    updateReq(reqNumSym, hasNumOrSym);

    const score = [hasLength, hasUpper, hasLower, hasNumOrSym].filter(Boolean).length;

    strengthBar.className = "strength-bar";
    if (val.length === 0) {
        strengthLabel.textContent = "None";
        strengthBar.style.width = "0%";
    } else if (score <= 1) {
        strengthBar.classList.add("weak");
        strengthLabel.textContent = "Weak";
        strengthLabel.style.color = "var(--error)";
    } else if (score === 2) {
        strengthBar.classList.add("fair");
        strengthLabel.textContent = "Fair";
        strengthLabel.style.color = "var(--warning)";
    } else if (score === 3) {
        strengthBar.classList.add("strong");
        strengthLabel.textContent = "Strong";
        strengthLabel.style.color = "#3b82f6";
    } else {
        strengthBar.classList.add("secure");
        strengthLabel.textContent = "Secure & Ready";
        strengthLabel.style.color = "var(--success)";
    }
}

function initPasswordStrength() {
    const passwordInput = document.getElementById("password");
    if (!passwordInput) return;

    passwordInput.addEventListener("input", () => {
        evaluatePassword(passwordInput.value);
    });
}

// Strong Password Generator Popover / Modal
function initPasswordGenerator() {
    const openBtn = document.getElementById("openPassGenBtn");
    const modal = document.getElementById("passwordGenModal");
    const closeBtn = document.getElementById("closePassGenBtn");
    const refreshBtn = document.getElementById("genRefreshBtn");
    const useBtn = document.getElementById("useGenPassBtn");
    const preview = document.getElementById("genPasswordPreview");
    const slider = document.getElementById("genLengthSlider");
    const lengthVal = document.getElementById("genLengthVal");

    const optUpper = document.getElementById("genOptUpper");
    const optLower = document.getElementById("genOptLower");
    const optNums = document.getElementById("genOptNums");
    const optSymbols = document.getElementById("genOptSymbols");

    if (!modal || !openBtn) return;

    function generateRandomPassword() {
        const length = parseInt(slider.value, 10);
        const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const lower = "abcdefghijklmnopqrstuvwxyz";
        const nums = "0123456789";
        const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

        let pool = "";
        let guaranteed = [];

        if (optUpper.checked) { pool += upper; guaranteed.push(upper[Math.floor(Math.random() * upper.length)]); }
        if (optLower.checked) { pool += lower; guaranteed.push(lower[Math.floor(Math.random() * lower.length)]); }
        if (optNums.checked) { pool += nums; guaranteed.push(nums[Math.floor(Math.random() * nums.length)]); }
        if (optSymbols.checked) { pool += symbols; guaranteed.push(symbols[Math.floor(Math.random() * symbols.length)]); }

        if (pool.length === 0) {
            pool = lower + nums;
            optLower.checked = true;
        }

        let result = [...guaranteed];
        for (let i = result.length; i < length; i++) {
            result.push(pool[Math.floor(Math.random() * pool.length)]);
        }

        // Shuffle
        result = result.sort(() => Math.random() - 0.5).join("");
        preview.textContent = result;
        return result;
    }

    openBtn.addEventListener("click", () => {
        modal.classList.add("active");
        generateRandomPassword();
    });

    closeBtn.addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("active");
    });

    slider.addEventListener("input", () => {
        lengthVal.textContent = slider.value;
        generateRandomPassword();
    });

    [optUpper, optLower, optNums, optSymbols].forEach(cb => {
        cb.addEventListener("change", generateRandomPassword);
    });

    refreshBtn.addEventListener("click", generateRandomPassword);

    useBtn.addEventListener("click", () => {
        const pass = preview.textContent;
        const passField = document.getElementById("password");
        const confirmPassField = document.getElementById("confirmPassword");

        if (passField && confirmPassField) {
            passField.value = pass;
            confirmPassField.value = pass;
            evaluatePassword(pass);
            showToast("Password Applied", "Strong password generated & matched in both fields.", "success");
        }

        modal.classList.remove("active");
    });
}

// Debounced Username Availability Check
let debounceTimer = null;
function initUsernameCheck() {
    const usernameInput = document.getElementById("username");
    const statusIndicator = document.getElementById("usernameStatus");
    const errorDisplay = document.getElementById("usernameError");

    if (!usernameInput) return;

    usernameInput.addEventListener("input", () => {
        const username = usernameInput.value.trim();
        clearTimeout(debounceTimer);
        errorDisplay.textContent = "";

        if (username.length === 0) {
            statusIndicator.className = "status-indicator";
            statusIndicator.innerHTML = "";
            return;
        }

        if (username.length < 3) {
            statusIndicator.className = "status-indicator";
            statusIndicator.innerHTML = "";
            errorDisplay.textContent = "Username must be at least 3 characters.";
            return;
        }

        statusIndicator.className = "status-indicator loading";
        statusIndicator.innerHTML = "";

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch("/check-username", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username })
                });
                const data = await res.json();

                if (data.available) {
                    statusIndicator.className = "status-indicator available";
                    statusIndicator.innerHTML = "✓";
                    errorDisplay.textContent = "";
                } else {
                    statusIndicator.className = "status-indicator taken";
                    statusIndicator.innerHTML = "✕";
                    errorDisplay.textContent = data.message || "Username is already taken";
                }
            } catch (err) {
                statusIndicator.className = "status-indicator";
                statusIndicator.innerHTML = "";
            }
        }, 350);
    });
}

// Lockout timer handler
let lockoutInterval = null;
function triggerLockout(seconds) {
    const alertBox = document.getElementById("lockoutAlert");
    const timerSpan = document.getElementById("lockoutTimer");
    const loginSubmitBtn = document.getElementById("loginSubmitBtn");

    if (!alertBox || !timerSpan) return;

    alertBox.classList.add("active");
    loginSubmitBtn.disabled = true;

    let remaining = seconds;
    timerSpan.textContent = remaining;

    clearInterval(lockoutInterval);
    lockoutInterval = setInterval(() => {
        remaining -= 1;
        timerSpan.textContent = remaining;
        if (remaining <= 0) {
            clearInterval(lockoutInterval);
            alertBox.classList.remove("active");
            loginSubmitBtn.disabled = false;
        }
    }, 1000);
}

// 2FA Verification Flow
let pending2FAUsername = null;
function init2FAModal() {
    const modal = document.getElementById("twoFactorModal");
    const closeBtn = document.getElementById("close2FABtn");
    const form = document.getElementById("twoFactorForm");
    const otpInputs = document.querySelectorAll(".otp-input");
    const autoFillBtn = document.getElementById("autoFillOtpBtn");
    const demoBadgeCode = document.getElementById("demoOtpCode");

    if (!modal) return;

    closeBtn.addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("active");
    });

    // Handle digit auto-advance
    otpInputs.forEach((input, idx) => {
        input.addEventListener("input", (e) => {
            const val = e.target.value.replace(/\D/g, "");
            e.target.value = val;
            if (val && idx < otpInputs.length - 1) {
                otpInputs[idx + 1].focus();
            }
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !input.value && idx > 0) {
                otpInputs[idx - 1].focus();
            }
        });

        input.addEventListener("paste", (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData("text").trim();
            if (/^\d{6}$/.test(pasteData)) {
                pasteData.split("").forEach((ch, i) => {
                    if (otpInputs[i]) otpInputs[i].value = ch;
                });
                otpInputs[otpInputs.length - 1].focus();
            }
        });
    });

    if (autoFillBtn) {
        autoFillBtn.addEventListener("click", () => {
            const code = demoBadgeCode.textContent.trim();
            code.split("").forEach((ch, i) => {
                if (otpInputs[i]) otpInputs[i].value = ch;
            });
            otpInputs[otpInputs.length - 1].focus();
        });
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const code = Array.from(otpInputs).map(i => i.value).join("");
            const verifyBtn = document.getElementById("verify2FABtn");

            if (code.length !== 6) {
                showToast("Invalid Code", "Please enter all 6 digits of your verification code.", "error");
                return;
            }

            verifyBtn.classList.add("loading");
            verifyBtn.disabled = true;

            try {
                const res = await fetch("/api/2fa/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: pending2FAUsername, code })
                });
                const data = await res.json();

                if (res.ok && data.success) {
                    showToast("Verified!", "Two-factor authentication successful. Redirecting...", "success");
                    sessionStorage.setItem("sc_username", data.user.username);
                    sessionStorage.setItem("sc_token", data.token);
                    sessionStorage.setItem("sc_user", JSON.stringify(data.user));

                    setTimeout(() => {
                        window.location.href = "dashboard.html";
                    }, 800);
                } else {
                    showToast("Verification Failed", data.message || "Invalid 2FA code", "error");
                }
            } catch (err) {
                showToast("Connection Error", "Could not verify code with server.", "error");
            } finally {
                verifyBtn.classList.remove("loading");
                verifyBtn.disabled = false;
            }
        });
    }
}

// Handle Signup Form
function initSignupForm() {
    const form = document.getElementById("signup-form");
    const submitBtn = document.getElementById("signupSubmitBtn");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        const usernameError = document.getElementById("usernameError");
        const passwordError = document.getElementById("passwordError");
        const confirmPasswordError = document.getElementById("confirmPasswordError");

        usernameError.textContent = "";
        passwordError.textContent = "";
        confirmPasswordError.textContent = "";

        let valid = true;

        if (username.length < 3) {
            usernameError.textContent = "Username must be at least 3 characters.";
            valid = false;
        }

        if (password.length < 8) {
            passwordError.textContent = "Password must be at least 8 characters.";
            valid = false;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W_]).{8,}$/;
        if (!passwordRegex.test(password)) {
            passwordError.textContent = "Password must contain uppercase, lowercase, and numbers/symbols.";
            valid = false;
        }

        if (password !== confirmPassword) {
            confirmPasswordError.textContent = "Passwords do not match.";
            valid = false;
        }

        if (!valid) return;

        submitBtn.classList.add("loading");
        submitBtn.disabled = true;

        try {
            const res = await fetch("/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, confirmPassword })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                showToast("Account Created!", "Registration successful with bcrypt encryption. You can now log in.", "success");
                form.reset();
                document.getElementById("strengthBar").style.width = "0%";
                document.getElementById("strengthLabel").textContent = "None";
                document.querySelectorAll("#passwordRequirements li").forEach(li => {
                    li.classList.remove("valid");
                    li.querySelector(".req-icon").textContent = "✕";
                });
                document.getElementById("usernameStatus").innerHTML = "";

                setTimeout(() => {
                    document.getElementById("loginUsername").value = username;
                    document.getElementById("tab-login").click();
                    document.getElementById("loginPassword").focus();
                }, 1000);
            } else {
                showToast("Signup Failed", data.message || "Could not complete registration.", "error");
                if (data.message && data.message.toLowerCase().includes("username")) {
                    usernameError.textContent = data.message;
                }
            }
        } catch (err) {
            showToast("Connection Error", "Could not connect to server. Please try again.", "error");
        } finally {
            submitBtn.classList.remove("loading");
            submitBtn.disabled = false;
        }
    });
}

// Handle Login Form
function initLoginForm() {
    const form = document.getElementById("login-form");
    const submitBtn = document.getElementById("loginSubmitBtn");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("loginUsername").value.trim();
        const password = document.getElementById("loginPassword").value;
        const rememberMe = document.getElementById("rememberMe") ? document.getElementById("rememberMe").checked : false;

        const usernameError = document.getElementById("loginUsernameError");
        const passwordError = document.getElementById("loginPasswordError");

        usernameError.textContent = "";
        passwordError.textContent = "";

        let valid = true;
        if (!username) {
            usernameError.textContent = "Please enter your username.";
            valid = false;
        }
        if (!password) {
            passwordError.textContent = "Please enter your password.";
            valid = false;
        }

        if (!valid) return;

        submitBtn.classList.add("loading");
        submitBtn.disabled = true;

        try {
            const res = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            // Check if rate limited
            if (res.status === 429 || data.isLocked) {
                triggerLockout(data.secondsRemaining || 60);
                showToast("Rate Limited", data.message, "error");
                return;
            }

            if (res.ok && data.success) {
                if (data.requires2FA) {
                    // Open 2FA modal
                    pending2FAUsername = data.username;
                    document.getElementById("twoFactorUsername").textContent = data.username;
                    if (document.getElementById("demoOtpCode")) {
                        document.getElementById("demoOtpCode").textContent = data.demoCode || "784920";
                    }
                    document.getElementById("twoFactorModal").classList.add("active");
                    const firstOtp = document.querySelector(".otp-input[data-index='0']");
                    if (firstOtp) setTimeout(() => firstOtp.focus(), 150);
                    showToast("2FA Required", "Please enter your 6-digit authentication code.", "info");
                    return;
                }

                showToast("Welcome Back!", `Logged in as ${username}. Access granted.`, "success");

                sessionStorage.setItem("sc_username", username);
                sessionStorage.setItem("sc_token", data.token || "active_token");
                sessionStorage.setItem("sc_user", JSON.stringify(data.user || { username }));

                if (rememberMe) {
                    localStorage.setItem("sc_remember_user", username);
                } else {
                    localStorage.removeItem("sc_remember_user");
                }

                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 800);
            } else {
                showToast("Login Failed", data.message || "Invalid credentials", "error");
                let remainingInfo = data.attemptsRemaining !== undefined ? ` (${data.attemptsRemaining} attempts left)` : "";
                passwordError.textContent = (data.message || "Invalid username or password") + remainingInfo;
            }
        } catch (err) {
            showToast("Connection Error", "Could not communicate with the authentication server.", "error");
        } finally {
            submitBtn.classList.remove("loading");
            submitBtn.disabled = false;
        }
    });

    // Auto fill remembered username
    const remembered = localStorage.getItem("sc_remember_user");
    if (remembered) {
        const usernameInput = document.getElementById("loginUsername");
        if (usernameInput) usernameInput.value = remembered;
        const rememberCheckbox = document.getElementById("rememberMe");
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }
}

// Initializer
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initTabs();
    initPasswordToggles();
    initPasswordStrength();
    initPasswordGenerator();
    init2FAModal();
    initUsernameCheck();
    initSignupForm();
    initLoginForm();

    const forgotLink = document.getElementById("forgot-pass-link");
    if (forgotLink) {
        forgotLink.addEventListener("click", (e) => {
            e.preventDefault();
            showToast("Password Reset", "For security reasons, password resets are processed via admin or the Security Settings tab in your dashboard.", "info");
        });
    }
});
