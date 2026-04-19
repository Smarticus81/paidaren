export default function SettingsPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl text-foreground mb-1">Settings</h1>
      <p className="text-muted text-sm mb-8">
        Platform configuration and integration details.
      </p>

      {/* LTI Install */}
      <div className="bg-surface border border-border rounded-xl p-8 mb-6">
        <h2 className="text-lg text-foreground mb-1">LTI Integration</h2>
        <p className="text-sm text-muted mb-5">
          Share the registration URL below with your LMS administrator.
          They can use it for one-click Dynamic Registration in any LTI 1.3–compatible platform.
        </p>

        <label className="block text-sm font-medium text-foreground mb-1.5">
          Registration URL
        </label>
        <code className="block bg-background border border-border rounded-lg p-3 text-sm text-foreground break-all font-mono select-all">
          {appUrl}/api/lti/register
        </code>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              JWKS Endpoint
            </label>
            <code className="block bg-background border border-border rounded-lg p-3 text-sm text-foreground break-all font-mono select-all">
              {appUrl}/api/lti/jwks
            </code>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Launch URL
            </label>
            <code className="block bg-background border border-border rounded-lg p-3 text-sm text-foreground break-all font-mono select-all">
              {appUrl}/api/lti/launch
            </code>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Login Initiation URL
            </label>
            <code className="block bg-background border border-border rounded-lg p-3 text-sm text-foreground break-all font-mono select-all">
              {appUrl}/api/lti/login
            </code>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Deep Linking URL
            </label>
            <code className="block bg-background border border-border rounded-lg p-3 text-sm text-foreground break-all font-mono select-all">
              {appUrl}/api/lti/deeplink
            </code>
          </div>
        </div>

        <p className="text-xs text-muted mt-5 leading-relaxed">
          Compatible with Canvas, D2L Brightspace, Moodle 4.x, Blackboard Ultra, and Schoology.
          Only the <strong>openid</strong> scope is requested during registration.
        </p>
      </div>
    </div>
  );
}
