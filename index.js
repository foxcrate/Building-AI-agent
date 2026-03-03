import "dotenv/config";
import express from "express";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import retriever from "./utils/retriever.js";
import combineDocuments from "./utils/combineDocuments.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Conversation history storage
const conversationHistory = [];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "AI Agent API is running",
    endpoints: {
      health: "/api/health",
      chat: "POST /api/chat",
      conversationHistory: "/api/conversation-history",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
  });
});

app.get("/api/conversation-history", (req, res) => {
  res.json({
    success: true,
    history: conversationHistory,
    count: conversationHistory.length,
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { movieQuestion } = req.body;

    // Validate message
    if (
      !movieQuestion ||
      typeof movieQuestion !== "string" ||
      movieQuestion.trim() === ""
    ) {
      return res.status(400).json({
        error: "movieQuestion is required and must be a non-empty string",
      });
    }

    conversationHistory.push(`user: ${movieQuestion}`);

    const llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 3,
    });
    // console.log(`📩 Received movie: ${movie}`);

    let standaloneQuestionTemplate =
      "Given some conversation history (if any) and a question, convert it to a standalone question. conversation history: {conversationHistory} question: {question} standalone question:";

    let standaloneQuestionPrompt = PromptTemplate.fromTemplate(
      standaloneQuestionTemplate,
    );

    let standaloneQuestionChain = standaloneQuestionPrompt
      .pipe(llm)
      .pipe(new StringOutputParser());

    let retrieverChain = RunnableSequence.from([
      (prevResult) => prevResult.standalone_question,
      retriever,
      combineDocuments,
    ]);

    let answerTemplate = `You are a helpful and enthusiastic support bot who can answer a given
        question about Scrimba based on the context provided and some conversation history (if any). Try to find the answer in the context, consider the conversation history if it is relevant. If you
        really don't know the answer, say "I'm sorry, I don't know the answer to that." And direct the
        questioner to email help@scrimba.com. Don't try to make up an answer. Always speak as if you were
        chatting to a friend.
        context: {context}
        conversation history: {conversationHistory}
        question: {question}
        answer:
        `;

    let answerPrompt = PromptTemplate.fromTemplate(answerTemplate);

    let answerChain = RunnableSequence.from([
      answerPrompt,
      llm,
      new StringOutputParser(),
    ]);

    let chain = RunnableSequence.from([
      {
        standalone_question: standaloneQuestionChain,
        originalInput: new RunnablePassthrough(),
      },
      {
        context: retrieverChain,
        question: ({ originalInput }) => originalInput.question,
        conversationHistory: ({ originalInput }) =>
          originalInput.conversationHistory,
      },
      answerChain,
    ]);

    let response = await chain.invoke({
      question: movieQuestion,
      conversationHistory: conversationHistory,
    });

    // console.log(response);

    // conversationEntry.response = response;

    conversationHistory.push(`ai-agent: ${response}`);

    res.json({
      success: true,
      response: response,
    });
  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).json({
      error: "Failed to process message",
      details: error.message,
    });
  }
});

app.post("/api/punctuate-text", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({
        error: "Text is required and must be a non-empty string",
      });
    }

    const llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 3,
    });

    let punctuateTextTemplate =
      "Given a text, punctuate it. text: {text} punctuated text:";

    let punctuateTextPrompt = PromptTemplate.fromTemplate(
      punctuateTextTemplate,
    );

    let grammarTemplate = `Given a sentence correct the grammar.
      sentence: {punctuated_sentence}
      sentence with correct grammar:`;

    let grammarPrompt = PromptTemplate.fromTemplate(grammarTemplate);

    const translationTemplate = `Given a sentence, translate that sentence into {language}
      sentence: {grammatically_correct_sentence}
      translated sentence:`;
    const translationPrompt = PromptTemplate.fromTemplate(translationTemplate);

    let punctuateTextChain = RunnableSequence.from([
      punctuateTextPrompt,
      llm,
      new StringOutputParser(),
    ]);

    let grammarChain = RunnableSequence.from([
      grammarPrompt,
      llm,
      new StringOutputParser(),
    ]);

    let translationChain = RunnableSequence.from([
      translationPrompt,
      llm,
      new StringOutputParser(),
    ]);

    let chain = RunnableSequence.from([
      {
        punctuated_sentence: punctuateTextChain,
        originalInput: new RunnablePassthrough(),
      },
      {
        grammatically_correct_sentence: grammarChain,
        language: ({ originalInput }) => originalInput.language,
      },
      translationChain,
    ]);

    let response = await chain.invoke({
      text: text,
      language: "french",
    });

    console.log(response);

    res.json({
      success: true,
      response: response,
    });
  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).json({
      error: "Failed to process message",
      details: error.message,
    });
  }
});

// Start server and load documents at startup
async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`\n✓ Documents loaded and ready to use!\n`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
