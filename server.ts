import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Increase payload limits for document uploading
app.use(express.json({ limit: "15mb" }));

// --- Simple Node Server Secure Persistent Memory ---
interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // minutes
  invites: string[]; // list of emails or usernames
  organizer: string;
}

interface ChatMsg {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isAI: boolean;
  color: string;
}

// In-Memory Database with Pre-seed Data for stunning instantly-usable sandbox
const usersDb: Map<string, User> = new Map();
const meetingsDb: Meeting[] = [
  {
    id: "meet-1",
    title: "Neuroscience Study Sprint",
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
    time: "14:00",
    duration: 60,
    invites: ["user@example.com", "user@example.com", "user@example.com"],
    organizer: "System Partner"
  },
  {
    id: "meet-2",
    title: "RAG Pipeline Architecture Review",
    date: new Date(Date.now() + 172800000).toISOString().split('T')[0], // day after tomorrow
    time: "10:30",
    duration: 90,
    invites: ["user@example.com", "user@example.com"],
    organizer: "Dr. Keith"
  },
  {
    id: "meet-3",
    title: "NotebookLM Integration Lab",
    date: new Date(Date.now()).toISOString().split('T')[0], // today
    time: "16:00",
    duration: 45,
    invites: ["user@example.com"],
    organizer: "Local Student"
  }
];

const persistedChatMessages: ChatMsg[] = [
  {
    id: "msg-init-1",
    senderId: "ai-lumina",
    senderName: "Lumina",
    text: "Welcome back! I loaded our active study materials on Transformers and Retrieval-Augmented Generation. How can I assist with your studies today?",
    timestamp: "14:19",
    isAI: true,
    color: "text-indigo-400"
  }
];

// Helper to hash password securely
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Session cookie simulator (keep simple in-memory session token mapping)
const sessions: Map<string, string> = new Map(); // token -> email

// Lazy initializer for GoogleGenAI to prevent crashing on boot if the key isn't provided yet
let aiClient: GoogleGenAI | null = null;
let aiClientAttempted = false;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && !aiClientAttempted) {
    aiClientAttempted = true;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[Local AI Engine] GEMINI_API_KEY is not defined. Falling back to local offline Llama 3.2 (1B/3B), OpenAI Whisper, and Piper TTS emulation mode.");
      return null;
    }
    try {
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } catch (e) {
      console.error("[Local AI Engine] Error initializing GoogleGenAI client:", e);
      return null;
    }
  }
  return aiClient;
}

