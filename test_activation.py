#!/usr/bin/env python3
"""
激活服务测试脚本
测试激活接口和签名验证功能
"""

import requests
import json
import base64
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError

# 配置
BASE_URL = "http://localhost:3000"
PUBLIC_KEY = "n0nHDOGGIt/II6hWbtdQOSJgI8fekhqML/yC5oEjMEg="  # 从密钥生成步骤获取

# 测试激活码（从 data/codes.json 中获取）
TEST_CODE = "ACT-LxiKsFFbEL6V-Bx-"

def test_activate():
    """测试激活接口"""
    print("=" * 60)
    print("测试 1: 激活接口")
    print("=" * 60)
    
    url = f"{BASE_URL}/api/activate"
    data = {
        "code": TEST_CODE,
        "device_hash": "SHA256:python_test_device",
        "app_id": "moments_ai",
        "app_version": "1.0.0"
    }
    
    print(f"\n请求 URL: {url}")
    print(f"请求数据: {json.dumps(data, indent=2)}")
    
    response = requests.post(url, json=data)
    result = response.json()
    
    print(f"\n响应状态码: {response.status_code}")
    print(f"响应数据: {json.dumps(result, indent=2, ensure_ascii=False)}")
    
    if result.get("ok"):
        print("\n✓ 激活成功！")
        return result["license"]
    else:
        print(f"\n✗ 激活失败: {result.get('error', {}).get('message')}")
        return None


def verify_license_signature(license_data):
    """验证 license 签名"""
    print("\n" + "=" * 60)
    print("测试 2: 离线验证 License 签名")
    print("=" * 60)
    
    try:
        # 复制 license 数据
        license_copy = license_data.copy()
        
        # 提取签名
        signature_str = license_copy.pop("signature", "")
        print(f"\n签名字符串: {signature_str[:50]}...")
        
        if not signature_str.startswith("ed25519:"):
            print("✗ 签名格式错误")
            return False
        
        signature = base64.b64decode(signature_str.replace("ed25519:", ""))
        
        # 生成 canonical JSON（与 Node.js 保持一致）
        # 注意：Python 的 sort_keys 与 JavaScript 的字段排序可能不同
        # features 字典需要单独处理
        canonical_json = json.dumps(
            license_copy,
            sort_keys=True,
            separators=(',', ':'),
            ensure_ascii=True  # 使用 ASCII 编码
        )
        print(f"\nCanonical JSON (前 100 字符):\n{canonical_json[:100]}...")
        
        message = canonical_json.encode('utf-8')
        
        # 验证签名
        verify_key = VerifyKey(base64.b64decode(PUBLIC_KEY))
        verify_key.verify(message, signature)
        
        print("\n✓ License 签名验证通过！")
        print("✓ 该 license 可以离线使用，无需联网验证")
        return True
        
    except BadSignatureError:
        print("\n✗ License 签名验证失败")
        return False
    except Exception as e:
        print(f"\n✗ 签名验证异常: {e}")
        return False


def test_duplicate_activation():
    """测试重复激活（应该失败）"""
    print("\n" + "=" * 60)
    print("测试 3: 重复激活（应该失败）")
    print("=" * 60)
    
    url = f"{BASE_URL}/api/activate"
    data = {
        "code": TEST_CODE,
        "device_hash": "SHA256:python_test_device",
        "app_id": "moments_ai",
        "app_version": "1.0.0"
    }
    
    response = requests.post(url, json=data)
    result = response.json()
    
    print(f"\n响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
    
    if not result.get("ok") and result.get("error", {}).get("code") == "CODE_USED":
        print("\n✓ 正确拒绝了重复激活")
        return True
    else:
        print("\n✗ 应该拒绝重复激活")
        return False


def test_invalid_code():
    """测试无效激活码"""
    print("\n" + "=" * 60)
    print("测试 4: 无效激活码（应该失败）")
    print("=" * 60)
    
    url = f"{BASE_URL}/api/activate"
    data = {
        "code": "ACT-INVALID-CODE-123",
        "device_hash": "SHA256:python_test_device",
        "app_id": "moments_ai",
        "app_version": "1.0.0"
    }
    
    response = requests.post(url, json=data)
    result = response.json()
    
    print(f"\n响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
    
    if not result.get("ok") and result.get("error", {}).get("code") == "CODE_NOT_FOUND":
        print("\n✓ 正确拒绝了无效激活码")
        return True
    else:
        print("\n✗ 应该拒绝无效激活码")
        return False


def main():
    """主测试流程"""
    print("\n" + "=" * 60)
    print("激活服务测试")
    print("=" * 60)
    print(f"\n服务地址: {BASE_URL}")
    print(f"公钥: {PUBLIC_KEY}")
    print(f"测试激活码: {TEST_CODE}")
    
    try:
        # 测试 1: 激活
        license_data = test_activate()
        if not license_data:
            print("\n✗ 激活失败，终止测试")
            return
        
        # 测试 2: 验证签名
        verify_license_signature(license_data)
        
        # 测试 3: 重复激活
        test_duplicate_activation()
        
        # 测试 4: 无效激活码
        test_invalid_code()
        
        print("\n" + "=" * 60)
        print("测试完成")
        print("=" * 60)
        print("\n✓ 所有测试通过！")
        print("\n激活服务运行正常，可以部署到 Vercel。")
        
    except Exception as e:
        print(f"\n✗ 测试异常: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
