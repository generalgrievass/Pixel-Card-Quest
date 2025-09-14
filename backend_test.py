#!/usr/bin/env python3
"""
Backend API Testing for Pixel Card Collection Game
Tests all backend endpoints and functionality
"""

import requests
import json
import time
import base64
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://pixelcards.preview.emergentagent.com/api"
TIMEOUT = 120  # 2 minutes for image generation

class PixelCardAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.generated_card_ids = []
        
    def test_root_endpoint(self):
        """Test the root API endpoint"""
        print("🔍 Testing root endpoint...")
        try:
            response = self.session.get(f"{self.base_url}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    print("✅ Root endpoint working")
                    return True
                else:
                    print("❌ Root endpoint missing message field")
                    return False
            else:
                print(f"❌ Root endpoint failed with status {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Root endpoint error: {str(e)}")
            return False
    
    def test_image_generation(self):
        """Test the image generation endpoint"""
        print("🎨 Testing image generation endpoint...")
        print("⏳ This may take up to 1 minute...")
        
        try:
            response = self.session.post(
                f"{self.base_url}/generate-card", 
                timeout=TIMEOUT
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['id', 'image_base64', 'prompt', 'created_at']
                
                # Check all required fields exist
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    print(f"❌ Missing fields in response: {missing_fields}")
                    return False
                
                # Validate image_base64
                try:
                    base64.b64decode(data['image_base64'])
                    print("✅ Base64 image encoding valid")
                except Exception:
                    print("❌ Invalid base64 image encoding")
                    return False
                
                # Check if prompt is from predefined list
                if data['prompt'] and len(data['prompt']) > 0:
                    print("✅ Prompt generated successfully")
                else:
                    print("❌ Empty or missing prompt")
                    return False
                
                # Validate datetime format
                try:
                    datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
                    print("✅ DateTime format valid")
                except Exception:
                    print("❌ Invalid datetime format")
                    return False
                
                # Store card ID for later tests
                self.generated_card_ids.append(data['id'])
                print(f"✅ Image generation successful - Card ID: {data['id']}")
                return True
                
            else:
                print(f"❌ Image generation failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except requests.exceptions.Timeout:
            print("❌ Image generation timed out (>2 minutes)")
            return False
        except Exception as e:
            print(f"❌ Image generation error: {str(e)}")
            return False
    
    def test_get_cards(self):
        """Test retrieving cards"""
        print("📋 Testing get cards endpoint...")
        
        try:
            response = self.session.get(f"{self.base_url}/cards", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    print(f"✅ Retrieved {len(data)} cards")
                    
                    # If we have cards, validate structure
                    if len(data) > 0:
                        card = data[0]
                        required_fields = ['id', 'image_base64', 'prompt', 'created_at']
                        missing_fields = [field for field in required_fields if field not in card]
                        
                        if missing_fields:
                            print(f"❌ Card missing fields: {missing_fields}")
                            return False
                        
                        print("✅ Card structure valid")
                    
                    return True
                else:
                    print("❌ Response is not a list")
                    return False
                    
            else:
                print(f"❌ Get cards failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get cards error: {str(e)}")
            return False
    
    def test_like_card(self):
        """Test liking/disliking cards"""
        print("❤️ Testing like card endpoint...")
        
        # First, ensure we have a card to like
        if not self.generated_card_ids:
            print("⚠️ No generated cards available, generating one first...")
            if not self.test_image_generation():
                print("❌ Cannot test like functionality without a card")
                return False
        
        card_id = self.generated_card_ids[0]
        
        try:
            # Test liking a card
            like_data = {"card_id": card_id, "liked": True}
            response = self.session.post(
                f"{self.base_url}/like-card",
                json=like_data,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    print("✅ Card liked successfully")
                    
                    # Test disliking the same card
                    dislike_data = {"card_id": card_id, "liked": False}
                    response = self.session.post(
                        f"{self.base_url}/like-card",
                        json=dislike_data,
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        print("✅ Card disliked successfully")
                        return True
                    else:
                        print(f"❌ Dislike failed with status {response.status_code}")
                        return False
                else:
                    print("❌ Like response missing message field")
                    return False
            else:
                print(f"❌ Like card failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Like card error: {str(e)}")
            return False
    
    def test_collection(self):
        """Test user collection endpoint"""
        print("🗂️ Testing collection endpoint...")
        
        try:
            # First like a card to ensure collection has content
            if self.generated_card_ids:
                card_id = self.generated_card_ids[0]
                like_data = {"card_id": card_id, "liked": True}
                self.session.post(f"{self.base_url}/like-card", json=like_data, timeout=30)
            
            # Now test collection retrieval
            response = self.session.get(f"{self.base_url}/collection", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    print(f"✅ Retrieved collection with {len(data)} cards")
                    
                    # Validate structure if collection has items
                    if len(data) > 0:
                        card = data[0]
                        required_fields = ['id', 'image_base64', 'prompt', 'created_at']
                        missing_fields = [field for field in required_fields if field not in card]
                        
                        if missing_fields:
                            print(f"❌ Collection card missing fields: {missing_fields}")
                            return False
                        
                        # Check if card is marked as liked
                        if not card.get('is_liked', False):
                            print("⚠️ Collection card not marked as liked")
                        
                        print("✅ Collection structure valid")
                    
                    return True
                else:
                    print("❌ Collection response is not a list")
                    return False
                    
            else:
                print(f"❌ Collection failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Collection error: {str(e)}")
            return False
    
    def test_database_operations(self):
        """Test database persistence and UUID handling"""
        print("🗄️ Testing database operations...")
        
        try:
            # Generate a card and verify it persists
            initial_response = self.session.post(f"{self.base_url}/generate-card", timeout=TIMEOUT)
            if initial_response.status_code != 200:
                print("❌ Cannot test database - card generation failed")
                return False
            
            card_data = initial_response.json()
            card_id = card_data['id']
            
            # Verify UUID format
            try:
                uuid.UUID(card_id)
                print("✅ Card ID is valid UUID")
            except ValueError:
                print("❌ Card ID is not a valid UUID")
                return False
            
            # Retrieve cards and verify our card exists
            cards_response = self.session.get(f"{self.base_url}/cards", timeout=30)
            if cards_response.status_code != 200:
                print("❌ Cannot retrieve cards to verify persistence")
                return False
            
            cards = cards_response.json()
            found_card = next((card for card in cards if card['id'] == card_id), None)
            
            if found_card:
                print("✅ Card persisted in database")
                
                # Test datetime serialization
                try:
                    datetime.fromisoformat(found_card['created_at'].replace('Z', '+00:00'))
                    print("✅ DateTime serialization working")
                except Exception:
                    print("❌ DateTime serialization failed")
                    return False
                
                return True
            else:
                print("❌ Card not found in database")
                return False
                
        except Exception as e:
            print(f"❌ Database operations error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests for Pixel Card Collection Game")
        print("=" * 60)
        
        test_results = {}
        
        # Test each endpoint
        tests = [
            ("Root Endpoint", self.test_root_endpoint),
            ("Image Generation", self.test_image_generation),
            ("Get Cards", self.test_get_cards),
            ("Like Card", self.test_like_card),
            ("Collection", self.test_collection),
            ("Database Operations", self.test_database_operations)
        ]
        
        for test_name, test_func in tests:
            print(f"\n--- {test_name} ---")
            try:
                result = test_func()
                test_results[test_name] = result
                if result:
                    print(f"✅ {test_name} PASSED")
                else:
                    print(f"❌ {test_name} FAILED")
            except Exception as e:
                print(f"❌ {test_name} ERROR: {str(e)}")
                test_results[test_name] = False
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name}: {status}")
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All backend tests PASSED!")
            return True
        else:
            print("⚠️ Some backend tests FAILED!")
            return False

if __name__ == "__main__":
    tester = PixelCardAPITester()
    success = tester.run_all_tests()
    exit(0 if success else 1)