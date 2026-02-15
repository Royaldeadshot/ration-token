import requests
import sys
from datetime import datetime

class RationQueueAPITester:
    def __init__(self, base_url="https://ration-digital-queue.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_shop_id = None
        self.generated_tokens = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.text:
                    try:
                        response_data = response.json()
                        if isinstance(response_data, list) and len(response_data) > 0:
                            print(f"   Response: Found {len(response_data)} items")
                        elif isinstance(response_data, dict):
                            key_info = list(response_data.keys())[:3]
                            print(f"   Response keys: {key_info}")
                    except:
                        print(f"   Response length: {len(response.text)}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")

            return success, response.json() if response.text and success else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_get_shops(self):
        """Test GET /api/shops"""
        success, response = self.run_test(
            "Get Shops",
            "GET", 
            "shops",
            200
        )
        if success and isinstance(response, list) and len(response) >= 2:
            print(f"   Found {len(response)} shops")
            for shop in response:
                print(f"   Shop: {shop.get('name', 'Unknown')} - {shop.get('id', 'No ID')}")
            return response
        return []

    def test_admin_login(self, username, password):
        """Test admin login and get token"""
        success, response = self.run_test(
            f"Admin Login ({username})",
            "POST",
            "admin/login", 
            200,
            data={"username": username, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.admin_shop_id = response.get('shop_id')
            print(f"   Shop ID: {self.admin_shop_id}")
            print(f"   Shop Name: {response.get('shop_name')}")
            return True
        return False

    def test_generate_token(self, shop_id, name, ration_card):
        """Test token generation"""
        success, response = self.run_test(
            "Generate Token",
            "POST",
            "tokens/generate",
            200,
            data={
                "name": name,
                "ration_card": ration_card,
                "shop_id": shop_id
            }
        )
        if success and 'id' in response:
            self.generated_tokens.append(response)
            print(f"   Token Number: {response.get('token_number')}")
            print(f"   Tokens Ahead: {response.get('tokens_ahead')}")
            print(f"   Wait Time: {response.get('estimated_wait_minutes')} minutes")
            return response
        return None

    def test_token_status(self, token_id):
        """Test GET /api/tokens/{token_id}/status"""
        success, response = self.run_test(
            "Get Token Status",
            "GET",
            f"tokens/{token_id}/status",
            200
        )
        if success:
            print(f"   Status: {response.get('status')}")
            print(f"   Tokens Ahead: {response.get('tokens_ahead')}")
            print(f"   Wait Time: {response.get('estimated_wait_minutes')} minutes")
        return success

    def test_shop_counter(self, shop_id):
        """Test GET /api/shops/{shop_id}/counter"""
        success, response = self.run_test(
            "Get Shop Counter",
            "GET",
            f"shops/{shop_id}/counter",
            200
        )
        if success:
            current = response.get('current_serving')
            print(f"   Currently Serving: {current.get('token_number') if current else 'None'}")
            print(f"   Total Waiting: {response.get('total_waiting')}")
            print(f"   Next Tokens: {len(response.get('next_tokens', []))}")
        return success, response

    def test_admin_next_token(self):
        """Test POST /api/admin/next (requires auth)"""
        success, response = self.run_test(
            "Admin Next Token",
            "POST",
            "admin/next",
            200
        )
        if success:
            print(f"   Now Serving: {response.get('now_serving', 'None')}")
            print(f"   Message: {response.get('message')}")
        return success

    def test_admin_skip_token(self, token_id):
        """Test POST /api/admin/skip/{token_id} (requires auth)"""
        success, response = self.run_test(
            "Admin Skip Token",
            "POST",
            f"admin/skip/{token_id}",
            200
        )
        return success

    def test_admin_serve_token(self, token_id):
        """Test POST /api/admin/serve/{token_id} (requires auth)"""
        success, response = self.run_test(
            "Admin Serve Token",
            "POST",
            f"admin/serve/{token_id}",
            200
        )
        return success

    def test_admin_reset_queue(self):
        """Test POST /api/admin/reset (requires auth)"""
        success, response = self.run_test(
            "Admin Reset Queue",
            "POST",
            "admin/reset",
            200
        )
        return success

def main():
    print("🚀 Starting Ration Queue API Tests")
    print("=" * 50)
    
    tester = RationQueueAPITester()
    shops = []
    token_ids_to_test = []

    # Test 1: Get shops (should return 2 seeded shops)
    shops = tester.test_get_shops()
    if not shops or len(shops) < 2:
        print("❌ CRITICAL: Could not get shops or less than 2 shops found")
        return 1

    # Test 2: Generate tokens (test multiple tokens for queue)
    test_shop_id = shops[0]['id']
    print(f"\n📋 Using shop: {shops[0]['name']} (ID: {test_shop_id})")
    
    # Generate 3 test tokens
    test_cases = [
        ("Alice Johnson", "RC001234"),
        ("Bob Smith", "RC005678"), 
        ("Charlie Brown", "RC009012")
    ]
    
    for i, (name, ration_card) in enumerate(test_cases):
        token = tester.test_generate_token(test_shop_id, name, ration_card)
        if token:
            token_ids_to_test.append(token['id'])

    if not token_ids_to_test:
        print("❌ CRITICAL: No tokens generated successfully")
        return 1

    # Test 3: Check token status 
    for i, token_id in enumerate(token_ids_to_test[:2]):  # Test first 2 tokens
        tester.test_token_status(token_id)

    # Test 4: Get shop counter info
    tester.test_shop_counter(test_shop_id)

    # Test 5: Admin authentication
    if not tester.test_admin_login("admin1", "admin123"):
        print("❌ CRITICAL: Admin login failed")
        return 1

    # Test 6: Admin operations (requires auth)
    tester.test_admin_next_token()  # Advance queue
    
    # Test skip and serve operations with generated tokens
    if len(token_ids_to_test) >= 2:
        tester.test_admin_skip_token(token_ids_to_test[1])  # Skip second token
        tester.test_admin_serve_token(token_ids_to_test[0])  # Serve first token

    # Test 7: Reset queue
    tester.test_admin_reset_queue()

    # Test 8: Test second admin account  
    print(f"\n🔑 Testing second admin account...")
    tester.token = None  # Clear first admin token
    if tester.test_admin_login("admin2", "admin123"):
        print("✅ Second admin account working")
    else:
        print("❌ Second admin account failed")

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"⚠️  {failed_tests} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())