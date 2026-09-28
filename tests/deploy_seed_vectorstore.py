"""Deploy vector-store on StudioNet and seed with sample documents.

Run: gltest --network studionet tests/deploy_seed_vectorstore.py -v -s

The board it leaves behind:
  1  Document about GenLayer basics
  2  Document about Intelligent Contracts
  3  Document about consensus
  4  Document about embeddings (for contrast)
  5  Document from URL (web fetch)

Print the contract address at the end; it goes into the frontend config.
"""

import time

from gltest import get_accounts, get_contract_factory
from gltest.assertions import tx_execution_succeeded

GEN = 10**18


def _retry(fn, tries=4, pause=8, what="call"):
    last = None
    for i in range(tries):
        try:
            return fn()
        except Exception as e:  # noqa: BLE001 - any transient error retries
            last = e
            print(f"  [retry] {what} attempt {i + 1} failed: {str(e)[:140]}")
            time.sleep(pause)
    raise last


def test_seed():
    accounts = get_accounts()
    deployer = accounts[0]

    c = get_contract_factory("VectorStore").deploy(account=deployer)
    print(f"\nvector-store deployed at {c.address}")

    # Seed with sample documents
    docs = [
        "GenLayer is a blockchain where validators are LLMs. Intelligent Contracts can read the web, reason, and reach consensus on subjective tasks.",
        "Intelligent Contracts combine deterministic code with non-deterministic LLM calls. The equivalence principle ensures validators agree on outcomes.",
        "Consensus on GenLayer uses optimistic execution with a challenge window. Validators propose, commit, and reveal votes. Appeals extend the game.",
        "Embeddings require a model runner. StudioNet v0.3.0-rc7 does not have py-lib-genlayermodelwrappers. vector-store uses web text fetch + equivalence instead.",
    ]

    for i, content in enumerate(docs, 1):
        receipt = _retry(
            lambda: c.connect(deployer).submit(args=[content]).transact(wait_interval=10000, wait_retries=20),
            what=f"submit doc {i}",
        )
        assert tx_execution_succeeded(receipt)
        print(f"  submitted doc {i}")

    # Submit from URL
    url = "https://genlayer.com/"
    receipt = _retry(
        lambda: c.connect(deployer).submit_from_url(args=[url]).transact(wait_interval=15000, wait_retries=25),
        what="submit from url",
    )
    assert tx_execution_succeeded(receipt)
    print(f"  submitted from URL: {url}")

    # Verify count
    count = c.count(args=[]).call()
    print(f"\nTotal documents: {count}")

    # Test search (using transact since it's a write method)
    results_tx = c.search(args=["GenLayer validators LLM", 3]).transact(wait_interval=30000, wait_retries=40)
    assert tx_execution_succeeded(results_tx)
    print(f"  search transaction succeeded")

    # List documents
    docs = c.list_documents(args=[]).call()
    print(f"\nAll documents:")
    for d in docs:
        print(f"  id={d['id']}, submitter={d['submitter']}, ts={d['timestamp']}")

    print(f"\n✅ Contract deployed and seeded at {c.address}")
    print(f"   Frontend config: CONTRACT_ADDRESS = \"{c.address}\"")


if __name__ == "__main__":
    test_seed()