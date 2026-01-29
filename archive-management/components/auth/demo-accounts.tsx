"use client";

export function DemoAccounts() {
  const handleAdminClick = () => {
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    if (usernameInput && passwordInput) {
      usernameInput.value = 'admin';
      passwordInput.value = 'admin123';
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const handleUserClick = () => {
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    if (usernameInput && passwordInput) {
      usernameInput.value = 'user';
      passwordInput.value = 'user123';
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ textAlign: 'center', fontSize: '12px', color: '#718096', marginBottom: '12px', position: 'relative' }}>
        <span style={{
          position: 'relative',
          zIndex: 1,
          backgroundColor: 'white',
          padding: '0 8px'
        }}>演示账号</span>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '1px',
          background: '#e2e8f0',
          zIndex: 0
        }}></div>
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleAdminClick}
          style={{
            fontSize: '12px',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #667eea',
            background: 'transparent',
            color: '#667eea',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontWeight: 500
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#667eea';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#667eea';
          }}
        >
          管理员: admin/admin123
        </button>
        <button
          type="button"
          onClick={handleUserClick}
          style={{
            fontSize: '12px',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #48bb78',
            background: 'transparent',
            color: '#48bb78',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontWeight: 500
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#48bb78';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#48bb78';
          }}
        >
          普通用户: user/user123
        </button>
      </div>
    </div>
  );
}
