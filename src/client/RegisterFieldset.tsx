import { useState } from "react";

export function RegisterFieldset() {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <fieldset>
      <legend>Register a new key</legend>
      {url ? (
        <button onClick={() => setUrl(null)}>Regitered. Want more?</button>
      ) : (
        <button
          onClick={() => {
            setLoading(true);
            fetch("/api/register")
              .then((response) => response.blob())
              .then((blob) => {
                setUrl(window.URL.createObjectURL(blob));
              })
              .finally(() => {
                setLoading(false);
              });
          }}
          disabled={loading}
        >
          Register
        </button>
      )}
      {url && (
        <a href={url} download="secret.key">
          Download secret key
        </a>
      )}
    </fieldset>
  );
}