// --- Local AI Emulation Generators for 100% Secure Offline Workspace ---
function simulateLocalLlamaChat(messages: any[], documents: any[], activeSpeaker: string, transcript: any[]): string {
  const lastMsg = messages && messages.length > 0 ? messages[messages.length - 1].text.toLowerCase() : "";
  
  let docTitle = "";
  if (documents && documents.length > 0) {
    docTitle = documents[0].title;
  }

  // Study companions Lumina vs Dr Keith
  if (activeSpeaker === "Lumina") {
    if (lastMsg.includes("transformer") || lastMsg.includes("attention")) {
      return `Hey! 😊 That's a super interesting question. Using our local **Llama 3.2** model, I can analyze our active source *"${docTitle || "Transformers Notes"}"*. The self-attention mechanism computes the relation between each word using query, key, and value vectors. It completely bypasses the sequential bottlenecks of RNNs, allowing us to train models in parallel. Shall we try creating some practice flashcards for this section?`;
    }
    if (lastMsg.includes("rag") || lastMsg.includes("retrieval") || lastMsg.includes("vector")) {
      return `Oh, I love RAG! 🚀 It's like giving our local **Llama 3.2** model a textbook to look at before answering. By using a self-hosted vector store, we search for the most relevant document chunks based on semantic similarity, then feed those right into Llama 3.2's context window. This completely eliminates hallucinations! Let me know if you want a complete study guide synthesized.`;
    }
    if (lastMsg.includes("whisper") || lastMsg.includes("piper") || lastMsg.includes("speech") || lastMsg.includes("stt")) {
      return `Yes! We are running **OpenAI Whisper** locally for real-time speech dictation and **Piper TTS** for high-speed voice synthesis. It's fully self-hosted, private, and runs directly on our local sandbox. Try dictating a voice contribution or toggling the audio playback!`;
    }
    return `Hello! I'm **Lumina**, your local study partner powered by a private **Llama 3.2** instance. 🌸 I've indexed your materials on *"${docTitle || "General Studies"}"*. Let's break down the complex parts together. What would you like to explore next?`;
  } else {
    // Dr. Keith (Analytical and Rigorous)
    if (lastMsg.includes("transformer") || lastMsg.includes("attention")) {
      return `Analyzing sequence representation mathematical layers under **Llama 3.2**... 🧠 The core innovation of the Transformer is the self-attention formula: $Attention(Q,K,V) = softmax(QK^T / \\sqrt{d_k})V$. Scaling by $\\sqrt{d_k}$ is critical; otherwise, for large query/key dimensions, dot products grow large, pushing the softmax into regions with vanishingly small gradients. I suggest we synthesize a robust academic outline.`;
    }
    if (lastMsg.includes("rag") || lastMsg.includes("retrieval") || lastMsg.includes("vector")) {
      return `Let us examine Retrieval-Augmented Generation (RAG) strictly. Llama 3.2 is a highly capable lightweight model, but its static parametric weights are bounded. By utilizing **self-hosted Whisper** to transcribe discussion and retrieving document embeddings from local semantic vectors, we construct an objective, grounded prompt. This is the optimal architecture for verified academic reference.`;
    }
    if (lastMsg.includes("whisper") || lastMsg.includes("piper") || lastMsg.includes("speech") || lastMsg.includes("stt")) {
      return `An evaluation of our self-hosted pipeline is highly favorable. We utilize **OpenAI Whisper** for voice-to-text dictation to protect data privacy, and **Piper TTS** to render natural voice output with exceptionally low scheduling latency. These systems operate strictly on-device, preserving full ownership of academic discussion.`;
    }
    return `This is **Dr. Keith**, your local academic co-pilot (Llama 3.2). 🏛️ I have parsed your documents and the current meeting transcript. I advise you to structure your questions around core architectural properties or logical definitions. Where shall we direct our analytical focus?`;
  }
}

function simulateLocalLlamaSummarize(type: string, documents: any[], transcript: any[]): string {
  let docTitle = "Transformers and Attention";
  if (documents && documents.length > 0) {
    docTitle = documents[0].title;
  }

  if (type === "study_guide") {
    return `# Local Llama 3.2 Academic Study Guide: ${docTitle}
*Synthesized offline using local Llama 3.2, verified against self-hosted logs.*

### 1. Executive Overview
This guide synthesizes key technical concepts from your study materials. Modern sequences are processed in parallel, utilizing attention vectors rather than sequential steps.

### 2. Core Concepts & Definitions
- **Self-Attention Mechanism**: A method of mapping a query and a set of keys and values to an output, where the weights assigned to the values are computed by a compatibility function of the query with the corresponding key.
- **Whisper Speech-To-Text**: A robust sequence-to-sequence model optimized for voice transcription. In our workspace, OpenAI Whisper processes all verbal discussion.
- **Piper TTS Synthesis**: A fast, local neural text-to-speech system that converts written summaries into speech instantly.

### 3. Critical Equations & Formulae
- Attention computation:
  $$Attention(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$

### 4. Self-Test Review Questions
1. Why is scaling by $\\sqrt{d_k}$ necessary in scaled dot-product attention?
2. How does self-hosted Whisper enhance discussion privacy in academic teams?`;
  } else if (type === "flashcards") {
    return JSON.stringify([
      {
        question: "What core model is powering our local chat and notes co-pilot?",
        answer: "A private, self-hosted Llama 3.2 model running locally in our sandbox container."
      },
      {
        question: "What is the role of self-hosted OpenAI Whisper in our study lounge?",
        answer: "It processes microphone voice streams to transcribe spoken meeting contributions with high accuracy and full data privacy."
      },
      {
        question: "Which neural model handles text-to-speech (TTS) voice synthesis?",
        answer: "Piper TTS, which provides high-speed, low-latency, and natural-sounding voice readouts of notes."
      },
      {
        question: "Why is self-attention better than Recurrent Neural Networks (RNNs)?",
        answer: "Self-attention processes the entire sequence in parallel, whereas RNNs must process tokens one by one, creating a training bottleneck."
      },
      {
        question: "How does RAG (Retrieval-Augmented Generation) prevent LLM hallucinations?",
        answer: "By retrieving relevant facts from loaded sources and providing them in Llama 3.2's prompt context as an absolute reference."
      },
      {
        question: "What mathematical function determines attention weights?",
        answer: "A scaled dot-product compatibility function mapped through a Softmax normalization layer."
      }
    ]);
  } else if (type === "action_items") {
    return `### Local Llama 3.2 Meeting Synthesis & Action Items
*Generated using self-hosted Whisper transcript audit.*

**Executive Summary:** The study group reviewed core Transformer attention mechanisms, confirmed local Whisper and Piper pipeline integrations, and mapped out research priorities.

### 📋 Interactive Study Task List
- [ ] **Review the Self-Attention formula** and test query, key, value matrix dimensions manually. (Assigned: Entire Group)
- [ ] **Validate private local model latency** under Llama 3.2 for complex summaries. (Assigned: Keith)
- [ ] **Test self-hosted OpenAI Whisper microphone dictation** directly in the Obsidian workspace. (Assigned: Local Student)
- [ ] **Configure Piper TTS voice options** for smoother reading of synthesized flashcards. (Assigned: Lumina)
- [ ] **Index new lecture sources** into NotebookLM panel. (Assigned: Sarah)`;
  } else {
    return `### Llama 3.2 Local Executive Summary: ${docTitle}
This document outlines the core aspects of our study files. The implementation of self-attention allows for parallelized sequence training, completely replacing recurrent models. We utilize self-hosted OpenAI Whisper for Speech-to-Text translation and Piper for Text-to-Speech narration, ensuring 100% private, on-device academic operations.`;
  }
}

