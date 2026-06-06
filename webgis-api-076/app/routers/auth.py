from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.database import get_pool
from app.utils.auth import get_password_hash, verify_password, create_token
from app.models.schemas import UserRegister

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", status_code=201)
async def register(data: UserRegister):
    """Menyimpan akun pengguna baru asinkron dengan enkripsi password"""
    pool = await get_pool()
    hashed_pw = get_password_hash(data.password)
    async with pool.acquire() as conn:
        try:
            await conn.execute(
                "INSERT INTO users (email, password_hash) VALUES ($1, $2)",
                data.email, hashed_pw
            )
            return {"message": "User registered successfully"}
        except Exception:
            raise HTTPException(status_code=400, detail="Email already registered")

@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends()):
    """Verifikasi kredensial asinkron untuk memproduksi token akses JWT"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE email=$1", form.username)
        if not user or not verify_password(form.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_token({"sub": user["email"]})
        return {"access_token": token, "token_type": "bearer"}