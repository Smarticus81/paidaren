import { getJWKS } from "./keys";

interface RegistrationConfig {
  openidConfiguration: string;
  registrationToken?: string;
}

export async function handleDynamicRegistration(config: RegistrationConfig) {
  const appUrl = process.env.APP_URL!;

  // Fetch the platform's OpenID configuration
  const openidRes = await fetch(config.openidConfiguration);
  const openidConfig = await openidRes.json();

  const registrationEndpoint = openidConfig.registration_endpoint;
  if (!registrationEndpoint) {
    throw new Error("Platform does not support dynamic registration");
  }

  // Register our tool with the platform
  const toolConfig = {
    application_type: "web",
    response_types: ["id_token"],
    grant_types: ["implicit", "client_credentials"],
    initiate_login_uri: `${appUrl}/api/lti/login`,
    redirect_uris: [`${appUrl}/api/lti/launch`],
    client_name: "Socrates",
    jwks_uri: `${appUrl}/api/lti/jwks`,
    logo_uri: `${appUrl}/logo.png`,
    token_endpoint_auth_method: "private_key_jwt",
    scope: "openid",
    "https://purl.imsglobal.org/spec/lti-tool-configuration": {
      domain: new URL(appUrl).hostname,
      description: "AI-powered Socratic tutoring coach",
      target_link_uri: `${appUrl}/api/lti/launch`,
      claims: ["iss", "sub"],
      messages: [
        {
          type: "LtiResourceLinkRequest",
          target_link_uri: `${appUrl}/api/lti/launch`,
        },
        {
          type: "LtiDeepLinkingRequest",
          target_link_uri: `${appUrl}/api/lti/launch`,
        },
      ],
    },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (config.registrationToken) {
    headers.Authorization = `Bearer ${config.registrationToken}`;
  }

  const regRes = await fetch(registrationEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(toolConfig),
  });

  if (!regRes.ok) {
    const errorText = await regRes.text();
    throw new Error(`Registration failed: ${regRes.status} ${errorText}`);
  }

  const registration = await regRes.json();

  return {
    clientId: registration.client_id,
    issuer: openidConfig.issuer,
    authorizationEndpoint: openidConfig.authorization_endpoint,
    tokenEndpoint: openidConfig.token_endpoint,
    jwksUri: openidConfig.jwks_uri,
    deploymentId: registration["https://purl.imsglobal.org/spec/lti-tool-configuration"]?.deployment_id,
  };
}
