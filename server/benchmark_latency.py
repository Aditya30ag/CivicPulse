import time
import sys
from pathlib import Path

# Add project root directory to sys.path so 'server.*' package imports work
SERVER_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SERVER_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from server.agents.deduplication_agent import DeduplicationAgent
from server.config import settings

def run_benchmark():
    print("--- 🚀 CivicPulse AI Latency Benchmark ---")
    print("Testing DeduplicationAgent concurrency...\n")
    
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
        print("❌ Error: GEMINI_API_KEY is not set in server/.env")
        print("Please set a valid API key to run this benchmark.")
        return

    agent = DeduplicationAgent()
    
    # Mock inputs representing a report with 4 duplicates in the exact same location
    inputs = {
        "new_description": "There is a massive pothole causing traffic issues.",
        "new_location": (40.7128, -74.0060),
        "candidates": [
            {"id": i, "description": f"Pothole reported near main street {i}", "lat": 40.7128, "lng": -74.0060, "severityScore": 5}
            for i in range(4)
        ]
    }

    print("Executing DeduplicationAgent with 4 duplicate candidate reports...")
    print("Wait for it... (Should take ~2-3 seconds with new concurrent logic)\n")
    
    start_time = time.time()
    try:
        result = agent.execute(inputs)
    except Exception as e:
        print(f"❌ Execution failed: {e}")
        return
        
    end_time = time.time()
    elapsed = end_time - start_time
    
    print(f"✅ Deduplication completed in: {elapsed:.2f} seconds")
    print(f"Resulting Trace: {result.get('trace_entry', {}).get('reasoning', 'No trace')}")
    print("\n💡 Note: Without the ThreadPoolExecutor concurrency, 4 candidates would have taken ~8-12 seconds!")

if __name__ == "__main__":
    run_benchmark()
