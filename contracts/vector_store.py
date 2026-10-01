# { "Seq": [ { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" } ] }
"""vector-store: text-similarity registry using web text fetch + equivalence principle.

No embeddings required. A user submits a text document (or URL that renders text).
A query finds the most similar document in the registry by asking validators to compare
texts under a similarity principle. The equivalence principle ensures consensus.
"""

import json
import re
from dataclasses import dataclass
from typing import List, Optional

from genlayer import *  # noqa: F401 - re-exports gl, allow_storage, DynArray, u256
import genlayer.gl as gl


import datetime

# ---------- data model ----------
@allow_storage
@dataclass
class Document:
    id: u256
    content: str
    submitter: Address
    timestamp: u256


@allow_storage
@dataclass
class SearchResult:
    document_id: u256
    similarity_score: u256  # 0-100
    reason: str


# ---------- helpers ----------
_SIMPLE_WORD_RE = re.compile(r"[a-zA-Z0-9']+")


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _word_overlap_ratio(a: str, b: str) -> float:
    """Quick local heuristic: Jaccard over word sets. Not consensus, just a hint."""
    sa = set(_SIMPLE_WORD_RE.findall(a.lower()))
    sb = set(_SIMPLE_WORD_RE.findall(b.lower()))
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def _now() -> int:
    """Get current timestamp from message metadata (same pattern as VisualProof)."""
    raw = gl.message_raw.get("datetime")
    if raw is None:
        return 0
    try:
        return int(datetime.datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp())
    except Exception:
        return 0


# ---------- contract ----------
class VectorStore(gl.Contract):
    """Text similarity registry. Documents stored as plain text, searched via LLM judgment."""

    documents: DynArray[Document]
    next_id: u256

    def __init__(self):
        self.documents = []
        self.next_id = 1

    # ---------- views ----------
    @gl.public.view
    def get_document(self, doc_id: u256) -> Optional[dict]:
        for d in self.documents:
            if d.id == doc_id:
                return {
                    "id": int(d.id),
                    "content": d.content,
                    "submitter": d.submitter,
                    "timestamp": int(d.timestamp),
                }
        return None

    @gl.public.view
    def list_documents(self) -> List[dict]:
        return [
            {
                "id": int(d.id),
                "content": d.content[:200] + ("..." if len(d.content) > 200 else ""),
                "submitter": d.submitter,
                "timestamp": int(d.timestamp),
            }
            for d in self.documents
        ]

    @gl.public.view
    def count(self) -> u256:
        return u256(len(self.documents))

    # ---------- writes ----------
    @gl.public.write
    def submit(self, content: str) -> u256:
        """Store a text document. Returns its ID."""
        if not content or not content.strip():
            raise gl.vm.UserError("content cannot be empty")
        if len(content) > 10000:
            raise gl.vm.UserError("content too long (max 10000 chars)")

        doc_id = self.next_id
        self.next_id += 1

        doc = Document(
            id=doc_id,
            content=content.strip(),
            submitter=gl.message.sender_address,
            timestamp=u256(_now()),
        )
        self.documents.append(doc)
        return doc_id

    @gl.public.write
    def search(self, query: str, top_k: u256 = 3) -> List[SearchResult]:
        """Find the most similar documents to the query using LLM judgment."""
        if not query or not query.strip():
            raise gl.vm.UserError("query cannot be empty")
        if not self.documents:
            return []

        top_k_val = max(1, min(int(top_k), 10))

        # Build candidate list with local heuristic scores for the LLM context
        candidates = []
        q_norm = _normalize(query)
        for doc in self.documents:
            overlap = _word_overlap_ratio(q_norm, _normalize(doc.content))
            candidates.append({
                "id": int(doc.id),
                "content": doc.content[:500] + ("..." if len(doc.content) > 500 else ""),
                "overlap_hint": round(overlap, 3),
            })
        # Sort by hint so the LLM sees best candidates first
        candidates.sort(key=lambda x: x["overlap_hint"], reverse=True)
        candidates = candidates[: min(top_k_val * 3, len(candidates))]

        def _build_prompt() -> str:
            """Leader function: builds the prompt for the similarity judge."""
            prompt = (
                "You are a text similarity judge. Given a query and candidate documents, "
                "return the top matches ranked by semantic similarity (meaning, not just words). "
                "Output ONLY a JSON array of objects with fields: "
                "document_id (int), similarity_score (0-100 int), reason (short string). "
                "Example: "
                '[{"document_id": 1, "similarity_score": 85, "reason": "same topic and structure"}]\n\n'
                f"Query: {query}\n\nCandidates:\n"
                + "\n".join(
                    f'  {c["id"]}: "{c["content"]}" (overlap_hint={c["overlap_hint"]})'
                    for c in candidates
                )
            )
            return prompt

        principle = (
            "Two answers are equivalent if they select the same top documents in the same "
            "order with comparable scores (\u00b115 points) and coherent reasons. Minor wording "
            "differences in reasons are acceptable."
        )

        raw = gl.eq_principle.prompt_comparative(_build_prompt, principle)

        try:
            results = json.loads(str(raw))
            if not isinstance(results, list):
                return []
            out = []
            for r in results[:top_k_val]:
                if isinstance(r, dict) and "document_id" in r:
                    out.append(SearchResult(
                        document_id=u256(int(r["document_id"])),
                        similarity_score=u256(max(0, min(100, int(r.get("similarity_score", 0))))),
                        reason=str(r.get("reason", ""))[:200],
                    ))
            return out
        except Exception:
            return []


# ---------- convenience: fetch text from URL and submit ----------
    @gl.public.write
    def submit_from_url(self, url: str) -> u256:
        """Fetch a public page as text and store it. Returns the document ID."""
        if not url or not url.strip():
            raise gl.vm.UserError("url cannot be empty")

        def _fetch() -> str:
            return gl.nondet.web.render(url.strip(), mode="text")

        principle = (
            "Two answers are equivalent if they contain the same main textual content "
            "(titles, headings, body text). Minor differences in whitespace, navigation "
            "boilerplate, or dynamic timestamps are acceptable."
        )

        text = gl.eq_principle.prompt_comparative(_fetch, principle)
        if not text or not str(text).strip():
            raise gl.vm.UserError("fetched page has no readable text")

        return self.submit(str(text))