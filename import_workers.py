#!/usr/bin/env python3

import pandas as pd
import sqlite3
import json
import re
import hashlib
import secrets
from datetime import datetime

def clean_html(text):
    """Remove HTML tags from text"""
    if pd.isna(text):
        return ""
    # Remove HTML tags
    clean = re.sub('<[^<]+?>', '', str(text))
    # Replace HTML entities
    clean = clean.replace('&nbsp;', ' ')
    clean = clean.replace('&amp;', '&')
    clean = clean.replace('&lt;', '<')
    clean = clean.replace('&gt;', '>')
    # Clean up extra whitespace
    clean = ' '.join(clean.split())
    return clean.strip()

def extract_name_from_company(company_name):
    """Extract first and last name from company name"""
    if pd.isna(company_name):
        return "Unknown", "Business"
    
    company = str(company_name).strip()
    
    # Common patterns for extracting personal names from business names
    patterns = [
        r'^([A-Z][a-z]+)\s+([A-Z][a-z]+)(?:\s+.*)?$',  # "John Smith Plumbing"
        r'^([A-Z][a-z]+)(?:\s+&\s+([A-Z]))?.*$',  # "Smith & B Plumbing" -> "Smith", "B"
        r'^([A-Z])\s*&\s*([A-Z])\s+.*$',  # "R & B Plumbing" -> "R", "B"
    ]
    
    for pattern in patterns:
        match = re.match(pattern, company)
        if match:
            return match.group(1), match.group(2) if match.group(2) else "Business"
    
    # If no pattern matches, use company name as last name
    # Remove common business suffixes
    clean_company = re.sub(r'\b(Ltd\.?|Inc\.?|Corp\.?|LLC|Plumbing|Heating|Services?|Systems?)\b', '', company, flags=re.IGNORECASE)
    clean_company = clean_company.strip()
    
    if clean_company:
        words = clean_company.split()
        if len(words) >= 2:
            return words[0], words[1]
        elif len(words) == 1:
            return words[0], "Business"
    
    return "Business", "Owner"

def determine_service_category(services, profession_name, company_name, about_me):
    """Determine primary service category"""
    text_to_analyze = f"{services} {profession_name} {company_name} {about_me}".lower()
    
    # Service mapping based on keywords
    service_map = {
        'plumbing': ['plumb', 'drain', 'sewer', 'water line', 'faucet', 'toilet', 'pipe'],
        'hvac': ['heating', 'hvac', 'air conditioning', 'furnace', 'cooling', 'ventilation'],
        'electrical': ['electric', 'electrical', 'wiring', 'lighting'],
        'general contracting': ['renovation', 'construction', 'contracting', 'building'],
        'mechanical': ['mechanical', 'industrial']
    }
    
    scores = {}
    for category, keywords in service_map.items():
        scores[category] = sum(1 for keyword in keywords if keyword in text_to_analyze)
    
    # Return the category with the highest score, default to plumbing
    return max(scores, key=scores.get) if max(scores.values()) > 0 else 'plumbing'

def calculate_hourly_rate(subscription_name, province, service_category):
    """Calculate estimated hourly rate based on subscription and location"""
    base_rates = {
        'plumbing': 85,
        'hvac': 95,
        'electrical': 90,
        'general contracting': 75,
        'mechanical': 100
    }
    
    province_multiplier = {
        'BC': 1.15,  # Higher cost areas
        'ON': 1.10,
        'AB': 1.05,
        'QC': 0.95,
        'SK': 0.90,
        'MB': 0.90,
        'NB': 0.85
    }
    
    subscription_multiplier = {
        'Enhanced Visibility - Gold Plan': 1.2,
        'Basic Plan': 1.0
    }
    
    base_rate = base_rates.get(service_category, 85)
    prov_mult = province_multiplier.get(province, 1.0)
    sub_mult = subscription_multiplier.get(subscription_name, 1.0)
    
    return round(base_rate * prov_mult * sub_mult, 2)

def generate_secure_password():
    """Generate a secure random password"""
    return secrets.token_urlsafe(16)

