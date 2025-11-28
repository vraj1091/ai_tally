# AI Tally Assistant - API Reference

## Base URL

- Local development: `http://localhost:8000/api`

---

## Authentication

- Currently no authentication (future: OAuth, JWT planned)

---

## Endpoints

### Chat API

- **POST** `/chat/initialize/{company_name}`
  - Initialize chatbot with specific Tally company data
  - Request body parameters:
    - `tally_url` (optional): Remote Tally server URL
  - Response: Success status and message

- **POST** `/chat/upload-and-ingest/{company_name}`
  - Upload a document and ingest combined with Tally data
  - Accepts multipart form-data: `file`
  - Optional query: `tally_url`
  - Response: Success status, file details

- **POST** `/chat/chat`
  - Query the combined RAG system
  - Body params:
    - `query`: User question string
    - `company_name`: Company context
    - `collection_name`: Collection to query
    - `tally_url`: Tally server URL
  - Response: Answer, sources, and success flag

- **GET** `/chat/collections`
  - List all vector store collections

- **POST** `/chat/load-collection/{collection_name}`
  - Load an existing collection into memory

- **DELETE** `/chat/collection/{collection_name}`
  - Delete a specific vector collection

---

### Tally API

- **POST** `/tally/connect`
  - Connect to Tally server with URL in body
  - Response: Connection status

- **GET** `/tally/companies`
  - List companies from Tally server

- **GET** `/tally/ledgers/{company_name}`
  - List ledgers for the company

- **GET** `/tally/vouchers/{company_name}`
  - List vouchers with optional filters (`from_date`, `to_date`, `voucher_type`)

- **GET** `/tally/status`
  - Connection status check

- **GET** `/tally/summary/{company_name}`
  - Financial summary data

---

### Documents API

- **POST** `/documents/upload`
  - Upload document file

- **POST** `/documents/extract-text`
  - Extract text from uploaded document

- **GET** `/documents/list`
  - List uploaded documents

- **DELETE** `/documents/delete/{filename}`
  - Delete document by filename

---

### Analytics API

- **GET** `/analytics/company/{company_name}`
  - Financial analytics for a company

- **GET** `/analytics/all-companies`
  - Analytics for all companies

- **GET** `/analytics/health-score/{company_name}`
  - Health score 0-100

- **GET** `/analytics/compare`
  - Compare multiple companies with query param `companies` (comma-separated list)

---

### Vector Store API

- **GET** `/vector-store/collections`
  - List collections

- **POST** `/vector-store/collections`
  - Create collection (name, metadata)

- **GET** `/vector-store/collections/{collection_name}`
  - Get collection info

- **DELETE** `/vector-store/collections/{collection_name}`
  - Delete collection

- **POST** `/vector-store/documents`
  - Add documents to collection

- **POST** `/vector-store/query`
  - Query within a collection

- **GET** `/vector-store/stats`
  - Vector store statistics

---

### Google Drive API

- **GET** `/google-drive/files`
  - List files in folder (query param: `folder_id`)

- **GET** `/google-drive/download/{file_id}`
  - Download file by ID

- **POST** `/google-drive/ingest/{file_id}`
  - Download and ingest file

- **POST** `/google-drive/ingest-folder/{folder_id}`
  - Ingest all files in folder

- **GET** `/google-drive/status`
  - Check Drive connection status

---

## Notes

- All POST endpoints accept JSON or multipart form data as applicable.
- Use `tally_url` query parameter to specify remote Tally server.
- Responses include standardized success flags and message fields.

---

*For detailed examples, see API Swagger docs at `/docs`*
 
