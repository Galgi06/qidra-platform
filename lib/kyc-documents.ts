export const kycDocumentKinds = ["identityDocument", "addressProof"] as const;

export type KycDocumentKind = (typeof kycDocumentKinds)[number];

export type KycFileMeta = {
  name: string;
  size: number;
  storagePath?: string;
  type: string;
};

export type KycDocuments = {
  addressProof?: KycFileMeta;
  identityDocument?: KycFileMeta;
  submittedAt?: string;
};

export function readKycDocuments(value: unknown): KycDocuments {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const documents = value as Record<string, unknown>;

  return {
    identityDocument: readKycFileMeta(documents.identityDocument),
    addressProof: readKycFileMeta(documents.addressProof),
    submittedAt: typeof documents.submittedAt === "string" ? documents.submittedAt : undefined
  };
}

export function isKycDocumentKind(value: string): value is KycDocumentKind {
  return kycDocumentKinds.includes(value as KycDocumentKind);
}

function readKycFileMeta(value: unknown): KycFileMeta | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const file = value as Record<string, unknown>;

  if (typeof file.name !== "string" || typeof file.size !== "number" || typeof file.type !== "string") {
    return undefined;
  }

  return {
    name: file.name,
    size: file.size,
    storagePath: typeof file.storagePath === "string" ? file.storagePath : undefined,
    type: file.type
  };
}
