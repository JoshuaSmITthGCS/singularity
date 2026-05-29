import { dataResponse, errorResponse } from "@/lib/api"
import { getGitHubWebhookSecret } from "@/lib/github/app"
import { verifyGitHubSignature } from "@/lib/github/octokit"

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("x-hub-signature-256")

  const verified = verifyGitHubSignature({
    body,
    signature,
    secret: getGitHubWebhookSecret(),
  })

  if (!verified) return errorResponse("Invalid signature", 401)

  return dataResponse({ received: true })
}
