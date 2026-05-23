-- 门店扫码 WiFi 广告收益平台 V3.4 MySQL schema
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(128) NOT NULL UNIQUE,
  unionid VARCHAR(128) NULL,
  nickname VARCHAR(128) NULL,
  avatar_url VARCHAR(512) NULL,
  user_type ENUM('customer','merchant_owner','admin_shadow') NOT NULL DEFAULT 'customer',
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE admin_users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  real_name VARCHAR(64) NULL,
  phone VARCHAR(32) NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  description VARCHAR(255) NULL
);
CREATE TABLE admin_user_roles (
  admin_user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  PRIMARY KEY(admin_user_id, role_id)
);
CREATE TABLE permissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  module VARCHAR(64) NOT NULL
);
CREATE TABLE role_permissions (
  role_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  PRIMARY KEY(role_id, permission_id)
);
CREATE TABLE merchants (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  merchant_no VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  owner_name VARCHAR(64) NULL,
  owner_phone VARCHAR(32) NULL,
  business_license_no VARCHAR(128) NULL,
  city VARCHAR(64) NULL,
  industry VARCHAR(64) NULL,
  share_rate_bps INT NULL,
  status ENUM('pending','active','disabled','risk_frozen') NOT NULL DEFAULT 'pending',
  risk_status ENUM('normal','watch','frozen','blocked') NOT NULL DEFAULT 'normal',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE merchant_owners (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  merchant_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  openid VARCHAR(128) NOT NULL,
  bind_method ENUM('admin','invite_code','merchant_qrcode') NOT NULL DEFAULT 'admin',
  status ENUM('pending','active','disabled') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_merchant_openid(merchant_id, openid),
  INDEX idx_openid(openid)
);
CREATE TABLE stores (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  merchant_id BIGINT NOT NULL,
  store_no VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  city VARCHAR(64) NULL,
  district VARCHAR(64) NULL,
  address VARCHAR(255) NULL,
  industry VARCHAR(64) NULL,
  contact_name VARCHAR(64) NULL,
  contact_phone VARCHAR(32) NULL,
  share_rate_bps INT NULL,
  status ENUM('pending','active','disabled','risk_frozen') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_merchant(merchant_id)
);
CREATE TABLE store_wifi (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  store_id BIGINT NOT NULL,
  ssid VARCHAR(128) NOT NULL,
  password_cipher TEXT NULL,
  password_masked VARCHAR(64) NULL,
  security_type ENUM('none','WEP','WPA','WPA2','WPA3') NOT NULL DEFAULT 'WPA2',
  connect_mode ENUM('mock','wechat','manual') NOT NULL DEFAULT 'mock',
  is_primary TINYINT NOT NULL DEFAULT 1,
  is_enabled TINYINT NOT NULL DEFAULT 1,
  allow_copy_password TINYINT NOT NULL DEFAULT 1,
  show_manual_fallback TINYINT NOT NULL DEFAULT 1,
  password_view_policy ENUM('never_plain','copy_only','second_confirm_plain') NOT NULL DEFAULT 'never_plain',
  remark VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_store_primary(store_id, is_primary)
);


CREATE TABLE merchant_applications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  application_no VARCHAR(64) NOT NULL UNIQUE,
  user_id BIGINT NOT NULL,
  openid VARCHAR(128) NOT NULL,
  source_store_id BIGINT NULL,
  applicant_name VARCHAR(64) NOT NULL,
  applicant_phone VARCHAR(32) NOT NULL,
  store_name VARCHAR(128) NOT NULL,
  city VARCHAR(64) NOT NULL,
  district VARCHAR(64) NULL,
  address VARCHAR(255) NOT NULL,
  industry VARCHAR(64) NOT NULL,
  wifi_ssid VARCHAR(128) NULL,
  wifi_password_cipher TEXT NULL,
  remark VARCHAR(512) NULL,
  status ENUM('draft','submitted','reviewing','approved','rejected','canceled','converted') NOT NULL DEFAULT 'submitted',
  reject_reason VARCHAR(255) NULL,
  allow_resubmit TINYINT NOT NULL DEFAULT 1,
  created_merchant_id BIGINT NULL,
  created_store_id BIGINT NULL,
  reviewed_by BIGINT NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_openid_status(openid, status),
  INDEX idx_phone_date(applicant_phone, created_at),
  INDEX idx_status_date(status, created_at)
);

