// LTI 1.3 claim URIs
export const LTI_CLAIMS = {
  MESSAGE_TYPE: "https://purl.imsglobal.org/spec/lti/claim/message_type",
  VERSION: "https://purl.imsglobal.org/spec/lti/claim/version",
  DEPLOYMENT_ID: "https://purl.imsglobal.org/spec/lti/claim/deployment_id",
  TARGET_LINK_URI: "https://purl.imsglobal.org/spec/lti/claim/target_link_uri",
  RESOURCE_LINK: "https://purl.imsglobal.org/spec/lti/claim/resource_link",
  CONTEXT: "https://purl.imsglobal.org/spec/lti/claim/context",
  ROLES: "https://purl.imsglobal.org/spec/lti/claim/roles",
  CUSTOM: "https://purl.imsglobal.org/spec/lti/claim/custom",
  DEEP_LINKING_SETTINGS: "https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings",
  CONTENT_ITEMS: "https://purl.imsglobal.org/spec/lti-dl/claim/content_items",
  DL_DATA: "https://purl.imsglobal.org/spec/lti-dl/claim/data",
  DL_MSG: "https://purl.imsglobal.org/spec/lti-dl/claim/msg",
} as const;

export interface LtiLaunchClaims {
  sub: string;
  iss: string;
  aud: string;
  nonce: string;
  messageType: string;
  version: string;
  deploymentId: string;
  resourceLink: { id: string; title?: string };
  context: { id: string; title?: string; label?: string };
  roles: string[];
  custom?: Record<string, string>;
}

export function parseLtiClaims(payload: Record<string, unknown>): LtiLaunchClaims {
  const resourceLink = payload[LTI_CLAIMS.RESOURCE_LINK] as { id: string; title?: string } | undefined;
  const context = payload[LTI_CLAIMS.CONTEXT] as { id: string; title?: string; label?: string } | undefined;

  return {
    sub: payload.sub as string,
    iss: payload.iss as string,
    aud: (Array.isArray(payload.aud) ? payload.aud[0] : payload.aud) as string,
    nonce: payload.nonce as string,
    messageType: payload[LTI_CLAIMS.MESSAGE_TYPE] as string,
    version: payload[LTI_CLAIMS.VERSION] as string,
    deploymentId: payload[LTI_CLAIMS.DEPLOYMENT_ID] as string,
    resourceLink: resourceLink ?? { id: "unknown" },
    context: context ?? { id: "unknown" },
    roles: (payload[LTI_CLAIMS.ROLES] as string[]) ?? [],
    custom: payload[LTI_CLAIMS.CUSTOM] as Record<string, string> | undefined,
  };
}
