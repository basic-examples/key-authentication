import { useState } from "react";
import { signAsync, hashes, getPublicKeyAsync } from "@noble/ed25519";

hashes.sha512Async = (message) =>
  crypto.subtle
    .digest("SHA-512", new Uint8Array(message))
    .then((buffer) => new Uint8Array(buffer));

export function AuthenticateFieldset() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <fieldset>
      <legend>Authenticate</legend>
      {result ? (
        <button onClick={() => setResult(null)}>
          Authenticated. You are user #{result}. Want more?
        </button>
      ) : loading ? (
        <p>Loading...</p>
      ) : (
        <input
          type="file"
          accept=".key"
          multiple={false}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              setLoading(true);
              file
                .arrayBuffer()
                .then((fileArrayBuffer) =>
                  getPublicKeyAsync(new Uint8Array(fileArrayBuffer))
                )
                .then((publicKey) => {
                  const publicKeyBlob = new Blob([new Uint8Array(publicKey)]);
                  return fetch("/api/authenticate/nonce", {
                    method: "POST",
                    body: publicKeyBlob,
                    headers: { "Content-Type": "application/octet-stream" },
                  })
                    .then((response) => {
                      if (!response.ok) {
                        throw new Error("Failed to get nonce");
                      }
                      return response.arrayBuffer();
                    })
                    .then((data) => {
                      return file
                        .arrayBuffer()
                        .then((fileArrayBuffer) =>
                          signAsync(
                            new Uint8Array(data),
                            new Uint8Array(fileArrayBuffer)
                          )
                        )
                        .then((signature) => {
                          const body = new FormData();
                          body.append(
                            "signature",
                            new Blob([new Uint8Array(signature)])
                          );
                          body.append("publicKey", publicKeyBlob);
                          return fetch("/api/authenticate/signature", {
                            method: "POST",
                            body,
                          });
                        });
                    })
                    .then((response) => {
                      if (!response.ok) {
                        throw new Error("Failed to authenticate");
                      }
                      return response.json();
                    })
                    .then((data) => {
                      setResult(data.seq);
                    });
                })
                .finally(() => {
                  setLoading(false);
                });
            }
          }}
        />
      )}
    </fieldset>
  );
}
