from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from passlib.context import CryptContext
from jose import jwt, JWTError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ── Models ──────────────────────────────────────────────

class TokenGenerateRequest(BaseModel):
    name: str
    ration_card: str
    shop_id: str

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class ShopSettingsRequest(BaseModel):
    queue_start_time: str
    queue_end_time: str


# ── Auth Helper ─────────────────────────────────────────

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        admin_id = payload.get("sub")
        shop_id = payload.get("shop_id")
        if not admin_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"admin_id": admin_id, "shop_id": shop_id}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Wait Time Calculator ───────────────────────────────

async def calc_avg_service_time(shop_id: str) -> float:
    served = await db.tokens.find(
        {"shop_id": shop_id, "status": "served", "served_at": {"$ne": None}, "serving_started_at": {"$ne": None}},
        {"_id": 0}
    ).sort("served_at", -1).limit(5).to_list(5)

    if len(served) >= 5:
        times = []
        for t in served:
            try:
                started = datetime.fromisoformat(t["serving_started_at"])
                finished = datetime.fromisoformat(t["served_at"])
                diff = (finished - started).total_seconds() / 60
                if diff > 0:
                    times.append(diff)
            except (ValueError, KeyError):
                continue
        if len(times) >= 5:
            return sum(times) / len(times)
    return 8.0


# ── Seed Data ───────────────────────────────────────────