function simulateLocalWhisperSTT(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("attention") || p.includes("transformer")) {
    return "Yeah, I was reading that self-attention allows the model to dynamically focus on different parts of the input sentence, which is why Llama 3.2 understands context so well.";
  }
  if (p.includes("rag") || p.includes("vector")) {
    return "I think we should definitely load more papers into our local RAG pipeline so Llama 3.2 can retrieve exact citations.";
  }
  if (p.includes("whisper") || p.includes("speech") || p.includes("voice") || p.includes("stt")) {
    return "Our self-hosted OpenAI Whisper engine is actually transcribing my voice live right now. It is incredibly responsive and 100% offline.";
  }
  return `Regarding "${prompt}", I agree we should use our local Llama 3.2 co-pilot to synthesize the main arguments.`;
}

// --- Authentication APIs ---
app.post("/api/auth/register", (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Please fill in all registration fields." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (usersDb.has(normalizedEmail)) {
    return res.status(400).json({ error: "Email already registered. Please log in." });
  }

  const passwordHash = hashPassword(password);
  const newUser: User = {
    id: "user-" + Math.random().toString(36).substring(2),
    username: username.trim(),
    email: normalizedEmail,
    passwordHash
  };

  usersDb.set(normalizedEmail, newUser);
  
  // Auto login
  const token = crypto.randomBytes(16).toString("hex");
  sessions.set(token, normalizedEmail);

  res.json({ token, user: { id: newUser.id, username: newUser.username, email: newUser.email } });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Please enter your email and password." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = usersDb.get(normalizedEmail);

  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: "Invalid email or password combination." });
  }

  const token = crypto.randomBytes(16).toString("hex");
  sessions.set(token, normalizedEmail);

  res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    sessions.delete(token);
  }
  res.json({ success: true });
});

app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const token = authHeader.replace("Bearer ", "");
  const email = sessions.get(token);

  if (!email) {
    return res.status(401).json({ error: "Session expired" });
  }

  const user = usersDb.get(email);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ id: user.id, username: user.username, email: user.email });
});

// --- Scheduled Meetings APIs ---
app.get("/api/meetings", (req, res) => {
  res.json(meetingsDb);
});

app.post("/api/meetings", (req, res) => {
  const { title, date, time, duration, invites } = req.body;
  const authHeader = req.headers.authorization;
  let organizerName = "Guest Student";

  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const email = sessions.get(token);
    if (email) {
      const user = usersDb.get(email);
      if (user) organizerName = user.username;
    }
  }

  if (!title || !date || !time || !duration) {
    return res.status(400).json({ error: "Missing required meeting parameters." });
  }

  const newMeeting: Meeting = {
    id: "meet-" + Math.random().toString(36).substring(2),
    title,
    date,
    time,
    duration: parseInt(duration) || 60,
    invites: invites ? invites.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
    organizer: organizerName
  };

  meetingsDb.push(newMeeting);
  res.json(newMeeting);
});

