#!/usr/bin/env python3

import sqlite3

def count_workers():
    conn = sqlite3.connect(".wrangler/state/v3/d1/miniflare-D1DatabaseObject/a31fcc237b8df81a82a97d8eeaf66c7474deb533ac08d408898123bbd56ffee7.sqlite")
    cursor = conn.cursor()
    
    print("=== WORKER COUNT BY PROVINCE ===")
    cursor.execute("""
        SELECT u.province, COUNT(*) as worker_count
        FROM users u
        WHERE u.role = 'worker'
        GROUP BY u.province
        ORDER BY worker_count DESC
    """)
    
    for row in cursor.fetchall():
        print(f"{row[0]}: {row[1]} workers")
    
    print("\n=== SERVICE CATEGORIES ===")
    cursor.execute("""
        SELECT ws.service_category, COUNT(*) as count
        FROM worker_services ws
        GROUP BY ws.service_category
        ORDER BY count DESC
    """)
    
    for row in cursor.fetchall():
        print(f"{row[0]}: {row[1]} workers")
    
    print("\n=== ONTARIO PLUMBERS SAMPLE ===")
    cursor.execute("""
        SELECT u.id, u.first_name, u.last_name, u.city, ws.service_category, ws.hourly_rate
        FROM users u
        JOIN worker_services ws ON u.id = ws.user_id
        WHERE u.province = 'ON' AND ws.service_category = 'Plumbing'
        LIMIT 10
    """)
    
    for row in cursor.fetchall():
        print(f"ID {row[0]}: {row[1]} {row[2]} in {row[3]} - ${row[5]}/hr")
    
    conn.close()

if __name__ == "__main__":
    count_workers()