@app.on_event("startup")
async def seed_data():
    shops_count = await db.shops.count_documents({})
    if shops_count == 0:
        shops = [
            {
                "id": str(uuid.uuid4()),
                "name": "Ration Shop - Block A",
                "address": "Main Market, Block A",
                "current_token_counter": 0,
                "queue_start_time": "08:00",
                "queue_end_time": "17:00",
                "queue_status": "live",
                "queue_reset_version": 1,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Ration Shop - Block B",
                "address": "Village Center, Block B",
                "current_token_counter": 0,
                "queue_start_time": "08:00",
                "queue_end_time": "17:00",
                "queue_status": "live",
                "queue_reset_version": 1,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.shops.insert_many(shops)

        for i, shop in enumerate(shops):
            admin = {
                "id": str(uuid.uuid4()),
                "username": f"admin{i+1}",
                "password_hash": pwd_context.hash("admin123"),
                "shop_id": shop["id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.admins.insert_one(admin)

        logger.info("Seeded 2 shops and 2 admin accounts")

    # Migration: add new fields to existing shops
    await db.shops.update_many(
        {"queue_start_time": {"$exists": False}},
        {"$set": {
            "queue_start_time": "08:00",
            "queue_end_time": "17:00",
            "queue_status": "live",
            "queue_reset_version": 1
        }}
    )


# ── Public Routes ───────────────────────────────────────

@api_router.get("/shops")
async def get_shops():
    shops = await db.shops.find({}, {"_id": 0, "current_token_counter": 0, "created_at": 0}).to_list(100)
    return shops


@api_router.post("/tokens/generate")
async def generate_token(req: TokenGenerateRequest):
    shop = await db.shops.find_one({"id": req.shop_id}, {"_id": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    # Check if ration card already has an active token
    existing = await db.tokens.find_one(
        {"shop_id": req.shop_id, "ration_card": req.ration_card, "status": {"$in": ["waiting", "serving"]}},
        {"_id": 0}
    )
    if existing:
        waiting_ahead = await db.tokens.count_documents({
            "shop_id": req.shop_id, "status": "waiting",
            "token_number": {"$lt": existing["token_number"]}
        })
        serving_exists = await db.tokens.count_documents({"shop_id": req.shop_id, "status": "serving"})
        tokens_ahead = waiting_ahead + (1 if serving_exists > 0 and existing["status"] != "serving" else 0)
        avg_time = await calc_avg_service_time(req.shop_id)
        return {
            "id": existing["id"],
            "shop_id": existing["shop_id"],
            "token_number": existing["token_number"],
            "name": existing["name"],
            "ration_card": existing["ration_card"],
            "status": existing["status"],
            "created_at": existing["created_at"],
            "tokens_ahead": tokens_ahead,
            "estimated_wait_minutes": round(tokens_ahead * avg_time, 1),
            "existing": True,
            "queue_reset_version": shop.get("queue_reset_version", 1)
        }

    new_counter = shop["current_token_counter"] + 1
    await db.shops.update_one({"id": req.shop_id}, {"$set": {"current_token_counter": new_counter}})

    token = {
        "id": str(uuid.uuid4()),
        "shop_id": req.shop_id,
        "token_number": new_counter,
        "name": req.name,
        "ration_card": req.ration_card,
        "status": "waiting",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "serving_started_at": None,
        "served_at": None
    }
    await db.tokens.insert_one(token)

    waiting_ahead = await db.tokens.count_documents({
        "shop_id": req.shop_id,
        "status": "waiting",
        "token_number": {"$lt": new_counter}
    })
    serving_exists = await db.tokens.count_documents({"shop_id": req.shop_id, "status": "serving"})
    tokens_ahead = waiting_ahead + (1 if serving_exists > 0 else 0)
    avg_time = await calc_avg_service_time(req.shop_id)

    return {
        "id": token["id"],
        "shop_id": token["shop_id"],
        "token_number": token["token_number"],
        "name": token["name"],
        "ration_card": token["ration_card"],
        "status": token["status"],
        "created_at": token["created_at"],
        "tokens_ahead": tokens_ahead,
        "estimated_wait_minutes": round(tokens_ahead * avg_time, 1),
        "existing": False,
        "queue_reset_version": shop.get("queue_reset_version", 1)
    }


@api_router.get("/tokens/{token_id}/status")
async def get_token_status(token_id: str):
    token = await db.tokens.find_one({"id": token_id}, {"_id": 0})
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    shop = await db.shops.find_one({"id": token["shop_id"]}, {"_id": 0})
    tokens_ahead = 0
    est_wait = 0.0

    if token["status"] == "waiting":
        waiting_ahead = await db.tokens.count_documents({
            "shop_id": token["shop_id"],
            "status": "waiting",
            "token_number": {"$lt": token["token_number"]}
        })
        serving_exists = await db.tokens.count_documents({"shop_id": token["shop_id"], "status": "serving"})
        tokens_ahead = waiting_ahead + (1 if serving_exists > 0 else 0)
        avg_time = await calc_avg_service_time(token["shop_id"])
        est_wait = round(tokens_ahead * avg_time, 1)

    return {
        "id": token["id"],
        "shop_id": token["shop_id"],
        "token_number": token["token_number"],
        "name": token["name"],
        "ration_card": token["ration_card"],
        "status": token["status"],
        "created_at": token["created_at"],
        "served_at": token.get("served_at"),
        "tokens_ahead": tokens_ahead,
        "estimated_wait_minutes": est_wait,
        "queue_status": shop.get("queue_status", "live") if shop else "live",
        "queue_start_time": shop.get("queue_start_time", "08:00") if shop else "08:00",
        "queue_end_time": shop.get("queue_end_time", "17:00") if shop else "17:00",
        "queue_reset_version": shop.get("queue_reset_version", 1) if shop else 1
    }


@api_router.get("/shops/{shop_id}/counter")
async def get_counter(shop_id: str):
    shop = await db.shops.find_one({"id": shop_id}, {"_id": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    serving = await db.tokens.find_one(
        {"shop_id": shop_id, "status": "serving"},
        {"_id": 0}
    )

    next_tokens = await db.tokens.find(
        {"shop_id": shop_id, "status": "waiting"},
        {"_id": 0}
    ).sort("token_number", 1).limit(5).to_list(5)

    total_waiting = await db.tokens.count_documents(
        {"shop_id": shop_id, "status": "waiting"}
    )

    avg_time = await calc_avg_service_time(shop_id)

    return {
        "shop_id": shop_id,
        "shop_name": shop["name"],
        "current_serving": {
            "token_number": serving["token_number"],
            "name": serving["name"],
            "id": serving["id"]
        } if serving else None,
        "next_tokens": [
            {"token_number": t["token_number"], "name": t["name"], "id": t["id"]}
            for t in next_tokens
        ],
        "total_waiting": total_waiting,
        "estimated_wait_minutes": round(total_waiting * avg_time, 1),
        "queue_status": shop.get("queue_status", "live"),
        "queue_start_time": shop.get("queue_start_time", "08:00"),
        "queue_end_time": shop.get("queue_end_time", "17:00"),
        "queue_reset_version": shop.get("queue_reset_version", 1),
        "avg_service_time": avg_time
    }


@api_router.get("/shops/{shop_id}/queue")
async def get_queue(shop_id: str):
    tokens = await db.tokens.find(
        {"shop_id": shop_id},
        {"_id": 0}
    ).sort("token_number", 1).to_list(1000)
    return tokens


# ── Admin Routes ────────────────────────────────────────

@api_router.post("/admin/login")
async def admin_login(req: AdminLoginRequest):
    admin = await db.admins.find_one({"username": req.username}, {"_id": 0})
    if not admin or not pwd_context.verify(req.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = jwt.encode(
        {"sub": admin["id"], "shop_id": admin["shop_id"], "username": admin["username"]},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )

    shop = await db.shops.find_one({"id": admin["shop_id"]}, {"_id": 0})

    return {
        "token": token,
        "admin_id": admin["id"],
        "shop_id": admin["shop_id"],
        "shop_name": shop["name"] if shop else "Unknown",
        "username": admin["username"]
    }


@api_router.post("/admin/next")
async def next_token(admin=Depends(get_current_admin)):
    shop_id = admin["shop_id"]

    current_serving = await db.tokens.find_one(
        {"shop_id": shop_id, "status": "serving"}, {"_id": 0}
    )
    if current_serving:
        await db.tokens.update_one(
            {"id": current_serving["id"]},
            {"$set": {
                "status": "served",
                "served_at": datetime.now(timezone.utc).isoformat()
            }}
        )

    next_list = await db.tokens.find(
        {"shop_id": shop_id, "status": "waiting"},
        {"_id": 0}
    ).sort("token_number", 1).limit(1).to_list(1)

    if next_list:
        next_waiting = next_list[0]
        await db.tokens.update_one(
            {"id": next_waiting["id"]},
            {"$set": {
                "status": "serving",
                "serving_started_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Advanced to next token", "now_serving": next_waiting["token_number"]}

    return {"message": "No more tokens in queue", "now_serving": None}


@api_router.post("/admin/skip/{token_id}")
async def skip_token(token_id: str, admin=Depends(get_current_admin)):
    token = await db.tokens.find_one(
        {"id": token_id, "shop_id": admin["shop_id"]}, {"_id": 0}
    )
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    was_serving = token["status"] == "serving"

    await db.tokens.update_one(
        {"id": token_id},
        {"$set": {"status": "skipped"}}
    )

    if was_serving:
        next_list = await db.tokens.find(
            {"shop_id": admin["shop_id"], "status": "waiting"},
            {"_id": 0}
        ).sort("token_number", 1).limit(1).to_list(1)
        if next_list:
            await db.tokens.update_one(
                {"id": next_list[0]["id"]},
                {"$set": {
                    "status": "serving",
                    "serving_started_at": datetime.now(timezone.utc).isoformat()
                }}
            )

    return {"message": "Token skipped"}


@api_router.post("/admin/serve/{token_id}")
async def serve_token(token_id: str, admin=Depends(get_current_admin)):
    token = await db.tokens.find_one(
        {"id": token_id, "shop_id": admin["shop_id"]}, {"_id": 0}
    )
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    await db.tokens.update_one(
        {"id": token_id},
        {"$set": {
            "status": "served",
            "served_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {"message": "Token marked as served"}


@api_router.post("/admin/reset")
async def reset_queue(admin=Depends(get_current_admin)):
    shop_id = admin["shop_id"]
    await db.tokens.delete_many({"shop_id": shop_id})
    await db.shops.update_one(
        {"id": shop_id},
        {"$set": {"current_token_counter": 0}, "$inc": {"queue_reset_version": 1}}
    )
    return {"message": "Queue reset successfully"}


@api_router.post("/admin/settings")
async def update_shop_settings(req: ShopSettingsRequest, admin=Depends(get_current_admin)):
    await db.shops.update_one(
        {"id": admin["shop_id"]},
        {"$set": {
            "queue_start_time": req.queue_start_time,
            "queue_end_time": req.queue_end_time
        }}
    )
    return {"message": "Settings updated"}


@api_router.post("/admin/toggle-queue")
async def toggle_queue(admin=Depends(get_current_admin)):
    shop = await db.shops.find_one({"id": admin["shop_id"]}, {"_id": 0})
    new_status = "stopped" if shop.get("queue_status") == "live" else "live"
    await db.shops.update_one(
        {"id": admin["shop_id"]},
        {"$set": {"queue_status": new_status}}
    )
    return {"message": f"Queue {new_status}", "queue_status": new_status}


@api_router.get("/shops/{shop_id}/settings")
async def get_shop_settings(shop_id: str):
    shop = await db.shops.find_one({"id": shop_id}, {"_id": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return {
        "queue_start_time": shop.get("queue_start_time", "08:00"),
        "queue_end_time": shop.get("queue_end_time", "17:00"),
        "queue_status": shop.get("queue_status", "live"),
        "queue_reset_version": shop.get("queue_reset_version", 1)
    }


# ── App Setup ───────────────────────────────────────────

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
