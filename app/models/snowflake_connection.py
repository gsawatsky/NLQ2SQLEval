from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import validates
from datetime import datetime
from app.utils.security import encrypt_password, decrypt_password
import json

Base = declarative_base()

class SnowflakeConnection(Base):
    __tablename__ = 'snowflake_connections'
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    user = Column(String(255), nullable=False)
    _password = Column('password', String(500), nullable=False)  # Store encrypted password
    account = Column(String(255), nullable=False)
    warehouse = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    database = Column(String(255))
    schema = Column(String(255))
    is_sso = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def password(self):
        """Decrypt the password when accessed"""
        return decrypt_password(self._password)

    @password.setter
    def password(self, value):
        """Encrypt the password before storing"""
        self._password = encrypt_password(value)

    @validates('_password')
    def validate_password(self, key, password):
        # If the password is already encrypted (starts with 'gAAAA'), store as is
        # Otherwise, encrypt it
        if not password.startswith('gAAAA'):
            return encrypt_password(password)
        return password

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'user': self.user,
            'password': self.password,  # This will return the decrypted password
            'account': self.account,
            'warehouse': self.warehouse,
            'role': self.role,
            'database': self.database,
            'schema': self.schema,
            'is_sso': self.is_sso,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def get_connection_params(self):
        """Get parameters needed to create a Snowflake connection"""
        return {
            'user': self.user,
            'password': self.password,  # Decrypted password
            'account': self.account,
            'warehouse': self.warehouse,
            'role': self.role,
            'database': self.database,
            'schema': self.schema
        }