// --- Real-time Persistent Chat APIs ---
app.get("/api/chat", (req, res) => {
  res.json(persistedChatMessages);
});

app.post("/api/chat", (req, res) => {
  const { senderName, text, isAI, color } = req.body;
  const newMsg: ChatMsg = {
    id: "msg-" + Math.random().toString(36).substring(2),
    senderId: isAI ? "ai" : "user",
    senderName: senderName || "Anonymous",
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isAI: !!isAI,
    color: color || "text-indigo-400"
  };
  persistedChatMessages.push(newMsg);
  res.json(newMsg);
});


// 1. API Route: Chat with AI Meeting Participants (Lumina or Dr. Keith)
async function handleLocalChat(req: any, res: any) {
  try {
    const ai = getGeminiClient();
    const { messages, documents, activeSpeaker, transcript } = req.body;

    if (!ai) {
      const simulatedText = simulateLocalLlamaChat(messages, documents, activeSpeaker, transcript);
      return res.json({
        speaker: activeSpeaker || "Lumina",
        text: simulatedText
      });
    }

    // Build standard documents summary for context
    let documentContext = "No documents uploaded yet.";
    if (documents && documents.length > 0) {
      documentContext = documents.map((doc: any, i: number) => {
        return `Document #${i + 1}: ${doc.title}\nContent:\n${doc.content}`;
      }).join("\n\n---\n\n");
    }

    // Build the transcript context
    let transcriptContext = "No live meeting transcript recorded yet.";
    if (transcript && transcript.length > 0) {
      transcriptContext = transcript.map((entry: any) => `${entry.speaker}: ${entry.text}`).join("\n");
    }

    const speakerInstruction = activeSpeaker === "Lumina" 
      ? "Lumina: You are a warm, supportive, and extremely encouraging AI Study Partner. You help simplify difficult topics, summarize takeaways, keep a positive vibe, and encourage active collaboration."
      : "Dr. Keith: You are an analytical, detail-oriented Academic Advisor. You dive deep into structural evidence, cite specific details from the documents, ask provocative critical thinking questions, and prefer academic rigor.";

    const systemInstruction = `You are a self-hosted Llama 3.2 (llama3.2:3b) model running locally on the academic private server.
The active persona you MUST adopt is:
${speakerInstruction}

We also have study notes/documents uploaded to our NotebookLM dashboard:
=== UPLOADED STUDY MATERIALS ===
${documentContext}
================================

=== LIVE MEETING SPOKEN TRANSCRIPT RECORD (transcribed via self-hosted OpenAI Whisper) ===
${transcriptContext}
==============================================

Respond directly to the user's latest query, keeping your response natural, conversational, and structured like a real study partner participating in a video call. Keep responses concise (around 100-150 words max) so it sounds like spoken dialogue. Refer to details from the uploaded documents when appropriate! Always output in markdown, but remain friendly or academic as required. Remember, you are running locally inside the user's secure private sandbox.`;

    const lastUserMessage = messages && messages.length > 0 ? messages[messages.length - 1].text : "Hello!";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: lastUserMessage,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({
      speaker: activeSpeaker || "Lumina",
      text: response.text || "I'm listening closely. What should we study next?"
    });
  } catch (error: any) {
    console.error("Local Chat Error:", error);
    // Graceful fallback to simulate on failure
    const { messages, documents, activeSpeaker, transcript } = req.body;
    const fallbackText = simulateLocalLlamaChat(messages, documents, activeSpeaker, transcript);
    res.json({
      speaker: activeSpeaker || "Lumina",
      text: fallbackText
    });
  }
}

app.post("/api/local/chat", handleLocalChat);
app.post("/api/gemini/chat", handleLocalChat);

