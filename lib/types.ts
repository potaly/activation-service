export interface ActivationCode {
  code: string;
  plan: 'lifetime' | 'trial';
  expires_at: string;
  used: boolean;
  used_at: string | null;
  device_hash: string | null;
}

export interface ActivateRequest {
  code: string;
  device_hash: string;
  app_id: string;
  app_version: string;
}

export interface License {
  schema_version: number;
  license_id: string;
  app_id: string;
  plan: string;
  device_hash: string;
  issued_at: string;
  expires_at: string;
  features: {
    moments_interact: boolean;
    ai_settings: boolean;
  };
  nonce: string;
  signature?: string;
}

export interface ActivateResponse {
  ok: true;
  license: License;
}

export interface ErrorResponse {
  ok: false;
  error: {
    code: 'CODE_USED' | 'CODE_NOT_FOUND' | 'CODE_EXPIRED' | 'INVALID_APP_ID' | 'INVALID_REQUEST';
    message: string;
  };
}

export type ApiResponse = ActivateResponse | ErrorResponse;
