from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64
import asyncio

# Import image generation
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Initialize image generator
image_gen = OpenAIImageGeneration(api_key=os.environ.get('EMERGENT_LLM_KEY'))

# Define Models
class Card(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_base64: str
    prompt: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_liked: bool = False

class CardCreate(BaseModel):
    prompt: str

class CardResponse(BaseModel):
    id: str
    image_base64: str
    prompt: str
    created_at: datetime
    is_liked: bool = False

class LikeCardRequest(BaseModel):
    card_id: str
    liked: bool

class UserCollection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    card_id: str
    liked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Pixel art prompts for female feet with variety of poses
PIXEL_ART_PROMPTS = [
    "Pixel art of elegant female feet in fantasy sandals, 16-bit style, cute anime aesthetic, soft colors",
    "Retro pixel art female feet with painted toenails, 8-bit game style, colorful and whimsical",
    "Pixel art of female feet in magical boots, fantasy RPG style, detailed pixel work",
    "Cute pixel art female feet with ankle bracelet, kawaii style, pastel colors",
    "Pixel art of female feet in summer sandals, beach theme, bright tropical colors",
    "Fantasy pixel art female feet with sparkles, magical girl aesthetic, vibrant colors",
    "Pixel art of female feet in cozy socks, winter theme, warm colors, cute style",
    "Retro game style pixel art female feet with toe rings, colorful and detailed",
    "Pixel art of female feet in ballet flats, elegant and refined, soft pixel aesthetic",
    "Cute pixel art female feet with flower decorations, spring theme, cheerful colors",
    "Pixel art of female feet walking pose, side view, detailed pixel animation style",
    "Retro pixel art female feet in high heels, glamorous pose, evening theme",
    "Pixel art of bare female feet on grass, natural outdoor setting, detailed texture",
    "Cute pixel art female feet in striped socks, playful sitting pose, kawaii style",
    "Pixel art of female feet in water, splash effects, summer beach aesthetic",
    "Fantasy pixel art female feet with magical tattoos, mystical glowing effects",
    "Pixel art of female feet in combat boots, action pose, adventurer theme",
    "Retro pixel art female feet in vintage shoes, classic 1950s style, elegant pose",
    "Pixel art of female feet in fuzzy slippers, cozy home setting, warm lighting",
    "Cute pixel art female feet with glitter nail polish, party theme, sparkly effects",
    "Pixel art of female feet in dance pose, ballet position, graceful movement",
    "Fantasy pixel art female feet in fairy shoes, woodland theme, magical sparkles",
    "Pixel art of female feet in snow boots, winter landscape, detailed snow effects",
    "Retro pixel art female feet in platform shoes, disco theme, colorful background",
    "Pixel art of female feet in running shoes, athletic pose, dynamic movement"
]

@api_router.get("/")
async def root():
    return {"message": "Pixel Card Collection Game API"}

@api_router.post("/generate-card", response_model=CardResponse)
async def generate_card():
    try:
        # Select a random prompt
        import random
        prompt = random.choice(PIXEL_ART_PROMPTS)
        
        # Generate image
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if not images or len(images) == 0:
            raise HTTPException(status_code=500, detail="Failed to generate image")
        
        # Convert to base64
        image_base64 = base64.b64encode(images[0]).decode('utf-8')
        
        # Create card object
        card = Card(
            image_base64=image_base64,
            prompt=prompt
        )
        
        # Save to database
        card_dict = card.dict()
        card_dict['created_at'] = card_dict['created_at'].isoformat()
        await db.cards.insert_one(card_dict)
        
        return CardResponse(**card.dict())
        
    except Exception as e:
        logging.error(f"Error generating card: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating card: {str(e)}")

@api_router.get("/cards", response_model=List[CardResponse])
async def get_cards(limit: int = 20):
    try:
        cards = await db.cards.find().sort("created_at", -1).limit(limit).to_list(length=None)
        result = []
        for card in cards:
            if isinstance(card.get('created_at'), str):
                card['created_at'] = datetime.fromisoformat(card['created_at'])
            result.append(CardResponse(**card))
        return result
    except Exception as e:
        logging.error(f"Error fetching cards: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching cards: {str(e)}")

@api_router.post("/like-card")
async def like_card(request: LikeCardRequest):
    try:
        # Update card's like status
        await db.cards.update_one(
            {"id": request.card_id},
            {"$set": {"is_liked": request.liked}}
        )
        
        if request.liked:
            # Add to user collection
            collection_item = UserCollection(card_id=request.card_id)
            collection_dict = collection_item.dict()
            collection_dict['liked_at'] = collection_dict['liked_at'].isoformat()
            await db.collections.insert_one(collection_dict)
        else:
            # Remove from user collection
            await db.collections.delete_many({"card_id": request.card_id})
        
        return {"message": "Card updated successfully"}
        
    except Exception as e:
        logging.error(f"Error updating card: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating card: {str(e)}")

@api_router.get("/collection", response_model=List[CardResponse])
async def get_user_collection():
    try:
        # Get all liked cards from collection
        collection_items = await db.collections.find().sort("liked_at", -1).to_list(length=None)
        card_ids = [item["card_id"] for item in collection_items]
        
        if not card_ids:
            return []
        
        # Fetch the actual cards
        cards = await db.cards.find({"id": {"$in": card_ids}, "is_liked": True}).to_list(length=None)
        result = []
        for card in cards:
            if isinstance(card.get('created_at'), str):
                card['created_at'] = datetime.fromisoformat(card['created_at'])
            result.append(CardResponse(**card))
        return result
        
    except Exception as e:
        logging.error(f"Error fetching collection: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching collection: {str(e)}")

@api_router.post("/pre-generate-cards")
async def pre_generate_cards(count: int = 5):
    """Pre-generate a batch of cards"""
    try:
        generated_cards = []
        for i in range(count):
            prompt = PIXEL_ART_PROMPTS[i % len(PIXEL_ART_PROMPTS)]
            
            # Generate image
            images = await image_gen.generate_images(
                prompt=prompt,
                model="gpt-image-1",
                number_of_images=1
            )
            
            if images and len(images) > 0:
                image_base64 = base64.b64encode(images[0]).decode('utf-8')
                card = Card(image_base64=image_base64, prompt=prompt)
                
                # Save to database
                card_dict = card.dict()
                card_dict['created_at'] = card_dict['created_at'].isoformat()
                await db.cards.insert_one(card_dict)
                generated_cards.append(card.id)
        
        return {"message": f"Generated {len(generated_cards)} cards", "card_ids": generated_cards}
        
    except Exception as e:
        logging.error(f"Error pre-generating cards: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error pre-generating cards: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()