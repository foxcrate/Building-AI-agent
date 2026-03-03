# Building AI Agent with Document Splitting

This application demonstrates how to split text documents at startup using LangChain and make them available through API endpoints.

## How It Works

### 1. Startup Process
- When the server starts, it automatically loads `data/document.txt`
- The text is split into chunks using LangChain's `RecursiveCharacterTextSplitter`
- Chunks are stored in memory and saved to `data/chunks.json`
- The server then starts accepting API requests

### 2. Configuration
The text splitter is configured with:
- **Chunk Size**: 1000 characters per chunk
- **Chunk Overlap**: 200 characters overlap between chunks (maintains context)
- **Separators**: Splits on paragraphs, lines, spaces (in that order)

You can adjust these in the `loadAndSplitDocuments()` function.

### 3. API Endpoints

#### Get All Chunks
```bash
GET /api/chunks
```
Returns all document chunks with their IDs, content, and metadata.

#### Get Specific Chunk
```bash
GET /api/chunks/:id
```
Returns a single chunk by its ID.

#### Search Chunks
```bash
GET /api/search?q=your-query
```
Searches for chunks containing the query text (case-insensitive).

#### Health Check
```bash
GET /api/health
```
Returns server health status and document loading status.

## Usage

### 1. Add Your Own Document
Replace or edit `data/document.txt` with your own text content.

### 2. Start the Server
```bash
npm start
```

### 3. Test the API
```bash
# Get all chunks
curl http://localhost:3000/api/chunks

# Search for specific content
curl http://localhost:3000/api/search?q=machine%20learning

# Get a specific chunk
curl http://localhost:3000/api/chunks/0
```

## Features

✅ **Automatic splitting at startup** - Documents are processed before the server accepts requests  
✅ **In-memory storage** - Fast access to chunks during runtime  
✅ **Persistent storage** - Chunks saved to JSON file  
✅ **RESTful API** - Easy access to chunks via HTTP endpoints  
✅ **Search functionality** - Find relevant chunks quickly  
✅ **Status monitoring** - Check if documents are loaded

## Advanced Usage

### Using Chunks with AI/LLM
You can extend this to use chunks with OpenAI or other LLMs:

```javascript
import { OpenAI } from '@langchain/openai';

app.post('/api/ask', async (req, res) => {
  const { question } = req.body;
  
  // Find relevant chunks
  const relevantChunks = documentChunks.filter(chunk => 
    chunk.content.toLowerCase().includes(question.toLowerCase())
  );
  
  // Use chunks as context for LLM
  const context = relevantChunks.map(c => c.content).join('\n\n');
  
  const llm = new OpenAI({ temperature: 0 });
  const response = await llm.call(`Context: ${context}\n\nQuestion: ${question}`);
  
  res.json({ answer: response });
});
```

### Vector Database Integration
For semantic search, integrate with a vector database:
- Supabase (already installed)
- Pinecone
- Weaviate
- Chroma

## Directory Structure

```
Building-AI-agent/
├── data/
│   ├── document.txt     # Your source document
│   └── chunks.json      # Saved chunks (auto-generated)
├── index.js             # Main application
├── package.json
└── .env
```

## Environment Variables

Create a `.env` file if you need to configure:
```env
PORT=3000
```

## Next Steps

1. **Add Vector Search**: Integrate embeddings for semantic search
2. **Database Storage**: Store chunks in Supabase or MongoDB
3. **Multiple Documents**: Support loading multiple files
4. **Real-time Updates**: Watch for file changes and reload
5. **RAG Implementation**: Use chunks for Retrieval-Augmented Generation
