import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #e0e7ff 100%)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* SVG 网格背景 */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148, 163, 184, 0.15)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* 装饰性圆形元素 */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        <circle cx="10%" cy="20%" r="120" fill="rgba(99, 102, 241, 0.05)" />
        <circle cx="90%" cy="80%" r="180" fill="rgba(139, 92, 246, 0.05)" />
        <circle cx="85%" cy="15%" r="80" fill="rgba(59, 130, 246, 0.05)" />
      </svg>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '420px',
        padding: '40px',
        position: 'relative',
        zIndex: 1
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
            档案管理系统
          </h1>
          <p style={{ fontSize: '14px', color: '#718096', margin: 0 }}>
            Archive Management System
          </p>
        </div>

        {/* 使用 LoginForm 组件 */}
        <div style={{ marginBottom: '0' }}>
          <LoginForm />
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#a0aec0' }}>
            © {new Date().getFullYear()} ZC company
          </p>
        </div>
      </div>
    </div>
  );
}
