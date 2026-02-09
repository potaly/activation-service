"""
客户端激活示例代码（Python）
用于 Windows 桌面软件集成
"""

import requests
import hashlib
import platform
import json
import base64
from pathlib import Path

# 配置
ACTIVATION_BASE_URL = "https://your-app.vercel.app"  # 替换为实际部署地址
PUBLIC_KEY = "QRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEF="  # 替换为实际公钥
APP_ID = "moments_ai"
APP_VERSION = "1.0.0"
LICENSE_FILE = Path.home() / ".moments_ai" / "license.json"


def get_device_hash() -> str:
    """
    生成设备唯一标识
    使用主机名 + 机器类型生成 SHA256 哈希
    """
    machine_id = platform.node() + platform.machine()
    hash_value = hashlib.sha256(machine_id.encode()).hexdigest()
    return f"SHA256:{hash_value}"


def activate_online(code: str) -> dict | None:
    """
    联网激活
    
    Args:
        code: 激活码
        
    Returns:
        license 数据，失败返回 None
    """
    url = f"{ACTIVATION_BASE_URL}/api/activate"
    data = {
        "code": code,
        "device_hash": get_device_hash(),
        "app_id": APP_ID,
        "app_version": APP_VERSION,
    }
    
    try:
        response = requests.post(url, json=data, timeout=10)
        result = response.json()
        
        if result.get("ok"):
            license_data = result["license"]
            save_license(license_data)
            print("✓ 激活成功！")
            return license_data
        else:
            error = result.get("error", {})
            error_code = error.get("code", "UNKNOWN")
            error_message = error.get("message", "未知错误")
            print(f"✗ 激活失败: {error_message} ({error_code})")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"✗ 网络错误: {e}")
        return None
    except Exception as e:
        print(f"✗ 激活异常: {e}")
        return None


def save_license(license_data: dict) -> None:
    """保存 license 到本地"""
    LICENSE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LICENSE_FILE, "w", encoding="utf-8") as f:
        json.dump(license_data, f, indent=2)
    print(f"✓ License 已保存到: {LICENSE_FILE}")


def load_license() -> dict | None:
    """从本地加载 license"""
    if not LICENSE_FILE.exists():
        return None
    
    try:
        with open(LICENSE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"✗ 读取 license 失败: {e}")
        return None


def verify_license_signature(license_data: dict) -> bool:
    """
    离线验证 license 签名
    需要安装: pip install pynacl
    """
    try:
        from nacl.signing import VerifyKey
        from nacl.exceptions import BadSignatureError
        
        # 复制 license 数据（不修改原始数据）
        license_copy = license_data.copy()
        
        # 提取签名
        signature_str = license_copy.pop("signature", "")
        if not signature_str.startswith("ed25519:"):
            print("✗ 签名格式错误")
            return False
        
        signature = base64.b64decode(signature_str.replace("ed25519:", ""))
        
        # 生成 canonical JSON（字段排序，无空格）
        canonical_json = json.dumps(
            license_copy,
            sort_keys=True,
            separators=(',', ':'),
            ensure_ascii=False
        )
        message = canonical_json.encode('utf-8')
        
        # 验证签名
        verify_key = VerifyKey(base64.b64decode(PUBLIC_KEY))
        verify_key.verify(message, signature)
        
        print("✓ License 签名验证通过")
        return True
        
    except BadSignatureError:
        print("✗ License 签名验证失败")
        return False
    except ImportError:
        print("⚠ 未安装 pynacl，跳过签名验证")
        return True  # 如果没有安装库，暂时跳过验证
    except Exception as e:
        print(f"✗ 签名验证异常: {e}")
        return False


def check_license_validity(license_data: dict) -> bool:
    """检查 license 是否有效"""
    from datetime import datetime
    
    # 检查设备绑定
    current_device = get_device_hash()
    if license_data.get("device_hash") != current_device:
        print("✗ License 与当前设备不匹配")
        return False
    
    # 检查过期时间
    expires_at = license_data.get("expires_at", "")
    if expires_at:
        try:
            expire_date = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if expire_date < datetime.now(expire_date.tzinfo):
                print("✗ License 已过期")
                return False
        except Exception as e:
            print(f"⚠ 无法解析过期时间: {e}")
    
    # 检查应用 ID
    if license_data.get("app_id") != APP_ID:
        print("✗ License 应用 ID 不匹配")
        return False
    
    print("✓ License 有效")
    return True


def check_activation() -> bool:
    """
    检查激活状态
    
    Returns:
        True 表示已激活且有效，False 表示未激活或无效
    """
    print("正在检查激活状态...")
    
    # 加载本地 license
    license_data = load_license()
    if not license_data:
        print("✗ 未找到 license 文件")
        return False
    
    # 验证签名
    if not verify_license_signature(license_data):
        return False
    
    # 检查有效性
    if not check_license_validity(license_data):
        return False
    
    # 显示 license 信息
    print(f"\nLicense 信息:")
    print(f"  ID: {license_data.get('license_id')}")
    print(f"  计划: {license_data.get('plan')}")
    print(f"  颁发时间: {license_data.get('issued_at')}")
    print(f"  过期时间: {license_data.get('expires_at')}")
    
    return True


def main():
    """主函数"""
    print("=" * 50)
    print("软件激活工具")
    print("=" * 50)
    print()
    
    # 检查是否已激活
    if check_activation():
        print("\n✓ 软件已激活，可以正常使用")
        return
    
    print("\n软件未激活，请输入激活码:")
    code = input("> ").strip()
    
    if not code:
        print("✗ 激活码不能为空")
        return
    
    print(f"\n正在激活... (设备码: {get_device_hash()})")
    license_data = activate_online(code)
    
    if license_data:
        print("\n" + "=" * 50)
        print("激活成功！")
        print("=" * 50)
        print(f"License ID: {license_data.get('license_id')}")
        print(f"计划类型: {license_data.get('plan')}")
        print(f"过期时间: {license_data.get('expires_at')}")
    else:
        print("\n激活失败，请检查激活码是否正确")


if __name__ == "__main__":
    main()
