export function isSocialProviderConfigured(value?: string) {
  return Boolean(value && !value.startsWith("replace-with"));
}

export function getSocialAuthConfig() {
  return {
    googleEnabled: isSocialProviderConfigured(process.env.GOOGLE_CLIENT_ID) && isSocialProviderConfigured(process.env.GOOGLE_CLIENT_SECRET)
  };
}
