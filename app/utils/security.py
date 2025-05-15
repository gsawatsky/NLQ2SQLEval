from cryptography.fernet import Fernet
import base64
import os
import logging
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)

def get_fernet():
    # Get encryption key and salt from environment variables
    secret_key = os.getenv('SNOWFLAKE_ENCRYPTION_KEY')
    salt = os.getenv('SNOWFLAKE_ENCRYPTION_SALT')
    
    if not secret_key or not salt:
        logger.warning(
            'SNOWFLAKE_ENCRYPTION_KEY or SNOWFLAKE_ENCRYPTION_SALT not set. '
            'Using default values - THIS IS NOT SECURE FOR PRODUCTION!'
        )
        # Fallback to default values (only for development)
        secret_key = 'your-secret-key-here'  # Change this in production
        salt = 'some-salt'  # Change this in production
    
    # Ensure the key and salt are bytes
    if isinstance(secret_key, str):
        secret_key = secret_key.encode('utf-8')
    if isinstance(salt, str):
        salt = salt.encode('utf-8')
    
    # Generate a key using PBKDF2
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(secret_key))
    return Fernet(key)

def encrypt_password(password: str) -> str:
    fernet = get_fernet()
    return fernet.encrypt(password.encode()).decode()

def decrypt_password(encrypted_password: str) -> str:
    fernet = get_fernet()
    return fernet.decrypt(encrypted_password.encode()).decode()
