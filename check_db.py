#!/usr/bin/env python3

import sqlite3
import os

# Check both databases
databases = [
    ".wrangler/state/v3/d1/kwikr-directory-production.sqlite",
    ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/a31fcc237b8df81a82a97d8eeaf66c7474deb533ac08d408898123bbd56ffee7.sqlite"
]

for db_path in databases:
    if os.path.exists(db_path):
        print(f"\n=== Checking {db_path} ===")
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Check if users table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
            if cursor.fetchone():
                print("✅ users table exists")
                
                # Count users
                cursor.execute("SELECT COUNT(*) FROM users")
                count = cursor.fetchone()[0]
                print(f"📊 Total users: {count}")
                
                # Check for our demo worker
                cursor.execute("SELECT id, email, first_name, last_name FROM users WHERE id = 4")
                demo_worker = cursor.fetchone()
                if demo_worker:
                    print(f"👤 Demo Worker found: ID {demo_worker[0]}, {demo_worker[2]} {demo_worker[3]} ({demo_worker[1]})")
                else:
                    print("❌ Demo Worker (ID 4) not found")
            else:
                print("❌ users table does not exist")
                
            conn.close()
        except Exception as e:
            print(f"❌ Error: {e}")
    else:
        print(f"\n❌ Database not found: {db_path}")