"use client";
import { useState } from 'react';

const jsVerify = `import { computeCidJcs, verifyReceiptExport } from 'signet-verify-js';

// Recompute CID for a normalized receipt
async function recomputeCid(receipt) {
  const norm = receipt.normalized ?? { Document: { Echo: receipt.payload } };
  return await computeCidJcs(norm);
}

// Verify exported bundle signature
function verifyBundle(bundle, responseCid, signatureB64u, jwk) {
  return verifyReceiptExport(bundle, responseCid, signatureB64u, jwk);
}`;

const pyVerify = `from signet_verify.verify import compute_cid_jcs, verify_export_bundle

def recompute_cid(receipt: dict) -> str:
    norm = receipt.get('normalized') or { 'Document': { 'Echo': receipt.get('payload') } }
    return compute_cid_jcs(norm)

def verify_bundle(bundle: dict, response_cid: str, signature_b64u: str, jwk: dict) -> bool:
    return verify_export_bundle(bundle, response_cid, signature_b64u, jwk)`;

const curlExamples = `# Exchange (idempotency key and headers captured)
curl -s -X POST "$CORE_API_URL/v1/exchange" \\
  -H "content-type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{"payload_type":"demo.echo","target_type":"demo.echo","payload":{"msg":"hi"}}'

# Get chain
curl -s "$CORE_API_URL/v1/receipts/chain/<trace_id>" | jq .

# Export bundle (capture headers for verification)
resp=$(curl -i -s "$CORE_API_URL/v1/receipts/export/<trace_id>")
sig=$(echo "$resp" | awk -F': ' '/X-ODIN-Signature/{print $2}' | tr -d '\r')
kid=$(echo "$resp" | awk -F': ' '/X-ODIN-KID/{print $2}' | tr -d '\r')
cid=$(echo "$resp" | awk -F': ' '/X-ODIN-Response-CID/{print $2}' | tr -d '\r')
body=$(echo "$resp" | sed -n '/^{/,$p')
echo "Signature=$sig Kid=$kid ResponseCID=$cid"`;

function CodeBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">{title}</span>
        <button onClick={()=>{navigator.clipboard.writeText(code); setCopied(true); setTimeout(()=>setCopied(false),1500);}} className="text-xs underline text-blue-400">{copied? 'Copied' : 'Copy'}</button>
      </div>
      <pre className="bg-neutral-900 rounded p-3 overflow-auto text-xs leading-relaxed" data-testid={`snippet-${title.toLowerCase().replace(/[^a-z0-9]/g,'-')}`}>{code}</pre>
    </div>
  );
}

export default function SDKHubPage() {
  return (
    <main className="mx-auto max-w-5xl p-6 space-y-8">
      <h1 className="text-2xl font-semibold">SDK Hub</h1>
      <p className="text-sm text-neutral-500">Copy-paste snippets for verifying chains and computing CIDs using the official JS & Python SDKs.</p>
      <div className="grid md:grid-cols-2 gap-8">
        <CodeBlock title="JavaScript Verify & CID" code={jsVerify} />
        <CodeBlock title="Python Verify & CID" code={pyVerify} />
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-2">cURL Examples</h2>
        <CodeBlock title="curl-examples" code={curlExamples} />
      </div>
      <p className="text-xs text-neutral-600">Ensure you fetch the JWKS (/.well-known/jwks.json) to select the correct Ed25519 key (kid).</p>
    </main>
  );
}
