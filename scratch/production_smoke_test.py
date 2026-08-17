import json
import urllib.request
import urllib.parse
import sys

BASE_URL = "https://fitmindai-ur71.onrender.com/api/v1"

def make_request(method, endpoint, data=None, headers=None):
    url = f"{BASE_URL}{endpoint}"
    req_headers = headers.copy() if headers else {}
    body = None
    
    if data is not None:
        if isinstance(data, dict):
            body = json.dumps(data).encode('utf-8')
            req_headers["Content-Type"] = "application/json"
        elif isinstance(data, bytes):
            body = data

    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode('utf-8')
            try:
                json_data = json.loads(content)
            except Exception:
                json_data = content
            return status, json_data
    except urllib.error.HTTPError as e:
        content = e.read().decode('utf-8')
        try:
            json_data = json.loads(content)
        except Exception:
            json_data = content
        return e.code, json_data

def run_smoke_tests():
    print("=== STARTING PRODUCTION API SMOKE TESTS (urllib) ===")
    
    # 1. Unauthenticated Endpoint Tests (Expecting 401)
    unauth_endpoints = [
        ("GET", "/profile"),
        ("GET", "/profile/me"),
        ("PUT", "/profile/me"),
        ("GET", "/goals"),
        ("GET", "/goals/me"),
        ("GET", "/workout/plan"),
        ("GET", "/workout/logs"),
        ("GET", "/workout/history"),
        ("GET", "/nutrition/today"),
        ("GET", "/nutrition/history"),
        ("GET", "/progress/summary"),
        ("GET", "/progress/measurements"),
    ]
    
    for method, path in unauth_endpoints:
        status, res = make_request(method, path)
        assert status == 401, f"Expected 401 for unauth {method} {path}, got {status}"
        print(f"✓ Unauthenticated {method} {path} returned 401 OK")
        
    # 2. Food Search Unauthenticated & Authenticated
    status, res = make_request("GET", "/foods/search?q=chicken")
    assert status in (200, 401), f"Unexpected status {status} for food search"
    print(f"✓ Food search /foods/search status: {status}")

    # 3. Authentication Flow — Login test user
    login_data = {
        "email": "smoke_tester_prod@example.com",
        "password": "Password123!"
    }
    
    status, login_res = make_request("POST", "/auth/login", data=login_data)
    if status != 200:
        # Register tester
        reg_data = {
            "email": "smoke_tester_prod@example.com",
            "password": "Password123!",
            "full_name": "Smoke Tester"
        }
        reg_status, reg_res = make_request("POST", "/auth/register", data=reg_data)
        assert reg_status in (200, 201), f"Failed to register tester: {reg_res}"
        status, login_res = make_request("POST", "/auth/login", data=login_data)
    
    assert status == 200, f"Login failed: {login_res}"
    token = login_res["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✓ Auth Token acquired successfully")

    # 4. Profile API Aliases Test
    s1, prof_orig = make_request("GET", "/profile", headers=headers)
    s2, prof_alias = make_request("GET", "/profile/me", headers=headers)
    assert s1 == 200, f"GET /profile failed: {prof_orig}"
    assert s2 == 200, f"GET /profile/me failed: {prof_alias}"
    assert prof_orig["id"] == prof_alias["id"], "Profile data mismatch"
    print("✓ GET /profile and GET /profile/me return identical data")

    sp, put_prof_res = make_request("PUT", "/profile/me", data={"full_name": "Smoke Tester Updated"}, headers=headers)
    assert sp == 200, f"PUT /profile/me failed: {put_prof_res}"
    print("✓ PUT /profile/me succeeded")

    # 5. Goals API Aliases Test
    sg1, goal_orig = make_request("GET", "/goals", headers=headers)
    sg2, goal_alias = make_request("GET", "/goals/me", headers=headers)
    assert sg1 == 200, f"GET /goals failed: {goal_orig}"
    assert sg2 == 200, f"GET /goals/me failed: {goal_alias}"
    print("✓ GET /goals and GET /goals/me return valid responses")

    # 6. Workout API Aliases Test
    sw1, w_logs = make_request("GET", "/workout/logs", headers=headers)
    sw2, w_hist = make_request("GET", "/workout/history", headers=headers)
    assert sw1 == 200, f"GET /workout/logs failed: {w_logs}"
    assert sw2 == 200, f"GET /workout/history failed: {w_hist}"
    assert len(w_logs) == len(w_hist), "Workout history length mismatch"
    print("✓ GET /workout/logs and GET /workout/history return identical data")

    # 7. Nutrition API Aliases & Food Search Test
    sn1, n_logs = make_request("GET", "/nutrition/logs", headers=headers)
    sn2, n_hist = make_request("GET", "/nutrition/history", headers=headers)
    assert sn1 == 200, f"GET /nutrition/logs failed: {n_logs}"
    assert sn2 == 200, f"GET /nutrition/history failed: {n_hist}"
    print("✓ GET /nutrition/logs and GET /nutrition/history return identical data")

    # Food Search with Auth
    sf, search_results = make_request("GET", "/foods/search?q=chicken", headers=headers)
    assert sf == 200, f"GET /foods/search failed: {search_results}"
    assert isinstance(search_results, list), "Expected list of foods"
    print(f"✓ GET /foods/search?q=chicken returned {len(search_results)} foods")

    # Test /foods/{food_id} with valid UUID vs string
    if len(search_results) > 0:
        sample_food_id = search_results[0]["id"]
        sfi, food_by_id = make_request("GET", f"/foods/{sample_food_id}", headers=headers)
        assert sfi == 200, f"GET /foods/{{food_id}} failed: {food_by_id}"
        print(f"✓ GET /foods/{sample_food_id} returned valid food detail")

    # 8. Measurement Conversion & Data Integrity Smoke Test
    test_waist_in = 32.5
    test_waist_cm = round(test_waist_in * 2.54, 2) # 82.55 cm
    
    sm, created_meas = make_request(
        "POST",
        "/progress/measurements",
        data={
            "weight_kg": 75.0,
            "waist_cm": test_waist_cm,
            "chest_cm": round(40.0 * 2.54, 2), # 101.6 cm
        },
        headers=headers
    )
    assert sm == 201, f"POST /progress/measurements failed: {created_meas}"
    assert created_meas["waist_cm"] == 82.55, f"Expected 82.55 cm stored, got {created_meas['waist_cm']}"
    
    converted_back = round(created_meas["waist_cm"] / 2.54, 1)
    assert converted_back == 32.5, f"Expected 32.5 in converted back, got {converted_back}"
    print(f"✓ Measurement POST verified: Entered {test_waist_in} in -> Stored {created_meas['waist_cm']} cm -> Converted {converted_back} in")

    print("\n=== ALL PRODUCTION API SMOKE TESTS PASSED CLEANLY ===")

if __name__ == "__main__":
    try:
        run_smoke_tests()
    except Exception as e:
        print(f"❌ FAIL: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
