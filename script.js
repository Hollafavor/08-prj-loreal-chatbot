/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendButton = document.getElementById("sendBtn");

// Send chat requests through the class-hosted Cloudflare Worker.
const LOREAL_WORKER_URL = "https://lorealbot.hollafavor.workers.dev/";

const SYSTEM_PROMPT = `You are the L'Oréal Beauty Assistant.
Only answer questions about L'Oréal products, beauty routines, skincare, makeup, haircare, fragrance, and personalized beauty recommendations.
If the user asks something unrelated to L'Oréal or beauty, politely refuse and redirect them to beauty, skincare, makeup, haircare, or L'Oréal product questions.
Keep responses helpful, concise, and friendly. Use the conversation history to remember the user's name, preferences, and past questions when they have shared them. Do not invent personal details or claim to remember anything from earlier sessions.`;

// Keep the full conversation for this page session so follow-up questions have context.
const conversationHistory = [
  { role: "system", content: SYSTEM_PROMPT },
  {
    role: "assistant",
    content: "👋 Hello! Ask me about L'Oréal products, routines, or beauty recommendations.",
  },
];

addMessage("ai", conversationHistory[1].content);

function addMessage(role, text) {
  const messageEl = document.createElement("div");
  messageEl.className = `msg ${role}`;
  messageEl.textContent = text;
  chatWindow.appendChild(messageEl);
}

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userMessage = userInput.value.trim();
  if (!userMessage) {
    return;
  }

  // Show only the latest exchange; conversationHistory still keeps earlier context.
  chatWindow.textContent = "";
  addMessage("user", userMessage);
  userInput.value = "";
  conversationHistory.push({ role: "user", content: userMessage });

  // Show a loading state while waiting for the AI response.
  addMessage("ai", "Thinking...");
  const loadingMessage = chatWindow.lastElementChild;
  userInput.disabled = true;
  sendButton.disabled = true;

  try {
    const response = await fetch(LOREAL_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conversationHistory,
      }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new Error("The chatbot response did not contain a message.");
    }

    conversationHistory.push({ role: "assistant", content: reply });
    loadingMessage.textContent = reply;
  } catch (error) {
    conversationHistory.pop();
    loadingMessage.textContent = "Sorry, I couldn't reach the chatbot right now. Please try again.";
  } finally {
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
});
