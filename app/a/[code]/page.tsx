'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';

export default function ActivationCodePage() {
  const params = useParams();
  const code = params.code as string;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '20px',
          textAlign: 'center',
          color: '#333',
        }}>
          软件激活码
        </h1>

        <div style={{
          backgroundColor: '#f9f9f9',
          border: '2px solid #e0e0e0',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          textAlign: 'center',
        }}>
          <code style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#0066cc',
            wordBreak: 'break-all',
          }}>
            {code}
          </code>
        </div>

        <button
          onClick={handleCopy}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: copied ? '#10b981' : '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '20px',
            transition: 'background-color 0.2s',
          }}
        >
          {copied ? '✓ 已复制' : '复制激活码'}
        </button>

        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '14px',
          color: '#92400e',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '10px',
            color: '#92400e',
          }}>
            激活说明
          </h3>
          <ol style={{
            margin: '0',
            paddingLeft: '20px',
            lineHeight: '1.6',
          }}>
            <li>打开软件，进入激活界面</li>
            <li>将激活码粘贴到输入框中</li>
            <li>点击"确认激活"按钮</li>
            <li>激活码仅可使用一次，请妥善保管</li>
          </ol>
        </div>

        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#0c4a6e',
        }}>
          <strong>注意：</strong>激活码与设备绑定，激活后无法转移到其他设备。
        </div>
      </div>
    </div>
  );
}
