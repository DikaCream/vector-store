# vector-store

Text similarity registry on GenLayer. Users submit documents as plain text or fetch from public URLs. Queries return the most semantically similar documents using LLM comparative judgment — no embeddings, no off-chain index. Runs on StudioNet today.

- App: https://frontend-steel-delta-23.vercel.app
- Contract on StudioNet: `0xC63bc01CfB0296287Cf3dc4Ec508989099661391`
- Repo: https://github.com/DikaCream/vector-store

## How it works

1. **Submit text.** Call `submit(content)` with any string up to 10,000 chars. Stored on chain with submitter and timestamp.
2. **Submit from URL.** Call `submit_from_url(url)` — validators fetch the page via `gl.nondet.web.render`, reach consensus on the extracted text, store that.
3. **Search.** Call `search(query, top_k)` — validators compare the query against every stored document using `gl.eq_principle.prompt_comparative`, return top-k with similarity scores and reasoning.
4. **List & count.** `listDocuments()` returns all entries. `count()` returns total.

No vector database. No embedding model. Semantic similarity is computed at query time by GenLayer validators using the equivalence principle.

## GenLayer primitives used

- **Web text fetch + equivalence** (`gl.nondet.web.render` + `gl.eq_principle.prompt_comparative`) — deterministic fetch of public page content with validator consensus on extracted text
- **LLM comparative judgment** (`gl.eq_principle.prompt_comparative`) — validators agree on which documents are most semantically similar to a query

## Contract

`contracts/vector_store.py` — 213 lines. State: `documents[]` array of `Document { id, content, submitter, timestamp }`.

Methods:
- `submit(content: str) -> document_id`
- `submit_from_url(url: str) -> document_id`
- `search(query: str, top_k: uint256) -> SearchResult[]` where `SearchResult { document_id, similarity_score, reason }`
- `getDocument(id: uint256) -> Document`
- `listDocuments() -> Document[]`
- `count() -> uint256`

## Tests

11 direct tests cover submit, submit_from_url, search, list, count, edge cases: `tests/direct/test_vector_store.py`.

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python -m pytest tests/direct/test_vector_store.py -v
```

StudioNet deploy + seed: `tests/deploy_seed_vectorstore.py` — deploys fresh contract, seeds 4 documents, runs 3 searches, asserts all 7 transactions FINALIZED with MAJORITY_AGREE.

```bash
gltest --network studionet tests/deploy_seed_vectorstore.py -v -s
```

## Frontend

`frontend/` — Vite + React + TypeScript + viem + genlayer-js. Pages: Board (submit + search), DocumentPage (detail), HowItWorks.

```bash
cd frontend && npm install && npm run dev
```

Deployed on Vercel: https://frontend-steel-delta-23.vercel.app

## Run locally

```bash
# Contract tests
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python -m pytest tests/direct/test_vector_store.py -v

# Frontend
cd frontend && npm install && npm run dev
```

## License

MIT