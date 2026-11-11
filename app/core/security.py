import os
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional
from jose import jwt
from app.core.config import settings

try:
    import bcrypt
    HAS_BCRYPT = True
except ImportError:
    HAS_BCRYPT = False

def get_password_hash(password: str) -> str:
    """
    Hashes password using bcrypt if available, otherwise secure PBKDF2-HMAC-SHA256.
    """
    if HAS_BCRYPT:
        pwd_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')
    else:
        salt = secrets.token_hex(16)
        key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return f"pbkdf2:sha256:{salt}:{key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies plain password against stored hash.
    Supports both bcrypt ($2a$, $2b$, $2y$) and PBKDF2 hashes.
    """
    try:
        if hashed_password.startswith("pbkdf2:sha256:"):
            parts = hashed_password.split(":")
            if len(parts) == 4:
                salt = parts[2]
                key_hex = parts[3]
                new_key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000)
                return secrets.compare_digest(new_key.hex(), key_hex)
            return False
            
        if HAS_BCRYPT:
            return bcrypt.checkpw(
                plain_password.encode('utf-8'),
                hashed_password.encode('utf-8')
            )
        return False
    except Exception:
        return False

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except Exception:
        return None

