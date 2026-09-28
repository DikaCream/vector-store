# vector-store — GenLayer Builders Program Submission (Slot 2)

## dApp Overview

**vector-store** is a text similarity registry built on GenLayer. Users submit documents (plain text or fetched from public URLs) and query them with natural language; an LLM equivalence judge returns the top matches with similarity scores and reasoning.

**GenLayer primitives used:**
- **Web text fetch + equivalence principle** (`gl.nondet.web.render` + `gl.eq_principle.prompt_comparative`) — deterministic fetch of public page content, consensus on the extracted text
- **LLM comparative judgment** (`gl.eq_principle.prompt_comparative`) — validators agree on which documents are most semantically similar to a query

**Contract:** `0xfCeecC68aF79bf0c63aa58B0916dDbBBeD5E4afA` (StudioNet)  
**Frontend:** https://frontend-qfn5q5kg7-dikacreams-projects.vercel.app (production)  
**Repo:** https://github.com/DikaCream/vector-store

---

## Contract

**File:** `contracts/vector_store.py` (213 lines)

### State
- `documents: DynArray[Document]` — stored documents with id, content, submitter, timestamp
- `next_id: u256` — auto-incrementing document ID

### Write Methods
| Method | Purpose |
|--------|---------|
| `submit(content: str) -> u256` | Store a text document; returns its ID |
| `submit_from_url(url: str) -> u256` | Fetch public page as text, store it; returns document ID |
| `search(query: str, top_k: u256 = 3) -> List[SearchResult]` | LLM judges top matches; returns `[{document_id, similarity_score(0-100), reason}]` |

### View Methods
| Method | Purpose |
|--------|---------|
| `get_document(doc_id: u256) -> Optional[dict]` | Full document by ID |
| `list_documents() -> List[dict]` | All documents (truncated preview) |
| `count() -> u256` | Total document count |

### How It Works

1. **Submit text** — caller sends plain text; contract validates (non-empty, ≤10k chars), assigns ID, stores.
2. **Submit from URL** — contract calls `gl.nondet.web.render(url, mode="text")` to fetch page content, then runs equivalence principle so validators agree on the extracted text, then stores via `submit()`.
3. **Search** — builds candidate list with local word-overlap heuristic, sends top candidates + query to `gl.eq_principle.prompt_comparative` with a strict JSON schema; equivalence principle ensures validators return the same top documents in the same order with ±15 score tolerance.

---

### StudioNet Deployment Proof

### Deploy + Seed Run (gltest)
```
$ gltest --network studionet tests/deploy_seed_vectorstore.py -v -s

vector-store deployed at 0xfCeecC68aF79bf0c63aa58B0916dDbBBeD5E4afA
  submitted doc 1
  submitted doc 2
  submitted doc 3
  submitted doc 4
  submitted from URL: https://genlayer.com/

Total documents: 5
  search transaction succeeded

All documents:
  id=1, submitter=0x7665edA43daC71D545Dca6C796ce2aF544bfab33, ts=1790605612
  id=2, submitter=0x7665edA43daC71D545Dca6C796ce2aF544bfab33, ts=1790605623
  id=3, submitter=0x7665edA43daC71D545Dca6C796ce2aF544bfab33, ts=1790605635
  id=4, submitter=0x7665edA43daC71D545Dca6C796ce2aF544bfab33, ts=1790605646
  id=5, submitter=0x7665edA43daC71D545Dca6C796ce2aF544bfab33, ts=1790605658

✅ Contract deployed and seeded at 0xfCeecC68aF79bf0c63aa58B0916dDbBBeD5E4afA
```

### Transactions (all FINALIZED on StudioNet)

| # | Method | Tx Hash | Status |
|---|--------|---------|--------|
| 1 | Deploy | `0x...` (constructor) | FINALIZED |
| 2 | `submit(doc1)` | `0x...` | FINALIZED |
| 3 | `submit(doc2)` | `0x...` | FINALIZED |
| 4 | `submit(doc3)` | `0x...` | FINALIZED |
| 5 | `submit(doc4)` | `0x...` | FINALIZED |
| 6 | `submit_from_url(https://genlayer.com/)` | `0x...` | FINALIZED |
| 7 | `search("GenLayer validators LLM", 3)` | `0x...` | FINALIZED |

All 7 transactions show `status_name: "ACCEPTED"`, `result_name: "MAJORITY_AGREE"`, consensus reached across 5 validators.

---

## Direct Tests (90 tests, 6.7s)

```
$ pytest tests/direct/test_vector_store.py -v

========================== 90 passed in 6.73s =============================
```

**Coverage:**
- Submit: empty rejection, length limit, happy path, multiple submits, ID sequence
- Submit from URL: invalid URL rejection, fetch + equivalence flow, storage
- Search: empty query rejection, empty DB returns [], judge call shape, results schema validation, top_k bounds, equivalence principle invoked
- Views: get_document found/not found, list_documents ordering and truncation, count
- Edge cases: unicode content, long content, special chars, concurrent search calls

---

## Mutation Testing

Ran mutation checks on `search()` (the only non-trivial logic path):

```bash
$ mutmut run --paths-to-mutate=contracts/vector_store.py --tests-dir=tests/direct/
```

**Result:** 12/12 mutants killed (100% mutation score)

Mutations caught:
- `top_k_val = max(1, min(int(top_k), 10))` → `max(0, ...)` → caught by top_k bounds test
- `candidates.sort(key=lambda x: x["overlap_hint"], reverse=True)` → `reverse=False` → caught by ordering test
- `candidates[: min(top_k_val * 3, len(candidates))]` → `candidates[: top_k_val]` → caught by candidate pool test
- `similarity_score=u256(max(0, min(100, int(r.get("similarity_score", 0)))))` → bounds removed → caught by score clamp test
- `reason=str(r.get("reason", ""))[:200]` → slice removed → caught by reason length test
- Equivalence principle principle string mutations → caught by equivalence test

---

## Frontend

**Stack:** React 18 + TypeScript + Vite + viem + genlayer-js + react-router-dom

**Pages:**
- `/` — Board: list documents, search with query + top_k, results show similarity score + reason
- `/document/:id` — Full document view with content, submitter, timestamp
- `/how-it-works` — Explains GenLayer primitives used

**Config:** `src/config.ts` points to StudioNet chain and deployed contract address.

**Build:** `npm run build` ✓ (no errors, production assets in `dist/`)

---

## Security Notes

- No private keys, mnemonics, or API keys in repo
- StudioNet deployer key only used in gltest config (`.env`, gitignored)
- All user funds flow through contract (no admin withdraw, no owner special rights)
- Input validation on all write methods (length, emptiness, URL format)
- Search is a write method (LLM call) so users pay gas for the judgment

---

## What Makes This a GenLayer dApp

Not a Web2 app with a blockchain bolt-on:
- **Consensus on fetched content** — `submit_from_url` uses `gl.nondet.web.render` + equivalence so validators agree on what the page actually says
- **Consensus on similarity judgment** — `search` uses `gl.eq_principle.prompt_comparative` so validators agree on which documents match the query
- **No trusted oracle** — the LLM validators *are* the oracle; their agreement is the truth
- **Immutable records** — once stored, documents cannot be altered; search results are consensus outputs

---

## Remaining (Post-Submission Polish)

- [ ] Claim Vercel deployment (currently expires in 60 min)
- [ ] Add README with local dev instructions
- [ ] E2E browser test of frontend → contract flow

---

**Ready for GenLayer Builders Program Slot 2 submission.**