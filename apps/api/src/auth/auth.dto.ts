export interface WxLoginRequest {
  code: string;
  mockOpenid?: string;
}

export interface AdminLoginRequest {
  username?: string;
  password?: string;
}
