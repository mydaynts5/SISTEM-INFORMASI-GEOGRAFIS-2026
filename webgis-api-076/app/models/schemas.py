from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class UserRegister(BaseModel):
    """Skema untuk memvalidasi masukan pembuatan akun baru"""
    email: EmailStr
    password: str = Field(..., min_length=6, description="Sandi minimal 6 karakter")

class FasilitasCreate(BaseModel):
    """Skema validasi data spasial baru secara penuh"""
    nama: str = Field(..., min_length=3)
    jenis: str
    alamat: Optional[str] = None
    longitude: float = Field(..., ge=-180, le=180)
    latitude: float = Field(..., ge=-90, le=90)

class FasilitasUpdate(BaseModel):
    """Skema validasi data spasial secara parsial (opsional)"""
    nama: Optional[str] = None
    jenis: Optional[str] = None
    alamat: Optional[str] = None
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    latitude: Optional[float] = Field(None, ge=-90, le=90)