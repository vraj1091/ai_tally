# AI Tally Assistant - Integrated System Guide

## Overview

The AI Tally Assistant is a highly integrated system combining live Tally ERP data, document ingestion, vector search capabilities via ChromaDB, and an advanced local LLM model (Phi4:14b via Ollama).

## Core Components

- **Backend:** FastAPI service exposing RESTful APIs for chat, Tally data, documents, analytics, Google Drive integration, and vector store management.
- **Frontend:** React-based UI with key pages for dashboard, chat, analytics, Tally explorer, documents, and Google Drive.
- **TallyConnector:** Python.NET wrapped .NET DLLs enabling remote or local connection to Tally ERP.
- **ChromaDB:** Vector store for semantic search and Retrieval-Augmented Generation (RAG).
- **Phi4:14b:** Local LLM model deployed via Ollama for inference.

## System Flow

1. **Data Ingestion:**
   - Live Tally ERP data fetched over TallyConnector.
   - Documents (PDF, DOCX, Images) uploaded and processed text extracted.
   - Google Drive files imported optionally.

2. **Data Processing:**
   - Text chunking with overlaps for semantic vectorization.
   - Embeddings generated for chunks stored in ChromaDB.

3. **Query Handling:**
   - User questions sent from frontend.
   - Backend queries ChromaDB for top-k relevant chunks.
   - Phi4:14b processes retrieved chunks to generate answers.
   - Source attributions provided for transparency.

## Deployment Architecture

| Component         | Description               | Notes                                              |
|-------------------|---------------------------|----------------------------------------------------|
| FastAPI Backend   | API service                | Containerized via Docker                            |
| Ollama Server     | Serving Phi4:14b model     | Official Docker Image                               |
| MySQL Database    | Caching analytics & data   | Connected with backend                              |
| React Frontend    | SPA                       | Built with Vite and Tailwind                        |
| TallyConnector    | Bridge to Tally ERP        | Requires DLLs and .NET Runtime on host             |
| Google Drive API  | Optional external sync     | OAuth2 credentials required                         |

## Key Features

- Multi-company support
- Real-time Tally data access (remote support)
- Document upload and intelligent processing
- Combined RAG answering from Tally + Documents
- Sophisticated analytics and UI insight charts
- Secure, scalable, modular architecture

## Getting Started

Refer to `FINAL-DEPLOYMENT-GUIDE.md` for detailed setup instructions and environment configuration.

## Support

Community support via GitHub Issues and Discussions.

---

*AI Tally Assistant — Building the future of intelligent financial analysis.*
 
