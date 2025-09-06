const API_URL = "http://127.0.0.1:8000";  // Backend URL

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const voiceBtn = document.getElementById("voice-btn");

let currentUtterance = null; // Track active speech

// 📚 Toggle Library
function toggleLibrary() {
  const lib = document.getElementById("library");
  lib.style.display = lib.style.display === "block" ? "none" : "block";
}

// 📖 Load History
function loadHistory() {
  let history = JSON.parse(localStorage.getItem("chatHistory")) || [];
  const list = document.getElementById("history");
  if (!list) return;

  list.innerHTML = "";
  history.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.sender === "user" ? "👤" : "🤖"} ${item.text}`;
    list.appendChild(li);
  });
}

// 💾 Save History
function saveHistory(sender, text) {
  let history = JSON.parse(localStorage.getItem("chatHistory")) || [];
  history.push({ sender, text });
  localStorage.setItem("chatHistory", JSON.stringify(history));
  loadHistory();
}

// 📝 Format text with line breaks (no forced bullet points)
function formatText(text) {
  return text.replace(/\n/g, "<br>");
}

// 📝 Add Message
function addMessage(sender, text, isBot = false) {
  const msg = document.createElement("div");
  msg.classList.add("message");
  msg.classList.add(isBot ? "bot-msg" : "user-msg");

  if (isBot) {
    msg.innerHTML = `<b>${sender}:</b> ${formatText(text)} 
      <button class="listen-btn">🔊 Hear</button>`;
  } else {
    msg.innerHTML = `<b>${sender}:</b> ${text}`;
  }

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;

  saveHistory(isBot ? "bot" : "user", text);

  if (isBot) {
    const listenBtn = msg.querySelector(".listen-btn");
    listenBtn.addEventListener("click", () => {
      toggleSpeak(text, listenBtn);
    });
  }
}

// 🚀 Send Message
async function sendMessage(message) {
  if (!message) {
    message = userInput.value.trim();
    if (!message) return;
    userInput.value = "";
  }

  addMessage("👨‍🌾 You", message);

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message, language: "en" }),
    });

    const data = await res.json();
    const reply = data.answer;

    addMessage("🤖 Kalpataru", reply, true);
  } catch (error) {
    addMessage("🤖 Kalpataru", "⚠️ Error: Cannot connect to server.", true);
  }
}

// 🎤 Voice Input
if ("webkitSpeechRecognition" in window) {
  const recognition = new webkitSpeechRecognition();
  recognition.lang = "en-IN";
  recognition.continuous = false;

  voiceBtn.addEventListener("click", () => {
    recognition.start();
    voiceBtn.classList.add("listening");
    voiceBtn.innerText = "🎙️";
  });

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    sendMessage(transcript);
    voiceBtn.classList.remove("listening");
    voiceBtn.innerText = "🎤";
  };

  recognition.onerror = function () {
    voiceBtn.classList.remove("listening");
    voiceBtn.innerText = "🎤";
  };
} else {
  alert("Your browser does not support Speech Recognition");
}

// 🔊 Toggle Speak (Start/Stop)
function toggleSpeak(text, btn) {
  if (speechSynthesis.speaking && currentUtterance) {
    speechSynthesis.cancel();
    currentUtterance = null;
    btn.textContent = "🔊 Hear";
  } else {
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = "en-IN";
    currentUtterance.onend = () => {
      btn.textContent = "🔊 Hear";
      currentUtterance = null;
    };
    btn.textContent = "⏹ Stop";
    speechSynthesis.speak(currentUtterance);
  }
}

// 📷 Image Upload
async function sendImage() {
  const fileInput = document.getElementById("image-upload");
  if (fileInput.files.length === 0) return;

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  addMessage("👨‍🌾 You", "[📷 Image uploaded]");

  try {
    const response = await fetch(`${API_URL}/diagnose`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    addMessage("🤖 Kalpataru", data.disease_report, true);
  } catch (error) {
    addMessage("🤖 Kalpataru", "⚠️ Error: Could not process the image.", true);
  }
}

// 📂 File Upload
async function sendFile() {
  const fileInput = document.getElementById("file-upload");
  if (fileInput.files.length === 0) return;

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  addMessage("👨‍🌾 You", `[📂 File uploaded: ${fileInput.files[0].name}]`);

  try {
    const response = await fetch(`${API_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    addMessage("🤖 Kalpataru", data.message, true);
  } catch (error) {
    addMessage("🤖 Kalpataru", "⚠️ Error: Could not upload the file.", true);
  }
}

// 📤 Send Button
sendBtn.addEventListener("click", () => {
  sendMessage();
});

// 🖊️ Enter key to send (Shift+Enter = newline)
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Load history on start
window.onload = loadHistory;