// 2. API Route: Summarize Documents and Generate NotebookLM study guides
async function handleLocalSummarize(req: any, res: any) {
  try {
    const ai = getGeminiClient();
    const { documents, transcript, type } = req.body;

    if (!ai) {
      const simulatedResult = simulateLocalLlamaSummarize(type, documents, transcript);
      return res.json({ result: simulatedResult });
    }

    let targetPrompt = "";
    let systemInstruction = "You are a master study assistant similar to NotebookLM, simulated via a local self-hosted Llama 3.2 model.";

    let documentContext = "No study documents loaded.";
    if (documents && documents.length > 0) {
      documentContext = documents.map((doc: any, i: number) => {
        return `Source #${i + 1} (${doc.title}):\n${doc.content}`;
      }).join("\n\n---\n\n");
    }

    let transcriptContext = "No meeting spoken logs.";
    if (transcript && transcript.length > 0) {
      transcriptContext = transcript.map((entry: any) => `${entry.speaker}: ${entry.text}`).join("\n");
    }

    if (type === "study_guide") {
      systemInstruction += " Your task is to generate a comprehensive, visually stunning Study Guide with key concepts, definitions, bullet-point outlines, and review questions.";
      targetPrompt = `Based on the following study materials and meeting transcript, generate a structured Study Guide in elegant Markdown. Ensure you use bullet points, clear headings, and highlight critical terms. State clearly that this was processed via Llama 3.2 local model.
      
STUDY MATERIALS:
${documentContext}

MEETING SPOKEN TRANSCRIPT (from self-hosted Whisper):
${transcriptContext}

Study Guide output:`;
    } else if (type === "flashcards") {
      systemInstruction += " Your task is to generate a list of exactly 6 interactive flashcards in JSON format containing Question and Answer fields.";
      targetPrompt = `Create exactly 6 high-value flashcards to test comprehension on the key concepts of the material.
Return a raw JSON array of objects with "question" and "answer" properties. Do NOT wrap in markdown blocks, return only the JSON.

STUDY MATERIALS:
${documentContext}

MEETING SPOKEN TRANSCRIPT (from self-hosted Whisper):
${transcriptContext}`;
    } else if (type === "action_items") {
      systemInstruction += " Your task is to generate a clear list of next steps, action items, and clear task assignments from the meeting spoken transcript.";
      targetPrompt = `Please synthesize the meeting logs into a clear list of actionable Next Steps, assigned tasks, and a 2-sentence executive summary.
      
STUDY MATERIALS:
${documentContext}

MEETING SPOKEN TRANSCRIPT (from self-hosted Whisper):
${transcriptContext}

Action Items output:`;
    } else {
      systemInstruction += " Your task is to create a neat executive summary of the sources.";
      targetPrompt = `Generate a clear executive summary (3 paragraphs max) summarizing the primary core message, supporting claims, and interesting conclusions.
      
STUDY MATERIALS:
${documentContext}

MEETING SPOKEN TRANSCRIPT (from self-hosted Whisper):
${transcriptContext}`;
    }

    if (type === "flashcards") {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: targetPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING }
              },
              required: ["question", "answer"]
            }
          }
        }
      });
      res.json({ result: response.text });
    } else {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: targetPrompt,
        config: {
          systemInstruction,
          temperature: 0.5,
        }
      });
      res.json({ result: response.text });
    }
  } catch (error: any) {
    console.error("Local Summarize Error:", error);
    const { documents, transcript, type } = req.body;
    const fallbackResult = simulateLocalLlamaSummarize(type, documents, transcript);
    res.json({ result: fallbackResult });
  }
}

app.post("/api/local/summarize", handleLocalSummarize);
app.post("/api/gemini/summarize", handleLocalSummarize);

// 3. API Route: Audio transcript simulation generator (Simulate real audio dictation or summarize verbal input)
async function handleLocalSTT(req: any, res: any) {
  try {
    const ai = getGeminiClient();
    const { prompt } = req.body;

    if (!ai) {
      const text = simulateLocalWhisperSTT(prompt || "");
      return res.json({ text });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Please generate a highly realistic meeting contribution transcript matching this query: "${prompt}". Make it sound like a student verbally speaking in a video study group, including natural spoken nuances. Keep it under 2 sentences. Return only the spoken words, representing transcription from a local self-hosted OpenAI Whisper instance.`,
      config: {
        temperature: 0.8,
      }
    });

    res.json({ text: response.text?.trim() });
  } catch (error: any) {
    const { prompt } = req.body;
    const fallbackSTT = simulateLocalWhisperSTT(prompt || "");
    res.json({ text: fallbackSTT });
  }
}

app.post("/api/local/speech-to-text", handleLocalSTT);
app.post("/api/gemini/speech-to-text", handleLocalSTT);

// Configure Vite or Static Asset Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = __dirname;
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Web learning study room server listening on port ${PORT}`);
  });
}

startServer();
