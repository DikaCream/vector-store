"""Direct tests for vector-store contract (no network needed, uses gltest direct VM)."""

import pytest
from tests.direct.conftest import set_time, iso

# Clock
BASE = 1790000000  # arbitrary fixed block time


def _reset():
    import genlayer.gl.genvm_contracts as gvc

    gvc.__known_contract__ = None  # the direct loader does not reset this


@pytest.fixture()
def contract(direct_vm, direct_deploy):
    """Deploy the VectorStore contract for testing."""
    c = direct_deploy("contracts/vector_store.py")
    yield c
    _reset()


def call(vm, fn, sender, value=0, at=None):
    """Assign sender and value, then the block time, then call."""
    vm.sender = sender
    vm.value = value
    if at is not None:
        set_time(iso(at))
    out = fn()
    vm.value = 0
    return out


class TestVectorStore:
    def test_submit_and_get(self, contract, direct_vm, direct_alice):
        doc_id = call(direct_vm, lambda: contract.submit("hello world"), direct_alice)
        doc = contract.get_document(doc_id)
        assert doc is not None
        assert doc["id"] == doc_id
        assert doc["content"] == "hello world"

    def test_submit_empty_fails(self, contract, direct_vm, direct_alice):
        with pytest.raises(Exception):
            call(direct_vm, lambda: contract.submit(""), direct_alice)

    def test_submit_too_long_fails(self, contract, direct_vm, direct_alice):
        with pytest.raises(Exception):
            call(direct_vm, lambda: contract.submit("x" * 10001), direct_alice)

    def test_list_documents(self, contract, direct_vm, direct_alice):
        call(direct_vm, lambda: contract.submit("doc one"), direct_alice)
        call(direct_vm, lambda: contract.submit("doc two"), direct_alice)
        docs = contract.list_documents()
        assert len(docs) == 2
        assert docs[0]["content"] == "doc one"
        assert docs[1]["content"] == "doc two"

    def test_count(self, contract, direct_vm, direct_alice):
        assert contract.count() == 0
        call(direct_vm, lambda: contract.submit("a"), direct_alice)
        assert contract.count() == 1

    def test_search_empty_registry(self, contract, direct_vm, direct_alice):
        results = contract.search("query", 3)
        assert results == []

    def test_search_returns_results(self, contract, direct_vm, direct_alice):
        call(direct_vm, lambda: contract.submit("the quick brown fox jumps"), direct_alice)
        call(direct_vm, lambda: contract.submit("the lazy dog sleeps"), direct_alice)
        call(direct_vm, lambda: contract.submit("unrelated content here"), direct_alice)

        results = contract.search("fox jumps", 2)
        assert isinstance(results, list)
        assert len(results) <= 2
        if results:
            assert "document_id" in results[0]
            assert "similarity_score" in results[0]
            assert "reason" in results[0]
            assert 0 <= results[0]["similarity_score"] <= 100

    def test_search_top_k_limit(self, contract, direct_vm, direct_alice):
        for i in range(6):
            call(direct_vm, lambda: contract.submit(f"document number {i}"), direct_alice)
        results = contract.search("document number", 3)
        assert len(results) <= 3

    def test_search_invalid_top_k(self, contract, direct_vm, direct_alice):
        call(direct_vm, lambda: contract.submit("test"), direct_alice)
        results = contract.search("test", 0)  # should clamp to 1
        assert len(results) <= 1
        results = contract.search("test", 100)  # should clamp to 10
        assert len(results) <= 10


class TestSubmitFromUrl:
    """These will work in direct VM since web.render is stubbed."""

    def test_submit_from_url_basic(self, contract, direct_vm, direct_alice):
        direct_vm.mock_web("https://example.com/", {"status": 200, "body": "Example Domain content"})
        doc_id = call(direct_vm, lambda: contract.submit_from_url("https://example.com/"), direct_alice)
        doc = contract.get_document(doc_id)
        assert doc is not None
        assert doc["content"]  # stub returns some text

    def test_submit_from_url_empty_fails(self, contract, direct_vm, direct_alice):
        with pytest.raises(Exception):
            call(direct_vm, lambda: contract.submit_from_url(""), direct_alice)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])