import "dotenv/config";
import { readFile } from "fs/promises";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";

/**
 * Function to load and split text file at startup
 */

try {
  console.log("📄 Loading and splitting documents...");

  // Path to your text file
  const textFilePath = path.join(process.cwd(), "data", "document.txt");

  // Read the text file
  const text = await readFile(textFilePath, "utf-8");
  console.log(`✓ Loaded text file (${text.length} characters)`);

  // Initialize the text splitter
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 600, // Keeps individual movies together
    chunkOverlap: 100, // Better context continuity (16% overlap)
    separators: [
      "--------------------------------------------------",
      "\n\n",
      "\n",
      " ",
      "",
    ], // Respects movie boundaries
  });

  // Split the text into chunks
  const output = await splitter.createDocuments([text]);

  let superbaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
  );
  let vectorStore = await SupabaseVectorStore.fromDocuments(
    output,
    new OpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY }),
    {
      client: superbaseClient,
      tableName: "documents",
      queryName: "match_documents",
    },
  );
  console.log("✓ Documents split and stored in Supabase");
} catch (error) {
  console.error("❌ Error loading documents:", error.message);
  throw error;
}
