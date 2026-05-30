// §11.4 / RFC 9116: responsible vulnerability disclosure metadata served at
// /.well-known/security.txt.
export function GET() {
  const body = [
    "Contact: mailto:security@singularity.io",
    "Expires: 2027-01-01T00:00:00.000Z",
    "Preferred-Languages: en",
    "Canonical: https://singularity.io/.well-known/security.txt",
    "Policy: https://docs.singularity.io/security/disclosure",
    "",
  ].join("\n")

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
