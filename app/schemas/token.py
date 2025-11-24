from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str
    is_admin: bool     # <-- Добавлено
    username: str      # <-- Добавлено для удобства

class TokenData(BaseModel):
    email: str | None = None