CREATE TABLE merchant_application_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  application_id BIGINT NOT NULL,
  action VARCHAR(64) NOT NULL,
  actor_type ENUM('user','admin','system') NOT NULL,
  actor_id BIGINT NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_application(application_id)
);

CREATE TABLE qrcodes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  store_id BIGINT NOT NULL,
  scene VARCHAR(128) NOT NULL UNIQUE,
  qrcode_url VARCHAR(512) NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ads (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ad_no VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  ad_type ENUM('wechat_reward','self_image','self_video','cpa','cps','local') NOT NULL,
  material_url VARCHAR(512) NULL,
  landing_url VARCHAR(512) NULL,
  status ENUM('draft','pending_audit','active','rejected','disabled') NOT NULL DEFAULT 'draft',
  audit_reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE ad_campaigns (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  campaign_no VARCHAR(64) NOT NULL UNIQUE,
  ad_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  target_city VARCHAR(64) NULL,
  target_industry VARCHAR(64) NULL,
  merchant_share_rate_bps INT NULL,
  priority INT NOT NULL DEFAULT 100,
  start_at DATETIME NULL,
  end_at DATETIME NULL,
  status ENUM('draft','active','paused','ended') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ad_campaign_stores (
  campaign_id BIGINT NOT NULL,
  store_id BIGINT NOT NULL,
  PRIMARY KEY(campaign_id, store_id)
);
CREATE TABLE scan_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(128) NOT NULL,
  store_id BIGINT NOT NULL,
  scene VARCHAR(128) NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_store_date(store_id, created_at), INDEX idx_openid_date(openid, created_at)
);
CREATE TABLE ad_view_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  view_no VARCHAR(64) NOT NULL UNIQUE,
  openid VARCHAR(128) NOT NULL,
  store_id BIGINT NOT NULL,
  ad_id BIGINT NULL,
  campaign_id BIGINT NULL,
  status ENUM('created','loaded','shown','completed','closed_early','failed','invalid') NOT NULL DEFAULT 'created',
  is_effective TINYINT NOT NULL DEFAULT 0,
  invalid_reason VARCHAR(128) NULL,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_store_status(store_id, status), INDEX idx_openid_date(openid, created_at)
);
CREATE TABLE wifi_reward_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  token VARCHAR(128) NOT NULL UNIQUE,
  openid VARCHAR(128) NOT NULL,
  store_id BIGINT NOT NULL,
  ad_view_log_id BIGINT NULL,
  status ENUM('active','used','expired','revoked') NOT NULL DEFAULT 'active',
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE wifi_connect_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(128) NOT NULL,
  store_id BIGINT NOT NULL,
  reward_token VARCHAR(128) NULL,
  status ENUM('success','failed','manual','missing_wifi') NOT NULL,
  fail_reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_store_date(store_id, created_at)
);
CREATE TABLE revenue_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  revenue_no VARCHAR(64) NOT NULL UNIQUE,
  merchant_id BIGINT NOT NULL,
  store_id BIGINT NOT NULL,
  ad_view_log_id BIGINT NULL,
  settlement_batch_id BIGINT NULL,
  gross_amount_cent INT NOT NULL DEFAULT 0,
  merchant_amount_cent INT NOT NULL DEFAULT 0,
  platform_amount_cent INT NOT NULL DEFAULT 0,
  applied_share_rate_bps INT NOT NULL,
  share_rule_source ENUM('store','merchant','campaign','global') NOT NULL,
  share_rule_ref_id BIGINT NULL,
  status ENUM('estimated','pending_settlement','confirmed','withdrawable','frozen','invalid') NOT NULL DEFAULT 'estimated',
  invalid_reason VARCHAR(128) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME NULL,
  INDEX idx_merchant_status(merchant_id, status), INDEX idx_store_date(store_id, created_at)
);
CREATE TABLE merchant_wallets (
  merchant_id BIGINT PRIMARY KEY,
  total_confirmed_cent BIGINT NOT NULL DEFAULT 0,
  available_cent BIGINT NOT NULL DEFAULT 0,
  frozen_withdraw_cent BIGINT NOT NULL DEFAULT 0,
  frozen_risk_cent BIGINT NOT NULL DEFAULT 0,
  total_withdrawn_cent BIGINT NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE wallet_ledger (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ledger_no VARCHAR(64) NOT NULL UNIQUE,
  merchant_id BIGINT NOT NULL,
  ledger_type ENUM('revenue_confirm','withdraw_freeze','withdraw_paid','withdraw_failed_unfreeze','risk_freeze','risk_unfreeze','manual_adjust_add','manual_adjust_sub','reversal') NOT NULL,
  amount_cent BIGINT NOT NULL,
  available_after_cent BIGINT NOT NULL,
  frozen_withdraw_after_cent BIGINT NOT NULL,
  frozen_risk_after_cent BIGINT NOT NULL,
  ref_type VARCHAR(64) NULL,
  ref_id BIGINT NULL,
  ref_ledger_id BIGINT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  remark VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_idempotency(idempotency_key), INDEX idx_merchant_date(merchant_id, created_at)
);
CREATE TABLE withdraw_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  withdraw_no VARCHAR(64) NOT NULL UNIQUE,
  merchant_id BIGINT NOT NULL,
  openid VARCHAR(128) NOT NULL,
  amount_cent BIGINT NOT NULL,
  status ENUM('created','frozen','reviewing','transfer_processing','paid','failed','rejected','canceled','abnormal') NOT NULL DEFAULT 'created',
  out_bill_no VARCHAR(128) NULL UNIQUE,
  wechat_bill_no VARCHAR(128) NULL,
  fail_reason VARCHAR(255) NULL,
  review_reason VARCHAR(255) NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  frozen_at DATETIME NULL,
  paid_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_merchant_status(merchant_id, status)
);
CREATE TABLE payment_callback_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_id VARCHAR(128) NOT NULL UNIQUE,
  event_type VARCHAR(64) NOT NULL,
  raw_body MEDIUMTEXT NOT NULL,
  verify_status ENUM('passed','failed','mock') NOT NULL,
  related_withdraw_no VARCHAR(64) NULL,
  process_status ENUM('ignored','processed','failed','abnormal') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ranking_snapshots (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ranking_type ENUM('today_revenue','yesterday_revenue','month_revenue','total_revenue','scan_count','ad_complete_count','connect_success_count','city_revenue','industry_revenue') NOT NULL,
  scope_key VARCHAR(128) NOT NULL DEFAULT 'global',
  store_id BIGINT NOT NULL,
  merchant_id BIGINT NOT NULL,
  rank_no INT NOT NULL,
  metric_value BIGINT NOT NULL,
  display_value VARCHAR(64) NOT NULL,
  snapshot_at DATETIME NOT NULL,
  INDEX idx_type_scope(ranking_type, scope_key, snapshot_at)
);
CREATE TABLE risk_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_no VARCHAR(64) NOT NULL UNIQUE,
  merchant_id BIGINT NULL,
  store_id BIGINT NULL,
  openid VARCHAR(128) NULL,
  risk_type VARCHAR(64) NOT NULL,
  risk_level ENUM('low','medium','high','critical') NOT NULL,
  status ENUM('open','ignored','handled','frozen') NOT NULL DEFAULT 'open',
  description VARCHAR(512) NULL,
  handler_admin_id BIGINT NULL,
  handle_result VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  handled_at DATETIME NULL
);
CREATE TABLE system_configs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(128) NOT NULL UNIQUE,
  config_value TEXT NULL,
  value_type ENUM('string','integer','boolean','decimal','json','secret','url','enum') NOT NULL DEFAULT 'string',
  is_sensitive TINYINT NOT NULL DEFAULT 0,
  module VARCHAR(64) NOT NULL,
  updated_by BIGINT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE operation_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_type ENUM('admin','merchant','system') NOT NULL,
  actor_id BIGINT NULL,
  action VARCHAR(128) NOT NULL,
  target_type VARCHAR(64) NULL,
  target_id BIGINT NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE reconciliation_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  reconcile_no VARCHAR(64) NOT NULL UNIQUE,
  target_type ENUM('withdraw','revenue','wallet') NOT NULL,
  target_id BIGINT NOT NULL,
  local_status VARCHAR(64) NOT NULL,
  remote_status VARCHAR(64) NULL,
  result ENUM('matched','fixed','abnormal') NOT NULL,
  detail VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
