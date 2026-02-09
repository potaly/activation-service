export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          marginBottom: '20px',
          textAlign: 'center',
          color: '#333',
        }}>
          激活服务
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#666',
          lineHeight: '1.6',
          marginBottom: '20px',
          textAlign: 'center',
        }}>
          这是一个软件激活验证服务，用于为桌面软件提供激活码验证和授权管理。
        </p>

        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '12px',
            color: '#0c4a6e',
          }}>
            API 端点
          </h2>
          <code style={{
            display: 'block',
            backgroundColor: '#fff',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#0066cc',
            wordBreak: 'break-all',
          }}>
            POST /api/activate
          </code>
        </div>

        <div style={{
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '10px',
            color: '#374151',
          }}>
            服务状态
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
            }} />
            <span style={{
              fontSize: '14px',
              color: '#059669',
              fontWeight: '500',
            }}>
              运行中
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
