
document.getElementById("signup").addEventListener("submit", async function(event) {
    event.preventDefault();

    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value;
    let confirmPassword = document.getElementById("confirmPassword").value;

    let usernameError = document.getElementById("usernameError");
    let passwordError = document.getElementById("passwordError");
    let confirmPasswordError = document.getElementById("confirmPasswordError");
    let passwordCheck = document.getElementById("passwordcheck");

    usernameError.textContent = "";
    passwordError.textContent = "";
    confirmPasswordError.textContent = "";
    passwordCheck.textContent = "";

    let valid = true;


    if (username.length < 8) {
        usernameError.textContent = "Username must be at least 8 characters.";
        valid = false;
    } else {
        let response = await fetch("http://localhost:3000/check-username", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
        });

        let data = await response.json();
        if (!data.available) {
            usernameError.textContent = "Username is already taken.";
            valid = false;
        }
    }


    let passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
        passwordError.textContent = "Password must include uppercase, lowercase, and special characters.";
        valid = false;
    } else {
        passwordCheck.textContent = "✔ Password strength is good.";
    }


    if (password !== confirmPassword) {
        confirmPasswordError.textContent = "Passwords do not match.";
        valid = false;
    }


    if (valid) {
        let signupData = { username, password, confirmPassword };

        try {
            let response = await fetch("http://localhost:3000/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(signupData),
            });

            let data = await response.json();

            if (data.success) {
       
                document.getElementById('successMessage').style.display = 'block';
                setTimeout(() => {
                    window.location.href = "/login.html"; 
                }, 2000); 
            } else {
                alert("Signup failed: " + data.message);
            }
        } catch (error) {
            console.error("Error during signup:", error);
            alert("An error occurred during signup. Please try again.");
        }
    }
});


document.getElementById("login").addEventListener("submit", async function(event) {
    event.preventDefault();

    let username = document.getElementById("loginUsername").value.trim();
    let password = document.getElementById("loginPassword").value;

    let usernameError = document.getElementById("loginUsernameError");
    let passwordError = document.getElementById("loginPasswordError");

    usernameError.textContent = "";
    passwordError.textContent = "";

    let valid = true;

    
    if (username.length < 8) {
        usernameError.textContent = "Username must be at least 8 characters.";
        valid = false;
    }

    
    if (password.length < 8) {
        passwordError.textContent = "Password must be at least 8 characters.";
        valid = false;
    }

    
    if (valid) {
        let loginData = { username, password };

        try {
            let response = await fetch("http://localhost:3000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginData),
            });

            let data = await response.json();

            if (data.success) {
                sessionStorage.setItem("username", username);
                window.location.href = "dashboard.html"; 
            } else {
                alert("Login failed: " + data.message);
            }
        } catch (error) {
            console.error("Error during login:", error);
            alert("An error occurred during login. Please try again.");
        }
    }
});


function toggleTheme() {
    console.log("Changed");
    
    document.body.classList.toggle('dark-mode');
    document.querySelector('.container').classList.toggle('dark-mode');
    document.querySelector('button').classList.toggle('dark-mode');
    document.querySelectorAll('input').forEach(input => input.classList.toggle('dark-mode'));
    document.querySelectorAll('.error').forEach(error => error.classList.toggle('dark-mode'));

  
    const themeIcon = document.getElementById('theme-toggle');
    if (document.body.classList.contains('dark-mode')) {
        themeIcon.textContent = 'Light Mode';
    } else {
        themeIcon.textContent = 'Dark Mode';
    }

    
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.querySelector('.container').classList.add('dark-mode');
        document.querySelector('button').classList.add('dark-mode');
        document.querySelectorAll('input').forEach(input => input.classList.add('dark-mode'));
        document.querySelectorAll('.error').forEach(error => error.classList.add('dark-mode'));
        document.getElementById('theme-toggle').textContent = 'Light Mode';
    }
});


document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
