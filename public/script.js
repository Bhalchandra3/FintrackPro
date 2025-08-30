import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(path.join(__dirname, "/public","index.html"));


const API_URL = "http://localhost:3000"; // your backend port

async function signup() {
    const name = document.getElementById("name");
    const email = document.getElementById("email");
    const password = document.getElementById("password");

    const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.value, email: email.value, password: password.value })
    });

    const data = await res.json();
    document.getElementById("output").textContent = JSON.stringify(data, null, 2);
    name.value = "";
    email.value = "";
    password.value = "";
}

async function login() {
    const email = document.getElementById("email");
    const password = document.getElementById("password");

    const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.value, password: password.value })
    });

    const data = await res.json();
    document.getElementById("output").textContent = JSON.stringify(data, null, 2);
    email.value = "";
    password.value = "";
    // Store token in localStorage for later use
    if (data.success && data.data.token) {
        localStorage.setItem("authToken", data.data.token);
    }
}