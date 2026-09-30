# vector-store

Text similarity registry on GenLayer StudioNet. Submit documents as plain text or fetch from public URLs. Search returns the most semantically similar documents using LLM comparative judgment — no embeddings, no off-chain index, no vector database.

## Live Deployment

- **App:** https://frontend-steel-delta-23.vercel.app
- **Contract (StudioNet):** `0xC63bc01CfB0296287Cf3dc4Ec508989099661391`
- **Explorer:** https://explorer-studio.genlayer.com/address/0xC63bc01CfB0296287Cf3dc4Ec508989099661391
- **Repository:** https://github.com/DikaCream/vector-store

## How It Works

1. **Submit text** — Call `submit(content)` with any string up to 10,000 characters. Stored on chain with submitter address and block timestamp.
2. **Submit from URL** — Call `submit_from_url(url)`. Validators fetch the page via `gl.nondet.web.render(mode="text")`, reach consensus on the extracted text, and store it.
3. **Search** — Call `search(query, top_k)`. Validators compare the query against every stored document using `gl.eq_principle.prompt_comparative` under an equivalence principle. Returns top-k with similarity scores (0–100) and reasoning.
4. **List and count** — `listDocuments()` returns all entries. `count()` returns total documents.

Semantic similarity runs entirely on chain at query time. No embedding model. No vector database. No off-chain index.

## GenLayer Primitives Used

| Primitive | Purpose |
|-----------|---------|
| `gl.nondet.web.render` | Fetch public page text with validator consensus |
| `gl.eq_principle.prompt_comparative` | LLM judges which documents are most similar to a query; validators must agree on ranking |

Both primitives are live on StudioNet v0.3.0-rc7. The original VectorStore embedding approach was not available.

## Contract

`contracts/vector_store.py` — 213 lines. State: `documents[]` array of `Document { id, content, submitter, timestamp }`.

**Write methods:**
- `submit(content: str) -> document_id`
- `submit_from_url(url: str) -> document_id`

**Read methods:**
- `search(query: str, top_k: uint256) -> SearchResult[]` where `SearchResult = { document_id, similarity_score, reason }`
- `getDocument(id: uint256) -> Document`
- `listDocuments() -> Document[]`
- `count() -> uint256`

## Tests

**Direct tests (local VM):** 11 tests covering submit, submit_from_url, search, list, count, edge cases.

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python -m pytest tests/direct/test_vector_store.py -v
```

**StudioNet integration test:** `tests/deploy_seed_vectorstore.py` — deploys a fresh contract, submits 4 text documents + 1 URL fetch, runs 3 searches, asserts all 7 transactions FINALIZED with MAJORITY_AGREE.

```bash
gltest --network studionet tests/deploy_seed_vectorstore.py -v -s
```

## Frontend

`frontend/` — Vite + React 18 + TypeScript + viem + genlayer-js@1.1.8. Pages: Board (submit + search), DocumentPage (detail), HowItWorks.

```bash
cd frontend && npm install && npm run dev
```

Production build: `npm run build` (outputs to `dist/`). Deployed on Vercel with GitHub Pages workflow configured.

## Run Locally

```bash
# Contract tests
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python -m pytest tests/direct/test_vector_store.py -v

# Frontend dev server
cd frontend && npm install && npm run dev
```

## License

MITtest
