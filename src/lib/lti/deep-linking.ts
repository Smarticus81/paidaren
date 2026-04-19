import { signJwt } from "./keys";
import { LTI_CLAIMS } from "./claims";

interface DeepLinkingSettings {
  deep_link_return_url: string;
  data?: string;
  accept_types: string[];
  accept_presentation_document_targets: string[];
}

interface ContentItem {
  type: string;
  title: string;
  url: string;
  custom?: Record<string, string>;
}

export async function createDeepLinkingResponse(params: {
  settings: DeepLinkingSettings;
  contentItems: ContentItem[];
  deploymentId: string;
  audience: string;
  message?: string;
}): Promise<string> {
  const payload: Record<string, unknown> = {
    [LTI_CLAIMS.MESSAGE_TYPE]: "LtiDeepLinkingResponse",
    [LTI_CLAIMS.VERSION]: "1.3.0",
    [LTI_CLAIMS.DEPLOYMENT_ID]: params.deploymentId,
    [LTI_CLAIMS.CONTENT_ITEMS]: params.contentItems.map((item) => ({
      type: item.type,
      title: item.title,
      url: item.url,
      custom: item.custom,
    })),
  };

  if (params.settings.data) {
    payload[LTI_CLAIMS.DL_DATA] = params.settings.data;
  }
  if (params.message) {
    payload[LTI_CLAIMS.DL_MSG] = params.message;
  }

  const jwt = await signJwt(payload, params.audience);

  // Build auto-submitting form
  const formHtml = `
<!DOCTYPE html>
<html>
<head><title>Redirecting...</title></head>
<body>
<form id="ltiform" method="POST" action="${escapeHtml(params.settings.deep_link_return_url)}">
  <input type="hidden" name="JWT" value="${escapeHtml(jwt)}" />
</form>
<script>document.getElementById('ltiform').submit();</script>
</body>
</html>`;

  return formHtml;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
