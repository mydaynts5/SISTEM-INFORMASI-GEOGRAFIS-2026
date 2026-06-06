from pydantic import BaseModel, Field
from typing import Optional

class FasilitasCreate(BaseModel):
    nama: str = Field(..., min_length=3, description="Nama wajib diisi, minimal 3 karakter")
    jenis: str = Field(..., description="Jenis/Kategori fasilitas")
    alamat: Optional[str] = Field(None, description="Alamat fisik")
    longitude: float = Field(..., ge=-180, le=180, description="Bujur bumi (-180 s/d 180)")
    latitude: float = Field(..., ge=-90, le=90, description="Lintang bumi (-90 s/d 90)")