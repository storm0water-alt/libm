import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'url(/login-bg.jpg) center center / cover no-repeat',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '420px',
        padding: '40px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            borderRadius: '20px',
            marginBottom: '20px'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 8px 0'
          }}>
            正成档案管理系统
          </h1>
          <p style={{ fontSize: '14px', color: '#718096', margin: 0 }}>
            Zhengcheng Archive Management System
          </p>
        </div>

        {/* 使用 LoginForm 组件 */}
        <div style={{ marginBottom: '0' }}>
          <LoginForm />
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#a0aec0' }}>
            © 2024 正成档案管理系统. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