def import_workers_to_db(csv_file, db_file):
    """Import workers from CSV to SQLite database"""
    
    # Read CSV data
    print("Reading CSV data...")
    df = pd.read_csv(csv_file)
    print(f"Found {len(df)} workers to import")
    
    # Connect to database
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    
    # Track statistics
    stats = {
        'total': len(df),
        'imported': 0,
        'skipped': 0,
        'errors': 0
    }
    
    for index, row in df.iterrows():
        try:
            print(f"Processing {index + 1}/{len(df)}: {row['company']}")
            
            # Skip if email already exists
            cursor.execute("SELECT id FROM users WHERE email = ?", (row['email'],))
            if cursor.fetchone():
                print(f"  Skipping - email {row['email']} already exists")
                stats['skipped'] += 1
                continue
            
            # Extract and prepare data
            first_name, last_name = extract_name_from_company(row['company'])
            service_category = determine_service_category(
                row['services'], row['profession_name'], row['company'], row['about_me']
            )
            hourly_rate = calculate_hourly_rate(row['subscription_name'], row['state_code'], service_category)
            
            # Clean data
            bio = clean_html(row['about_me'])
            search_desc = clean_html(row.get('search_description', ''))
            
            # Generate password
            password = generate_secure_password()
            password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), b'salt', 100000).hex()
            
            # Insert user
            cursor.execute("""
                INSERT INTO users (
                    email, password_hash, password_salt, role, first_name, last_name, 
                    province, city, is_verified, is_active, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                row['email'], password_hash, 'salt', 'worker', first_name, last_name,
                row['state_code'], row['city'], int(row['verified']), int(row['active']),
                datetime.now().isoformat()
            ))
            
            user_id = cursor.lastrowid
            
            # Insert user profile
            cursor.execute("""
                INSERT INTO user_profiles (
                    user_id, bio, company_name, company_description, website_url, 
                    address_line1, postal_code, profile_image_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, bio[:1000], row['company'], search_desc[:500], row['website'],
                row['address1'], row['zip_code'], row.get('profile_photo')
            ))
            
            # Insert worker services
            service_descriptions = {
                'plumbing': f"{service_category.title()} services including installation, repair, and maintenance",
                'hvac': f"Heating, ventilation, and air conditioning services",
                'electrical': f"Electrical installation and repair services",
                'general contracting': f"General contracting and renovation services",
                'mechanical': f"Mechanical systems and industrial services"
            }
            
            cursor.execute("""
                INSERT INTO worker_services (
                    user_id, service_category, service_name, description, 
                    hourly_rate, is_available, service_area, years_experience
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, service_category.title(), f"{service_category.title()} Services",
                service_descriptions.get(service_category, f"{service_category.title()} services"),
                hourly_rate, 1, f"{row['city']}, {row['state_code']}", 5
            ))
            
            # Insert service area
            cursor.execute("""
                INSERT INTO worker_service_areas (user_id, area_name, is_active)
                VALUES (?, ?, ?)
            """, (user_id, row['city'], 1))
            
            # Create compliance summary (partial compliance for realism)
            cursor.execute("""
                INSERT INTO worker_compliance_summary (
                    user_id, province, primary_trade, overall_compliance_status,
                    compliance_percentage, total_requirements, compliant_requirements,
                    pending_requirements, expired_requirements
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, row['state_code'], service_category.title(), 'partial',
                40.0, 5, 2, 3, 0  # 40% compliance - realistic for new imports
            ))
            
            stats['imported'] += 1
            print(f"  ✅ Imported: {first_name} {last_name} ({row['company']}) - {service_category.title()} in {row['city']}, {row['state_code']}")
            
        except Exception as e:
            stats['errors'] += 1
            print(f"  ❌ Error importing {row.get('company', 'Unknown')}: {e}")
    
    # Commit changes
    conn.commit()
    conn.close()
    
    # Print statistics
    print("\n=== IMPORT STATISTICS ===")
    print(f"Total workers processed: {stats['total']}")
    print(f"Successfully imported: {stats['imported']}")
    print(f"Skipped (duplicates): {stats['skipped']}")
    print(f"Errors: {stats['errors']}")
    print(f"Success rate: {stats['imported']/stats['total']*100:.1f}%")

if __name__ == "__main__":
    import_workers_to_db("kwikr_sample.csv", ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/a31fcc237b8df81a82a97d8eeaf66c7474deb533ac08d408898123bbd56ffee7.sqlite")