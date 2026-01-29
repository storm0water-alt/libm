# License Management - Quick Reference Guide

## For Users

### How to Activate Your System

1. **Login to the System**
   - Navigate to the login page
   - You'll see your device code displayed

2. **Copy Your Device Code**
   - Click the "Copy" button next to your device code
   - Send this code to your system administrator

3. **Receive Auth Code**
   - Wait for the administrator to generate an auth code
   - The auth code will look like: `XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`

4. **Activate**
   - Click the "激活" (Activate) button on the login page
   - Paste the auth code into the activation dialog
   - Click "授权" (Authorize)
   - Your system is now activated!

### Checking Your License Status

On the login page, you'll see:
- **有效** (Valid): Your license is active
- **已过期** (Expired): Your license has expired, click "激活" to renew
- **未激活** (Not Activated): You need to activate first

## For Administrators

### Creating a New License

1. **Navigate to License Management**
   - Go to `/licenses` (requires admin role)
   - Click "新建授权" (New License)

2. **Enter License Details**
   - **Device Code**: Paste the user's device code
   - **Duration**: Enter license duration in days (e.g., 365 for 1 year)
   - Click "创建授权" (Create License)

3. **Copy the Auth Code**
   - The system will generate an encrypted auth code
   - Click "复制" (Copy) to copy it
   - Send this code to the user securely

### Managing Existing Licenses

**View All Licenses**
- All licenses are displayed in a table
- Shows device code, auth code, expiry date, and status

**Renew a License**
1. Find the license in the list
2. Click "续期" (Renew)
3. Enter additional days
4. Click "确认续期" (Confirm Renew)

**Delete a License**
1. Find the license in the list
2. Click "删除" (Delete)
3. Confirm the deletion
4. The device will no longer have access

**Copy License Information**
- Click the copy icon next to any device code or auth code
- Information is copied to clipboard

## License Status Reference

| Status | Color | Meaning | Action Required |
|--------|-------|---------|-----------------|
| 有效 | Green | License is valid and active | None |
| 已过期 | Red | License has expired | Renew or activate |
| 未激活 | Gray | No license installed | Activate |

## Technical Details

### Auth Code Format

```
XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
```

- 32 characters formatted in 8 groups of 4
- Case-insensitive (can be entered in any case)
- Contains encrypted device code and duration
- Single-use per device code

### Device Code Format

```
DEV-XXXX-XXXX-XXXX
```

- 16 characters in hexadecimal
- Generated from device fingerprint
- Unique per device
- Can be regenerated if needed

### Encryption

- **Algorithm**: AES-256-GCM
- **Key**: 32 bytes (from LICENSE_SECRET_KEY env var)
- **Security**: Auth codes are device-bound and tamper-proof

## Troubleshooting

### Common Issues

**"激活码无效" (Invalid Auth Code)**
- Check for typos in the auth code
- Ensure the auth code matches the device code
- Verify the auth code hasn't been used before

**"设备码不匹配" (Device Code Mismatch)**
- The auth code was generated for a different device
- Get a new auth code for your device code

**"授权已过期" (License Expired)**
- Contact your administrator to renew
- Or purchase a new license

**Cannot access /licenses page**
- You need admin role to access
- Contact your system administrator

## Security Best Practices

### For Users
- Keep your device code private
- Don't share your auth code publicly
- Report suspicious activity to admin

### For Administrators
- Set a strong LICENSE_SECRET_KEY in production
- Use secure channels to send auth codes
- Regularly audit license usage
- Monitor for unusual activation patterns
- Keep license database backed up

## Environment Setup

### Development
```env
# Optional: Uses default key if not set
LICENSE_SECRET_KEY=development-key-only
```

### Production
```env
# Required: Generate a secure 32-byte key
LICENSE_SECRET_KEY=your-secure-32-byte-random-key-here
```

**Generate a secure key**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## API Reference

### Server Actions

```typescript
// Get device code
const { deviceCode } = await getDeviceCode();

// Check license status
const { valid, expireTime } = await checkLicenseStatus(deviceCode);

// Activate license
const { success, error } = await activateLicense(deviceCode, authCode);

// Create license (admin)
const { license } = await createLicense(deviceCode, durationDays);

// Get all licenses (admin)
const { licenses } = await getAllLicenses();

// Renew license (admin)
const { license } = await renewLicense(licenseId, additionalDays);

// Delete license (admin)
const { license } = await deleteLicense(licenseId);
```

## Support

For issues or questions:
1. Check this guide first
2. Review the implementation summary
3. Contact your system administrator
4. Check system logs for error details

## License Lifecycle

```
┌─────────────┐
│   Created   │ ← Admin creates license with device code
└──────┬──────┘
       │
       v
┌─────────────┐
│   Active    │ ← User activates with auth code
└──────┬──────┘
       │
       v
┌─────────────┐
│   Valid     │ ← License is valid and active
└──────┬──────┘
       │
       v
┌─────────────┐
│   Expired   │ ← License expires after duration
└──────┬──────┘
       │
       v
┌─────────────┐
│   Renewed   │ ← Admin can renew or user can re-activate
└─────────────┘
```

## Quick Commands

### Generate Auth Code (as Admin)
```typescript
// In the license management page:
// 1. Click "新建授权"
// 2. Enter device code and duration
// 3. Click "创建授权"
// 4. Copy the generated auth code
```

### Check License Status
```typescript
// Automatically shown on login page
// Or programmatically:
await checkLicenseStatus(deviceCode);
```

### Migrate Database
```bash
# Run migration script
npx tsx scripts/migrate-license.ts

# Regenerate Prisma client
npx prisma generate
```
